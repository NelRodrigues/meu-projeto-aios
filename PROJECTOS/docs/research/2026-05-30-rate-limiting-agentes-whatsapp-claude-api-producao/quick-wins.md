# Quick Wins — Rate Limiting Agentes WhatsApp + Claude API

> Critério: `value=high` + `effort ∈ {XS,S}` + `time_to_value ≤ 1 semana`. Mapeados a alvos do stack ISILDA/SIC.

## Quick Wins Selecionados

| # | Quick Win | Value | Effort | Hub target | Acção concreta | Ref. § |
|---|---|---|---|---|---|---|
| QW-1 | Caching do system prompt do agente | high | XS | `ISILDA/supabase/functions/ai-sales-agent/` (llm-client.ts) | Adicionar `cache_control: {type:"ephemeral"}` ao bloco system prompt das personas. Reduz ITPM + 90% custo nesse bloco. Ver `02-research-report.md` §2.2, §5 | §2.2, §5 |
| QW-2 | Ler `anthropic-ratelimit-*` headers e logar | high | S | `_shared/llm-client.ts` | Capturar headers de resposta, logar `tokens-remaining`/`requests-remaining` em `ai_agent_logs`. Base p/ throttling proactivo. Ver §2.4 | §2.4 |
| QW-3 | Respeitar `retry-after` no handler de 429 | high | S | `ai-sales-agent/queue-processor.ts` | Trocar retry fixo por: `retry-after` → backoff+jitter (cap 30s). Detectar `x-should-retry:false`. Ver §2.3 | §2.3 |
| QW-4 | Alerta em taxa de 429 >1% | high | XS | `ai_agent_logs` + monitor | Query/alert sobre contagem de 429 nas últimas 24h. Detecta incidente antes do cliente reclamar. Ver §2.4 | §2.4 |
| QW-5 | Pacing 3-8s entre mensagens WhatsApp | high | XS | `queue-processor.ts` (delay uazapi) | Garantir delay configurável entre envios business-initiated (anti-bloqueio + quality rating). Ver §3 | §3 |

## Mapeamento para próximos passos
- QW1+QW3 → candidatos a **story** imediata (`@aiox-pm` → epic "Resiliência do agente WhatsApp").
- QW2+QW4 → base de observability (precede throttling proactivo full).
- QW5 → ajuste de config, sem story formal.
