-- ============================================================================
-- Migração 002 — Clone da base ISILDA com rename clientes→leads (em cascata)
-- ----------------------------------------------------------------------------
-- Porquê: o SIC Global Minds herda a fundação transaccional da ISILDA (perfis,
-- contactos, interacoes, historico de fase, mensagens WhatsApp, chaves de
-- integracao, instancias WhatsApp), mas a tabela nuclear de contactos passa a
-- chamar-se `leads` (nao `clientes`) porque o modulo marketing e a heranca
-- comercial do SIC-MD referenciam `public.leads` literalmente. Fonte vinculativa:
-- Arquitectura §2.2 (decisao nuclear) e §2.3 (tabela a tabela).
--
-- REGRA DE DISCIPLINA (§2.2): o rename clientes→leads e cliente_id→lead_id faz-se
-- AQUI, na 002, ANTES de qualquer tabela nova. Nenhuma tabela criada a partir
-- daqui nasce com `cliente_id`. Esta migracao ja escreve tudo com `leads`/`lead_id`.
--
-- Ajustes face a ISILDA:
--   * `clientes`            → `leads`      (+ todas as FKs cliente_id → lead_id)
--   * `whatsapp_instances`  → SEM coluna `tenant_id` (single-tenant, ADR-01)
--   * trigger updated_at de whatsapp_instances usa handle_updated_at() (a ISILDA
--     usava update_ai_updated_at(), definida no schema do agente que NAO entra
--     nesta story de fundacao)
--   * removidas quaisquer referencias de dominio Isilda/Delicias (nao ha DDL
--     especifico de bolos/pedidos nestas 8 tabelas base — o dominio Isilda vivia
--     nas migracoes 010+ que NAO sao clonadas)
--
-- Ambito desta migracao (8 tabelas base — story 1.1 AC3):
--   profiles, leads (era clientes), interacoes, mudancas_estagio,
--   mensagens_whatsapp, integration_keys, whatsapp_instances
--   (+ helper handle_updated_at / handle_new_user herdados da 002 ISILDA)
-- ============================================================================


-- ── Helpers herdados (updated_at + provisionamento de perfil) ───────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── profiles (ISILDA 002 — auth base, mantida) ──────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistente' CHECK (role IN ('admin', 'assistente')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis visiveis para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Utilizadores podem actualizar proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin pode actualizar qualquer perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin pode inserir perfis" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR auth.uid() = id);
CREATE POLICY "Service role all profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'assistente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── leads (ISILDA 003 `clientes` RENOMEADA) ─────────────────────────────────
-- Estrutura base herdada tal e qual; a extensao de qualificacao (BANT, score,
-- temperatura, pipeline_fase, etc.) entra na migracao 010 do dominio GM (E2),
-- FORA desta story de fundacao.
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp_id TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'Luanda',
  estagio TEXT DEFAULT 'novo' CHECK (estagio IN ('novo', 'contactado', 'orcamento', 'activo', 'vip', 'inactivo')),
  origem TEXT DEFAULT 'whatsapp' CHECK (origem IN ('instagram', 'tiktok', 'whatsapp', 'indicacao', 'outro')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  total_pedidos INTEGER DEFAULT 0,
  total_gasto NUMERIC(12,2) DEFAULT 0,
  ticket_medio NUMERIC(12,2) DEFAULT 0,
  ultima_compra TIMESTAMPTZ,
  ultimo_contacto TIMESTAMPTZ,
  etiquetas TEXT[] DEFAULT '{}',
  notas TEXT,
  criado_por_bot BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT leads_telefone_unique UNIQUE (telefone)
);

