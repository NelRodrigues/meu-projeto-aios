-- ============================================================================
-- Migração 031 — `consultations` (Consulta de Orientação) — Story 3.5
-- ----------------------------------------------------------------------------
-- Decisão PO C3/D5 (po-validation-backlog-v1): tabela LEVE, fonte consultável
-- distinta da fase da candidatura. Alimenta:
--   • o dashboard 4.6 ("consultas agendadas"),
--   • o lembrete D-1 (cron `lembretes-tick`, migração 032),
--   • o reagendamento (localiza o evento numa linha própria via google_event_id
--     — actualiza, NUNCA duplica, AC5).
--
-- ── Nota de NUMERAÇÃO (desvio registado, mesmo padrão da 025) ────────────────
-- A Arquitectura §3 mapeava esta tabela à migração `018_consultations.sql`. Mas
-- o repositório real nunca materializou 011–015/018 como ficheiros nessa ordem —
-- a série consolidou-se e a última migração real é a 030. Para não colidir com o
-- histórico aplicado, esta migração é a **031** (a próxima livre). O conteúdo
-- (schema, CHECK, índices, RLS) segue à letra o DDL de §2.5; só o número muda.
--
-- ── Alinhamento com o CÓDIGO real ────────────────────────────────────────────
--  • RLS operacional: leitura/escrita `authenticated`, DELETE só admin
--    (`public.is_admin`), service_role total — mesmo padrão de fichas/candidaturas
--    (migração 009). O dashboard/inbox e o agente (service_role) precisam de ler.
--  • Trigger updated_at: reutiliza `public.handle_updated_at()` (migração 002).
--
-- Dependências: 002 (base + `handle_updated_at`), 003 (`is_admin`), 002/009
-- (`leads`, `candidaturas`).
--
-- Fonte vinculativa: Arquitectura §2.5 (DDL canónico), §5.3 (fluxo FreeBusy),
-- §4.2 (cron lembretes-tick). Rollback incluído.
-- ============================================================================


-- ── consultations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE SET NULL,   -- opcional
  google_event_id TEXT,                 -- para reagendamento (actualizar, não duplicar — AC5)
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Luanda',
  estado TEXT NOT NULL DEFAULT 'agendada'
     CHECK (estado IN ('agendada', 'confirmada', 'realizada', 'no_show', 'cancelada')),
  lembrete_24h_enviado BOOLEAN NOT NULL DEFAULT false,   -- controlo do cron lembretes-tick (D-1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_lead ON public.consultations(lead_id);
-- Índice PARCIAL: só consultas "vivas" — é sobre estas que corre a query do
-- lembrete D-1 e o dashboard de "consultas agendadas".
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled ON public.consultations(scheduled_at)
  WHERE estado IN ('agendada', 'confirmada');


-- ── Trigger updated_at (reutiliza handle_updated_at() da migração 002) ───────
DROP TRIGGER IF EXISTS consultations_updated_at ON public.consultations;
CREATE TRIGGER consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── RLS — operacional (padrão fichas/candidaturas, migração 009) ─────────────
-- Leitura/escrita: autenticado. DELETE: só admin activo. service_role: total
-- (o agente `gm-agent` grava/lê com service_role; o dashboard 4.6 lê autenticado).
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_read" ON public.consultations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "consultations_insert" ON public.consultations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "consultations_update" ON public.consultations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "consultations_delete" ON public.consultations
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "consultations_service" ON public.consultations
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS consultations_updated_at ON public.consultations;
--   DROP TABLE IF EXISTS public.consultations CASCADE;
-- ============================================================================
