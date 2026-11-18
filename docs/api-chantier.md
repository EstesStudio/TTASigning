# Chantier API et webhooks

Cadrage du 18 novembre 2026, établi sur une lecture du code en version 0.4.0.

Le but est d'utiliser SignuDoc sur un de nos serveurs et de le mettre à disposition des applications du groupe, par API et webhooks, à l'image de ce que fait Yousign. Seule la signature simple est visée pour commencer (ni avancée, ni qualifiée).

Le moteur de signature simple est complet, mais rien n'est prévu pour un usage machine à machine. Le chantier consiste à ajouter une couche API et webhooks autour de l'existant et à sortir l'application de Vercel, pas à réécrire la signature.

## Ce qui existe et se réutilise tel quel

La logique métier est déjà séparée des routes web, donc une API v1 peut appeler les mêmes fonctions que l'interface.

- **Cycle de vie complet** : brouillon, envoyé, complété, refusé, annulé, expiré, avec échéances et relances automatiques.
- **Signataires** : jusqu'à 10, en ordre séquentiel, plus des destinataires en copie. Vérification possible par code d'accès ou code envoyé par email.
- **Champs** : signature, paraphe, date, nom, texte, nombre, case, liste, radio, positionnés en coordonnées normalisées (0 à 1) par page.
- **Preuve** : PDF scellé PAdES, certificat d'audit, journal d'audit chaîné par hash, page publique de vérification.
- **Modèles** : document, champs et rôles réutilisables.
- **Fonctions métier isolées** : les routes actuelles sont de minces enveloppes autour de fonctions comme `createDraftEnvelope` ou `sendDraftEnvelope(userId, …)` dans `src/lib/envelopes.ts`.

## Décisions prises

| Sujet                 | Décision                                                                             | Conséquence                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Compatibilité Yousign | Aucune. On s'en inspire et les apps du groupe redéveloppent leur intégration.        | Contrat d'API libre, pensé pour nos besoins.                                                                    |
| Parcours signataire   | L'app appelante envoie elle-même le lien de signature.                               | Le lot 4 entre dans le cœur ; l'intégration en iframe est reportée.                                             |
| Image de marque       | Marque blanche.                                                                      | Lot 8 : marque par application.                                                                                 |
| Stockage des fichiers | S3 avec MinIO, déjà utilisé sur une autre app, dans le Docker comme la base.         | Pilote S3 à écrire et service MinIO dans le compose (lot 5).                                                    |
| Domaine des liens     | Un seul domaine neutre pour le groupe, par exemple `sign.a-tt.fr`.                   | Une seule adresse publique, comme aujourd'hui ; la marque se joue sur le contenu des pages, pas sur le domaine. |
| Emails restants       | SignuDoc les envoie aux couleurs de la marque : PDF signé, relances, code par email. | Les emails font partie du lot 8 ; l'expéditeur de chaque marque doit être autorisé sur le serveur SMTP.         |
| Placement des champs  | Par marqueurs écrits dans le PDF par l'app, en plus des coordonnées.                 | Lot 9.                                                                                                          |

## Les neuf lots

Trois sont gros : l'API REST, les webhooks et la marque blanche. Les tailles sont des ordres de grandeur relatifs (M = moyen, L = gros), pas des chiffrages.

| Lot                                   | Contenu                                                                                                                                                                                                                                                                                                                                                   | Taille |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1. Applications et clés API           | Une « application » par app du groupe, adossée à un compte de service. Clés API (hash en base, préfixe, révocation, dernière utilisation), garde `Bearer` en parallèle de la session cookie, écran d'administration.                                                                                                                                      | M      |
| 2. API REST `/api/v1`                 | Notre propre contrat, inspiré de Yousign sans compatibilité. Créer une demande avec PDF en multipart, définir signataires et champs, activer, consulter, lister, annuler, relancer, télécharger le PDF signé et le certificat d'audit, créer depuis un modèle. Avec `external_id`, métadonnées libres, idempotence, pagination et format d'erreur stable. | L      |
| 3. Webhooks                           | Abonnements (URL, événements, secret), signature HMAC-SHA256 des charges, table d'envois écrite dans la même transaction que l'événement, tentatives avec backoff, journal des livraisons, renvoi manuel.                                                                                                                                                 | L      |
| 4. Lien de signature remis à l'app    | L'activation renvoie le lien du premier signataire ; le lien de chaque signataire suivant arrive par webhook quand son tour commence, avec un point d'API pour le régénérer. URL de retour après signature ou refus. Emails d'invitation et de relance désactivables par application.                                                                     | M      |
| 5. Hébergement sur notre serveur      | Dockerfile et compose avec quatre services : app, Postgres, MinIO, planificateur. Pilote de stockage S3 à écrire, envoi d'email par SMTP, sauvegarde hors Vercel Blob.                                                                                                                                                                                    | M      |
| 6. Français                           | Pages de signature et emails sont en anglais uniquement ; il n'y a aucune couche de traduction.                                                                                                                                                                                                                                                           | M      |
| 7. Documentation et tests             | Spécification OpenAPI, guide d'intégration, mode test, tests de l'API et des webhooks.                                                                                                                                                                                                                                                                    | M      |
| 8. Marque blanche par application     | Nom, logo, couleur, expéditeur, adresse de support et liens légaux propres à chaque application, appliqués aux pages de signature, aux emails et au certificat d'audit. Aucune mention de SignuDoc côté signataire.                                                                                                                                       | L      |
| 9. Marqueurs de signature dans le PDF | L'app écrit une balise texte dans son PDF à l'endroit voulu ; à la création de la demande, SignuDoc repère chaque balise, crée le champ correspondant pour le bon signataire et masque la balise dans le document final. Le placement par coordonnées du lot 2 reste disponible.                                                                          | M      |

