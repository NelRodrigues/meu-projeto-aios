# SIC Global Minds — Documento de Arquitectura Técnica

**Sistema de Inteligência Comercial · Marca Digital × Global Minds Consultoria**

> Fontes vinculativas: [PRD v1.0](../prd/PRD-SIC-GLOBAL-MINDS.md) (secções 2 e 4) · [Project Brief v1.2](../brief/PROJECT-BRIEF-SIC-GLOBAL-MINDS.md) (§6–8). Este documento é o gate técnico da story 2.1 e a referência que o @dev segue. Confidencial — uso interno MD + Global Minds.

| Campo | Detalhe |
|---|---|
| **Autor** | Aria (@architect) |
| **Versão** | 1.0 · 10/07/2026 |
| **Base do codebase** | ISILDA (geração 2 SIC — Next.js 16 + React 19 + Tailwind v4 + @supabase/ssr) |
| **Backend** | Supabase dedicado single-tenant da GM (sem `tenant_id`) |
| **Estado** | Semana 2 · validação intermédia 14/07 · entrega 29/07 |

---

## 1. Visão e princípios

O SIC Global Minds é um monólito Next.js 16 na Vercel (subdomínio da GM) sobre um Supabase **dedicado single-tenant**, com edge functions Deno focadas e automação por `pg_cron`. Herda três coisas: a robustez da fila de mensagens da ISILDA (idempotência + debounce + SKIP LOCKED), o modelo de qualificação comercial do SIC-MD (BANT/score/pipeline), e os padrões de agente da Salus (prompt em camadas, escalação determinística, humanização). Integra o Módulo Marketing & Campanhas como pacote drop-in.

**Princípios:**
1. **Source of truth = Postgres.** Edge functions são processadores puros; tudo o que importa está numa tabela.
2. **Single-tenant sem `tenant_id`** — regra zero do módulo marketing e imposição de compliance (base privada da GM).
3. **RLS desde a 1ª migração**, endurecida por papel; nunca "authenticated full access" cego onde há service_role.
4. **Enums e FKs por escrito ANTES das tabelas** (lição da auditoria 05/07 — `novo≠new`, FK ausente).
5. **Sem fallbacks inventados na extracção/agente**: pergunta sem resposta na base → escala; nunca cota valores.
6. **Determinismo antes do LLM**: opt-out e escalação D5 correm antes de qualquer chamada ao modelo.
7. **Compliance transversal** (E1→E4), não época final.

---

## 2. Modelo de dados definitivo

> Este é o **gate da story 2.1**. Todos os enums estão escritos com valores exactos; nenhuma tabela é criada antes de este documento ser aprovado.

### 2.1 Enums — valores exactos (por escrito, ANTES das tabelas)

Decisão de estilo: usar **CHECK constraints com valores em texto** (padrão ISILDA/SIC-MD), não `CREATE TYPE ... AS ENUM`, para permitir evolução sem migração de tipo. Valores em minúsculas, sem acento, `snake_case`.

```
-- Pipeline de candidaturas (8 fases reais da GM — brief §4 M2 / PRD FR10)
pipeline_fase        := ('lead', 'qualificado', 'consulta_agendada', 'proposta_enviada',
                         'formalizacao_pagamento', 'candidatura_submetida', 'em_curso', 'concluido')

-- Tipo de programa (brief §4 M2)
programa_tipo        := ('summer_camp', 'linguas', 'foundation', 'licenciatura',
                         'mestrado', 'voluntariado', 'outro')

-- Temperatura do lead (thresholds do brief §8: QUENTE ≥9 / MORNO 5–8 / FRIO ≤4 numa escala 0–10)
lead_temperature     := ('quente', 'morno', 'frio')

-- Confiança do score de qualificação (NOVO — ver conflito C1 na §10)
score_confidence     := ('low', 'medium', 'high')

-- Estado de factura
factura_estado       := ('pendente', 'enviada', 'paga', 'vencida', 'cancelada')

-- Estado de registo financeiro (honorário/comissão)
financeiro_estado    := ('previsto', 'facturado', 'recebido', 'anulado')

-- Estado documental de item da checklist
documento_estado     := ('em_falta', 'recebido', 'validado', 'rejeitado')

-- Estado da conversa do agente (herdado ISILDA, mantém-se)
conversa_status      := ('active', 'paused_by_human', 'paused_by_schedule', 'transferred', 'completed')

-- Motivo de pausa/escalação
pause_reason         := ('opt_out', 'human_request', 'escalation_d5', 'urgent', 'no_answer', 'manual')

-- Origem de lead
lead_origem          := ('whatsapp', 'formulario_site', 'instagram', 'indicacao',
                         'campanha_email', 'campanha_whatsapp', 'importacao', 'outro')

-- Tipo de consentimento (herdado ISILDA 020, ajustado)
consentimento_tipo   := ('dados_pessoais', 'whatsapp_bot', 'marketing', 'partilha_terceiros')

-- Idioma preferido do lead
idioma               := ('pt', 'en')
```

**Moeda:** o campo `currency` é **`CHAR(3)` livre validado por regex ISO 4217** (`^[A-Z]{3}$`), NÃO um enum. As tabelas do cliente usam EUR, USD, GBP, ZAR, AED, CAD, AUD — um enum fixo bloquearia moedas futuras. Validação por CHECK: `currency ~ '^[A-Z]{3}$'`. (Brief §4 M2: "campo de moeda livre (ISO 4217)".)

### 2.2 Decisão nuclear: mapeamento `clientes` → `leads`

**Conflito estrutural resolvido.** A base ISILDA usa a tabela `clientes`. O módulo marketing espera `leads` com `pipeline_stage_id`, `sales_rep_id`, `bant_*`, `tags[]` (as suas migrações, triggers e FKs referenciam `public.leads` literalmente — ex.: `trg_email_automation_leads AFTER INSERT OR UPDATE ON public.leads`; `email_subscribers.lead_id → leads(id)`).

**Decisão: a tabela nuclear de contactos chama-se `leads`** (não `clientes`). Renomeamos no clone da base. Fundamentos:
- O módulo marketing tem ~8 migrações, 9 edges e ~40 componentes que dependem de `leads` — renomear o módulo é muito mais caro e frágil que renomear a base.
- `leads` é o nome do SIC-MD (herança comercial declarada no brief §6).
- Todas as tabelas herdadas da ISILDA que referenciam `clientes(id)` (`ai_agent_conversations`, `mensagens_whatsapp`, `consentimentos`, `mudancas_estagio`, etc.) passam a referenciar `leads(id)` — find/replace `cliente_id`→`lead_id` na migração de clone. A função `anonimizar_cliente()` é adaptada e renomeada `anonimizar_lead()` mas o nome público pode manter-se por compatibilidade — ver §2.6.

> **Regra de disciplina para o @dev:** ao clonar a base ISILDA, o rename `clientes`→`leads` e `cliente_id`→`lead_id` faz-se numa migração dedicada (002) ANTES de qualquer tabela do domínio GM ou do módulo. Nenhuma tabela nova deve nascer com `cliente_id`.

