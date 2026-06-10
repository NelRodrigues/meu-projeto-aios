-- ============================================================
-- ROLLBACK total do schema porcelana (SIC GERAL)
-- ============================================================
-- CASCADE remove tabelas, views, funções, triggers e tipos do schema.
-- NÃO toca em public (outros tenants intactos).
-- O registo do tenant em public.tenants é removido à parte (opcional).
-- ============================================================

DROP SCHEMA IF EXISTS porcelana CASCADE;

-- Opcional: remover o tenant do registo (descomentar se desejado)
-- DELETE FROM public.tenants WHERE db_schema = 'porcelana';
