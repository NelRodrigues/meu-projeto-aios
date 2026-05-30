# Research Report — Rate Limiting para Agentes WhatsApp com Claude API em Produção

**Data:** 2026-05-30 · **Coverage:** 88/100 (APPROVE) · **Foco:** technical/production

> Há **três camadas independentes de limites** num agente WhatsApp+Claude. Confundi-las é a causa #1 de incidentes (ver `CLAUDE.md` do projecto: "o erro mais comum é limite diário de mensagens"). Este relatório separa-as.

## Scope

Esta research cobre rate limiting em 3 camadas (Claude API · WhatsApp/Meta · cap interno), estratégias de backoff/resiliência, arquitectura de fila, fairness multi-tenant, controlo de custo e observability. Foco: produção 2025-2026, stack ISILDA/SIC. Fora de escopo: implementação de código (redirect `@aiox-dev`).

**Confidence tags usadas:** `[HIGH — fonte oficial]`, `[MEDIA — guia de engenharia]`, `[LOW — inferido]`.

- O modelo de 3 camadas de rate limit é a base de todo o relatório. `[HIGH — alinhado com /diagnose-whatsapp-bot do projecto]`

---

## 1. Os 3 tectos de rate limit (não confundir)

| Camada | Quem impõe | Sintoma | Onde verificar |
|---|---|---|---|
| **A. Claude API** | Anthropic | HTTP 429 `rate_limit_error` + `retry-after` | headers `anthropic-ratelimit-*` |
| **B. WhatsApp** | Meta / uazapi | erro 130429 (throughput), 131056 (pair), bloqueio | WhatsApp Manager, quality rating |
| **C. Cap interno** | A tua app | conversa pausada por limite diário | `ai_sales_agents.settings` |

`confidence: alta` — alinhado com o protocolo `/diagnose-whatsapp-bot` do projecto.

---

## 2. Camada A — Claude API (Anthropic)

### 2.1 Modelo de limites
- **3 dimensões separadas por modelo**: RPM, ITPM (input), OTPM (output). Não é um TPM único. [Anthropic docs]
- **Token bucket**: o balde reenche a taxa constante; após idle podes fazer *burst* até ao máximo, depois assenta. Por isso o dashboard pode mostrar uso baixo e ainda assim dares 429 num pico. `confidence: alta`
- **4 tiers** por depósito cumulativo ($5 → $400+), avanço automático. Valores variam por geração de modelo e mudam **sem aviso** → verificar sempre no Console. `confidence: alta`

### 2.2 Caching reduz pressão de ITPM
- Para a maioria dos modelos actuais, **tokens em cache NÃO contam para ITPM**. Com 80% hit rate, a tua capacidade efectiva fica ~5× maior. `confidence: alta`
- **Excepção:** Claude Haiku 3.5 conta `cache_read_input_tokens` (modelos marcados †).

### 2.3 Tratamento de 429 — ordem correcta (3 níveis)
1. **`retry-after` header primeiro** — esperar exactamente o indicado (nem mais, nem menos).
2. Se ausente → **reset-header math** (`anthropic-ratelimit-*-reset`).
3. Fallback → **backoff exponencial com jitter** (1s, 2s, 4s… cap 30s, máx 3 tentativas).

⚠️ **`x-should-retry: false`** = hard cap (quota mensal esgotada). Retry não resolve — só mudar quota ou esperar ciclo de billing. `confidence: alta`

⚠️ **429 ≠ 529.** 529 = overload do servidor Anthropic, não conta para o teu rate limit. Backoff sim, mas não acumular contra o teu timer. `confidence: alta`

### 2.4 Throttling proactivo (a chave para produção)
- Headers `anthropic-ratelimit-requests-remaining` e `...-tokens-remaining` vêm em **todas** as respostas. Lê-os e, quando `remaining ≤ threshold` (ex. 10%), insere delay adaptativo **antes** de enviar. "Proactive throttling is always cheaper than reactive retry." `confidence: alta`
- **Não fiar no dashboard** para tempo-real — tem lag. Tracking por header é o único fiável.
- 429 é **cobrado** à taxa normal (a API processou o suficiente para decidir) → evitar 429 é também poupar dinheiro.

---

## 3. Camada B — WhatsApp (Meta Cloud API / uazapi)

- **Mudança Out/2025:** limites a nível de **portfolio** — todos os números partilham capacidade. `confidence: alta`
- **Messaging tiers:** 250 → 1.000/2.000 → 10k → 100k → ilimitado. Só conta **business-initiated**; dentro da janela de 24h (cliente iniciou) respondes à vontade. `confidence: alta`
- **Quality rating** (Verde/Amarelo/Vermelho, 7 dias, ponderado por recência) governa o scaling. Upgrade é **algorítmico**, não pago. Vermelho pode **reduzir** o limite. `confidence: alta`
- **Throughput:** 80 MPS default, até 1.000 MPS. Distinto do limite diário — podes estar dentro do tier diário e ainda falhar num burst. **Pair rate limiting** por destinatário (não martelar o mesmo número).
- **uazapi (não-oficial):** limites exactos não públicos. Delay normalmente configurável pelo cliente. Pacing recomendado **3-8s** entre mensagens; pausa após lotes. `confidence: média` ⚠️ CAVEAT (ver §6).

