# Arquitectura Técnica — SIC Porcelana Beauty

**CRM Inteligente para Centro de Estética · Brownfield sobre base ISILDA**

| Campo | Detalhe |
|---|---|
| **Produto** | SIC — Sistema de Inteligência Comercial (Porcelana Beauty) |
| **Versão** | 1.0 |
| **Data** | 9 de Junho de 2026 |
| **Autor** | Aria (Architect Agent) — Marca Digital |
| **PRD-fonte** | `docs/prd/prd-sic-porcelana-beauty.md` (v1.1, validado @po) |
| **Base técnica** | ISILDA — `/Users/admin/PROJECTOS/ISILDA` |
| **Estado** | Draft — para @sm (stories) |

---

## 1. Visão Geral

### 1.1 Princípio arquitectural

**Preservar o que funciona, adaptar o domínio, construir só o que é genuinamente novo.** A ISILDA é um CRM inteligente maduro em produção; o SIC Porcelana Beauty é um **fork dedicado** que herda ~80% das capacidades e adapta o domínio de "confeitaria→pedidos" para "estética→agendamentos".

### 1.2 Diagrama de alto nível

```
            ┌──────────────────────────────────┐
            │   CLIENTE (WhatsApp/IG/FB)        │
            │   texto · foto da pele · áudio    │
            └──────────────┬───────────────────┘
                           │
            ┌──────────────▼───────────────────┐
            │   UAZAPI (gateway WhatsApp)       │
            │   webhook → messages.upsert       │
            └──────────────┬───────────────────┘
                           │
┌───────────────────────────▼──────────────────────────────┐
│                  VERCEL (Next.js 16)                      │
│  /api/webhooks/uazapi (proxy fire-and-forget)            │
│  Frontend: Inbox · Agenda · Calendário · Clientes ·      │
│            Pacotes · Dashboard · Serviços · Equipa        │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│              SUPABASE (instância dedicada PB)             │
│  PostgreSQL + pgvector + pg_cron + RLS + Storage         │
│  Realtime (inbox/agenda live)                            │
│  Edge Functions (Deno):                                  │
│   · porcelana-agent (atendimento/qualificação/agenda)    │
│   · process-vision (foto pele → procedimento provável)   │
│   · recompra-cron (recorrência/pacotes)                  │
│   · lembrete-cron (NOVO — lembrete 24h anti no-show)     │
└───────────────────────────┬──────────────────────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       │                                          │
┌──────▼──────┐                        ┌──────────▼────────┐
│ Anthropic   │                        │ Supabase Storage  │
│ Haiku/Sonnet│                        │ fotos · comprov.  │
└─────────────┘                        └───────────────────┘
```

### 1.3 Stack (herdada da ISILDA, sem alterações — CR1)

Next.js 16 · React 19 · Tailwind v4 · Supabase (PostgreSQL + pgvector + pg_cron + RLS + Storage + Realtime) · Edge Functions (Deno) · Anthropic (Haiku classificação / Sonnet conversa) · uazapi · Vercel · recharts · dnd-kit.

---

## 2. Decisões de Arquitectura (resumo dos ADRs)

| ADR | Decisão | Estado |
|---|---|---|
| **ADR-001** | Fork dedicado (single-tenant) vs. multi-tenancy | Aceite |
| **ADR-002** | Schema de Pacotes/Subscrição (módulo novo) | Aceite |
| **ADR-003** | Agendamento multi-recurso (técnica × sala × tempo) | Aceite — faseado |
| **ADR-004** | Estratégia de import dos ~398 clientes | Aceite |
| **ADR-005** | Tools novas do agente + funil 2-portas | Aceite |

Detalhes em `docs/architecture/adr/`.

