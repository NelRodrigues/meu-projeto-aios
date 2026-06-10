-- ============================================================
-- Migration 002: Extensão de estética (schema porcelana)
-- Tabelas específicas do centro de estética que o template
-- canónico não cobre: services, rooms, appointments, packages,
-- subscriptions, session_ledger.
-- ADRs: 002 (pacotes), 003 (agendamento), 005 (serviços/funil)
-- ============================================================

-- ============================================================
-- services — catálogo de serviços (FR24)
-- ============================================================
CREATE TABLE porcelana.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  category porcelana.service_category NOT NULL,
  tags TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  main_photo TEXT,
  base_price BIGINT,                          -- centavos/kwanza inteiro (consistente com deals.amount)
  prices_by_zone JSONB DEFAULT '{}',          -- {"axilas":15000,"pernas":45000}
  price_on_request BOOLEAN DEFAULT FALSE,      -- "nunca abrir preço" (FAQ)
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  room_prep_minutes INTEGER NOT NULL DEFAULT 15 CHECK (room_prep_minutes >= 0),
  requires_evaluation BOOLEAN DEFAULT FALSE,
  recommended_sessions INTEGER DEFAULT 1 CHECK (recommended_sessions >= 1),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.services
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_services_category ON porcelana.services(category);
CREATE INDEX idx_services_active ON porcelana.services(active) WHERE active = TRUE;

-- ============================================================
-- rooms — salas/recursos (ADR-003)
-- ============================================================
CREATE TABLE porcelana.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  supported_categories porcelana.service_category[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.rooms
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();

-- ============================================================
-- packages — planos de recorrência (FR15-17)
-- ============================================================
CREATE TABLE porcelana.packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,                   -- 'essencial','porcelana','cartao_black'
  description TEXT,
  monthly_price BIGINT NOT NULL CHECK (monthly_price >= 0),
  composition JSONB NOT NULL DEFAULT '[]',     -- [{"category":"laser","sessions":4}]
  benefits JSONB DEFAULT '{}',
  agenda_priority INTEGER DEFAULT 0,           -- Black > Porcelana > Essencial
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.packages
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();

-- ============================================================
-- subscriptions — contact ↔ package (FR16)
-- ============================================================
CREATE TABLE porcelana.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES porcelana.packages(id) ON DELETE RESTRICT,
  state porcelana.subscription_state NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_cycle DATE NOT NULL,
  cancelled_at TIMESTAMPTZ,
  notes TEXT
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.subscriptions
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_subscriptions_contact ON porcelana.subscriptions(contact_id);
CREATE INDEX idx_subscriptions_next_cycle
  ON porcelana.subscriptions(next_cycle) WHERE state = 'active';

-- ============================================================
-- appointments — agendamentos (FR8-12, ADR-003)
-- ============================================================
CREATE TABLE porcelana.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES porcelana.services(id) ON DELETE SET NULL,
  technician_id UUID,                          -- referência a public.team_members (cross-schema, sem FK rígida)
  room_id UUID REFERENCES porcelana.rooms(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES porcelana.conversations(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES porcelana.subscriptions(id) ON DELETE SET NULL,
  zone TEXT,
  reference_image TEXT,                        -- foto da pele (vision)
  appt_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  buffer_minutes INTEGER NOT NULL DEFAULT 15 CHECK (buffer_minutes >= 0),
  amount BIGINT,
  prepay_pct INTEGER DEFAULT 0 CHECK (prepay_pct IN (0,50,100)),
  state porcelana.appointment_state NOT NULL DEFAULT 'new',
  gate porcelana.qualification_gate,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ
);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON porcelana.appointments
  FOR EACH ROW EXECUTE FUNCTION porcelana.tg_set_updated_at();
CREATE INDEX idx_appointments_contact ON porcelana.appointments(contact_id);
CREATE INDEX idx_appointments_date ON porcelana.appointments(appt_date);
CREATE INDEX idx_appointments_technician ON porcelana.appointments(technician_id, appt_date);
CREATE INDEX idx_appointments_room ON porcelana.appointments(room_id, appt_date);
CREATE INDEX idx_appointments_reminder ON porcelana.appointments(appt_date)
  WHERE state IN ('scheduled','confirmed','paid') AND reminder_24h_sent = FALSE;

-- ============================================================
-- session_ledger — livro-razão de sessões de pacote (FR18, ADR-002)
-- Imutável (INSERT-only). Sem updated_at.
-- ============================================================
CREATE TABLE porcelana.session_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_id UUID NOT NULL REFERENCES porcelana.subscriptions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES porcelana.contacts(id) ON DELETE CASCADE,
  service_category porcelana.service_category NOT NULL,
  entry porcelana.ledger_entry NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  appointment_id UUID REFERENCES porcelana.appointments(id) ON DELETE SET NULL,
  cycle DATE NOT NULL,
  notes TEXT
);
CREATE INDEX idx_ledger_subscription ON porcelana.session_ledger(subscription_id);
CREATE INDEX idx_ledger_contact ON porcelana.session_ledger(contact_id);

-- VIEW: saldo de sessões
CREATE OR REPLACE VIEW porcelana.v_session_balance AS
SELECT subscription_id, contact_id, service_category, cycle,
  COALESCE(SUM(quantity) FILTER (WHERE entry='credit'),0)
   - COALESCE(SUM(quantity) FILTER (WHERE entry='debit'),0) AS balance
FROM porcelana.session_ledger
GROUP BY subscription_id, contact_id, service_category, cycle;

-- ============================================================
-- FUNÇÃO: conflito de slot (técnica E sala) — ADR-003
-- ============================================================
CREATE OR REPLACE FUNCTION porcelana.appointment_conflict(
  p_technician UUID, p_room UUID, p_date DATE,
  p_start TIME, p_dur INTEGER, p_buffer INTEGER, p_exclude UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SET search_path = 'porcelana' AS $fn$
DECLARE v_end TIME; v_conflict BOOLEAN;
BEGIN
  v_end := p_start + ((p_dur + p_buffer) || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM porcelana.appointments a
    WHERE a.appt_date = p_date
      AND a.state NOT IN ('cancelled','no_show')
      AND (p_exclude IS NULL OR a.id <> p_exclude)
      AND (a.technician_id = p_technician OR a.room_id = p_room)
      AND (p_start, v_end) OVERLAPS
          (a.start_time, a.start_time + ((a.duration_minutes + a.buffer_minutes)||' minutes')::interval)
  ) INTO v_conflict;
  RETURN v_conflict;
END;
$fn$;

-- ============================================================
-- FUNÇÃO: opt-out de conformidade (FR28) — idempotente
-- ============================================================
CREATE OR REPLACE FUNCTION porcelana.apply_optout(p_contact UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'porcelana' AS $fn$
BEGIN
  UPDATE porcelana.contacts
  SET opted_out_at = COALESCE(opted_out_at, NOW()),
      followup_paused = TRUE, ai_assigned = FALSE
  WHERE id = p_contact;
END;
$fn$;

-- ============================================================
-- RLS (padrão SIC GERAL)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['services','rooms','packages','subscriptions','appointments','session_ledger']
  LOOP
    EXECUTE format('ALTER TABLE porcelana.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY auth_%1$s ON porcelana.%1$s FOR SELECT TO authenticated USING (porcelana.is_member())$p$, t);
    EXECUTE format($p$CREATE POLICY svc_%1$s ON porcelana.%1$s FOR ALL TO service_role USING (true) WITH CHECK (true)$p$, t);
  END LOOP;
END $$;
