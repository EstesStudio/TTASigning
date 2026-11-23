-- Microsoft 365 credentials entered in Settings, for EMAIL_DRIVER=graph.
--
-- * app_settings.graph_tenant_id, graph_client_id: the Entra tenant and the
--   app registration that sends. Null when not entered; the
--   MICROSOFT_GRAPH_TENANT_ID and MICROSOFT_GRAPH_CLIENT_ID variables win
--   over them when set.
-- * app_settings.graph_client_secret: the app's client secret, encrypted
--   with a key derived from BETTER_AUTH_SECRET (see email-graph-settings.ts).
--   MICROSOFT_GRAPH_CLIENT_SECRET wins over it when set.
--
-- The mailbox mail is sent from is the existing sender_address.

alter table public.app_settings
  add column if not exists graph_tenant_id text
    check (
      graph_tenant_id is null
      or char_length(graph_tenant_id) between 1 and 255
    ),
  add column if not exists graph_client_id text
    check (
      graph_client_id is null
      or char_length(graph_client_id) between 1 and 255
    ),
  add column if not exists graph_client_secret text
    check (
      graph_client_secret is null
      or char_length(graph_client_secret) between 1 and 4096
    );
