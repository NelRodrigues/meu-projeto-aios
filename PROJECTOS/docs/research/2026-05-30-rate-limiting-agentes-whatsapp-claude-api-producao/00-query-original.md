# Query Original

**Query:** melhores práticas de rate limiting para agentes WhatsApp com Claude API em produção

**Data:** 2026-05-30
**Modo:** new_research
**Flags:** (nenhuma)

## Contexto Inferido (Auto-Clarify — Fase M1)

| Sinal | Valor | Evidência |
|---|---|---|
| `focus` | technical | keyword `api` + termos técnicos (rate limiting, produção) |
| `temporal` | recent | "em produção" → práticas actuais |
| `domain` | `["Claude"]` | alias `claude`/`anthropic` detectado |
| `product_validation` | false | sem keywords JTBD/MVP/smoke-test |

## Guardrails (RULE 1)

- `VETO_IMPLEMENTATION_REQUEST`: NÃO disparado (query é research pura)
- `VETO_FORBIDDEN_PATH`: respeitado (output só em `docs/research/`)
- Escopo: research + documentação, sem implementação de código
