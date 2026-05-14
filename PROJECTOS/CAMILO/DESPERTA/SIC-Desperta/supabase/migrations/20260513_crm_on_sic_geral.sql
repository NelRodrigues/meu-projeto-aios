-- ====================================================================
-- MIGRATION: CRM SIC-Desperta → SIC Geral
-- Date: 2026-05-13
-- Purpose: Adapt 114-table CRM schema to coexist with 44-table SIC Geral
--
-- Strategy:
--   1. Create 15 enum types (idempotent)
--   2. Create/replace get_tenant_id() function
--   3. Rename 4 conflicting tables (whatsapp_messages, instagram_messages, products, campaigns)
--   4. ALTER 9 existing tables to add tenant_id + missing CRM columns
--   5. Create config table (key-value store for API keys)
--   6. Create ~101 new CRM tables
--   7. Create ai_agent_chat_events table
--
-- IMPORTANT: All operations use IF NOT EXISTS / IF EXISTS for idempotency
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: ENUM TYPES (15 types)
-- ====================================================================

DO $$ BEGIN CREATE TYPE public.contact_status AS ENUM ('lead','qualified','customer','churned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.contact_type AS ENUM ('person','company'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.cs_status AS ENUM ('active','paused','churned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.health_status AS ENUM ('healthy','alert','risk'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.interaction_type AS ENUM ('call','message','email','meeting','support','feedback','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.journey_stage AS ENUM ('pending_onboard','onboarding','monitoring_7d','ongoing','at_risk','churned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.member_role AS ENUM ('owner','admin','member','viewer','sponsor','champion','executor'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.member_status AS ENUM ('active','invited','inactive','removed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.objective_status AS ENUM ('pending','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.onboarding_status AS ENUM ('pending','in_progress','completed','skipped'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.organization_status AS ENUM ('active','churned','paused','trial'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.organization_type AS ENUM ('individual','company','agency'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.sentiment AS ENUM ('positive','neutral','negative'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.touchpoint_channel AS ENUM ('whatsapp','zoom','email','phone','in_app','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.touchpoint_type AS ENUM ('onboarding','checkin','support','training','review','renewal','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ====================================================================
-- SECTION 2: get_tenant_id() FUNCTION
-- The CRM reads tenant_id from JWT app_metadata.
-- CREATE OR REPLACE so it's safe if it already exists.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    nullif(
      (current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'tenant_id'),
      ''
    )::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  )
$$;


-- ====================================================================
-- SECTION 3: RENAME 4 CONFLICTING TABLES
-- SIC Geral has these with different structures. Rename SIC Geral
-- versions so CRM can create its own.
-- ====================================================================

-- 3a. whatsapp_messages → sic_whatsapp_messages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sic_whatsapp_messages') THEN
    ALTER TABLE public.whatsapp_messages RENAME TO sic_whatsapp_messages;
  END IF;
END $$;

-- 3b. instagram_messages → sic_instagram_messages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instagram_messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sic_instagram_messages') THEN
    ALTER TABLE public.instagram_messages RENAME TO sic_instagram_messages;
  END IF;
END $$;

-- 3c. products → sic_products
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sic_products') THEN
    ALTER TABLE public.products RENAME TO sic_products;
  END IF;
END $$;

-- 3d. campaigns → sic_campaigns
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sic_campaigns') THEN
    ALTER TABLE public.campaigns RENAME TO sic_campaigns;
  END IF;
END $$;


-- ====================================================================
-- SECTION 4: ALTER 9 EXISTING TABLES (add tenant_id + missing columns)
-- tenants is #1 but no changes needed (SIC Geral version is richer)
-- ====================================================================

-- 4a. ai_sales_agents — add tenant_id, created_by if missing
DO $$ BEGIN
  ALTER TABLE public.ai_sales_agents ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE public.ai_sales_agents ADD COLUMN IF NOT EXISTS created_by uuid;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4b. ai_agent_conversations — add tenant_id, lead_id, agent_name if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_conversations ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE public.ai_agent_conversations ADD COLUMN IF NOT EXISTS lead_id uuid;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE public.ai_agent_conversations ADD COLUMN IF NOT EXISTS agent_name text;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4c. ai_agent_message_queue — add tenant_id, agent_id if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_message_queue ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE public.ai_agent_message_queue ADD COLUMN IF NOT EXISTS agent_id uuid;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4d. ai_agent_logs — add tenant_id if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_logs ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4e. ai_agent_tools — add tenant_id if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_tools ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4f. ai_agent_cadence_enrollments — add tenant_id if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_cadence_enrollments ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT (current_setting('app.settings.tenant_id'::text, true))::uuid NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4g. ai_agent_scheduled_followups — add tenant_id if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_scheduled_followups ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT (current_setting('app.settings.tenant_id'::text, true))::uuid NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 4h. ai_agent_send_counts — add tenant_id if missing
DO $$ BEGIN
  ALTER TABLE public.ai_agent_send_counts ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT (current_setting('app.settings.tenant_id'::text, true))::uuid NOT NULL;
EXCEPTION WHEN OTHERS THEN null; END $$;


-- ====================================================================
-- SECTION 5: CONFIG TABLE (key-value store for API keys)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.config (
    key text PRIMARY KEY,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


-- ====================================================================
-- SECTION 6: CREATE NEW CRM TABLES (~101 tables)
-- All use CREATE TABLE IF NOT EXISTS for idempotency.
-- Ordered to respect FK dependencies.
-- ====================================================================

-- ------------------------------------------------------------------
-- 6.01 team_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    team text,
    phone text,
    avatar_url text,
    is_active boolean DEFAULT true,
    auth_user_id uuid,
    google_access_token text,
    google_refresh_token text,
    google_token_expires_at timestamp with time zone,
    google_calendar_connected boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    google_calendar_sync_token text,
    google_calendar_watch_channel_id text,
    google_calendar_watch_resource_id text,
    google_calendar_watch_expiration timestamp with time zone,
    whatsapp_instance_id uuid,
    focus_mode_enabled boolean DEFAULT false,
    zadarma_enabled boolean DEFAULT false,
    zadarma_sip text,
    zadarma_caller_id text,
    zadarma_sip_password text,
    telnyx_enabled boolean DEFAULT false,
    telnyx_caller_id text,
    focus_mode_config jsonb DEFAULT '{}'::jsonb,
    availability_status text DEFAULT 'available'::text NOT NULL,
    paused_at timestamp with time zone,
    paused_reason text,
    current_activity text DEFAULT 'available'::text,
    current_activity_meta jsonb DEFAULT '{}'::jsonb,
    current_activity_at timestamp with time zone,
    twilio_enabled boolean DEFAULT false,
    twilio_caller_id text,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    sub_role text,
    is_superadmin boolean DEFAULT false
);

-- ------------------------------------------------------------------
-- 6.02 leads
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    instagram text,
    region text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_interaction_at timestamp with time zone DEFAULT now(),
    last_message_sent_at timestamp with time zone,
    last_message_received_at timestamp with time zone,
    messages_count integer DEFAULT 0,
    engagement_score integer DEFAULT 0,
    document character varying(20),
    address text,
    address_number character varying(20),
    address_complement character varying(100),
    address_province character varying(100),
    postal_code character varying(10),
    city_name character varying(100),
    state character varying(50),
    country character varying(50),
    person_type character varying(20),
    sales_rep_id uuid,
    sales_stage text DEFAULT 'new'::text,
    sales_score integer DEFAULT 0,
    sales_score_reason text,
    bant_budget boolean,
    bant_authority boolean,
    bant_need boolean,
    bant_timeline boolean,
    expected_revenue numeric,
    ai_conversation_insights jsonb,
    ai_proposal_suggestion jsonb,
    ai_last_analysis_at timestamp with time zone,
    cpf_cnpj text,
    pipeline_stage_id uuid,
    attachments text[] DEFAULT '{}'::text[],
    context text,
    status text DEFAULT 'new'::text,
    instagram_id text,
    instagram_verified_at timestamp with time zone,
    company_name text,
    job_title text,
    photo_url text,
    source text,
    capital_disponivel text,
    melhor_horario_contato text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_internal_contact boolean DEFAULT false,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    timing_negocio text,
    regiao_interesse text,
    pode_completar_capital boolean,
    qualification jsonb DEFAULT '{}'::jsonb,
    franchise_campaign_id uuid,
    franchise_member_id uuid,
    franchise_member_name text,
    franchise_member_phone text,
    original_source text,
    original_utm_source text,
    original_utm_medium text,
    original_utm_campaign text,
    original_utm_content text,
    original_utm_term text,
    email_opted_out boolean DEFAULT false
);

-- ------------------------------------------------------------------
-- 6.03 sales_pipelines
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_pipelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    description text,
    "position" integer DEFAULT 0,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    default_sales_rep_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.04 sales_pipeline_stages
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_pipeline_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    "position" integer NOT NULL,
    color text DEFAULT 'gray'::text,
    description text,
    is_won boolean DEFAULT false,
    is_lost boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pipeline_id uuid NOT NULL,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.05 products (CRM version — SIC Geral version already renamed to sic_products)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo_url text,
    primary_color text,
    cs_process_type text,
    cs_config jsonb,
    onboarding_required boolean DEFAULT true,
    onboarding_steps jsonb,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price numeric,
    category text,
    sku text,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.06 profiles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    email text NOT NULL,
    name text NOT NULL,
    avatar_url text,
    role text DEFAULT 'user'::text NOT NULL,
    team text,
    phone text,
    is_active boolean DEFAULT true,
    google_access_token text,
    google_refresh_token text,
    google_token_expires_at timestamp with time zone,
    google_calendar_connected boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    whatsapp_instance_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.07 whatsapp_instances
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    phone_number text,
    teams text[] DEFAULT '{}'::text[],
    status text DEFAULT 'disconnected'::text,
    api_key text,
    webhook_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    api_url character varying(255),
    bypass_disconnect boolean DEFAULT false,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    purpose text DEFAULT 'inbox'::text NOT NULL
);

-- ------------------------------------------------------------------
-- 6.08 whatsapp_messages (CRM version — SIC Geral renamed to sic_whatsapp_messages)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    instance_id uuid,
    lead_id uuid,
    group_id uuid,
    message_id text NOT NULL,
    remote_jid text,
    sender_phone text,
    sender_name text,
    content text,
    message_type text DEFAULT 'text'::text,
    media_url text,
    is_from_me boolean DEFAULT false,
    status text DEFAULT 'sent'::text,
    sent_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    reactions jsonb DEFAULT '[]'::jsonb,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    edited_at timestamp with time zone,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.09 whatsapp_groups
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    instance_id uuid,
    group_jid text NOT NULL,
    name text,
    description text,
    owner_jid text,
    participant_count integer DEFAULT 0,
    purposes text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    photo_url text,
    group_type text DEFAULT 'group'::text,
    is_active boolean DEFAULT true,
    whatsapp_id text,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.10 whatsapp_group_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    group_id uuid,
    lead_id uuid,
    phone text NOT NULL,
    name text,
    is_admin boolean DEFAULT false,
    joined_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.11 instagram_business_accounts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_business_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    facebook_page_id text,
    instagram_business_id text,
    instagram_username text NOT NULL,
    access_token text NOT NULL,
    token_expires_at timestamp with time zone,
    name text NOT NULL,
    status text DEFAULT 'connected'::text,
    teams text[] DEFAULT '{comercial}'::text[],
    webhook_verify_token text,
    profile_picture_url text,
    followers_count integer,
    biography text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.12 instagram_conversations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    lead_id uuid,
    thread_id text NOT NULL,
    participant_instagram_id text NOT NULL,
    participant_username text,
    participant_name text,
    participant_profile_pic text,
    status text DEFAULT 'open'::text,
    assigned_to uuid,
    social_seller_stage_id uuid,
    stage_changed_at timestamp with time zone,
    stage_changed_by uuid,
    last_message text,
    last_message_at timestamp with time zone,
    last_client_message_at timestamp with time zone,
    last_agent_message_at timestamp with time zone,
    unread_count integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    first_response_at timestamp with time zone,
    avg_response_time_minutes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.13 instagram_messages (CRM version — SIC Geral renamed to sic_instagram_messages)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL,
    instagram_message_id text,
    content text,
    message_type text DEFAULT 'text'::text,
    media_url text,
    is_from_me boolean DEFAULT false,
    sender_instagram_id text,
    sender_username text,
    reference_type text,
    reference_id text,
    reference_url text,
    reference_preview_url text,
    status text DEFAULT 'delivered'::text,
    error_message text,
    sent_at timestamp with time zone NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.14 instagram_comments
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    lead_id uuid,
    comment_id text NOT NULL,
    post_id text NOT NULL,
    post_url text,
    post_thumbnail_url text,
    parent_comment_id text,
    author_instagram_id text NOT NULL,
    author_username text,
    author_name text,
    author_profile_pic text,
    content text NOT NULL,
    status text DEFAULT 'new'::text,
    replied_at timestamp with time zone,
    replied_by uuid,
    reply_content text,
    commented_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.15 instagram_engagement
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_engagement (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    account_id uuid NOT NULL,
    total_dms integer DEFAULT 0,
    total_comments integer DEFAULT 0,
    total_story_replies integer DEFAULT 0,
    total_story_mentions integer DEFAULT 0,
    total_post_shares integer DEFAULT 0,
    last_dm_at timestamp with time zone,
    last_comment_at timestamp with time zone,
    last_story_reply_at timestamp with time zone,
    last_interaction_at timestamp with time zone,
    dms_last_7_days integer DEFAULT 0,
    dms_last_30_days integer DEFAULT 0,
    interactions_last_7_days integer DEFAULT 0,
    interactions_last_30_days integer DEFAULT 0,
    engagement_score integer DEFAULT 0,
    first_interaction_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.16 organizations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    primary_contact_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    org_type public.organization_type DEFAULT 'individual'::public.organization_type NOT NULL,
    plan text DEFAULT 'basic'::text,
    seats_limit integer DEFAULT 1,
    contract_start date,
    contract_end date,
    billing_contact_name text,
    billing_contact_email text,
    billing_contact_phone text,
    logo_url text,
    primary_color text,
    status public.organization_status DEFAULT 'active'::public.organization_status,
    churned_at timestamp with time zone,
    churn_reason text,
    settings jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    external_member_area_org_id uuid,
    external_member_area_user_id uuid,
    ai_insights jsonb,
    early_access_granted boolean DEFAULT false,
    early_access_at timestamp with time zone,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.17 deals
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    product_id text,
    sales_rep_id uuid,
    pipeline_id uuid,
    pipeline_stage_id uuid,
    title text,
    original_price numeric(10,2),
    negotiated_price numeric(10,2),
    discount_percent numeric(5,2),
    discount_reason text,
    payment_method text,
    installments integer DEFAULT 1,
    status text DEFAULT 'negotiation'::text,
    expected_close_date date,
    won_at timestamp with time zone,
    lost_at timestamp with time zone,
    lost_reason text,
    proposal_sent_at timestamp with time zone,
    proposal_url text,
    ai_win_probability integer DEFAULT 0,
    ai_proposal_suggestion jsonb,
    notes text,
    metadata jsonb,
    total_paid numeric(12,2) DEFAULT 0,
    payment_status text DEFAULT 'pending'::text,
    utm_source text,
    utm_campaign text,
    utm_content text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    stage_changed_at timestamp with time zone,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.18 campaigns (CRM version — SIC Geral renamed to sic_campaigns)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    template_id uuid,
    message_content text NOT NULL,
    audience_filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    audience_count integer DEFAULT 0,
    instance_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    assignment_mode text DEFAULT 'keep_current'::text NOT NULL,
    assignment_target_id uuid,
    assignment_distribution_config_id uuid,
    scheduled_at timestamp with time zone,
    business_hours_start time without time zone DEFAULT '08:00:00'::time without time zone,
    business_hours_end time without time zone DEFAULT '20:00:00'::time without time zone,
    delay_min_seconds integer DEFAULT 45,
    delay_max_seconds integer DEFAULT 90,
    batch_size integer DEFAULT 20,
    batch_pause_min_seconds integer DEFAULT 180,
    batch_pause_max_seconds integer DEFAULT 300,
    hourly_limit_per_instance integer DEFAULT 40,
    daily_limit_per_instance integer DEFAULT 500,
    total_leads integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    delivered_count integer DEFAULT 0,
    read_count integer DEFAULT 0,
    responded_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    blocked_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    paused_at timestamp with time zone,
    pause_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    message_contents jsonb DEFAULT '[]'::jsonb
);

-- ------------------------------------------------------------------
-- 6.19 tenant_sales_config
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_sales_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    has_sdr_closer_split boolean DEFAULT false NOT NULL,
    sdr_pipeline_id uuid,
    closer_pipeline_id uuid,
    transfer_required_fields jsonb DEFAULT '["timing_negocio", "regiao_interesse", "capital_disponivel"]'::jsonb NOT NULL,
    transfer_auto_assign_closer boolean DEFAULT true NOT NULL,
    closer_distribution_config_id uuid,
    closer_accept_required boolean DEFAULT true NOT NULL,
    cadence_rules jsonb DEFAULT '[{"maxDays": 30, "callsPerDay": 3, "frequencyDays": 1}, {"maxDays": 60, "callsPerDay": 1, "frequencyDays": 3}, {"maxDays": 90, "callsPerDay": 1, "frequencyDays": 5}, {"maxDays": null, "callsPerDay": 1, "frequencyDays": 7}]'::jsonb NOT NULL,
    sla_minutes integer DEFAULT 4 NOT NULL,
    retry_cooldown_minutes integer DEFAULT 180 NOT NULL,
    meeting_prep_window_minutes integer DEFAULT 10 NOT NULL,
    task_grace_minutes integer DEFAULT 5 NOT NULL,
    sdr_daily_call_target integer DEFAULT 200,
    closer_daily_call_target integer DEFAULT 50,
    stage_role_mapping jsonb,
    noshow_auto_return boolean DEFAULT false NOT NULL,
    noshow_return_after_hours integer DEFAULT 24,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_sales_config_tenant_id_key UNIQUE (tenant_id)
);

-- ------------------------------------------------------------------
-- 6.20 tenant_config
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    company_name text NOT NULL,
    logo_url text,
    favicon_url text,
    primary_color text DEFAULT '#c8952e'::text,
    secondary_color text DEFAULT '#7a9182'::text,
    background_color text DEFAULT '#0c0c0e'::text,
    text_color text DEFAULT '#f8f6f1'::text,
    custom_domain text,
    features jsonb DEFAULT '{"agenda": true, "playbook": true, "comissoes": true, "materiais": true, "modo_foco": true, "monitoramento": true, "importar_leads": true, "super_relatorio": true, "campanhas_whatsapp": true}'::jsonb,
    default_pipeline_id uuid,
    commission_type text DEFAULT 'percentual_fixo'::text,
    commission_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    api_key text DEFAULT gen_random_uuid()::text,
    CONSTRAINT tenant_config_tenant_id_key UNIQUE (tenant_id)
);

-- ------------------------------------------------------------------
-- 6.21 _deal_stage_audit
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._deal_stage_audit (
    id serial PRIMARY KEY,
    deal_id uuid NOT NULL,
    old_stage_id uuid,
    new_stage_id uuid,
    old_stage_name text,
    new_stage_name text,
    changed_at timestamp with time zone DEFAULT now(),
    query_source text DEFAULT current_setting('application_name'::text, true)
);

-- ------------------------------------------------------------------
-- 6.22 admin_impersonation_tokens
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_impersonation_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    admin_member_id uuid NOT NULL,
    target_member_id uuid NOT NULL,
    token text NOT NULL UNIQUE,
    used boolean DEFAULT false,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid NOT NULL
);

-- ------------------------------------------------------------------
-- 6.23 analysis_templates
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    prompt text NOT NULL,
    category text DEFAULT 'call_analysis'::text NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.24 asaas_customers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asaas_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    asaas_customer_id text NOT NULL UNIQUE,
    name text NOT NULL,
    cpf_cnpj text NOT NULL,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.25 asaas_webhooks
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asaas_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    event_type text NOT NULL,
    asaas_payment_id text,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.26 calendar_events
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    google_event_id text NOT NULL UNIQUE,
    calendar_id text DEFAULT 'primary'::text NOT NULL,
    team_member_id uuid,
    title text NOT NULL,
    description text,
    location text,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    all_day boolean DEFAULT false,
    timezone text DEFAULT 'America/Sao_Paulo'::text,
    attendees jsonb DEFAULT '[]'::jsonb,
    organizer_email text,
    meet_link text,
    html_link text,
    status text DEFAULT 'confirmed'::text,
    lead_id uuid,
    deal_id uuid,
    raw_event jsonb,
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.27 calendar_sync_channels
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_sync_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    team_member_id uuid NOT NULL,
    channel_id text NOT NULL UNIQUE,
    resource_id text NOT NULL,
    calendar_id text DEFAULT 'primary'::text,
    expiration timestamp with time zone NOT NULL,
    sync_token text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.28 call_history
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    wavoip_device_id uuid,
    wavoip_call_id text,
    wavoip_session_id text,
    team_member_id uuid,
    lead_id uuid,
    call_type text DEFAULT 'whatsapp'::text NOT NULL,
    direction text NOT NULL,
    status text DEFAULT 'CALLING'::text NOT NULL,
    caller_phone text,
    receiver_phone text,
    peer_phone text,
    peer_name text,
    peer_profile_picture text,
    duration_seconds integer DEFAULT 0,
    record_status text,
    record_url text,
    transcription text,
    ai_summary text,
    ai_sentiment text,
    ai_key_points jsonb DEFAULT '[]'::jsonb,
    ai_suggested_tasks jsonb DEFAULT '[]'::jsonb,
    ai_processed_at timestamp with time zone,
    ai_processing_error text,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    transcriptions jsonb DEFAULT '[]'::jsonb,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.29 campaign_instance_stats
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_instance_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    instance_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    messages_sent_hour integer DEFAULT 0,
    messages_sent_day integer DEFAULT 0,
    blocks_detected_day integer DEFAULT 0,
    warmup_started_at timestamp with time zone,
    warmup_day integer DEFAULT 0,
    daily_limit_override integer,
    cooldown_until timestamp with time zone,
    last_block_at timestamp with time zone,
    hour_bucket integer DEFAULT EXTRACT(hour FROM now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_instance_stats_instance_date_key UNIQUE (instance_id, date)
);

-- ------------------------------------------------------------------
-- 6.30 campaign_leads
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    resolved_message text,
    instance_id uuid,
    whatsapp_message_id text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    responded_at timestamp with time zone,
    failed_at timestamp with time zone,
    error_message text,
    retry_count integer DEFAULT 0,
    assigned_to uuid,
    response_message_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_leads_campaign_lead_key UNIQUE (campaign_id, lead_id)
);

-- ------------------------------------------------------------------
-- 6.31 campaign_templates
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'campaign'::text,
    variables text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.32 chat_configs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    display_name text NOT NULL,
    system_prompt text NOT NULL,
    model text DEFAULT 'claude-3-5-sonnet-20241022'::text NOT NULL,
    temperature numeric DEFAULT 0.2,
    top_p numeric DEFAULT 1,
    tools jsonb DEFAULT '[]'::jsonb,
    provider text DEFAULT 'anthropic'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.33 chat_configurations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_configurations (
    id serial PRIMARY KEY,
    config_type character varying NOT NULL,
    user_id character varying,
    config_data jsonb,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.34 chat_messages
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tool_name text,
    token_count integer,
    raw jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.35 chat_sessions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    config_id uuid NOT NULL,
    title text DEFAULT 'Nova conversa'::text,
    created_by uuid,
    summary text,
    token_budget integer DEFAULT 120000,
    last_response_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.36 client_onboarding_data
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_onboarding_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    organization_id uuid,
    lead_id uuid,
    current_stage text,
    data jsonb DEFAULT '{}'::jsonb,
    completion_percent integer DEFAULT 0,
    transcript text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT client_onboarding_data_tenant_lead_key UNIQUE (tenant_id, lead_id)
);

-- ------------------------------------------------------------------
-- 6.37 coach_playbooks
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_playbooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    type character varying(20) DEFAULT 'sales'::character varying NOT NULL,
    description text,
    context text,
    phases jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.38 coach_sessions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    call_id uuid,
    playbook_id uuid,
    lead_id uuid,
    team_member_id uuid,
    briefing text,
    current_phase_index integer DEFAULT 0,
    checklist_state jsonb DEFAULT '{}'::jsonb,
    events jsonb DEFAULT '[]'::jsonb,
    phases_completed integer DEFAULT 0,
    alerts_triggered integer DEFAULT 0,
    suggestions_shown integer DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.39 commission_rules
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    sales_rep_id uuid,
    product_id text,
    commission_type text NOT NULL,
    commission_value numeric(10,2) NOT NULL,
    payment_trigger text DEFAULT 'on_payment'::text NOT NULL,
    calculate_on character varying DEFAULT 'gross'::character varying,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    valid_from date,
    valid_to date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.40 commissions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    deal_id uuid NOT NULL,
    deal_payment_id uuid,
    sales_rep_id uuid NOT NULL,
    commission_rule_id uuid,
    base_amount numeric(12,2) NOT NULL,
    gateway_fee_amount numeric(12,2) DEFAULT 0,
    net_amount numeric(12,2) DEFAULT 0,
    commission_amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    payment_reference text,
    reference_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.41 company_activities
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    priority text DEFAULT 'medium'::text,
    assignee text,
    date date,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    meeting_id uuid,
    parent_task_id uuid,
    source_type text,
    source_id uuid,
    ai_generated boolean DEFAULT false,
    status text DEFAULT 'not_started'::text,
    due_datetime timestamp with time zone,
    responsavel_id uuid,
    created_by_id uuid,
    task_type text DEFAULT 'internal'::text,
    team text DEFAULT 'internal'::text,
    lead_id uuid,
    organization_id uuid,
    notes text,
    completed_at timestamp with time zone,
    reminder_at timestamp with time zone,
    scheduled_at timestamp with time zone,
    confirmed_by_client boolean DEFAULT false,
    client_contact_method text,
    meeting_link text,
    product_id text,
    participants uuid[],
    end_datetime timestamp with time zone,
    is_all_day boolean DEFAULT false,
    google_event_id text UNIQUE,
    google_calendar_synced boolean DEFAULT false,
    outcome text,
    metadata jsonb DEFAULT '{}'::jsonb,
    reminder_sent_at timestamp with time zone,
    call_channel text,
    call_duration_seconds integer,
    recording_url text,
    external_call_id text,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.42 config_audit_log
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.config_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    table_name text NOT NULL,
    record_id text NOT NULL,
    action text NOT NULL,
    changed_by_user_id uuid,
    changed_by_name text,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.43 cs_conversation_handled
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_conversation_handled (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid,
    group_id uuid,
    handled_by uuid,
    handled_at timestamp with time zone DEFAULT now(),
    reason text,
    notes text,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.44 cs_conversation_notes
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_conversation_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid,
    group_id uuid,
    content text NOT NULL,
    note_type text DEFAULT 'general'::text,
    created_by uuid,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.45 cs_engagement_metrics
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_engagement_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    member_area_last_access timestamp with time zone,
    member_area_total_lessons integer DEFAULT 0,
    member_area_completed_lessons integer DEFAULT 0,
    member_area_time_spent_minutes integer DEFAULT 0,
    whatsapp_group_last_message timestamp with time zone,
    whatsapp_group_total_messages integer DEFAULT 0,
    whatsapp_support_last_message timestamp with time zone,
    whatsapp_support_total_tickets integer DEFAULT 0,
    zoom_last_participation timestamp with time zone,
    zoom_total_participations integer DEFAULT 0,
    zoom_total_minutes integer DEFAULT 0,
    product_last_login timestamp with time zone,
    product_total_logins integer DEFAULT 0,
    product_features_used jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT cs_engagement_metrics_org_product_key UNIQUE (organization_id, product_id)
);

-- ------------------------------------------------------------------
-- 6.46 cs_event_rsvps
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_event_rsvps (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    event_id uuid NOT NULL,
    guest_name character varying NOT NULL,
    guest_email character varying NOT NULL,
    guest_phone character varying,
    guest_company character varying,
    lead_id uuid,
    organization_id uuid,
    is_client boolean DEFAULT false,
    rsvp_status character varying DEFAULT 'confirmed'::character varying NOT NULL,
    confirmed_at timestamp with time zone DEFAULT now(),
    has_companion boolean DEFAULT false,
    companion_name character varying,
    companion_email character varying,
    companion_phone character varying,
    checked_in_at timestamp with time zone,
    checked_in_by uuid,
    companion_checked_in boolean DEFAULT false,
    companion_checked_in_at timestamp with time zone,
    dietary_restrictions character varying,
    notes text,
    custom_answers jsonb DEFAULT '{}'::jsonb,
    source character varying DEFAULT 'public_form'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT cs_event_rsvps_event_email_key UNIQUE (event_id, guest_email)
);

-- ------------------------------------------------------------------
-- 6.47 cs_events
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    description text,
    slug character varying UNIQUE,
    start_date date NOT NULL,
    end_date date,
    start_time time without time zone,
    end_time time without time zone,
    location character varying,
    location_details text,
    is_online boolean DEFAULT false,
    online_link character varying,
    capacity integer,
    rsvp_token character varying NOT NULL UNIQUE,
    rsvp_enabled boolean DEFAULT true,
    rsvp_deadline timestamp with time zone,
    allow_companion boolean DEFAULT false,
    max_companions_per_guest integer DEFAULT 1,
    product_id text,
    custom_questions jsonb DEFAULT '[]'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    banner_url character varying,
    status character varying DEFAULT 'draft'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    guide_url character varying,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.48 cs_health_current
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_health_current (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    overall_score integer NOT NULL,
    health_status public.health_status NOT NULL,
    engagement_score integer,
    objectives_score integer,
    sentiment_score integer,
    usage_score integer,
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT cs_health_current_org_product_key UNIQUE (organization_id, product_id)
);

-- ------------------------------------------------------------------
-- 6.49 cs_health_scores_history
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_health_scores_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    overall_score integer NOT NULL,
    health_status public.health_status NOT NULL,
    engagement_score integer,
    objectives_score integer,
    sentiment_score integer,
    usage_score integer,
    calculated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.50 cs_inbox_metrics
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_inbox_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid,
    group_id uuid,
    instance_id uuid,
    conversation_key text NOT NULL UNIQUE,
    first_customer_message_at timestamp with time zone,
    last_customer_message_at timestamp with time zone,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    is_waiting_response boolean DEFAULT false,
    wait_started_at timestamp with time zone,
    sla_status text DEFAULT 'ok'::text,
    sla_breached_at timestamp with time zone,
    total_sla_breaches integer DEFAULT 0,
    assigned_agent_id uuid,
    assigned_at timestamp with time zone,
    total_messages_received integer DEFAULT 0,
    total_messages_sent integer DEFAULT 0,
    total_interactions integer DEFAULT 0,
    avg_response_time_minutes numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.51 cs_interactions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text,
    member_id uuid,
    interaction_timestamp timestamp with time zone DEFAULT now(),
    type public.interaction_type NOT NULL,
    title text NOT NULL,
    description text,
    sentiment public.sentiment,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    scheduled_at timestamp with time zone,
    status text DEFAULT 'active'::text,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.52 cs_objectives
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    description text NOT NULL,
    deadline date NOT NULL,
    days_target integer NOT NULL,
    status public.objective_status DEFAULT 'pending'::public.objective_status,
    completed_at timestamp with time zone,
    assigned_to uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.53 cs_response_templates
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_response_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'geral'::text,
    shortcut text,
    product_id text,
    team text DEFAULT 'cs'::text,
    usage_count integer DEFAULT 0,
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.54 cs_success_metrics
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_success_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    testimonial_collected boolean DEFAULT false,
    testimonial_date date,
    testimonial_content text,
    testimonial_rating integer,
    testimonial_video_url text,
    upsell_done boolean DEFAULT false,
    upsell_value numeric,
    upsell_product text,
    upsell_date date,
    referrals_count integer DEFAULT 0,
    referrals_target integer DEFAULT 10,
    referrals_converted integer DEFAULT 0,
    is_success_case boolean DEFAULT false,
    success_case_url text,
    success_case_published_at timestamp with time zone,
    nps_score integer,
    nps_collected_at timestamp with time zone,
    nps_feedback text,
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT cs_success_metrics_org_product_key UNIQUE (organization_id, product_id)
);

-- ------------------------------------------------------------------
-- 6.55 cs_touchpoints
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_touchpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    touchpoint_date date NOT NULL,
    type public.touchpoint_type NOT NULL,
    channel public.touchpoint_channel NOT NULL,
    summary text NOT NULL,
    sentiment public.sentiment,
    next_action text,
    next_contact_date date,
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.56 deal_contacts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    deal_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    role text,
    is_primary boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT deal_contacts_deal_lead_key UNIQUE (deal_id, lead_id)
);