CREATE INDEX idx_leads_telefone ON public.leads(telefone);
CREATE INDEX idx_leads_whatsapp_id ON public.leads(whatsapp_id) WHERE whatsapp_id IS NOT NULL;
CREATE INDEX idx_leads_estagio ON public.leads(estagio);
CREATE INDEX idx_leads_origem ON public.leads(origem);
CREATE INDEX idx_leads_ultima_compra ON public.leads(ultima_compra DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete leads" ON public.leads FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role all leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── interacoes (ISILDA 004 — cliente_id → lead_id) ──────────────────────────
CREATE TABLE public.interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nota', 'chamada', 'whatsapp', 'email', 'reuniao')),
  conteudo TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interacoes_lead ON public.interacoes(lead_id);
CREATE INDEX idx_interacoes_created ON public.interacoes(created_at DESC);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interacoes visiveis para autenticados" ON public.interacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem criar interacoes" ON public.interacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem editar interacoes" ON public.interacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role all interacoes" ON public.interacoes FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── mudancas_estagio (ISILDA 005 — cliente_id → lead_id) ────────────────────
CREATE TABLE public.mudancas_estagio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  estagio_anterior TEXT NOT NULL,
  estagio_novo TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mudancas_lead ON public.mudancas_estagio(lead_id);
CREATE INDEX idx_mudancas_created ON public.mudancas_estagio(created_at DESC);

ALTER TABLE public.mudancas_estagio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mudancas visiveis para autenticados" ON public.mudancas_estagio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem registar mudancas" ON public.mudancas_estagio FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role all mudancas" ON public.mudancas_estagio FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── mensagens_whatsapp (ISILDA 006 — cliente_id → lead_id) ──────────────────
CREATE TABLE public.mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('cliente', 'bot', 'humano', 'sistema')),
  conteudo TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing', 'internal')),
  message_status TEXT DEFAULT 'sent' CHECK (message_status IN ('sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT,
  media_url TEXT,
  media_type TEXT,
  intencao_classificada TEXT,
  confianca_classificacao NUMERIC(3,2),
  llm_model TEXT,
  llm_tokens_input INTEGER,
  llm_tokens_output INTEGER,
  llm_latencia_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_msgs_whatsapp_id ON public.mensagens_whatsapp(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX idx_msgs_lead ON public.mensagens_whatsapp(lead_id);
CREATE INDEX idx_msgs_created ON public.mensagens_whatsapp(created_at DESC);
CREATE INDEX idx_msgs_direction ON public.mensagens_whatsapp(direction) WHERE direction = 'incoming';

ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read mensagens" ON public.mensagens_whatsapp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert mensagens" ON public.mensagens_whatsapp FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update mensagens" ON public.mensagens_whatsapp FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role all mensagens" ON public.mensagens_whatsapp FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_whatsapp;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── integration_keys (ISILDA 007 — chaves com fallback env, mantida) ────────
CREATE TABLE public.integration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service, key_name)
);

ALTER TABLE public.integration_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage integration_keys" ON public.integration_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration_keys" ON public.integration_keys FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── whatsapp_instances (ISILDA 030 — SEM tenant_id, single-tenant ADR-01) ───
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT,
  teams TEXT[] DEFAULT ARRAY['comercial'],
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  api_key TEXT,
  api_url TEXT,
  webhook_url TEXT,
  bypass_disconnect BOOLEAN DEFAULT false,
  purpose TEXT DEFAULT 'inbox',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_instances_status ON public.whatsapp_instances(status);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage whatsapp_instances" ON public.whatsapp_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages whatsapp_instances" ON public.whatsapp_instances FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS whatsapp_instances_updated_at ON public.whatsapp_instances;
--   DROP TABLE IF EXISTS public.whatsapp_instances;
--   DROP TABLE IF EXISTS public.integration_keys;
--   DROP TABLE IF EXISTS public.mensagens_whatsapp;
--   DROP TABLE IF EXISTS public.mudancas_estagio;
--   DROP TABLE IF EXISTS public.interacoes;
--   DROP TRIGGER IF EXISTS leads_updated_at ON public.leads;
--   DROP TABLE IF EXISTS public.leads;
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
--   DROP TABLE IF EXISTS public.profiles;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
--   DROP FUNCTION IF EXISTS public.handle_updated_at();
-- ============================================================================
