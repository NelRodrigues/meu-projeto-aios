# RLS Audit — Schema `porcelana` (SIC GERAL)

**Auditoria de isolamento Row-Level Security · multi-tenant por schema**

| Campo | Detalhe |
|---|---|
| **Auditor** | DB Sage 🗄️ |
| **Data** | 9 de Junho de 2026 |
| **Alvo** | Schema `porcelana` no SIC GERAL (`achtvzbcczmcbvjkdjry`) |
| **Método** | Estático (DDL) + **dinâmico adversarial** (Postgres efémero, JWT simulado por tenant) |
| **Veredicto** | ✅ **PASS — isolamento à prova de bala** |

---

## 1. Modelo de isolamento auditado

Isolamento **por schema** + RLS scoped a `db_schema='porcelana'` via `porcelana.is_member()`:

```sql
porcelana.is_member() =
  EXISTS (tenant_users tu JOIN tenants tn
          WHERE tu.user_id = auth.uid() AND tu.is_active
            AND tn.db_schema = 'porcelana')
  OR (auth.jwt() ->> 'role') = 'superadmin'
```

Padrão de policies (14 tabelas — 8 canónicas + 6 estética):
- `auth_<tabela>` — `FOR SELECT TO authenticated USING (porcelana.is_member())`
- `svc_<tabela>` — `FOR ALL TO service_role USING(true) WITH CHECK(true)`

---

## 2. Testes executados (todos PASS)

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 1 | Utilizador da **porcelana** lê `contacts` | ≥1 | ✅ vê 1 |
| 2 | **Utilizador da isilda** lê `porcelana.contacts` (cross-tenant leak) | **0** | ✅ **vê 0** |
| 3 | **Superadmin** lê `contacts` | ≥1 | ✅ vê 1 |
| 4 | Utilizador **órfão** (sem tenant_users) lê | 0 | ✅ vê 0 |
| 5 | Utilizador da porcelana faz **INSERT** | bloqueado | ✅ `RLS policy violation` |
| 6 | Utilizador da porcelana faz **UPDATE** | 0 linhas | ✅ `UPDATE 0` |
| 7 | Isilda lê `appointments`/`packages`/`session_ledger` | 0 | ✅ todos 0 |
| 8 | **service_role** faz INSERT+SELECT | OK | ✅ funciona |
| 9 | RLS **ENABLED** em todas as 14 tabelas | sim | ✅ 14/14 `rls=true` (incl. agent_runs, metrics_daily) |

**Teste 2 é o crítico** — prova que um utilizador autenticado de OUTRO cliente (isilda) **não consegue ler** dados da Porcelana, mesmo com o mesmo role `authenticated` no mesmo Postgres.

---

## 3. Achados

| # | Severidade | Achado | Estado |
|---|---|---|---|
| A1 | ℹ️ INFO (by design) | `authenticated` só tem **SELECT**; todas as escritas exigem `service_role` | ✅ **CONFIRMADO contra produção** — a ISILDA real usa o mesmo padrão (13 policies ALL service_role + 9 SELECT authenticated). Escrita via Edge Functions/API. Não é gap. |
| A2 | 🟢 LOW | Tabelas de conhecimento da PB (se adicionadas) podem usar `USING(true)` no SELECT (como `objection_handling` da isilda) | Aplicável só quando essas tabelas existirem (Epic 8 roleplay) |
| A3 | 🟢 LOW | `appointments.technician_id` é cross-schema para `public.team_members` sem FK | Por design (ADR-001 v2). RLS não afectada — a coluna é UUID livre. |
| A4 | 🟡 NOTA | `is_member()` é `SECURITY DEFINER` — corre com privilégios do dono | Correcto e necessário (precisa de ler `public.tenant_users`). `search_path='public'` fixo evita injection. ✅ |

**Resolução: 4/4 achados classificados. 0 bloqueadores.**

---

## 4. Comparação com produção (ISILDA)