### 2.3 Tabelas herdadas (referenciadas, NÃO repetidas)

Estas vêm do clone da base ISILDA (migrações 003, 006, 007, 008, 009, 020, 030 originais) — reutilizadas com o rename `clientes→leads`:

| Tabela | Origem ISILDA | Ajuste GM |
|---|---|---|
| `profiles` | 002 | Mantida (auth base) |
| `leads` (era `clientes`) | 003 | **Renomeada + estendida** (ver 2.4) |
| `interacoes` | 004 | `cliente_id`→`lead_id` |
| `mudancas_estagio` | 005 | `cliente_id`→`lead_id`; `estagio_*` passam a usar `pipeline_fase` |
| `mensagens_whatsapp` | 006 | `cliente_id`→`lead_id` |
| `integration_keys` | 007 | Mantida (chaves com fallback env) |
| `ai_sales_agents`, `ai_agent_conversations`, `ai_agent_message_queue`, `ai_agent_logs`, `ai_agent_send_counts`, `ai_agent_scheduled_followups`, `ai_agent_cadence_enrollments`, `ai_agent_tools`, `user_availability` | 008 | `cliente_id`→`lead_id`; RPCs (`enqueue_message_for_ai_agent`, `claim_queue_messages`, `try_acquire_agent_lock`, `process_ai_agent_queue`) mantidas |
| `webhook_processed_messages` | 009 | Mantida (idempotência `whatsapp_message_id UNIQUE`) |
| `consentimentos` | 020 | `cliente_id`→`lead_id` |
| `whatsapp_instances` | 030 | **Remover coluna `tenant_id`** (single-tenant) |
| `templates_whatsapp`, `notificacoes` | 018/019 | `cliente_id`→`lead_id` |

Settings JSONB de série do agente (`ai_sales_agents.settings`) mantêm-se: `working_hours 08:00–20:00`, `debounce_seconds 10`, `response_delay 1500–4000ms`, `message_split_max_length 300`, `context_messages_limit 250`, `max_messages_per_conversation 60`, `cadence_max_messages_per_hour 50`, `cadence_max_messages_per_day 60`, `auto_pause_after_human_reply true`.

### 2.4 Extensão da tabela `leads` (domínio GM + comercial)

`leads` = `clientes` renomeada + colunas de qualificação. **Descoberta crítica (conflito C1):** o SIC-MD **NÃO tem** `score_confidence`, `fit_score`, `temperature` como colunas — o brief §6 e §8 assumem-nas como herança mas na prática são **campos novos a desenhar de raiz**. Aqui ficam definidos:

```sql
ALTER TABLE leads
  -- Qualificação / pipeline
  ADD COLUMN pipeline_fase   TEXT NOT NULL DEFAULT 'lead'
     CHECK (pipeline_fase IN ('lead','qualificado','consulta_agendada','proposta_enviada',
                              'formalizacao_pagamento','candidatura_submetida','em_curso','concluido')),
  ADD COLUMN sales_rep_id    UUID REFERENCES profiles(id),   -- "sales_rep_id" esperado pelo módulo mkt
  ADD COLUMN pipeline_stage_id UUID,   -- alias/coluna que o trigger do módulo lê (ver nota abaixo)
  -- BANT (herdado conceptualmente do SIC-MD, colunas criadas aqui)
  ADD COLUMN bant_budget     TEXT,     -- livre/curto: faixa de orçamento indicada
  ADD COLUMN bant_authority  TEXT,     -- quem decide (encarregado/estudante)
  ADD COLUMN bant_need       TEXT,
  ADD COLUMN bant_timeline   TEXT,
  ADD COLUMN sales_score     INTEGER DEFAULT 0 CHECK (sales_score BETWEEN 0 AND 100),
  ADD COLUMN score_confidence TEXT DEFAULT 'low'
     CHECK (score_confidence IN ('low','medium','high')),        -- NOVO (C1)
  ADD COLUMN fit_score       INTEGER CHECK (fit_score BETWEEN 0 AND 100),  -- NOVO (C1)
  ADD COLUMN temperature     TEXT CHECK (temperature IN ('quente','morno','frio')), -- NOVO (C1)
  -- Domínio educação
  ADD COLUMN destino         TEXT,     -- país pretendido
  ADD COLUMN nivel           TEXT,     -- summer/línguas/foundation/licenciatura/mestrado/voluntariado
  ADD COLUMN orcamento       TEXT,     -- faixa declarada (não valor exacto — regra de faixas)
  ADD COLUMN idioma_pref     TEXT DEFAULT 'pt' CHECK (idioma_pref IN ('pt','en')),
  ADD COLUMN followup_count  INTEGER DEFAULT 0,
  ADD COLUMN tags            TEXT[] DEFAULT '{}',   -- exigido pelo módulo mkt (migração 001)
  ADD COLUMN utm_source TEXT, ADD COLUMN utm_medium TEXT, ADD COLUMN utm_campaign TEXT;

CREATE INDEX idx_leads_fase        ON leads(pipeline_fase);
CREATE INDEX idx_leads_temperature ON leads(temperature) WHERE temperature IS NOT NULL;
CREATE INDEX idx_leads_score       ON leads(sales_score DESC);
CREATE INDEX idx_leads_followup    ON leads(followup_count);
```

> **Nota sobre `pipeline_stage_id`:** o trigger `dispatch_email_automation_event()` do módulo compara `OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id` para o evento `lead_stage_changed`. A GM usa `pipeline_fase` (texto) como verdade. **Decisão:** manter `pipeline_stage_id UUID` como coluna-espelho opcional (apontando para uma tabela `pipeline_stages` leve, ver 2.5) OU **adaptar o trigger** do módulo para observar `OLD.pipeline_fase IS DISTINCT FROM NEW.pipeline_fase`. Recomendação: **adaptar o trigger** (mais simples, uma linha) e deixar `pipeline_stage_id` nulo. Documentado na migração 006 do módulo (ajuste de nomes).

**Cálculo de temperatura** (trigger `BEFORE INSERT/UPDATE`): a partir de `sales_score` numa escala 0–100, mapeando os thresholds do brief (que estão em escala 0–10 → normalizamos): `quente ≥ 70`, `morno 40–69`, `frio < 40`. Se `score_confidence = 'low'`, a temperatura mantém-se conservadora (nunca `quente` com confiança baixa — regra do SIC-MD herdada). Alerta de lead quente ao Rinaldo: `sales_score ≥ 70 AND score_confidence <> 'low'`.

### 2.5 Tabelas novas do domínio GM

