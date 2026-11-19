-- PetskySign: the integration API used by the petsky backend.
--
-- An API key belongs to one account. Everything the key does is done as that
-- account, so documents sent through the API show on its dashboard and
-- follow the same rules as ones sent from the browser. Only the SHA-256 of
-- the key is kept.

create table if not exists public.api_keys (
  id text primary key,
  user_id text not null references public."user"(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  -- The first characters of the key, shown so a person can tell keys apart.
  prefix text not null,
  key_hash text not null unique check (length(key_hash) = 64),
  created_at bigint not null default (extract(epoch from now())::bigint),
  last_used_at bigint,
  revoked_at bigint
);

create index if not exists idx_api_keys_user_id on public.api_keys(user_id);

-- How the signer is reached. "email": invitations and reminders go by email,
-- as always. "link": nothing is emailed to the signer; the sender gets the
-- signing link back and passes it on (petsky sends it by WhatsApp).
alter table public.envelopes
  add column if not exists delivery_channel text not null default 'email';

alter table public.envelopes
  drop constraint if exists envelopes_delivery_channel_check;

alter table public.envelopes
  add constraint envelopes_delivery_channel_check
  check (delivery_channel in ('email', 'link'));

-- The caller's own references: the contract id in petsky and the company
-- (pet care business) it belongs to. Neither is interpreted here.
alter table public.envelopes
  add column if not exists external_ref text;

alter table public.envelopes
  add column if not exists company_ref text;

alter table public.envelopes
  add column if not exists api_key_id text
    references public.api_keys(id) on delete set null;

create index if not exists idx_envelopes_company_ref
  on public.envelopes(user_id, company_ref)
  where company_ref is not null;

-- Not unique: a contract cancelled in petsky can be sent again.
create index if not exists idx_envelopes_external_ref
  on public.envelopes(user_id, external_ref)
  where external_ref is not null;
