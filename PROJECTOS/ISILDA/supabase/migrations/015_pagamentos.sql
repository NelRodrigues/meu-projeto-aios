-- Migration 015: Tabela de Pagamentos

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,

  valor NUMERIC(10, 2) NOT NULL,
  metodo TEXT DEFAULT 'multicaixa' CHECK (metodo IN ('multicaixa', 'transferencia', 'dinheiro', 'outro')),

  comprovativo_url TEXT,
  estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'confirmado', 'rejeitado')),

  confirmado_por UUID REFERENCES auth.users(id),
  confirmado_at TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  notas TEXT
);

CREATE TRIGGER on_pagamentos_updated
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_pagamentos_pedido ON public.pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_cliente ON public.pagamentos(cliente_id);
CREATE INDEX idx_pagamentos_estado ON public.pagamentos(estado);

-- RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir pagamentos" ON public.pagamentos
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos;
