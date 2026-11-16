import { DurableObject } from "cloudflare:workers";

// Runs SignuDoc on Cloudflare. The app itself is the unchanged Next.js
// server, in a container (see ./Dockerfile). This Worker is the front door:
// it starts the container when a request arrives, passes every request to
// it, and calls the daily cleanup on a schedule.
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

    return this.ctx.container.getTcpPort(PORT).fetch(forwarded);
  }

  async startAndWaitForPort() {
    const container = this.ctx.container;

    if (!container.running) {
      container.start({
        // The database, the bucket and the email service are all reached
        // over the Internet.
        enableInternet: true,
        // Every setting and secret of this Worker, so a setting SignuDoc
        // adds later works without a change here.
        env: Object.fromEntries(
          Object.entries(this.env).filter(
            ([, value]) => typeof value === "string",
          ),
        ),
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
