# SignuDoc on Cloudflare

This folder runs [SignuDoc](https://github.com/NYLLON-SOFTWARE/SignuDoc) on Cloudflare instead of Vercel. The app is the same Next.js server in a [Cloudflare Container](https://developers.cloudflare.com/containers/). Documents are kept in an [R2](https://developers.cloudflare.com/r2/) bucket, and email goes out through [Cloudflare Email Service](https://developers.cloudflare.com/email-service/). The database is still Postgres, from any provider.

| Part           | On Vercel       | Here                                                        |
| -------------- | --------------- | ----------------------------------------------------------- |
| The app        | Vercel Function | A container, started by the Worker in `worker.mjs`          |
| Documents      | Vercel Blob     | An R2 bucket, through `STORAGE_DRIVER=s3`                   |
| Email          | Resend          | Cloudflare Email Service, through `EMAIL_DRIVER=cloudflare` |
| Daily cleanup  | Vercel cron     | A cron trigger on the Worker                                |
| Database       | Neon Postgres   | Any Postgres, for example Neon                              |
| Bot protection | Vercel BotID    | Not available. The rate limits still apply.                 |

## What is different from SignuDoc itself

Nearly everything for Cloudflare is in new files: this folder, `.dockerignore`, `.github/workflows/deploy-cloudflare.yml`, the storage driver in `src/lib/services/storage/s3.ts` and the email driver in `src/lib/services/email-cloudflare.ts`, each with its test.

Five of SignuDoc's own files have a few added lines, so that the two drivers can be chosen and Settings can describe Cloudflare email:

- `src/lib/services/storage.ts` and `src/lib/services/storage/driver.ts`, for `STORAGE_DRIVER=s3`
- `src/lib/services/email.ts`, `src/lib/email-status.ts` and `src/components/settings/organization-settings.tsx`, for `EMAIL_DRIVER=cloudflare`

Nothing else is changed, which is what lets most new SignuDoc releases merge in cleanly.

## Set it up

You need a Cloudflare account on the Workers Paid plan (Containers and Email Sending are not on the free plan), a domain on that account, and a Postgres database.

1. **Create the bucket.** In the Cloudflare dashboard, R2, create a bucket named `signudoc-documents` (or change `S3_BUCKET` in `wrangler.jsonc`). Then create an R2 API token with Object Read and Write on that bucket. Note its access key id, its secret access key, and the account's S3 endpoint, `https://<account id>.r2.cloudflarestorage.com`.
2. **Turn on email for your domain.** Run `npx wrangler email sending enable <your domain>`, or turn on Email Sending for the domain in the Cloudflare dashboard. Then create a Cloudflare API token that may send email for the account.
3. **Set the secrets.** From this folder, run `npx wrangler secret put <NAME>` for each:

   | Secret                       | Value                                                                |
   | ---------------------------- | -------------------------------------------------------------------- |
   | `DATABASE_URL`               | Your Postgres connection string.                                     |
   | `APP_URL`                    | The site's public address, such as `https://sign.example.com`.       |
   | `BETTER_AUTH_SECRET`         | 32 or more random characters, for example `openssl rand -hex 32`.    |
   | `S3_ENDPOINT`                | The R2 S3 endpoint from step 1.                                      |
   | `S3_ACCESS_KEY_ID`           | From the R2 API token.                                               |
   | `S3_SECRET_ACCESS_KEY`       | From the R2 API token.                                               |
   | `CLOUDFLARE_ACCOUNT_ID`      | Your Cloudflare account id.                                          |
   | `CLOUDFLARE_EMAIL_API_TOKEN` | The API token from step 2.                                           |
   | `SETUP_TOKEN`                | Optional. A secret the first-run setup page asks for.                |
   | `RETENTION_JOB_SECRET`       | Optional. Closes the daily cleanup route to everyone but the Worker. |

   Any other setting in [`.env.example`](../.env.example) works the same way: every variable and secret on the Worker reaches the app. To send through Resend instead, remove `EMAIL_DRIVER` from `wrangler.jsonc` and set `RESEND_API_KEY`.

4. **Deploy.** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as secrets of the GitHub repository. Every push to `main` that passes CI is then deployed by `.github/workflows/deploy-cloudflare.yml`. To deploy from your own machine instead, start Docker and run `npx wrangler deploy` here.
5. **Open the site.** The first deployment takes a few minutes before the container answers. The site then takes you to `/setup`, as in [Self-hosting](../docs/self-hosting.md#set-the-site-up).
6. **Finish email.** Under Settings, Organization, enter an address at your domain in "Send email from", save, and send yourself a test email there. When it arrives, the page shows email as working.

The database tables are created, and later updated, each time the container starts.

## Things to know

- **The container sleeps** after 15 minutes without a visitor. The next request waits for it to start, which includes the Next.js server and a check for database changes.
- **One container serves the install.** That suits an organization. A busy public service would need more than one, and a change to `worker.mjs`.
- **Uploads go through the app**, not straight to the bucket as on Vercel. Cloudflare accepts request bodies well above SignuDoc's upload limit.
- **Email differs from Resend in three ways.** Cloudflare has no shared test address, so nothing is sent until "Send email from" is set. One email, attachments included, can be 25 MiB at most, so a very large signed PDF may fail to send as an attachment. And a send that is retried after a lost answer can arrive twice, because Cloudflare has no idempotency key.
- **Some labels still say Resend.** The setup page and a few lines in Settings are left as SignuDoc wrote them.
- **Back up the bucket.** Finished documents exist only there.

## Updates

SignuDoc's own update workflow, `.github/workflows/update-signudoc.yml`, works here as it does on any copy: every Monday it merges the latest release into a branch and opens a pull request. Merging it runs CI, and a pass deploys it. Where the pull request says "Vercel builds a preview", there is no preview here: CI is the check.

An update stops and asks for help only when a release changes the same lines this copy changed, which are the few in the five files above.
