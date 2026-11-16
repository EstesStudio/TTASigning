# SignuDoc on Cloudflare

This folder runs [SignuDoc](https://github.com/NYLLON-SOFTWARE/SignuDoc) on Cloudflare instead of Vercel. The app is the same Next.js server, unchanged, in a [Cloudflare Container](https://developers.cloudflare.com/containers/). Documents are kept in an [R2](https://developers.cloudflare.com/r2/) bucket. The database is still Postgres, from any provider.

| Part           | On Vercel       | Here                                               |
| -------------- | --------------- | -------------------------------------------------- |
| The app        | Vercel Function | A container, started by the Worker in `worker.mjs` |
| Documents      | Vercel Blob     | An R2 bucket, through `STORAGE_DRIVER=s3`          |
| Daily cleanup  | Vercel cron     | A cron trigger on the Worker                       |
| Database       | Neon Postgres   | Any Postgres, for example Neon                     |
| Email          | Resend          | Resend                                             |
| Bot protection | Vercel BotID    | Not available. The rate limits still apply.        |

## What is different from SignuDoc itself

Everything for Cloudflare is in new files: this folder, `.dockerignore`, `.github/workflows/deploy-cloudflare.yml`, and the storage driver in `src/lib/services/storage/s3.ts` with its test. Two of SignuDoc's own files have a few added lines, so that `STORAGE_DRIVER=s3` is accepted: `src/lib/services/storage.ts` and `src/lib/services/storage/driver.ts`. Nothing else is changed, which is what lets new SignuDoc releases merge in cleanly.

## Set it up

You need a Cloudflare account on the Workers Paid plan (Containers are not on the free plan), a Postgres database, and a Resend account.

1. **Create the bucket.** In the Cloudflare dashboard, R2, create a bucket named `signudoc-documents` (or change `S3_BUCKET` in `wrangler.jsonc`). Then create an R2 API token with Object Read and Write on that bucket. Note its access key id, its secret access key, and the account's S3 endpoint, `https://<account id>.r2.cloudflarestorage.com`.
2. **Set the secrets.** From this folder, run `npx wrangler secret put <NAME>` for each:

   | Secret                 | Value                                                                |
   | ---------------------- | -------------------------------------------------------------------- |
   | `DATABASE_URL`         | Your Postgres connection string.                                     |
   | `APP_URL`              | The site's public address, such as `https://sign.example.com`.       |
   | `BETTER_AUTH_SECRET`   | 32 or more random characters, for example `openssl rand -hex 32`.    |
   | `RESEND_API_KEY`       | From your Resend account.                                            |
   | `S3_ENDPOINT`          | The R2 S3 endpoint from step 1.                                      |
   | `S3_ACCESS_KEY_ID`     | From the R2 API token.                                               |
   | `S3_SECRET_ACCESS_KEY` | From the R2 API token.                                               |
   | `SETUP_TOKEN`          | Optional. A secret the first-run setup page asks for.                |
   | `RETENTION_JOB_SECRET` | Optional. Closes the daily cleanup route to everyone but the Worker. |

   Any other setting in [`.env.example`](../.env.example) works the same way: every variable and secret on the Worker reaches the app.

3. **Deploy.** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as secrets of the GitHub repository. Every push to `main` that passes CI is then deployed by `.github/workflows/deploy-cloudflare.yml`. To deploy from your own machine instead, start Docker and run `npx wrangler deploy` here.
4. **Open the site.** The first deployment takes a few minutes before the container answers. The site then takes you to `/setup`, as in [Self-hosting](../docs/self-hosting.md#set-the-site-up).

The database tables are created, and later updated, each time the container starts.

## Things to know

- **The container sleeps** after 15 minutes without a visitor. The next request waits for it to start, which includes the Next.js server and a check for database changes.
- **One container serves the install.** That suits an organization. A busy public service would need more than one, and a change to `worker.mjs`.
- **Uploads go through the app**, not straight to the bucket as on Vercel. Cloudflare accepts request bodies well above SignuDoc's upload limit.
- **Back up the bucket.** Finished documents exist only there.

## Updates

SignuDoc's own update workflow, `.github/workflows/update-signudoc.yml`, works here as it does on any copy: every Monday it merges the latest release into a branch and opens a pull request. Merging it runs CI, and a pass deploys it. Where the pull request says "Vercel builds a preview", there is no preview here: CI is the check.

An update stops and asks for help only when a release changes the same lines this copy changed, which are the few in the two storage files above.
