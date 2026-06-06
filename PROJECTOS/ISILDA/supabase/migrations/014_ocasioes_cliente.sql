-- Migration 014: Ocasioes do Cliente + RPC upcoming occasions

-- ============================================================
-- TABELA: ocasioes_cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ocasioes_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'aniversario_proprio',
    'aniversario_filho',
    'aniversario_familiar',
    'casamento',
    'batizado',
    'formatura',
    'natal',
    'outro'
  )),
  nome_pessoa TEXT,
  data_evento TEXT NOT NULL, -- formato MM-DD (ex: '03-15' = 15 de Marco)
  ano_especifico INTEGER,    -- NULL se recorrente, ex: 2026 para evento unico
  notas TEXT,
  ultimo_lembrete_enviado DATE,
  activo BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TRIGGER on_ocasioes_updated
  BEFORE UPDATE ON public.ocasioes_cliente
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_ocasioes_cliente ON public.ocasioes_cliente(cliente_id);
CREATE INDEX idx_ocasioes_data ON public.ocasioes_cliente(data_evento);
CREATE INDEX idx_ocasioes_activo ON public.ocasioes_cliente(activo);

-- RLS
ALTER TABLE public.ocasioes_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver ocasioes" ON public.ocasioes_cliente
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Autenticados podem gerir ocasioes" ON public.ocasioes_cliente
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- RPC: get_upcoming_occasions
-- Retorna ocasioes nos proximos 25-35 dias
-- ============================================================

CREATE OR REPLACE FUNCTION get_upcoming_occasions(
  p_dias_min INTEGER DEFAULT 25,
  p_dias_max INTEGER DEFAULT 35
)
RETURNS TABLE (
  ocasiao_id UUID,
  cliente_id UUID,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  tipo TEXT,
  nome_pessoa TEXT,
  data_evento TEXT,
  dias_falta INTEGER,
  ultimo_lembrete_enviado DATE,
  notas TEXT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_hoje DATE := CURRENT_DATE;
  v_ano INTEGER := EXTRACT(YEAR FROM v_hoje);
BEGIN
  RETURN QUERY
  SELECT
    o.id AS ocasiao_id,
    o.cliente_id,
    c.nome AS cliente_nome,
    c.telefone AS cliente_telefone,
    o.tipo,
    o.nome_pessoa,
    o.data_evento,
    -- Calcular dias ate ao evento este ano ou no proximo
    CASE
      WHEN (v_ano || '-' || o.data_evento)::DATE >= v_hoje
        THEN ((v_ano || '-' || o.data_evento)::DATE - v_hoje)::INTEGER
      ELSE
        (((v_ano + 1) || '-' || o.data_evento)::DATE - v_hoje)::INTEGER
    END AS dias_falta,
    o.ultimo_lembrete_enviado,
    o.notas
  FROM public.ocasioes_cliente o
  JOIN public.clientes c ON c.id = o.cliente_id
  WHERE
    o.activo = TRUE
    -- Evento recorrente OU especifico para este ano/proximo
    AND (o.ano_especifico IS NULL OR o.ano_especifico >= v_ano)
    -- Nao enviou lembrete nos ultimos 300 dias
    AND (o.ultimo_lembrete_enviado IS NULL OR o.ultimo_lembrete_enviado < v_hoje - INTERVAL '300 days')
    -- O evento esta na janela de antecedencia
    AND (
      CASE
        WHEN (v_ano || '-' || o.data_evento)::DATE >= v_hoje
          THEN ((v_ano || '-' || o.data_evento)::DATE - v_hoje)::INTEGER
        ELSE
          (((v_ano + 1) || '-' || o.data_evento)::DATE - v_hoje)::INTEGER
      END
    ) BETWEEN p_dias_min AND p_dias_max
  ORDER BY dias_falta;
END;
$$;
