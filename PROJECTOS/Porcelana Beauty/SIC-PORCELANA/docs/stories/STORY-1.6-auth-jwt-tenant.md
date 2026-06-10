---
story_id: "1.6"
title: "Auth: propagação do tenant_id no JWT (refinamento)"
epic: "E1 — Fundação e Migração"
status: "Ready"
executor: "@architect"
quality_gate: "@po"
deploy_type: "none"
accountable: "nelson-rodrigues"
depends_on: ["1.1", "1.2"]
priority: "P2"
estimate: "0.5d"
prd_refs: ["ADR-001v2", "NFR6"]
---

# Story 1.6 — Auth: propagação do tenant_id no JWT (refinamento)

**Epic:** E1 — Fundação e Migração
**Prioridade:** P2 (refinamento — NÃO bloqueia leitura RLS) | **Estimativa:** 0.5 dia
**Executor:** @architect | **Quality Gate:** @po | **Deploy:** none
**Status:** Ready

---

## ⚡ Descoberta que reclassifica esta story (investigação DB Sage, 10 Jun 2026)

**O problema do JWT NÃO bloqueia a leitura RLS da Porcelana.** Investigação na BD de produção revelou:

1. O RLS do schema `porcelana` usa **`porcelana.is_member()`**, que verifica `tenant_users JOIN tenants WHERE db_schema='porcelana'` — a **associação real**, NÃO o JWT `tenant_id`.
2. Teste real: o admin Nelson (`ketson85@hotmail.com`, em `tenant_users` da porcelana com role `owner`) → `is_member()` devolve **`true`**, mesmo com o JWT `app_metadata.tenant_id` a apontar para a isilda (`dd2fbb2e...`).
3. **Logo: a leitura autenticada da Porcelana JÁ FUNCIONA.** A Story 1.3 (re-auditar RLS) está desbloqueada de verdade.

**O que ESTA story trata** (refinamento, não bloqueador): o `get_tenant_id()` do SIC GERAL lê do JWT (`app_metadata.tenant_id`). Edge Functions / código que dependam de `get_tenant_id()` (em vez de `is_member()`) resolveriam o tenant errado para utilizadores multi-tenant.

## Contexto do problema multi-tenant

- O `get_tenant_id()` lê **exclusivamente** `app_metadata.tenant_id` do JWT (1 valor) com fallback default.
- **Não existe** mecanismo de "tenant activo" no SIC GERAL (sem `switch_tenant()`, sem coluna `active_tenant`).
- O Nelson está em **2 tenants** (isilda admin + porcelana owner) mas o JWT só guarda 1 → aponta para isilda.
- Impacto: código que use `get_tenant_id()` (não `is_member()`) vê a isilda quando o Nelson gere a Porcelana.

## Descrição

Como @architect, quero definir como o tenant_id é resolvido para utilizadores multi-tenant, para que código baseado em `get_tenant_id()` resolva o tenant correcto.

## Critérios de Aceitação

- [ ] Decisão de arquitectura documentada (ADR): modelo para utilizador multi-tenant. Opções:
  - (A) **Tenant activo selecionável** — adicionar mecanismo (coluna `active_tenant_id` em profiles/tenant_users + função `set_active_tenant` + `get_tenant_id()` lê dela)
  - (B) **User dedicado por tenant** — Porcelana tem o seu próprio user de gestão (ex.: porcelana@marcadigital.ao ou a Yolenia), JWT aponta só para porcelana
  - (C) **App-level tenant selection** — a app passa o tenant_id explícito nas chamadas (não via get_tenant_id global)
- [ ] Se (A) ou (B): implementação e teste de que o Nelson resolve a porcelana quando gere a Porcelana
- [ ] Confirmar que a escolha não quebra os outros 5 tenants (especialmente a isilda do Nelson)
- [ ] Documentar para a equipa: como um novo cliente multi-tenant é configurado

## Notas Técnicas

- **NÃO bloqueia o MVP de leitura** — o RLS via `is_member()` já isola correctamente.
- Afecta sobretudo: Edge Functions do agente que escrevam dados scoped por `get_tenant_id()`, e a UI de gestão se mostrar "tenant actual".
- Recomendação preliminar (DB Sage): para a Yolenia (utilizadora final da Porcelana, single-tenant), opção (B) é trivial — ela só pertence à porcelana. O problema só existe para o Nelson (gestor multi-tenant), e aí (A) ou (C) é mais limpo.
- Esta story é de **design** (deploy_type: none) — não aplica migração.

## Definition of Done

- [ ] ADR de modelo multi-tenant user escrito e aprovado
- [ ] Decisão A/B/C tomada e justificada
- [ ] Se implementação necessária: testada sem quebrar outros tenants
- [ ] @po valida

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-10 | DB Sage | Story criada após investigação. Descoberta: is_member() resolve a leitura RLS independente do JWT → reclassificada de P0-bloqueador para P2-refinamento. Story 1.3 desbloqueada. |
