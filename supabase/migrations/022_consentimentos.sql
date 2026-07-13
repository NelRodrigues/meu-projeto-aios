-- ============================================================================
-- Migração 022 — `consentimentos` (RGPD / FR24)
-- ----------------------------------------------------------------------------
-- Porquê: a arquitectura (§2.1 enum `consentimento_tipo`, §3 migração 007) previa
-- que `consentimentos` viesse do clone da base ISILDA. Na prática, a story 1.1
-- clonou apenas as 7 tabelas nucleares (até `whatsapp_instances`) e a
-- `consentimentos` ficou por criar — lacuna apanhada em teste do formulário
-- público (story 2.4 AC4), que regista consentimento no submit e falhava com
-- "Could not find the table public.consentimentos".
--
-- Esta migração cria `consentimentos` com o schema da ISILDA (020) adaptado à GM:
--   • `cliente_id` → `lead_id` (tabela nuclear = `leads`, ADR/rename da 002)
--   • enum `tipo` = `consentimento_tipo` da arquitectura §2.1
-- Consumidores: formulário público (2.4), agente WhatsApp (E3, consentimento de
-- bot), campanhas (E5 só contacta com consentimento — 4.5/C1), retenção (4.4).
--
-- Fonte: Arquitectura §2.1 (consentimento_tipo), ISILDA 020 (schema base).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consentimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('dados_pessoais', 'whatsapp_bot', 'marketing', 'partilha_terceiros')),
  -- Uma linha em `consentimentos` representa um consentimento DADO. Default true
  -- para que os produtores (formulário público, agente) que só registam o facto
  -- do consentimento não precisem de o repetir; a revogação usa `revogado_em`.
  consentido BOOLEAN NOT NULL DEFAULT true,
  -- Via de recolha do consentimento (prova de origem).
  fonte TEXT NOT NULL DEFAULT 'formulario'
    CHECK (fonte IN ('formulario', 'whatsapp_resposta', 'verbal', 'implicito', 'importacao')),
  prova TEXT,
  ip_address TEXT,
  revogado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consentimentos_lead ON public.consentimentos(lead_id, tipo);

-- ── RLS por papel (§8.1) ────────────────────────────────────────────────────
ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consentimentos visiveis para autenticados" ON public.consentimentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado insere consentimentos" ON public.consentimentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticado actualiza consentimentos" ON public.consentimentos
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin elimina consentimentos" ON public.consentimentos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role all consentimentos" ON public.consentimentos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.consentimentos;
-- ============================================================================
