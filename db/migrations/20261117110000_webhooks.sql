-- Signed HTTP callbacks when an envelope is completed, declined, voided or
-- expires. An administrator adds the URL under Settings. Each delivery is
-- signed with a secret shown once, and failed deliveries are tried again
-- from the daily cleanup job.
--
-- * webhook_endpoints: the URLs to call, which events they want, and the
--   signing secret. The secret never leaves this table except when it is
--   first created or rotated.
-- * webhook_deliveries: one row per event per endpoint. The JSON body is
--   kept so a retry sends the same event; the signature is made at send
--   time from the current secret. claimed_until holds a row while a POST is
--   in flight so two senders cannot both write the result. The body is
--   dropped when the envelope is deleted, and by the daily job after 30
--   days.

create table if not exists public.webhook_endpoints (
  id text primary key,
  url text not null,
  description text,
  events text[] not null,
  enabled boolean not null default true,
  secret text not null,
  created_at bigint not null,
  updated_at bigint not null,
  constraint webhook_endpoints_events_not_empty
    check (cardinality(events) >= 1)
);

create table if not exists public.webhook_deliveries (
  id text primary key,
  endpoint_id text not null
    references public.webhook_endpoints (id) on delete cascade,
  event_id text not null,
  event_type text not null,
  payload jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'failed')),
  attempt_count integer not null default 0,
  next_attempt_at bigint not null,
  last_status_code integer,
  last_error text,
  last_attempt_at bigint,
  claimed_until bigint,
  created_at bigint not null,
  constraint webhook_deliveries_endpoint_event_unique
    unique (endpoint_id, event_id)
);

create index if not exists idx_webhook_deliveries_retry
  on public.webhook_deliveries (status, next_attempt_at);

create index if not exists idx_webhook_deliveries_endpoint_created
  on public.webhook_deliveries (endpoint_id, created_at desc);

create index if not exists idx_webhook_deliveries_envelope
  on public.webhook_deliveries ((payload -> 'envelope' ->> 'id'));

-- Envelope deletion through retention (or anywhere else) must not leave the
-- title and sender email in delivery history.
create or replace function public.forget_webhook_delivery_payloads()
returns trigger
language plpgsql
as $$
begin
  update public.webhook_deliveries
  set
    payload = null,
    status = case when status = 'pending' then 'failed' else status end,
    last_error = case
      when status = 'pending' then 'The envelope was deleted.'
      else last_error
    end,
    claimed_until = null
  where payload -> 'envelope' ->> 'id' = old.id
    and payload is not null;
  return old;
end;
$$;

drop trigger if exists trg_forget_webhook_payloads on public.envelopes;

create trigger trg_forget_webhook_payloads
  before delete on public.envelopes
  for each row
  execute function public.forget_webhook_delivery_payloads();
