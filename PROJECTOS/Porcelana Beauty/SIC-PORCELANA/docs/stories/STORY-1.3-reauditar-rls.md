---
story_id: "1.3"
title: "Re-auditar RLS em produção (pós-deploy)"
epic: "E1 — Fundação e Migração"
status: "Done"
executor: "@db-sage"
quality_gate: "@qa"
deploy_type: "none"
accountable: "nelson-rodrigues"
depends_on: ["1.2"]
priority: "P0"
estimate: "0.25d"
prd_refs: ["rls-audit-porcelana", "NFR5", "NFR6"]
---

# Story 1.3 — Re-auditar RLS em produção (pós-deploy)

**Epic:** E1 — Fundação e Migração
**Prioridade:** P0 | **Estimativa:** 0.25 dia
**Executor:** @db-sage | **Quality Gate:** @qa | **Deploy:** none
**Status:** ✅ Done (10 Jun 2026 — fechada por @po Pax)
**Depende de:** Story 1.2 (✅ Done — schema porcelana com 14 tabelas + RLS em produção)

---

## Descrição

Como @db-sage, quero re-correr os testes de isolamento RLS contra a instância **real** do SIC GERAL, para confirmar que o isolamento cross-tenant funciona em produção **antes** de carregar os 398 contactos reais (Story 1.4).

**Contexto:** o schema `porcelana` foi aplicado (Story 1.2) com 28 policies, RLS 14/14, anon sem policy. A audit original (`rls-audit-porcelana.md`) foi feita em Postgres efémero. Esta story valida o mesmo contra a BD de produção partilhada (6 tenants) — a prova viva exigida antes de dados sensíveis entrarem.

## Critérios de Aceitação

- [x] RLS ENABLED confirmado nas **14** tabelas em produção (`pg_tables.rowsecurity=true`) — T1 ✅ 14/14
- [x] Cada uma das 14 tabelas tem exactamente 2 policies (`auth_*` SELECT + `svc_*` ALL) — T2 ✅ 28 · T4 ✅ 14 · T5 ✅ 14
- [x] As 14 policies `auth_*` estão vinculadas a `porcelana.is_member()` (não `USING(true)`) — T6 ✅ 0
- [x] `anon` SEM nenhuma policy nas 14 tabelas (0 leitura anónima) — T3 ✅ 0
- [x] **Isolamento positivo:** um membro da Porcelana (em `tenant_users`) passa `is_member()` → vê os seus dados — T8 ✅ true
- [x] **Isolamento negativo (CRÍTICO):** um utilizador de OUTRO tenant (ex.: isilda) NÃO passa `is_member()` da porcelana → 0 linhas — T9 ✅ false
- [x] `is_member()` é `SECURITY DEFINER` com `search_path` fixo (sem hijack) — confirmado no código da migração (`search_path='public'`)
- [x] Resultado documentado num registo de auditoria pós-deploy (PASS/FAIL por teste) — `rls-audit-porcelana.md` §7

## Critérios de Aceitação — Teste

- [x] `SELECT count(*) FROM pg_tables WHERE schemaname='porcelana' AND rowsecurity=true` = 14 — T1 ✅
- [x] `SELECT count(*) FROM pg_policies WHERE schemaname='porcelana'` = 28 — T2 ✅
- [x] `SELECT count(*) FROM pg_policies WHERE schemaname='porcelana' AND 'anon'=ANY(roles)` = 0 — T3 ✅
- [x] `is_member()` para um user da porcelana = true; para um user só-isilda = false — T8 true / T9 false ✅
- [x] Nenhuma policy `auth_*` com qualificador `true` (todas via `is_member()`) — T6 ✅ 0

## Notas Técnicas

- **deploy_type: none** — esta story NÃO aplica migração; só lê/audita produção.
- Usar MCP Supabase (`execute_sql`) read-only contra `achtvzbcczmcbvjkdjry`.
- O teste de leak via impersonate completo (sessão de utilizador real) pode não ser viável via SQL puro; usar a equivalência estrutural: `is_member()` exige `tenant_users JOIN tenants WHERE db_schema='porcelana'` — quem não está associado devolve 0.
- Output → actualizar/anexar a `docs/architecture/rls-audit-porcelana.md` com a secção "Auditoria pós-deploy produção".

## Definition of Done

- [x] 14/14 RLS, 28 policies, 0 anon confirmados em produção
- [x] Isolamento positivo e negativo provados
- [x] Registo de auditoria pós-deploy documentado
- [x] @qa valida (GATE PASS 90/100); @po fecha (esta closure)

## QA Results

**Revisor:** Quinn (@qa) · **Data:** 10 Jun 2026 · **Modo:** review-story (YOLO)
**Gate:** ✅ **PASS** · **Quality Score:** 90/100

### Verificação independente (não confiei só na documentação)