-- ------------------------------------------------------------------
-- 6.57 deal_loss_reasons
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_loss_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    label text NOT NULL UNIQUE,
    "position" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.58 deal_payment_installments
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_payment_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    deal_payment_id uuid NOT NULL,
    installment_number integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    asaas_installment_id text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT deal_payment_installments_payment_installment_key UNIQUE (deal_payment_id, installment_number)
);

-- ------------------------------------------------------------------
-- 6.59 deal_payments
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    deal_id uuid NOT NULL,
    payer_lead_id uuid,
    description text,
    billing_type text NOT NULL,
    gateway text DEFAULT 'asaas'::text,
    amount numeric(12,2) NOT NULL,
    installments integer DEFAULT 1,
    installment_value numeric(12,2),
    asaas_payment_id text,
    asaas_invoice_number text,
    payment_link text,
    invoice_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    due_date date NOT NULL,
    paid_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.60 email_campaign_leads
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_campaign_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    lead_id uuid,
    email text NOT NULL,
    name text,
    status text DEFAULT 'pending'::text NOT NULL,
    brevo_message_id text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    bounced_at timestamp with time zone,
    complained_at timestamp with time zone,
    unsubscribed_at timestamp with time zone,
    failed_at timestamp with time zone,
    error_message text,
    open_count integer DEFAULT 0,
    click_count integer DEFAULT 0,
    clicked_urls text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.61 email_campaigns
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    template_id uuid,
    subject text DEFAULT ''::text NOT NULL,
    from_name text DEFAULT ''::text NOT NULL,
    from_email text DEFAULT ''::text NOT NULL,
    reply_to text,
    html_content text,
    audience_filters jsonb DEFAULT '{}'::jsonb,
    total_leads integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    delivered_count integer DEFAULT 0,
    opened_count integer DEFAULT 0,
    clicked_count integer DEFAULT 0,
    bounced_count integer DEFAULT 0,
    complained_count integer DEFAULT 0,
    unsubscribed_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    paused_at timestamp with time zone,
    pause_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.62 email_sequence_enrollments
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_sequence_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    sequence_id uuid NOT NULL,
    lead_id uuid,
    email text NOT NULL,
    name text,
    status text DEFAULT 'active'::text NOT NULL,
    current_step integer DEFAULT 0,
    next_step_at timestamp with time zone,
    exit_reason text,
    enrolled_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.63 email_sequence_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_sequence_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    step_id uuid NOT NULL,
    sequence_id uuid NOT NULL,
    lead_id uuid,
    email text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    brevo_message_id text,
    sent_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    bounced_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.64 email_sequence_steps
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    sequence_id uuid NOT NULL,
    step_order integer DEFAULT 0 NOT NULL,
    template_id uuid,
    subject text DEFAULT ''::text NOT NULL,
    html_content text,
    delay_days integer DEFAULT 0,
    delay_hours integer DEFAULT 0,
    skip_if_opened boolean DEFAULT false,
    skip_if_clicked boolean DEFAULT false,
    sent_count integer DEFAULT 0,
    opened_count integer DEFAULT 0,
    clicked_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.65 email_sequences
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_sequences (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    trigger_type text DEFAULT 'manual'::text,
    trigger_config jsonb DEFAULT '{}'::jsonb,
    from_name text DEFAULT ''::text NOT NULL,
    from_email text DEFAULT ''::text NOT NULL,
    reply_to text,
    exit_on_reply boolean DEFAULT true,
    exit_on_unsubscribe boolean DEFAULT true,
    exit_on_deal_won boolean DEFAULT false,
    exit_on_bounce boolean DEFAULT true,
    total_enrolled integer DEFAULT 0,
    total_completed integer DEFAULT 0,
    total_exited integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.66 email_templates
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    html_content text DEFAULT ''::text NOT NULL,
    text_content text,
    design_json jsonb,
    thumbnail_url text,
    category text DEFAULT 'geral'::text,
    variables text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.67 email_unsubscribes
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    lead_id uuid,
    reason text,
    source text DEFAULT 'link'::text,
    unsubscribed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_unsubscribes_tenant_email_key UNIQUE (tenant_id, email)
);

