# Fase 6 — Resiliencia do Agente WhatsApp
## Stories 11.1 a 11.5

**Epic:** E11 — Resiliencia do Agente WhatsApp
**Origem:** Research `docs/research/2026-05-30-rate-limiting-agentes-whatsapp-claude-api-producao/` (coverage 88/100, citation APPROVE)
**Motivacao:** Os 3 tectos de rate limit (Claude API / WhatsApp / cap interno) sao a causa #1 de incidentes no agente. Esta fase implementa as 5 alavancas de maior impacto (quick-wins QW-1 a QW-5).

---

## Story 11.1 — Caching do System Prompt do Agente

**Epic:** E11 — Resiliencia do Agente WhatsApp
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Research ref:** quick-wins.md QW-1 · 02-research-report.md §2.2, §5
**Hub target:** `supabase/functions/_shared/llm-client.ts`

```yaml
story_id: "11.1"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["coderabbit", "manual-review"]
accountable: "pedro-valerio"
deploy_type: "supabase_migration"  # edge function redeploy (functions/_shared)
```
> **Code Reality (PO):** `llm-client.ts` chama a Claude API via `fetch` directo em 4 sítios (L72/116/176/230), todos SEM `cache_control`. ADAPTAR esses 4 call-sites (não criar ficheiro novo).

### Descricao
Como @dev, quero cachear o bloco de system prompt da persona (Isi) via prompt caching da Anthropic, para reduzir pressao de ITPM e custo. Tokens cacheados nao contam para ITPM (na maioria dos modelos) e o read custa 10% do input.

### Criterios de Aceitacao
- [ ] Adicionar `cache_control: { type: "ephemeral" }` ao bloco system prompt no `llm-client.ts`
- [ ] Garantir que o bloco cacheado tem >=1024 tokens (requisito minimo do caching)
- [ ] Validar que o modelo em uso NAO esta na lista de excepcoes (Haiku 3.5 conta cache_read para ITPM)
- [ ] Medir hit rate apos deploy (campo `cache_read_input_tokens` na resposta) e registar baseline
- [ ] Documentar reducao de custo/ITPM observada

### Ficheiros a Editar
- `supabase/functions/_shared/llm-client.ts`

### Notas
- ⚠️ Verificar preco/comportamento actual no Claude Console (muda sem aviso).

---

## Story 11.2 — Captura e Log dos Headers anthropic-ratelimit-*

**Epic:** E11 — Resiliencia do Agente WhatsApp
**Prioridade:** P0 | **Estimativa:** 1 dia
**Research ref:** quick-wins.md QW-2 · 02-research-report.md §2.4
**Hub target:** `supabase/functions/_shared/llm-client.ts` + `ai_agent_logs`

```yaml
story_id: "11.2"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["coderabbit", "manual-review"]
accountable: "pedro-valerio"
deploy_type: "supabase_migration"  # edge function redeploy; NO new migration (usa data JSONB existente)
```
> **Code Reality (PO):** `ai_agent_logs` (migration 008) já tem `data JSONB` + `tokens_input/output`. Logar headers no campo `data` JSONB — **migration nova NÃO necessária**. AC ajustado em conformidade.

### Descricao
Como @dev, quero capturar os headers `anthropic-ratelimit-*` em cada resposta da Claude API e logar `tokens-remaining` / `requests-remaining` em `ai_agent_logs`, para ter visibilidade real-time da quota (o dashboard da Anthropic tem lag e nao serve para tempo-real).

### Criterios de Aceitacao
- [ ] Ler headers `anthropic-ratelimit-requests-remaining` e `anthropic-ratelimit-tokens-remaining` de TODAS as respostas (sucesso e 429)
- [ ] Persistir os valores em `ai_agent_logs` (novos campos ou metadata JSON)
- [ ] Logar tambem o limite mais restritivo (qual dimensao esta mais perto do 429)
- [ ] Base preparada para throttling proactivo (Story futura) — NAO implementa o throttle ainda
- [ ] Distinguir `x-should-retry: false` (hard cap mensal) nos logs
- [ ] Usar `log_type` dedicado (ex. `rate_limit_snapshot`) para a Story 11.4 conseguir filtrar

