-- ============================================================
-- Migration 000: Schema dedicado 'porcelana' + ENUMs
-- SIC Porcelana Beauty · projecto SIC GERAL (achtvzbcczmcbvjkdjry)
-- ============================================================
-- CONTEXTO CRÍTICO: o SIC GERAL é MULTI-TENANT POR SCHEMA.
-- Cada cliente tem o seu schema Postgres (isilda, desperta, natacha,
-- crm_elsa, crm_nelma). A Porcelana Beauty recebe o schema 'porcelana'.
-- Isolamento FÍSICO real — zero conflito de nomes com outros tenants.
--
-- Padrão replicado do schema 'isilda' (template canónico de 14 tabelas)
-- + extensões específicas de estética (rooms, services, appointments,
-- packages, subscriptions, session_ledger).
--
-- Tenant registado em public.tenants com db_schema='porcelana'.
-- get_tenant_id() (em public) resolve via JWT app_metadata.tenant_id.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS porcelana;

-- Permissões base (padrão Supabase para schemas de tenant)
GRANT USAGE ON SCHEMA porcelana TO authenticated, service_role, anon;

-- ============================================================
-- ENUMs canónicos (replicados do schema isilda)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE porcelana.channel_type AS ENUM
    ('whatsapp','instagram_dm','instagram_comment','email','webform','manual','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.message_role AS ENUM
    ('lead','agent','human_operator','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.lead_temperature AS ENUM
    ('hot','warm','cold','frozen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.lead_stage AS ENUM
    ('new','acknowledged','diagnosing','qualifying','recommending',
     'objection_handling','closing','won','lost','cold','cold_closed',
     'handoff_human','crisis_escalated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ENUMs específicos de estética (extensão Porcelana)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE porcelana.appointment_state AS ENUM
    ('new','evaluation','scheduled','confirmed','paid',
     'done','completed','no_show','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.qualification_gate AS ENUM ('founder','technician');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.service_category AS ENUM
    ('facial','body','laser','wax','eyebrows','home_care','evaluation','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.subscription_state AS ENUM
    ('active','suspended','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE porcelana.ledger_entry AS ENUM ('credit','debit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
