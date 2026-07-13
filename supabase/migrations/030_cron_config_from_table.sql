-- ============================================================================
-- Migração 030 — Cron process-ai-agent-queue lê config de integration_keys
-- ----------------------------------------------------------------------------
-- PROBLEMA (descoberto na validação da 3.3, 13/07/2026): o cron da 028 dependia
-- de `current_setting('app.supabase_url')` / `app.service_role_key`, que exigem
-- `ALTER DATABASE ... SET` — e esse comando precisa de privilégios de OWNER da
-- BD (a password do Postgres / painel Supabase), que o `supabase db push` NÃO
-- tem (SQLSTATE 42501 permission denied). Resultado: as settings nunca foram
-- definidas e o cron, embora agendado, nunca disparava o net.http_post — a fila
-- do agente acumulava e só era processada por invocação manual.
--
-- SOLUÇÃO (sem OWNER, sem segredo no git): a config do cron passa a viver na
-- tabela `integration_keys` (service='cron': `supabase_url`, `service_role_key`),
-- que se escreve com a service_role normal (já usada para uazapi/anthropic). Uma
-- função SECURITY DEFINER lê-a, e o cron é reagendado para a usar. O segredo
-- vive só na BD (nunca no ficheiro versionado).
--
-- Idempotente: CREATE OR REPLACE + unschedule antes de reagendar.
-- ============================================================================

-- ── Helper: lê um valor de config do cron a partir de integration_keys ───────
CREATE OR REPLACE FUNCTION public.cron_config(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key_value FROM public.integration_keys
  WHERE service = 'cron' AND key_name = p_key AND is_active
  LIMIT 1;
$$;

-- ── Reagendar process-ai-agent-queue a ler de cron_config() ──────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('process-ai-agent-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-ai-agent-queue',
  '* * * * *',
  $CRON$
  SELECT net.http_post(
    url := public.cron_config('supabase_url') || '/functions/v1/gm-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.cron_config('service_role_key')
    ),
    body := '{"action": "process_queue"}'::jsonb
  )
  WHERE public.cron_config('supabase_url') IS NOT NULL
    AND public.cron_config('supabase_url') <> '';
  $CRON$
);

-- ============================================================================
-- ROLLBACK:
--   -- repor o cron da 028 (current_setting) ou:
--   SELECT cron.unschedule('process-ai-agent-queue');
--   DROP FUNCTION IF EXISTS public.cron_config(TEXT);
-- ============================================================================
