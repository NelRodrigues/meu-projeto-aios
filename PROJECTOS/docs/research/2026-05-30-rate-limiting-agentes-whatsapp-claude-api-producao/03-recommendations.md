# Recomendações — Rate Limiting Agentes WhatsApp + Claude API

> Recomendações de **research** (não código de produção). Para implementar → `@aiox-pm` (priorização) / `@aiox-dev` (execução).

## R1 — Diagnóstico em 3 camadas antes de qualquer fix (CRÍTICO)
Antes de assumir "créditos esgotados", verificar em ordem: (C) cap diário interno → (B) WhatsApp tier/quality → (A) Claude 429. Já é o protocolo `/diagnose-whatsapp-bot` do projecto — esta research **confirma** que essa ordem está correcta. Anthropic por último, e só com evidência (`x-should-retry`/headers).

## R2 — Throttling proactivo por header (não reactivo)
Ler `anthropic-ratelimit-tokens-remaining` / `...-requests-remaining` em cada resposta. Quando `≤10%`, inserir delay adaptativo antes da próxima chamada. Evita 429 (que é cobrado) e é mais barato que retry. Não fiar no dashboard (lag).

## R3 — Tratamento de 429 com ordem correcta
`retry-after` → reset-header → backoff exponencial+jitter (cap 30s, máx 3). Distinguir 429 vs 529 vs `x-should-retry:false`. Idealmente delegar ao SDK oficial + camada própria de logging/circuit-breaker.

## R4 — Fila com global rate limiter + circuit breaker
O processador de `mensagens_whatsapp` deve ter um rate limiter **global** atado à quota Claude (re-enfileira em 429, não falha) + circuit breaker para outages. Backpressure obrigatório.

## R5 — Caching agressivo do system prompt
O prompt de persona do agente (Márcia/Manuela/Isi) é estático e grande → `cache_control: ephemeral`. Reduz ITPM (tokens cacheados não contam) e custo (read = 10%). Maior alavanca de throughput+custo.

## R6 — Respeitar quality rating + pacing WhatsApp
Pacing 3-8s entre mensagens business-initiated, opt-in obrigatório, personalização (anti-spam). Monitorizar quality rating no WhatsApp Manager — Vermelho reduz o limite.

## R7 — Per-tenant fairness no SIC multi-tenant
No SIC multi-tenant, token bucket per-tenant + weighted fair queuing para um cliente ruidoso não starve os outros. Métricas por tenant.

## R8 — Observability de rate limit
Logar cada retry (tentativa, wait calculado, headers que informaram a decisão) + transições do circuit breaker + taxa de 429 (alertar se >1%). Vira o teu incident log.
