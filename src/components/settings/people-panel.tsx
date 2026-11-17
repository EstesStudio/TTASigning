"use client";

import { useEffect, useRef, useState } from "react";

import { useSettingsMessages } from "@/lib/i18n/use-settings-messages";
import type { PeopleList, Person, PersonRole } from "@/lib/people";

// Who has an account on this install, and which of them are administrators.
// Administrators only.
//
// The list that arrives stops at five hundred accounts, so finding a person
// is the server's job: what is typed is sent along, and the list on screen
// is the answer to it.

/** How long typing has to pause before the list is asked for again. */
const SEARCH_DELAY_MS = 250;
/** With fewer accounts than this, nobody needs to search. */
const SEARCH_FROM_TOTAL = 9;

type PeopleResponse =
  (Partial<PeopleList> & { error?: string; you?: string }) | null;

function readPeopleList(payload: PeopleResponse): PeopleList | null {
  if (!payload || !Array.isArray(payload.people)) {
    return null;
  }

  return {
    administratorCount:
      payload.administratorCount ??
      payload.people.filter((person) => person.role === "admin").length,
    people: payload.people,
    total: payload.total ?? payload.people.length,
  };
}

export function PeoplePanel({ part11Mode = false }: { part11Mode?: boolean }) {
  const t = useSettingsMessages();
  const GENERIC_ERROR_MESSAGE = t.common.genericError;

  function showsPart11(person: Person) {
    return (
      part11Mode ||
      person.hasOpenPart11Signing ||
      person.identityVerifiedAt !== null ||
      person.signingLockedAt !== null
    );
  }

  const [list, setList] = useState<PeopleList | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  // What the list on screen was asked for: `filter`, once typing has paused.
  const [search, setSearch] = useState("");
  // Counts up to have the list asked for again with the same search.
  const [reloads, setReloads] = useState(0);
  // The search as it stands now, for an answer that arrives after it moved.
  const latestSearch = useRef(search);
  // Part 11: the person whose identity is being confirmed, and how.
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [verificationNote, setVerificationNote] = useState("");

  useEffect(() => {
    latestSearch.current = search;
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch(filter.trim()),
      SEARCH_DELAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/people?search=${encodeURIComponent(search)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as PeopleResponse;
        const loaded = readPeopleList(payload);

        if (!response.ok || !loaded) {
          setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
          return;
        }

        setList(loaded);
        setYou(payload?.you ?? null);
        setError(null);
      })
      .catch((loadError: unknown) => {
        // Leaving the page, or typing on, cancels the request; that is not
        // a failure.
        if (!(
          loadError instanceof DOMException && loadError.name === "AbortError"
        )) {
          setError(GENERIC_ERROR_MESSAGE);
        }
      });

    return () => controller.abort();
  }, [GENERIC_ERROR_MESSAGE, search, reloads]);

  async function changeRole(person: Person, role: PersonRole) {
    if (pendingId) {
      return;
    }

    setPendingId(person.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/people/${encodeURIComponent(person.id)}`,
        {
          body: JSON.stringify({ role, search }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as PeopleResponse;
      const changed = readPeopleList(payload);

      if (!response.ok || !changed) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      // Having given up the role, this page is no longer theirs to see.
      if (person.id === you && role === "user") {
        window.location.reload();
        return;
      }

      // The search moved on while this was being saved. The list that came
      // back answers the old one, so the list is asked for again.
      if (latestSearch.current !== search) {
        setReloads((count) => count + 1);
        return;
      }

      setList(changed);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function resetTwoFactorFor(person: Person) {
    if (pendingId) {
      return;
    }

    setPendingId(person.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/people/${encodeURIComponent(person.id)}/two-factor?search=${encodeURIComponent(search)}`,
        { method: "DELETE" },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as PeopleResponse;
      const changed = readPeopleList(payload);

      if (!response.ok || !changed) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setResettingId(null);

      if (latestSearch.current !== search) {
        setReloads((count) => count + 1);
        return;
      }

      setList(changed);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  async function changePart11(
    person: Person,
    action: "revoke" | "unlock" | "verify",
  ) {
    if (pendingId) {
      return;
    }

    setPendingId(person.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/people/${encodeURIComponent(person.id)}/part11`,
        {
          body: JSON.stringify({
            action,
            note: action === "verify" ? verificationNote : undefined,
            search,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as PeopleResponse;
      const changed = readPeopleList(payload);

      if (!response.ok || !changed) {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setVerifyingId(null);
      setVerificationNote("");

      if (latestSearch.current !== search) {
        setReloads((count) => count + 1);
        return;
      }

      setList(changed);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingId(null);
    }
  }

  const people = list?.people ?? null;
  const administratorCount = list?.administratorCount ?? 0;
  const searching = filter.trim().length > 0 || search.length > 0;
  const canSearch =
    list !== null && (searching || list.total >= SEARCH_FROM_TOTAL);

  return (
    <div className="space-y-5 border-t border-(--border) pt-8">
      <div className="space-y-2">
        <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
          {t.people.heading}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.people.description}
        </p>
      </div>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      {people === null && !error ? (
        <p className="text-sm text-(--secondary)">{t.people.loading}</p>
      ) : null}

      {canSearch ? (
        <label className="grid max-w-sm gap-1.5">
          <span className="text-[0.8125rem] font-semibold text-(--secondary)">
            {t.people.searchLabel}
          </span>
          <input
            className="field-input"
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.people.searchPlaceholder}
            type="search"
            value={filter}
          />
        </label>
      ) : null}

      {people ? (
        <ul aria-label={t.people.listLabel} className="space-y-3">
          {people.map((person) => {
            const isAdmin = person.role === "admin";
            const isYou = person.id === you;
            const isLastAdmin = isAdmin && administratorCount === 1;

            return (
              <li
                className="well flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={person.id}
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-[0.9375rem] font-bold text-(--fg)">
                    {person.name}
                  </p>
                  <p className="truncate text-sm text-(--secondary)">
                    {person.email}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`pill ${isAdmin ? "pill-accent" : "pill-neutral"}`}
                    >
                      {isAdmin ? t.common.administrator : t.people.member}
                    </span>
                    {isYou ? (
                      <span className="pill pill-neutral">{t.people.you}</span>
                    ) : null}
                    {!person.emailVerified ? (
                      <span className="pill pill-warning">
                        {t.people.emailNotConfirmed}
                      </span>
                    ) : null}
                    {person.closing ? (
                      <span className="pill pill-warning">
                        {t.people.closing}
                      </span>
                    ) : null}
                    {showsPart11(person) ? (
                      person.identityVerifiedAt !== null ? (
                        <span
                          className="pill pill-success"
                          title={person.identityVerificationNote ?? undefined}
                        >
                          {t.people.identityConfirmed}
                        </span>
                      ) : (
                        <span className="pill pill-neutral">
                          {t.people.identityNotConfirmed}
                        </span>
                      )
                    ) : null}
                    {person.signingLockedAt !== null ? (
                      <span className="pill pill-danger">
                        {t.people.signingLocked}
                      </span>
                    ) : null}
                    {person.twoFactorEnabled ? (
                      <span className="pill pill-success">
                        {t.people.twoStepOn}
                      </span>
                    ) : null}
                  </div>
                  {person.twoFactorEnabled && !isYou ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {resettingId === person.id ? (
                        <>
                          <span className="text-sm text-(--secondary)">
                            {t.people.resetTwoStepQuestion}
                          </span>
                          <button
                            className="btn-quiet btn-quiet-danger"
                            disabled={pendingId !== null}
                            onClick={() => void resetTwoFactorFor(person)}
                            type="button"
                          >
                            {pendingId === person.id
                              ? t.people.resetting
                              : t.people.reset}
                          </button>
                          <button
                            className="btn-quiet"
                            disabled={pendingId !== null}
                            onClick={() => setResettingId(null)}
                            type="button"
                          >
                            {t.common.cancel}
                          </button>
                        </>
                      ) : (
                        <button
                          aria-label={t.people.resetTwoStepLabel(person.name)}
                          className="btn-quiet"
                          disabled={pendingId !== null}
                          onClick={() => setResettingId(person.id)}
                          title={t.people.resetTwoStepTitle}
                          type="button"
                        >
                          {t.people.resetTwoStep}
                        </button>
                      )}
                    </div>
                  ) : null}
                  {/* Envelopes sent in Part 11 mode keep its rules after it is
                      turned off, so the controls stay for anyone they still
                      concern. */}
                  {showsPart11(person) ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {person.identityVerifiedAt === null ? (
                        part11Mode || person.hasOpenPart11Signing ? (
                          <button
                            aria-label={t.people.confirmIdentityLabel(
                              person.name,
                            )}
                            className="btn-quiet"
                            disabled={
                              pendingId !== null ||
                              !person.emailVerified ||
                              verifyingId === person.id
                            }
                            onClick={() => {
                              setVerifyingId(person.id);
                              setVerificationNote("");
                            }}
                            type="button"
                          >
                            {t.people.confirmIdentity}
                          </button>
                        ) : null
                      ) : (
                        <button
                          aria-label={t.people.revokeIdentityLabel(person.name)}
                          className="btn-quiet btn-quiet-danger"
                          disabled={pendingId !== null}
                          onClick={() => void changePart11(person, "revoke")}
                          type="button"
                        >
                          {t.people.revokeIdentity}
                        </button>
                      )}
                      {person.signingLockedAt !== null ? (
                        <button
                          aria-label={t.people.unlockSigningLabel(person.name)}
                          className="btn-quiet"
                          disabled={pendingId !== null}
                          onClick={() => void changePart11(person, "unlock")}
                          type="button"
                        >
                          {t.people.unlockSigning}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {verifyingId === person.id ? (
                    <div className="grid max-w-md gap-2 pt-2">
                      <label className="grid gap-1.5">
                        <span className="text-[0.8125rem] font-semibold text-(--secondary)">
                          {t.people.verificationNoteLabel}
                        </span>
                        <input
                          className="field-input"
                          maxLength={500}
                          onChange={(event) =>
                            setVerificationNote(event.target.value)
                          }
                          placeholder={t.people.verificationNotePlaceholder}
                          value={verificationNote}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          className="btn-quiet"
                          disabled={
                            pendingId !== null ||
                            verificationNote.trim().length === 0
                          }
                          onClick={() => void changePart11(person, "verify")}
                          type="button"
                        >
                          {pendingId === person.id
                            ? t.common.saving
                            : t.common.save}
                        </button>
                        <button
                          className="btn-quiet"
                          disabled={pendingId !== null}
                          onClick={() => setVerifyingId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {isAdmin ? (
                  <button
                    aria-label={t.people.removeAdminLabel(person.name)}
                    className="btn-quiet btn-quiet-danger shrink-0"
                    disabled={pendingId !== null || isLastAdmin}
                    onClick={() => void changeRole(person, "user")}
                    title={isLastAdmin ? t.people.lastAdminTitle : undefined}
                    type="button"
                  >
                    {pendingId === person.id
                      ? t.common.saving
                      : t.people.removeAdmin}
                  </button>
                ) : (
                  <button
                    aria-label={t.people.makeAdminLabel(person.name)}
                    className="btn-quiet shrink-0"
                    disabled={
                      pendingId !== null ||
                      !person.emailVerified ||
                      person.closing
                    }
                    onClick={() => void changeRole(person, "admin")}
                    type="button"
                  >
                    {pendingId === person.id
                      ? t.common.saving
                      : t.people.makeAdmin}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {people && people.length === 0 ? (
        <p className="text-sm text-(--secondary)">{t.people.noMatch}</p>
      ) : null}

      {list && list.total > list.people.length ? (
        <p className="text-sm text-(--secondary)">
          {t.people.showingFirst(list.people.length, list.total)}
        </p>
      ) : null}
    </div>
  );
}
