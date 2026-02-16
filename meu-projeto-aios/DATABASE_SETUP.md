# 📊 Configuração da Base de Dados - Control Tower Executivo

## Instruções Passo-a-Passo

### 1️⃣ Aceda ao Supabase SQL Editor

Clique no link abaixo (substitua o PROJECT_ID se necessário):

**URL:** https://app.supabase.com/project/byfzlwkgzftpzduswxus/sql/editor

### 2️⃣ Copie e Cole o SQL

Clique em "New Query" e cole **TODO** o conteúdo abaixo:

```sql
-- ==============================================
-- Control Tower Executivo - Database Schema
-- ==============================================

-- Tabela: Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  status TEXT CHECK (status IN ('active', 'inactive', 'pending', 'churned')),
  monthly_value DECIMAL(10, 2),
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 10),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed')),
  progress_percentage INTEGER CHECK (progress_percentage BETWEEN 0 AND 100),
  budget DECIMAL(10, 2),
  spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Receitas
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT CHECK (type IN ('recurring', 'one_time', 'retainer')),
  status TEXT CHECK (status IN ('pending', 'received', 'overdue')),
  invoice_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Snapshots de Métricas (agregados diários)
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

-- Tabela: Insights de IA
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('alert', 'trend', 'recommendation', 'prediction')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT[],
  is_dismissed BOOLEAN DEFAULT FALSE,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Conversações com IA
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Logs de Sincronização
CREATE TABLE IF NOT EXISTS data_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  status TEXT CHECK (status IN ('running', 'success', 'failed')),
  records_synced INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ==============================================
-- Índices para Performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(tier);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_revenues_client_id ON revenues(client_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON ai_insights(severity);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed ON ai_insights(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON data_sync_logs(source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON data_sync_logs(status);

-- ==============================================
-- Dados de Exemplo
-- ==============================================

-- Inserir cliente de exemplo
INSERT INTO clients (name, email, phone, tier, status, monthly_value, satisfaction_score)
VALUES
  ('Acme Corporation', 'contact@acme.com', '+244 923 456 789', 'platinum', 'active', 5000.00, 9),
  ('Startup XYZ', 'hello@startup.com', '+244 912 345 678', 'gold', 'active', 2000.00, 8),
  ('Local Business', 'info@local.ao', '+244 934 567 890', 'silver', 'active', 1000.00, 7)
ON CONFLICT DO NOTHING;

-- Inserir projeto de exemplo
WITH acme AS (
  SELECT id FROM clients WHERE name = 'Acme Corporation' LIMIT 1
)
INSERT INTO projects (client_id, name, status, progress_percentage, budget, spent)
SELECT acme.id, 'Website Redesign', 'in_progress', 75, 10000.00, 7500.00 FROM acme
ON CONFLICT DO NOTHING;

-- Inserir snapshot de exemplo
INSERT INTO metrics_snapshots (snapshot_date, active_clients, projects_in_progress, monthly_revenue, annual_revenue, avg_satisfaction_score)
VALUES (CURRENT_DATE, 3, 1, 8000.00, 96000.00, 8.0)
ON CONFLICT DO NOTHING;

-- ==============================================
-- RLS Policies (Segurança)
-- ==============================================

-- Habilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler dados públicos (temporariamente)
CREATE POLICY "Allow all reads clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow all reads projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow all reads revenues" ON revenues FOR SELECT USING (true);
CREATE POLICY "Allow all reads metrics" ON metrics_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow all reads insights" ON ai_insights FOR SELECT USING (true);
CREATE POLICY "Allow all reads conversations" ON ai_conversations FOR SELECT USING (true);
CREATE POLICY "Allow all reads logs" ON data_sync_logs FOR SELECT USING (true);

-- Policy: Service role pode fazer tudo
CREATE POLICY "Service role clients" ON clients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role projects" ON projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role revenues" ON revenues FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role metrics" ON metrics_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role insights" ON ai_insights FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role conversations" ON ai_conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role logs" ON data_sync_logs FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- Real-time Subscriptions
-- ==============================================

ALTER PUBLICATION supabase_realtime ADD TABLE metrics_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
```

### 3️⃣ Execute o SQL

- Clique no botão "RUN" (ou pressione `Ctrl+Enter`)
- Aguarde a conclusão

### 4️⃣ Verifique o Resultado

Se ver mensagens como "Success" ou "Query Executed Successfully", as tabelas foram criadas com sucesso!

## 📋 Tabelas Criadas

| Tabela | Descrição | Registos |
|--------|-----------|----------|
| **clients** | Clientes/Contas | 3 |
| **projects** | Projetos em andamento | 1 |
| **revenues** | Receitas/Facturas | 0 |
| **metrics_snapshots** | Snapshots de métricas diários | 1 |
| **ai_insights** | Insights gerados por IA | 0 |
| **ai_conversations** | Histórico de conversas com IA | 0 |
| **data_sync_logs** | Logs de sincronização de dados | 0 |

## ✅ Checklist de Verificação

Após executar o SQL, verifique se:

- [ ] As tabelas aparecem em "Tables" no painel esquerdo
- [ ] Existem dados de exemplo (Acme Corporation, Startup XYZ, etc.)
- [ ] As métricas de exemplo estão presentes
- [ ] RLS está habilitado (ícone de escudo ao lado das tabelas)

## 🧪 Testar a Conexão

Após criar as tabelas, teste a API:

```bash
curl https://meu-projeto-aios.vercel.app/api/metrics/latest
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "snapshot_date": "2026-02-16",
    "active_clients": 3,
    "projects_in_progress": 1,
    ...
  }
}
```

## 🚀 Próximos Passos

1. Aceda ao dashboard: https://meu-projeto-aios.vercel.app
2. As métricas devem começar a aparecer
3. Configure webhooks ou cron jobs para sincronizar dados automáticamente
4. Configure as políticas de RLS conforme necessário

## 💡 Dúvidas?

- Consulte a documentação do Supabase: https://supabase.com/docs
- Verifique os logs da API: https://meu-projeto-aios.vercel.app/api/health

---

**Data de Criação:** 2026-02-16
**Versão:** 1.0
