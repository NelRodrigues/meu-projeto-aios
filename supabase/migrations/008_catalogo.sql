-- ============================================================================
-- Migração 008 — Catálogo: parceiros → destinos → programas
-- ----------------------------------------------------------------------------
-- Porquê: o núcleo comercial da Global Minds é a educação internacional. O
-- catálogo é a hierarquia de 3 níveis que alimenta a qualificação do lead, a
-- proposta e o dashboard 80/20: um PARCEIRO (Kaplan, INTO, MPW, Inspired,
-- IH Cape Town, SAMIAD, U.Europeia/IADE/IPAM, GEA, Xior, EDU4WORD) opera em
-- vários DESTINOS (país+cidade), e cada destino tem PROGRAMAS concretos
-- (summer camp, línguas, foundation, licenciatura, mestrado, voluntariado).
--
-- Regra de faixas (compliance de preços — Arquitectura §6 L4): custos guardam-se
-- como FAIXAS (`custo_min`/`custo_max`, `custo_vida_faixa`), nunca cotação exacta.
-- A cotação exacta só sai na proposta por email, após consulta.
--
-- Moeda: `currency` / `custo_vida_currency` são CHAR(3) ISO 4217 LIVRE, validados
-- por regex `^[A-Z]{3}$` (Arquitectura §2.1). Nunca enum — o cliente usa EUR, USD,
-- GBP, ZAR, AED, CAD, AUD e moedas futuras não podem bloquear.
--
-- Fonte vinculativa: Arquitectura §2.5 (DDL literal), §2.1 (moeda/enum programa_tipo),
-- §3 (série base, linha 008), §8.1 (padrão RLS por papel).
--
-- Dependências (E1): 002 (base clonada), 003 (`team_members` + `is_admin(uuid)`
-- para as policies admin), `handle_updated_at()` da migração 002.
-- ============================================================================


-- ── parceiros ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,               -- Kaplan, INTO, MPW, Inspired, IH Cape Town, SAMIAD, U.Europeia/IADE/IPAM, GEA, Xior, EDU4WORD
  tipo TEXT,                        -- universidade / escola de línguas / housing / alliance
  comissao_percent NUMERIC(5,2),    -- % de comissão base do parceiro
  website TEXT,
  brochura_url TEXT,
  notas TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ── destinos ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.destinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE CASCADE,
  pais TEXT NOT NULL,               -- África do Sul, Portugal, Reino Unido, EAU, EUA, China...
  cidade TEXT,
  custo_vida_faixa TEXT,            -- faixa (não valor exacto)
  custo_vida_currency CHAR(3) CHECK (custo_vida_currency ~ '^[A-Z]{3}$'),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_destinos_parceiro ON public.destinos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_destinos_pais ON public.destinos(pais);


-- ── programas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.programas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destino_id UUID REFERENCES public.destinos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('summer_camp','linguas','foundation','licenciatura','mestrado','voluntariado','outro')),
  custo_min NUMERIC(12,2),
  custo_max NUMERIC(12,2),          -- faixa
  currency CHAR(3) CHECK (currency ~ '^[A-Z]{3}$'),
  comissao_percent NUMERIC(5,2),    -- override da % do parceiro, se diferente
  duracao TEXT,
  brochura_url TEXT,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_programas_destino ON public.programas(destino_id);
CREATE INDEX IF NOT EXISTS idx_programas_tipo ON public.programas(tipo);


-- ── Triggers updated_at (reutiliza handle_updated_at() da migração 002) ──────
CREATE TRIGGER parceiros_updated_at
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER destinos_updated_at
  BEFORE UPDATE ON public.destinos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER programas_updated_at
  BEFORE UPDATE ON public.programas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── RLS por papel (Arquitectura §8.1) ────────────────────────────────────────
-- Leitura: qualquer autenticado (catálogo é operacional, lido pelo agente/CRM).
-- INSERT/UPDATE: autenticado (gestão de catálogo pela equipa).
-- DELETE: só admin activo (via is_admin(auth.uid()) → team_members).
-- service_role: acesso total.
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;

-- parceiros
CREATE POLICY "parceiros_read" ON public.parceiros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "parceiros_insert" ON public.parceiros
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "parceiros_update" ON public.parceiros
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "parceiros_delete" ON public.parceiros
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "parceiros_service" ON public.parceiros
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- destinos
CREATE POLICY "destinos_read" ON public.destinos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "destinos_insert" ON public.destinos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "destinos_update" ON public.destinos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "destinos_delete" ON public.destinos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "destinos_service" ON public.destinos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- programas
CREATE POLICY "programas_read" ON public.programas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "programas_insert" ON public.programas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "programas_update" ON public.programas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "programas_delete" ON public.programas
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "programas_service" ON public.programas
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS programas_updated_at ON public.programas;
--   DROP TRIGGER IF EXISTS destinos_updated_at ON public.destinos;
--   DROP TRIGGER IF EXISTS parceiros_updated_at ON public.parceiros;
--   DROP TABLE IF EXISTS public.programas CASCADE;
--   DROP TABLE IF EXISTS public.destinos CASCADE;
--   DROP TABLE IF EXISTS public.parceiros CASCADE;
-- ============================================================================