-- ------------------------------------------------------------------
-- 6.68 financial_accounts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    type character varying DEFAULT 'bank_account'::character varying NOT NULL,
    institution character varying,
    description character varying,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    color character varying DEFAULT '#6B7280'::character varying,
    icon character varying DEFAULT 'Wallet'::character varying,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.69 financial_categories
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    type character varying NOT NULL,
    parent_id uuid,
    color character varying DEFAULT '#6B7280'::character varying,
    icon character varying DEFAULT 'CircleDollarSign'::character varying,
    is_system boolean DEFAULT false,
    "position" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.70 financial_entries
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    category_id uuid NOT NULL,
    description character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    entry_date date NOT NULL,
    type character varying DEFAULT 'expense'::character varying NOT NULL,
    recurrence character varying DEFAULT 'none'::character varying,
    recurrence_end_date date,
    payment_method character varying,
    receipt_url character varying,
    notes text,
    tags text[] DEFAULT '{}'::text[],
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying DEFAULT 'paid'::character varying,
    due_date date,
    paid_at timestamp with time zone,
    financial_account_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.71 franchise_campaigns
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.franchise_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    api_key uuid DEFAULT gen_random_uuid() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    min_capital_tier text DEFAULT 'acima_de_r$_100_mil'::text NOT NULL,
    whatsapp_instance_id uuid,
    also_distribute_to_sellers boolean DEFAULT true NOT NULL,
    message_template text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.72 franchise_distribution_log
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.franchise_distribution_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    campaign_id uuid NOT NULL,
    franchise_member_id uuid NOT NULL,
    lead_id uuid,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    whatsapp_sent boolean DEFAULT false,
    whatsapp_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.73 franchise_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.franchise_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    campaign_id uuid NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    cities text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    utm_identifier text
);

