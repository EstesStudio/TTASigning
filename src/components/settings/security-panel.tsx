"use client";

import { useEffect, useState } from "react";

import type { SettingsMessages } from "@/lib/i18n/settings-messages";
import { useSettingsMessages } from "@/lib/i18n/use-settings-messages";
import type { SystemAuditEvent } from "@/lib/services/system-audit";
import {
  SESSION_IDLE_CHOICES,
  SESSION_MAX_HOURS_CHOICES,
} from "@/lib/session-choices";

// Sign-in security and the install's own audit trail. Administrators only.

type AuditResponse = {
  chain?:
    | { events: number; ok: true }
    | { brokenAtSequence: number; events: number; ok: false };
  error?: string;
  events?: SystemAuditEvent[];
} | null;

function describeEvent(event: SystemAuditEvent, t: SettingsMessages): string {
  const m = t.security;
  const metadata = event.metadata ?? {};
  const target =
    typeof metadata.targetName === "string"
      ? `${metadata.targetName}${typeof metadata.targetEmail === "string" ? ` <${metadata.targetEmail}>` : ""}`
      : null;

  switch (event.event) {
    case "part11_mode_changed":
    case "two_factor_requirement_changed":
      return metadata.to === true ? m.turnedOn : m.turnedOff;
    case "role_changed":
      return m.roleChange(
        target ?? m.account,
        String(metadata.from),
        String(metadata.to),
      );
    case "settings_changed":
      return typeof metadata.changes === "object" && metadata.changes
        ? Object.keys(metadata.changes).join(", ")
        : "";
    case "identity_verified":
      return `${target ?? ""}${typeof metadata.note === "string" ? `: ${metadata.note}` : ""}`;
    case "reauthentication_failed":
    case "signing_locked":
      return typeof metadata.failedAttempts === "number"
        ? m.wrongInARow(metadata.failedAttempts)
        : "";
    case "sign_in_failed":
      return typeof metadata.reason === "string"
        ? (m.signInFailureReasons[metadata.reason] ?? metadata.reason)
        : "";
    case "sign_in_succeeded":
      return metadata.secondStep === "backup_code"
        ? m.withBackupCode
        : metadata.secondStep === "authenticator"
          ? m.withAuthenticator
          : "";
    case "logo_changed":
      return metadata.action === "removed" ? m.logoRemoved : m.logoReplaced;
    case "email_domain_changed":
      return typeof metadata.domain === "string" ? metadata.domain : "";
    default:
      return target ?? "";
  }
}

