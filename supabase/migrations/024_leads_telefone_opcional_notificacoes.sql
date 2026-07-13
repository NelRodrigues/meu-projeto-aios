-- ============================================================================
-- Migração 024 — `leads.telefone` opcional + criar `notificacoes`
-- ----------------------------------------------------------------------------
-- Duas lacunas apanhadas na importação real da carteira Global Minds (story 2.5):
--
-- 1. `leads.telefone` herdou `NOT NULL` da base ISILDA (migração 002), onde todo
--    o lead nascia de uma mensagem WhatsApp (tinha sempre número). No SIC GM os
--    leads entram por vias SEM telefone garantido: importação de Excels (a
--    planilha de acompanhamento não traz o número — só o rótulo "Telefone"),
--    formulário público (pode dar só email), campanhas de email. O CRM tem de
--    aceitar um lead sem telefone e marcá-lo para revisão (`importacao_rever`),
--    não recusá-lo. → `telefone` passa a NULLABLE.
--
-- 2. `notificacoes` — a arquitectura (§3, migração 019 da ISILDA) previa-a vinda
--    do clone, mas a story 1.1 clonou só as 7 tabelas nucleares. É consumida pelo
--    relatório de importação (2.5, correcção C5), pelos alertas do agente (E3) e
--    pelos lembretes (E4). Criada aqui com o schema ISILDA adaptado à GM
--    (`cliente_id`→`lead_id`; enum de tipo alargado com 'importacao').
--
-- Fonte: Arquitectura §2.3 (tabelas herdadas), ISILDA 019 (schema base).
-- ============================================================================

-- ── 1. telefone opcional ────────────────────────────────────────────────────
ALTER TABLE public.leads ALTER COLUMN telefone DROP NOT NULL;

-- ── 2. notificacoes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'takeover', 'pagamento', 'urgente', 'conflito_calendario',
    'recompra', 'sistema', 'importacao', 'lead_quente', 'followup'
  )),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  lida BOOLEAN NOT NULL DEFAULT false,
  lida_em TIMESTAMPTZ,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  accao_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes(destinatario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lead ON public.notificacoes(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notificacoes visiveis para autenticados" ON public.notificacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado insere notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticado actualiza notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin elimina notificacoes" ON public.notificacoes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role all notificacoes" ON public.notificacoes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.notificacoes;
--   -- só repor NOT NULL se não houver leads com telefone NULL:
--   -- ALTER TABLE public.leads ALTER COLUMN telefone SET NOT NULL;
-- ============================================================================