-- ------------------------------------------------------------------
-- 6.74 google_ads_accounts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_ads_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text NOT NULL UNIQUE,
    account_name text,
    organization_id uuid,
    is_active boolean DEFAULT true,
    last_synced_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.75 google_ads_campaign_data
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_ads_campaign_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text NOT NULL,
    organization_id uuid,
    campaign_id text NOT NULL,
    campaign_name text,
    date date NOT NULL,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    cost_micros bigint DEFAULT 0,
    conversions numeric DEFAULT 0,
    ctr numeric,
    average_cpc_micros bigint,
    campaign_status text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT google_ads_campaign_data_acct_org_campaign_date_key UNIQUE (account_id, organization_id, campaign_id, date)
);

-- ------------------------------------------------------------------
-- 6.76 google_ads_daily_data
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_ads_daily_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text NOT NULL,
    organization_id uuid,
    date date NOT NULL,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    cost_micros bigint DEFAULT 0,
    conversions numeric DEFAULT 0,
    ctr numeric,
    average_cpc_micros bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT google_ads_daily_data_acct_org_date_key UNIQUE (account_id, organization_id, date)
);

-- ------------------------------------------------------------------
-- 6.77 import_jobs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    created_by uuid,
    file_name text,
    total_rows integer DEFAULT 0,
    created_count integer DEFAULT 0,
    updated_count integer DEFAULT 0,
    skipped_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.78 integration_settings
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    provider text NOT NULL UNIQUE,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.79 lead_conversions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    conversion_type text DEFAULT 'new'::text NOT NULL,
    source text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    extra_data jsonb DEFAULT '{}'::jsonb,
    sales_rep_id uuid,
    deal_id uuid,
    origin text DEFAULT 'api'::text,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.80 lead_diagnostics_v2
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_diagnostics_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    business_stage character varying NOT NULL,
    age character varying,
    gender character varying,
    motivation text,
    ai_challenges text,
    monthly_revenue character varying,
    ai_course_experience character varying,
    biggest_dream text,
    immersion_content text,
    business_description text,
    time_consuming text,
    current_activity text,
    income_types text,
    qualification_score integer,
    other_goal text,
    which_ai_course text,
    ai_knowledge_level text,
    ai_knowledge_detail text,
    event_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.81 lead_distribution_config
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_distribution_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text DEFAULT 'Distribuicao Padrao'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    method text DEFAULT 'round_robin'::text NOT NULL,
    pipeline_id uuid,
    product_id text,
    first_stage_id uuid,
    require_availability boolean DEFAULT false NOT NULL,
    auto_create_deal boolean DEFAULT true NOT NULL,
    api_key uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.82 lead_distribution_log
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_distribution_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    config_id uuid,
    lead_id uuid,
    deal_id uuid,
    team_member_id uuid,
    method_used text DEFAULT 'round_robin'::text NOT NULL,
    source text DEFAULT 'api'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.83 lead_distribution_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_distribution_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    config_id uuid NOT NULL,
    team_member_id uuid NOT NULL,
    weight integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL,
    CONSTRAINT lead_distribution_members_config_member_key UNIQUE (config_id, team_member_id)
);

