---
name: diagnose-whatsapp-bot
version: 1.0.0
description: |
  Diagnóstico estruturado de falhas em agentes WhatsApp (Márcia/Manuela/Isi).
  Força verificação sequencial de hipóteses antes de aplicar qualquer fix.
  Evita o padrão de tripla-diagnose errada: tabela errada, limite diário, créditos API.
allowed-tools:
  - Bash
  - Read
  - Edit
  - Grep
  - Glob
  - mcp__claude_ai_Supabase__execute_sql
  - mcp__claude_ai_Supabase__get_logs
  - mcp__claude_ai_Supabase__list_projects
---

# Diagnóstico de Agente WhatsApp — Checklist Obrigatório

Quando um agente WhatsApp (Márcia, Manuela, Isi, ou qualquer bot) não está a responder,
NUNCA propõe um fix antes de completar este checklist. Reporta os resultados de TODAS
as etapas primeiro. Só então propõe a remediação.

## REGRA FUNDAMENTAL

> Enumera e verifica TODAS as hipóteses abaixo antes de agir.
> A ordem importa — começa pela mais provável (histórico de incidentes).

---

## Etapa 1 — Identificar o projecto Supabase activo

Antes de qualquer query, confirma o projecto correcto:

```
Listar projectos Supabase disponíveis e confirmar qual é o projecto ISILDA/CRM activo.
```

Se ambíguo, pergunta ao utilizador antes de continuar.

---

## Etapa 2 — Verificar rate limits e quotas diárias (HIPÓTESE MAIS FREQUENTE)

```sql
-- Ver configuração de rate limit do agente activo
SELECT
  id,
  name,
  is_active,
  settings->>'cadence_max_messages_per_hour' AS max_por_hora,
  settings->>'cadence_max_messages_per_day' AS max_por_dia,
  settings->>'max_messages_per_conversation' AS max_por_conversa,
  settings->>'queue_batch_size' AS batch_size
FROM ai_sales_agents
WHERE is_active = true;
```

```sql
-- Ver quantas mensagens foram enviadas hoje por agente/cliente
SELECT
  DATE_TRUNC('day', created_at) AS dia,
  agent_id,
  COUNT(*) AS total_enviadas,
  COUNT(DISTINCT cliente_id) AS clientes_unicos
FROM ai_agent_logs
WHERE log_type = 'message_sent'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

**Interpretar:** Se `total_enviadas` >= `max_por_dia` → causa raiz encontrada: limite diário atingido.

---

## Etapa 3 — Verificar a fila de mensagens (tabela correcta: `mensagens_whatsapp`)

> IMPORTANTE: O processador lê de `mensagens_whatsapp`, NÃO de `ai_agent_message_queue`.
> A `ai_agent_message_queue` é apenas a fila de tarefas de processamento.

```sql
-- Mensagens recentes sem resposta do agente (leads presos)
SELECT
  m.cliente_id,
  m.conteudo,
  m.direction,
  m.created_at,
  m.sender_type
FROM mensagens_whatsapp m
WHERE m.direction = 'incoming'
  AND m.created_at >= NOW() - INTERVAL '2 hours'
  AND NOT EXISTS (
    SELECT 1 FROM mensagens_whatsapp r
    WHERE r.cliente_id = m.cliente_id
      AND r.direction = 'outgoing'
      AND r.created_at > m.created_at
  )
ORDER BY m.created_at DESC
LIMIT 20;
```

```sql
-- Estado da fila de processamento
SELECT
  status,
  COUNT(*) AS total,
  MIN(created_at) AS mais_antigo,
  MAX(created_at) AS mais_recente
FROM ai_agent_message_queue
GROUP BY status
ORDER BY total DESC;
```

**Interpretar:**
- Muitas mensagens `incoming` sem `outgoing` → agente parou de responder
- Fila com muitos `failed` ou `pending` antigos → problema no processador

---

## Etapa 4 — Verificar estado das conversas

```sql
-- Conversas activas vs pausadas
SELECT
  status,
  COUNT(*) AS total,
  COUNT(CASE WHEN pause_reason IS NOT NULL THEN 1 END) AS com_motivo
FROM ai_agent_conversations
GROUP BY status;
```

```sql
-- Conversas recentemente pausadas (possível causa)
SELECT
  cliente_id,
  status,
  pause_reason,
  paused_at,
  total_messages_sent
FROM ai_agent_conversations
WHERE status != 'active'
  AND updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 10;
```

**Interpretar:**
- Muitas conversas `paused_by_human` ou `closed` recentemente → alguém pausou manualmente ou limite atingido
- `pause_reason = 'Limite de mensagens atingido'` → confirma Etapa 2

---

## Etapa 5 — Verificar logs de erros do agente

```sql
-- Erros recentes do agente
SELECT
  log_type,
  data->>'error' AS erro,
  data->>'response' AS resposta_parcial,
  created_at,
  cliente_id
