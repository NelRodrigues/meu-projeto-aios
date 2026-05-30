# Rate Limiting para Agentes WhatsApp com Claude API em Produção

**Data:** 2026-05-30 · **Coverage:** 88/100 (APPROVE) · **Citations:** APPROVE · **Render tier:** rich

## TL;DR

Um agente WhatsApp+Claude tem **3 camadas independentes de rate limit** que não se devem confundir: **(A) Claude API** (RPM/ITPM/OTPM por modelo, token bucket, 429 com `retry-after`), **(B) WhatsApp/Meta** (tiers de mensagens a nível portfolio desde Out/2025, quality rating, 80 MPS), e **(C) cap diário interno** da app. A causa #1 de incidentes é diagnosticar a camada errada (confirma o protocolo `/diagnose-whatsapp-bot`).

**As 4 alavancas de maior impacto:**
1. **Caching do system prompt** — tokens cacheados não contam para ITPM + read a 10% do custo.
2. **Throttling proactivo por header** (`anthropic-ratelimit-*`) — mais barato que retry; 429 é cobrado.
3. **429 na ordem certa** — `retry-after` → reset-header → backoff+jitter; distinguir 429/529/`x-should-retry`.
4. **Fila com global rate limiter + circuit breaker** — re-enfileira em 429, não falha.

## Índice

| Ficheiro | Conteúdo |
|---|---|
| `00-query-original.md` | Query + contexto inferido + guardrails |
| `01-deep-research-prompt.md` | Brief estratégico + 14 sub-queries |
| `02-research-report.md` | Achados completos (3 camadas + resiliência + custo) |
| `03-recommendations.md` | 8 recomendações accionáveis |
| `quick-wins.md` | 5 quick wins mapeados ao stack ISILDA/SIC |
| `wave-1-summary.md` | Checkpoint de cobertura (88/100) |
| `curiosity_queue.yaml` | Perguntas em aberto |
| `sources.yaml` / `players.yaml` / `matrices.yaml` | Atoms extraídos (Observatory) |
| `metrics.yaml` / `pipeline-state.yaml` | Métricas + estado das fases |

## Metadata

- **Query:** melhores práticas de rate limiting para agentes WhatsApp com Claude API em produção
- **Modo:** new_research · **Flags:** (nenhuma)
- **Gates:** COVERAGE_GATE=APPROVE (88) · CITATION_GATE=APPROVE (~0.92)
- **Caveats:** uazapi limites exactos não públicos · valores de tier Anthropic mudam sem aviso

## Research Metadata

- `workflow_version`: 2.0.0
- `runtime_contract`: tech-research-pipeline/7-molecules
- `coverage_score`: 88
- `citation_verified`: true
- `stop_reason`: coverage_gate_approve_88_wave1
- `rubrics`: information_recall 5/6 · analysis 6/6 · presentation 6/6
