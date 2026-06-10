# ADR-002 — Schema de Pacotes / Subscrição / Sessões

**Estado:** Aceite · **Data:** 2026-06-09 · **Autor:** Aria (Architect)
**Cobre:** FR15, FR16, FR17, FR18 · **Epic:** 5

## Contexto

A ISILDA é **transaccional** (pedido único de bolo). Não tem nenhum conceito de subscrição, plano recorrente ou saldo de sessões. A Porcelana Beauty precisa de **3 pacotes mensais** (Essencial 80k, Porcelana 150k, Cartão Black 250k Kz/mês) + **planos multi-sessão** (laser 6-8 sessões). Este é o maior bloco genuinamente novo.

## Decisão

Três tabelas novas: **`pacotes`** (catálogo de planos), **`subscricoes`** (cliente↔pacote activo, ciclo mensal), **`sessoes`** (livro-razão de saldo/consumo). Modelo de **ledger** (cada consumo é uma linha), não contador mutável — auditável e à prova de erro.

## Schema (DDL)

```sql
-- ============================================================
-- pacotes — definição dos planos (Essencial/Porcelana/Black)
-- ============================================================
CREATE TABLE public.pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nome TEXT NOT NULL,                       -- "Essencial", "Porcelana", "Cartão Black"
  slug TEXT UNIQUE NOT NULL,                -- "essencial", "porcelana", "cartao_black"
  descricao TEXT,
  preco_mensal NUMERIC(12,2) NOT NULL,
  -- composição: que serviços e quantas sessões/mês inclui
  composicao JSONB NOT NULL DEFAULT '[]',   -- [{"servico_categoria":"laser","sessoes":4},{"servico_categoria":"facial","sessoes":2}]
  -- benefícios diferenciados (Cartão Black: prioridade, etc.)
  beneficios JSONB DEFAULT '{}',            -- {"prioridade":true,"desconto_homecare":0.1,"vip":true}
  prioridade_agenda INTEGER DEFAULT 0,      -- Black > Porcelana > Essencial (ordenação de slot)
  activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- ============================================================
-- subscricoes — cliente subscrita a um pacote
-- ============================================================
CREATE TABLE public.subscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pacote_id UUID NOT NULL REFERENCES public.pacotes(id) ON DELETE RESTRICT,
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa','suspensa','cancelada','expirada')),
  inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  proximo_ciclo DATE NOT NULL,              -- data de renovação mensal
  cancelada_at TIMESTAMPTZ,
  notas TEXT
);
CREATE INDEX idx_subscricoes_cliente ON public.subscricoes(cliente_id);
CREATE INDEX idx_subscricoes_estado ON public.subscricoes(estado);
CREATE INDEX idx_subscricoes_proximo_ciclo
  ON public.subscricoes(proximo_ciclo) WHERE estado = 'activa';

-- ============================================================
-- sessoes — LEDGER de saldo de sessões (crédito/débito)
-- ============================================================
CREATE TABLE public.sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  subscricao_id UUID NOT NULL REFERENCES public.subscricoes(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_categoria TEXT NOT NULL,          -- 'laser','facial', etc.
  tipo TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
  -- credito = renovação mensal concede N sessões; debito = consumo num agendamento
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  ciclo DATE NOT NULL,                       -- a que ciclo mensal pertence
  notas TEXT
);
CREATE INDEX idx_sessoes_subscricao ON public.sessoes(subscricao_id);
CREATE INDEX idx_sessoes_cliente ON public.sessoes(cliente_id);

-- ============================================================
-- VIEW: saldo de sessões por subscrição/categoria/ciclo
-- ============================================================
CREATE OR REPLACE VIEW v_saldo_sessoes AS
SELECT
  s.subscricao_id,
  s.cliente_id,
  s.servico_categoria,
  s.ciclo,
  COALESCE(SUM(CASE WHEN s.tipo='credito' THEN s.quantidade ELSE 0 END),0)
   - COALESCE(SUM(CASE WHEN s.tipo='debito' THEN s.quantidade ELSE 0 END),0) AS saldo
FROM public.sessoes s
GROUP BY s.subscricao_id, s.cliente_id, s.servico_categoria, s.ciclo;
```

Triggers `handle_updated_at()` em `pacotes` e `subscricoes`. RLS no padrão ISILDA. `subscricoes` adicionada ao Realtime.

## Por que ledger e não contador?

Um campo `sessoes_restantes INTEGER` mutável é frágil: corre o risco de updates concorrentes, perde histórico, e é difícil auditar "porque é que esta cliente tem 2 sessões?". O **ledger** (linhas de crédito/débito) é:
- Auditável (cada movimento tem origem e timestamp).
- Concorrência-seguro (inserts, não updates de contador).
- Alinhado com o padrão `ai_agent_send_counts` da ISILDA (janelas de contagem por linhas).

## Ciclo de renovação

`recompra-cron` (já existente) é estendido: diariamente verifica `subscricoes` com `proximo_ciclo <= hoje AND estado='activa'`, insere linhas de **crédito** em `sessoes` conforme `pacote.composicao`, avança `proximo_ciclo += 1 mês`. Cobrança é registada em `pagamentos` (reuso).

## Consequências

- ✅ Modelo auditável, extensível (novos pacotes = linhas em `pacotes`).
- ✅ `prioridade_agenda` integra com ADR-003 (Black tem prioridade de slot).
- ⚠️ Cobrança recorrente real (gateway) está fora de âmbito v1 — confirmação manual de pagamento, como na ISILDA. Automação de cobrança = backlog.
- ⚠️ Sessões não-usadas: política de rollover/expiração por definir com o cliente (default: expiram no fim do ciclo). Registar como decisão de negócio pendente.