-- ------------------------------------------------------------------
-- 6.84 llm_provider_configs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.llm_provider_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    provider text NOT NULL,
    api_key text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.85 marketing_forms
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    description text,
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    style jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    redirect_url text,
    success_message text DEFAULT 'Obrigado! Entraremos em contato em breve.'::text,
    is_active boolean DEFAULT true,
    submissions_count integer DEFAULT 0,
    last_submission_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.86 meetings
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    type text,
    participants jsonb NOT NULL,
    transcriptions jsonb,
    summary text,
    key_points jsonb,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    organization_id uuid,
    lead_id uuid,
    activity_id uuid,
    created_by uuid,
    meeting_link character varying(500),
    meeting_type character varying(50) DEFAULT 'interno'::character varying,
    team character varying(50),
    audio_url character varying(500),
    soniox_session_id character varying(255),
    ai_analysis jsonb,
    processed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.87 member_calls_history
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_calls_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    member_email text,
    member_user_id uuid,
    call_id uuid,
    call_title text,
    call_type text,
    call_date timestamp with time zone,
    join_time timestamp with time zone,
    leave_time timestamp with time zone,
    duration_minutes integer,
    call_total_duration integer,
    attendance_percentage numeric,
    created_at timestamp with time zone DEFAULT now(),
    lead_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.88 member_daily_activity
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_daily_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    member_email text,
    member_user_id uuid,
    activity_date date,
    sessions integer,
    page_views integer,
    time_minutes integer,
    lessons_watched integer,
    lessons_completed integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lead_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.89 member_engagement_snapshots
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_engagement_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    member_user_id_external uuid,
    member_email text,
    member_name text,
    member_user_id uuid,
    snapshot_hour timestamp with time zone,
    last_access timestamp with time zone,
    days_since_last_access integer,
    total_sessions integer,
    sessions_last_7_days integer,
    sessions_last_30_days integer,
    total_time_minutes integer,
    lessons_started integer,
    lessons_completed integer,
    lessons_completion_rate numeric,
    calls_attended integer,
    calls_total_minutes integer,
    last_call_date timestamp with time zone,
    risk_score integer,
    risk_status text,
    created_at timestamp with time zone DEFAULT now(),
    lead_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.90 member_lessons_progress
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_lessons_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    member_user_id uuid,
    member_email text,
    lesson_id text,
    lesson_title text,
    project_id text,
    completed boolean DEFAULT false,
    seconds_watched integer DEFAULT 0,
    completed_at timestamp with time zone,
    started_at timestamp with time zone,
    last_watched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lead_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.91 meta_ads_accounts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_ads_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text NOT NULL,
    account_name text,
    is_active boolean DEFAULT true,
    last_synced_date date,
    is_syncing boolean DEFAULT false,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.92 meta_ads_ad_data
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_ads_ad_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text NOT NULL,
    ad_id text NOT NULL,
    ad_name text,
    campaign_id text,
    campaign_name text,
    adset_id text,
    adset_name text,
    date date NOT NULL,
    aggregation_level text NOT NULL,
    spend numeric DEFAULT 0,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    ctr numeric DEFAULT 0,
    cpc numeric DEFAULT 0,
    frequency numeric DEFAULT 0,
    image_url text,
    thumbnail_url text,
    link_url text,
    body text,
    headline text,
    description text,
    status text,
    total_conversions bigint DEFAULT 0,
    primary_conversions bigint DEFAULT 0,
    cost_per_conversion numeric DEFAULT 0,
    campaign_objective text,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.93 meta_ads_conversions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_ads_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    ad_data_id uuid,
    conversion_type text NOT NULL,
    conversion_count bigint DEFAULT 0,
    conversion_value numeric DEFAULT 0,
    cost_per_conversion numeric DEFAULT 0,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.94 meta_ads_daily_data
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_ads_daily_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text NOT NULL,
    date date NOT NULL,
    aggregation_level text NOT NULL,
    total_spend numeric DEFAULT 0,
    total_impressions bigint DEFAULT 0,
    total_clicks bigint DEFAULT 0,
    total_leads bigint DEFAULT 0,
    ctr numeric DEFAULT 0,
    cpl numeric DEFAULT 0,
    conversion_rate numeric DEFAULT 0,
    frequency numeric DEFAULT 0,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.95 meta_ads_sync_log
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_ads_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id text,
    sync_type text NOT NULL,
    start_date date,
    end_date date,
    status text DEFAULT 'running'::text NOT NULL,
    records_processed integer DEFAULT 0,
    error_message text,
    execution_time_ms integer,
    completed_at timestamp with time zone,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.96 meta_lead_ads_forms
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_lead_ads_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    page_id text NOT NULL,
    form_id text NOT NULL,
    form_name text NOT NULL,
    is_enabled boolean DEFAULT true,
    leads_count integer DEFAULT 0,
    last_lead_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.97 meta_lead_ads_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_lead_ads_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    page_id text,
    form_id text,
    form_name text,
    leadgen_id text,
    lead_name text,
    lead_email text,
    lead_phone text,
    status text DEFAULT 'success'::text,
    error_message text,
    lead_id uuid,
    deal_id uuid,
    assigned_to_name text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.98 meta_lead_ads_pages
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_lead_ads_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    page_id text NOT NULL,
    page_name text NOT NULL,
    page_access_token text NOT NULL,
    is_active boolean DEFAULT true,
    total_leads_synced integer DEFAULT 0,
    last_lead_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.99 migration_log
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.migration_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    batch_offset integer DEFAULT 0 NOT NULL,
    deals_processed integer DEFAULT 0,
    leads_created integer DEFAULT 0,
    leads_deduped integer DEFAULT 0,
    deals_created integer DEFAULT 0,
    activities_created integer DEFAULT 0,
    errors integer DEFAULT 0,
    error_details jsonb,
    status text DEFAULT 'BATCH_COMPLETE'::text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.100 notification_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    rule_id uuid,
    rule_name character varying(255),
    event_id uuid,
    event_type character varying(50),
    channel character varying(50),
    target character varying(255),
    message text,
    status character varying(50) DEFAULT 'pending'::character varying,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.101 notification_rules
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    trigger_type character varying(50) NOT NULL,
    trigger_event character varying(50),
    trigger_minutes integer,
    trigger_time time without time zone,
    trigger_days character varying[],
    action_channel character varying(50) NOT NULL,
    action_target_type character varying(50),
    action_target_id character varying(255),
    action_target_phone character varying(50),
    message_template text NOT NULL,
    enabled boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    action_instance_id uuid,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.102 onboarding_stages
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    "position" integer DEFAULT 0 NOT NULL,
    icon text DEFAULT 'circle'::text,
    color text DEFAULT '#6B7280'::text,
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    checklist jsonb DEFAULT '[]'::jsonb
);

