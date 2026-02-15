# Fase 2: Adaptadores de Dados - Control Tower

## 🔄 Implementação Concluída

Adaptadores de dados totalmente funcionais para sincronização automática de clientes e receitas.

### 📁 Estrutura de Ficheiros

```
backend/
├── adapters/
│   ├── BaseAdapter.js              # Classe base com padrão AIOS
│   ├── ZohoCRMAdapter.js           # Integração Zoho CRM (OAuth 2.0)
│   ├── GoogleSheetsAdapter.js      # Importação Google Sheets
│   ├── AccountingAdapter.js        # API genérica de contabilidade
│   └── AdapterFactory.js           # Factory para criar adaptadores
├── services/
│   └── MetricsAggregator.js        # Agregação de métricas diárias
├── config/
│   └── adapters.js                 # Configuração dos adaptadores
└── server.js                       # API Fastify com integrações
```

### 🛠️ Adaptadores Implementados

#### 1. **Zoho CRM Adapter**
- ✅ OAuth 2.0 com refresh token automático
- ✅ Buscar clientes (Accounts module)
- ✅ Mapear tiers (bronze, silver, gold, platinum)
- ✅ Upsert automático por external_id
- ✅ Supporte múltiplas regiões (com, eu, cn, in)

**Configuração (.env):**
```env
ZOHO_CLIENT_ID=seu-client-id
ZOHO_CLIENT_SECRET=seu-client-secret
ZOHO_REFRESH_TOKEN=seu-refresh-token
ZOHO_REGION=com              # ou 'eu', 'cn', 'in'
```

#### 2. **Google Sheets Adapter**
- ✅ Importar dados de Google Sheets/Excel
- ✅ Normalizar headers automaticamente
- ✅ Buscar cliente por nome (fuzzy match)
- ✅ Suportar múltiplos formatos de data
- ✅ Parsing de valores numéricos

**Configuração (.env):**
```env
GOOGLE_SHEETS_API_KEY=sua-api-key
GOOGLE_SHEETS_ID=seu-spreadsheet-id
GOOGLE_SHEETS_NAME=Receitas          # Nome da aba (opcional)
```

#### 3. **Accounting Adapter** (Genérico)
- ✅ API REST genérica configurável
- ✅ Supporte múltiplos tipos de autenticação (Bearer, API Key)
- ✅ Normalizar respostas de APIs diversas
- ✅ Identificar invoices recorrentes
- ✅ Mapear status (paid, pending, overdue)

**Configuração (.env):**
```env
ACCOUNTING_API_URL=https://sua-api.com
ACCOUNTING_API_KEY=sua-chave-api
ACCOUNTING_AUTH_TYPE=bearer          # ou 'apikey'
```

### 📊 Ciclo de Sincronização

Cada adaptador segue o padrão AIOS:

```
1. testConnection()      → Validar conexão com fonte
2. fetchData()           → Buscar dados brutos
3. normalizeData()       → Transformar para formato interno
4. mapToDatabase()       → Mapear para schema Supabase
5. saveToDatabase()      → Inserir/atualizar no BD
```

### ⏰ Cron Jobs Automáticos

| Fonte | Schedule | Frequência |
|-------|----------|-----------|
| Zoho CRM | `0 */4 * * *` | A cada 4 horas |
| Google Sheets | `0 */6 * * *` | A cada 6 horas |
| Accounting | `0 */8 * * *` | A cada 8 horas |
| Métricas | `59 23 * * *` | Diariamente às 23:59 |

### 🔌 Endpoints da API

#### Sync Manual
```bash
# Trigger manual de sync
POST /api/sync/:source
# Fontes: zoho-crm, google-sheets, accounting

# Exemplo:
curl -X POST http://localhost:3000/api/sync/zoho-crm
```

#### Status dos Adaptadores
```bash
# Ver status de todos os adaptadores
GET /api/adapters/status

# Resposta:
{
  "zoho-crm": {
    "enabled": true,
    "initialized": true,
    "adapterStatus": {
      "name": "ZohoCRMAdapter",
      "syncInProgress": false,
      "lastSyncTime": "2026-02-15T10:30:00Z"
    }
  }
}
```

#### Sync Logs
```sql
-- Verificar logs de sincronização
SELECT * FROM data_sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

### 🚀 Como Usar

#### 1. Configurar Variáveis de Ambiente

```bash
cp .env.example .env

