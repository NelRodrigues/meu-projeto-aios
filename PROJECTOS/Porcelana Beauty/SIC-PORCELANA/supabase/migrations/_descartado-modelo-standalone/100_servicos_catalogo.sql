-- ============================================================
-- Migration 100: servicos_catalogo (adaptação de produtos_catalogo)
-- SIC Porcelana Beauty · módulo NOVO · ADR-005
-- Pré-requisito: handle_updated_at() (migração 002 reusada da ISILDA)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.servicos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN
    ('facial','corporal','laser','cera','sobrancelhas','home_care','avaliacao','outro')),
  tags TEXT[] DEFAULT '{}',

  -- Fotos (URLs do Supabase Storage)
  fotos TEXT[] DEFAULT '{}',
  foto_principal TEXT,

  -- Preços
  preco_base NUMERIC(12,2),
  precos_por_zona JSONB DEFAULT '{}',        -- {"axilas": 15000, "pernas": 45000}
  sob_consulta BOOLEAN DEFAULT FALSE,         -- alinha com "nunca abrir preço" (FAQ)

  -- Operação clínica
  duracao_minutos INTEGER DEFAULT 60 CHECK (duracao_minutos > 0),
  tempo_preparo_sala_minutos INTEGER DEFAULT 15 CHECK (tempo_preparo_sala_minutos >= 0),
  requer_avaliacao_previa BOOLEAN DEFAULT FALSE,
  sessoes_recomendadas INTEGER DEFAULT 1 CHECK (sessoes_recomendadas >= 1), -- ex.: laser 6-8

  activo BOOLEAN DEFAULT TRUE NOT NULL
);

COMMENT ON TABLE public.servicos_catalogo IS 'Catálogo de serviços de estética (FR24). Adapta produtos_catalogo da ISILDA.';
COMMENT ON COLUMN public.servicos_catalogo.precos_por_zona IS 'Preço por zona/protocolo. Ex.: depilação laser por área do corpo.';
COMMENT ON COLUMN public.servicos_catalogo.sob_consulta IS 'TRUE = agente não revela preço (regra de ouro do FAQ).';

-- Trigger updated_at (padrão ISILDA)
CREATE TRIGGER on_servicos_catalogo_updated
  BEFORE UPDATE ON public.servicos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_servicos_categoria ON public.servicos_catalogo(categoria);
CREATE INDEX idx_servicos_activo ON public.servicos_catalogo(activo) WHERE activo = TRUE;

-- RLS (padrão ISILDA: authenticated lê/gere, service_role tudo)
ALTER TABLE public.servicos_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver servicos" ON public.servicos_catalogo
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir servicos" ON public.servicos_catalogo
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role all servicos" ON public.servicos_catalogo
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