### Ficheiros a Editar
- `supabase/functions/_shared/llm-client.ts` (ADAPTAR os 4 call-sites de fetch)
- `ai_agent_logs.data` (JSONB existente — sem migration nova)

---

## Story 11.3 — Handler de 429 com Ordem Correcta (retry-after → backoff+jitter)

**Epic:** E11 — Resiliencia do Agente WhatsApp
**Prioridade:** P0 | **Estimativa:** 1 dia
**Research ref:** quick-wins.md QW-3 · 02-research-report.md §2.3, §4.2
**Hub target:** `supabase/functions/ai-sales-agent/queue-processor.ts`

```yaml
story_id: "11.3"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["coderabbit", "manual-review"]
accountable: "pedro-valerio"
deploy_type: "supabase_migration"  # edge function redeploy
```
> **Code Reality (PO):** `queue-processor.ts` já importa `sleep` (helpers.ts L5, usado L392) e tem `catch` (L449) mas SEM tratamento específico de 429/`retry-after`. ADAPTAR o catch existente + o ponto de chamada em `llm-client.ts`.

### Descricao
Como @dev, quero substituir o retry fixo por um handler de 429 com a ordem correcta: `retry-after` header primeiro → reset-header math → backoff exponencial com jitter (cap 30s, max 3 tentativas). Distinguir 429 (rate limit), 529 (overload) e `x-should-retry: false` (hard cap).

### Criterios de Aceitacao
- [ ] Respeitar `retry-after` exactamente quando presente (nem mais, nem menos)
- [ ] Fallback: backoff exponencial com jitter (1s, 2s, 4s... cap 30s)
- [ ] Maximo 3 tentativas, depois falhar com erro claro (re-enfileirar, nao perder mensagem)
- [ ] Detectar `x-should-retry: false` → nao re-tentar (so muda quota/billing resolve)
- [ ] Tratar 529 (overload) com backoff mas SEM contar contra o timer de rate limit
- [ ] Logar cada retry (tentativa, wait calculado, headers que informaram a decisao)

### Ficheiros a Editar
- `supabase/functions/ai-sales-agent/queue-processor.ts`
- `supabase/functions/_shared/llm-client.ts` (se o retry viver aqui)

---

## Story 11.4 — Alerta de Taxa de 429 > 1%

**Epic:** E11 — Resiliencia do Agente WhatsApp
**Prioridade:** P1 | **Estimativa:** 0.5 dia
**Research ref:** quick-wins.md QW-4 · 02-research-report.md §2.4, R8
**Hub target:** `ai_agent_logs` + monitor/notificacao

```yaml
story_id: "11.4"
executor: "@db-sage"
quality_gate: "@dev"
quality_gate_tools: ["coderabbit", "manual-review"]
accountable: "pedro-valerio"
deploy_type: "supabase_migration"  # RPC/migration nova para a query de taxa
```
> **Code Reality (PO):** RPC nova consome `ai_agent_logs` (existe). Executor = `@db-sage` (trabalho de RPC/migration), quality gate `@dev`. Depende de 11.2 (log_type `rate_limit_snapshot`).

### Descricao
Como Isi/operador, quero ser alertado quando a taxa de erros 429 ultrapassar 1% nas ultimas 24h, para detectar um incidente de rate limit antes de o cliente reclamar. Alinha com o protocolo `/diagnose-whatsapp-bot`.

### Criterios de Aceitacao
- [ ] Query que calcula taxa de 429 sobre total de chamadas nas ultimas 24h (a partir de `ai_agent_logs`)
- [ ] Alerta (notificacao Isi / cron) quando taxa > 1%
- [ ] Incluir no alerta qual a dimensao mais provavel (RPM vs TPM) com base nos headers logados (Story 11.2)
- [ ] Documentar como base do "incident log" de rate limit

### Ficheiros a Criar/Editar
- Migration/RPC para a query de taxa de 429
- Integrar no sistema de notificacoes existente (`use-notifications.ts` / cron)

