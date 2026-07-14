-- ============================================================================
-- Migração 027 — Schema do agente IA (idempotente) + RPCs/trigger da fila robusta
-- Story 3.1: Canal WhatsApp — instância, webhook e fila robusta
-- ----------------------------------------------------------------------------
-- CONTEXTO DE ESTADO REAL (verificado contra a BD de produção da GM, 13/07/2026):
--
--   1. As 9 tabelas do agente (`ai_sales_agents`, `ai_agent_conversations`,
--      `ai_agent_message_queue`, `ai_agent_logs`, `ai_agent_send_counts`,
--      `ai_agent_scheduled_followups`, `ai_agent_cadence_enrollments`,
--      `ai_agent_tools`, `user_availability`) + `webhook_processed_messages` +
--      `templates_whatsapp` JÁ EXISTEM em produção — vieram do clone da ISILDA,
--      mas NÃO estavam versionadas como migração no repo (drift). Esta migração
--      (a) versiona-as de forma IDEMPOTENTE (`CREATE TABLE IF NOT EXISTS`, índices
--      e policies com guard) para não colidir com o que já lá está.
--
--   2. As RPCs/trigger da fila (`try_acquire_agent_lock`, `claim_queue_messages`,
--      `process_ai_agent_queue`, `enqueue_message_for_ai_agent` + o trigger
--      `on_mensagem_received_enqueue`) NÃO EXISTIAM em produção (PGRST202). Este
--      é o trabalho central da AC1/AC6 — sem elas o agente não processa nada.
--      Portadas da ISILDA 008/027 com rename `cliente_id`→`lead_id`.
--
--   3. `whatsapp_instances` (002), `notificacoes` (024) e `consentimentos` (022)
--      já estão versionadas no repo GM — NÃO são recriadas aqui.
--
-- NUMERAÇÃO: a série real do repo vai até 026. A arquitectura/story citam 004–006
-- do plano, mas o repo consolidou noutra sequência; usa-se a próxima livre (027).
--
-- Fonte vinculativa: Arquitectura §2.3 (tabelas herdadas), §3 (série base 004/017),
-- §4.1 (contrato edge), §5.1 (fluxo entrante), §8.5 (redacção). ISILDA 008 (schema +
-- RPCs) e 027 (trigger de enqueue). Rename `cliente_id`→`lead_id` obrigatório (§2.2).
--
-- Todas as tabelas do agente referenciam `leads(id)` (nunca `clientes`).
-- Identificadores técnicos em inglês; comentários em pt-AO pré-Acordo.
-- ============================================================================

-- ============================================================================
-- PARTE A — Schema do agente (idempotente). Herda ISILDA 008 com lead_id.
-- ============================================================================

-- ── ai_sales_agents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_sales_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  personality_traits JSONB DEFAULT '[]',
  target_stages TEXT[] DEFAULT ARRAY['lead','qualificado'],
  settings JSONB DEFAULT '{
    "working_hours_start": "08:00",
    "working_hours_end": "20:00",
    "working_days": [1,2,3,4,5,6],
    "debounce_seconds": 10,
    "response_delay_min_ms": 1500,
    "response_delay_max_ms": 4000,
    "typing_speed_cpm": 280,
    "message_split_max_length": 300,
    "delay_between_messages_min_ms": 500,
    "delay_between_messages_max_ms": 1500,
    "context_messages_limit": 250,
    "max_messages_per_conversation": 60,
    "auto_pause_after_human_reply": true,
    "lock_duration_seconds": 30,
    "max_retry_attempts": 3,
    "queue_batch_size": 5,
    "session_duration_minutes": 60,
    "cadence_silence_timeout_minutes": 720,
    "cadence_reactivation_map": {},
    "cadence_max_messages_per_hour": 50,
    "cadence_max_messages_per_day": 60,
    "fallback_message": "Desculpa, tive um problema tecnico. Um consultor vai responder-te em breve."
  }'::jsonb,
  model TEXT DEFAULT 'claude-sonnet-4-5',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1024,
  is_active BOOLEAN DEFAULT true,
  cadence_steps JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── ai_agent_conversations (lead_id) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_sales_agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused_by_human', 'paused_by_schedule', 'transferred', 'completed')),
  messages_history JSONB DEFAULT '[]',
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  paused_by TEXT,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  last_processed_at TIMESTAMPTZ,
  last_message_id TEXT,
  metadata JSONB DEFAULT '{}',
  processing_lock TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_lead ON public.ai_agent_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON public.ai_agent_conversations(status);

