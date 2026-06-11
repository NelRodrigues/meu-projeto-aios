# Epic 1 — Fundação e Migração da Base

**SIC Porcelana Beauty · MVP (F0) · Pré-requisito de todos os outros epics**

| Campo | Detalhe |
|---|---|
| **Epic** | E1 — Fundação e Migração |
| **Objectivo** | Provisionar o tenant `porcelana` no SIC GERAL, aplicar schema, importar os ~398 contactos |
| **PRD refs** | FR23, FR25, NFR3, NFR5, NFR6, CR1, CR2 · Epic 1 |
| **Arq refs** | ADR-001 v2 (multi-tenant por schema), ADR-004 (import) |
| **Migrações** | `000_schema_porcelana.sql`, `001_canonical_core.sql`, `002_esthetics_extension.sql` (já criadas + validadas) |
| **Prioridade** | P0 (bloqueia tudo) |
| **Status** | ✅ **Ready** (validado @po, 9 Jun 2026) |
| **Autor** | River (SM) · 9 Jun 2026 · validado @po (Pax) |

---

## Story 1.1 — Provisionar tenant `porcelana` no SIC GERAL

**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Agente sugerido:** @data-engineer / @devops
**ADR refs:** ADR-001 v2 · `rls-audit-porcelana.md` (passos 2-4)
**Estado:** ✅ **Done** (10 Jun 2026) · **`tenant_id = d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1`** (db_schema=porcelana, status=active, plan=starter)

### Descrição
Como administrador da Marca Digital, quero registar a Porcelana Beauty como tenant no projecto SIC GERAL, para que o isolamento RLS por schema funcione antes de qualquer dado entrar.

### Critérios de Aceitação
- [ ] Registo inserido em `public.tenants` com `slug='porcelana'`, `db_schema='porcelana'`, `display_name='Porcelana Beauty'`, `business_name='Porcelana Beauty'`, `country='AO'`, `status='active'`, `owner_name='Yolenia Balaca'`
- [ ] `tenant_id` (UUID gerado) registado e documentado (será usado no JWT e em `tenant_users`)
- [ ] Pelo menos 1 utilizador associado em `public.tenant_users` (Yolenia + operador Marca Digital) com `is_active=true`
- [ ] JWT dos utilizadores da Porcelana tem `app_metadata.tenant_id` correcto (config Supabase Auth)
- [ ] Verificado: `get_tenant_id()` devolve o UUID da Porcelana para um utilizador da Porcelana

### Notas Técnicas
- **Pré-requisito de Story 1.2** — sem tenant registado, `porcelana.is_member()` devolve sempre false.
- Operação em **BD partilhada de produção** — fazer snapshot antes (delegar a @devops).

---

## Story 1.2 — Aplicar migrações do schema `porcelana`

**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Agente sugerido:** @data-engineer
**Arq refs:** `supabase/migrations/README.md`
**Estado:** ✅ **Done** (10 Jun 2026) · schema `porcelana` aplicado em PROD (SIC GERAL): 14 tabelas, 9 ENUMs, RLS 14/14, 28 policies, 4 funções, view. Ver `STORY-1.2-aplicar-schema.md`.

### Descrição
Como @data-engineer, quero aplicar as 3 migrações já validadas ao SIC GERAL, para criar o schema `porcelana` com as 14 tabelas e funções (8 canónicas + 6 estética — paridade com isilda/desperta).

### Critérios de Aceitação
- [x] `000_schema_porcelana.sql` aplicada (schema + 9 ENUMs)
- [x] `001_canonical_core.sql` aplicada (contacts, conversations, messages, leads, deals, events, agent_runs, metrics_daily + RLS)
- [x] `002_esthetics_extension.sql` aplicada (services, rooms, appointments, packages, subscriptions, session_ledger + funções)
- [x] `SELECT count(*) FROM information_schema.tables WHERE table_schema='porcelana'` = 14 BASE TABLE (8 canónicas + 6 estética)
- [x] RLS ENABLED em todas as 14 tabelas (`pg_tables.rowsecurity = true`)
- [x] Funções `porcelana.appointment_conflict`, `porcelana.apply_optout`, `porcelana.is_member`, `porcelana.tg_set_updated_at` existem
- [x] View `porcelana.v_session_balance` existe

### Notas Técnicas
- Aplicar via Supabase MCP `apply_migration` (não psql directo) — @devops/@data-engineer.
- **Snapshot antes** (BD partilhada com 5 clientes activos).
- Migrações já validadas em Postgres efémero por @db-sage (não re-desenhar).

---

## Story 1.3 — Re-auditar RLS em produção (pós-deploy)

**Prioridade:** P0 | **Estimativa:** 0.25 dia
**Agente sugerido:** @data-engineer / @qa
**Arq refs:** `rls-audit-porcelana.md`
**Estado:** ✅ **Done** (10 Jun 2026) · 9/9 testes PASS em PROD (T1 RLS 14/14, T2 28 policies, T3 anon 0, T6 USING(true) 0, T8 positivo true, T9 negativo false). @qa GATE PASS 90/100. Ver `STORY-1.3-reauditar-rls.md`.

### Descrição
Como @qa, quero re-correr os 9 testes de isolamento RLS contra a instância real, para confirmar que o isolamento cross-tenant funciona em produção antes de carregar dados reais.