```sql
-- ── Catálogo: parceiros → destinos → programas ──────────────────────────
CREATE TABLE parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,               -- Kaplan, INTO, MPW, Inspired, IH Cape Town, SAMIAD, U.Europeia/IADE/IPAM, GEA, Xior, EDU4WORD
  tipo TEXT,                        -- universidade / escola de línguas / housing / alliance
  comissao_percent NUMERIC(5,2),    -- % de comissão base do parceiro
  website TEXT,
  brochura_url TEXT,
  notas TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE destinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID REFERENCES parceiros(id) ON DELETE CASCADE,
  pais TEXT NOT NULL,               -- África do Sul, Portugal, Reino Unido, EAU, EUA, China...
  cidade TEXT,
  custo_vida_faixa TEXT,            -- faixa (não valor exacto)
  custo_vida_currency CHAR(3) CHECK (custo_vida_currency ~ '^[A-Z]{3}$'),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_destinos_parceiro ON destinos(parceiro_id);
CREATE INDEX idx_destinos_pais ON destinos(pais);

CREATE TABLE programas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destino_id UUID REFERENCES destinos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('summer_camp','linguas','foundation','licenciatura','mestrado','voluntariado','outro')),
  custo_min NUMERIC(12,2), custo_max NUMERIC(12,2),     -- faixa
  currency CHAR(3) CHECK (currency ~ '^[A-Z]{3}$'),
  comissao_percent NUMERIC(5,2),   -- override da % do parceiro, se diferente
  duracao TEXT, brochura_url TEXT, link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_programas_destino ON programas(destino_id);
CREATE INDEX idx_programas_tipo ON programas(tipo);

-- ── Ficha de estudante (1:1 com lead) ───────────────────────────────────
CREATE TABLE fichas_estudante (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  nome_completo TEXT, data_nascimento DATE, nacionalidade TEXT,
  encarregado_nome TEXT, encarregado_contacto TEXT, encarregado_relacao TEXT,
  percurso_academico TEXT, nivel_linguistico TEXT,
  destino_pretendido TEXT, programa_pretendido_id UUID REFERENCES programas(id),
  orcamento_faixa TEXT,
  processo_em_curso BOOLEAN NOT NULL DEFAULT false,   -- ⚠ bloqueia a rotina de retenção de 2 anos
  documentos JSONB DEFAULT '[]',   -- checklist: [{tipo, estado, url, updated_at}]
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fichas_lead ON fichas_estudante(lead_id);
CREATE INDEX idx_fichas_processo ON fichas_estudante(processo_em_curso) WHERE processo_em_curso = true;

-- ── Candidaturas (pipeline 8 fases) ─────────────────────────────────────
CREATE TABLE candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  ficha_id UUID REFERENCES fichas_estudante(id) ON DELETE SET NULL,
  programa_id UUID REFERENCES programas(id),
  parceiro_id UUID REFERENCES parceiros(id),
  fase TEXT NOT NULL DEFAULT 'lead'
     CHECK (fase IN ('lead','qualificado','consulta_agendada','proposta_enviada',
                     'formalizacao_pagamento','candidatura_submetida','em_curso','concluido')),
  fase_desde TIMESTAMPTZ DEFAULT now(),          -- para "tempo em fase" e sinalização de atraso
  prazo_fase_dias INTEGER,                        -- prazo esperado (Ficha C2)
  estado_documental TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_candidaturas_lead ON candidaturas(lead_id);
CREATE INDEX idx_candidaturas_fase ON candidaturas(fase);

-- mudancas_estagio (herdada) passa a registar mudanças de fase de candidatura:
-- reutiliza a tabela com lead_id + estagio_anterior/novo = valores de pipeline_fase.

-- ── Financeiro ──────────────────────────────────────────────────────────
CREATE TABLE financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES parceiros(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('honorario','comissao')),
  valor NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),   -- ISO 4217 livre
  taxa_cambio_aoa NUMERIC(14,4),        -- taxa do dia (editável)
  contravalor_aoa NUMERIC(16,2),        -- valor × taxa
  percentagem NUMERIC(5,2),             -- % da comissão (quando tipo='comissao')
  estado TEXT NOT NULL DEFAULT 'previsto'
     CHECK (estado IN ('previsto','facturado','recebido','anulado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_financeiro_candidatura ON financeiro(candidatura_id);
CREATE INDEX idx_financeiro_parceiro ON financeiro(parceiro_id);
CREATE INDEX idx_financeiro_currency ON financeiro(currency);

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_id UUID REFERENCES financeiro(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  numero TEXT,
  valor NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  vencimento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendente'
     CHECK (estado IN ('pendente','enviada','paga','vencida','cancelada')),
  lembrete_d5_enviado BOOLEAN DEFAULT false,   -- controlo do cron D-5
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_facturas_vencimento ON facturas(vencimento) WHERE estado IN ('pendente','enviada');
```

> **Nota RFV/80-20 (FR13, story 2.7):** não é tabela — é uma **view materializada** `v_rfv_leads` (recência = `last_contacto`/última candidatura; frequência = nº candidaturas; valor = soma `financeiro.contravalor_aoa`) + view `v_destinos_receita` para o 80/20. Refrescadas por cron diário. Sem colunas persistidas de RFV no `leads` (evita desnormalização).

### 2.6 Tabelas do módulo marketing (referenciadas por migração)

Criadas pelas migrações **do pacote** (001–008), aplicadas no Supabase dedicado. Nomes/colunas exactos — não repetir aqui, ver `marketing-module-package/01-database/migrations/`:

| Migração pacote | Tabelas / objectos |
|---|---|
| 001 | `email_config` (singleton), `email_templates`, `email_lists`, `email_subscribers`, `email_campaigns`, `email_campaign_leads`, `email_sends` (col. `html` = snapshot), `email_events` (idempotente), `email_automations` (`flow_json`), `email_automation_runs`; trigger `trg_email_automation_leads`; cron `email-automation-tick`; bucket `email-assets`; `ALTER leads ADD tags` |
| 002 | Simplificação RLS email (single-tenant `authenticated all`) |
| 003 | `email_*.created_by` → FK `team_members(id)` (⚠ **exige `team_members` criada antes** — bug conhecido nº4) |
| 004 | RPCs de audiência com `lead_ids[]`: `populate_email_campaign_leads`, `get_email_audience_count` |
| 005 | `email_campaigns.source_type` (one-shot vs automation-shell) |
| 006 | `ALTER campaigns ADD provider/cloud_template_id/cloud_template_params` — **⚠ NÃO cria `campaigns`** (ver C2, §10) |
| 007 | RPC `populate_campaign_leads` (WhatsApp) respeitando `lead_ids[]` |
| 008 | `whatsapp_cloud_templates` |

**⚠ Descoberta C2 (buraco no pacote):** as tabelas WhatsApp `campaigns`, `campaign_leads` e `campaign_instance_stats` **não são criadas por nenhuma das 8 migrações**. A 006 faz `ALTER TABLE campaigns` e a 007 assume-a como pré-requisito, mas o `CREATE TABLE` está ausente. O @dev **tem de escrever uma migração adicional** (ver plano §3, migração **`M_mkt_000_campaigns_base`**) antes da 006. Colunas mínimas extraídas do `campaign-processor` e `useCampaigns`:

```sql
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
     CHECK (status IN ('draft','scheduled','sending','paused','completed','failed','cancelled')),
  provider TEXT NOT NULL DEFAULT 'uazapi' CHECK (provider IN ('uazapi','cloud_api')),  -- (a 006 já garante via ALTER; manter idempotente)
  instance_ids UUID[] DEFAULT '{}',           -- instâncias uazapi usadas
  message_text TEXT, message_variations JSONB DEFAULT '[]',   -- variações round-robin
  hourly_limit_per_instance INTEGER DEFAULT 40,
  daily_limit_per_instance INTEGER DEFAULT 500,
  warmup_days INTEGER DEFAULT 5,
  audience_filters JSONB DEFAULT '{}',
  assignment_rule JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  total_leads INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0,
  created_by UUID,   -- (a 003 do pacote não toca campaigns; deixar sem FK ou → team_members)
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','delivered','failed','skipped')),
  instance_id UUID, sent_at TIMESTAMPTZ, error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (campaign_id, lead_id)
);

CREATE TABLE public.campaign_instance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  messages_sent_hour INTEGER DEFAULT 0, hour_reset_at TIMESTAMPTZ,
  messages_sent_day INTEGER DEFAULT 0, day_reset_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,          -- quando bloqueada
  warmup_day INTEGER DEFAULT 0,        -- 0–4 = dia 1–5
  blocks_detected_day INTEGER DEFAULT 0,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy','warming','cooldown','blocked')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (campaign_id, instance_id)
);
CREATE INDEX idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_stats_instance ON campaign_instance_stats(campaign_id, instance_id);
```
> Anti-block: **os limites em vigor são exclusivamente estes** (45–90s entre msgs, 40/h, 500/dia, warm-up 5 dias, cooldown). Não configurar segunda tabela de limites (o padrão Salus fica como referência histórica). Todas estas tabelas com RLS `authenticated` + endurecimento `requireAdmin` nas rotas service_role.

---

## 3. Plano de migrações numerado (com rollback)

Duas séries: a **série da base GM** (`0xx`) e a **série do módulo marketing** (`M_mkt_00x`, aplicada depois da base). Cada migração tem `-- ROLLBACK:` no rodapé. Regra: enums/FKs por escrito (§2) aprovados antes de correr a 010.

### Série base GM

| # | Ficheiro | Cria / faz | Rollback |
|---|---|---|---|
| 001 | `001_extensions.sql` | `pg_cron`, `pg_net`, `pgcrypto`, `pgvector` (herda ISILDA) | `DROP EXTENSION` |
| 002 | `002_clone_isilda_rename.sql` | Clone das tabelas base ISILDA (`profiles`, `clientes→leads`, `interacoes`, `mudancas_estagio`, `mensagens_whatsapp`, `integration_keys`) **com rename `clientes→leads` e `cliente_id→lead_id`**; remove referências "Isilda/Delicias"; remove `tenant_id` de `whatsapp_instances` | `DROP TABLE ...` |
| 003 | `003_team_members.sql` | `team_members` (papéis admin/operacao) + `requireAdmin` helper SQL. **Antes do módulo (bug nº4)** | `DROP TABLE team_members` |
| 004 | `004_ai_agent_schema.sql` | Schema do agente (herda 008 ISILDA): `ai_sales_agents`, `ai_agent_conversations`, `ai_agent_message_queue`, `ai_agent_logs`, `ai_agent_send_counts`, `ai_agent_scheduled_followups`, `ai_agent_cadence_enrollments`, `ai_agent_tools`, `user_availability` + RPCs de fila/lock | `DROP` em cascata |
| 005 | `005_webhook_idempotency.sql` | `webhook_processed_messages` (UNIQUE `whatsapp_message_id`) | `DROP TABLE` |
| 006 | `006_whatsapp_instances.sql` | `whatsapp_instances` (sem `tenant_id`); `templates_whatsapp`; `notificacoes` | `DROP` |
| 007 | `007_consentimentos.sql` | `consentimentos` (ISILDA 020, `lead_id`) | `DROP` |
| 008 | `008_catalogo.sql` | `parceiros`, `destinos`, `programas` + índices + RLS | `DROP` em cascata |
| 009 | `009_ficha_candidatura.sql` | `fichas_estudante`, `candidaturas` + índices + RLS | `DROP` |
| 010 | `010_leads_qualificacao.sql` | `ALTER leads ADD` (BANT, `sales_score`, `score_confidence`, `fit_score`, `temperature`, `destino`, `nivel`, `orcamento`, `pipeline_fase`, `followup_count`, `tags`, UTM) + trigger de cálculo de temperatura | `ALTER ... DROP COLUMN` |
| 011 | `011_financeiro.sql` | `financeiro`, `facturas` + índices + RLS | `DROP` |
| 012 | `012_rgpd_anonimizar.sql` | `anonimizar_lead()` adaptada (inclui `mensagens_whatsapp`, `email_sends`, `email_events`) | `DROP FUNCTION` |
| 013 | `013_views_rfv.sql` | `v_rfv_leads`, `v_destinos_receita` (materializadas) | `DROP VIEW` |
| 014 | `014_rls_endurecimento.sql` | RLS por papel (leitura `authenticated`, escrita/`DELETE` só admin); policies service_role | Recria RLS ISILDA |
| 015 | `015_seed_agent.sql` | Seed do agente "Assistente Global Minds" (prompt em camadas, settings, tools `qualify_lead`/`check_availability`/`schedule_consultation`/`criar_ficha_estudante`/`notificar_humano`) | `DELETE FROM ai_sales_agents` |
| 016 | `016_seed_catalogo.sql` | Seed dos parceiros enviados (Kaplan, INTO, MPW, Inspired, IH Cape Town, SAMIAD, U.Europeia/IADE/IPAM, GEA, Xior, EDU4WORD) + destinos top-6 | `DELETE` |
| 017 | `017_crons_base.sql` | Crons: `process-ai-agent-queue` (1min), `recover-stuck-queue` (3min), `followup-tick` (diário), `lembretes-tick` (diário), `compliance-2anos` (mensal), `refresh-rfv` (diário) | `cron.unschedule` |

### Série módulo marketing (aplicada após a base — story 5.1)

| # | Ficheiro | Nota |
|---|---|---|
| **M_mkt_000** | `M_mkt_000_campaigns_base.sql` | **⚠ NOVA — não vem no pacote (C2).** Cria `campaigns`, `campaign_leads`, `campaign_instance_stats` (ver §2.6). Corre **antes** da 006 do pacote |
| M_mkt_001 | pacote `001_email_marketing_base.sql` | Ajustar `net.http_post` URL → project ref da GM; trigger passa a observar `pipeline_fase` (ver §2.4) |
| M_mkt_002 | pacote `002_email_rls_simplify.sql` | Depois endurecida por 014 |
| M_mkt_003 | pacote `003_email_created_by_fk_team_members.sql` | `team_members` já existe (003 base) ✔ |
| M_mkt_004 | pacote `004_email_audience_lead_ids.sql` | RPC respeita `lead_ids[]` (bug nº1) |
| M_mkt_005 | pacote `005_email_campaigns_source_type.sql` | — |
| M_mkt_006 | pacote `006_campaigns_multi_provider.sql` | `ALTER campaigns` — corre depois de M_mkt_000 |
| M_mkt_007 | pacote `007_populate_campaign_leads_specific.sql` | RPC `populate_campaign_leads` respeita `lead_ids[]` |
| M_mkt_008 | pacote `008_whatsapp_cloud_templates.sql` | `whatsapp_cloud_templates` |