-- ── ai_agent_message_queue (lead_id) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.mensagens_whatsapp(id),
  conversation_id UUID REFERENCES public.ai_agent_conversations(id),
  agent_id UUID REFERENCES public.ai_sales_agents(id),
  message_content TEXT,
  message_metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_queue_lead ON public.ai_agent_message_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON public.ai_agent_message_queue(scheduled_for) WHERE status = 'pending';

-- ── ai_agent_logs (lead_id) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  agent_id UUID REFERENCES public.ai_sales_agents(id),
  log_type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logs_conversation ON public.ai_agent_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.ai_agent_logs(created_at DESC);

-- ── ai_agent_send_counts (lead_id) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_send_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_type VARCHAR NOT NULL CHECK (window_type IN ('hour', 'day')),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, window_start, window_type)
);
CREATE INDEX IF NOT EXISTS idx_send_counts_lookup ON public.ai_agent_send_counts(lead_id, window_type, window_start);

-- ── ai_agent_scheduled_followups (lead_id) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_scheduled_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_agent_conversations(id),
  agent_id UUID REFERENCES public.ai_sales_agents(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  context_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_followups_lead ON public.ai_agent_scheduled_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_pending ON public.ai_agent_scheduled_followups(status, scheduled_at) WHERE status = 'pending';

-- ── ai_agent_cadence_enrollments (lead_id) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_cadence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_sales_agents(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'replied', 'cancelled')),
  next_action_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, agent_id, stage)
);
CREATE INDEX IF NOT EXISTS idx_cadence_agent ON public.ai_agent_cadence_enrollments(agent_id);
CREATE INDEX IF NOT EXISTS idx_cadence_lead ON public.ai_agent_cadence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_next ON public.ai_agent_cadence_enrollments(next_action_at) WHERE status = 'active';

-- ── ai_agent_tools ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.ai_sales_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB DEFAULT '{"type":"object","required":[],"properties":{}}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── user_availability ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '20:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_of_week)
);

