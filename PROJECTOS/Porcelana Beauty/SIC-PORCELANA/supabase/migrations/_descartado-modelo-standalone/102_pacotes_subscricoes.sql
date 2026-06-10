-- ============================================================
-- Migration 102: pacotes + subscricoes + sessoes (ledger)
-- SIC Porcelana Beauty · módulo NOVO · ADR-002
-- Pré-requisitos: clientes, agendamentos (101)
-- ============================================================

-- ============================================================
-- pacotes — definição dos planos (Essencial/Porcelana/Black)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,                  -- 'essencial','porcelana','cartao_black'
  descricao TEXT,
  preco_mensal NUMERIC(12,2) NOT NULL CHECK (preco_mensal >= 0),
  -- composição: que categorias e quantas sessões/mês inclui
  composicao JSONB NOT NULL DEFAULT '[]',     -- [{"servico_categoria":"laser","sessoes":4},{"servico_categoria":"facial","sessoes":2}]
  beneficios JSONB DEFAULT '{}',              -- {"prioridade":true,"desconto_homecare":0.1,"vip":true}
  prioridade_agenda INTEGER DEFAULT 0,        -- Black > Porcelana > Essencial
  activo BOOLEAN DEFAULT TRUE NOT NULL
);

COMMENT ON TABLE public.pacotes IS 'Planos de recorrência (FR15-17). Novo — ISILDA é transaccional.';

CREATE TRIGGER on_pacotes_updated
  BEFORE UPDATE ON public.pacotes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver pacotes" ON public.pacotes
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados podem gerir pacotes" ON public.pacotes
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role all pacotes" ON public.pacotes
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- subscricoes — cliente subscrita a um pacote
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pacote_id UUID NOT NULL REFERENCES public.pacotes(id) ON DELETE RESTRICT,
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa','suspensa','cancelada','expirada')),
  inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  proximo_ciclo DATE NOT NULL,                -- data de renovação mensal
  cancelada_at TIMESTAMPTZ,
  notas TEXT
);

COMMENT ON TABLE public.subscricoes IS 'Subscrição cliente↔pacote, ciclo mensal (FR16).';

CREATE TRIGGER on_subscricoes_updated
  BEFORE UPDATE ON public.subscricoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_subscricoes_cliente ON public.subscricoes(cliente_id);
CREATE INDEX idx_subscricoes_estado ON public.subscricoes(estado);
CREATE INDEX idx_subscricoes_proximo_ciclo
  ON public.subscricoes(proximo_ciclo) WHERE estado = 'activa';

ALTER TABLE public.subscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver subscricoes" ON public.subscricoes
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Autenticados podem gerir subscricoes" ON public.subscricoes
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role all subscricoes" ON public.subscricoes
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.subscricoes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- sessoes — LEDGER de saldo (crédito/débito). Sem updated_at:
-- linhas são imutáveis (livro-razão), só se inserem.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  subscricao_id UUID NOT NULL REFERENCES public.subscricoes(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_categoria TEXT NOT NULL,            -- 'laser','facial', etc.
  tipo TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  ciclo DATE NOT NULL,                        -- a que ciclo mensal pertence
  notas TEXT
);

COMMENT ON TABLE public.sessoes IS 'Livro-razão de sessões (FR18). credito=renovação concede; debito=consumo. Imutável.';

CREATE INDEX idx_sessoes_subscricao ON public.sessoes(subscricao_id);
CREATE INDEX idx_sessoes_cliente ON public.sessoes(cliente_id);

ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver sessoes" ON public.sessoes
  FOR SELECT TO authenticated USING (TRUE);
-- INSERT-only para authenticated (ledger imutável); sem UPDATE/DELETE.
CREATE POLICY "Autenticados podem inserir sessoes" ON public.sessoes
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Service role all sessoes" ON public.sessoes
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- VIEW: saldo de sessões por subscrição/categoria/ciclo
-- ============================================================
CREATE OR REPLACE VIEW public.v_saldo_sessoes AS
SELECT
  s.subscricao_id,
  s.cliente_id,
  s.servico_categoria,
  s.ciclo,
  COALESCE(SUM(s.quantidade) FILTER (WHERE s.tipo='credito'), 0)
   - COALESCE(SUM(s.quantidade) FILTER (WHERE s.tipo='debito'), 0) AS saldo
FROM public.sessoes s
GROUP BY s.subscricao_id, s.cliente_id, s.servico_categoria, s.ciclo;

COMMENT ON VIEW public.v_saldo_sessoes IS 'Saldo de sessões por subscrição/categoria/ciclo (consumido pela tool consultar_pacote).';

-- ============================================================
-- ALTER: ligar agendamentos → subscricoes (resolve dependência
-- circular: agendamentos criada em 101 antes de subscricoes)
-- ============================================================
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS subscricao_id UUID
  REFERENCES public.subscricoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_subscricao
  ON public.agendamentos(subscricao_id) WHERE subscricao_id IS NOT NULL;

COMMENT ON COLUMN public.agendamentos.subscricao_id IS 'Se o agendamento consome uma sessão de pacote (debita em sessoes).';