**Total: 17 migrações base + 9 do módulo (1 nova + 8 do pacote) = 26 migrações.**

> Todos os `net.http_post` do pacote têm `YOUR_SUPABASE_PROJECT_REF` — **find/replace pelo ref real da GM** antes de aplicar. Idem `email_config.app_url`.

---

## 4. Contratos das edge functions

**Auth:** funções internas (invocadas por cron/frontend autenticado) usam JWT normal. **Só os webhooks externos com validação de assinatura própria** são deployados com `--no-verify-jwt`: `uazapi-webhook-receiver` (valida `x-webhook-token`), `process-email-event` (valida Svix), e o receiver Meta (hub challenge). Deployar estes COM verify-jwt bloqueia os webhooks (lição documentada do pacote).

### 4.1 Edges da base (agente + WhatsApp atendimento)

| Edge | Trigger | Payload entrada | Efeitos | Saída | Auth |
|---|---|---|---|---|---|
| **uazapi-webhook-receiver** | Webhook uazapi (msg entrante) | JSON uazapi (`event`, `message.key.id`, `chatid`, texto/media) | Valida `x-webhook-token`; redact tokens nos logs; **opt-out "SAIR" antes do agente**; idempotência via `webhook_processed_messages`; grava `mensagens_whatsapp` (direction=incoming); `enqueue_message_for_ai_agent` (debounce 10s) | `200 {received:true}` sempre (degradação graciosa) | `--no-verify-jwt` + `x-webhook-token` |
| **gm-agent** | Cron `process-ai-agent-queue` (1min) → `action:process_queue`; + `test_prompt`/`test_message`/`ping` | `{action}` | `claim_queue_messages` (SKIP LOCKED); lock por lead; **escalação D5 pré-LLM**; monta prompt em camadas (§6); Haiku 4.5 classifica → Sonnet 4.5 responde; loop de tools (máx. 4); envia via uazapi (typing, split ≤300, delays); grava logs/tokens | `{ok, processed}` | JWT (service_role no cron) |
| **uazapi-send-message** | Frontend (inbox handoff, envio manual) | `{lead_id, message, media_url?}` | Valida JWT do utilizador; resolve telefone; envia via uazapi; grava `mensagens_whatsapp` (outgoing); pausa agente se `auto_pause_after_human_reply` | `{ok, message_id}` | JWT |
| **gm-lead-intelligence** | Invocada pelo `gm-agent` (tool `qualify_lead`) ou cron de re-score | `{lead_id, conversation_ctx}` | Haiku 4.5 extrai BANT; calcula `sales_score`/`score_confidence`/`fit_score`; deriva `temperature`; actualiza `leads`; se `≥70 & conf≠low` → `notificar_humano` | `{score, confidence, temperature}` | JWT |

### 4.2 Crons da base (via `pg_cron` + `net.http_post`)

| Cron | Frequência | Efeito |
|---|---|---|
| `process-ai-agent-queue` | 1 min | Invoca `gm-agent` action=process_queue |
| `recover-stuck-queue` | 3 min | `process_ai_agent_queue()` — destrava locks >3min |
| `followup-tick` | diário | Elegibilidade (fase não-terminal, IA activa, sem outbound 24h, sem opt-out) → cadência (§5); reactivação 90d |
| `lembretes-tick` | diário | Lembrete consulta 24h antes; ponto de situação por mudança de fase; factura D-5 (marca `lembrete_d5_enviado`) |
| `compliance-2anos` | mensal | Inactivos ≥24 meses **sem `processo_em_curso`** → `anonimizar_lead()`; log auditável; dry-run demonstrável |
| `refresh-rfv` | diário | `REFRESH MATERIALIZED VIEW v_rfv_leads, v_destinos_receita` |

### 4.3 Edges do módulo marketing (9 — deploy story 5.1)

| Edge | Trigger | Efeito principal | Auth |
|---|---|---|---|
| **send-email-campaign** | Frontend invoke / `email-automation-tick` | Lê `email_config` singleton (Resend key); resolve audiência (filtros OU `lead_ids[]` OU `email_campaign_leads`); por destinatário: `INSERT email_sends (pending)` → `POST resend/emails` → `UPDATE sent+resend_id`; respeita supressão | JWT |
| **process-email-event** | Webhook Resend (Svix) | Valida assinatura Svix com `email_config.resend_webhook_secret`; `UPDATE email_sends` (delivered/opened/clicked/bounced); espelha `email_campaign_leads`; incrementa counters; idempotente (`email_events` UNIQUE) | `--no-verify-jwt` + Svix |
| **email-automation-trigger** | `net.http_post` do trigger PG (`lead_created`/`lead_stage_changed`) | Identifica automações activas com `trigger_event` correspondente; `INSERT email_automation_runs (active)` | JWT |
| **email-automation-tick** | Cron 1 min | Runs `active AND scheduled_next_at<=now`; executa nó do `flow_json` (trigger/wait/sendEmail/sendWhatsapp/updateField/addTag/branch/end); avança `current_node_id` | JWT |
| **unsubscribe** | Link público no email | `?token=` → marca `email_subscribers.status='unsubscribed'` | público (token) |
| **campaign-processor** | Cron `campaign-scheduler` (2 min) | Lê `campaigns` sending; branch por `provider`; **uazapi**: checa limites/warmup/cooldown (`campaign_instance_stats`), envia batch=2, sleep 45–90s; **cloud_api**: template APPROVED, batch=50 → `send-whatsapp-cloud`; ao esgotar → completed | JWT |
| **send-whatsapp-cloud** | Invocada por `campaign-processor` | `POST graph.facebook.com/{phone_id}/messages`; `INSERT whatsapp_messages`; `UPDATE campaign_leads=sent` | JWT |
| **create-whatsapp-template** | Frontend | Valida regras Meta; `POST {waba_id}/message_templates`; `INSERT whatsapp_cloud_templates (PENDING)` | JWT |
| **sync-whatsapp-templates** | Frontend / cron | `GET {waba_id}/message_templates`; `UPSERT` estados (PENDING→APPROVED/REJECTED) | JWT |

### 4.4 Crons do módulo

| Cron | Frequência | Efeito |
|---|---|---|
| `email-automation-tick` | 1 min | Invoca edge homónima |
| `campaign-scheduler` | 2 min | Identifica `campaigns` sending → invoca `campaign-processor` |

**Total de edge functions: 4 base + 9 módulo = 13 edge functions.**

---

## 5. Fluxos de sequência

### 5.1 Mensagem entrante → resposta

