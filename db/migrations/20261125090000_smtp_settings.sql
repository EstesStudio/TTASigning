-- The SMTP server an administrator can enter under Settings, Organization,
-- for an install that sends with EMAIL_DRIVER=smtp. Each SMTP_* environment
-- variable that is set wins over its column. Null means "not set".
--
-- * smtp_secure: true for TLS from the start, false for STARTTLS, null to go
--   by the port (TLS from the start on 465, STARTTLS on any other).
-- * smtp_password: the password sealed with AES-256-GCM, under a key derived
--   from BETTER_AUTH_SECRET (see smtp-settings.ts), never the password
--   itself. After that secret changes it can no longer be read, and has to
--   be entered again.
-- * smtp_tested_fingerprint: an HMAC of the SMTP settings the last test
--   email that got through was sent with, keyed from BETTER_AUTH_SECRET.
--   "Email works" only counts for SMTP while the settings in use still give
--   the same value.

alter table public.app_settings
  add column if not exists smtp_host text
    check (smtp_host is null or char_length(smtp_host) between 1 and 253),
  add column if not exists smtp_port integer
    check (smtp_port is null or smtp_port between 1 and 65535),
  add column if not exists smtp_secure boolean,
  add column if not exists smtp_user text
    check (smtp_user is null or char_length(smtp_user) between 1 and 320),
  add column if not exists smtp_password text,
  add column if not exists smtp_tested_fingerprint text;