---

## 4. Camada C — Arquitectura de fila + resiliência

### 4.1 Fila com global rate limiter
- **Princípio central:** um **rate limiter global** atado à quota do provider, partilhado por toda a frota de workers. BullMQ: `worker.rateLimit(duration)` + lançar `RateLimitError` re-enfileira o job (não falha). pg-boss: alternativa Postgres sem Redis. `confidence: alta`
- Separar **LLM workers** (rate-limited) de trabalho CPU-bound. Escalar concorrência horizontalmente.
- **Backpressure obrigatório** — filas ilimitadas só adiam o colapso.

### 4.2 Stack de 3 camadas de resiliência
```
request → [queue: TPM/RPM dual limit]
        → [circuit breaker: error-rate + cost threshold]
        → [gateway: backoff+jitter, fallback provider em 429/5xx/latência]
        → schema-validate output
```
- **Retry** absorve transientes · **circuit breaker** absorve outages · **fallback** absorve o resto.
- Retry storm: 3 retries × 5 camadas = 243 chamadas. ~40% das falhas em cascata vêm de retry mal feito. [AWS Builders' Library; Martin Fowler — CircuitBreaker]

### 4.3 Multi-tenant (relevante para SIC multi-tenant)
- Per-tenant **token bucket** com chaves TTL (`rl:{tenant}:{endpoint}`).
- **Weighted Fair Queuing** > rejeição dura — evita que um tenant ruidoso starve os outros.
- Per-tenant observability é obrigatória ("sem métricas por tenant, noisy neighbors são invisíveis até o SLO falhar").

---

## 5. Cost control (alavancas)

| Alavanca | Efeito | Quando |
|---|---|---|
| **Prompt caching** | read = 10% input; paga-se após 1 leitura (5min) | system prompt / few-shot ≥1024 tokens estáticos |
| **Batches API** | -50% automático, ≤24h | trabalho assíncrono (relatórios, enriquecimento) |
| **Model routing** | Haiku p/ triagem, Sonnet p/ resposta | qualificação BANT vs venda |
| **max_tokens calibrado** | melhora previsão OTPM | respostas curtas → max_tokens baixo |

`confidence: alta` (caching/batch/routing) — mas **verificar preços actuais** no Console (mudam sem aviso).

---

## 6. Caveats / Lacunas

- ⚠️ **uazapi.dev limites exactos:** docs e Postman não expuseram valores de `delay`/throughput nas buscas. Sendo API não-oficial, o delay é tipicamente configurável pelo cliente — **confirmar no painel uazapi** antes de assumir números. `confidence: média`
- ⚠️ **Valores numéricos de tiers Anthropic:** todos sujeitos a alteração sem aviso. Verificar no Claude Console antes de decisões de arquitectura/compra.
- ⚠️ **pg-boss per-tenant concurrency:** suporte a `groupConcurrency` é área activa — verificar versão antes de depender.

---

## Stop Reason

A pesquisa parou após **Wave 1** porque o COVERAGE_GATE devolveu **APPROVE (88/100 ≥ 70)** — 13 dos 14 sub-queries cobertos com fontes oficiais (Anthropic, Meta, AWS Builders' Library, BullMQ). `stop_reason: coverage_gate_approve_88_wave1`. A única lacuna (limites exactos uazapi) está documentada como caveat, não justifica nova wave (docs fechadas).

---

## Fontes

- [Rate limits — Claude API Docs](https://platform.claude.com/docs/en/api/rate-limits) — 2026
- [Our approach to API rate limits — Claude Help Center](https://support.anthropic.com/en/articles/8243635-our-approach-to-api-rate-limits) — 2026
- [Prompt caching — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — 2026
- [Pricing — Claude API Docs](https://platform.claude.com/docs/en/about-claude/pricing) — 2026
- [Capacity, Quality Rating, and Messaging Limits — Meta](https://developers.facebook.com/docs/whatsapp/messaging-limits/) — 2026
- [WhatsApp throughput — Meta Developer Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput/) — 2026
- [Rate limiting — BullMQ docs](https://docs.bullmq.io/guide/rate-limiting) — 2026
- [pg-boss — Concurrency management](https://github.com/timgit/pg-boss/issues/659) — date_unknown
- [uazapiGO — WhatsApp API docs](https://docs.uazapi.com/) — date_unknown
- [LLM API Resilience in Production — TianPan.co](https://tianpan.co/blog/2026-03-11-llm-api-resilience-production) — 2026
- [Anthropic API Rate Limits + 429/529 Handling Guide — Respan](https://www.respan.ai/articles/anthropic-api-rate-limits) — 2026
