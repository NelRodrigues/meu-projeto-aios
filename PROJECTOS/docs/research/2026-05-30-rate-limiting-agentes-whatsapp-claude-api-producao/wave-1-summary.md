# Wave 1+2 Summary

**coverage_score:** 88/100
**decision:** stop (APPROVE — ≥70 no COVERAGE_GATE)
**sources_count:** ~30 (oficiais Anthropic/Meta + AWS Builders' Library + BullMQ/pg-boss docs + guias eng.)

## Key Findings (com citações)

### Anthropic Claude API rate limits
- Limites separados: **RPM, ITPM, OTPM** por modelo (não um TPM combinado). [platform.claude.com/docs/en/api/rate-limits]
- **4 tiers** ($5→$400+ depósito cumulativo), avanço automático. Tier 1 Sonnet ~20k ITPM/4k OTPM; Tier 4 até 2M ITPM. Variam por modelo e **sem aviso**.
- **Token bucket algorithm** — permite bursts após idle, depois assenta na taxa sustentável.
- **Tokens cacheados NÃO contam para ITPM** (modelos sem †) → cache hit 80% = 5× capacidade efectiva. Haiku 3.5 é excepção (conta cache_read).
- 429 traz **`retry-after`** header + `x-should-retry` (se false = hard cap, mudar quota não adianta retry).
- **529 ≠ 429**: 529 = overload do servidor (não conta para backoff de rate limit).
- Headers próprios: **`anthropic-ratelimit-*`** (não `x-ratelimit-*`), aparecem em TODAS as respostas → throttling proactivo. Console tem lag → não fiar para tempo-real.

### Backoff & resiliência (3-layer stack)
- **Retry-After primeiro**, depois reset-header math, depois backoff exponencial com jitter. Cap ~30s, máx 3 tentativas.
- **Jitter é essencial** — sem ele, thundering herd / synchronization storm (Stripe usa jitter por isto).
- **Circuit breaker** (Closed/Open/Half-Open) para outages sustentados; **fallback chain** multi-provider é a camada mais esquecida.
- Retry storm: 3 retries × 5 camadas = 243 chamadas. ~40% das falhas em cascata vêm de retry mal feito. [AWS Builders' Library; Martin Fowler]

### Queue architecture
- **Global rate limiter** atado à quota do provider (BullMQ `worker.rateLimit()` + `RateLimitError` re-enfileira em vez de falhar). [docs.bullmq.io/guide/rate-limiting]
- Separar LLM workers (rate-limited) de CPU-bound. Escalar concorrência horizontalmente.
- **pg-boss** (Postgres, sem Redis) viável; per-tenant concurrency precisa verificar suporte. BullMQ Pro para per-group.

### Multi-tenant fairness
- Per-tenant **token bucket** com chaves TTL (`rl:{tenant}:{endpoint}`), Lua atómico no Redis.
- **Weighted Fair Queuing** > rejeição dura (free tier 1/10 do enterprise, ninguém starva).
- Soft limits / traffic shaping > drop. Layered enforcement (gateway+service+data). Per-tenant observability obrigatória.

### WhatsApp-side (Meta Cloud API)
- **Out/2025:** limites passaram a nível de **portfolio** (números partilham capacidade).
- Tiers: 250 → 1.000/2.000 → 10k → 100k → ilimitado (só business-initiated; janela 24h de resposta é livre).
- **Quality rating** (Verde/Amarelo/Vermelho, 7 dias) governa scaling. Upgrade é algorítmico, não pago.
- Throughput: **80 MPS default**, até 1.000 MPS. Pair rate limiting por destinatário. Erros 130429 (throughput), 131056 (pair).

### Cost control
- **Batches API**: -50% automático, assíncrono ≤24h. **Prompt caching**: read = 10% do input, write 1.25× (5min)/2× (1h). Stacks com batch.
- Cachear conteúdo estático ≥1024 tokens (system, few-shot, docs). Model routing Haiku vs Sonnet.

## Remaining gaps
- Limites exactos de **uazapi.dev** não públicos (docs/Postman fechados) → uazapi é não-oficial, delay configurável pelo cliente; aplicar pacing 3-8s. **CAVEAT documentado.**

## Best sources
- platform.claude.com/docs/en/api/rate-limits (oficial)
- developers.facebook.com/docs/whatsapp/messaging-limits (oficial)
- AWS Builders' Library — Timeouts/Retries/Backoff; Martin Fowler — CircuitBreaker
- docs.bullmq.io/guide/rate-limiting