-- ------------------------------------------------------------------
-- 6.103 onboardings
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboardings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid,
    meeting_id uuid,
    activity_id uuid,
    product_id text DEFAULT 'pain'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    transcription_source text,
    transcription_raw text,
    dossier jsonb DEFAULT '{}'::jsonb,
    form_token text,
    form_url text,
    form_sent_at timestamp with time zone,
    form_opened_at timestamp with time zone,
    form_completed_at timestamp with time zone,
    confirmed_data jsonb DEFAULT '{}'::jsonb,
    additional_members jsonb DEFAULT '[]'::jsonb,
    plan text DEFAULT 'basic'::text,
    seats_limit integer DEFAULT 5,
    add_to_whatsapp boolean DEFAULT true,
    send_welcome boolean DEFAULT true,
    journey_config jsonb DEFAULT '{}'::jsonb,
    approved_at timestamp with time zone,
    approved_by uuid,
    rejected_at timestamp with time zone,
    rejected_by uuid,
    rejection_reason text,
    webhook_response jsonb,
    external_org_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    early_access_granted boolean DEFAULT false,
    early_access_at timestamp with time zone,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.104 organization_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    user_id uuid,
    role public.member_role DEFAULT 'member'::public.member_role NOT NULL,
    job_title text,
    is_admin boolean DEFAULT false,
    can_invite boolean DEFAULT false,
    status public.member_status DEFAULT 'active'::public.member_status,
    invited_by uuid,
    invited_at timestamp with time zone,
    joined_at timestamp with time zone,
    invite_token text,
    invite_expires_at timestamp with time zone,
    whatsapp_in_group boolean DEFAULT false,
    whatsapp_added_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.105 organization_products
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL,
    product_id text NOT NULL,
    deal_id uuid,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    onboarding_status public.onboarding_status DEFAULT 'pending'::public.onboarding_status,
    onboarding_started_at timestamp with time zone,
    onboarding_completed_at timestamp with time zone,
    journey_stage public.journey_stage DEFAULT 'pending_onboard'::public.journey_stage,
    cs_status public.cs_status DEFAULT 'active'::public.cs_status,
    cs_rep_id uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.106 pain_registrations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pain_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    company_name text,
    monthly_revenue text,
    payment_option text,
    status text DEFAULT 'pending'::text,
    notes text,
    assignee text,
    payment_method text,
    payment_details text,
    amount_paid integer DEFAULT 0,
    amount_total integer DEFAULT 0,
    amount_balance integer DEFAULT 0,
    payment_platform text,
    loss_reason text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.107 payment_gateway_fees
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_gateway_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    gateway_id uuid NOT NULL,
    billing_type character varying NOT NULL,
    fee_percent numeric(5,2) DEFAULT 0 NOT NULL,
    fee_fixed numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.108 payment_gateways
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.109 receive_lead_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receive_lead_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    api_key text,
    config_id uuid,
    origin text,
    lead_name text,
    lead_email text,
    lead_phone text,
    lead_source text,
    status text DEFAULT 'pending'::text NOT NULL,
    lead_id uuid,
    deal_id uuid,
    assigned_to uuid,
    assigned_to_name text,
    dedup_match text,
    existing_lead_id uuid,
    error_message text,
    error_details jsonb,
    raw_payload jsonb,
    processing_ms integer,
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.110 sales_alerts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    sales_rep_id uuid,
    alert_type text NOT NULL,
    title text NOT NULL,
    description text,
    priority integer DEFAULT 5,
    is_read boolean DEFAULT false,
    is_actioned boolean DEFAULT false,
    actioned_at timestamp with time zone,
    expires_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.111 sales_automation_rules
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_automation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    trigger_conditions jsonb DEFAULT '{}'::jsonb,
    action_type text NOT NULL,
    action_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    team text DEFAULT 'sales'::text,
    priority integer DEFAULT 10,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.112 sales_materials
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    file_size bigint,
    mime_type character varying(100),
    tags text[] DEFAULT '{}'::text[],
    usage_hint text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.113 sales_notes
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid,
    deal_id uuid,
    content text NOT NULL,
    note_type text DEFAULT 'note'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.114 sales_pipeline_transitions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_pipeline_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    source_pipeline_id uuid,
    source_stage_id uuid,
    target_pipeline_id uuid,
    target_stage_id uuid,
    action character varying DEFAULT 'move'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.115 sales_playbooks
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_playbooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    trigger_conditions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.116 sdr_closer_transfers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sdr_closer_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    deal_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    sdr_id uuid NOT NULL,
    closer_id uuid,
    from_pipeline_id uuid NOT NULL,
    from_stage_id uuid NOT NULL,
    to_pipeline_id uuid NOT NULL,
    to_stage_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    qualification_snapshot jsonb DEFAULT '{}'::jsonb,
    return_reason text,
    return_notes text,
    transferred_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    returned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.117 social_seller_alerts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_seller_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL,
    lead_id uuid,
    rule_id uuid,
    alert_type text NOT NULL,
    title text NOT NULL,
    message text,
    trigger_message text,
    detected_keywords text[],
    from_stage text,
    to_stage text,
    status text DEFAULT 'pending'::text,
    viewed_at timestamp with time zone,
    actioned_at timestamp with time zone,
    actioned_by uuid,
    action_notes text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.118 social_seller_rules
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_seller_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    from_stage_id uuid,
    to_stage_id uuid NOT NULL,
    create_alert boolean DEFAULT false,
    alert_message text,
    notify_whatsapp boolean DEFAULT false,
    notification_template text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.119 social_seller_stages
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_seller_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    color text DEFAULT '#6B7280'::text,
    icon text DEFAULT 'circle'::text,
    "position" integer NOT NULL,
    is_active boolean DEFAULT true,
    is_final boolean DEFAULT false,
    is_converted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.120 twilio_call_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.twilio_call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    call_sid text NOT NULL,
    parent_call_sid text,
    call_status text NOT NULL,
    direction text,
    from_number text,
    to_number text,
    caller_id text,
    duration integer,
    sip_response_code text,
    error_code text,
    error_message text,
    "timestamp" timestamp with time zone DEFAULT now(),
    raw_params jsonb,
    call_history_id uuid,
    team_member_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------------
