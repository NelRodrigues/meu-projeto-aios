---
story_id: "2.1"
title: "Configurar agente + system_prompt (persona/FAQ/objecções)"
epic: "E2 — Agente de Atendimento"
status: "Ready"
executor: "@dev"
quality_gate: "@qa"
deploy_type: "supabase_migration"
accountable: "nelson-rodrigues"
depends_on: ["1.1", "1.2"]
priority: "P0"
estimate: "1.5d"
prd_refs: ["FR1", "FR2", "FR5", "FR7"]
---

# Story 2.1 — Configurar agente + system_prompt (persona/FAQ/objecções)

**Epic:** E2 — Agente de Atendimento
**Prioridade:** P0 | **Estimativa:** 1.5 dia
**Executor:** @dev | **Quality Gate:** @qa | **Deploy:** supabase_migration
**Status:** Ready
**Depende de:** 1.1 (tenant) + 1.2 (schema). **NÃO depende** dos 398 contactos.

---

## Descrição

Como @dev, quero configurar o agente da Porcelana em `public.ai_sales_agents` (com `tenant_id` da Porcelana) com o system_prompt completo (persona feminina formal, FAQ 11 secções, gestão de objecções), para que responda no tom certo e nunca abra com preços.

**Mecânica real (confirmada na BD):** o agente vive em `public.ai_sales_agents` com `tenant_id = d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1` + `instance_id` (a instância WhatsApp criada na Story 1.5). NÃO no schema porcelana.

## Fontes de conteúdo (prontas)

- `Docs Varios/FAQ_Agente_WhatsApp_Porcelana_Beauty.md.docx` — 11 secções de scripts
- `Docs Varios/Guia_Objecoes_Agente_WhatsApp_Porcelana_Beauty.md.docx` — preço/tempo/confiança
- Acta de kick-off — persona feminina, tom formal, regra de não-preço

## Critérios de Aceitação

- [ ] Agente registado em `public.ai_sales_agents` com `tenant_id = d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1` e `instance_id` da instância da Porcelana (Story 1.5)
- [ ] `name` = "Assistente Porcelana Beauty" (ou similar); `is_active` adequado (false até testes internos da 2.7)
- [ ] system_prompt inclui: persona feminina, tom formal e caloroso ("a senhora {Nome}"), suporta "o senhor {Nome}" (FR1, depilação masculina)
- [ ] **Regra de ouro:** nunca abrir com preços — qualificar → propor avaliação → só dar valor se insistir
- [ ] Conhecimento das 11 secções do FAQ incorporado (boas-vindas, qualificação, horários, faciais, corporais, laser, cera, home care, preços, agendamento, encerramento)
- [ ] Gestão de objecções: validar → compreender → reposicionar → próximo passo leve (do Guia de Objecções)
- [ ] Nunca se identifica como robô/IA
- [ ] Horário correcto no prompt (Ter-Sex 08-19h30, Sáb 08-16h, Dom 10-17h, Seg fechado)
- [ ] `model` adequado (claude-sonnet para conversa); `settings` com working_hours
- [ ] ~~Templates prontos do FAQ carregados em `public.message_templates`~~ → **MOVIDO para Story 2.1b** (ver Resolution Tracking)

## Critérios de Aceitação — Teste

- [ ] Cliente pergunta preço directo → agente qualifica primeiro (não dá valor)
- [ ] Cliente diz "está muito caro" → agente valida e propõe avaliação (não pressiona)
- [ ] Cliente do sexo masculino (depilação) → tratamento "o senhor"

## Notas Técnicas

- Reusar a estrutura do seed do agente da ISILDA (Soraya) como ponto de partida — `public.ai_sales_agents` tem: system_prompt, personality_traits, target_stages, settings, model, temperature, max_tokens, cadence_steps, tenant_id, instance_id.
- Conteúdo das mensagens em pt-AO; identificadores/tools em inglês (decisão @po story validation).
- Deploy = inserção/config via migração ou seed (autoridade @devops).
- Tools do agente (qualify_lead, etc.) ficam nas stories 2.2/2.3/2.5 — esta é só persona/prompt/conhecimento.

## Definition of Done

- [x] Agente registado com tenant_id + instance_id correctos (migração 005)
- [x] system_prompt completo (persona + FAQ + objecções + horários)
- [~] ~~Templates carregados~~ → DEFERRED para Story 2.1b
- [x] Testes de tom/não-preço passam (validados pelo @dev + @qa)
- [ ] @qa valida (✅ PASS 92/100); @po fecha

## Resolution Tracking (QA Gate)

| Issue | Sev | Estado | Acção |
|---|---|---|---|
| Templates `message_templates` não nesta migração | MEDIUM | ✅ **DEFERRED** | Movido para **Story 2.1b** (criar) — carregar templates do FAQ em `public.message_templates` scoped tenant |
| tenant_id hardcoded vs resolução por slug | LOW | ✅ WON'T_FIX | Aceitável para prod single-instance; dívida técnica anotada |
| holidays = horário sábado | LOW | ✅ WON'T_FIX | Fiel ao FAQ; calendário de feriados fora de âmbito |

**Total: 3/3 resolvidos.** Gate PASS 92/100. Apto para deploy (is_active=false).

## File List

- `supabase/migrations/005_seed_agent_porcelana.sql` (CREATE) — seed idempotente do agente "Assistente Porcelana Beauty" em `public.ai_sales_agents` (tenant porcelana + instance da 1.5), com system_prompt completo (persona feminina + regra de não-preço + FAQ 11 secções + objecções), `is_active=false`, `model=claude-sonnet-4-5`, `settings.working_hours`.

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-11 | DB Sage → extraída do epic-2 | Story individual criada com frontmatter para full-sdc. Executor @dev. |
| 2026-06-11 | @dev (Dex) | Implementada migração 005 (seed do agente + system_prompt). FAQ e Guia de Objecções extraídos via pandoc e incorporados. Validada em Postgres efémero local: aplica limpo, idempotente (2x→1 agente), todos os requisitos de conteúdo verificados. NÃO aplicada em produção (deploy = @devops). |
