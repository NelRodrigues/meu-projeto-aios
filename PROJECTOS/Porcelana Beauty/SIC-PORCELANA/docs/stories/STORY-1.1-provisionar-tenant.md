---
story_id: "1.1"
title: "Provisionar tenant porcelana no SIC GERAL"
epic: "E1 — Fundação e Migração"
status: "Done"
executor: "@db-sage"
quality_gate: "@po"
deploy_type: "supabase_migration"
accountable: "nelson-rodrigues"
depends_on: []
priority: "P0"
estimate: "0.5d"
prd_refs: ["ADR-001v2", "rls-audit-porcelana"]
---

# Story 1.1 — Provisionar tenant `porcelana` no SIC GERAL

**Epic:** E1 — Fundação e Migração
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Executor:** @db-sage | **Quality Gate:** @po | **Deploy:** supabase_migration
**Status:** Done

---

## Descrição

Como administrador da Marca Digital, quero registar a Porcelana Beauty como tenant no projecto SIC GERAL (`achtvzbcczmcbvjkdjry`), para que o isolamento RLS por schema funcione antes de qualquer dado entrar.

**Contexto:** o SIC GERAL é multi-tenant por schema (ADR-001 v2). Já existem 5 tenants (`isilda`, `desperta`, `natacha`, `crm_elsa`, `crm_nelma`). A Porcelana precisa de um registo em `public.tenants` com `db_schema='porcelana'` antes de as migrações 000-002 fazerem sentido — sem o tenant registado, `porcelana.is_member()` devolve sempre `false` e ninguém vê dados.

## Critérios de Aceitação

- [ ] **Snapshot da BD criado antes de qualquer escrita** (BD partilhada com 5 clientes activos)
- [ ] Registo inserido em `public.tenants`:
  - `slug = 'porcelana'`
  - `db_schema = 'porcelana'`
  - `display_name = 'Porcelana Beauty'`
  - `business_name = 'Porcelana Beauty'`
  - `country = 'AO'`
  - `status = 'active'`
  - `owner_name = 'Yolenia Balaca'`
  - `timezone = 'Africa/Luanda'`
- [ ] `tenant_id` (UUID gerado) capturado e documentado (usado no JWT e `tenant_users`)
- [ ] Pelo menos 1 utilizador associado em `public.tenant_users` (operador Marca Digital) com `is_active = true`
- [ ] Verificado: o registo NÃO afecta nenhum outro tenant (contagem de `public.tenants` = 6 após inserção, os 5 anteriores intactos)
- [ ] Migração idempotente (re-correr não duplica — `ON CONFLICT (slug) DO NOTHING` ou equivalente)

## Critérios de Aceitação — Teste

- [ ] `SELECT db_schema FROM public.tenants WHERE slug='porcelana'` → `'porcelana'`
- [ ] `SELECT count(*) FROM public.tenants` → 6 (5 anteriores + porcelana)
- [ ] Outros tenants intactos: `SELECT count(*) FROM public.tenants WHERE slug IN ('isilda','desperta','natacha','crm_elsa','crm_nelma')` → 5

## Ficheiros a Criar

- `supabase/migrations/003_register_tenant_porcelana.sql` — INSERT idempotente em `public.tenants` + `public.tenant_users`

## Notas Técnicas

- **Pré-requisito de Story 1.2** (aplicar migrações 000-002) — sem tenant registado, RLS bloqueia tudo.
- Operação em **BD partilhada de produção** — snapshot obrigatório antes (AC1).
- Aplicar via Supabase MCP `apply_migration`.
- O `tenant_id` gerado deve ser propagado para o JWT (`app_metadata.tenant_id`) dos utilizadores da Porcelana — config Supabase Auth (pode ser story separada de Auth).
- Estrutura de `public.tenants` confirmada na BD: tem `slug`, `db_schema`, `display_name`, `business_name`, `country`, `status`, `owner_name`, `owner_email`, `timezone`, `plan`, etc.

## Definition of Done

- [ ] Migração 003 criada e validada (idempotente)
- [ ] Snapshot pré-deploy registado
- [ ] Tenant `porcelana` registado em produção
- [ ] Testes de não-regressão (outros 5 tenants intactos) passam
- [ ] @po valida closure

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-10 | River (SM) → extraída do epic-1 | Story individual criada com frontmatter para full-sdc |
| 2026-06-10 | DB Sage | Migração 003 criada; QA CONCERNS 82/100; I1 resolvido (introspecção real); dry-run em produção PASSOU (BEGIN/ROLLBACK, 0 persistido, 5 tenants intactos) |
| 2026-06-10 | DB Sage | I4/I2/I6 resolvidos: admin = Nelson Rodrigues (ketson85@hotmail.com, UUID c3aefafe... confirmado em auth.users), role `owner`. owner_email actualizado. Dry-run final completo PASSOU. Pronto para @devops aplicar. |
| 2026-06-10 | Gage (@devops) | DEPLOY EM PRODUÇÃO via Management API `/migrations` (SIC GERAL, achtvzbcczmcbvjkdjry). Baseline: 5 tenants. Pós-deploy: 6 tenants, `porcelana` (db_schema=porcelana, status=active, plan=starter, owner=Yolenia Balaca) registado. Admin owner associado (user_id c3aefafe...). 5 clientes anteriores INTACTOS. Idempotência confirmada (1 row, 0 duplicados). Migração registada no histórico (version 20260610134612). **tenant_id = d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1**. DEPLOY=success, VERIFY=PASS. |
| 2026-06-10 | Pax (@po) | **CLOSURE**. CHK-8 Deploy verification gate: PASS (deploy verificado independentemente — total_tenants=6, porcelana active/starter, 5 clientes intactos, tenant_id=d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1, admin owner associado, migração 20260610134612 no histórico). CHK-9 Registry governance: tenant_id registado em `epic-1-fundacao.md` e `INDEX-mvp.md`. CHK-10 IDS post-check: REUSE da infra multi-tenant existente (sem nova estrutura criada). **Status Ready → Done.** Follow-up (não bloqueia): Story 1.2 (migrações 000-002) desbloqueada; Story de Auth (propagar tenant_id → JWT app_metadata); [F4] confirmar owner_email real da Yolenia (actualmente aponta para admin de gestão). |
