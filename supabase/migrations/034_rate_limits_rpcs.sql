-- ============================================================================
-- Migração 034 — RPCs de rate limits do agente — Story 3.7 (AC1, AC2)
-- ----------------------------------------------------------------------------
-- §8.5: rate limits em BD, SEM Redis. A tabela `ai_agent_send_counts` (migração
-- 027) já existe (janelas hour/day por lead). Esta migração dá-lhe as RPCs:
--
--   1. record_agent_send(lead_id) — INCREMENTA os contadores hour+day de forma
--      ATÓMICA (INSERT ... ON CONFLICT DO UPDATE). Chamada DEPOIS de cada envio
--      bem-sucedido do agente. Devolve as contagens já actualizadas.
--   2. get_agent_send_counts(lead_id) — LÊ as contagens das janelas actuais
--      (sem incrementar). Chamada ANTES de responder (com total da conversa
--      resolvido em app a partir de ai_agent_conversations.total_messages_sent).
--   3. resume_scheduled_conversations() — repõe `active` as conversas pausadas
--      por HORÁRIO (paused_by_schedule) para o cron/fila retomar o pendente
--      quando reabre o horário (AC2). Idempotente.
--
-- Janela: date_trunc('hour'|'day', now()) — bordas naturais de relógio (UTC no
-- servidor; a decisão de horário de funcionamento é em app com TZ Africa/Luanda).
-- A contagem por hora/dia é sobre o VOLUME de envios, independente do fuso.
--
-- Dependências: 027 (`ai_agent_send_counts`, `ai_agent_conversations`).
-- Idempotente: CREATE OR REPLACE.
-- ============================================================================


-- ── 1. record_agent_send: incrementa hour+day, devolve contagens ─────────────
CREATE OR REPLACE FUNCTION public.record_agent_send(p_lead_id UUID)
RETURNS TABLE(hour_count INTEGER, day_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hour_start TIMESTAMPTZ := date_trunc('hour', now());
  v_day_start  TIMESTAMPTZ := date_trunc('day', now());
  v_hour INTEGER;
  v_day  INTEGER;
BEGIN
  INSERT INTO public.ai_agent_send_counts (lead_id, window_start, window_type, message_count)
  VALUES (p_lead_id, v_hour_start, 'hour', 1)
  ON CONFLICT (lead_id, window_start, window_type)
  DO UPDATE SET message_count = public.ai_agent_send_counts.message_count + 1
  RETURNING message_count INTO v_hour;

  INSERT INTO public.ai_agent_send_counts (lead_id, window_start, window_type, message_count)
  VALUES (p_lead_id, v_day_start, 'day', 1)
  ON CONFLICT (lead_id, window_start, window_type)
  DO UPDATE SET message_count = public.ai_agent_send_counts.message_count + 1
  RETURNING message_count INTO v_day;

  hour_count := v_hour;
  day_count  := v_day;
  RETURN NEXT;
END;
$$;


-- ── 2. get_agent_send_counts: lê as contagens das janelas actuais ────────────
CREATE OR REPLACE FUNCTION public.get_agent_send_counts(p_lead_id UUID)
RETURNS TABLE(hour_count INTEGER, day_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT message_count FROM public.ai_agent_send_counts
      WHERE lead_id = p_lead_id AND window_type = 'hour'
        AND window_start = date_trunc('hour', now())
    ), 0)::INTEGER,
    COALESCE((
      SELECT message_count FROM public.ai_agent_send_counts
      WHERE lead_id = p_lead_id AND window_type = 'day'
        AND window_start = date_trunc('day', now())
    ), 0)::INTEGER;
$$;


-- ── 3. resume_scheduled_conversations: retoma as pausadas por horário ────────
-- Repõe `active` (limpa pause_reason/paused_at) as conversas que foram pausadas
-- por HORÁRIO. Só toca em `paused_by_schedule` — nunca reactiva pausas por humano
-- (paused_by_human) nem transferências (transferred). Chamada pela app QUANDO já
-- está dentro do horário de funcionamento (a decisão de horário é em app, TZ
-- Africa/Luanda). Devolve o nº de conversas reactivadas.
CREATE OR REPLACE FUNCTION public.resume_scheduled_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH resumed AS (
    UPDATE public.ai_agent_conversations
    SET status = 'active', pause_reason = NULL, paused_at = NULL
    WHERE status = 'paused_by_schedule'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM resumed;
  RETURN v_count;
END;
$$;


-- ============================================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.record_agent_send(UUID);
--   DROP FUNCTION IF EXISTS public.get_agent_send_counts(UUID);
--   DROP FUNCTION IF EXISTS public.resume_scheduled_conversations();
-- ============================================================================