-- ── webhook_processed_messages (idempotência) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT webhook_processed_messages_wamid_unique UNIQUE (whatsapp_message_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_processed_wamid ON public.webhook_processed_messages(whatsapp_message_id);

-- ── templates_whatsapp ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT,
  variaveis JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PARTE B — RLS idempotente (guard DROP POLICY IF EXISTS antes de criar).
-- Leitura por `authenticated`; escrita da fila/logs/counts por `service_role`.
-- ============================================================================

ALTER TABLE public.ai_sales_agents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_message_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_send_counts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_scheduled_followups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_cadence_enrollments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_tools                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_processed_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_whatsapp            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage agents"        ON public.ai_sales_agents;
CREATE POLICY "Authenticated manage agents" ON public.ai_sales_agents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage conversations" ON public.ai_agent_conversations;
CREATE POLICY "Authenticated manage conversations" ON public.ai_agent_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages conversations" ON public.ai_agent_conversations;
CREATE POLICY "Service role manages conversations" ON public.ai_agent_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read queue"           ON public.ai_agent_message_queue;
CREATE POLICY "Authenticated read queue" ON public.ai_agent_message_queue FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role manages queue"         ON public.ai_agent_message_queue;
CREATE POLICY "Service role manages queue" ON public.ai_agent_message_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read logs"            ON public.ai_agent_logs;
CREATE POLICY "Authenticated read logs" ON public.ai_agent_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role manages logs"          ON public.ai_agent_logs;
CREATE POLICY "Service role manages logs" ON public.ai_agent_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages send counts"   ON public.ai_agent_send_counts;
CREATE POLICY "Service role manages send counts" ON public.ai_agent_send_counts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage followups"     ON public.ai_agent_scheduled_followups;
CREATE POLICY "Authenticated manage followups" ON public.ai_agent_scheduled_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages followups"     ON public.ai_agent_scheduled_followups;
CREATE POLICY "Service role manages followups" ON public.ai_agent_scheduled_followups FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage cadence"       ON public.ai_agent_cadence_enrollments;
CREATE POLICY "Authenticated manage cadence" ON public.ai_agent_cadence_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage tools"         ON public.ai_agent_tools;
CREATE POLICY "Authenticated manage tools" ON public.ai_agent_tools FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage availability"  ON public.user_availability;
CREATE POLICY "Authenticated manage availability" ON public.user_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read processed"       ON public.webhook_processed_messages;
CREATE POLICY "Authenticated read processed" ON public.webhook_processed_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role manages processed"     ON public.webhook_processed_messages;
CREATE POLICY "Service role manages processed" ON public.webhook_processed_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage templates"     ON public.templates_whatsapp;
CREATE POLICY "Authenticated manage templates" ON public.templates_whatsapp FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Realtime para o inbox (idempotente) ─────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN NULL;
END $$;

-- ── Trigger updated_at (reutiliza handle_updated_at, criada no clone 002) ────
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'ai_sales_agents',
    'ai_agent_conversations',
    'ai_agent_scheduled_followups',
    'ai_agent_cadence_enrollments',
    'ai_agent_tools',
    'templates_whatsapp'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_' || tbl || '_updated'
          AND tgrelid = ('public.' || tbl)::regclass
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER on_%s_updated BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
          tbl, tbl
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PARTE C — RPCs da fila (o NÚCLEO — não existiam em produção). ISILDA 008.
-- Rename cliente_id→lead_id. FOR UPDATE SKIP LOCKED, debounce 10s, lock >3min.
-- ============================================================================

-- Lock por lead com auto-destrava (>3min por defeito). AC6.
CREATE OR REPLACE FUNCTION public.try_acquire_agent_lock(
  p_lead_id UUID,
  p_lock_duration INTERVAL DEFAULT '3 minutes'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_acquired BOOLEAN := false;
BEGIN
  UPDATE public.ai_agent_conversations
  SET processing_lock = now()
  WHERE lead_id = p_lead_id
    AND status = 'active'
    AND (processing_lock IS NULL OR processing_lock < now() - p_lock_duration)
  RETURNING true INTO v_acquired;
  RETURN COALESCE(v_acquired, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.release_agent_lock(p_lead_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_agent_conversations
  SET processing_lock = NULL
  WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enqueue via RPC (chamada opcional; o trigger abaixo é o caminho principal).
-- Debounce: cancela pending anterior do mesmo lead para juntar mensagens picadas.
CREATE OR REPLACE FUNCTION public.enqueue_message_for_ai_agent(
  p_lead_id UUID,
  p_message_id UUID,
  p_message_content TEXT,
  p_debounce_seconds INT DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_conversation_id UUID;
  v_agent_id UUID;
BEGIN
  SELECT id INTO v_agent_id FROM public.ai_sales_agents WHERE is_active = true LIMIT 1;
  IF v_agent_id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_conversation_id
  FROM public.ai_agent_conversations
  WHERE lead_id = p_lead_id AND status = 'active'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN RETURN NULL; END IF;

  -- Cancela pending anterior (debounce por junção).
  UPDATE public.ai_agent_message_queue
  SET status = 'cancelled'
  WHERE lead_id = p_lead_id AND status = 'pending';

  INSERT INTO public.ai_agent_message_queue
    (lead_id, message_id, conversation_id, agent_id, message_content, scheduled_for)
  VALUES
    (p_lead_id, p_message_id, v_conversation_id, v_agent_id, p_message_content,
     now() + (p_debounce_seconds || ' seconds')::interval)
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim atómico: FOR UPDATE SKIP LOCKED, só itens já vencidos (scheduled_for<=now).
CREATE OR REPLACE FUNCTION public.claim_queue_messages(p_batch_size INT DEFAULT 10)
RETURNS SETOF public.ai_agent_message_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_agent_message_queue
  SET status = 'processing', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM public.ai_agent_message_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
      AND attempts < max_attempts
    ORDER BY scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.claim_scheduled_followups(p_batch_size INT DEFAULT 5)
RETURNS SETOF public.ai_agent_scheduled_followups AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_agent_scheduled_followups
  SET status = 'processing', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM public.ai_agent_scheduled_followups
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND attempts < 3
    ORDER BY scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recovery: destrava itens presos em 'processing' há >3min (invocado pelo cron).
CREATE OR REPLACE FUNCTION public.process_ai_agent_queue()
RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_agent_message_queue
  SET status = 'pending'
  WHERE status = 'processing'
    AND processed_at IS NULL
    AND created_at < now() - interval '3 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE D — Trigger de enqueue (ISILDA 027) com debounce 10s.
-- Dispara em INSERT de mensagens_whatsapp incoming do lead. Cancela pending
-- anterior (junção). Nunca falha o INSERT da mensagem (EXCEPTION → WARNING).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_enqueue_message_for_ai_agent()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_agent_id UUID;
  v_debounce_seconds INTEGER := 10;   -- §2.3 / AC6
  v_scheduled_for TIMESTAMPTZ;
BEGIN
  -- Só mensagens entrantes do lead (sender_type 'cliente').
  IF NEW.direction != 'incoming' OR NEW.sender_type <> 'cliente' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_agent_id FROM public.ai_sales_agents WHERE is_active = true LIMIT 1;
  IF v_agent_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_conversation_id
  FROM public.ai_agent_conversations
  WHERE lead_id = NEW.lead_id AND agent_id = v_agent_id AND status = 'active'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN RETURN NEW; END IF;

  -- Debounce: cancela qualquer pending anterior do lead para juntar mensagens
  -- picadas num só item de fila.
  UPDATE public.ai_agent_message_queue
  SET status = 'cancelled'
  WHERE lead_id = NEW.lead_id AND status = 'pending';

  v_scheduled_for := now() + (v_debounce_seconds || ' seconds')::INTERVAL;

  INSERT INTO public.ai_agent_message_queue (
    lead_id, message_id, conversation_id, agent_id,
    message_content, status, scheduled_for, attempts, max_attempts
  ) VALUES (
    NEW.lead_id, NEW.id, v_conversation_id, v_agent_id,
    NEW.conteudo, 'pending', v_scheduled_for, 0, 3
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca falhar o insert da mensagem por causa do enqueue.
  RAISE WARNING '[trg_enqueue_message_for_ai_agent] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_mensagem_received_enqueue ON public.mensagens_whatsapp;
CREATE TRIGGER on_mensagem_received_enqueue
  AFTER INSERT ON public.mensagens_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_message_for_ai_agent();

-- ============================================================================
-- PARTE E — Seed do agente de série (só se ainda não existir nenhum).
-- Não cria um 2º agente se já houver seed. O prompt/persona real vem na 3.2.
-- ============================================================================

INSERT INTO public.ai_sales_agents (name, description, system_prompt, is_active)
SELECT
  'Assistente Global Minds',
  'Agente de atendimento WhatsApp da Global Minds (canal + fila). Persona/prompt na story 3.2.',
  '',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_sales_agents);

-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS on_mensagem_received_enqueue ON public.mensagens_whatsapp;
--   DROP FUNCTION IF EXISTS public.trg_enqueue_message_for_ai_agent();
--   DROP FUNCTION IF EXISTS public.process_ai_agent_queue();
--   DROP FUNCTION IF EXISTS public.claim_scheduled_followups(INT);
--   DROP FUNCTION IF EXISTS public.claim_queue_messages(INT);
--   DROP FUNCTION IF EXISTS public.enqueue_message_for_ai_agent(UUID, UUID, TEXT, INT);
--   DROP FUNCTION IF EXISTS public.release_agent_lock(UUID);
--   DROP FUNCTION IF EXISTS public.try_acquire_agent_lock(UUID, INTERVAL);
--   -- As tabelas do agente/webhook/templates JÁ EXISTIAM por clone; NÃO se
--   -- dropam num rollback desta migração (evita perda de dados de produção).
--   -- Para remover totalmente (ambiente limpo): DROP TABLE ... CASCADE nas 11
--   -- tabelas da Parte A.
-- ============================================================================