# Editar e adicionar credenciais:
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REFRESH_TOKEN=...
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEETS_ID=...
```

#### 2. Iniciar Backend

```bash
cd backend
npm install
npm run dev        # ou 'npm start'

# Output esperado:
# 🔧 Inicializando adaptadores...
# ✅ Adaptador zoho-crm pronto
# ✅ Adaptador google-sheets pronto
# 📅 Configurando cron jobs...
# ⏰ Cron job configurado para zoho-crm: 0 */4 * * *
# 🚀 Servidor iniciado em porta 3000
```

#### 3. Trigger Manual de Sync

```bash
# Sincronizar Zoho CRM
curl -X POST http://localhost:3000/api/sync/zoho-crm

# Sincronizar Google Sheets
curl -X POST http://localhost:3000/api/sync/google-sheets

# Ver status
curl http://localhost:3000/api/adapters/status
```

#### 4. Verificar Dados no Dashboard

1. Abrir http://localhost:5173
2. Dashboard mostra clientes sincronizados
3. KPIs actualizados em tempo real (Realtime)

### 📈 Fluxo de Dados

```
Zoho CRM                Google Sheets           Accounting
    |                      |                        |
    └─→ OAuth 2.0      └─→ API Key           └─→ REST API
        Fetch Accounts      Fetch Data          Fetch Invoices
             |                  |                    |
             └──────────────────┴────────────────────┘
                          |
                  AdapterFactory.sync()
                          |
            ┌─────────────┼─────────────┐
            |             |             |
       normalize      normalize      normalize
            |             |             |
       mapToDatabase  mapToDatabase  mapToDatabase
            |             |             |
            └─────────────┴─────────────┘
                          |
                   Supabase Database
                          |
                  ┌────────┴────────┐
                  |                 |
            clients table      revenues table
                  |                 |
                  └────────┬────────┘
                           |
                   metrics_snapshots
                           |
                   Dashboard Realtime
```

### 🔍 Troubleshooting

#### Adaptador não inicializa
```bash
# Verificar logs no console
npm run dev

# Procurar mensagens de erro: "Não foi possível inicializar..."
# Verificar credenciais em .env
```

#### Sync falha
```bash
# Verificar logs em data_sync_logs table
SELECT * FROM data_sync_logs WHERE status = 'failed' ORDER BY started_at DESC;

# Verificar RLS policies
SELECT * FROM information_schema.tables WHERE table_name IN ('clients', 'revenues');
```

#### Token Zoho expira
- Adaptador renovar automaticamente a cada 4 horas
- Se falhar: atualizar ZOHO_REFRESH_TOKEN em .env e reiniciar

#### Google Sheets não actualiza
- Verificar que a aba existe (default: "Receitas")
- Verificar headers: Cliente, Valor, Tipo, Status, Data Fatura
- Verificar permissões de API Key

### 📝 Logs de Sincronização

Todos os syncs são registados em `data_sync_logs`:

```sql
{
  source: "zoho-crm",
  status: "success",           -- ou "failed"
  records_synced: 45,
  errors: [
    { externalId: "123", error: "Cliente não encontrado" }
  ],
  started_at: "2026-02-15T10:00:00Z",
  completed_at: "2026-02-15T10:02:30Z"
}
```

### 🔐 Segurança

- ✅ Tokens OAuth renovados automaticamente
- ✅ API Keys nunca logadas
- ✅ RLS Policies protegem dados
- ✅ Service role usado apenas no backend
- ✅ Validação de dados com Zod (preparado)

### 📊 Métricas Agregadas

Diariamente às 23:59:
- Clientes activos (COUNT)
- Projetos em andamento (COUNT)
- Receita mensal (SUM)
- Receita anual (SUM dos últimos 12 meses)
- Satisfação média (AVG)

Retenção: 90 dias de histórico

### 🚦 Próximos Passos

- [ ] Fase 3: Gráficos e visualizações (Recharts)
- [ ] Fase 4: Chatbot IA com Claude API
- [ ] Fase 5: Deploy em produção (Railway)

### 📚 Referências

- Base Adapter: `.aios-core/infrastructure/scripts/pm-adapter.js`
- Metrics: `.aios-core/quality/metrics-collector.js`
- Google Workspace MCP: `.aios-core/infrastructure/tools/mcp/google-workspace.yaml`

---

**Versão:** 2.0 (Fase 2 - Adaptadores de Dados)
**Data:** 2026-02-15
**Status:** ✅ Completa - Pronta para Fase 3
