---
story_id: "1.5"
title: "Conectar instância WhatsApp (uazapi) da Porcelana"
epic: "E1 — Fundação e Migração"
status: "Done"
executor: "@devops"
quality_gate: "@qa"
deploy_type: "supabase_migration"
accountable: "nelson-rodrigues"
depends_on: ["1.1"]
priority: "P0"
estimate: "0.5d"
prd_refs: ["NFR3", "CR1"]
---

# Story 1.5 — Conectar instância WhatsApp (uazapi) da Porcelana

**Epic:** E1 — Fundação e Migração
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Executor:** @devops | **Quality Gate:** @qa | **Deploy:** supabase_migration
**Status:** Ready
**Depende de:** Story 1.1 (✅ Done — tenant porcelana, tenant_id `d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1`)

---

## ⚡ Confirmação de independência (investigação DB Sage)

`public.whatsapp_instances` roteia por **`tenant_id`** (coluna confirmada). O processamento de webhooks usa **service_role** (não sessão de utilizador). Logo, esta story **NÃO depende da Story de Auth/JWT (1.6)** — o roteamento é backend, por instância→tenant_id.

Estado actual das instâncias: isilda (connected, 244954174841), natacha (connected), desperta (disconnected). **Porcelana ainda não tem instância.**

## Descrição

Como @devops, quero registar a instância WhatsApp Business da Porcelana em `public.whatsapp_instances` (scoped ao tenant porcelana) e ligá-la ao webhook uazapi, para que mensagens reais cheguem ao sistema e sejam roteadas para o schema porcelana.

## Fora de Âmbito [F2]

- O **código do router/webhook-handler do SIC GERAL** (mapeamento instância→tenant_id→schema) NÃO é alterado por esta story. Apenas se **confirma** (não implementa) que já roteia por `tenant_id` como faz para isilda/natacha.
- Configuração física da uazapi (conectar o número) é acção do cliente/operação, fora da migração.

## Critérios de Aceitação

- [ ] **[F4] Snapshot/registo do estado antes da escrita** (BD partilhada produção, 6 tenants — alinhado com gate da Story 1.1)
- [ ] Registo em `public.whatsapp_instances` com `tenant_id = d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1`, `name = 'Porcelana Beauty'`, `purpose` adequado (inbox/sales)
- [ ] `api_url` / `api_key` da uazapi configurados (credenciais da instância da Porcelana)
- [ ] `webhook_url` a apontar para o endpoint do SIC GERAL que processa mensagens
- [ ] Número WhatsApp Business da Porcelana conectado (`status = 'connected'`) — OU registo preparado se o número físico ainda não estiver disponível (estado `disconnected` aceitável até a cliente fornecer o número)
- [ ] Verificado: o roteamento por `tenant_id` direciona mensagens da instância da Porcelana para o schema `porcelana` (não para outro tenant)
- [ ] **[F3] Idempotência por guard `WHERE NOT EXISTS (tenant_id, name)`** — `whatsapp_instances` não tem UNIQUE natural (só PK `id`), por isso a chave de conflito é lógica (tenant_id + name)

## Critérios de Aceitação — Teste

- [ ] `SELECT count(*) FROM public.whatsapp_instances WHERE tenant_id = 'd7be8f8e...'` ≥ 1
- [ ] **[F3] Idempotência:** correr a migração 2x → 1 só instância da Porcelana (não duplica)
- [ ] As instâncias dos outros 3 tenants (isilda, natacha, desperta) permanecem intactas
- [ ] (Se número conectado) mensagem de teste recebida → registada em `porcelana.messages` via service_role
- [ ] **[F1] Isolamento negativo** (só validável com número conectado): mensagem de teste da instância da Porcelana NÃO aparece em `isilda.messages` nem `natacha.messages`

## Ficheiros a Criar

- `supabase/migrations/004_whatsapp_instance_porcelana.sql` — INSERT idempotente em `public.whatsapp_instances`

## Notas Técnicas

- uazapi.dev — mesmo gateway dos outros clientes.
- Credenciais (api_key, número): **dependem do cliente fornecer** a instância/número WhatsApp Business da Porcelana. Se ainda não disponível, registar o tenant_id + name e deixar `status='disconnected'` (não bloqueia o registo).
- O webhook do SIC GERAL deve já saber rotear por instância→tenant_id (confirmar como isilda/natacha o fazem).
- Execução em produção = autoridade exclusiva @devops.
- `webhook_idempotency` / `webhook_processed_messages` já existem no SIC GERAL (NFR3).

## Definition of Done

- [ ] Instância da Porcelana registada em `public.whatsapp_instances` (tenant_id correcto)
- [ ] Idempotente; outros tenants intactos
- [ ] Webhook configurado (ou documentado o que falta do lado do cliente: número/credenciais)
- [ ] @qa valida; @po fecha

## Change Log

| Data | Autor | Acção |
|---|---|---|
| 2026-06-10 | DB Sage → extraída do epic-1 | Story individual criada. Confirmada independência do Auth (roteamento por tenant_id/service_role). |
| 2026-06-10 | @po | Validate: GO Condicional 8/10 (4 condições F1-F4) |
| 2026-06-10 | DB Sage | Develop: migração 004 criada, 4 condições resolvidas, idempotência validada em efémero (2x→1 instância) |
| 2026-06-10 | Gage (@devops) | DEPLOY produção: instância `Porcelana Beauty` registada (disconnected, inbox, comercial, uazapi). 3 outros tenants intactos. Idempotência confirmada em prod. DEPLOY=success VERIFY=PASS. **Pendente do cliente: número WhatsApp + api_key.** Status → **Done**. |
