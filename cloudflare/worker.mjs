import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";

// Runs SignuDoc on Cloudflare. The app itself is the Next.js server in a
// container (see ./Dockerfile). This Worker is the front door: it starts
// the container when a request arrives, passes every request to it, and
// calls the daily cleanup on a schedule.
//
// It also gives the app its documents and its email without any keys. The
// app asks for both over plain HTTP at two names that exist only inside the
// container. Requests to those names never leave Cloudflare: they are
// handed to the two gateways below, which use this Worker's own R2 bucket
// and email binding.
//
// Plain JavaScript, so the app's own typecheck leaves it alone.

const PORT = 8080;
// The container sleeps after this long without a request. The next visitor
// then waits for it to start again.
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
// Starting covers the database migrations and the Next.js server.
const STARTUP_ATTEMPTS = 300;
// One container serves the whole install.
const INSTANCE_NAME = "app";

const STORAGE_HOST = "storage.signudoc.internal";
const EMAIL_HOST = "email.signudoc.internal";
// The app's S3 driver puts a bucket name first in every path. There is one
// bucket, the one bound to this Worker, so the name is only a placeholder.
const BUCKET_PLACEHOLDER = "documents";

/**
 * The app's document storage, on this Worker's R2 bucket. It answers the
 * four S3-style calls the app's storage driver makes (see
 * src/lib/services/storage/s3.ts): GET, HEAD, PUT and DELETE of one object.
 */
export class StorageGateway extends WorkerEntrypoint {
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname);
    const prefix = `/${BUCKET_PLACEHOLDER}/`;

    if (!path.startsWith(prefix) || path.length === prefix.length) {
      return new Response("InvalidRequest", { status: 400 });
    }

    const key = path.slice(prefix.length);
    const bucket = this.env.DOCUMENTS;

    switch (request.method) {
      case "GET":
      case "HEAD": {
        const object =
          request.method === "GET"
            ? await bucket.get(key)
            : await bucket.head(key);

        if (!object) {
          return new Response(request.method === "GET" ? "NoSuchKey" : null, {
            status: 404,
          });
        }

        const headers = new Headers({
          "content-length": String(object.size),
          etag: object.httpEtag,
        });

        if (object.httpMetadata?.contentType) {
          headers.set("content-type", object.httpMetadata.contentType);
        }

        return new Response(request.method === "GET" ? object.body : null, {
          headers,
        });
      }
      case "PUT": {
        // "If-None-Match: *" asks R2 to keep an object that is already
        // there. R2 then stores nothing and answers null.
        const stored = await bucket.put(key, await request.arrayBuffer(), {
          httpMetadata: {
            contentType: request.headers.get("content-type") ?? undefined,
          },
          onlyIf:
            request.headers.get("if-none-match") === "*"
              ? new Headers({ "if-none-match": "*" })
              : undefined,
        });

        return stored
          ? new Response(null, { headers: { etag: stored.httpEtag } })
          : new Response("PreconditionFailed", { status: 412 });
      }
      case "DELETE":
        await bucket.delete(key);

        return new Response(null, { status: 204 });
      default:
        return new Response("MethodNotAllowed", { status: 405 });
    }
  }
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function errorAnswer(status, message) {
  return Response.json(
    { errors: [{ message }], result: null, success: false },
    { status },
  );
}

/**
 * The app's outgoing email, on this Worker's email binding. It takes the
 * request the app's Cloudflare email driver makes (the shape of the Email
 * Service REST API, see src/lib/services/email-cloudflare.ts) and answers
 * in the same shape.
 */
export class EmailGateway extends WorkerEntrypoint {
  async fetch(request) {
    if (request.method !== "POST") {
      return errorAnswer(405, "Method not allowed.");
    }

    const message = await request.json().catch(() => null);

    if (!message || typeof message !== "object") {
      return errorAnswer(400, "Invalid email request.");
    }

    try {
      await this.env.EMAIL.send({
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((attachment) => ({
                content: fromBase64(attachment.content),
                disposition: attachment.disposition ?? "attachment",
                filename: attachment.filename,
                type: attachment.type,
              })),
            }
          : {}),
        from:
          typeof message.from === "string"
            ? message.from
            : { email: message.from.address, name: message.from.name },
        ...(message.html ? { html: message.html } : {}),
        ...(message.reply_to ? { replyTo: message.reply_to } : {}),
        subject: message.subject,
        text: message.text,
        to: message.to,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const code = error?.code ?? "";

      // The driver tries again after a 429 or a 5xx, and gives up on
      // anything else. Only a rate limit is worth another try.
      return errorAnswer(code === "E_RATE_LIMIT_EXCEEDED" ? 429 : 400, text);
    }

    return Response.json({
      errors: [],
      result: {
        delivered: [],
        permanent_bounces: [],
        queued: [message.to].flat(),
      },
      success: true,
    });
  }
}

export class SignuDocApp extends DurableObject {
  starting;
  monitoring;

