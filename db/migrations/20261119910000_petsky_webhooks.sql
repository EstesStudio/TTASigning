-- PetskySign: outgoing webhooks for documents sent through the API.
--
-- Each API key may name a URL. When something happens to a document that key
-- sent (viewed, signed, declined, voided, expired...), a delivery row is
-- written in the same transaction as the audit event, and delivered after
-- commit and by the scheduled job until the receiver answers 2xx or the
-- attempts run out. The receiver should re-read the document's status: the
-- webhook says that something changed, not what is true now.

alter table public.api_keys
  add column if not exists webhook_url text;

-- Shared with the receiver, which checks the HMAC with it. Not a password:
-- it has to be readable to sign each delivery.
alter table public.api_keys
  add column if not exists webhook_secret text;

create table if not exists public.webhook_deliveries (
  id text primary key,
  api_key_id text not null references public.api_keys(id) on delete cascade,
  envelope_id text not null references public.envelopes(id) on delete cascade,
  audit_event_id text not null,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'failed')),
  attempts integer not null default 0,
  next_attempt_at bigint not null,
  last_attempt_at bigint,
  last_status_code integer,
  last_error text,
  delivered_at bigint,
  created_at bigint not null default (extract(epoch from now())::bigint),
  constraint webhook_deliveries_event_unique unique (api_key_id, audit_event_id)
);

create index if not exists idx_webhook_deliveries_due
  on public.webhook_deliveries(next_attempt_at)
  where status = 'pending';

create index if not exists idx_webhook_deliveries_envelope
  on public.webhook_deliveries(envelope_id);
