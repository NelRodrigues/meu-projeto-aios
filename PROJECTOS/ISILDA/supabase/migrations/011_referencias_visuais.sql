-- Migration 011: Tabela referencias_visuais com pgvector
-- Banco de imagens de referencia para similarity search

CREATE TABLE IF NOT EXISTS public.referencias_visuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  produto_id UUID REFERENCES public.produtos_catalogo(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao_visual TEXT,
  tags TEXT[] DEFAULT '{}',
  categoria TEXT,

  -- Imagens
  url_imagem TEXT,
  thumbnail_url TEXT,

  -- Embedding para similarity search (384 dimensoes — all-MiniLM-L6-v2 ou text-embedding-3-small normalizado)
  embedding vector(384),

  complexidade SMALLINT DEFAULT 3 CHECK (complexidade BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}'
);

-- Index IVFFlat para similarity search eficiente
CREATE INDEX IF NOT EXISTS idx_referencias_visuais_embedding
  ON public.referencias_visuais
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- Index por produto e categoria
CREATE INDEX idx_referencias_visuais_produto ON public.referencias_visuais(produto_id);
CREATE INDEX idx_referencias_visuais_categoria ON public.referencias_visuais(categoria);

-- RLS
ALTER TABLE public.referencias_visuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver referencias" ON public.referencias_visuais
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir referencias" ON public.referencias_visuais
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- RPC: match_referencias_visuais
-- Similarity search por embedding de imagem/texto
-- ============================================================

CREATE OR REPLACE FUNCTION match_referencias_visuais(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descricao_visual TEXT,
  tags TEXT[],
  categoria TEXT,
  url_imagem TEXT,
  thumbnail_url TEXT,
  produto_id UUID,
  produto_nome TEXT,
  produto_categoria TEXT,
  preco_base NUMERIC,
  complexidade SMALLINT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    r.id,
    r.titulo,
    r.descricao_visual,
    r.tags,
    r.categoria,
    r.url_imagem,
    r.thumbnail_url,
    r.produto_id,
    p.nome AS produto_nome,
    p.categoria AS produto_categoria,
    p.preco_base,
    r.complexidade,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM public.referencias_visuais r
  LEFT JOIN public.produtos_catalogo p ON p.id = r.produto_id
  WHERE r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) >= match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;