```
Lead WhatsApp → uazapi → uazapi-webhook-receiver
  ├─ valida x-webhook-token (senão 401)
  ├─ event ≠ mensagem → 200 ignorado
  ├─ fromMe / owner → 200 skip
  ├─ INSERT webhook_processed_messages(whatsapp_message_id)
  │     └─ 23505 (duplicado) → 200 skip
  ├─ opt-out: texto == "SAIR" → pausa conversa (pause_reason=opt_out),
  │     despedida fixa, regista consentimento revogado → 200
  ├─ ensureLead + ensureConversation
  ├─ INSERT mensagens_whatsapp (incoming)
  └─ enqueue_message_for_ai_agent (debounce 10s; cancela pending anterior)
        → 200 {queued:true}

cron 1min → gm-agent(process_queue)
  ├─ claim_queue_messages (FOR UPDATE SKIP LOCKED, scheduled_for<=now)
  ├─ try_acquire_agent_lock(lead) (auto-destrava >3min)
  ├─ ESCALAÇÃO D5 (pré-LLM) → se dispara: transfere, notifica, sai
  ├─ buildHistory (sanitizeForContext, limit 250)
  ├─ prompt em camadas (§6) + data/hora TZ no topo
  ├─ Haiku 4.5 classifica intenção/score → gm-lead-intelligence
  ├─ Sonnet 4.5 responde (loop tools máx.4)
  ├─ split ≤300, typing, delays 1500–4000ms → uazapi send
  ├─ INSERT mensagens_whatsapp (outgoing) + ai_agent_logs (tokens)
  └─ release_agent_lock
```

### 5.2 Escalação D5

```
gm-agent, ANTES do LLM, avalia (determinístico):
  hard: "falar com humano"/"pessoa"  → human_request
        urgência/problema grave       → urgent
        custos/pagamentos/valores/negociação (D5) → escalation_d5
        pergunta sem match na base    → no_answer
  → se algum: UPDATE conversa status='transferred', pause_reason
     notificar_humano (WhatsApp ao Rinaldo/Ana + resumo + link CRM)
     NÃO chama o LLM. Resposta ao lead: "vou passar a um consultor"
  soft: N mensagens sem avanço de fase (desde último avanço) → sugere handoff
```

### 5.3 Agendamento com FreeBusy

```
Lead qualificado pede consulta → Sonnet chama tool check_availability
  → gm-agent: Google Calendar FreeBusy (janelas fixas acordadas + buffer + TZ)
  → devolve 2-3 slots livres
Lead escolhe → tool schedule_consultation
  → cria evento no Google Calendar do Rinaldo
  → INSERT candidaturas.fase='consulta_agendada' + registo consulta
  → confirma na conversa; cron lembretes agenda D-1
⚠ DECISÃO PENDENTE: janelas/dias/horas/buffer/fuso — questão 4 de 14/07 (dono: Rinaldo).
   Até fixar, a tool usa placeholder configurável em ai_sales_agents.settings.consulta_windows.
```

### 5.4 Campanha WhatsApp (2 providers)

```
Wizard 7 passos → dry-run por defeito → confirmação → status=sending
cron campaign-scheduler(2min) → campaign-processor
  provider=uazapi: limites 45–90s/40h/500dia, warmup 5d, cooldown por instância
                   (campaign_instance_stats); batch=2
  provider=cloud_api: template APPROVED (bloqueado se PENDING); batch=50;
                      custo estimado mostrado antes (NFR8); Meta gere rate-limit
respostas entram no fluxo do agente (§5.1) com atribuição configurada
```

### 5.5 Automação de email

```
INSERT/UPDATE leads → trigger PG dispatch_email_automation_event
  → net.http_post email-automation-trigger → INSERT email_automation_runs(active)
cron email-automation-tick(1min) → executa nó do flow_json:
  trigger→próximo | wait→scheduled_next_at | sendEmail→send-email-campaign(single)
  sendWhatsapp→uazapi | updateField→UPDATE lead | addTag | branch | end→completed
```

### 5.6 Cron de compliance 2 anos

```
mensal compliance-2anos:
  SELECT leads sem actividade ≥24 meses
    AND NOT EXISTS ficha com processo_em_curso=true
  → dry-run: conta e regista (demonstrável ao cliente)
  → anonimizar_lead(id): anonimiza leads + mensagens_whatsapp
       + email_sends/email_events (compliance §5) + apaga fichas/dados pessoais
  → log auditável (quantos, quando)
⚠ DECISÃO PENDENTE: definição de "inactivo" (última msg? último pagamento? fim do curso?)
   — questão 2 de 14/07 (dono: Rinaldo + acordo de compliance). Default provisório:
   última interacção (mensagem OU mudança de fase) há ≥24 meses.
```

---

## 6. Arquitectura do prompt do agente

Prompt em camadas montadas nesta ordem (padrão Salus adaptado). **Descoberta C3:** a Salus injecta as camadas de voz/guards, mas **NÃO injecta data/hora com timezone nem a regra "nunca se identificar como IA"** — essas vêm do padrão SIC-MD (regra de ouro) e das regras validadas da GM. São **camadas novas** neste agente.

```
┌─ [L0] DATA/HORA + TIMEZONE (NOVO — regra de ouro SIC-MD, ausente na Salus)
│   "Hoje é {data} {hora} (Africa/Luanda, UTC+1). IGNORA quaisquer datas do
│    histórico. Nunca agendes no passado."
├─ [L1] IDENTIDADE GM (Voice of Brand — editável na BD, ai_sales_agents.system_prompt)
│   "És a Assistente da Global Minds, consultoria de educação internacional
│    (Luanda, desde 2013). Persona institucional, formal e calorosa. Voz feminina."
│   Saudação oficial obrigatória: "Global Minds, muito bom dia/boa tarde/boa noite,
│    em que podemos ser-lhe útil?"
├─ [L2] CONTEXTO DO LEAD (injectado por conversa)
│   nome, idioma detectado (pt/en), fase do pipeline, BANT conhecido, destino,
│    memória (se conhecido não repete perguntas), ficha em curso.
├─ [L3] OVERLAY POR FASE (target_stages)
│   lead→qualificar (1 pergunta de cada vez) · qualificado→ficha/consulta ·
│    em_curso→ponto de situação. Muda o objectivo da conversa.
├─ [L4] REGRA DE FAIXAS (compliance de preços)
│   "Educa com FAIXAS de investimento e custo de vida (tabelas da base). NUNCA dás
│    cotação exacta — cotação só na proposta por email, após consulta. Nunca inventas valores."
├─ [L5] HUMANIZATION_GUARD (Salus)
│   "Sem travessões (—) — são assinatura de IA. Máx. 1 emoji. Respostas curtas,
│    1–3 balões ≤300 chars. Tom natural."
├─ [L6] BREVITY_GUARD (Salus): 1 pergunta de cada vez; sem parágrafos longos.
├─ [L7] COMPLIANCE_GUARD (frases proibidas — checkGuardrails pós-geração)
│   NUNCA: "admissão garantida", "garantimos entrada", promessas de resultado.
│   NUNCA se identifica como IA/bot/assistente virtual automático (NOVO — regra GM).
│   "Você" para encarregados, "tu" para estudante jovem.
└─ [L8] SAFETY: sanitizeForContext (injecção), detectJailbreak, stripInternalThinking.
```

Regras validadas do fluxo (doc 03/07) verificadas uma a uma: saudação oficial ✔, regra de faixas ✔, D5 (escalação pré-LLM) ✔, você/tu ✔, nunca IA ✔, nunca admissão garantida ✔, data/hora+TZ no topo ✔, 1 pergunta de cada vez ✔, máx 1 emoji ✔.

