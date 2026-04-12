CREATE TABLE public.mudancas_estagio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  estagio_anterior TEXT NOT NULL,
  estagio_novo TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mudancas_cliente ON public.mudancas_estagio(cliente_id);
CREATE INDEX idx_mudancas_created ON public.mudancas_estagio(created_at DESC);

ALTER TABLE public.mudancas_estagio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mudancas visiveis para autenticados" ON public.mudancas_estagio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem registar mudancas" ON public.mudancas_estagio FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role all mudancas" ON public.mudancas_estagio FOR ALL TO service_role USING (true) WITH CHECK (true);
