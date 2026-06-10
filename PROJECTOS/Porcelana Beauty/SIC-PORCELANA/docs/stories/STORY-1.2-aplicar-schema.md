---
story_id: "1.2"
title: "Aplicar migrações do schema porcelana (000-002)"
epic: "E1 — Fundação e Migração"
status: "Done"
executor: "@db-sage"
quality_gate: "@qa"
deploy_type: "supabase_migration"
accountable: "nelson-rodrigues"
depends_on: ["1.1"]
priority: "P0"
estimate: "0.5d"
prd_refs: ["ADR-001v2", "ADR-002", "ADR-003", "ADR-005", "rls-audit-porcelana"]
---

# Story 1.2 — Aplicar migrações do schema `porcelana` (000-002)

**Epic:** E1 — Fundação e Migração
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Executor:** @db-sage | **Quality Gate:** @qa | **Deploy:** supabase_migration
**Status:** ✅ Done (10 Jun 2026)
**Depende de:** Story 1.1 (✅ Done — tenant `porcelana` registado, tenant_id `d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1`)

---

## Descrição

Como @db-sage, quero aplicar as 3 migrações já validadas (`000_schema_porcelana`, `001_canonical_core`, `002_esthetics_extension`) ao SIC GERAL, para criar o schema físico `porcelana` com as 14 tabelas, ENUMs, funções, view e RLS — habilitando o armazenamento de dados de negócio isolados.

**Contexto:** o tenant já está registado (Story 1.1). Agora falta o schema físico sobre o qual `porcelana.is_member()` opera. Sem isto, não há onde guardar contactos/agendamentos/pacotes. As migrações foram validadas em Postgres efémero (parse-check + smoke-tests) e auditadas em RLS (9 testes adversariais PASS).

## Critérios de Aceitação

- [x] **Snapshot lógico antes** (BD partilhada com 6 tenants activos — agora inclui porcelana)
- [x] `000_schema_porcelana.sql` aplicada → `CREATE SCHEMA porcelana` + 9 ENUMs (channel_type, message_role, lead_temperature, lead_stage, appointment_state, qualification_gate, service_category, subscription_state, ledger_entry)
- [x] `001_canonical_core.sql` aplicada → `contacts`, `conversations`, `messages`, `leads`, `deals`, `events`, `agent_runs`, `metrics_daily` (8 tabelas — paridade com template canónico) + funções (`tg_set_updated_at`, `is_member`) + RLS
- [x] `002_esthetics_extension.sql` aplicada → `services`, `rooms`, `packages`, `subscriptions`, `appointments`, `session_ledger` + funções (`appointment_conflict`, `apply_optout`) + view `v_session_balance` + RLS
- [x] Os 3 ENUMs/tabelas NÃO colidem com outros tenants (cada schema tem os seus)
- [x] Não afecta os outros 5 schemas de tenant nem o `public` (public=169 idêntico ao baseline)

## Critérios de Aceitação — Teste

- [x] `SELECT count(*) FROM information_schema.tables WHERE table_schema='porcelana' AND table_type='BASE TABLE'` = **14** (8 canónicas + 6 estética — paridade com isilda/desperta) ✅ verificado independentemente
- [x] RLS ENABLED em todas as 14 tabelas (`pg_tables.rowsecurity = true` para schema porcelana) ✅ 14/14
- [x] Funções existem: `porcelana.appointment_conflict`, `porcelana.apply_optout`, `porcelana.is_member`, `porcelana.tg_set_updated_at` ✅ 4/4
- [x] View `porcelana.v_session_balance` existe
- [x] ENUMs existem: `SELECT count(*) ... WHERE n.nspname='porcelana' AND t.typtype='e'` = 9 ✅
- [x] **[C1] Baseline MEDIDO (não hardcoded):** capturado ANTES (crm_elsa=9, crm_nelma=11, desperta=14, isilda=14, natacha=14, public=169, porcelana=0) e confirmado IGUAL DEPOIS para todos os outros tenants + public ✅
- [x] **[C2] Isolamento pós-deploy:** 28 policies (14 auth tenant-scoped via `is_member()` + 14 svc), todas as 14 tabelas com exactamente 2 policies, **`anon` SEM policy (0)** — isolamento confirmado ANTES de carregar dados reais ✅

