# SignuDoc MCP server

SignuDoc includes a stateless Model Context Protocol (MCP) server at
`https://<your-signudoc-host>/api/mcp`. It uses Streamable HTTP and a SignuDoc
API key. An administrator creates a **Prepare drafts** key under **Settings,
Organization, API keys**, then stores it in the MCP client's secret settings.

The MCP endpoint accepts only the `prepare` scope. It can create drafts and
read envelopes created by that same key. It cannot send, void, remind, sign, or
change an envelope after sending. The owner must open the review link, check
the draft, and send it from the SignuDoc dashboard. There is no send tool or
send option in draft creation.

## Configure Codex

Set the key in the environment used to run Codex; do not commit it to a
repository or put it in a shared configuration file:

```sh
export SIGNUDOC_API_KEY='sdk_your_prepare_key'
```

Add the remote server to `~/.codex/config.toml`:

```toml
[mcp_servers.signudoc]
url = "https://sign.example.com/api/mcp"
bearer_token_env_var = "SIGNUDOC_API_KEY"
```

Replace the example host with your install. Restart or reload Codex and check
that these tools are available:

- `request_pdf_upload`
- `create_envelope_draft`
- `list_envelopes`
- `get_envelope`
- `list_envelope_events`
- `download_envelope_file`

## Configure another MCP client

Add a remote **Streamable HTTP** MCP server with URL
`https://sign.example.com/api/mcp` and HTTP Bearer authentication. Enter the
`prepare` key in the client's secret or credential store. For clients that
use JSON configuration, the shape is typically:

```json
{
  "mcpServers": {
    "signudoc": {
      "type": "http",
      "url": "https://sign.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer sdk_your_prepare_key"
      }
    }
  }
}
```

Use the client's protected secret substitution in place of the example key
when it provides one. This JSON shape is not a shared MCP configuration
standard; follow the client's documentation if its field names differ.

## Create an envelope draft

For a PDF no larger than **3 MiB**, pass its base64 content directly to
`create_envelope_draft`. Include an idempotency key for safe retries, signer
references, and at least one field assigned to a signer. A field's `signer`
value must match a signer's `ref`.

Example tool arguments:

```json
{
  "idempotencyKey": "contract-2026-0042",
  "title": "Consulting agreement",
  "filename": "agreement.pdf",
  "pdfBase64": "JVBERi0xLjQK...",
  "signers": [
    { "ref": "client", "name": "Casey Client", "email": "casey@example.com" }
  ],
  "fields": [
    {
      "signer": "client",
      "type": "signature",
      "page": 2,
      "x": 0.12,
      "y": 0.78,
      "width": 0.32,
      "height": 0.06
    }
  ],
  "copyRecipients": [{ "name": "Records", "email": "records@example.com" }],
  "metadata": { "externalReference": "contract-2026-0042" }
}
```

The tool returns an unsent draft and a dashboard review URL. It never sends
the document. If the key and request are retried, SignuDoc returns the first
draft instead of creating another one.

### Larger PDFs

When the install's storage supports direct uploads, call `request_pdf_upload`
first. It returns a short-lived URL, upload ID, method, required headers, and
maximum size. Upload the PDF directly to that URL, then call
`create_envelope_draft` with the returned `uploadId` instead of `pdfBase64`.
The upload can be used once and expires if it is not used. For example:

```sh
curl -X PUT "$UPLOAD_URL" \
  -H 'content-type: application/pdf' \
  --data-binary @agreement.pdf
```

Pass the tool's returned headers exactly as provided. The current built-in
direct-upload implementation uses Vercel Blob; local-disk storage does not
support direct upload URLs. With a storage setup that does not support them,
use inline PDF data up to 3 MiB.

## Inspect envelopes and files

`list_envelopes` supports `status` (`draft`, `sent`, `completed`, `declined`,
or `voided`), `limit` (1–100), and `cursor`. Continue with the returned
`nextCursor`. `get_envelope` returns current envelope state and signer or
approver progress. `list_envelope_events` returns the audit events oldest
first. All reads from a prepare key are limited to envelopes created by that
key.

`download_envelope_file` accepts `signed` or `certificate` and returns the
PDF as a binary MCP resource when it is ready. A signed PDF is available once
all signers complete; the certificate is available after completion, decline,
or void. A not-ready response includes no file bytes.

## Rotate or revoke a key

API keys are shown once. Keep them in a secret store, rotate them by creating
a replacement Prepare drafts key and updating the MCP client, then revoke the
old key under **Settings, Organization, API keys**. Revocation takes effect
immediately. Removing the administrator's role also revokes their keys. Key
creation and revocation are recorded in the site audit trail. See the [API
guide](api.md#keys) for key lifetime and ownership details.
