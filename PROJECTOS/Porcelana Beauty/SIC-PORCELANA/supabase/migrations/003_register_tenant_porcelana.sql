-- ============================================================
-- Migration 003: Registo do tenant 'porcelana' no SIC GERAL
-- SIC Porcelana Beauty · projecto SIC GERAL (achtvzbcczmcbvjkdjry)
-- ============================================================
-- CONTEXTO: o SIC GERAL é MULTI-TENANT POR SCHEMA. Esta migração regista
-- a Porcelana Beauty em public.tenants (db_schema='porcelana') ANTES de as
-- migrações 000-002 fazerem sentido. Sem este registo, porcelana.is_member()
-- devolve sempre false e ninguém vê dados (RLS bloqueia tudo).
--
-- Já existem 5 tenants (isilda, desperta, natacha, crm_elsa, crm_nelma).
-- Esta migração NÃO toca em nenhum deles — apenas adiciona 'porcelana'.
--
-- IDEMPOTENTE: re-correr não duplica.
--   - public.tenants     → ON CONFLICT (slug) DO NOTHING
--   - public.tenant_users → INSERT ... WHERE NOT EXISTS (chave lógica
--                            tenant_id + user_id), idempotente mesmo sem
--                            depender de uma UNIQUE constraint nomeada.
--
-- FORA DE ÂMBITO (story separada de Auth): config do JWT / Supabase Auth.
--   O tenant_id gerado aqui deve depois ser propagado para
--   app_metadata.tenant_id dos utilizadores da Porcelana — isso é feito
--   numa story de Auth dedicada, NÃO nesta migração. [F2]
--
-- ROLLBACK desta migração (registo apenas, não toca no schema):
--   DELETE FROM public.tenants WHERE db_schema = 'porcelana';
--   (CASCADE-friendly: remover o tenant remove também as suas linhas em
--    public.tenant_users se houver FK; ver também ROLLBACK_porcelana.sql
--    que faz DROP SCHEMA porcelana CASCADE para o schema físico.) [F3]
-- ============================================================

-- ------------------------------------------------------------
-- 1. Registar o tenant em public.tenants (idempotente por slug)
-- ------------------------------------------------------------
-- [F4] owner_email: placeholder 'comercial@marcadigital.ao' até confirmar
--      o email real da Yolenia Balaca. CONFIRMAR com a cliente e actualizar
--      via UPDATE posterior se necessário (não bloqueia o provisionamento).
-- [F4] plan: 'starter' — coerente com o arranque de um tenant SIC Express /
--      onboarding (enum tenant_plan: trial/starter/growth/pro/enterprise).
--      Decisão documentada: começa em 'starter', sobe para 'growth'/'pro'
--      conforme contrato evolui. Não é null-by-design para manter coerência
--      com o billing/plan gating do SIC GERAL.
INSERT INTO public.tenants (
  slug,
  db_schema,
  display_name,
  business_name,
  country,
  status,
  owner_name,
  owner_email,
  timezone,
  plan
)
VALUES (
  'porcelana',
  'porcelana',
  'Porcelana Beauty',
  'Porcelana Beauty',
  'AO',
  'active',
  'Yolenia Balaca',
  'ketson85@hotmail.com',        -- [F4] admin do sistema: Nelson Rodrigues (gestão Marca Digital)
  'Africa/Luanda',
  'starter'                     -- [F4] decisão documentada (ver comentário acima)
)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Associar o operador Marca Digital em public.tenant_users
-- ------------------------------------------------------------
-- [F6] ORIGEM DO user_id: o operador da Marca Digital DEVE já existir em
--      auth.users (utilizador real autenticável). O UUID concreto NÃO é
--      conhecido nesta story — por isso o INSERT é parametrizado e protegido
--      por DUAS salvaguardas:
--        a) só insere se o user_id existir em auth.users (evita órfãos);
--        b) é idempotente via NOT EXISTS na chave lógica (tenant_id,user_id).
--
--      COMO USAR EM PRODUÇÃO: substituir o valor de :operator_user_id pelo
--      UUID real do operador Marca Digital obtido de auth.users, ex.:
--          SELECT id FROM auth.users WHERE email = 'operador@marcadigital.ao';
--      Em ambiente Supabase (apply_migration) usar psql var ou editar o
--      literal abaixo. Enquanto o UUID não for fornecido, este bloco fica
--      INERTE (a sub-select de auth.users não devolve linhas → 0 inserts),
--      logo a migração aplica limpo sem falhar.
--
-- NOTA: o literal abaixo é um placeholder NULL-safe. Para activar, troca
--       NULL::uuid pelo UUID real (ou injecta via variável).
DO $$
DECLARE
  v_tenant_id   uuid;
  -- [F6] Admin do sistema: Nelson Rodrigues (ketson85@hotmail.com).
  -- UUID confirmado em auth.users (criado 2026-05-13). Faz toda a gestão do tenant.
  v_operator_id uuid := 'c3aefafe-7ce8-4da4-9d17-5fe2296a1fc0'::uuid;
BEGIN
  -- resolve o tenant_id recém-registado (ou pré-existente) pela slug
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'porcelana';

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE '[003] tenant porcelana não encontrado — INSERT em tenant_users ignorado';
    RETURN;
  END IF;

  -- só associa se houver um operador definido E que exista em auth.users [F6]
  IF v_operator_id IS NULL THEN
    RAISE NOTICE '[003] operator_user_id não fornecido — associação em tenant_users deixada preparada/inerte (ver [F6])';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_operator_id) THEN
    RAISE NOTICE '[003] operator_user_id % não existe em auth.users — associação ignorada (evita órfão)', v_operator_id;
    RETURN;
  END IF;

  -- INSERT idempotente: chave lógica (tenant_id, user_id) [F5]
  -- role 'owner': admin com gestão total do tenant (enum user_role:
  -- owner/admin/operator/viewer/superadmin). Default da tabela é 'viewer' —
  -- o admin de gestão precisa de 'owner'.
  INSERT INTO public.tenant_users (tenant_id, user_id, is_active, role)
  SELECT v_tenant_id, v_operator_id, true, 'owner'::user_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = v_tenant_id
      AND user_id   = v_operator_id
  );

  RAISE NOTICE '[003] operador % associado ao tenant porcelana (%)', v_operator_id, v_tenant_id;
END $$;