FROM ai_agent_logs
WHERE log_type IN ('error', 'failed', 'rate_limit_exceeded')
   OR (log_type = 'message_sent' AND data->>'error' IS NOT NULL)
ORDER BY created_at DESC
LIMIT 20;
```

```sql
-- Falhas na fila com mensagem de erro
SELECT
  id,
  cliente_id,
  status,
  error_message,
  attempts,
  max_attempts,
  created_at
FROM ai_agent_message_queue
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
```

**Interpretar:**
- `error_message` contendo "Anthropic API key" → problema de credenciais (verificar Etapa 6)
- `error_message` contendo "rate" ou "limit" → confirma limite de API
- Muitos `attempts >= max_attempts` → mensagens a falhar repetidamente

---

## Etapa 6 — Verificar créditos/API Key Anthropic (VERIFICAR POR ÚLTIMO)

> Só chega aqui se as Etapas 2-5 estiverem limpas.
> NUNCA assume créditos esgotados sem evidência das etapas anteriores.

```sql
-- Verificar se a API key está configurada
SELECT
  integration_type,
  key_name,
  CASE WHEN key_value IS NOT NULL AND key_value != '' THEN 'configurada' ELSE 'em falta' END AS estado,
  updated_at
FROM integration_keys
WHERE integration_type = 'anthropic'
LIMIT 5;
```

Se a key está configurada → pede ao utilizador para confirmar saldo na dashboard Anthropic
com screenshot antes de concluir que é problema de créditos.

---

## Etapa 7 — Verificar logs da Edge Function (Supabase)

Usar `mcp__claude_ai_Supabase__get_logs` para verificar logs recentes da função `ai-sales-agent`:

- Procurar por erros 500, timeouts, ou crashes
- Verificar se a função está a ser invocada mas a falhar silenciosamente

---

## Formato do Relatório de Diagnóstico

Após completar TODAS as etapas, apresenta:

```
RELATORIO DE DIAGNOSTICO — Agente WhatsApp
==========================================
Data/Hora: [agora]
Agente: [nome]

HIPOTESES VERIFICADAS:
[ ] Rate limit diario: [X/Y mensagens hoje] — [LIMPO / CAUSA RAIZ]
[ ] Fila mensagens_whatsapp: [N msgs sem resposta] — [LIMPO / PROBLEMA]
[ ] Estado conversas: [N pausadas] — [LIMPO / PROBLEMA]
[ ] Logs de erro: [descricao] — [LIMPO / PROBLEMA]
[ ] API Key: [configurada/em falta] — [LIMPO / PROBLEMA]
[ ] Edge Function logs: [descricao] — [LIMPO / PROBLEMA]

CAUSA RAIZ IDENTIFICADA: [descricao clara]

REMEDIACAO PROPOSTA:
[SQL ou accao especifica]

VERIFICACAO POS-FIX:
[Query ou accao para confirmar que resolveu]
```

---

## Remediações Comuns

### Limite diário atingido
```sql
-- Resetar contador diário (usar com cuidado)
UPDATE ai_sales_agents
SET settings = jsonb_set(settings, '{cadence_max_messages_per_day}', '100')
WHERE is_active = true;
```

### Mensagens presas na fila
```sql
-- Reactivar mensagens failed recentes
UPDATE ai_agent_message_queue
SET status = 'pending', attempts = 0, error_message = NULL
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '2 hours';
```

### Conversa pausada inadvertidamente
```sql
-- Reactivar conversa de cliente específico
UPDATE ai_agent_conversations
SET status = 'active', pause_reason = NULL, paused_at = NULL, paused_by = NULL
WHERE cliente_id = '[CLIENTE_ID]'
  AND status != 'active';
```

### Lock preso (agente bloqueado)
```sql
-- Verificar locks activos
SELECT * FROM ai_agent_locks WHERE expires_at > NOW();

-- Libertar lock preso
DELETE FROM ai_agent_locks WHERE cliente_id = '[CLIENTE_ID]';
```

---

## Notas Críticas

1. **Tabela correcta**: O processador lê `mensagens_whatsapp.direction = 'incoming'`, não `ai_agent_message_queue` directamente
2. **Rate limit vs créditos**: Rate limit é muito mais comum. Verifica sempre primeiro
3. **Screenshots**: Se o utilizador mostrar screenshot de créditos disponíveis, aceita e procura outra causa
4. **Lock contention**: Em alta concorrência, locks podem ficar presos — verificar sempre antes de concluir
5. **Working hours**: O agente não responde fora do horário (08:00-20:00 WAT) — verificar se é simplesmente fora de horas
