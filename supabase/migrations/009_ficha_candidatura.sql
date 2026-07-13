-- ============================================================================
-- Migração 009 — Ficha de estudante (1:1 com lead) + Candidaturas (pipeline 8 fases)
-- ----------------------------------------------------------------------------
-- Porquê: cada lead que avança para processo tem UMA ficha de estudante (dados
-- 360º: percurso, encarregado, documentos) e uma ou mais CANDIDATURAS que
-- percorrem o pipeline real da GM de 8 fases. A ficha é 1:1 com o lead
-- (`lead_id UNIQUE`) e o seu campo `processo_em_curso` é o interruptor que
-- BLOQUEIA a rotina de retenção/anonimização de 2 anos (E4.4 compliance): um
-- estudante com processo activo nunca é anonimizado por inactividade.
--
-- `documentos JSONB` guarda a checklist documental como lista de objectos
-- ([{tipo, estado, url, updated_at}]) — flexível, sem tabela filha rígida nesta fase.
--
-- Candidaturas: `fase` usa CHECK das 8 fases reais (não CREATE TYPE — estilo
-- fechado da §2.1). `fase_desde` mede o "tempo em fase" (sinalização de atraso);
-- `prazo_fase_dias` é o prazo esperado da fase.
--
-- Fonte vinculativa: Arquitectura §2.5 (DDL literal fichas_estudante/candidaturas),
-- §2.1 (8 fases pipeline_fase), §3 (série base, linha 009), §8.1 (RLS por papel).
--
-- Dependências (E1 + 008): 002 (`leads`), 003 (`is_admin` para policies admin),
-- 008 (`programas` — FK `programa_pretendido_id`/`programa_id`),
-- `handle_updated_at()` (migração 002).
-- ============================================================================


-- ── fichas_estudante (1:1 com lead) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fichas_estudante (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  nome_completo TEXT,
  data_nascimento DATE,
  nacionalidade TEXT,
  encarregado_nome TEXT,
  encarregado_contacto TEXT,
  encarregado_relacao TEXT,
  percurso_academico TEXT,
  nivel_linguistico TEXT,
  destino_pretendido TEXT,
  programa_pretendido_id UUID REFERENCES public.programas(id),
  orcamento_faixa TEXT,
  processo_em_curso BOOLEAN NOT NULL DEFAULT false,   -- ⚠ bloqueia a rotina de retenção de 2 anos (E4.4)
  documentos JSONB DEFAULT '[]',   -- checklist: [{tipo, estado, url, updated_at}]
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fichas_lead ON public.fichas_estudante(lead_id);
CREATE INDEX IF NOT EXISTS idx_fichas_processo ON public.fichas_estudante(processo_em_curso) WHERE processo_em_curso = true;


-- ── candidaturas (pipeline 8 fases) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  ficha_id UUID REFERENCES public.fichas_estudante(id) ON DELETE SET NULL,
  programa_id UUID REFERENCES public.programas(id),
  parceiro_id UUID REFERENCES public.parceiros(id),
  fase TEXT NOT NULL DEFAULT 'lead'
     CHECK (fase IN ('lead','qualificado','consulta_agendada','proposta_enviada',
                     'formalizacao_pagamento','candidatura_submetida','em_curso','concluido')),
  fase_desde TIMESTAMPTZ DEFAULT now(),          -- para "tempo em fase" e sinalização de atraso
  prazo_fase_dias INTEGER,                        -- prazo esperado (Ficha C2)
  estado_documental TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidaturas_lead ON public.candidaturas(lead_id);
CREATE INDEX IF NOT EXISTS idx_candidaturas_fase ON public.candidaturas(fase);


-- ── Triggers updated_at (reutiliza handle_updated_at() da migração 002) ──────
CREATE TRIGGER fichas_estudante_updated_at
  BEFORE UPDATE ON public.fichas_estudante
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER candidaturas_updated_at
  BEFORE UPDATE ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── RLS por papel (Arquitectura §8.1) ────────────────────────────────────────
-- Leitura/escrita: autenticado. DELETE: só admin activo. service_role: total.
ALTER TABLE public.fichas_estudante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

-- fichas_estudante
CREATE POLICY "fichas_estudante_read" ON public.fichas_estudante
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fichas_estudante_insert" ON public.fichas_estudante
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fichas_estudante_update" ON public.fichas_estudante
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fichas_estudante_delete" ON public.fichas_estudante
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "fichas_estudante_service" ON public.fichas_estudante
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- candidaturas
CREATE POLICY "candidaturas_read" ON public.candidaturas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "candidaturas_insert" ON public.candidaturas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "candidaturas_update" ON public.candidaturas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "candidaturas_delete" ON public.candidaturas
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "candidaturas_service" ON public.candidaturas
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS candidaturas_updated_at ON public.candidaturas;
--   DROP TRIGGER IF EXISTS fichas_estudante_updated_at ON public.fichas_estudante;
--   DROP TABLE IF EXISTS public.candidaturas CASCADE;
--   DROP TABLE IF EXISTS public.fichas_estudante CASCADE;
-- ============================================================================
