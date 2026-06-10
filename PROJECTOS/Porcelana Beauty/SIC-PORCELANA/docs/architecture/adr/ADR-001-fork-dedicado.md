# ADR-001 — Isolamento de Tenant no SIC GERAL

**Estado:** Aceite (v2 — premissa v1 corrigida) · **Data:** 2026-06-09 · **Autor:** Aria + DB Sage

## ⚠️ Correcção da v1

A **v1 deste ADR estava errada**. Afirmava que a ISILDA era "single-tenant" e que a Porcelana seria um "fork dedicado" (instância Supabase própria). A inspecção da BD de produção (via Supabase MCP) revelou o modelo real.

## Contexto (realidade verificada)

O backend é o projecto Supabase **SIC GERAL** (`achtvzbcczmcbvjkdjry`), **partilhado por múltiplos clientes**. O isolamento é por **schema Postgres dedicado por tenant**:

| Tenant | db_schema |
|---|---|
| isilda, desperta, natacha, crm_elsa, crm_nelma | um schema cada |

- `public.tenants` regista cada cliente com a coluna **`db_schema`**.
- `public.get_tenant_id()` resolve o tenant via JWT (`app_metadata.tenant_id`).
- Cada schema tem **14 tabelas canónicas** (template: `contacts`, `conversations`, `messages`, `leads`, `deals`, `events`, `agent_runs`, `metrics_daily` + tabelas de conhecimento).
- RLS `authenticated` faz SELECT scoped por `tenant_users JOIN tenants WHERE db_schema='<schema>'`.

## Decisão

A Porcelana Beauty recebe o **schema `porcelana`** no SIC GERAL, replicando o template canónico + extensões de estética. **NÃO** é instância Supabase própria nem `tenant_id` em tabelas de `public`.

## Justificação

1. **É o padrão em produção** para 5 clientes — não inventar um novo.
2. **Isolamento físico real** — cada schema é uma fronteira Postgres; zero conflito de nomes entre tenants (cada um tem o seu `appointments`, `contacts`).
3. **Consistência operacional** — mesmas convenções, mesmo resolver de tenant, mesma infra de `public` (team_members, whatsapp_instances, integration_keys partilhados).

## Consequências

- ✅ Isolamento forte, padrão consistente, zero risco de colisão com ISILDA/outros.
- ✅ Recursos partilhados (equipa, instâncias WhatsApp, chaves) ficam em `public`.
- ⚠️ Idioma do template é **inglês** (`contacts`, não `clientes`) — a Porcelana segue-o para coerência (os meus ADRs originais usavam pt; as migrações finais usam inglês).
- ⚠️ `technician_id` em `appointments` é cross-schema (`public.team_members`) sem FK rígida — gerido por convenção.
- ⚠️ Correcções ao template canónico têm de ser propagadas por tenant (cada schema é cópia).

## Implementação

Schema materializado em `supabase/migrations/000-002` (validado em Postgres efémero). Tenant a registar em `public.tenants` com `db_schema='porcelana'` antes de aplicar.

## Impacto noutros ADRs

- ADR-002/003/005: o DDL conceptual mantém-se válido; só muda o **schema-alvo** (`porcelana`) e o **idioma** (inglês). As migrações finais reflectem isto.
- ADR-004 (import 398): importa para `porcelana.contacts` (não `public.clientes`).
