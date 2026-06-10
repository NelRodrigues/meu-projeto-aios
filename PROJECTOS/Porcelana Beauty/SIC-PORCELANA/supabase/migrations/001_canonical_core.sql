-- ============================================================
-- Migration 001: Núcleo canónico (template SIC GERAL por tenant)
-- Schema: porcelana · réplica fiel do template 'isilda'
-- Tabelas: contacts, conversations, messages, leads, deals, events,
--          agent_runs, metrics_daily
-- ============================================================
-- Padrão RLS do SIC GERAL:
--   auth (SELECT): tenant_users JOIN tenants WHERE db_schema='porcelana' OR superadmin
--   svc  (ALL):    service_role USING(true)
-- updated_at: trigger inline com SET search_path='' (handle_updated_at NÃO
--   existe no SIC GERAL — cada schema tem o seu trigger).
-- ============================================================

-- ------------------------------------------------------------
-- Trigger updated_at (próprio do schema, search_path fixo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION porcelana.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$fn$;

-- Helper RLS: pertence ao tenant 'porcelana'?
CREATE OR REPLACE FUNCTION porcelana.is_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users tu
    JOIN public.tenants tn ON tn.id = tu.tenant_id
    WHERE tu.user_id = auth.uid() AND tu.is_active = true AND tn.db_schema = 'porcelana'
  ) OR ((auth.jwt() ->> 'role') = 'superadmin');
$fn$;

-- ============================================================
-- contacts
-- ============================================================
CREATE TABLE porcelana.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT,
  first_name TEXT,
  phone_e164 TEXT,
  email TEXT,
  instagram_handle TEXT,
  facebook_handle TEXT,
  first_channel porcelana.channel_type,
  first_contact_at TIMESTAMPTZ,
  acquisition_source TEXT,
  inferred_age_range TEXT,
  inferred_city TEXT DEFAULT 'Luanda',
  is_business_contact BOOLEAN DEFAULT FALSE,
  -- Extensão estética + conformidade (opt-out FR28 vive aqui)
  opted_out_at TIMESTAMPTZ,
  followup_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ai_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  CONSTRAINT contacts_phone_unique UNIQUE (phone_e164)
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.contacts
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_contacts_phone ON porcelana.contacts(phone_e164);
CREATE INDEX idx_contacts_contactable ON porcelana.contacts(id)
  WHERE opted_out_at IS NULL AND followup_paused = FALSE;

-- ============================================================
-- conversations
-- ============================================================
CREATE TABLE porcelana.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel porcelana.channel_type NOT NULL DEFAULT 'whatsapp',
  external_thread_id TEXT,
  agent_slug TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  message_count INTEGER DEFAULT 0,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_lead_message_at TIMESTAMPTZ,
  last_agent_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.conversations
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_conversations_contact ON porcelana.conversations(contact_id);

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE porcelana.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES porcelana.conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  role porcelana.message_role NOT NULL,
  agent_slug TEXT,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  media_url TEXT,
  model_id TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  external_message_id TEXT,
  reply_to_message_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_messages_conversation ON porcelana.messages(conversation_id);
CREATE INDEX idx_messages_contact ON porcelana.messages(contact_id);

-- ============================================================
-- leads
-- ============================================================
CREATE TABLE porcelana.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES porcelana.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage porcelana.lead_stage NOT NULL DEFAULT 'new',
  temperature porcelana.lead_temperature DEFAULT 'warm',
  main_pain TEXT,                         -- ex.: "manchas no rosto", "redução de medidas"
  urgency_level TEXT,
  agenda_availability TEXT,
  recommended_offer TEXT,
  main_objection TEXT,
  objection_history TEXT[] DEFAULT '{}',
  fit_score INTEGER,
  hotness_score INTEGER,
  next_followup_at TIMESTAMPTZ,
  followup_count INTEGER DEFAULT 0,
  last_followup_at TIMESTAMPTZ,
  requires_human_handoff BOOLEAN DEFAULT FALSE,
  handoff_reason TEXT,
  handed_off_at TIMESTAMPTZ,
  -- Extensão estética: funil 2-portas
  qualification_gate porcelana.qualification_gate,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.leads
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_leads_contact ON porcelana.leads(contact_id);
CREATE INDEX idx_leads_stage ON porcelana.leads(stage);

-- ============================================================
-- deals (mantido do template; usado para vendas pontuais/home care)
-- ============================================================
CREATE TABLE porcelana.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES porcelana.leads(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  offer_slug TEXT,
  offer_label TEXT,
  amount BIGINT,
  currency TEXT DEFAULT 'AOA',
  status TEXT DEFAULT 'open',
  proposed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.deals
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_deals_contact ON porcelana.deals(contact_id);

-- ============================================================
-- events (timeline/auditoria)
-- ============================================================
CREATE TABLE porcelana.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  event_category TEXT,
  agent_slug TEXT,
  conversation_id UUID REFERENCES porcelana.conversations(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES porcelana.leads(id) ON DELETE SET NULL,
  summary TEXT,
  payload JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_events_contact ON porcelana.events(contact_id);

-- ============================================================
-- agent_runs (telemetria de chamadas LLM — tokens, custo, latência)
-- Réplica do template canónico isilda. Alimenta controlo de custo (NFR7).
-- ============================================================
CREATE TABLE porcelana.agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_slug TEXT NOT NULL,
  conversation_id UUID REFERENCES porcelana.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES porcelana.messages(id) ON DELETE SET NULL,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  tools_called TEXT[] DEFAULT '{}',
  kb_queries_made INTEGER DEFAULT 0,
  status TEXT,
  error_message TEXT,
  cost_usd NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_agent_runs_conversation ON porcelana.agent_runs(conversation_id);
CREATE INDEX idx_agent_runs_created ON porcelana.agent_runs(created_at DESC);

-- ============================================================
-- metrics_daily (KPIs diários agregados — alimenta dashboard Epic 7)
-- Réplica do template canónico isilda.
-- ============================================================
CREATE TABLE porcelana.metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversations_total INTEGER DEFAULT 0,
  conversations_new INTEGER DEFAULT 0,
  conversations_closed INTEGER DEFAULT 0,
  messages_total INTEGER DEFAULT 0,
  leads_new INTEGER DEFAULT 0,
  leads_hot INTEGER DEFAULT 0,
  leads_warm INTEGER DEFAULT 0,
  leads_cold INTEGER DEFAULT 0,
  leads_handoff INTEGER DEFAULT 0,
  deals_proposed INTEGER DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  deals_lost INTEGER DEFAULT 0,
  revenue BIGINT DEFAULT 0,
  currency TEXT DEFAULT 'AOA',
  avg_response_time_seconds INTEGER,
  conversion_rate NUMERIC,
  total_tokens BIGINT DEFAULT 0,
  total_cost_usd NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT metrics_daily_date_unique UNIQUE (metric_date)
);
CREATE INDEX idx_metrics_daily_date ON porcelana.metrics_daily(metric_date DESC);

-- ============================================================
-- RLS — padrão SIC GERAL (auth SELECT tenant-scoped + svc ALL)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['contacts','conversations','messages','leads','deals','events','agent_runs','metrics_daily']
  LOOP
    EXECUTE format('ALTER TABLE porcelana.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY auth_%1$s ON porcelana.%1$s FOR SELECT TO authenticated USING (porcelana.is_member())$p$, t);
    EXECUTE format($p$CREATE POLICY svc_%1$s ON porcelana.%1$s FOR ALL TO service_role USING (true) WITH CHECK (true)$p$, t);
  END LOOP;
END $$;