**Padrões incorporados do CRM-Agêntico Salus** (v1.2) — ver `docs/architecture/analise-crm-salus-aproveitamento.md`:
escalação determinística (FR26, ADR-005), roleplay/treino (FR27, Epic 8), inteligência estruturada `generateObject`+Zod (FR22b, ADR-005), opt-out de conformidade (FR28, ADR-004), extracção de data/hora + Google Calendar opcional (ADR-003), Kanban "agente por coluna" (frontend, opcional). **Não adoptado:** migração para Vercel Workflow SDK e pipeline de enriquecimento de leads (fora de âmbito / anti-KISS).

---

## 3. Modelo de Dados

### 3.1 Tabelas REUSADAS da ISILDA (sem alteração ou mínima)

`profiles`, `clientes`, `interacoes`, `mudancas_estagio`, `notificacoes`, `mensagens_whatsapp`, `whatsapp_instances`, `integration_keys`, `webhook_idempotency`, `consentimentos`, `ai_sales_agents`, `ai_agent_conversations`, `ai_agent_message_queue`, `ai_agent_logs`, `ai_agent_send_counts`, `ai_agent_scheduled_followups`, `ai_agent_cadence_enrollments`, `ai_agent_tools`, `user_availability`, `pagamentos`, `ocasioes_cliente`.

### 3.2 Tabelas ADAPTADAS (domínio confeitaria→estética)

| ISILDA | Porcelana Beauty | Mudanças-chave |
|---|---|---|
| `produtos_catalogo` | `servicos_catalogo` | Categorias estética; `duracao_minutos`; `requer_avaliacao_previa`; `sob_consulta` |
| `pedidos` | `agendamentos` | Campos de tratamento (serviço/técnica/sala/duração); estados de estética |
| `calendario_producao` | `calendario_agenda` | Slots por técnica×sala (ver ADR-003) |
| `checklist` | `checklist` (protocolo) | De produção de bolo → preparação de sala/protocolo |

### 3.3 Tabelas NOVAS

- `salas` — recursos físicos (ADR-003)
- `agendamentos` — substitui pedidos (ADR-003)
- `pacotes` — definição de planos (ADR-002)
- `subscricoes` — cliente↔pacote activo (ADR-002)
- `sessoes` — saldo/consumo de sessões (ADR-002)

### 3.4 Convenções (CR3 — preservadas da ISILDA)

- Nomes em **pt-AO** (sem acentos em identificadores SQL: `servicos_catalogo`, `agendamentos`).
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- `created_at` / `updated_at TIMESTAMPTZ DEFAULT NOW()` + trigger `handle_updated_at()`.
- RLS: `authenticated` (admin/assistente) `USING(true)`; `service_role` ALL.
- Realtime adicionado às tabelas operacionais (`agendamentos`, `subscricoes`).
- Triggers de mudança de estado escrevem em `mudancas_estagio` (padrão `registar_mudanca_estado_*`).

---

## 4. Schema dos Módulos Novos (DDL canónico)

> O DDL detalhado e justificado vive nos ADRs. Síntese abaixo.

### 4.1 Serviços (adaptação de catálogo)

```sql
CREATE TABLE public.servicos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN
    ('facial','corporal','laser','cera','sobrancelhas','home_care','avaliacao','outro')),
  tags TEXT[] DEFAULT '{}',
  fotos TEXT[] DEFAULT '{}',
  foto_principal TEXT,
  preco_base NUMERIC(12,2),
  precos_por_zona JSONB DEFAULT '{}',     -- {"axilas": 15000, "pernas": 45000}
  sob_consulta BOOLEAN DEFAULT FALSE,      -- alinha com "nunca abrir preço"
  duracao_minutos INTEGER DEFAULT 60,
  tempo_preparo_sala_minutos INTEGER DEFAULT 15,
  requer_avaliacao_previa BOOLEAN DEFAULT FALSE,
  sessoes_recomendadas INTEGER DEFAULT 1,  -- ex.: laser 6-8
  activo BOOLEAN DEFAULT TRUE NOT NULL
);
```

### 4.2 Salas + Agendamentos + Calendário → ver **ADR-003**
### 4.3 Pacotes + Subscrições + Sessões → ver **ADR-002**

