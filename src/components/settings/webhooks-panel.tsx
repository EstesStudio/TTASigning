"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import { Checkbox } from "@/components/ui/checkbox";
import {
  webhookEventTypes,
  type WebhookDeliveryView,
  type WebhookEndpointCreated,
  type WebhookEndpointView,
  type WebhookEventType,
} from "@/lib/schemas/webhooks";

// Administrators configure HTTPS callbacks for envelope events. The signing
// secret is shown once, when the endpoint is created or rotated.

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const EVENT_LABELS: Record<WebhookEventType, string> = {
  "envelope.completed": "Completed",
  "envelope.declined": "Declined",
  "envelope.expired": "Expired",
  "envelope.voided": "Voided",
};

type EndpointsResponse = {
  endpoints?: WebhookEndpointView[];
  error?: string;
} | null;

type EndpointResponse = {
  endpoint?: WebhookEndpointCreated | WebhookEndpointView;
  error?: string;
} | null;

type DeliveryResponse = {
  delivery?: WebhookDeliveryView;
  error?: string;
} | null;

function formatTime(unix: number) {
  return new Date(unix * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
}

function deliveryStatusLabel(status: WebhookDeliveryView["status"]) {
  if (status === "delivered") {
    return "Delivered";
  }

  if (status === "failed") {
    return "Gave up";
  }

  return "Pending";
}

export function WebhooksPanel() {
  const [endpoints, setEndpoints] = useState<WebhookEndpointView[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<WebhookEventType[]>([
    ...webhookEventTypes,
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{
    endpointId: string;
    secret: string;
  } | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/webhooks", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as EndpointsResponse;

        if (!response.ok || !payload?.endpoints) {
          setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
          return;
        }

        setEndpoints(payload.endpoints);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!(
          loadError instanceof DOMException && loadError.name === "AbortError"
        )) {
          setError(GENERIC_ERROR_MESSAGE);
        }
      });

    return () => controller.abort();
  }, [reloads]);

  function replaceEndpoint(next: WebhookEndpointView) {
    setEndpoints((current) =>
      current
        ? current.map((endpoint) => (endpoint.id === next.id ? next : endpoint))
        : [next],
    );
  }

  function replaceDelivery(delivery: WebhookDeliveryView) {
    setEndpoints((current) =>
      current
        ? current.map((endpoint) => {
            if (endpoint.id !== delivery.endpointId) {
              return endpoint;
            }

            const others = endpoint.deliveries.filter(
              (row) => row.id !== delivery.id,
            );

            return {
              ...endpoint,
              deliveries: [delivery, ...others].slice(0, 20),
            };
          })
        : current,
    );
  }

  async function addEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/webhooks", {
        body: JSON.stringify({
          description,
          events,
          url,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as EndpointResponse;
      const created = payload?.endpoint;

      if (!response.ok || !created) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setEndpoints((current) => [created, ...(current ?? [])]);
      setUrl("");
      setDescription("");
      setEvents([...webhookEventTypes]);

      if ("secret" in created && created.secret) {
        setRevealedSecret({ endpointId: created.id, secret: created.secret });
      }
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  async function patchEndpoint(
    endpoint: WebhookEndpointView,
    body: Record<string, unknown>,
  ) {
    if (pendingId) {
      return;
    }

    setPendingId(endpoint.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/webhooks/${encodeURIComponent(endpoint.id)}`,
        {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as EndpointResponse;

      if (!response.ok || !payload?.endpoint) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      replaceEndpoint(payload.endpoint);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function rotateSecret(endpoint: WebhookEndpointView) {
    if (pendingId) {
      return;
    }

    setPendingId(endpoint.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/webhooks/${encodeURIComponent(endpoint.id)}/rotate`,
        { method: "POST" },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as EndpointResponse;
      const rotated = payload?.endpoint;

      if (!response.ok || !rotated) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      replaceEndpoint(rotated);

      if ("secret" in rotated && rotated.secret) {
        setRevealedSecret({ endpointId: rotated.id, secret: rotated.secret });
      }
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function sendTest(endpoint: WebhookEndpointView) {
    if (pendingId) {
      return;
    }

    setPendingId(endpoint.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/webhooks/${encodeURIComponent(endpoint.id)}/test`,
        { method: "POST" },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DeliveryResponse;

      if (!response.ok || !payload?.delivery) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      replaceDelivery(payload.delivery);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function sendAgain(delivery: WebhookDeliveryView) {
    if (pendingId) {
      return;
    }

    setPendingId(delivery.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/webhooks/deliveries/${encodeURIComponent(delivery.id)}/retry`,
        { method: "POST" },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DeliveryResponse;

      if (!response.ok || !payload?.delivery) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      replaceDelivery(payload.delivery);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function removeEndpoint(endpoint: WebhookEndpointView) {
    if (pendingId) {
      return;
    }

    setPendingId(endpoint.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/webhooks/${encodeURIComponent(endpoint.id)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setEndpoints((current) =>
        current ? current.filter((row) => row.id !== endpoint.id) : current,
      );

      if (revealedSecret?.endpointId === endpoint.id) {
        setRevealedSecret(null);
      }
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  function toggleEvent(event: WebhookEventType) {
    setEvents((current) =>
      current.includes(event)
        ? current.filter((value) => value !== event)
        : [...current, event],
    );
  }

  return (
    <section
      className="panel scroll-mt-6 p-6 sm:p-8"
      data-animate="enter"
      data-animate-delay="2"
      id="webhooks"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="section-eyebrow">Administrator</p>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-(--fg)">
            Webhooks
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
            Send a signed HTTP request to your own systems when an envelope is
            completed, declined, voided, or expires. URLs must use HTTPS. The
            signing secret is shown once; keep it where you verify the
            signature. Failed deliveries are tried again from the daily cleanup
            job.
          </p>
        </div>

        {error ? (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        ) : null}

        {revealedSecret ? (
          <div className="notice notice-accent" role="status">
            <p className="font-semibold text-(--fg)">
              Signing secret (shown once)
            </p>
            <p className="mt-2 break-all font-mono text-sm text-(--fg)">
              {revealedSecret.secret}
            </p>
            <p className="mt-2 text-sm leading-6">
              Copy it now. SignuDoc will not show it again. Use it to check the{" "}
              <code>SignuDoc-Signature</code> header, as described in the
              self-hosting guide.
            </p>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={addEndpoint}>
          <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
            Add an endpoint
          </h3>
          <FieldShell
            label="Payload URL"
            name="webhook-url"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/webhooks/signudoc"
            readOnly={false}
            value={url}
          />
          <FieldShell
            helper="Optional. Only you see this."
            label="Description"
            name="webhook-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Billing, CRM, archive…"
            readOnly={false}
            value={description}
          />
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-(--fg)">
              Events
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {webhookEventTypes.map((event) => (
                <label
                  className="well flex items-start gap-3 px-4 py-3"
                  key={event}
                >
                  <Checkbox
                    checked={events.includes(event)}
                    className="mt-0.5"
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-(--fg)">
                      {EVENT_LABELS[event]}
                    </span>
                    <span className="block font-mono text-xs text-(--tertiary)">
                      {event}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <ShellButton className="w-fit" loading={isSaving} type="submit">
            {isSaving ? "Adding..." : "Add endpoint"}
          </ShellButton>
        </form>

        <div className="space-y-4 border-t border-(--border) pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
              Endpoints
            </h3>
            <button
              className="btn-quiet"
              onClick={() => setReloads((count) => count + 1)}
              type="button"
            >
              Refresh
            </button>
          </div>

          {endpoints === null && !error ? (
            <p className="text-sm text-(--secondary)">Loading endpoints…</p>
          ) : null}

          {endpoints && endpoints.length === 0 ? (
            <p className="text-sm text-(--secondary)">
              No endpoints yet. Add an HTTPS URL above.
            </p>
          ) : null}

          {endpoints?.map((endpoint) => (
            <article className="well space-y-4 p-4 sm:p-5" key={endpoint.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="break-all font-semibold text-(--fg)">
                    {endpoint.url}
                  </p>
                  {endpoint.description ? (
                    <p className="text-sm text-(--secondary)">
                      {endpoint.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-(--tertiary)">
                    {endpoint.events
                      .map((event) => EVENT_LABELS[event] ?? event)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`pill ${endpoint.enabled ? "pill-success" : "pill-neutral"}`}
                >
                  {endpoint.enabled ? "On" : "Off"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-quiet"
                  disabled={pendingId === endpoint.id}
                  onClick={() =>
                    void patchEndpoint(endpoint, { enabled: !endpoint.enabled })
                  }
                  type="button"
                >
                  {endpoint.enabled ? "Turn off" : "Turn on"}
                </button>
                <button
                  className="btn-quiet"
                  disabled={pendingId === endpoint.id}
                  onClick={() => void sendTest(endpoint)}
                  type="button"
                >
                  Send test event
                </button>
                <button
                  className="btn-quiet"
                  disabled={pendingId === endpoint.id}
                  onClick={() => void rotateSecret(endpoint)}
                  type="button"
                >
                  Rotate secret
                </button>
                <button
                  className="btn-quiet btn-quiet-danger"
                  disabled={pendingId === endpoint.id}
                  onClick={() => void removeEndpoint(endpoint)}
                  type="button"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-[0.9375rem] font-bold text-(--fg)">
                  Recent deliveries
                </h4>
                {endpoint.deliveries.length === 0 ? (
                  <p className="text-sm text-(--secondary)">
                    Nothing sent yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {endpoint.deliveries.map((delivery) => (
                      <li
                        className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-(--surface) px-4 py-3 text-sm"
                        key={delivery.id}
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-(--fg)">
                            {EVENT_LABELS[delivery.eventType] ??
                              delivery.eventType}
                            <span className="font-normal text-(--secondary)">
                              {" "}
                              · {deliveryStatusLabel(delivery.status)}
                              {delivery.lastStatusCode
                                ? ` · HTTP ${String(delivery.lastStatusCode)}`
                                : ""}
                              {` · ${String(delivery.attemptCount)} attempt${delivery.attemptCount === 1 ? "" : "s"}`}
                            </span>
                          </p>
                          {delivery.lastError ? (
                            <p className="text-xs text-(--tertiary)">
                              {delivery.lastError}
                            </p>
                          ) : null}
                          <p className="text-xs text-(--tertiary)">
                            {formatTime(
                              delivery.lastAttemptAt ?? delivery.createdAt,
                            )}
                          </p>
                        </div>
                        <button
                          className="btn-quiet"
                          disabled={pendingId === delivery.id}
                          onClick={() => void sendAgain(delivery)}
                          type="button"
                        >
                          Send again
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
