-- Idempotency keys of emails sent over SMTP (EMAIL_DRIVER=smtp).
--
-- Resend refuses a second send with the same idempotency key for 24 hours.
-- SMTP has no such thing, so the SMTP driver claims each key here before it
-- sends, and a retry that finds its key already claimed is not sent again
-- (an expiry notice whose follow-up database write failed, for example).
-- A key that fails to send is released so the retry can go out. Rows older
-- than 24 hours are removed as new keys are claimed, matching Resend.
CREATE TABLE IF NOT EXISTS email_idempotency_keys (
  key text PRIMARY KEY,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_idempotency_keys_claimed_at_idx
  ON email_idempotency_keys (claimed_at);