| Camada | Método | Resultado |
|---|---|---|
| Fonte da verdade da migração | `Read` de `001_canonical_core.sql` | `is_member()` = `SECURITY DEFINER SET search_path='public'`, valida `tenant_users JOIN tenants WHERE db_schema='porcelana' AND is_active` OR `superadmin`. Loop RLS cria exactamente `auth_*` (SELECT, `is_member()`) + `svc_*` (ALL, service_role) por tabela. ✅ confirma T4/T5/T6/AC3/AC7 ao nível do código aplicado. |
| Isolamento ao nível da API REST | `curl` live contra `achtvzbcczmcbvjkdjry.supabase.co` com service_role **e** anon | `porcelana.contacts` → **HTTP 406** em ambos (schema fora do `db-schemas` exposto). Camada extra de isolamento no gateway, independente do RLS. ✅ reforça T3/AC4. |
| Deploy real das migrações | Change Log Story 1.2 (@devops) | 000→001→002 aplicadas HTTP 200, histórico `20260610141604/141608/141612`. O código verificado acima é o que correu em produção. |

### Avaliação das 5 perguntas do gate

1. **Cobertura dos 9 testes / vectores em falta:** Cobrem RLS-enabled (T1/T7), contagem e roles de policies (T2-T5), ausência de `USING(true)` em leitura auth (T6), e isolamento positivo/negativo (T8/T9). **Vector adicional confirmado por mim** (não estava nos 9): exposição via PostgREST = 406 (porcelana não exposto na API). Lacuna menor: não há teste explícito de **escrita** por `authenticated` (INSERT/UPDATE bloqueado) na re-corrida pós-deploy — embora a audit efémera §2 (T5/T6) o tenha provado e o padrão `svc_* FOR ALL service_role` + `auth_* FOR SELECT` o garanta estruturalmente. Não bloqueia.
2. **T9 suficiente como prova de não-leak?** T9 prova a **equivalência estrutural** correcta: `is_member()` para um user só-isilda devolve `false` porque a associação real (`tenant_users JOIN tenants WHERE db_schema='porcelana'`) não existe — exactamente o predicado que o RLS avalia. Um impersonate JWT completo seria mais forte mas **não é necessário** aqui: o predicado RLS NÃO lê o JWT (lê a associação real, como a Nota §7 documenta e eu confirmei no código). Prova adequada para deploy. Recomendação não-bloqueante: na Story 1.4 pós-carga, correr 1 SELECT real com sessão `authenticated` de um membro vs. um não-membro como smoke-test de confiança.
3. **Evidência rastreável/reproduzível?** Sim. Secção 7 do `rls-audit-porcelana.md` lista T1-T9 com esperado/real/resultado, projeto-alvo explícito, e a Nota sobre o passo 4 (JWT) reclassifica honestamente uma recomendação anterior com justificação técnica. As queries dos AC-Teste são SQL puro re-executável. Reproduzível por qualquer auditor com acesso read-only.
4. **ACs e DoD cumpridos?** Todos os 8 AC + 5 AC-Teste mapeados à secção 7. DoD 4/4: 14/14 RLS + 28 policies + 0 anon ✅; isolamento ±  ✅; registo pós-deploy ✅; @qa valida (este gate) → @po fecha (pendente).
5. **Seguro avançar para 1.4 (398 contactos)?** **Sim.** Isolamento confirmado em 3 camadas independentes (catálogo via DB Sage, código da migração via mim, API REST live via mim). Pré-requisitos §5.2-5.3 (tenant registado + admin associado) cumpridos nas Stories 1.1/1.2.

### Issues

| # | Sev | Issue | Estado |
|---|---|---|---|
| I1 | 🟢 LOW | Re-corrida pós-deploy não inclui teste explícito de escrita bloqueada por `authenticated` (coberto na audit efémera §2 + garantido estruturalmente). | Documentado — não bloqueia 1.4. |
| I2 | 🟢 LOW | T8/T9 via equivalência estrutural de `is_member()`, não impersonate JWT real. Justificado (predicado RLS não usa JWT). | Recomendado smoke-test com sessão real na 1.4. |
| I3 | ℹ️ INFO | `architecture-...md:113` descreve `authenticated USING(true)` (modelo standalone descartado); o deployado usa `is_member()` tenant-scoped. Sem impacto — doc refere a variante em `_descartado-modelo-standalone/`. | Nota; alinhar doc quando conveniente. |
| — | — | **Verificação de catálogo live (T1/T2/T5 via `pg_policies`/`pg_tables`)** não re-executável por mim (sem password de DB / MCP SQL neste subagente). Mitigado por verificação do código-fonte aplicado + deploy HTTP 200 + 406 na API. | Ver dedução do score. |

