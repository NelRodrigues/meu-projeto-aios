-- ============================================================================
-- Migração 032 — Cron `lembretes-tick` (lembrete D-1 da consulta) — Story 3.5 (AC5)
-- ----------------------------------------------------------------------------
-- Agenda o lembrete D-1 da Consulta de Orientação. Invoca a edge `gm-agent` com
-- `{action:"lembretes_tick"}`, que selecciona consultas vivas nas próximas 24h
-- ainda não lembradas, envia UM lembrete WhatsApp ao lead e marca
-- `consultations.lembrete_24h_enviado=true` (idempotente).
--
-- Frequência: a Arquitectura §4.2 define `lembretes-tick` como DIÁRIO. Corremos a
-- CADA HORA (`0 * * * *`) para reduzir a latência do lembrete (uma consulta às
-- 09:00 é lembrada perto das 09:00 do dia anterior, não à meia-noite). A
-- idempotência (flag na BD + janela [now, now+24h)) garante 1 só lembrete por
-- consulta, independentemente da frequência do tick.
--
-- Config (URL + service_role) vem de `public.cron_config()` (migração 030) — o
-- MESMO padrão do cron `process-ai-agent-queue`, sem exigir OWNER da BD nem
-- segredos no git.
--
-- Dependências: 030 (`cron_config`), 031 (`consultations`), edge `gm-agent`
-- (action `lembretes_tick`, deploy pela sessão main).
-- Idempotente: unschedule antes de reagendar.
-- ============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('lembretes-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'lembretes-tick',
  '0 * * * *',
  $CRON$
  SELECT net.http_post(
    url := public.cron_config('supabase_url') || '/functions/v1/gm-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.cron_config('service_role_key')
    ),
    body := '{"action": "lembretes_tick"}'::jsonb
  )
  WHERE public.cron_config('supabase_url') IS NOT NULL
    AND public.cron_config('supabase_url') <> '';
  $CRON$
);

-- ============================================================================
-- ROLLBACK:
--   SELECT cron.unschedule('lembretes-tick');
-- ============================================================================
