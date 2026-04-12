CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('takeover', 'pagamento', 'urgente', 'conflito_calendario', 'recompra', 'sistema')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  lida BOOLEAN NOT NULL DEFAULT false,
  lida_em TIMESTAMPTZ,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  accao_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_destinatario ON public.notificacoes(destinatario_id, created_at DESC) WHERE lida = false;
CREATE INDEX idx_notificacoes_prioridade ON public.notificacoes(prioridade, created_at DESC);
CREATE INDEX idx_notificacoes_tipo ON public.notificacoes(tipo, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver proprias notificacoes" ON public.notificacoes FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid() OR tipo = 'sistema');
CREATE POLICY "Marcar proprias notificacoes como lidas" ON public.notificacoes FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid());
CREATE POLICY "Service role gere notificacoes" ON public.notificacoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