**Dedução de score (-10):** não consegui re-correr as queries de catálogo (T1-T7) directamente contra produção neste contexto (sem acesso SQL). Confio nelas via verificação do código aplicado (fonte da verdade) + confirmação de deploy + isolamento REST live. Para um PASS de 100/100, um auditor com MCP SQL deve re-confirmar `count` de `pg_policies`/`pg_tables` (1 query, 30s).

### Veredicto

✅ **PASS — seguro carregar os 398 contactos reais (Story 1.4).** O isolamento cross-tenant está provado de forma convergente em múltiplas camadas. As 2 issues LOW são recomendações de robustez, não bloqueadores.

---

## PO Closure (Pax · 10 Jun 2026)

**Modo:** close-story (YOLO) · **Veredicto:** ✅ **Done**

### Checklist de fecho

| CHK | Item | Resultado |
|---|---|---|
| **CHK-8** | Deploy verification | ➖ **N/A** — `deploy_type: none`. Story de auditoria pura (read-only), não aplica migração nem altera produção. Verificação aplicável = **completude da auditoria**: confirmada. Os 9 testes (T1-T9) correram contra a BD real do SIC GERAL (`achtvzbcczmcbvjkdjry`), todos PASS, documentados em `docs/architecture/rls-audit-porcelana.md` §7. O deploy do schema que esta auditoria valida foi feito na Story 1.2 (000→001→002, HTTP 200). |
| **CHK-9** | Registry governance | ✅ **Done** — `INDEX-mvp.md` e `epic-1-fundacao.md` actualizados: 1.3 → Done; 1.4 marcada como próxima. |
| **CHK-10** | IDS post-check | ✅ **REUSE** — re-correu a bateria de testes existente da `rls-audit-porcelana.md` §2; sem criar artefactos, scripts ou padrões novos. Output anexado como §7 (estende doc existente, não duplica). |

### Verificação de convergência (3 camadas independentes)

O isolamento cross-tenant está provado de forma convergente:
1. **Catálogo live (DB Sage / MCP):** T1-T9 todos PASS contra produção — fecha a dedução de -10 do @qa (que não tinha acesso SQL).
2. **Código da migração (@qa):** `is_member()` SECURITY DEFINER + padrão `auth_*`/`svc_*` por tabela.
3. **API REST live (@qa):** `porcelana.contacts` → HTTP 406 (schema não exposto no gateway) — camada extra de isolamento.

Score @qa: 90/100 → com a re-confirmação de catálogo via MCP, a única dedução (-10, queries não re-executadas pelo @qa) está saldada.

### Pendências de follow-up (não-bloqueantes)

| # | Pendência | Destino |
|---|---|---|
| FU-1 | Smoke-test com sessão `authenticated` real (membro vs. não-membro) como reforço de confiança | Story 1.4 (recomendação @qa I2) |
| FU-2 | Alinhar `architecture-...md:113` (descreve `authenticated USING(true)` do modelo standalone descartado) com o deployado `is_member()` | Doc — quando conveniente (@qa I3) |
| FU-3 | Story 1.4 bloqueada à espera dos CSVs dos 398 contactos | Cliente |

**Veredicto final:** ✅ **Seguro carregar os 398 contactos reais (Story 1.4).** Isolamento à prova de bala confirmado em 3 camadas. Story 1.3 fechada.

---

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-10 | DB Sage → extraída do epic-1 | Story individual criada (desbloqueada após 1.2 Done + descoberta is_member). |
| 2026-06-10 | Quinn (@qa) | **REVIEW PASS 90/100.** Verificação independente: código da migração (`is_member()` SECURITY DEFINER + padrão auth/svc), isolamento REST live (406, porcelana não exposto na API), deploy HTTP 200 confirmado. 2 issues LOW (sem teste de escrita na re-corrida; T8/T9 estrutural vs JWT) — não bloqueiam. Seguro para Story 1.4. Pendente: @po fecha closure. |
| 2026-06-10 | DB Sage (team-lead) | **Re-confirmação de catálogo via MCP** contra produção (`achtvzbcczmcbvjkdjry`): T1 RLS 14/14, T2 28 policies, T3 anon 0, T4 auth_* 14, T5 svc_* 14, T6 USING(true) 0, T7 sem-RLS 0, T8 positivo true, T9 negativo false — todos PASS verificados independentemente. Salda a dedução de -10 do @qa (queries de catálogo). |
| 2026-06-10 | Pax (@po) | **CLOSURE — Status Ready → ✅ Done.** CHK-8 N/A (deploy_type none, auditoria pura; completude confirmada §7). CHK-9 registries actualizados (INDEX-mvp + epic-1: 1.3 Done, 1.4 próxima). CHK-10 REUSE (re-corrida da bateria existente, sem artefactos novos). Isolamento provado em 3 camadas convergentes. Follow-ups (smoke-test real, alinhar doc, CSVs cliente) não-bloqueantes. Próxima: Story 1.4. |
