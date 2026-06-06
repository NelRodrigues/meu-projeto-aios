-- Migration 028: Cron Job para Recompra por Ocasiao

-- Cron: Executar reminder de recompra todos os dias as 09:00 WAT (08:00 UTC)
SELECT cron.schedule(
  'recompra-diaria',
  '0 8 * * *',  -- 08:00 UTC = 09:00 WAT (Angola GMT+1)
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/recompra-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
