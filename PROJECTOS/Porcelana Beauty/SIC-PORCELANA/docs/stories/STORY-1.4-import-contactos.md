---
story_id: "1.4"
title: "Importar e consolidar os ~398 contactos"
epic: "E1 — Fundação e Migração"
status: "Blocked"
executor: "@db-sage"
quality_gate: "@qa"
deploy_type: "supabase_migration"
accountable: "nelson-rodrigues"
depends_on: ["1.2", "1.3"]
priority: "P0"
estimate: "2d"
prd_refs: ["FR23", "FR28", "ADR-004"]
blocker: "cliente — CSVs consolidados (gestão + faturação)"
---

# Story 1.4 — Importar e consolidar os ~398 contactos

**Epic:** E1 — Fundação e Migração
**Prioridade:** P0 | **Estimativa:** 2 dias
**Executor:** @db-sage | **Quality Gate:** @qa | **Deploy:** supabase_migration
**Status:** 🔴 **Blocked** (espera CSVs do cliente)
**Depende de:** Story 1.2 (✅ schema) + Story 1.3 (✅ RLS auditado — seguro para dados reais)

---

## Descrição

Como @db-sage, quero importar os ~398 contactos consolidados (software de gestão + faturação) para `porcelana.contacts`, de forma idempotente e com dedup por telefone, para activar a base.

## ✅ Preparação já feita (10 Jun 2026) — pronto para o cliente

Os artefactos de import **já estão criados e validados** — só falta o cliente entregar os CSVs:

| Artefacto | Caminho | Estado |
|---|---|---|
| Template CSV | `scripts/import-contactos/TEMPLATE-contactos-porcelana.csv` | ✅ pronto |
| Instruções para o cliente | `scripts/import-contactos/INSTRUCOES-CLIENTE.md` | ✅ pronto |
| Script de import SQL | `scripts/import-contactos/import-contactos.sql` | ✅ validado em efémero |

**Validação do script (Postgres efémero):**
- Normalização E.164: `923456789`, `+244 923 456 789`, `0923456789`, `"923 456 789"` → todos `+244...` ✅
- Dedup: mesma cliente nos 2 softwares (formatos diferentes) → 1 registo, email preservado ✅
- Idempotência: correr 2x → não duplica ✅

## Critérios de Aceitação

- [ ] **[cliente]** Template e instruções enviados ao cliente
- [ ] **[cliente]** CSVs recebidos (gestão + faturação)
- [ ] CSVs carregados em `porcelana._import_staging`
- [ ] Telefones normalizados para E.164 via `porcelana.normalize_phone_ao()`
- [ ] **Relatório de conflitos** gerado (mesmo telefone, nomes diferentes → revisão humana) ANTES do upsert
- [ ] Upsert idempotente para `porcelana.contacts` (`ON CONFLICT (phone_e164)`)
- [ ] `acquisition_source` = `import_{origem}`; `metadata.import_origem` preenchido
- [ ] **[FR28]** `metadata.consent_status = 'pending_first_contact'`; `apply_optout()` disponível; 1ª campanha oferece opt-out
- [ ] Contagem final validada vs. esperado (~398, menos duplicados)
- [ ] Smoke-test pós-carga (recomendação @qa story 1.3): 1 SELECT com sessão `authenticated` de membro vs. não-membro

## Critérios de Aceitação — Teste

- [ ] Correr o import 2x → contagem não muda (idempotência por `phone_e164`) ✅ provado em efémero
- [ ] Telefone local (`9XX XXX XXX`) → `+2449XXXXXXXX` ✅ provado
- [ ] 2 registos com mesmo telefone, nomes diferentes → no relatório de conflitos (não silenciados)

## Notas Técnicas

- **Bloqueado até o cliente entregar os CSVs.** Os artefactos estão prontos (enviar `INSTRUCOES-CLIENTE.md` + template).
- Import via **service_role** (RLS authenticated é só SELECT).
- Permite import incremental por lotes.
- Execução em produção = autoridade @devops.

## Definition of Done

- [ ] CSVs importados, ~398 contactos em `porcelana.contacts`
- [ ] Relatório de conflitos revisto com o cliente
- [ ] Idempotência confirmada em produção
- [ ] Conformidade FR28 (consent pending + opt-out disponível)
- [ ] @qa valida; @po fecha

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-11 | DB Sage | Story criada. Artefactos de import (template + instruções + script SQL) prontos e validados em efémero (E.164, dedup, idempotência). Bloqueada à espera dos CSVs do cliente. |
