-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE,  -- ID do Zoho CRM
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  status TEXT CHECK (status IN ('active', 'inactive', 'pending', 'churned')) DEFAULT 'pending',
  monthly_value DECIMAL(10, 2) DEFAULT 0,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 10),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed')) DEFAULT 'planning',
  progress_percentage INTEGER CHECK (progress_percentage BETWEEN 0 AND 100) DEFAULT 0,
  budget DECIMAL(10, 2),
  spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receitas
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT CHECK (type IN ('recurring', 'one_time', 'retainer')) DEFAULT 'recurring',
  status TEXT CHECK (status IN ('pending', 'received', 'overdue')) DEFAULT 'pending',
  invoice_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots de Métricas (agregados diários)
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL UNIQUE,
  active_clients INTEGER DEFAULT 0,
  projects_in_progress INTEGER DEFAULT 0,
  monthly_revenue DECIMAL(10, 2) DEFAULT 0,
  annual_revenue DECIMAL(10, 2) DEFAULT 0,
  avg_satisfaction_score DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights de IA
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('alert', 'trend', 'recommendation', 'prediction')) DEFAULT 'alert',
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT[] DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT FALSE,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversações com IA
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Sincronização
CREATE TABLE IF NOT EXISTS data_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,  -- 'zoho-crm', 'google-sheets', etc.
  status TEXT CHECK (status IN ('running', 'success', 'failed')) DEFAULT 'running',
  records_synced INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- ÍNDICES (PERFORMANCE)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_revenues_client_id ON revenues(client_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dismissed ON ai_insights(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON data_sync_logs(source, started_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users podem ler dados
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can read revenues"
  ON revenues FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can read metrics"
  ON metrics_snapshots FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can read insights"
  ON ai_insights FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can read conversations"
  ON ai_conversations FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Authenticated users can read sync logs"
  ON data_sync_logs FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

-- Policy: Service role pode fazer tudo
CREATE POLICY "Service role can write clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write projects"
  ON projects FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write revenues"
  ON revenues FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write metrics"
  ON metrics_snapshots FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write insights"
  ON ai_insights FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write conversations"
  ON ai_conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write sync logs"
  ON data_sync_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Ativar Realtime nas tabelas críticas
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS metrics_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS clients;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS projects;