## Ficheiros a Aplicar (já existentes, validados)

- `supabase/migrations/000_schema_porcelana.sql`
- `supabase/migrations/001_canonical_core.sql`
- `supabase/migrations/002_esthetics_extension.sql`

## Notas Técnicas

- **NÃO re-desenhar** — migrações já validadas em Postgres efémero por @db-sage (parse + smoke-tests + RLS audit).
- Aplicar via Supabase MCP `apply_migration`, **em ordem** (000 → 001 → 002).
- **Pré-requisito do SIC GERAL:** `uuid-ossp` (já existe), roles `authenticated`/`service_role` (já existem), `public.tenants`/`public.tenant_users` (já existem). Confirmado na audit.
- Execução em produção = **autoridade exclusiva @devops** (handoff após dry-run).

## Definition of Done

- [x] Dry-run em produção (BEGIN/ROLLBACK ou apply_migration verificado) PASSA
- [x] 14 tabelas + 9 ENUMs + 4 funções + 1 view criados no schema porcelana
- [x] RLS ENABLED confirmado nas 14 tabelas (incl. `agent_runs` e `metrics_daily`)
- [x] Outros tenants e public intactos (contagens idênticas ao baseline)
- [x] @qa valida (CONCERNS 88/100 → I1 resolvido, I2 WON'T_FIX, I3 clarificado); @po fecha closure

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-10 | DB Sage → extraída do epic-1 | Story individual criada com frontmatter para full-sdc |
| 2026-06-10 | Gage (@devops) | **DEPLOY EM PRODUÇÃO** via Management API `/database/migrations` (SIC GERAL, achtvzbcczmcbvjkdjry), modo YOLO. Pré-flight: tenant `porcelana` registado (Story 1.1), schema ainda inexistente. **Baseline MEDIDO [C1]:** crm_elsa=9, crm_nelma=11, desperta=14, isilda=14, natacha=14, public=169, porcelana=0. Aplicadas 000→001→002 em ordem (HTTP 200, sem erros). **Pós-deploy:** porcelana=14 BASE TABLES, 9 ENUMs, RLS 14/14, 4 funções (appointment_conflict, apply_optout, is_member, tg_set_updated_at), view v_session_balance, agent_runs+metrics_daily presentes. **[C1] outros 5 tenants + public INTACTOS** (contagens idênticas ao baseline; public=169). **[C2] isolamento confirmado:** 28 policies (14 auth tenant-scoped via is_member() + 14 svc), todas as 14 tabelas com exactamente 2 policies, anon SEM policy (0), nenhuma tabela sem RLS, is_member() SECURITY DEFINER search_path=public. Migrações registadas no histórico: 20260610141604 / 141608 / 141612. **DEPLOY=success, VERIFY=PASS.** |
| 2026-06-10 | Pax (@po) | **CLOSURE (full-sdc completo).** Ciclo: Validate GO Condicional 8/10 (C1/C2/C3) → Develop @db-sage resolveu C3 (+agent_runs +metrics_daily → 14 tabelas, paridade canónica), C1 (baseline medido) e reconciliou docs 12→14 → Review @qa CONCERNS 88/100 (I1 docs 12→14 RESOLVIDO; I2 anon USAGE WON'T_FIX; I3 003 fora de âmbito clarificado) → Deploy @devops em PROD. **CHK-8 deploy gate:** VERIFICADO INDEPENDENTEMENTE pelo team-lead — porcelana=14 tabelas, 9 ENUMs, RLS 14/14, 28 policies (14 auth via is_member + 14 svc), anon=0 (isolamento confirmado), 4 funções, isilda(14)+outros tenants+public intactos. **PASS.** **CHK-9 registry:** INDEX-mvp.md + epic-1-fundacao.md actualizados (1.2 ✅ Done, schema aplicado). **CHK-10 IDS:** REUSE puro (template canónico isilda/desperta + extensão estética); sem CREATE de infra nem over-engineering. **Status Ready → Done.** Follow-up (não bloqueia): (a) Story de Auth — propagar tenant_id d7be8f8e… para app_metadata.tenant_id (sem isto, utilizadores não passam is_member()); (b) Seed de services/rooms/packages antes do agente operar (Epic 3). **Próxima story: 1.3 (re-auditar RLS em prod) — desbloqueada.** |
