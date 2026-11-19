# API de integração (petsky)

API que o backend do petsky usa para mandar contratos para assinatura. Fica em `/api/v1` e só aceita chave de API. Nenhuma tela usa essas rotas.

Um "documento" é um envelope com **um** signatário, enviado assim que é criado. Tudo passa pelas mesmas funções do app (campos, prazo, histórico encadeado, selo), agindo como a conta dona da chave. Por isso o documento também aparece no painel dessa conta.

## Chave de API

A chave age como uma conta que já existe e tem o e-mail verificado. Crie a conta no app antes, de preferência uma conta só para a integração.

```bash
npm run api-key -- create --email integracao@petsky.com.br --name "petsky produção"
npm run api-key -- list
npm run api-key -- revoke <id>
```

A chave (`psk_...`) aparece uma vez só. O banco guarda apenas o SHA-256 dela (`api_keys`). Envie a chave em todas as chamadas:

```
Authorization: Bearer psk_...
```

Uma chave inválida, revogada ou de conta sem e-mail verificado recebe `401`. Cada chave tem limite de requisições por rota; quando passa do limite, a resposta é `429` com `retry-after`.

## Canais

- **`link`** (padrão): ninguém recebe e-mail. A resposta traz o `signLink` e a casa manda pelo WhatsApp. O e-mail do signatário é opcional. Sem ele, o banco guarda um endereço técnico em `@sem-email.invalid`, que nunca recebe nada e não aparece em tela nem no certificado. Não há lembrete automático.
- **`email`**: o convite e os lembretes vão por e-mail, como no app. Aqui o e-mail é obrigatório.

## Rotas

### `POST /api/v1/documents`

Cria o documento e envia. Aceita dois formatos:

- `multipart/form-data` com a parte `file` (o PDF) e a parte `data` (JSON);
- `application/json` com o mesmo JSON mais `file: { filename, contentBase64 }`.

```json
{
  "title": "Contrato de creche - Rex",
  "signer": { "name": "Maria Tutora", "channel": "link", "email": "opcional@x.com" },
  "fields": [
    { "type": "signature", "page": -1, "x": 0.08, "y": 0.84, "width": 0.38, "height": 0.07 },
    { "type": "date", "page": -1, "x": 0.6, "y": 0.84, "width": 0.25, "height": 0.05 }
  ],
  "expiresInDays": 7,
  "reminderIntervalDays": null,
  "externalRef": "id do contrato no petsky",
  "companyRef": "id da casa no petsky",
  "permittedUseConfirmed": true
}
```

- `fields` é opcional. Sem ele, entra uma caixa de assinatura no pé da última página. Os tipos aceitos são `signature`, `initials`, `name` e `date`. Precisa haver pelo menos uma `signature`.
- As coordenadas são frações da página (de 0 a 1), contadas a partir do canto superior esquerdo. Em `page`, a contagem começa em 1, e um número negativo conta do fim: `-1` é a última página.
- `permittedUseConfirmed: true` é obrigatório. Ele fica gravado no histórico, como a confirmação que o app pede antes de enviar.
- O PDF pode ter até 20 MB.

Resposta `201`:

```json
{
  "documentId": "uuid",
  "signerId": "uuid",
  "signLink": "https://assinar.../sign/<token>",
  "status": "sent",
  "expiresAt": "2026-11-26T01:09:41.000Z"
}
```

`signLink` só vem no canal `link`; no canal `email` ele é `null`. Se algo falha depois de criar o rascunho, o rascunho é apagado e nada fica pela metade.

### `GET /api/v1/documents/:id`

Status do documento e do signatário:

```json
{
  "documentId": "uuid",
  "status": "sent | completed | declined | voided | expired",
  "channel": "link",
  "title": "...",
  "externalRef": "...",
  "companyRef": "...",
  "createdAt": "...", "sentAt": "...", "completedAt": null,
  "declinedAt": null, "voidedAt": null, "expiresAt": "...",
  "signers": [{
    "signerId": "uuid", "name": "Maria Tutora", "email": null,
    "status": "sent | viewed | signed | declined",
    "viewedAt": "...", "consentedAt": "...", "signedAt": null,
    "declinedAt": null, "declineReason": null
  }]
}
```

### `GET /api/v1/documents/:id/files/signed` e `/files/certificate`

Devolvem o PDF assinado e selado, ou o certificado de auditoria. Os dois só existem depois da assinatura; antes disso, a resposta é `404` ou `409`.

### `POST /api/v1/documents/:id/link`

Gera um link novo para quem ainda vai assinar e o devolve em `{ signLink, signerId, expiresAt }`. O link anterior para de funcionar na hora (`410`). Não manda nada a ninguém e fica registrado no histórico como lembrete manual.

### `POST /api/v1/documents/:id/remind`

- No canal `email`, manda um e-mail de lembrete.
- No canal `link`, faz o mesmo que `/link` e devolve o `signLink` novo.

Resposta: `{ channel, signLink }`.

