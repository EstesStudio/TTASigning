-- Add draft preparation as a separate API-key permission level. Existing
-- keys retain their read/write scopes and behavior.
alter table public.api_keys
  drop constraint if exists api_keys_scope_check;

alter table public.api_keys
  add constraint api_keys_scope_check
  check (scope in ('read', 'prepare', 'write'));
