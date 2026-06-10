-- ============================================================
-- Migration 103: opt-out de conformidade (FR28)
-- SIC Porcelana Beauty · padrão P5 do CRM-Agêntico Salus · ADR-004
-- KISS: colunas em clientes, não tabela nova (saldo de 1 estado por cliente).
-- Pré-requisito: clientes (reusada da ISILDA)
-- ============================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_assigned BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.clientes.opted_out_at IS 'Opt-out (FR28): cliente respondeu palavra de saída. Excluída de envios futuros.';
COMMENT ON COLUMN public.clientes.followup_paused IS 'Kill-switch de follow-up/campanhas automáticas.';
COMMENT ON COLUMN public.clientes.ai_assigned IS 'FALSE = agente IA não responde a esta cliente.';

-- Index parcial: leituras frequentes de "quem NÃO está em opt-out" para campanhas
CREATE INDEX IF NOT EXISTS idx_clientes_contactavel
  ON public.clientes(id)
  WHERE opted_out_at IS NULL AND followup_paused = FALSE;

-- ============================================================
-- RPC: aplicar opt-out (idempotente). Chamada pelo agente quando
-- detecta a palavra de saída exacta.
-- ============================================================
CREATE OR REPLACE FUNCTION public.aplicar_optout(p_cliente UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clientes
  SET opted_out_at    = COALESCE(opted_out_at, NOW()),  -- idempotente: não sobrescreve
      followup_paused = TRUE,
      ai_assigned     = FALSE
  WHERE id = p_cliente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.aplicar_optout IS 'Aplica opt-out de conformidade (FR28). Idempotente. Padrão Salus optout.ts.';