## Ordre

Une première application du groupe peut s'intégrer de bout en bout, en envoyant elle-même les liens, dès la fin de l'étape 2.

1. **Socle** : lots 5 et 1, pour avoir une instance Docker sur notre serveur (app, Postgres, MinIO, planificateur) avec des applications et leurs clés API.
2. **Cœur** : lots 2, 3, 4 et 9, avec la documentation et les tests du lot 7 au fil de l'eau.
3. **Marque blanche et français** : lots 8 et 6.
4. **Plus tard** : signature en parallèle, plusieurs documents par demande, code par SMS, intégration en iframe.

## Points durs repérés dans le code

Aucun n'est bloquant, mais chacun impose un choix de conception.

- **Aucune notion d'application** : chaque enveloppe appartient à un `user_id`. Avec un compte de service par application, auquel la clé API est rattachée, toutes les fonctions `…ForUser` marchent sans modification et chaque app ne voit que ses demandes.
- **Point d'accroche des webhooks** : tous les événements passent par `recordAuditEvent` dans `src/lib/services/audit.ts`. Les 19 types d'événements d'audit (`auditEventTypes` dans `src/lib/types/domain.ts`) se traduisent directement en événements du type `signature_request.done` ou `signer.declined`.
- **Liens de signature** : ils ne sont conservés que sous forme de hash (`signing_token_hash`) et émis au tour de chaque signataire. Un lien ne peut donc être remis à l'app qu'au moment où il est émis, ou en le régénérant.
- **Tâches planifiées** : tout repose sur un cron Vercel quotidien (`vercel.json`, `/api/internal/retention`). Les tentatives de webhook demandent un passage à la minute, d'où le service planificateur.
- **Email** : seuls les pilotes Resend et « capture » existent (`src/lib/services/email.ts`), et l'invitation part toujours par email.
- **Stockage** : seuls les pilotes Vercel Blob et disque local existent ; l'interface à implémenter pour S3 est `StorageService` dans `src/lib/services/storage/types.ts`.
- **Sauvegarde** : `src/lib/backup.ts` écrit vers un second magasin Vercel Blob.
- **Iframe bloquée** : `src/proxy.ts` impose `frame-ancestors 'none'` et `X-Frame-Options: DENY`. Sans objet tant que l'iframe est reportée.
- **Limites pensées pour des humains** : 10 envois par heure et 20 brouillons par 10 minutes par utilisateur, plus une confirmation « usage permis » obligatoire à chaque envoi. Il faut des quotas séparés pour l'API.
- **Image de marque unique** : nom, logo, couleur et adresse d'expédition vivent dans la ligne unique de `app_settings`.
- **Écarts fonctionnels avec Yousign** : un seul PDF par demande (20 Mo max), signature séquentielle uniquement, pas de code par SMS.
- **Sceau** : le certificat est auto-signé par défaut. Pour un usage groupe, prévoir un certificat d'une autorité (`SEAL_P12_BASE64`) et un serveur d'horodatage (`SEAL_TIMESTAMP_URL`), ce que le code gère déjà par configuration.
- **Fork** : le dépôt suit l'amont NYLLON-SOFTWARE/SignuDoc. Isoler nos ajouts dans `src/app/api/v1` et `src/lib/api` limitera les conflits lors des mises à jour.
