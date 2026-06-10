-- ============================================================
-- Migration 101: salas + agendamentos + calendario_agenda
-- SIC Porcelana Beauty · módulo NOVO · ADR-003 (Fase 3a)
-- Substitui pedidos + calendario_producao da ISILDA.
-- Pré-requisitos: clientes, profiles, servicos_catalogo (100),
--                 mudancas_estagio (reusada), user_availability (reusada)
-- ============================================================

-- ============================================================
-- salas — recursos físicos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nome TEXT NOT NULL,
  tipos_suportados TEXT[] DEFAULT '{}',       -- ['laser'] ou ['facial','corporal']
  activa BOOLEAN DEFAULT TRUE NOT NULL
);

COMMENT ON TABLE public.salas IS 'Salas/recursos físicos da clínica (ADR-003). Permite simultaneidade = nº de salas.';

CREATE TRIGGER on_salas_updated
  BEFORE UPDATE ON public.salas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver salas" ON public.salas
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados podem gerir salas" ON public.salas
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role all salas" ON public.salas
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- agendamentos — substitui pedidos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Relações
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES public.servicos_catalogo(id) ON DELETE SET NULL,
  tecnica_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sala_id UUID REFERENCES public.salas(id) ON DELETE SET NULL,
  conversa_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE SET NULL,
  -- subscricao_id adicionada na migração 102 (pacotes) via ALTER, para não criar
  -- dependência circular entre 101 e 102.

  -- Tratamento
  descricao TEXT,
  zona TEXT,                                  -- ex.: "axilas", "rosto"
  imagem_referencia TEXT,                     -- foto da pele enviada (vision)

  -- Slot temporal
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracao_minutos > 0),
  buffer_minutos INTEGER NOT NULL DEFAULT 15 CHECK (buffer_minutos >= 0), -- preparação de sala

  -- Financeiro
  valor NUMERIC(12,2),
  pre_pagamento_pct INTEGER DEFAULT 0 CHECK (pre_pagamento_pct IN (0,50,100)),

  -- Estado (fluxo estética)
  estado TEXT NOT NULL DEFAULT 'novo' CHECK (estado IN (
    'novo','avaliacao','agendado','confirmado','pago',
    'realizado','concluido','no_show','cancelado'
  )),

  -- Funil de qualificação (ADR-005)
  porta TEXT CHECK (porta IN ('fundadora','tecnica')),

  origem_lembrete_24h BOOLEAN DEFAULT FALSE,  -- já enviou lembrete?
  notas TEXT,

  -- tracking timestamps
  confirmado_at TIMESTAMPTZ,
  realizado_at TIMESTAMPTZ,
  cancelado_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ
);

COMMENT ON TABLE public.agendamentos IS 'Agendamentos de tratamento (FR8-12). Substitui pedidos da ISILDA.';
COMMENT ON COLUMN public.agendamentos.porta IS 'Funil 2-portas (ADR-005): fundadora (avaliação) vs tecnica (directo).';
COMMENT ON COLUMN public.agendamentos.buffer_minutos IS 'Tempo de preparação de sala entre tratamentos (requisito kick-off).';

CREATE TRIGGER on_agendamentos_updated
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX idx_agendamentos_estado ON public.agendamentos(estado);
CREATE INDEX idx_agendamentos_tecnica ON public.agendamentos(tecnica_id, data);
CREATE INDEX idx_agendamentos_sala ON public.agendamentos(sala_id, data);
CREATE INDEX idx_agendamentos_lembrete
  ON public.agendamentos(data) WHERE estado IN ('agendado','confirmado','pago') AND origem_lembrete_24h = FALSE;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver agendamentos" ON public.agendamentos
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados podem gerir agendamentos" ON public.agendamentos
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role all agendamentos" ON public.agendamentos
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Realtime (padrão ISILDA para tabelas operacionais)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGER: tracking de timestamps + métricas do cliente
-- (adapta registar_mudanca_estado_pedido da ISILDA)
-- ============================================================
CREATE OR REPLACE FUNCTION public.registar_mudanca_estado_agendamento()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF NEW.estado = 'confirmado' AND OLD.estado <> 'confirmado' THEN
      NEW.confirmado_at = NOW();
    ELSIF NEW.estado = 'realizado' AND OLD.estado <> 'realizado' THEN
      NEW.realizado_at = NOW();
    ELSIF NEW.estado = 'concluido' AND OLD.estado <> 'concluido' THEN
      -- Actualizar métricas do cliente (padrão ISILDA)
      UPDATE public.clientes
      SET total_pedidos = total_pedidos + 1,
          total_gasto   = total_gasto + COALESCE(NEW.valor, 0),
          ultima_compra = NOW(),
          estagio       = CASE WHEN total_pedidos >= 2 THEN 'vip' ELSE 'activo' END
      WHERE id = NEW.cliente_id;
    ELSIF NEW.estado = 'no_show' AND OLD.estado <> 'no_show' THEN
      NEW.no_show_at = NOW();
    ELSIF NEW.estado = 'cancelado' AND OLD.estado <> 'cancelado' THEN
      NEW.cancelado_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_agendamento_estado_changed
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.registar_mudanca_estado_agendamento();

-- ============================================================
-- FUNÇÃO: verificar conflito de slot (técnica E sala)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verificar_conflito_agendamento(
  p_tecnica UUID, p_sala UUID, p_data DATE,
  p_inicio TIME, p_dur INTEGER, p_buffer INTEGER, p_excluir UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_fim TIME;
  v_conflito BOOLEAN;
BEGIN
  v_fim := p_inicio + ((p_dur + p_buffer) || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.data = p_data
      AND a.estado NOT IN ('cancelado','no_show')
      AND (p_excluir IS NULL OR a.id <> p_excluir)
      AND (a.tecnica_id = p_tecnica OR a.sala_id = p_sala)
      AND (p_inicio, v_fim) OVERLAPS
          (a.hora_inicio,
           a.hora_inicio + ((a.duracao_minutos + a.buffer_minutos) || ' minutes')::interval)
  ) INTO v_conflito;
  RETURN v_conflito;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.verificar_conflito_agendamento IS 'Anti-sobreposição por técnica E sala (FR9). Usado por agendar_tratamento/reagendar.';