-- 6.121 wavoip_devices
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wavoip_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    team_member_id uuid,
    token text NOT NULL,
    name text,
    phone_number text,
    status text DEFAULT 'disconnected'::text,
    webhook_configured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.122 whatsapp_task_bot_config
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_task_bot_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text DEFAULT 'Bot de Tarefas'::text NOT NULL,
    instance_id uuid,
    bot_mention_id text NOT NULL,
    enabled_group_ids uuid[] DEFAULT '{}'::uuid[],
    ai_prompt text DEFAULT 'Voce e um assistente que cria tarefas a partir de conversas de WhatsApp.'::text NOT NULL,
    context_messages_count integer DEFAULT 20,
    auto_assign_to_sender boolean DEFAULT true,
    default_task_type text DEFAULT 'follow_up'::text,
    notify_on_creation boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);

-- ------------------------------------------------------------------
-- 6.123 whatsapp_task_bot_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_task_bot_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    config_id uuid,
    group_id uuid,
    trigger_message_id uuid,
    trigger_content text,
    sender_name text,
    sender_phone text,
    context_messages jsonb,
    ai_response jsonb,
    action_taken text,
    task_id uuid,
    response_message text,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT public.get_tenant_id() NOT NULL
);


-- ====================================================================
-- SECTION 7: ai_agent_chat_events TABLE (from 001_post_baseline_fixes)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.ai_agent_chat_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lead_id uuid NOT NULL,
    agent_id uuid,
    conversation_id uuid,
    event_type text NOT NULL,
    reason text,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_chat_events_lead_id_created
    ON public.ai_agent_chat_events(lead_id, created_at DESC);


-- ====================================================================
-- SECTION 8: HELPER FUNCTIONS used by the CRM
-- ====================================================================

-- set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- update_updated_at_column (alias used by some triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- is_tenant_admin()
CREATE OR REPLACE FUNCTION public.is_tenant_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND tenant_id = get_tenant_id()
  )
$$;

-- is_superadmin()
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE auth_user_id = auth.uid()
    AND is_superadmin = true
  );
END;
$$;

-- log_ai_agent_event
CREATE OR REPLACE FUNCTION public.log_ai_agent_event(
  p_lead_id uuid, p_event_type text, p_message text, p_reason text DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL, p_conversation_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.ai_agent_chat_events (lead_id, agent_id, conversation_id, event_type, reason, message, metadata)
  VALUES (p_lead_id, p_agent_id, p_conversation_id, p_event_type, p_reason, p_message, p_metadata)
  RETURNING id;
$$;


-- ====================================================================
-- DONE
-- ====================================================================

COMMIT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
