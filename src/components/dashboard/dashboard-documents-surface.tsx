import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import type { ChangeEventHandler } from "react";

import { cn } from "@/lib/cn";
import type { DashboardEnvelopeListItem } from "@/lib/envelopes";
import {
  envelopeMessages,
  type EnvelopeMessages,
} from "@/lib/i18n/envelope-messages";
import {
  DocumentThumbnail,
  SampleDocumentPage,
} from "@/components/shared/document-thumbnail";
import { ShellButton, StaticShellButton } from "@/components/shared/form-shell";
import { PageHeader } from "@/components/shared/page-header";

export type DashboardShellState = "default" | "empty" | "error";

export type DashboardFilter =
  "All" | "Draft" | "Sent" | "Completed" | "Declined" | "Voided";

type EnvelopeStatus = "draft" | "sent" | "completed" | "declined" | "voided";

export const filterOptions: readonly DashboardFilter[] = [
  "All",
  "Draft",
  "Sent",
  "Completed",
  "Declined",
  "Voided",
];

export const dashboardStatusFilterMap: Record<
  Exclude<DashboardFilter, "All">,
  EnvelopeStatus
> = {
  Completed: "completed",
  Declined: "declined",
  Draft: "draft",
  Sent: "sent",
  Voided: "voided",
};

export type DashboardMessages = EnvelopeMessages["dashboard"];

// The landing page's preview is rendered on the server, without the
// install's language, and speaks English.
const defaultMessages: DashboardMessages = envelopeMessages("en").dashboard;

const statusPillClasses: Record<EnvelopeStatus, string> = {
  completed: "pill-success",
  declined: "pill-danger",
  draft: "pill-neutral",
  sent: "pill-accent",
  voided: "pill-neutral",
};

type DashboardDocumentsHeaderProps = {
  interactive?: boolean;
  messages?: DashboardMessages;
};

type DashboardDocumentsPanelProps = {
  envelopes: readonly DashboardEnvelopeListItem[];
  filteredEnvelopes: readonly DashboardEnvelopeListItem[];
  interactive?: boolean;
  isError?: boolean;
  messages?: DashboardMessages;
  onFilterChange?: (filter: DashboardFilter) => void;
  onReset?: () => void;
  onRetry?: () => void;
  onSearchChange?: ChangeEventHandler<HTMLInputElement>;
  searchValue: string;
  selectedFilter: DashboardFilter;
};

type EnvelopeGridProps = {
  envelopes: readonly DashboardEnvelopeListItem[];
  interactive: boolean;
  messages: DashboardMessages;
};

type NoResultsStateProps = {
  interactive: boolean;
  messages: DashboardMessages;
  onReset?: () => void;
};

type ErrorBannerProps = {
  interactive: boolean;
  messages: DashboardMessages;
  onRetry?: () => void;
};

export function DashboardDocumentsHeader({
  interactive = true,
  messages = defaultMessages,
}: DashboardDocumentsHeaderProps) {
  const label = (
    <>
      <PlusIcon
        aria-hidden="true"
        className="size-[1.125rem]"
        strokeWidth={2.4}
      />
      {messages.newEnvelope}
    </>
  );

  return (
    <PageHeader
      action={
        interactive ? (
          <ShellButton href="/envelopes/new">{label}</ShellButton>
        ) : (
          <StaticShellButton>{label}</StaticShellButton>
        )
      }
      description={messages.description}
      title={messages.title}
    />
  );
}

export function DashboardDocumentsPanel({
  envelopes,
  filteredEnvelopes,
  interactive = true,
  isError = false,
  messages = defaultMessages,
  onFilterChange,
  onReset,
  onRetry,
  onSearchChange,
  searchValue,
  selectedFilter,
}: DashboardDocumentsPanelProps) {
  const hasSeededEnvelopes = envelopes.length > 0;

  return (
    <section className="space-y-4" data-animate="enter" data-animate-delay="1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          aria-label={messages.filterLabel}
          className="segmented self-start"
          role="group"
        >
          {filterOptions.map((filter) => {
            const isActive = filter === selectedFilter;

            if (!interactive) {
              return (
                <span
                  className="segmented-item"
                  data-active={isActive}
                  key={filter}
                >
                  {messages.filters[filter]}
                </span>
              );
            }

            return (
              <button
                aria-pressed={isActive}
                className="segmented-item"
                key={filter}
                onClick={() => onFilterChange?.(filter)}
                type="button"
              >
                {messages.filters[filter]}
              </button>
            );
          })}
        </div>

        <label className="flex min-h-[2.625rem] w-full items-center gap-2.5 rounded-xl bg-white px-3.5 text-(--tertiary) transition focus-within:ring-3 focus-within:ring-ring/50 lg:w-[19rem]">
          <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
          <input
            aria-label={messages.search}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-(--fg) outline-none placeholder:text-(--placeholder)"
            onChange={interactive ? onSearchChange : undefined}
            placeholder={messages.search}
            readOnly={!interactive}
            tabIndex={interactive ? undefined : -1}
            type="search"
            value={searchValue}
          />
        </label>
      </div>

      {isError ? (
        <ErrorBanner
          interactive={interactive}
          messages={messages}
          onRetry={onRetry}
        />
      ) : null}

      {filteredEnvelopes.length > 0 ? (
        <EnvelopeGrid
          envelopes={filteredEnvelopes}
          interactive={interactive}
          messages={messages}
        />
      ) : hasSeededEnvelopes ? (
        <NoResultsState
          interactive={interactive}
          messages={messages}
          onReset={onReset}
        />
      ) : null}

      {!isError && hasSeededEnvelopes ? (
        <p className="px-1 text-[0.8125rem] text-(--tertiary)">
          {messages.showing(filteredEnvelopes.length, envelopes.length)}
        </p>
      ) : null}
    </section>
  );
}

