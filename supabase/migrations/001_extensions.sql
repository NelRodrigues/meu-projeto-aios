-- ============================================================================
-- Migração 001 — Extensões da base GM
-- ----------------------------------------------------------------------------
-- Porquê: o SIC Global Minds precisa das mesmas capacidades de infra-estrutura
-- que os SIC anteriores — agendamento de crons na própria BD (pg_cron), chamadas
-- HTTP a partir de Postgres para invocar edge functions (pg_net), primitivas
-- criptográficas e gen_random_uuid() (pgcrypto) e embeddings/pesquisa vectorial
-- para o agente e RFV (pgvector). Fonte vinculativa: Arquitectura §3 (série base).
-- Herdada da ISILDA 001_extensions.sql, alinhada com a lista exacta da arquitectura.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() + primitivas cripto
CREATE EXTENSION IF NOT EXISTS pg_cron;    -- agendamento de crons na BD (ADR-02)
CREATE EXTENSION IF NOT EXISTS pg_net;     -- net.http_post p/ invocar edge functions
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector (embeddings / pesquisa vectorial)

-- ============================================================================
-- ROLLBACK:
--   DROP EXTENSION IF EXISTS vector;
--   DROP EXTENSION IF EXISTS pg_net;
--   DROP EXTENSION IF EXISTS pg_cron;
--   DROP EXTENSION IF EXISTS pgcrypto;
-- ============================================================================
