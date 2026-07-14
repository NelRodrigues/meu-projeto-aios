# Relatório de Rate Limits — Agente Global Minds (Story 3.7, AC5)

**Data:** 13/07/2026 · **Autor:** Dex (@dev) · **Fonte:** Arquitectura §2.3, §8.5 · **Estado:** em vigor (pendente deploy)

Evidência para a validação de 14/07 e para o manual do E6. Descreve os limites em vigor, **onde se editam** (sem redeploy) e **o que acontece** ao atingir cada um.

---

## 1. Limites em vigor (settings de série)

Todos vivem em `ai_sales_agents.settings` (JSONB) do agente activo "Assistente Global Minds". Editáveis por UPDATE na BD ou pela UI de configurações (FR25) — **sem redeploy**.

| Limite | Chave (`settings.*`) | Valor de série | Âmbito |
|---|---|---|---|
| Mensagens por conversa | `max_messages_per_conversation` | **60** | total da conversa (`ai_agent_conversations.total_messages_sent`) |
| Mensagens por hora | `cadence_max_messages_per_hour` | **50** | janela de 1h por lead (`ai_agent_send_counts`, window_type='hour') |
| Mensagens por dia | `cadence_max_messages_per_day` | **60** | janela de 1 dia por lead (`ai_agent_send_counts`, window_type='day') |
| Horário de funcionamento | `working_hours_start` / `working_hours_end` | **08:00 / 20:00** | Africa/Luanda (UTC+1) |
| Dias de funcionamento | `working_days` | **[1,2,3,4,5,6]** | segunda a sábado (1=seg … 7=dom) |

> **Contadores em BD, SEM Redis** (§8.5). As janelas hora/dia usam `date_trunc('hour'|'day', now())` como borda; a contagem é sobre o **volume de envios do agente** (1 resposta = 1 envio, não conta balões).

### Distinção importante (não confundir)
- **Limites do AGENTE** (este relatório): 60/conversa, 50/h, 60/dia — em `ai_agent_send_counts` + settings.
- **Limites anti-block de CAMPANHAS** (E5, sistema separado): 45–90s, 40/h, 500/dia, warm-up, cooldown — em `campaign_instance_stats`. **Nenhum contador é partilhado** (§8.5, por desenho).

---

## 2. Onde se editam

```sql
-- Exemplo: subir o limite diário para 80 (sem redeploy).
UPDATE public.ai_sales_agents
SET settings = jsonb_set(settings, '{cadence_max_messages_per_day}', '80'::jsonb)
WHERE name = 'Assistente Global Minds';

-- Exemplo: alargar o horário para 07:00–21:00.
UPDATE public.ai_sales_agents
SET settings = settings
  || '{"working_hours_start":"07:00","working_hours_end":"21:00"}'::jsonb
WHERE name = 'Assistente Global Minds';
```

Mensagens personalizáveis (opcionais; se ausentes, usa-se o texto de série):
- `settings.out_of_hours_message` — texto de fora de horas.

---

## 3. Comportamento ao atingir cada limite

Regra transversal: **nunca silêncio abrupto**. Ao bloquear, o agente envia sempre uma mensagem digna ao lead e sinaliza na inbox (pausa da conversa).

| Situação | Detecção | Acção | Estado da conversa | Retoma |
|---|---|---|---|---|
| **61ª msg na conversa** | `total_messages_sent >= 60` antes de responder | mensagem digna ("um consultor vai continuar consigo") + handoff | `paused_by_human` (`pause_reason='limite_conversa'`) | manual (humano assume/devolve) |
| **51ª msg/hora** | `get_agent_send_counts` hora `>= 50` | mensagem digna + handoff | `paused_by_human` (`limite_cadencia`) | manual |
| **61ª msg/dia** | `get_agent_send_counts` dia `>= 60` | mensagem digna + handoff | `paused_by_human` (`limite_cadencia`) | manual |
| **Fora de horas** (ex.: 22h) | `isWithinWorkingHours` = fechado | resposta fixa de fora de horas | `paused_by_schedule` (`fora_de_horas`) | **automática** ao reabrir (`resume_scheduled_conversations()` no início do `process_queue`) |

> **Prioridade do motivo** quando vários limites batem ao mesmo tempo: conversa → dia → hora (o mais estrutural primeiro).

### Fluxo de enforcement (ordem no `processOne`)
1. Persiste `idioma_pref` detectado.
2. **Horário** — fora → resposta digna + `paused_by_schedule` + fim (retoma automática ao reabrir).
3. **Rate limits** — algum limite atingido → mensagem digna + `paused_by_human` + handoff + fim.
4. Escalação D5 (pré-LLM).
5. Geração da resposta (Haiku classifica → Sonnet responde).
6. Envio → **incrementa contadores** (`record_agent_send` + `total_messages_sent`).

---

## 4. Fonte de relógio única

A verificação de horário e o L0 do prompt usam a **mesma** função de relógio (`nowInLuanda`, Africa/Luanda UTC+1). Não há duas implementações de relógio (Dev Note §horário-vs-L0).

---

## 5. Evidência de teste

Suite `tests/go-live-readiness.test.mjs` — **26 casos, todos verdes**:
- limites 60/50/60 (fronteiras 59→permite, limite→bloqueia);
- fronteiras de horário 07:59/08:00/19:59/20:00 (Africa/Luanda) + domingo fechado;
- multilingue PT↔EN com alternância a meio;
- opt-out "SAIR", guardrails (frases proibidas), escalação D5.

Suite completa do agente: **142/142 verdes**.
