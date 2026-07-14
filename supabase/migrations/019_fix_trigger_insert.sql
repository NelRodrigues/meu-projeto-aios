-- ============================================================================
-- Migração 018 — Correcção do trigger de espelhamento de fase (INSERT)
-- ----------------------------------------------------------------------------
-- Porquê: a migração 017 definiu o trigger de auditoria/espelhamento como
-- `AFTER INSERT OR UPDATE OF fase`. No PostgreSQL, a cláusula `OF fase` (lista de
-- colunas) SÓ é válida para UPDATE — quando combinada com INSERT numa única
-- declaração de trigger, o evento INSERT é ignorado silenciosamente e o trigger
-- dispara APENAS em UPDATE de `fase`. Consequência (apanhada em teste contra a BD
-- real): criar uma candidatura NÃO espelhava `leads.pipeline_fase` nem registava
-- auditoria em `mudancas_estagio`.
--
-- Correcção: separar em DOIS triggers que partilham a mesma função —
--   • `candidaturas_espelha_fase_ins`  AFTER INSERT (sem `OF fase`)
--   • `candidaturas_espelha_fase_upd`  AFTER UPDATE OF fase
-- A função `candidatura_espelha_fase()` (017) já trata ambos os casos via TG_OP,
-- por isso reutiliza-se sem alteração.
--
-- Fonte: Story 2.3 AC2/AC4/AC7. Substitui a definição de trigger da 017 (a função
-- e `ordem_pipeline_fase` mantêm-se).
-- ============================================================================

-- Remover o trigger combinado defeituoso da 017.
DROP TRIGGER IF EXISTS candidaturas_espelha_fase ON public.candidaturas;

-- INSERT: dispara sempre que nasce uma candidatura (sem lista de colunas).
CREATE TRIGGER candidaturas_espelha_fase_ins
  AFTER INSERT ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.candidatura_espelha_fase();

-- UPDATE: dispara só quando a coluna `fase` muda.
CREATE TRIGGER candidaturas_espelha_fase_upd
  AFTER UPDATE OF fase ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.candidatura_espelha_fase();

-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS candidaturas_espelha_fase_ins ON public.candidaturas;
--   DROP TRIGGER IF EXISTS candidaturas_espelha_fase_upd ON public.candidaturas;
--   -- (para repor o estado da 017, recriar o trigger combinado — mas era o bug)
--   CREATE TRIGGER candidaturas_espelha_fase
--     AFTER INSERT OR UPDATE OF fase ON public.candidaturas
--     FOR EACH ROW EXECUTE FUNCTION public.candidatura_espelha_fase();
-- ============================================================================
