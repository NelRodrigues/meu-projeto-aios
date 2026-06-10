# ADR-003 — Agendamento Multi-recurso

**Estado:** Aceite (faseado) · **Data:** 2026-06-09 · **Autor:** Aria (Architect)
**Cobre:** FR8, FR9, FR10, FR11, FR12 · **Epic:** 3

## Contexto

A ISILDA tem `calendario_producao` de **capacidade simples**: N pedidos/dia, sem horas, sem recursos. A Porcelana Beauty precisa de algo mais rico (kick-off):
- Disponibilidade **real** por profissional (técnica) e por **sala**.
- **Tempo de preparação de sala** entre tratamentos (factor crítico).
- **Tratamentos simultâneos** quando há capacidade (2 salas → 2 em paralelo).
- Sem sobreposições nem marcações demasiado próximas.

Isto é genuinamente mais complexo que a capacidade simples da ISILDA. Risco de over-engineering se construirmos um motor de scheduling completo logo no MVP.

## Decisão

**Modelo de slots por recurso (técnica × sala) com duração + buffer**, entregue em **2 fases**:

- **Fase 3a (MVP go-live Junho):** agendamento com **slot temporal real** (data + hora + duração + buffer de preparação), validação de sobreposição por técnica e por sala. **Simultaneidade implícita** = nº de salas. Sem optimização automática de encaixe.
- **Fase 3b (pós-MVP):** sugestão automática do melhor slot, regras avançadas (ex.: técnica X só faz laser), encaixe optimizado.

Esta divisão respeita o risco identificado no PRD ("v1 simples, evoluir depois") sem cair em capacidade-simples-demais.

## Schema (DDL)

```sql
-- ============================================================
-- salas — recursos físicos
-- ============================================================
CREATE TABLE public.salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nome TEXT NOT NULL,                        -- "Sala Laser", "Sala Facial 1"
  tipos_suportados TEXT[] DEFAULT '{}',      -- ['laser'] ou ['facial','corporal']
  activa BOOLEAN DEFAULT TRUE NOT NULL
);

-- ============================================================
-- agendamentos — substitui pedidos
-- ============================================================
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Relações
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES public.servicos_catalogo(id) ON DELETE SET NULL,
  tecnica_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sala_id UUID REFERENCES public.salas(id) ON DELETE SET NULL,
  conversa_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE SET NULL,
  subscricao_id UUID REFERENCES public.subscricoes(id) ON DELETE SET NULL, -- se consome pacote

  -- Tratamento
  descricao TEXT,
  zona TEXT,                                 -- ex.: "axilas", "rosto"
  imagem_referencia TEXT,                    -- foto da pele enviada

  -- Slot temporal
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  buffer_minutos INTEGER NOT NULL DEFAULT 15, -- preparação de sala
  -- hora_fim derivada = hora_inicio + duracao + buffer

  -- Financeiro
  valor NUMERIC(12,2),
  pre_pagamento_pct INTEGER DEFAULT 0,       -- 0/50/100

  -- Estado (fluxo estética)
  estado TEXT NOT NULL DEFAULT 'novo' CHECK (estado IN (
    'novo','avaliacao','agendado','confirmado','pago',
    'realizado','concluido','no_show','cancelado'
  )),

  -- Funil de qualificação (ADR-005)
  porta TEXT CHECK (porta IN ('fundadora','tecnica')),

  origem_lembrete_24h BOOLEAN DEFAULT FALSE, -- já enviou lembrete?
  notas TEXT,

  -- tracking timestamps
  confirmado_at TIMESTAMPTZ,
  realizado_at TIMESTAMPTZ,
  cancelado_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ
);
CREATE INDEX idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX idx_agendamentos_estado ON public.agendamentos(estado);
CREATE INDEX idx_agendamentos_tecnica ON public.agendamentos(tecnica_id, data);
CREATE INDEX idx_agendamentos_sala ON public.agendamentos(sala_id, data);
```

### Validação de sobreposição (constraint + função)

```sql
-- Função: verifica conflito de slot para técnica E sala
CREATE OR REPLACE FUNCTION verificar_conflito_agendamento(
  p_tecnica UUID, p_sala UUID, p_data DATE,
  p_inicio TIME, p_dur INTEGER, p_buffer INTEGER, p_excluir UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE v_fim TIME; v_conflito BOOLEAN;
BEGIN
  v_fim := p_inicio + ((p_dur + p_buffer) || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.data = p_data
      AND a.estado NOT IN ('cancelado','no_show')
      AND (a.id IS DISTINCT FROM p_excluir)
      AND (a.tecnica_id = p_tecnica OR a.sala_id = p_sala)
      AND (p_inicio, v_fim) OVERLAPS
          (a.hora_inicio, a.hora_inicio + ((a.duracao_minutos + a.buffer_minutos)||' minutes')::interval)
  ) INTO v_conflito;
  RETURN v_conflito;
END;
$$ LANGUAGE plpgsql STABLE;
```

### RPC para o agente (substitui `verificar_disponibilidade` de bolo)

```sql
-- consultar_disponibilidade(data, servico_id) → slots livres do dia
-- considera duração do serviço, salas compatíveis e técnicas disponíveis (user_availability)
```

## Reuso de `user_availability`

A tabela `user_availability` da ISILDA (day_of_week, start/end time) é **reusada** para a disponibilidade-base das técnicas. O conflito real é calculado contra `agendamentos`.

## Incorporação do CRM Salus (v1.2)

Ver `docs/architecture/analise-crm-salus-aproveitamento.md` (P3). Dois reforços:

- **Extracção de data/hora em linguagem natural** (`extract-datetime.ts`): a tool `agendar_tratamento`/`consultar_disponibilidade` deve interpretar "pode ser quinta de tarde?" → data/hora concreta antes de validar conflito. Reutilizável quase directo.
- **Google Calendar (opcional):** se as técnicas usarem Google Calendar, o padrão `book-visit.ts` (FreeBusy + criar evento + idempotência por `google_event_id`) integra-se. Senão, fica o calendário interno (`agendamentos`+`calendario_agenda`). Decisão a confirmar com a clínica — **não bloqueia o MVP**.

## Consequências

- ✅ MVP (3a) entrega slot real com anti-sobreposição — suficiente para go-live.
- ✅ Simultaneidade natural via múltiplas salas.
- ✅ `buffer_minutos` resolve o requisito crítico de preparação de sala.
- ⚠️ Optimização de encaixe e regras complexas ficam para 3b.
- ⚠️ `OVERLAPS` em runtime é O(n) por dia — aceitável para escala de uma clínica (dezenas/dia). Indexado por (técnica, data) e (sala, data).
- ⚠️ Uma exclusion constraint GiST seria mais robusta que a função, mas exige `btree_gist` — avaliar em 3b se a função mostrar limitações.