export function SecurityPanel({
  initialRequireTwoFactor,
  initialSessionIdleMinutes,
  initialSessionMaxHours,
}: {
  initialRequireTwoFactor: boolean;
  initialSessionIdleMinutes: number | null;
  initialSessionMaxHours: number | null;
}) {
  const t = useSettingsMessages();
  const GENERIC_ERROR_MESSAGE = t.common.genericError;
  const [requireTwoFactor, setRequireTwoFactor] = useState(
    initialRequireTwoFactor,
  );
  const [savedLimits, setSavedLimits] = useState({
    sessionIdleMinutes: initialSessionIdleMinutes,
    sessionMaxHours: initialSessionMaxHours,
  });
  const [limits, setLimits] = useState(savedLimits);
  const [limitsMessage, setLimitsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [audit, setAudit] = useState<AuditResponse>(null);
  const [auditRevision, setAuditRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/audit", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as AuditResponse;

        setAudit(
          response.ok
            ? payload
            : { error: payload?.error ?? GENERIC_ERROR_MESSAGE },
        );
      })
      .catch((loadError: unknown) => {
        if (!(
          loadError instanceof DOMException && loadError.name === "AbortError"
        )) {
          setAudit({ error: GENERIC_ERROR_MESSAGE });
        }
      });

    return () => controller.abort();
  }, [GENERIC_ERROR_MESSAGE, auditRevision]);

  async function changeRequirement(next: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/security", {
        body: JSON.stringify({ requireTwoFactor: next }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        requireTwoFactor?: boolean;
      } | null;

      if (!response.ok || typeof payload?.requireTwoFactor !== "boolean") {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setRequireTwoFactor(payload.requireTwoFactor);
      setAuditRevision((value) => value + 1);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveLimits() {
    setIsSaving(true);
    setError(null);
    setLimitsMessage(null);

    try {
      const response = await fetch("/api/admin/security", {
        body: JSON.stringify(limits),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        sessionIdleMinutes?: number | null;
        sessionMaxHours?: number | null;
      } | null;

      if (!response.ok || payload?.sessionIdleMinutes === undefined) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      const saved = {
        sessionIdleMinutes: payload.sessionIdleMinutes,
        sessionMaxHours: payload.sessionMaxHours ?? null,
      };

      setSavedLimits(saved);
      setLimits(saved);
      setLimitsMessage(t.security.limitsSaved);
      setAuditRevision((value) => value + 1);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  const limitsChanged =
    limits.sessionIdleMinutes !== savedLimits.sessionIdleMinutes ||
    limits.sessionMaxHours !== savedLimits.sessionMaxHours;

  return (
    <div className="space-y-5 border-t border-(--border) pt-8" id="security">
      <div className="space-y-2">
        <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
          {t.security.heading}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.security.description}
        </p>
      </div>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`pill ${requireTwoFactor ? "pill-success" : "pill-neutral"}`}
        >
          {requireTwoFactor
            ? t.security.requiredForEveryone
            : t.security.optional}
        </span>
        <button
          className={
            requireTwoFactor ? "btn-quiet btn-quiet-danger" : "btn-quiet"
          }
          disabled={isSaving}
          onClick={() => void changeRequirement(!requireTwoFactor)}
          type="button"
        >
          {isSaving
            ? t.common.saving
            : requireTwoFactor
              ? t.security.stopRequiring
              : t.security.require}
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-[0.9375rem] font-bold text-(--fg)">
          {t.security.sessionsHeading}
        </h4>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.security.sessionsDescription}
        </p>
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[0.8125rem] font-semibold text-(--secondary)">
              {t.security.idleLabel}
            </span>
            <select
              className="field-input"
              disabled={isSaving}
              onChange={(event) => {
                setLimitsMessage(null);
                setLimits((current) => ({
                  ...current,
                  sessionIdleMinutes:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }));
              }}
              value={limits.sessionIdleMinutes ?? ""}
            >
              <option value="">{t.security.never}</option>
              {SESSION_IDLE_CHOICES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t.security.minutes(minutes)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[0.8125rem] font-semibold text-(--secondary)">
              {t.security.maxLabel}
            </span>
            <select
              className="field-input"
              disabled={isSaving}
              onChange={(event) => {
                setLimitsMessage(null);
                setLimits((current) => ({
                  ...current,
                  sessionMaxHours:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                }));
              }}
              value={limits.sessionMaxHours ?? ""}
            >
              <option value="">{t.security.maxDefault}</option>
              {SESSION_MAX_HOURS_CHOICES.filter((hours) => hours !== 168).map(
                (hours) => (
                  <option key={hours} value={hours}>
                    {t.security.hours(hours)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-quiet"
            disabled={isSaving || !limitsChanged}
            onClick={() => void saveLimits()}
            type="button"
          >
            {isSaving ? t.common.saving : t.security.saveLimits}
          </button>
          {limitsMessage ? (
            <span className="text-sm text-(--secondary)" role="status">
              {limitsMessage}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-[0.9375rem] font-bold text-(--fg)">
            {t.security.auditHeading}
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-quiet"
              onClick={() => setAuditRevision((value) => value + 1)}
              type="button"
            >
              {t.security.refresh}
            </button>
            <a className="btn-quiet" href="/api/admin/audit?format=csv">
              {t.security.downloadCsv}
            </a>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.security.auditDescription}
        </p>

        {audit?.error ? (
          <div className="notice notice-danger" role="alert">
            {audit.error}
          </div>
        ) : null}

        {audit?.chain ? (
          <p
            className={`notice ${audit.chain.ok ? "notice-success" : "notice-danger"}`}
            role="status"
          >
            {audit.chain.ok
              ? t.security.chainIntact(audit.chain.events)
              : t.security.chainBroken(audit.chain.brokenAtSequence)}
          </p>
        ) : null}

        {audit?.events ? (
          audit.events.length === 0 ? (
            <p className="text-sm text-(--secondary)">
              {t.security.nothingRecorded}
            </p>
          ) : (
            <ul aria-label={t.security.auditHeading} className="space-y-2">
              {audit.events.map((event) => (
                <li className="well p-3 text-sm" key={event.id}>
                  <p className="font-semibold text-(--fg)">
                    {t.security.events[event.event] ?? event.event}
                    <span className="font-normal text-(--secondary)">
                      {" "}
                      {describeEvent(event, t)}
                    </span>
                  </p>
                  <p className="text-xs text-(--tertiary)">
                    {new Date(event.createdAt * 1000)
                      .toISOString()
                      .replace("T", " ")
                      .replace(/\.\d{3}Z$/, " UTC")}
                    {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                    {event.ipAddress ? ` · ${event.ipAddress}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
