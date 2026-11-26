-- One saved signature PNG per account; deleted with the account.

create table if not exists public.saved_signatures (
  user_id text primary key references public."user"(id) on delete cascade,
  image bytea not null,
  updated_at bigint not null
);