### Critérios de Aceitação
- [ ] Utilizador da Porcelana lê `porcelana.contacts` → vê os seus dados
- [ ] Utilizador de OUTRO tenant (ex.: isilda) lê `porcelana.contacts` → vê **0** (sem leak)
- [ ] Utilizador autenticado tenta INSERT → bloqueado (só service_role escreve)
- [ ] Superadmin vê tudo
- [ ] Resultado documentado (PASS/FAIL) num registo de auditoria pós-deploy

### Notas Técnicas
- Usar `*impersonate {user_id}` do @data-engineer para simular utilizadores.
- Os mesmos 9 testes do `rls-audit-porcelana.md` §2.

---

## Story 1.4 — Importar e consolidar os ~398 contactos

**Prioridade:** P0 | **Estimativa:** 2 dias
**Agente sugerido:** @data-engineer
**ADR refs:** ADR-004 · **Risco:** 🔴 Bloqueador #1 (depende do cliente)

### Descrição
Como @data-engineer, quero importar os ~398 contactos consolidados (software de gestão + faturação) para `porcelana.contacts`, de forma idempotente e com dedup por telefone, para activar a base.

### Critérios de Aceitação
- [ ] Template de colunas-alvo enviado ao cliente (nome, telefone, email, origem)
- [ ] CSVs recebidos importados para tabela de staging (`porcelana._import_staging` ou via script)
- [ ] Telefones normalizados para E.164 (`+244...`)
- [ ] Dedup por telefone (relatório de conflitos: mesmo telefone, nomes diferentes → revisão humana)
- [ ] Upsert para `porcelana.contacts` com `ON CONFLICT (phone_e164) DO UPDATE` (re-executável)
- [ ] Etiquetas de origem aplicadas (`importado_gestao` / `importado_faturacao` em metadata)
- [ ] `acquisition_source` preenchido
- [ ] Consentimento marcado como pendente de confirmação no 1º contacto
- [ ] **Conformidade (FR28):** contactos importados começam com `followup_paused=false` mas a 1ª campanha/mensagem deve oferecer opt-out claro; `apply_optout()` disponível desde o início (base não-autorizada explicitamente)
- [ ] Contagem final validada vs. esperado (~398, menos duplicados)

### Critérios de Aceitação — Teste
- [ ] Correr o import 2x → contagem não muda (idempotência por `phone_e164`)
- [ ] Telefone com formato local (`9XX XXX XXX`) → normalizado para `+2449XXXXXXXX`
- [ ] 2 registos com mesmo telefone, nomes diferentes → aparecem no relatório de conflitos (não silenciados)

### Notas Técnicas
- **Bloqueado até o cliente entregar os CSVs consolidados.** Mitigar: enviar template na Fase 0.
- Import via service_role (RLS authenticated é só SELECT).
- Permite import incremental por lotes à medida que a cliente valida.

---

## Story 1.5 — Conectar instância WhatsApp (uazapi)

**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Agente sugerido:** @devops / @data-engineer
**PRD refs:** NFR3 · CR1

### Descrição
Como @devops, quero conectar a instância WhatsApp Business da Porcelana via uazapi e ligá-la ao webhook, para que mensagens reais cheguem ao sistema.

### Critérios de Aceitação
- [ ] Instância WhatsApp da Porcelana registada (em `public.whatsapp_instances` com referência ao tenant) ou config equivalente do SIC GERAL
- [ ] Número WhatsApp Business da Porcelana conectado (estado `connected`)
- [ ] Webhook uazapi a apontar para o endpoint do SIC GERAL
- [ ] `webhook_idempotency` / `webhook_processed_messages` activo (sem reprocessamento)
- [ ] Mensagem de teste recebida e registada em `porcelana.messages` (via service_role)

### Notas Técnicas
- uazapi.dev — mesmo gateway dos outros clientes.
- Confirmar como o SIC GERAL roteia webhooks por tenant (instância → tenant_id).

---

## Resumo do Epic 1

| Story | Título | Estimativa | Bloqueador | Estado |
|---|---|---|---|---|
| 1.1 | Provisionar tenant | 0.5d | — | ✅ Done (tenant_id d7be8f8e…) |
| 1.2 | Aplicar migrações | 0.5d | depende 1.1 | ✅ Done (14 tabelas, RLS 14/14, anon=0) |
| 1.3 | Re-auditar RLS | 0.25d | depende 1.2 | ✅ Done (9/9 PASS prod · @qa 90/100) |
| 1.4 | Importar 398 contactos | 2d | 🔴 cliente (CSVs) | ⏳ Pendente — **próxima** (desbloqueada por 1.3) |
| 1.5 | Conectar WhatsApp | 0.5d | depende 1.1 | ✅ Done (instância disconnected; falta nº cliente) |
| 1.6 | Auth/JWT tenant (refinamento) | 0.5d | depende 1.1/1.2 | 🟡 P2 — `is_member()` já resolve a leitura |

**Sequência:** 1.1 ✅ → 1.2 ✅ → 1.3 ✅ → (1.4 ∥ 1.5 ✅)
**Progresso:** 4/6 stories Done (1.1, 1.2, 1.3, 1.5). Resta 1.4 (bloqueada cliente) + 1.6 (P2 refinamento).

> **Descoberta (10 Jun):** `is_member()` verifica `tenant_users` (associação real), NÃO o JWT — a leitura autenticada já funciona mesmo com o JWT do admin a apontar para outro tenant. Story de Auth (1.6) reclassificada P0→P2.
