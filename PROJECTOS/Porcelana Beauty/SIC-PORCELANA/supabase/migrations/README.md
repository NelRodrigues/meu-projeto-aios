# Migrações — SIC Porcelana Beauty

## ⚠️ Arquitectura: multi-tenant POR SCHEMA no SIC GERAL

O backend é o projecto Supabase **SIC GERAL** (`achtvzbcczmcbvjkdjry`), **partilhado por múltiplos clientes**. O isolamento é feito por **schema Postgres dedicado por tenant** — não por `tenant_id` numa tabela partilhada.

| Tenant | slug | db_schema |
|---|---|---|
| Delicias da Isi | isilda | `isilda` |
| Dr. Camilo Ortet | desperta | `desperta` |
| Natacha | natacha | `natacha` |
| CRM Elsa | crm_elsa | `crm_elsa` |
| CRM Nelma | crm_nelma | `crm_nelma` |
| **Porcelana Beauty** | **porcelana** | **`porcelana`** ← novo |

**Todas as tabelas da Porcelana vivem no schema `porcelana`** — fisicamente isoladas das dos outros clientes. Zero conflito de nomes (cada schema tem o seu `appointments`, `contacts`, etc.).

## Migrações

| # | Ficheiro | Conteúdo |
|---|---|---|
| 000 | `000_schema_porcelana.sql` | `CREATE SCHEMA porcelana` + ENUMs (canónicos + estética) |
| 001 | `001_canonical_core.sql` | Template canónico: `contacts`, `conversations`, `messages`, `leads`, `deals`, `events` + RLS |
| 002 | `002_esthetics_extension.sql` | Estética: `services`, `rooms`, `packages`, `subscriptions`, `appointments`, `session_ledger` + funções |
| — | `ROLLBACK_porcelana.sql` | `DROP SCHEMA porcelana CASCADE` |

## Padrão replicado do schema `isilda` (template canónico)

- Tabelas em **inglês** (`contacts`, não `clientes`), alinhadas com o template SIC GERAL.
- `id UUID DEFAULT uuid_generate_v4()` (não `gen_random_uuid()` — o template usa uuid-ossp).
- `created_at`/`updated_at` + trigger **próprio do schema** `porcelana.tg_set_updated_at()` com `SET search_path=''`.
- ENUMs **por schema** (`porcelana.lead_stage`, etc.) — não colidem com os de outros tenants.
- **RLS padrão SIC GERAL:**
  - `auth_*` (SELECT): `porcelana.is_member()` → verifica `tenant_users JOIN tenants WHERE db_schema='porcelana'` OR superadmin.
  - `svc_*` (ALL): `service_role USING(true)`.

## Extensões de estética (não existem no template canónico)

`services`, `rooms`, `appointments`, `packages`, `subscriptions`, `session_ledger` — seguem o mesmo idioma (inglês), padrão de RLS e triggers. ADRs 002/003/005.

- `session_ledger` é **imutável** (INSERT-only, sem updated_at) — livro-razão auditável.
- `appointments.technician_id` referencia `public.team_members` **sem FK rígida** (cross-schema) — a equipa é gerida no public do SIC GERAL.
- Opt-out (FR28) vive em colunas de `contacts` (`opted_out_at`, `followup_paused`, `ai_assigned`).

## Validação efectuada (DB Sage)

✅ **Parse-check real** num Postgres 18.3 efémero com stubs do SIC GERAL (tenants, tenant_users, uuid-ossp, auth.uid/jwt) — as 3 migrações aplicam limpo.
✅ **Isolamento confirmado:** 0 tabelas em `public`, 14 BASE TABLE (8 canónicas + 6 estética) + view + funções em `porcelana`.
✅ **Smoke-tests:** ledger (saldo 3), conflito de slot (10:30=t / 11:00=f), opt-out idempotente (f,t,t).

## Como aplicar em produção (SIC GERAL)

⚠️ **Pré-requisitos no SIC GERAL (já existem):** `public.tenants`, `public.tenant_users`, `public.get_tenant_id()`, extensão `uuid-ossp`, roles `authenticated`/`service_role`.

```sql
-- 1. Registar o tenant (antes das migrações)
INSERT INTO public.tenants (slug, display_name, business_name, country, status, db_schema)
VALUES ('porcelana','Porcelana Beauty','Porcelana Beauty','AO','active','porcelana');

-- 2. Aplicar migrações via Supabase MCP (apply_migration) ou CLI, por ordem:
--    000_schema_porcelana.sql → 001_canonical_core.sql → 002_esthetics_extension.sql
```

Recomendado aplicar via **Supabase MCP** (`apply_migration`) por @devops/@data-engineer, com snapshot antes.

## Migrações arquivadas

`_descartado-modelo-standalone/` — primeira tentativa (modelo ISILDA standalone em `public`). **Descartada** após descobrir que o SIC GERAL é multi-tenant por schema. Mantida só como registo.

## Mudança de modelo registada no ADR-001 (v2)

O ADR-001 (fork dedicado) foi **revisto** — a premissa estava errada. Ver `docs/architecture/adr/ADR-001-fork-dedicado.md` v2.