### Dependencias
- Depende de Story 11.2 (headers logados) para enriquecer o alerta.

---

## Story 11.5 — Pacing 3-8s entre Mensagens WhatsApp

**Epic:** E11 — Resiliencia do Agente WhatsApp
**Prioridade:** P1 | **Estimativa:** 0.5 dia
**Research ref:** quick-wins.md QW-5 · 02-research-report.md §3
**Hub target:** `supabase/functions/ai-sales-agent/queue-processor.ts` (delay uazapi)

```yaml
story_id: "11.5"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: ["coderabbit", "manual-review"]
accountable: "pedro-valerio"
deploy_type: "supabase_migration"  # edge function redeploy
```
> **Code Reality (PO):** `sleep` já disponível em helpers.ts. BLOQUEADOR PARCIAL: parâmetro `delay` exacto da uazapi não confirmado (curiosity_queue.yaml) — resolver antes de implementar.

### Descricao
Como @dev, quero garantir um delay configuravel (3-8s) entre envios business-initiated via uazapi, para respeitar o pair rate limiting e proteger a quality rating do numero WhatsApp (Verde/Amarelo/Vermelho — Vermelho reduz o limite).

### Criterios de Aceitacao
- [ ] Delay configuravel entre mensagens business-initiated (default 3-8s, randomizado)
- [ ] Distinguir respostas dentro da janela 24h (cliente iniciou — sem cap) de business-initiated (conta para tier)
- [ ] Nao aplicar delay desnecessario a respostas reactivas dentro da janela
- [ ] Confirmar parametro `delay` exacto da uazapi no painel (limites nao publicos — ver curiosity_queue.yaml)

### Ficheiros a Editar
- `supabase/functions/ai-sales-agent/queue-processor.ts`

### Notas
- ⚠️ uazapi e API nao-oficial; delay tipicamente configuravel pelo cliente. Confirmar valores no painel antes de assumir.

---

## Sequencia Sugerida

```
11.1 (Caching)  ─┐
11.2 (Headers)  ─┼→ 11.3 (Handler 429) → 11.4 (Alerta, depende de 11.2)
11.5 (Pacing)   ─┘
```

- **11.1 + 11.2** independentes, podem ir em paralelo (ambos tocam `llm-client.ts` — coordenar).
- **11.3** beneficia de 11.2 (headers para o backoff math) mas nao bloqueia.
- **11.4** depende de 11.2.
- **11.5** independente.

---

*-- Derivado de /tech-research · research dossier 2026-05-30*

---

## 🤖 CodeRabbit Integration

**Status:** Enabled (core-config.yaml). Aplica-se a todas as stories 11.1-11.5.
- **Agente primário:** @dev (todas as stories de código); @db-sage para 11.4 (RPC).
- **Quality gates:** Pre-Commit + Pre-PR (severidade ≥ MEDIUM). Pre-Deployment para 11.4 (migration).
- **Focus areas:** error handling (11.3), token/header parsing (11.2), idempotência de retry (11.3), segurança de logs (11.2 — não logar secrets/PII).
- **Self-healing:** máx 2 iterações por story.

---

## Change Log

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-05-30 | @aiox-pm (derivado de research) | Criação do Epic E11 + stories 11.1-11.5 a partir de quick-wins.md |
| 2026-05-30 | @po (Pax) | Validado 8/10 [GO Condicional]. Epic E11 (standalone ISILDA). 5 stories irmãs analisadas. Code Reality Check: 4 ficheiros-alvo confirmados (todos EDIT, 0 violações IDS). Auto-fix: adicionado frontmatter AIOX (executor/quality_gate/accountable/deploy_type) às 5 stories; corrigido AC de 11.2 (data JSONB existente, sem migration); executor de 11.4 → @db-sage; secção CodeRabbit. Condições: 11.5 bloqueada parcialmente até confirmar delay uazapi; 11.4 depende de 11.2. |
| 2026-06-04 | @dev | Base de conhecimento da agente da Delicias da Isi alinhada para Soraya, com prompt elegante, regras de contexto e horarios actualizados para 08h00-18h00. |
