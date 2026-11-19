-- PetskySign: the business a document comes from, shown to its signer
-- instead of the install's own name, logo and color. Set by the API when the
-- document is sent, and kept as it was then.

alter table public.envelopes
  add column if not exists brand_name text
    check (brand_name is null or length(brand_name) between 1 and 120);

-- "#rrggbb", checked and normalized by the app.
alter table public.envelopes
  add column if not exists brand_color text;

-- Storage key of the logo. Logos are stored by content hash, so the same
-- logo sent with many documents is stored once.
alter table public.envelopes
  add column if not exists brand_logo_key text;

-- How the signer can reach the business (an email address or a phone
-- number), for the consent text: where to ask for paper or withdraw.
alter table public.envelopes
  add column if not exists brand_contact text
    check (brand_contact is null or length(brand_contact) between 1 and 200);
