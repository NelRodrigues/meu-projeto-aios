-- ============================================================================
-- Migração 028 — Crons da fila do agente (subconjunto da 017 arquitectural)
-- Story 3.1: Canal WhatsApp — AC6 (crons `process-ai-agent-queue` e
-- `recover-stuck-queue`).
-- ----------------------------------------------------------------------------
-- Porquê separada da 017 da arquitectura: a 017 agrupa 6 crons, mas a story 3.1
-- só precisa de 2 (`process-ai-agent-queue` 1min, `recover-stuck-queue` 3min).
-- Os restantes (`followup-tick`, `lembretes-tick`, `compliance-2anos`,
-- `refresh-rfv`) pertencem ao E4 e ficam para uma migração posterior.
--
-- DEPENDÊNCIA EXTERNA (gate): `process-ai-agent-queue` invoca a edge `gm-agent`,
-- que só é implementada na story 3.2. Até lá o `net.http_post` devolve erro do
-- alvo — isso é INOFENSIVO: o pg_cron não bloqueia nem falha a BD, apenas não há
-- processamento efectivo (o canal + a fila já ficam a acumular). `recover-stuck-
-- queue` chama a RPC local `process_ai_agent_queue()` (já criada na 027) e
-- funciona desde já.
--
-- REQUER settings de sessão da BD (padrão ISILDA 023/028):
--   ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';
-- Estes são definidos na APLICAÇÃO da migração (pela sessão main, não aqui), a
-- partir de NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do .env.local.
-- Se ausentes, o cron `process-ai-agent-queue` é agendado na mesma mas o
-- current_setting devolve vazio até serem definidos (guard com missing_ok=true).
--
-- Fonte vinculativa: Arquitectura §4.2 (crons da base), ISILDA 023 (padrão cron).
-- Idempotente: cron.unschedule antes de reagendar.
-- ============================================================================

-- ── Cron 1: process-ai-agent-queue (1 min) → invoca edge gm-agent ───────────
-- pg_cron não suporta segundos; o debounce de 10s é gerido pela RPC/trigger
-- (scheduled_for). O gm-agent chega na 3.2 — o alvo pode ainda não existir.
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
    url := current_setting('app.supabase_url', true) || '/functions/v1/gm-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{"action": "process_queue"}'::jsonb
  )
  WHERE current_setting('app.supabase_url', true) IS NOT NULL
    AND current_setting('app.supabase_url', true) <> '';
  $CRON$
);

-- ── Cron 2: recover-stuck-queue (3 min) → RPC local (destrava >3min) ─────────
-- Funciona desde já (não depende de nenhuma edge).
DO $$
BEGIN
  PERFORM cron.unschedule('recover-stuck-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'recover-stuck-queue',
  '*/3 * * * *',
  $CRON$ SELECT public.process_ai_agent_queue(); $CRON$
);

-- ============================================================================
-- ROLLBACK:
--   SELECT cron.unschedule('process-ai-agent-queue');
--   SELECT cron.unschedule('recover-stuck-queue');
-- ============================================================================