### `POST /api/v1/documents/:id/cancel`

Anula o documento, e o link deixa de aceitar assinatura. O corpo é opcional: `{ "reason": "..." }`. Chamar de novo devolve a mesma resposta.

### `GET /api/v1/me`

Mostra a conta e a chave em uso. Serve para testar a configuração.

## Erros

O corpo do erro é sempre `{ "error": "mensagem" }`.

| Código | Quando |
| --- | --- |
| `400` | Dados inválidos ou PDF ilegível |
| `401` | Chave inválida, revogada ou ausente |
| `404` | O documento não existe ou é de outra conta |
| `409` | O estado não permite a ação, por exemplo gerar link de um documento já assinado |
| `413` | Arquivo grande demais |
| `429` | Limite de requisições |

## Webhooks

Quando algo acontece com um documento criado por uma chave que tem URL de webhook, o PetskySign faz um `POST` nessa URL. O aviso diz **que algo mudou**, não qual é o estado atual. O petsky deve reler `GET /documents/:id` antes de agir, como já faz com a D4Sign.

### Configurar

```bash
npm run api-key -- webhook <id-da-chave> --url https://app.petsky.com.br/api/webhooks/petskysign
npm run api-key -- webhook <id-da-chave> --clear
npm run api-key -- deliveries            # últimas 50 entregas
npm run api-key -- deliveries --failed   # só as que desistiram
```

- A URL precisa ser `https`. `http` só é aceito para `localhost`, em desenvolvimento.
- Cada vez que a URL é configurada, um segredo novo (`whsec_...`) é gerado e mostrado uma vez só. Ele vai para o petsky como `PETSKYSIGN_WEBHOOK_SECRET`.

### Eventos

| Evento | Quando |
| --- | --- |
| `document.viewed` | O tutor abriu o link pela primeira vez |
| `document.consented` | O tutor aceitou o termo de registros eletrônicos |
| `document.signed` | O tutor assinou |
| `document.completed` | Todos assinaram e o PDF foi selado. Neste ponto os arquivos já podem ser baixados |
| `document.declined` | O tutor recusou |
| `document.voided` | O documento foi anulado |
| `document.expired` | O prazo passou. Esse aviso sai na tarefa diária, então pode chegar até cerca de 1 hora depois do prazo |

O envio do documento não gera aviso, porque o próprio petsky fez a chamada.

### Formato

```http
POST /api/webhooks/petskysign
Content-Type: application/json
PetskySign-Event: document.signed
PetskySign-Delivery: <id da entrega>
PetskySign-Signature: t=1795050000,v1=<hex>

{
  "id": "<id da entrega>",
  "event": "document.signed",
  "occurredAt": "2026-11-19T01:19:32Z",
  "data": {
    "documentId": "uuid",
    "externalRef": "contrato-42",
    "companyRef": "casa-7",
    "signerId": "uuid"
  }
}
```

### Conferir a assinatura

Para conferir:

1. Calcule `HMAC-SHA256(segredo, "<t>.<corpo cru>")` em hexadecimal.
2. Compare com `v1` em tempo constante.
3. Recuse se `t` estiver a mais de 5 minutos do relógio.

Use o corpo exatamente como chegou, antes de qualquer parse. A função `verifyWebhookSignature` em `src/lib/petsky/webhook-delivery.ts` faz essa conta e serve de referência.

### Entregas e novas tentativas

- A entrega é gravada na mesma transação do evento. Por isso só existe aviso de algo que de fato aconteceu: se a assinatura falha e a transação volta atrás, nenhum aviso sai.
- O PetskySign tenta entregar logo depois do commit. Qualquer resposta `2xx` conta como entregue. Qualquer outra resposta, ou falta de resposta em 10 s, agenda nova tentativa: 30 s, 2 min, 10 min, 30 min, 1 h, 3 h, 6 h, 12 h e 24 h. Depois de 10 tentativas, a entrega vira `failed`.
- As novas tentativas dependem de uma tarefa agendada no Coolify, uma por minuto:

```bash
curl -fsS -X POST -H "Authorization: Bearer $RETENTION_JOB_SECRET" https://assinar.petsky.com.br/api/internal/webhooks
```

  Ela usa o mesmo segredo da tarefa diária (`CRON_SECRET` ou `RETENTION_JOB_SECRET`).
- A ordem de chegada não é garantida, e o mesmo aviso pode chegar mais de uma vez. Use `PetskySign-Delivery` para descartar repetidos.

## Ainda não tem

- **Telas em pt-BR e marca da casa** (Fase 3). A tela final ainda diz que o tutor vai receber um e-mail, o que não vale no canal `link`.
- **Separação por casa** (Fase 4). `companyRef` já é gravado e indexado, mas ainda não filtra nem limita nada.

## Variáveis de produção

`BETTER_AUTH_SECRET` é obrigatória. Sem ela, o selo dos PDFs falha em produção quando a senha do banco tem menos de 12 caracteres, e a assinatura do tutor dá erro.