| Aspecto | ISILDA (produção) | Porcelana (auditado) | Paridade |
|---|---|---|---|
| Policies SELECT authenticated | 9 | 12 (mais tabelas) | ✅ mesmo padrão |
| Policies ALL service_role | 13 | 12 | ✅ mesmo padrão |
| Escrita por authenticated | ❌ bloqueada | ❌ bloqueada | ✅ idêntico |
| Tenant scope | `db_schema='isilda'` | `db_schema='porcelana'` | ✅ idêntico |

---

## 5. Recomendações antes de produção

1. ✅ **Isolamento aprovado** — pode aplicar-se com segurança ao SIC GERAL.
2. ⚠️ **Registar o tenant primeiro:** `INSERT INTO public.tenants (slug, db_schema, ...) VALUES ('porcelana', 'porcelana', ...)` — senão `is_member()` devolve sempre false e ninguém vê nada.
3. ⚠️ **Associar utilizadores:** inserir em `public.tenant_users` os utilizadores da Porcelana com o `tenant_id` correcto.
4. ⚠️ **JWT app_metadata:** garantir que os utilizadores da Porcelana têm o `tenant_id` no JWT (Supabase Auth) — usado por `get_tenant_id()` noutras partes.
5. 🔁 **Re-auditar pós-deploy:** correr os mesmos 9 testes contra a instância real (com `*impersonate`) antes de carregar os 398 contactos.

---

## 6. Veredicto Final

**✅ PASS — O isolamento RLS do schema `porcelana` é à prova de bala.**

Um cliente não consegue ver dados de outro. Escrita restrita a service_role (padrão de produção confirmado). RLS activa em todas as tabelas. Seguro para receber dados reais **após** registar o tenant e associar utilizadores (passos 2-4).

*Auditoria por DB Sage 🗄️ — Marca Digital · 9 de Junho de 2026*

---

## 7. Auditoria PÓS-DEPLOY em produção (Story 1.3 · 10 Jun 2026)

Re-corrida contra a BD **real** do SIC GERAL (`achtvzbcczmcbvjkdjry`) após o schema ser aplicado (Story 1.2). Os passos 2-3 das recomendações §5 estão cumpridos (tenant registado: Story 1.1; admin associado). O passo 4 (JWT) foi reclassificado — ver nota abaixo.

| # | Teste | Esperado | Real | Resultado |
|---|---|---|---|---|
| T1 | RLS ENABLED nas tabelas | 14 | 14 | ✅ PASS |
| T2 | Total de policies | 28 | 28 | ✅ PASS |
| T3 | Policies para `anon` | 0 | 0 | ✅ PASS |
| T4 | Policies `auth_*` | 14 | 14 | ✅ PASS |
| T5 | Policies `svc_*` | 14 | 14 | ✅ PASS |
| T6 | Policies auth com `USING(true)` | 0 | 0 | ✅ PASS |
| T7 | Tabelas sem RLS | 0 | 0 | ✅ PASS |
| T8 | **Isolamento positivo** (membro porcelana vê) | true | true | ✅ PASS |
| T9 | **Isolamento negativo** (outro tenant não vê) | false | false | ✅ PASS |

**Verificação adicional:** as 14 policies `auth_*` usam mesmo `porcelana.is_member()` (confirmado em `agent_runs`, `appointments`, `contacts`...). Não há `USING(true)` em leitura autenticada.

### Nota sobre o passo 4 (JWT) — reclassificado

A recomendação §5.4 (JWT `app_metadata.tenant_id`) **não é pré-requisito da leitura RLS**. Descoberta confirmada em produção: `porcelana.is_member()` verifica a **associação real** (`tenant_users JOIN tenants WHERE db_schema='porcelana'`), NÃO o JWT. O admin Nelson passa `is_member()` mesmo com o JWT a apontar para a isilda. O JWT só afecta `get_tenant_id()` (usado por Edge Functions) — tratado como refinamento na Story 1.6 (P2).

### Veredicto pós-deploy

**✅ PASS — 9/9 testes em produção.** O isolamento cross-tenant está confirmado contra a BD real. **Seguro para carregar os 398 contactos (Story 1.4).**

*Auditoria pós-deploy por DB Sage 🗄️ — 10 de Junho de 2026*