**Guardrails pós-geração** (`checkGuardrails` do `_shared/llm-client.ts`): se a resposta contém frase proibida → **regenera** indicando o termo violado (padrão Salus: regeneração, não bloqueio seco). Se tool sem texto → resposta de continuidade (nunca fallback técnico).

**Tools do agente** (Anthropic tool-use, loop máx. 4 iterações):
`qualify_lead` · `check_availability` · `schedule_consultation` · `criar_ficha_estudante` · `notificar_humano`.

---

## 7. Port do módulo marketing Vite→Next.js

O pacote é React 18 + Vite + react-router. A base GM é Next.js 16 App Router + React 19. Plano concreto (2–3 dias, story 5.1/5.2):

### 7.1 Mapa de rotas react-router → App Router

| Pacote (react-router) | Next.js App Router (client components) |
|---|---|
| `/marketing` | `app/(app)/marketing/page.tsx` |
| `/marketing/campanhas` | `app/(app)/marketing/campanhas/page.tsx` |
| `/marketing/campanhas/nova` | `app/(app)/marketing/campanhas/nova/page.tsx` |
| `/marketing/campanhas/:id` | `app/(app)/marketing/campanhas/[id]/page.tsx` |
| `/marketing/templates/:id` | `app/(app)/marketing/templates/[id]/page.tsx` |
| `/marketing/automacoes/:id` | `app/(app)/marketing/automacoes/[id]/page.tsx` |
| `/marketing/whatsapp-templates/novo` | `app/(app)/marketing/whatsapp-templates/novo/page.tsx` |
| `/comercial/campanhas/*` | `app/(app)/marketing/campanhas-whatsapp/*` (harmonizar com sidebar GM) |
| `/unsubscribe` (público) | `app/unsubscribe/page.tsx` (fora do grupo autenticado) |

### 7.2 Substituições mecânicas (find/replace)

| Vite/react-router | Next.js 16 |
|---|---|
| `useNavigate()` → `nav('/x')` | `useRouter()` de `next/navigation` → `router.push('/x')` |
| `useParams()` | `useParams()` de `next/navigation` |
| `useSearchParams` (react-router) | `useSearchParams` de `next/navigation` |
| `import.meta.env.VITE_SUPABASE_URL` | `process.env.NEXT_PUBLIC_SUPABASE_URL` |
| `<Link to>` (react-router) | `<Link href>` de `next/link` |
| Topo de cada página com hooks/estado | `"use client"` directive |
| `ProtectedRoute` wrapper | Middleware Next + layout do grupo `(app)` com guard @supabase/ssr |

### 7.3 Maily / `@maily-to/render` no Next

- Instalar `@maily-to/core@^0.3.7`, `@maily-to/render@^0.2.3`, `@xyflow/react@^12.10.2`.
- **Risco chave:** `@maily-to/render` importa `react-dom/server.browser`. O fix Vite (`optimizeDeps`) **não se aplica** no Next — o Next resolve de outra forma. Onde é preciso renderizar HTML no cliente, isolar num client component com `dynamic(() => import(...), { ssr: false })` para evitar SSR mismatch com React 19. **Testar o preview do template CEDO** (story 5.2 AC2 — antes do resto do port).
- Bug conhecido do pacote: prop `variables` no Maily Editor é ignorada → configurar via `VariableExtension.configure`. TipTap não reage a `contentJson` pós-mount → esperar a query terminar antes de montar o editor.

### 7.4 CSS Maily + Tailwind v4

A base já é Tailwind v4 → o CSS do Maily carrega **sem workaround** (o conflito previsto era com v3). Sem `optimizeDeps`. Importar o CSS do Maily no layout do grupo marketing.

### 7.5 Riscos React 19

- `@maily-to` e `@xyflow/react` validados com React 19 no smoke do preview (cedo).
- Componentes do pacote que usam `defaultProps` em function components → React 19 avisa; migrar para default params se surgir.
- `useEffect` de fetch dupla em StrictMode dev — não afecta produção.

---

## 8. Segurança

### 8.1 RLS por papel (exemplo)

Padrão: leitura a `authenticated`, escrita/`DELETE` só a admin, `service_role` total. Endurece o `authenticated all` do pacote onde há dados sensíveis.

```sql
-- Leitura autenticada, DELETE só admin (via team_members)
CREATE POLICY leads_read ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY leads_write ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY leads_delete ON leads FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid()
                 AND role = 'admin' AND is_active));
CREATE POLICY leads_service ON leads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Financeiro: leitura/escrita só admin (dado sensível)
CREATE POLICY financeiro_admin ON financeiro FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid()
                 AND role = 'admin' AND is_active));
```

### 8.2 `requireAdmin`

Guard aplicado nas rotas/route-handlers Next que usam `service_role` (importação de Excels, exportação de dados, config de agente, criação de campanhas, templates Meta). Verifica `team_members.role='admin'` a partir da sessão @supabase/ssr antes de qualquer operação privilegiada. Rotas de negócio bloqueadas a anónimos por middleware.

### 8.3 Secrets

- **`integration_keys`** (tabela, com fallback env) para chaves operacionais lidas pelas edges: uazapi base_url/token, anthropic api_key, google calendar, meta waba.
- **`email_config`** singleton para Resend (api_key, webhook_secret) — story 5.1.
- **Supabase secrets/env** para `SERVICE_ROLE_KEY`, refs. Nunca no frontend.

### 8.4 Headers Vercel (`vercel.json` — padrão SIC-MD)

