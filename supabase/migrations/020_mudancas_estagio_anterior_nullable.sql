-- ============================================================================
-- Migração 020 — `mudancas_estagio.estagio_anterior` passa a permitir NULL
-- ----------------------------------------------------------------------------
-- Porquê: a coluna herdou `NOT NULL` da base ISILDA (migração 002), onde toda a
-- mudança de estágio tinha sempre um estado anterior. No SIC Global Minds, o
-- trigger de auditoria de candidaturas (017/019) regista também a CRIAÇÃO de uma
-- candidatura — evento em que NÃO existe fase anterior (é o primeiro registo do
-- historial). O trigger insere `estagio_anterior = NULL` nesse caso, o que
-- violava o `NOT NULL` e fazia o INSERT da candidatura inteiro dar rollback
-- (bug apanhado em teste contra a BD real: pipeline_fase não espelhava e não
-- havia auditoria porque a transacção era revertida).
--
-- Correcção: `estagio_anterior` passa a NULLABLE. `NULL` = "sem estágio anterior"
-- (candidatura acabada de criar). `estagio_novo` mantém-se `NOT NULL`.
--
-- Fonte: Story 2.3 AC4 (auditoria). Complementa 017/019 (trigger de espelhamento).
-- ============================================================================

ALTER TABLE public.mudancas_estagio
  ALTER COLUMN estagio_anterior DROP NOT NULL;

-- ============================================================================
-- ROLLBACK:
--   -- Só reverter se não houver linhas com estagio_anterior NULL:
--   -- DELETE FROM public.mudancas_estagio WHERE estagio_anterior IS NULL;
--   ALTER TABLE public.mudancas_estagio
--     ALTER COLUMN estagio_anterior SET NOT NULL;
-- ============================================================================