---

## 5. Camada de Aplicação (Edge Functions)

| Função | Origem | Mudança |
|---|---|---|
| `porcelana-agent` | fork de `isilda-agent` | Novo system_prompt + tools de estética |
| `process-vision` | reuso | Prompt: pele/zona → procedimento provável (não preço) |
| `recompra-cron` | reuso | Cadences de pacote/upsell |
| `lembrete-cron` | **NOVO** | Lembrete 24h + reagendamento (anti no-show) |

### 5.1 Tools do agente (formato Anthropic) — ver **ADR-005**

Substituem as tools de bolo. Núcleo: `qualificar_lead`, `consultar_disponibilidade`, `agendar_tratamento`, `propor_avaliacao`, `reagendar`, `encaminhar_humano`, `consultar_pacote`.

---

## 6. Frontend (App Router — reuso de shell)

| Rota ISILDA | Rota PB | Mudança |
|---|---|---|
| `/inbox` | `/inbox` | Reuso |
| `/pedidos` | `/agenda` | Kanban de agendamentos (estados estética) |
| `/calendario` | `/calendario` | Vista por técnica/sala |
| `/clientes` | `/clientes` | Reuso + segmentação |
| `/catalogo` | `/servicos` | Catálogo de serviços |
| `/ai-agent` | `/ai-agent` | Consola do agente |
| `/dashboard` | `/dashboard` | KPIs estética + 80/20 + adopção (NFR9) |
| — | `/pacotes` | **NOVO** — gestão de pacotes/subscrições |
| `/equipa` | `/equipa` | Técnicas + disponibilidade |
| `/configuracoes` | `/configuracoes` | Reuso |

---

## 7. Segurança e Conformidade

- **NFR5/NFR6:** instância isolada (Supabase + Vercel + WhatsApp próprios). Dados de estética são sensíveis → `consentimentos` + `rgpd_anonymize` reusados.
- **NFR3:** `webhook_idempotency` evita reprocessamento.
- **NFR4/NFR7:** rate-limiting por conversa + Haiku/Sonnet por tarefa (custo controlado).
- **RLS:** mantém o modelo da ISILDA. Migração futura para RLS por-utilizador é possível mas fora de âmbito (ver ADR-001).

---

## 8. Estratégia de Migração e Sequência Técnica

Alinha com os 7 epics do PRD:

| Epic | Trabalho técnico | Risco |
|---|---|---|
| 1 Fundação | Fork repo + provisionar Supabase/Vercel/uazapi + migrar tabelas reusadas + import 398 (ADR-004) | 🔴 import |
| 2 Agente | `porcelana-agent` + system_prompt + tools (ADR-005) + vision | 🟠 |
| 3 Agendamento | `servicos_catalogo` + `salas` + `agendamentos` + `calendario_agenda` (ADR-003) + `lembrete-cron` | 🟠 multi-recurso |
| 4 Pagamentos | reuso `pagamentos` + fluxo 50/50 | 🟢 |
| 5 Pacotes | `pacotes`+`subscricoes`+`sessoes` (ADR-002) + cadences | 🟠 novo |
| 6 Fidelização | Agente 2/3 + `ocasioes_cliente` + segmentação | 🟢 |
| 7 Dashboard | KPIs + 80/20 + adopção | 🟢 |

**MVP go-live (Junho):** Epics 1+2+3 + pré-pagamento básico.

---

## 9. Handoff para @sm

O @sm deve criar stories por epic, respeitando as dependências. Cada módulo novo já tem ADR com DDL e racional. As tabelas reusadas só precisam de migração (copiar + ajustar seeds), não de design novo.

**Pré-requisito crítico antes do Epic 1:** mapeamento de campos dos 398 clientes (ADR-004) — depende do cliente.

---

*Arquitectura por Aria (Architect Agent) — Marca Digital · 9 de Junho de 2026*