function ErrorBanner({ interactive, messages, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl bg-(--danger-soft) px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <p className="text-sm font-semibold text-(--danger)">
        {messages.loadError}
      </p>
      {interactive ? (
        <ShellButton onClick={onRetry} variant="secondary">
          {messages.retry}
        </ShellButton>
      ) : (
        <StaticShellButton variant="secondary">
          {messages.retry}
        </StaticShellButton>
      )}
    </div>
  );
}

function EnvelopeGrid({ envelopes, interactive, messages }: EnvelopeGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
      {envelopes.map((envelope) => (
        <li className="min-w-0" key={envelope.id}>
          <EnvelopeCard
            envelope={envelope}
            interactive={interactive}
            messages={messages}
          />
        </li>
      ))}
      <li className="min-w-0">
        <UploadCard interactive={interactive} messages={messages} />
      </li>
    </ul>
  );
}

function EnvelopeCard({
  envelope,
  interactive,
  messages,
}: {
  envelope: DashboardEnvelopeListItem;
  interactive: boolean;
  messages: DashboardMessages;
}) {
  const content = (
    <>
      <span className="flex h-52 items-center justify-center rounded-2xl bg-(--surface) p-3.5 transition group-hover:bg-[#f0f0f6]">
        {interactive ? (
          <DocumentThumbnail envelopeId={envelope.id} title={envelope.title} />
        ) : (
          <SampleDocumentPage seed={envelope.id} />
        )}
      </span>

      <span className="block min-w-0 space-y-1 px-1">
        <span
          className={cn(
            "block truncate text-[0.9375rem] font-bold leading-snug",
            envelope.status === "voided" ? "text-(--tertiary)" : "text-(--fg)",
          )}
          role="heading"
          aria-level={2}
        >
          {envelope.title}
        </span>
        <span className="block truncate text-[0.8125rem] text-(--tertiary)">
          {envelope.contextLine}
        </span>
      </span>

      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-1 pb-0.5">
        <span
          aria-label={messages.statusLabel(
            envelope.expired
              ? messages.expired
              : messages.statusLabels[envelope.status],
          )}
          className={cn(
            "pill",
            envelope.expired
              ? "pill-danger"
              : statusPillClasses[envelope.status],
          )}
        >
          {envelope.statusLabel}
        </span>
        <span className="text-xs text-(--tertiary)">
          <span className="sr-only">{messages.createdPrefix}</span>
          {envelope.createdAtLabel}
        </span>
      </span>
    </>
  );
  const className =
    "group panel flex h-full flex-col gap-3.5 rounded-[1.25rem] p-3.5";

  if (!interactive) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link
      className={cn(
        className,
        "transition hover:-translate-y-0.5 hover:shadow-(--shadow-lift)",
      )}
      href={`/envelopes/${envelope.id}`}
    >
      {content}
    </Link>
  );
}

/** The last tile in the grid: the way to add the next document. */
function UploadCard({
  interactive,
  messages,
}: {
  interactive: boolean;
  messages: DashboardMessages;
}) {
  const content = (
    <>
      <span className="inline-flex size-11 items-center justify-center rounded-[0.875rem] bg-(--accent-soft) text-(--accent)">
        <PlusIcon aria-hidden="true" className="size-5" strokeWidth={2.4} />
      </span>
      {messages.uploadPdf}
    </>
  );
  const className =
    "flex h-full min-h-[17.5rem] flex-col items-center justify-center gap-2.5 rounded-[1.25rem] border-2 border-dashed border-(--border-strong) text-sm font-bold text-(--secondary)";

  if (!interactive) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link
      className={cn(
        className,
        "transition hover:border-(--accent) hover:bg-(--accent-softer) hover:text-(--accent-ink)",
      )}
      href="/envelopes/new"
    >
      {content}
    </Link>
  );
}

function NoResultsState({
  interactive,
  messages,
  onReset,
}: NoResultsStateProps) {
  return (
    <div className="panel px-6 py-12 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {messages.noResultsTitle}
        </h2>
        <p className="text-sm leading-6 text-(--secondary)">
          {messages.noResultsHelp}
        </p>
        <div className="flex justify-center pt-2">
          {interactive ? (
            <ShellButton onClick={onReset} variant="secondary">
              {messages.resetFilters}
            </ShellButton>
          ) : (
            <StaticShellButton variant="secondary">
              {messages.resetFilters}
            </StaticShellButton>
          )}
        </div>
      </div>
    </div>
  );
}
