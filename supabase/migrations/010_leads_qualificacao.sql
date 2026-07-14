-- ============================================================================
-- Migração 010 — Extensão da tabela `leads` (qualificação comercial + domínio GM)
-- ----------------------------------------------------------------------------
-- Porquê: `leads` = `clientes` renomeada (002) + colunas de qualificação. Esta
-- migração adiciona o modelo BANT/score/pipeline herdado conceptualmente do
-- SIC-MD e os campos do domínio educação (destino, nível, orçamento, idioma).
--
-- Descoberta crítica (conflito C1, Arquitectura §2.4): `score_confidence`,
-- `fit_score` e `temperature` NÃO existem no SIC-MD — são campos NOVOS desenhados
-- de raiz aqui. Também `pipeline_stage_id` fica criada mas NULA (a decisão §2.4 é
-- adaptar o trigger do módulo marketing para observar `pipeline_fase`, feito na
-- story 5.1 / M_mkt_001 — não se cria tabela `pipeline_stages`).
--
-- Cálculo de temperatura (trigger BEFORE INSERT/UPDATE, §2.4): a partir de
-- `sales_score` (escala 0–100) → `quente ≥70`, `morno 40–69`, `frio <40`.
-- Regra conservadora herdada do SIC-MD: NUNCA `quente` com `score_confidence='low'`
-- — nesse caso a temperatura é `morno` no máximo. O alerta de lead quente ao
-- Rinaldo (fora desta migração) é `sales_score ≥ 70 AND score_confidence <> 'low'`.
--
-- Fonte vinculativa: Arquitectura §2.4 (bloco ALTER literal + índices + regra de
-- temperatura), §2.1 (enums pipeline_fase/idioma/score_confidence), §3 (linha 010).
--
-- Dependências (E1): 002 (`leads` renomeada), `profiles` (FK `sales_rep_id`).
-- Idempotente: `ADD COLUMN IF NOT EXISTS` para permitir reaplicação segura.
-- ============================================================================


-- ── Extensão de colunas ──────────────────────────────────────────────────────
ALTER TABLE public.leads
  -- Qualificação / pipeline
  ADD COLUMN IF NOT EXISTS pipeline_fase   TEXT NOT NULL DEFAULT 'lead'
     CHECK (pipeline_fase IN ('lead','qualificado','consulta_agendada','proposta_enviada',
                              'formalizacao_pagamento','candidatura_submetida','em_curso','concluido')),
  ADD COLUMN IF NOT EXISTS sales_rep_id    UUID REFERENCES public.profiles(id),   -- esperado pelo módulo mkt
  ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID,   -- coluna-espelho que o trigger do módulo lê (fica nula)
  -- BANT (herdado conceptualmente do SIC-MD, colunas criadas aqui)
  ADD COLUMN IF NOT EXISTS bant_budget     TEXT,     -- livre/curto: faixa de orçamento indicada
  ADD COLUMN IF NOT EXISTS bant_authority  TEXT,     -- quem decide (encarregado/estudante)
  ADD COLUMN IF NOT EXISTS bant_need       TEXT,
  ADD COLUMN IF NOT EXISTS bant_timeline   TEXT,
  ADD COLUMN IF NOT EXISTS sales_score     INTEGER DEFAULT 0 CHECK (sales_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_confidence TEXT DEFAULT 'low'
     CHECK (score_confidence IN ('low','medium','high')),        -- NOVO (C1)
  ADD COLUMN IF NOT EXISTS fit_score       INTEGER CHECK (fit_score BETWEEN 0 AND 100),  -- NOVO (C1)
  ADD COLUMN IF NOT EXISTS temperature     TEXT CHECK (temperature IN ('quente','morno','frio')), -- NOVO (C1)
  -- Domínio educação
  ADD COLUMN IF NOT EXISTS destino         TEXT,     -- país pretendido
  ADD COLUMN IF NOT EXISTS nivel           TEXT,     -- summer/línguas/foundation/licenciatura/mestrado/voluntariado
  ADD COLUMN IF NOT EXISTS orcamento       TEXT,     -- faixa declarada (não valor exacto — regra de faixas)
  ADD COLUMN IF NOT EXISTS idioma_pref     TEXT DEFAULT 'pt' CHECK (idioma_pref IN ('pt','en')),
  ADD COLUMN IF NOT EXISTS followup_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags            TEXT[] DEFAULT '{}',   -- exigido pelo módulo mkt (migração 001)
  ADD COLUMN IF NOT EXISTS utm_source      TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium      TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign    TEXT;


-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_fase        ON public.leads(pipeline_fase);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON public.leads(temperature) WHERE temperature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_score       ON public.leads(sales_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_followup    ON public.leads(followup_count);


-- ── Trigger de cálculo de temperatura (BEFORE INSERT/UPDATE) ──────────────────
-- Deriva `temperature` de `sales_score`:
--   quente ≥ 70 · morno 40–69 · frio < 40
-- Regra conservadora (SIC-MD): score_confidence='low' NUNCA produz 'quente' —
-- é rebaixado para 'morno' no máximo. Um score <40 com confiança baixa fica 'frio'.
CREATE OR REPLACE FUNCTION public.calcular_temperatura_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := COALESCE(NEW.sales_score, 0);
BEGIN
  IF v_score >= 70 THEN
    -- confiança baixa impede 'quente' → rebaixa para 'morno'
    IF NEW.score_confidence IS DISTINCT FROM 'low' THEN
      NEW.temperature := 'quente';
    ELSE
      NEW.temperature := 'morno';
    END IF;
  ELSIF v_score >= 40 THEN
    NEW.temperature := 'morno';
  ELSE
    NEW.temperature := 'frio';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_calcular_temperatura
  BEFORE INSERT OR UPDATE OF sales_score, score_confidence ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.calcular_temperatura_lead();


-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS leads_calcular_temperatura ON public.leads;
--   DROP FUNCTION IF EXISTS public.calcular_temperatura_lead();
--   DROP INDEX IF EXISTS public.idx_leads_followup;
--   DROP INDEX IF EXISTS public.idx_leads_score;
--   DROP INDEX IF EXISTS public.idx_leads_temperature;
--   DROP INDEX IF EXISTS public.idx_leads_fase;
--   ALTER TABLE public.leads
--     DROP COLUMN IF EXISTS utm_campaign,
--     DROP COLUMN IF EXISTS utm_medium,
--     DROP COLUMN IF EXISTS utm_source,
--     DROP COLUMN IF EXISTS tags,
--     DROP COLUMN IF EXISTS followup_count,
--     DROP COLUMN IF EXISTS idioma_pref,
--     DROP COLUMN IF EXISTS orcamento,
--     DROP COLUMN IF EXISTS nivel,
--     DROP COLUMN IF EXISTS destino,
--     DROP COLUMN IF EXISTS temperature,
--     DROP COLUMN IF EXISTS fit_score,
--     DROP COLUMN IF EXISTS score_confidence,
--     DROP COLUMN IF EXISTS sales_score,
--     DROP COLUMN IF EXISTS bant_timeline,
--     DROP COLUMN IF EXISTS bant_need,
--     DROP COLUMN IF EXISTS bant_authority,
--     DROP COLUMN IF EXISTS bant_budget,
--     DROP COLUMN IF EXISTS pipeline_stage_id,
--     DROP COLUMN IF EXISTS sales_rep_id,
--     DROP COLUMN IF EXISTS pipeline_fase;
-- ============================================================================
