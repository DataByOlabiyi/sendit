-- Schedule the order-timeout edge function to actually run. It was
-- deployable but never invoked by anything — no pg_cron job existed, so
-- neither the paid/no-rider sweep nor the abandoned-payment sweep
-- (2026-07-13) ever fired automatically; every stuck/abandoned order has
-- required manual cleanup.
--
-- The function requires `Authorization: Bearer <service_role_key>`. That
-- key must never be committed to a migration file, so it is looked up at
-- runtime from Supabase Vault by name rather than embedded here. Before
-- this job can succeed, a secret named 'order_timeout_service_key' must
-- exist in Vault (Dashboard → Project Settings → Vault) holding the
-- project's service_role key. Until that secret exists, this job runs
-- every 5 minutes and no-ops (net.http_post sends an empty Authorization
-- value, the function 401s, nothing is cancelled) — it does not fail loudly,
-- so the Vault secret must be added for the sweep to actually take effect.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'order-timeout-sweep',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xprzsmucrbuvsfmmdjbw.supabase.co/functions/v1/order-timeout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'order_timeout_service_key'),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
