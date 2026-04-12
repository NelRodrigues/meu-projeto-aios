CREATE TABLE public.interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nota', 'chamada', 'whatsapp', 'email', 'reuniao')),
  conteudo TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interacoes_cliente ON public.interacoes(cliente_id);
CREATE INDEX idx_interacoes_created ON public.interacoes(created_at DESC);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interacoes visiveis para autenticados" ON public.interacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar interacoes" ON public.interacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem editar interacoes" ON public.interacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role all interacoes" ON public.interacoes FOR ALL TO service_role USING (true) WITH CHECK (true);