  constructor(ctx, env) {
    super(ctx, env);

    const container = ctx.container;

    if (container?.running) {
      // Restore the timeout and exit monitoring after a restart of this
      // object while its container kept running.
      void ctx.blockConcurrencyWhile(() =>
        container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS),
      );
      this.observeExit();
    }
  }

  async fetch(request) {
    // The public address the site was first reached at. The app needs it
    // for the links in its emails, and the daily cleanup starts the
    // container without a visitor to take it from.
    const publicOrigin = request.headers.get("x-signudoc-origin");

    if (publicOrigin && !(await this.ctx.storage.get("appUrl"))) {
      await this.ctx.storage.put("appUrl", publicOrigin);
    }

    if (!this.env.APP_URL && !(await this.ctx.storage.get("appUrl"))) {
      // Nobody has opened the site yet, so there is nothing to clean up
      // and no address to start the app with.
      return new Response(null, { status: 204 });
    }

    // Share startup across concurrent requests, including after a failed
    // attempt.
    this.starting ??= this.startAndWaitForPort().finally(() => {
      this.starting = undefined;
    });
    await this.starting;

    const url = new URL(request.url);

    url.protocol = "http:";
    url.host = "container";

    const forwarded = new Request(url, request);

    forwarded.headers.delete("host");
    forwarded.headers.delete("x-signudoc-origin");

    return this.ctx.container.getTcpPort(PORT).fetch(forwarded);
  }

  /** A secret for signing sessions, made once and kept with this object. */
  async authSecret() {
    let secret = await this.ctx.storage.get("authSecret");

    if (!secret) {
      secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      await this.ctx.storage.put("authSecret", secret);
    }

    return secret;
  }

  async startAndWaitForPort() {
    const container = this.ctx.container;

    if (!container.running) {
      // Intercepts last until the container stops, so they are set at
      // every start.
      await container.interceptOutboundHttp(
        STORAGE_HOST,
        this.ctx.exports.StorageGateway,
      );
      await container.interceptOutboundHttp(
        EMAIL_HOST,
        this.ctx.exports.EmailGateway,
      );

      container.start({
        // The database is reached over the Internet.
        enableInternet: true,
        env: {
          // The address the site was first opened at. Set APP_URL on the
          // Worker to use another, such as a domain of your own.
          APP_URL: (await this.ctx.storage.get("appUrl")) ?? "",
          BETTER_AUTH_SECRET: await this.authSecret(),
          // Documents and email through the gateways above. The keys are
          // placeholders: the gateways are only reachable from inside the
          // container, and do not check them.
          CLOUDFLARE_ACCOUNT_ID: "internal",
          CLOUDFLARE_EMAIL_API_TOKEN: "internal",
          CLOUDFLARE_EMAIL_API_URL: `http://${EMAIL_HOST}/send`,
          EMAIL_DRIVER: "cloudflare",
          S3_ACCESS_KEY_ID: "internal",
          S3_BUCKET: BUCKET_PLACEHOLDER,
          S3_ENDPOINT: `http://${STORAGE_HOST}`,
          S3_SECRET_ACCESS_KEY: "internal",
          STORAGE_DRIVER: "s3",
          // Every setting and secret of this Worker, which win over the
          // defaults above. A setting SignuDoc adds later works without a
          // change here.
          ...Object.fromEntries(
            Object.entries(this.env).filter(
              ([, value]) => typeof value === "string",
            ),
          ),
        },
        image: container.images.app,
        instance: "basic",
      });
    }

    this.observeExit();
    await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);

    // "running" means startup was asked for, not that the server answers.
    const port = container.getTcpPort(PORT);

    for (let attempt = 0; attempt < STARTUP_ATTEMPTS; attempt++) {
      try {
        const response = await port.fetch("http://container/", {
          redirect: "manual",
          signal: AbortSignal.timeout(1000),
        });

        // Any answer at all means the server is up.
        await response.body?.cancel();

        return;
      } catch {
        // Not listening yet.
      }

      await scheduler.wait(200);
    }

    throw new Error(`SignuDoc did not start listening on port ${PORT}.`);
  }

  observeExit() {
    if (this.monitoring) {
      return;
    }

    this.monitoring = this.ctx.container
      .monitor()
      .then(() => console.log("SignuDoc container stopped."))
      .catch((error) => console.error("SignuDoc container failed:", error))
      .finally(() => {
        this.monitoring = undefined;
      });
    this.ctx.waitUntil(this.monitoring);
  }
}

const worker = {
  async fetch(request, env) {
    const forwarded = new Request(request);
    const url = new URL(request.url);

    // The visitor's address as Cloudflare saw it, replacing whatever the
    // visitor sent under the same name. SignuDoc's rate limits count by it.
    forwarded.headers.set(
      "x-forwarded-for",
      request.headers.get("cf-connecting-ip") ?? "",
    );
    forwarded.headers.set("x-forwarded-host", url.host);
    forwarded.headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
    forwarded.headers.set("x-signudoc-origin", url.origin);

    return env.APP.getByName(INSTANCE_NAME).fetch(forwarded);
  },

  // The daily cleanup, in place of the cron job in vercel.json. The schedule
  // is in wrangler.jsonc.
  async scheduled(_controller, env) {
    const secret = env.RETENTION_JOB_SECRET || env.CRON_SECRET;
    const response = await env.APP.getByName(INSTANCE_NAME).fetch(
      "https://signudoc/api/internal/retention",
      {
        headers: secret ? { authorization: `Bearer ${secret}` } : {},
        method: "POST",
      },
    );

    await response.body?.cancel();

    if (!response.ok) {
      throw new Error(`The daily cleanup answered ${response.status}.`);
    }
  },
};

export default worker;
