-- Migration 010: Tabela produtos_catalogo
-- Catalogo de bolos e doces artesanais da Isi

CREATE TABLE IF NOT EXISTS public.produtos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('chantilly', 'bento_cake', 'especiais', 'naked_vintage', 'doces', 'casamento', 'outro')),
  tags TEXT[] DEFAULT '{}',

  -- Fotos (URLs do Supabase Storage bucket 'portfolio')
  fotos TEXT[] DEFAULT '{}',
  foto_principal TEXT,

  -- Precos
  preco_base NUMERIC(10, 2),
  precos_por_tamanho JSONB DEFAULT '{}',
  sob_consulta BOOLEAN DEFAULT FALSE,

  -- Producao
  tempo_producao_horas INTEGER DEFAULT 48,
  complexidade SMALLINT DEFAULT 3 CHECK (complexidade BETWEEN 1 AND 5),

  activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- Triggers
CREATE TRIGGER on_produtos_catalogo_updated
  BEFORE UPDATE ON public.produtos_catalogo
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_produtos_catalogo_categoria ON public.produtos_catalogo(categoria);
CREATE INDEX idx_produtos_catalogo_activo ON public.produtos_catalogo(activo);

-- RLS
ALTER TABLE public.produtos_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver catalogo" ON public.produtos_catalogo
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir catalogo" ON public.produtos_catalogo
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
