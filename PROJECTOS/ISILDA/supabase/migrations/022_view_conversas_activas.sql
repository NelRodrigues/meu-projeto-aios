-- Migration 022: View v_conversas_activas para o Inbox
-- Agrega dados de clientes, conversas e ultima mensagem

CREATE OR REPLACE VIEW v_conversas_activas AS
SELECT
  c.id AS conversa_id,
  c.cliente_id,
  cl.nome AS cliente_nome,
  cl.telefone,
  cl.estagio,
  -- Determinar modo baseado no status
  CASE
    WHEN c.status = 'paused_by_human' THEN 'humano'
    WHEN c.status = 'active' THEN 'bot'
    ELSE 'pausado'
  END::text AS modo,
  c.status AS estado,
  c.total_messages_sent,
  c.last_processed_at,
  -- Ultima mensagem
  m.conteudo AS ultima_mensagem,
  m.sender_type AS ultimo_remetente,
  m.created_at AS ultima_mensagem_em
FROM ai_agent_conversations c
INNER JOIN clientes cl ON cl.id = c.cliente_id
LEFT JOIN LATERAL (
  SELECT conteudo, sender_type, created_at
  FROM mensagens_whatsapp
  WHERE cliente_id = c.cliente_id
    AND direction != 'internal'
  ORDER BY created_at DESC
  LIMIT 1
) m ON true
WHERE c.status IN ('active', 'paused_by_human');

-- RLS: a view herda as politicas das tabelas base
-- (sem politica separada necessaria)
