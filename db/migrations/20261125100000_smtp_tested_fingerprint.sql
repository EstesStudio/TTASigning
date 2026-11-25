-- smtp_tested_fingerprint: an HMAC of the SMTP settings the last test email
-- that got through was sent with, keyed from BETTER_AUTH_SECRET (see
-- smtp-settings.ts). "Email works" only counts for SMTP while the settings
-- in use still give the same value. A migration of its own, so a database
-- that already ran 20261125090000_smtp_settings.sql also gets the column.

alter table public.app_settings
  add column if not exists smtp_tested_fingerprint text;
