-- Migration 012: Tabela pedidos
-- Gestao de encomendas de bolos e doces

CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Relacoes
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos_catalogo(id) ON DELETE SET NULL,
  conversa_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE SET NULL,

  -- Descricao do pedido
  descricao TEXT,
  tema TEXT,
  tamanho TEXT,
  sabor_massa TEXT,
  sabor_recheio TEXT,
  decoracao TEXT,
  imagem_referencia TEXT,

  -- Entrega
  data_entrega DATE NOT NULL,
  hora_entrega TIME DEFAULT '10:00:00',
  modo_entrega TEXT DEFAULT 'retirada' CHECK (modo_entrega IN ('retirada', 'entrega')),
  endereco_entrega TEXT,

  -- Financeiro
  valor_orcamento NUMERIC(10, 2),
  valor_final NUMERIC(10, 2),

  -- Estado do pedido
  estado TEXT NOT NULL DEFAULT 'novo' CHECK (
    estado IN ('novo', 'orcamento', 'confirmado', 'pago', 'em_producao', 'pronto', 'entregue', 'cancelado')
  ),

  notas TEXT,

  -- Timestamps de tracking
  confirmado_at TIMESTAMPTZ,
  pago_at TIMESTAMPTZ,
  producao_inicio_at TIMESTAMPTZ,
  pronto_at TIMESTAMPTZ,
  entregue_at TIMESTAMPTZ,
  cancelado_at TIMESTAMPTZ
);

-- Trigger updated_at
CREATE TRIGGER on_pedidos_updated
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_data_entrega ON public.pedidos(data_entrega);
CREATE INDEX idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX idx_pedidos_produto ON public.pedidos(produto_id);

-- RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir pedidos" ON public.pedidos
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;

-- ============================================================
-- TRIGGER: registar mudanca de estado em mudancas_estagio
-- ============================================================

CREATE OR REPLACE FUNCTION registar_mudanca_estado_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Actualizar timestamps de tracking
    IF NEW.estado = 'confirmado' AND OLD.estado != 'confirmado' THEN
      NEW.confirmado_at = NOW();
    ELSIF NEW.estado = 'pago' AND OLD.estado != 'pago' THEN
      NEW.pago_at = NOW();
    ELSIF NEW.estado = 'em_producao' AND OLD.estado != 'em_producao' THEN
      NEW.producao_inicio_at = NOW();
    ELSIF NEW.estado = 'pronto' AND OLD.estado != 'pronto' THEN
      NEW.pronto_at = NOW();
    ELSIF NEW.estado = 'entregue' AND OLD.estado != 'entregue' THEN
      NEW.entregue_at = NOW();
      -- Actualizar metricas do cliente
      UPDATE public.clientes
      SET
        total_pedidos = total_pedidos + 1,
        total_gasto = total_gasto + COALESCE(NEW.valor_final, NEW.valor_orcamento, 0),
        ultima_compra = NOW(),
        estagio = CASE WHEN total_pedidos >= 2 THEN 'vip' ELSE 'activo' END
      WHERE id = NEW.cliente_id;
    ELSIF NEW.estado = 'cancelado' AND OLD.estado != 'cancelado' THEN
      NEW.cancelado_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pedido_estado_changed
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION registar_mudanca_estado_pedido();
