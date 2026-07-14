-- ============================================================================
-- Migração 033 — Placeholder configurável `consulta_windows` — Story 3.5 (AC2)
-- ----------------------------------------------------------------------------
-- PENDENTE-3 (questão 4 de 14/07, dono: Rinaldo): os dias/horas/buffer/fuso das
-- janelas da Consulta de Orientação AINDA NÃO estão fixados. A story NÃO bloqueia:
-- as tools `check_availability`/`schedule_consultation` leem
-- `ai_sales_agents.settings.consulta_windows` — um PLACEHOLDER editável na BD
-- SEM redeploy. Quando o Rinaldo fixar as janelas reais, muda-se só ESTE JSON
-- (UPDATE de settings), nunca o código.
--
-- Valores provisórios plausíveis (Dev Notes da story): ter–qui, 14:00–17:00,
-- buffer 15 min, duração 45 min, horizonte 14 dias, Africa/Luanda. Marcados como
-- provisórios — substituir pelos valores acordados após 14/07.
--
-- Estrutura lida por scheduling.ts (ConsultaWindowsConfig):
--   { windows: [{dia:0-6, inicio:"HH:MM", fim:"HH:MM"}],
--     buffer_minutos, duracao_minutos, timezone, horizonte_dias }
--   dia: 0=domingo … 6=sábado (convenção getUTCDay / Intl weekday).
--
-- Idempotente: só define a chave se ainda NÃO existir (COALESCE + jsonb_set), para
-- não sobrescrever valores que o Rinaldo/operação já tenham afinado à mão.
--
-- Dependência: 029 (seed do agente "Assistente Global Minds").
-- ============================================================================

UPDATE public.ai_sales_agents
SET settings = jsonb_set(
  settings,
  '{consulta_windows}',
  '{
    "windows": [
      {"dia": 2, "inicio": "14:00", "fim": "17:00"},
      {"dia": 3, "inicio": "14:00", "fim": "17:00"},
      {"dia": 4, "inicio": "14:00", "fim": "17:00"}
    ],
    "buffer_minutos": 15,
    "duracao_minutos": 45,
    "timezone": "Africa/Luanda",
    "horizonte_dias": 14,
    "_provisorio": true,
    "_nota": "PENDENTE-3: valores placeholder ate o Rinaldo fixar as janelas reais (questao 4, 14/07)."
  }'::jsonb,
  true
)
WHERE name = 'Assistente Global Minds'
  AND NOT (settings ? 'consulta_windows');

-- ============================================================================
-- ROLLBACK:
--   UPDATE public.ai_sales_agents
--     SET settings = settings - 'consulta_windows'
--     WHERE name = 'Assistente Global Minds';
-- ============================================================================
