-- The language signers are spoken to in, and email is written in.
--
-- One per install, chosen under Settings, Organization. Existing installs
-- keep English, which is what they spoke before this column existed.

alter table public.app_settings
  add column if not exists locale text not null default 'en';

alter table public.app_settings
  drop constraint if exists app_settings_locale_check;

alter table public.app_settings
  add constraint app_settings_locale_check
    check (locale in ('en', 'fr'));
