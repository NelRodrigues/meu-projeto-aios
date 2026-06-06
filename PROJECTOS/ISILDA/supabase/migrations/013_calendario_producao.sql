-- Migration 013: Calendario de Producao + View + Cron + Seed

-- ============================================================
-- TABELA: calendario_producao
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendario_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  data DATE UNIQUE NOT NULL,
  capacidade_maxima INTEGER DEFAULT 3 NOT NULL,
  notas TEXT,
  bloqueado BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TRIGGER on_calendario_updated
  BEFORE UPDATE ON public.calendario_producao
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_calendario_data ON public.calendario_producao(data);

-- RLS
ALTER TABLE public.calendario_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver calendario" ON public.calendario_producao
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir calendario" ON public.calendario_producao
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- VIEW: v_calendario_producao
-- Calcula pedidos_agendados, vagas_disponiveis, status por dia
-- ============================================================

CREATE OR REPLACE VIEW v_calendario_producao AS
SELECT
  c.data,
  c.capacidade_maxima,
  c.notas,
  c.bloqueado,
  COUNT(p.id) FILTER (WHERE p.estado NOT IN ('cancelado', 'entregue')) AS pedidos_agendados,
  GREATEST(0, c.capacidade_maxima - COUNT(p.id) FILTER (WHERE p.estado NOT IN ('cancelado', 'entregue'))) AS vagas_disponiveis,
  CASE
    WHEN c.bloqueado THEN 'bloqueado'
    WHEN c.data < CURRENT_DATE THEN 'passado'
    WHEN COUNT(p.id) FILTER (WHERE p.estado NOT IN ('cancelado', 'entregue')) >= c.capacidade_maxima THEN 'lotado'
    WHEN COUNT(p.id) FILTER (WHERE p.estado NOT IN ('cancelado', 'entregue')) >= c.capacidade_maxima - 1 THEN 'quase_lotado'
    ELSE 'disponivel'
  END AS status
FROM public.calendario_producao c
LEFT JOIN public.pedidos p ON p.data_entrega = c.data
GROUP BY c.data, c.capacidade_maxima, c.notas, c.bloqueado;

-- ============================================================
-- FUNCAO: gerar_slots_calendario
-- Gera slots para os proximos N dias (skip domingos)
-- ============================================================

CREATE OR REPLACE FUNCTION gerar_slots_calendario(p_dias INTEGER DEFAULT 60)
RETURNS INTEGER AS $$
DECLARE
  v_data DATE;
  v_count INTEGER := 0;
BEGIN
  FOR i IN 0..p_dias LOOP
    v_data := CURRENT_DATE + i;

    -- Bloquear domingos (0 = domingo)
    INSERT INTO public.calendario_producao (data, capacidade_maxima, bloqueado)
    VALUES (v_data, 3, EXTRACT(DOW FROM v_data) = 0)
    ON CONFLICT (data) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Seed: gerar slots para os proximos 60 dias
SELECT gerar_slots_calendario(60);

-- ============================================================
-- CRON: gerar slots semanalmente (domingo 00:00)
-- ============================================================

SELECT cron.schedule(
  'gerar-slots-calendario',
  '0 0 * * 0',  -- Domingo meia-noite
  $$SELECT gerar_slots_calendario(60);$$
);

-- ============================================================
-- RPC: verificar_disponibilidade (para o bot)
-- ============================================================

CREATE OR REPLACE FUNCTION verificar_disponibilidade(p_data DATE)
RETURNS JSONB AS $$
DECLARE
  v_slot RECORD;
  v_prox_disponivel DATE;
BEGIN
  SELECT * INTO v_slot
  FROM v_calendario_producao
  WHERE data = p_data;

  IF v_slot IS NULL THEN
    RETURN jsonb_build_object(
      'disponivel', FALSE,
      'motivo', 'Data nao encontrada no calendario'
    );
  END IF;

  IF v_slot.status IN ('disponivel', 'quase_lotado') THEN
    RETURN jsonb_build_object(
      'disponivel', TRUE,
      'data', p_data,
      'vagas', v_slot.vagas_disponiveis,
      'pedidos', v_slot.pedidos_agendados,
      'status', v_slot.status
    );
  END IF;

  -- Encontrar proximo dia disponivel
  SELECT data INTO v_prox_disponivel
  FROM v_calendario_producao
  WHERE data > p_data
    AND status IN ('disponivel', 'quase_lotado')
  ORDER BY data
  LIMIT 1;

  RETURN jsonb_build_object(
    'disponivel', FALSE,
    'data', p_data,
    'status', v_slot.status,
    'proximo_disponivel', v_prox_disponivel
  );
END;
$$ LANGUAGE plpgsql STABLE;
