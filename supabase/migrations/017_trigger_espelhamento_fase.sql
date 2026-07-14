-- ============================================================================
-- Migração 017 — Espelhamento de fase candidaturas→leads + auditoria (AC7 / C4)
-- ----------------------------------------------------------------------------
-- Porquê: o pipeline kanban do E2 opera sobre `candidaturas.fase` (story 2.3),
-- mas TRÊS consumidores a jusante lêem `leads.pipeline_fase` e exigem coerência:
--   1) overlay L3 do prompt do agente (E3),
--   2) fases terminais da cadência de retenção (story 4.1),
--   3) trigger de automação do módulo marketing adaptado (5.1 / 5.5).
-- A validação PO fixou a regra (correcção C4/D2): `leads.pipeline_fase` reflecte
-- SEMPRE a candidatura MAIS AVANÇADA do lead (ordem do enum §2.1). Este trigger
-- garante a sincronia mesmo quando a fase é alterada FORA da UI (ex.: agente E3
-- move o lead directamente na base), coisa que um INSERT feito só no frontend
-- nunca conseguiria cobrir.
--
-- Três efeitos, no mesmo caminho de escrita sobre `candidaturas`:
--   a) BEFORE UPDATE OF fase → `fase_desde = now()` (AC2: reinicia o tempo em fase).
--   b) AFTER INSERT OR UPDATE OF fase → auditoria em `mudancas_estagio`
--      (estagio_anterior=OLD.fase ou NULL no insert; estagio_novo=NEW.fase).
--   c) AFTER INSERT OR UPDATE OF fase → recalcula o MÁXIMO das fases de TODAS as
--      candidaturas do lead e grava em `leads.pipeline_fase` (caso multi-candidatura).
--
-- Recursão: o trigger AFTER escreve em `leads`, NUNCA em `candidaturas`, portanto
-- não se auto-dispara. O UPDATE a `leads.pipeline_fase` pode disparar
-- `calcular_temperatura_lead` (migração 010, que ouve `sales_score`/`score_confidence`),
-- mas esse trigger NÃO ouve `pipeline_fase` — sem cadeia recursiva.
--
-- `ordem_pipeline_fase(fase)` é IMMUTABLE: mapeia cada uma das 8 fases à sua
-- posição ordinal (lead=1 … concluido=8). Serve para "a mais avançada".
--
-- Fonte vinculativa: Arquitectura §2.1 (enum pipeline_fase, ordem das 8 fases),
-- §2.4 (leads.pipeline_fase), §2.5 (candidaturas.fase/fase_desde), §8.1 (RLS).
-- Story 2.3 AC2/AC4/AC7. Dependências: 009 (`candidaturas`), 010 (`leads.pipeline_fase`),
-- 002 (`mudancas_estagio`).
-- Idempotente: CREATE OR REPLACE + DROP TRIGGER IF EXISTS antes de recriar.
-- ============================================================================


-- ── ordem_pipeline_fase(fase) — posição ordinal da fase no enum §2.1 ─────────
-- IMMUTABLE: o mapeamento fase→ordinal é fixo. Usado para ORDER BY que determina
-- a candidatura mais avançada. Fase desconhecida → 0 (nunca "ganha" o máximo).
CREATE OR REPLACE FUNCTION public.ordem_pipeline_fase(fase TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE fase
    WHEN 'lead'                    THEN 1
    WHEN 'qualificado'             THEN 2
    WHEN 'consulta_agendada'       THEN 3
    WHEN 'proposta_enviada'        THEN 4
    WHEN 'formalizacao_pagamento'  THEN 5
    WHEN 'candidatura_submetida'   THEN 6
    WHEN 'em_curso'                THEN 7
    WHEN 'concluido'               THEN 8
    ELSE 0
  END;
$$;


-- ── (a) BEFORE UPDATE OF fase → reinicia fase_desde (AC2) ────────────────────
-- Só quando a fase realmente muda (evita reset em updates de outras colunas que
-- por acaso passem por aqui). `handle_updated_at` (009) trata `updated_at`.
CREATE OR REPLACE FUNCTION public.candidatura_reinicia_fase_desde()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fase IS DISTINCT FROM OLD.fase THEN
    NEW.fase_desde := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidaturas_fase_desde ON public.candidaturas;
CREATE TRIGGER candidaturas_fase_desde
  BEFORE UPDATE OF fase ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.candidatura_reinicia_fase_desde();


-- ── (b)+(c) AFTER INSERT OR UPDATE OF fase → auditoria + espelhamento ────────
-- Auditoria: uma linha em `mudancas_estagio` por transição real de fase.
--   - INSERT: estagio_anterior = NULL (não há fase anterior).
--   - UPDATE: só regista se OLD.fase <> NEW.fase (não polui em updates sem mudança).
--   - changed_by: NULL quando a escrita não vem de um utilizador autenticado
--     (ex.: agente/service_role) — auth.uid() devolve NULL nesse caso.
-- Espelhamento: recalcula o máximo das fases de TODAS as candidaturas do lead
--   (inclui a linha corrente, já persistida no AFTER) e grava em leads.pipeline_fase.
--   Multi-candidatura: se o lead tem 2 candidaturas, fica com a mais avançada;
--   regredir a mais avançada faz o SELECT devolver o novo máximo automaticamente.
CREATE OR REPLACE FUNCTION public.candidatura_espelha_fase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fase_maxima TEXT;
BEGIN
  -- (b) auditoria — só em transição real de fase
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.mudancas_estagio (lead_id, estagio_anterior, estagio_novo, changed_by)
    VALUES (NEW.lead_id, NULL, NEW.fase, auth.uid());
  ELSIF NEW.fase IS DISTINCT FROM OLD.fase THEN
    INSERT INTO public.mudancas_estagio (lead_id, estagio_anterior, estagio_novo, changed_by)
    VALUES (NEW.lead_id, OLD.fase, NEW.fase, auth.uid());
  END IF;

  -- (c) espelhamento — a candidatura MAIS AVANÇADA do lead (ordem do enum §2.1)
  SELECT fase INTO v_fase_maxima
  FROM public.candidaturas
  WHERE lead_id = NEW.lead_id
  ORDER BY public.ordem_pipeline_fase(fase) DESC
  LIMIT 1;

  IF v_fase_maxima IS NOT NULL THEN
    UPDATE public.leads
    SET pipeline_fase = v_fase_maxima
    WHERE id = NEW.lead_id
      AND pipeline_fase IS DISTINCT FROM v_fase_maxima;  -- evita escrita redundante
  END IF;

  RETURN NULL;  -- AFTER trigger: valor de retorno ignorado
END;
$$;

DROP TRIGGER IF EXISTS candidaturas_espelha_fase ON public.candidaturas;
CREATE TRIGGER candidaturas_espelha_fase
  AFTER INSERT OR UPDATE OF fase ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.candidatura_espelha_fase();


-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS candidaturas_espelha_fase ON public.candidaturas;
--   DROP TRIGGER IF EXISTS candidaturas_fase_desde ON public.candidaturas;
--   DROP FUNCTION IF EXISTS public.candidatura_espelha_fase();
--   DROP FUNCTION IF EXISTS public.candidatura_reinicia_fase_desde();
--   DROP FUNCTION IF EXISTS public.ordem_pipeline_fase(TEXT);
-- ============================================================================