CSP, `HSTS` (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.

### 8.5 Redacção de logs & rate_limits

- Logs estruturados JSON `{fn, step, leadId}`; tokens/chaves **redigidos** (padrão receiver ISILDA: `JSON.stringify` com replacer que mascara `token`/`key`/`authorization`).
- Rate limits do agente em BD (`ai_agent_send_counts` + settings), **sem Redis** (herança SIC-MD/ISILDA): 60 msgs/conversa, 50/h, 60/dia. Anti-block de campanhas em `campaign_instance_stats`.
- Webhooks: `x-webhook-token` (uazapi), Svix (Resend), hub challenge (Meta). NFR6.

---

## 9. Estrutura do repositório

Monorepo `SIC-Global-Minds` (clone adaptado da ISILDA):

```
SIC-Global-Minds/
├─ app/
│  ├─ (app)/                     # grupo autenticado (middleware guard)
│  │  ├─ dashboard/  kanban/  inbox/  leads/[id]/
│  │  ├─ catalogo/  financeiro/  configuracoes/
│  │  └─ marketing/              # PORTADO do módulo (§7)
│  │     ├─ campanhas/  templates/  automacoes/  whatsapp-templates/  campanhas-whatsapp/
│  ├─ unsubscribe/               # público (LGPD)
│  ├─ health/                    # health-check 200
│  └─ api/                       # route handlers com requireAdmin
├─ components/                   # ui base ISILDA + componentes do módulo portados
├─ lib/  hooks/                  # @supabase/ssr, hooks do módulo (sem tenantId)
├─ supabase/
│  ├─ migrations/                # 001–017 base + M_mkt_000–008
│  ├─ functions/
│  │  ├─ _shared/                # llm-client, cors, get-integration-key
│  │  ├─ gm-agent/  uazapi-webhook-receiver/  uazapi-send-message/  gm-lead-intelligence/
│  │  └─ (9 do módulo marketing)
│  └─ seeds/
├─ tests/                        # node:test: safety, go-live-readiness, production-smoke, mappers
├─ marketing-module-package/     # pacote fonte (referência; não deployado directo)
├─ docs/                         # prd, brief, architecture, guides, stories
├─ vercel.json  .env.example
```

**Convenções:** migrações numeradas com rollback + comentário do porquê; ficheiros kebab-case; edges focadas (1 responsabilidade); commits convencionais; identificadores técnicos em inglês, conteúdo em pt-AO pré-Acordo.

---

## 10. Mapeamento épicos → componentes e riscos técnicos

### 10.1 Épicos → componentes da arquitectura

| Épico | Constrói |
|---|---|
| **E1 Fundação** | Migrações 001–007 + 014 (RLS); `team_members`; deploy Vercel; health-check; `vercel.json` headers; `integration_keys` |
| **E2 CRM Nuclear** | Migrações 008–013, 015–016; §2 modelo de dados completo; catálogo; kanban (candidaturas); ficha 360º; importação Excels (`normalizeAngolaPhone`); financeiro; views RFV |
| **E3 Agente IA** | Edges `uazapi-webhook-receiver`, `gm-agent`, `uazapi-send-message`, `gm-lead-intelligence`; prompt em camadas §6; fila/idempotência; escalação D5; inbox; tools; agendamento FreeBusy |
| **E4 Follow-up/Compliance/Dashboard** | Crons `followup-tick`, `lembretes-tick`, `compliance-2anos`, `refresh-rfv`; `anonimizar_lead()`; consentimentos; exportação; dashboard |
| **E5 Marketing (M5)** | Série `M_mkt_*` (incl. **M_mkt_000 nova**); port §7; 9 edges + 2 crons; Resend/Maily; campanhas 2 providers; automações React Flow |
| **E6 Go-live** | Suites node:test; smoke SIC 4 passos + smoke módulo; formação; NDA; acta |

### 10.2 Riscos técnicos com mitigação

| Risco | Mitigação |
|---|---|
| **C2 — tabelas `campaigns*` ausentes no pacote** | Migração **M_mkt_000** escrita pelo @dev antes da 006 (§2.6) — bloqueia E5 se esquecida |
| Rename `clientes→leads` quebra FKs herdadas | Migração 002 dedicada, atómica, com rollback; testar clone antes de qualquer tabela nova |
| `pipeline_stage_id` (módulo) vs `pipeline_fase` (GM) | Adaptar trigger do módulo para observar `pipeline_fase` (§2.4) |
| Preview Maily / `react-dom/server.browser` no Next 16 + React 19 | Testar cedo (story 5.2 AC2); `dynamic ssr:false`; isolar em client component |
| RPC `populate_*_leads` ignora `lead_ids[]` (bug nº1) | Migrações 004/007 do pacote já corrigem; smoke das 5 camadas (guia 04) obrigatório |
| Agendar no passado / fuso do Rinaldo em viagem | Data/hora+TZ no topo do prompt (L0); FreeBusy + janelas fixas + buffer |
| Ban do número WhatsApp | Anti-block único (`campaign_instance_stats`); frio pelo canal Meta oficial; instância de campanhas separada |
| Entregabilidade email (domínio novo) | SPF/DKIM cedo (pendência 8); aquecer volumes; supressão desde 1º envio |

---

## 11. ADRs (curtos)

**ADR-01 — Supabase dedicado single-tenant sem `tenant_id`.**
*Decisão:* projecto Supabase próprio da GM, sem `tenant_id`. *Porquê:* compliance internacional exige base privada, exportável, propriedade do cliente; lição Ketson/Natacha (tenants sobrescritos). *Rejeitado:* backend partilhado "SIC Geral" — risco de compliance inaceitável.

**ADR-02 — Sem n8n/Make; automação em pg_cron + edge functions.**
*Decisão:* toda a automação em `pg_cron` + edges + RPCs. *Porquê:* nenhum SIC em produção usa n8n; menos peças, menos falhas; padrão da casa. *Rejeitado:* n8n do plano v2 — dependência externa e ponto de falha extra.

**ADR-03 — Dois providers WhatsApp (uazapi + Meta Cloud API).**
*Decisão:* uazapi para atendimento e follow-up (janela aberta); Meta Cloud API para campanhas frias (templates aprovados). Branch por `campaigns.provider`. *Porquê:* frio pela Meta = risco de ban zero; quente pela uazapi = texto livre. *Rejeitado:* só uazapi — risco de ban do número único do negócio.

**ADR-04 — Resend + Maily para email.**
*Decisão:* Resend (envio + webhook Svix) com domínio verificado da GM + editor Maily. *Porquê:* vem de série no módulo; tracking incluído; substitui SMTP genérico. *Rejeitado:* SMTP genérico — sem tracking nem supressão nativa.

**ADR-05 — Portar o módulo marketing (não reescrever).**
*Decisão:* portar as ~13 páginas Vite→Next como client components; backend pluga directo. *Porquê:* ~40 componentes + 9 edges + 8 migrações prontos e testados; reescrever custaria semanas e o prazo é 30 dias. *Rejeitado:* reescrever de raiz — inviável no prazo.

**ADR-06 — Testes com node:test nativo.**
*Decisão:* `node:test` (safety, go-live-readiness, production-smoke, mappers) + smokes manuais guiados. *Porquê:* padrão ISILDA; zero dependências extra; prazo não comporta pirâmide E2E completa. *Rejeitado:* Jest/Vitest + E2E Playwright — overhead sem retorno no prazo.

---

## Decisões que exigem validação humana (14/07)

| # | Item | Dono | Bloqueia |
|---|---|---|---|
| PENDENTE-1 | Definição de "inactivo" (2 anos) | Rinaldo + compliance | cron `compliance-2anos` (§5.6) |
| PENDENTE-2 | Cadência de follow-up (1×/sem vs 21d/7 toques) | Rinaldo | `followup-tick` |
| PENDENTE-3 | Janelas de agenda do Rinaldo (dias/horas/buffer/fuso) | Rinaldo | `schedule_consultation` (§5.3) |
| PENDENTE-4 | Métricas prioritárias do dashboard | Rinaldo | E4.6 |
| PENDENTE-5 | Titularidade das contas / custos pós-suporte | Nelson + Rinaldo | go-live |
| PENDENTE-6 | Segundo número WhatsApp para campanhas | Rinaldo | E5.3 (instância separada) |
| PENDENTE-7 | Domínio verificado no Resend (SPF/DKIM) | Belmiro + GM DNS | 1ª campanha email |
| PENDENTE-8 | NDA assinado | MD (Inês) | go-live (E6.3) |

---

*Marca Digital · Consultoria AI First · Luanda, Angola*
*Arquitectura SIC Global Minds v1.0 — 10/07/2026 · Aria (@architect) · Confidencial*
