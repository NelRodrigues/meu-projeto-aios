-- ============================================================================
-- Migração 003 — team_members (autenticação e perfis da equipa)
-- ----------------------------------------------------------------------------
-- Porquê: a fundação ISILDA (002) traz `profiles` (auth base do Supabase), mas o
-- SIC Global Minds precisa de uma tabela de EQUIPA própria com apenas 2 papéis
-- operacionais — `admin` e `operacao` (KISS, RACI do brief §11: Rinaldo/Nelson/
-- Belmiro=admin, Ana=operacao). É `team_members` (nao `profiles`) que:
--   1. governa o guard `requireAdmin` das rotas service_role (§8.2 da arquitectura);
--   2. alimenta as policies RLS por papel — DELETE/escrita sensivel só a admin
--      (§8.1: EXISTS ... team_members WHERE auth_user_id = auth.uid() AND role='admin');
--   3. é o alvo da FK `email_*.created_by → team_members(id)` do módulo marketing.
--
-- ⚠ GATE DO MÓDULO MARKETING (bug conhecido nº4 do pacote): a migração
-- `M_mkt_003_email_created_by_fk_team_members.sql` cria uma FK para `team_members(id)`.
-- Esta migração 003 TEM de existir e ser aplicada ANTES de qualquer migração do
-- módulo marketing, senão essa FK rebenta. Fonte vinculativa: Arquitectura §3
-- (série base, linha 003) e §2.6/§3 (série módulo, M_mkt_003).
--
-- ADR-01 (single-tenant): projecto Supabase DEDICADO da Global Minds. SEM coluna
-- `tenant_id`. Um utilizador autenticado = um membro da equipa GM. O vínculo com a
-- sessão é `auth_user_id → auth.users(id)`.
--
-- Nota de design: `email`/`phone` ficam OPCIONAIS. Não são exigidos pela story
-- (que pede name/auth_user_id/role/is_active), mas o ecrã de gestão de equipa herdado
-- lê/escreve estes campos; mantê-los evita partir a UI sem custo de esquema.
-- ============================================================================


-- ── team_members ────────────────────────────────────────────────────────────
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  -- Vínculo à conta de autenticação. UNIQUE: um auth.users nunca mapeia para
  -- dois membros. NULL é permitido (membro criado antes de ter conta), mas a
  -- verificação de admin/is_active só resolve para linhas com auth_user_id.
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'operacao' CHECK (role IN ('admin', 'operacao')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_auth_user ON public.team_members(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_team_members_active_admin ON public.team_members(role) WHERE is_active AND role = 'admin';

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── Helper SQL: is_admin(uuid) ──────────────────────────────────────────────
-- Verifica se um dado auth.users.id corresponde a um membro admin ACTIVO.
-- SECURITY DEFINER + STABLE: pode ser usado dentro de policies RLS sem recursão
-- (não lê a própria tabela protegida por policies do chamador) e sem exigir
-- SELECT directo em team_members ao role `authenticated`.
-- `SET search_path = public` fecha a superfície de ataque de search_path.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE auth_user_id = uid
      AND role = 'admin'
      AND is_active
  );
$$;

-- Conveniência: admin do utilizador da sessão actual (para uso em policies).
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid());
$$;


-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Leitura: qualquer autenticado vê a equipa (necessário para atribuições/inbox).
-- Escrita (INSERT/UPDATE/DELETE): só admin activo.
-- service_role: acesso total (guard aplicacional `requireAdmin` faz a defesa em
-- profundidade nas rotas que usam service_role).
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipa visivel para autenticados" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin pode inserir membros" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin pode actualizar membros" ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin pode eliminar membros" ON public.team_members
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role all team_members" ON public.team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.current_user_is_admin();
--   DROP FUNCTION IF EXISTS public.is_admin(UUID);
--   DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
--   DROP TABLE IF EXISTS public.team_members;
-- ============================================================================
