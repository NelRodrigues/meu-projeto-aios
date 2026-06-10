-- ============================================================
-- ROLLBACK das migrações 100-103 (módulos NOVOS Porcelana Beauty)
-- Ordem inversa. Idempotente (IF EXISTS).
-- ============================================================

-- 103 — opt-out
DROP FUNCTION IF EXISTS public.aplicar_optout(UUID);
DROP INDEX IF EXISTS public.idx_clientes_contactavel;
ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS opted_out_at,
  DROP COLUMN IF EXISTS followup_paused,
  DROP COLUMN IF EXISTS ai_assigned;

-- 102 — pacotes/subscricoes/sessoes (+ coluna em agendamentos)
ALTER TABLE public.agendamentos DROP COLUMN IF EXISTS subscricao_id;
DROP VIEW IF EXISTS public.v_saldo_sessoes;
DROP TABLE IF EXISTS public.sessoes;
DROP TABLE IF EXISTS public.subscricoes;
DROP TABLE IF EXISTS public.pacotes;

-- 101 — salas/agendamentos
DROP FUNCTION IF EXISTS public.verificar_conflito_agendamento(UUID,UUID,DATE,TIME,INTEGER,INTEGER,UUID);
DROP TABLE IF EXISTS public.agendamentos;  -- CASCADE remove triggers/funções dependentes? Não — drop função à parte:
DROP FUNCTION IF EXISTS public.registar_mudanca_estado_agendamento();
DROP TABLE IF EXISTS public.salas;

-- 100 — servicos
DROP TABLE IF EXISTS public.servicos_catalogo;
