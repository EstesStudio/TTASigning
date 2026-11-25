-- Whether an SMTP idempotency key has been delivered (see
-- 20261123100000_smtp_email_idempotency.sql, published without this column).
--
-- * 'sending' while the message is being handed to the SMTP server. A retry
--   that finds a key still 'sending' after a few minutes takes it over and
--   sends: the earlier attempt was interrupted (the app stopped, for
--   example), and losing the message would be worse than a rare duplicate.
--   A retry while the first attempt may still be running fails, so the
--   caller tries again later instead of counting the message as sent.
-- * 'sent' once the server accepted it. A retry then is not sent again.
--
-- Keys already in the table were claimed by the earlier code, which kept a
-- key only for a send it had started; they are taken as 'sending', so a
-- retry after the lease sends them rather than skipping them.
alter table public.email_idempotency_keys
  add column if not exists state text not null default 'sending';

alter table public.email_idempotency_keys
  drop constraint if exists email_idempotency_keys_state_check;

alter table public.email_idempotency_keys
  add constraint email_idempotency_keys_state_check
  check (state in ('sending', 'sent'));
