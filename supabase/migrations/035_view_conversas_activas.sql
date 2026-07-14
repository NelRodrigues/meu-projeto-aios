-- ============================================================================
-- Migração 035 — View `v_conversas_activas` (inbox de supervisão) — Story 3.6
-- ----------------------------------------------------------------------------
-- A inbox (src/hooks/use-conversations.ts) consulta `v_conversas_activas`, mas
-- essa view só existia no clone ISILDA (schema antigo: clientes/cliente_id/
-- estagio) e nunca foi materializada no projecto GM (leads/lead_id). Sem ela, a
-- inbox inteira não carrega. Esta migração cria a view ADAPTADA ao schema GM e
-- ENRIQUECIDA para os ACs da 3.6:
--   • AC1 (estado visível): expõe `estado` = status real (os 5 valores do enum);
--     `modo` derivado para o filtro rápido (bot/humano/transferida/pausada).
--   • AC1 (painel do contacto): fase (pipeline_fase), score (sales_score),
--     temperatura, BANT (budget/authority/need/timeline), destino, nível.
--   • AC5 (filtro transferidas): NÃO filtra `transferred`/`paused_by_schedule`/
--     `completed` no WHERE (a view ISILDA filtrava-os — aqui aparecem todos os
--     que estão sob gestão; só se exclui `completed` do fluxo activo).
--
-- Diferença-chave face à ISILDA: o WHERE deixa passar active, paused_by_human,
-- paused_by_schedule e transferred (as que precisam de supervisão). `completed`
-- fica de fora do inbox "vivo" (encerradas).
--
-- Dependências: 002 (`leads`, `mensagens_whatsapp`), 010 (colunas de
-- qualificação), 027 (`ai_agent_conversations`).
-- Idempotente: CREATE OR REPLACE VIEW.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_conversas_activas AS
SELECT
  c.id AS conversa_id,
  c.lead_id,
  l.nome AS cliente_nome,
  l.telefone,
  l.pipeline_fase AS estagio,          -- compat: a UI lê `estagio` (nome herdado)
  l.pipeline_fase AS fase,             -- AC1: fase do pipeline de candidatura
  -- Painel do contacto (AC1): qualificação do lead.
  l.sales_score,
  l.score_confidence,
  l.temperature,
  l.bant_budget,
  l.bant_authority,
  l.bant_need,
  l.bant_timeline,
  l.destino,
  l.nivel,
  l.orcamento,
  l.idioma_pref,
  -- Modo derivado (filtro rápido) — distingue transferida de pausada.
  CASE
    WHEN c.status = 'paused_by_human'   THEN 'humano'
    WHEN c.status = 'transferred'       THEN 'transferida'
    WHEN c.status = 'paused_by_schedule' THEN 'pausada'
    WHEN c.status = 'active'            THEN 'bot'
    ELSE 'pausada'
  END::text AS modo,
  c.status AS estado,                  -- AC1/AC5: estado REAL (os 5 do enum)
  c.pause_reason,
  c.total_messages_sent,
  c.last_processed_at,
  -- Última mensagem (para ordenar/pré-visualizar na lista).
  m.conteudo AS ultima_mensagem,
  m.sender_type AS ultimo_remetente,
  m.created_at AS ultima_mensagem_em
FROM public.ai_agent_conversations c
INNER JOIN public.leads l ON l.id = c.lead_id
LEFT JOIN LATERAL (
  SELECT conteudo, sender_type, created_at
  FROM public.mensagens_whatsapp
  WHERE lead_id = c.lead_id
    AND direction <> 'internal'
  ORDER BY created_at DESC
  LIMIT 1
) m ON true
-- Inbox "vivo": tudo o que precisa de supervisão. `completed` fica de fora.
WHERE c.status IN ('active', 'paused_by_human', 'paused_by_schedule', 'transferred');

-- A view herda as RLS das tabelas base (leads/ai_agent_conversations já têm RLS
-- de leitura para `authenticated`, migrações 009/027). Sem policy separada.

-- ============================================================================
-- ROLLBACK:
--   DROP VIEW IF EXISTS public.v_conversas_activas;
-- ============================================================================
