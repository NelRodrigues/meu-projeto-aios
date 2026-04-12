CREATE TABLE public.consentimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('dados_pessoais', 'whatsapp_bot', 'marketing', 'partilha_terceiros')),
  consentido BOOLEAN NOT NULL,
  metodo TEXT NOT NULL CHECK (metodo IN ('whatsapp_resposta', 'formulario', 'verbal', 'implicito')),
  prova TEXT,
  ip_address TEXT,
  revogado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consentimentos_cliente ON public.consentimentos(cliente_id, tipo);

ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consentimentos visiveis para autenticados" ON public.consentimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role gere consentimentos" ON public.consentimentos FOR ALL TO service_role USING (true) WITH CHECK (true);
