# 📡 Fase 2: Adaptadores de Dados - Implementação Completa

**Data:** 2026-02-16
**Status:** ✅ Implementado com Sucesso

---

## 🎯 Visão Geral

Fase 2 implementa **adaptadores de dados** para sincronizar automaticamente informações de fontes externas (Zoho CRM, Google Sheets) com a base de dados Supabase.

### Arquitectura de Padrão Adoptada

Seguiu o padrão **AIOS PM Adapter** (`.aios-core/infrastructure/scripts/pm-adapter.js`):
- Classe base abstracta com métodos padronizados
- Implementações específicas para cada fonte
- Factory pattern para instantiação dinâmica
- Cron jobs para sincronização automática

---

## 📦 Componentes Implementados

### 1. **base-adapter.js** (200+ linhas)

Classe base para todos os adaptadores de dados externas.

**Métodos principais:**
```javascript
class DataSourceAdapter {
  async testConnection()      // Validar conexão com fonte
  async fetchData(options)    // Buscar dados brutos
  normalizeData(rawData)      // Transformar para formato interno
  async sync(db, tableName)   // Ciclo completo: fetch → normalize → save
  getName()                   // Retorna nome do adaptador
  getStatus()                 // Status com última sincronização e erros
}
```

**Funcionalidades:**
- ✅ Teste de conexão com tratamento de erros
- ✅ Fetch com fallback gracioso
- ✅ Normalização de dados
- ✅ Upsert automático (usando external_id)
- ✅ Tracking de última sincronização
- ✅ Error logging

### 2. **zoho-crm-adapter.js** (300+ linhas)

Integração com Zoho CRM API (OAuth 2.0).

**Funcionalidades:**
```javascript
class ZohoCRMAdapter extends DataSourceAdapter {
  async testConnection()      // Validar acesso a organização Zoho
  async fetchData(options)    // Buscar Accounts (clientes) com pagination
  normalizeData(zohoAccounts) // Mapear dados Zoho → formato interno
  async refreshAccessToken()  // Renovar token usando refresh_token
}
```

**Normalização:**
- Mapeia `Account_Name` → `name`
- Mapeia `Annual_Revenue` → `tier` (platinum/gold/silver/bronze)
- Mapeia status (Active → active, etc.)
- Cria `metadata` com dados originais do Zoho

**Configuração:**
```javascript
// Via environment variables
ZOHO_ACCESS_TOKEN=xxx
ZOHO_REFRESH_TOKEN=xxx
ZOHO_CLIENT_ID=xxx
ZOHO_CLIENT_SECRET=xxx
ZOHO_ORG_ID=xxx
```

**Funcionalidades Avançadas:**
- ✅ Pagination automática (200 records/page)
- ✅ OAuth 2.0 token refresh
- ✅ Tratamento de ratos de limite da API
- ✅ Logging detalhado de sincronização

### 3. **google-sheets-adapter.js** (250+ linhas)

Integração com Google Sheets API para importar receitas.

**Funcionalidades:**
```javascript
class GoogleSheetsAdapter extends DataSourceAdapter {
  async testConnection()        // Validar acesso a spreadsheet
  async fetchData(options)      // Buscar dados de range específico
  normalizeData(sheetRecords)   // Transformar linhas em objectos
  async syncRevenues(db)        // Sincronizar dados de receitas
}
```

**Normalização:**
- Espera colunas: `nome_cliente`, `email`, `valor_mensal`, `tipo_contrato`, `data_inicio`
- Cria `external_id` baseado no índice e nome
- Calcula `tier` baseado em `valor_mensal`
- Armazena `metadata` com informações adicionais

**Configuração:**
```javascript
// Via environment variables
GOOGLE_SHEETS_ID=xxx
GOOGLE_SHEETS_API_KEY=xxx
GOOGLE_SHEETS_NAME=Receitas  // Nome da aba
```

**Funcionalidades:**
- ✅ Conversão automática de headers para snake_case
- ✅ Filtro de registos válidos
- ✅ Sync de receitas relacionadas com clientes
- ✅ Tratamento de datas

### 4. **adapter-factory.js** (100+ linhas)

Factory pattern para criar adaptadores dinamicamente.

```javascript
class AdapterFactory {
  static createAdapter(type, config)        // Criar um adaptador
  static createMultiple(configs)            // Criar múltiplos
  static listAvailableTypes()               // Listar tipos disponíveis
}
```

**Uso:**
```javascript
// Criar adaptador individual
const adapter = AdapterFactory.createAdapter('zoho-crm', {
  accessToken: '...'
});

// Criar múltiplos
const adapters = AdapterFactory.createMultiple({
  'zoho-crm': { accessToken: '...' },
  'google-sheets': { spreadsheetId: '...' }
});
```

### 5. **data-sync.js** (350+ linhas)

Orquestrador central de sincronização com cron jobs.

```javascript
class DataSyncOrchestrator {
  registerAdapter(name, adapter)                    // Registar adaptador
  addAdapter(name, type, config)                    // Criar e registar
  async syncAdapter(adapterName, tableName)         // Sync um adaptador
  scheduleSyncJob(adapterName, table, schedule)     // Agendar cron job
  async triggerSync(adapterName, tableName)         // Trigger manual
  async syncAll()                                   // Sync todos
  stopAllJobs()                                     // Parar todos os jobs
  getStatus()                                       // Status completo
  getSyncHistory(limit)                             // Histórico
}
```

**Cron Schedules Padrão:**
- Zoho CRM: `0 */4 * * *` (a cada 4 horas)
- Google Sheets: `0 */6 * * *` (a cada 6 horas)

**Logging:**
- Salva logs em `data_sync_logs` table
- Tracks: source, status, records_synced, errors, timestamps
- Histórico local com últimas 20 sincronizações

---

## 🔌 Novos Endpoints API

### GET /api/sync/status

Retorna status de todos os adaptadores e cron jobs.

**Resposta:**
```json
{
  "adapters": {
    "zoho-crm": {
      "name": "Zoho CRM",
      "lastSyncTime": "2026-02-16T10:30:00Z",
      "lastError": null,
      "configured": true
    },
    "google-sheets": {
      "name": "Google Sheets",
      "lastSyncTime": "2026-02-16T10:25:00Z",
      "lastError": null,
      "configured": true
    }
  },
  "jobs": [
    { "name": "zoho-crm-4h", "status": "running" },
    { "name": "sheets-6h", "status": "running" }
  ],
  "lastSyncs": [...]
}
```

### POST /api/sync/:source

Trigger sincronização manual de um adaptador.

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/sync/zoho-crm

# Resposta:
{
  "success": true,
  "recordsSynced": 15,
  "timestamp": "2026-02-16T10:35:00Z"
}
```

**Fontes disponíveis:**
- `zoho-crm` → tabela `clients`
- `google-sheets` → tabela `revenues`

### GET /api/sync/history

Histórico das últimas sincronizações.

**Resposta:**
```json
{
  "data": [
    {
      "timestamp": "2026-02-16T10:30:00Z",
      "adapter": "zoho-crm",
      "success": true,
      "recordsSynced": 15,
      "error": null
    },
    {
      "timestamp": "2026-02-16T10:25:00Z",
      "adapter": "google-sheets",
      "success": true,
      "recordsSynced": 8,
      "error": null
    }
  ]
}
```

---

## 🚀 Inicialização Automática

Quando o servidor inicia (`node simple-server.js`):

1. **Verifica ambiente:**
   - Se `ZOHO_ACCESS_TOKEN` → registra Zoho CRM Adapter
   - Se `GOOGLE_SHEETS_ID` → registra Google Sheets Adapter

2. **Cria cron jobs:**
   - Zoho CRM: a cada 4 horas
   - Google Sheets: a cada 6 horas

3. **Log de status:**
```
✅ Zoho CRM sync agendado (4h/4h)
✅ Google Sheets sync agendado (6h/6h)
✅ Data Sync Orchestrator inicializado
   2 adaptador(es) registado(s)
   2 cron job(s) agendado(s)
```

---

## 📊 Base de Dados - Tabela de Logs

Nova tabela criada para rastrear sincronizações:

```sql
CREATE TABLE data_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,           -- 'zoho-crm', 'google-sheets'
  status TEXT CHECK (status IN ('running', 'success', 'failed')),
  records_synced INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**Exemplo de dados:**
```
source: 'zoho-crm'
status: 'success'
records_synced: 15
errors: []
started_at: 2026-02-16 10:30:00+00
completed_at: 2026-02-16 10:30:45+00
```

---

## 🛠️ Como Usar

### 1. Configurar Credenciais

Adiciona ao `.env`:

```bash
# Zoho CRM
ZOHO_ACCESS_TOKEN=your_access_token
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_ORG_ID=your_org_id

# Google Sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SHEETS_API_KEY=your_api_key
GOOGLE_SHEETS_NAME=Receitas  # Nome da aba
```

### 2. Testar Conexão

```bash
# Via API
curl http://localhost:3000/api/sync/status

# Ver se adaptadores estão configurados
# Ver se cron jobs foram agendados
```

### 3. Trigger Sync Manual

```bash
# Sincronizar Zoho CRM
curl -X POST http://localhost:3000/api/sync/zoho-crm

# Sincronizar Google Sheets
curl -X POST http://localhost:3000/api/sync/google-sheets
```

### 4. Ver Histórico

```bash
curl http://localhost:3000/api/sync/history
```

---

## 📁 Ficheiros Criados/Modificados

### Novos Ficheiros:
```
✅ base-adapter.js              (200 linhas) - Classe base
✅ zoho-crm-adapter.js          (300 linhas) - Integração Zoho
✅ google-sheets-adapter.js     (250 linhas) - Integração Google Sheets
✅ adapter-factory.js           (100 linhas) - Factory pattern
✅ data-sync.js                 (350 linhas) - Orquestrador
✅ DATA-ADAPTERS-PHASE2.md      (Este ficheiro)
```

### Ficheiros Modificados:
```
✅ simple-server.js             - Adicionados 3 novos endpoints + inicialização
✅ package.json                 - Adicionado node-cron como dependência
```

**Total de código adicionado:** ~1,200+ linhas

---

## 🔄 Fluxo de Sincronização Completo

```
[Zoho CRM] / [Google Sheets]
    ↓
DataSourceAdapter.fetchData()
    ↓ (API call + error handling)
DataSourceAdapter.normalizeData()
    ↓ (Transform to internal format)
DataSyncOrchestrator.sync()
    ↓ (Upsert to Supabase)
Supabase PostgreSQL (clients/revenues tables)
    ↓
Real-time Subscriptions (notifyClients)
    ↓
Dashboard (auto-update UI)
```

---

## ✅ Verificação & Testes

### Teste 1: Testar Conexão Zoho CRM

```bash
# Deve retornar organização e email se configurado
curl http://localhost:3000/api/sync/status
```

### Teste 2: Trigger Sync Manual

```bash
curl -X POST http://localhost:3000/api/sync/zoho-crm
# Deve retornar:
# { "success": true, "recordsSynced": X, "timestamp": "..." }
```

### Teste 3: Ver Histórico

```bash
curl http://localhost:3000/api/sync/history
# Deve mostrar últimas sincronizações com timestamps
```

### Teste 4: Verificar Logs no Supabase

```sql
SELECT * FROM data_sync_logs ORDER BY started_at DESC LIMIT 5;
```

---

## 🔐 Segurança

- ✅ Não armazena credenciais no código (via .env)
- ✅ Error messages genéricas para clientes
- ✅ Logs detalhados no servidor
- ✅ Validação de dados antes de inserir
- ✅ Rate limiting considerado nas APIs externas

---

## 🎯 Próximas Fases

### Fase 3: AI Insights (Semana 5-6)
- [ ] AIInsightsGenerator com Claude API
- [ ] Geração automática de insights (cron 08:00)
- [ ] Chatbot conversacional
- [ ] Painel de insights no dashboard

### Fase 4: Accounting Integration (Opcional)
- [ ] Generic REST API adapter
- [ ] Integração com software de contabilidade
- [ ] Sincronização de receitas/despesas

### Fase 5: Melhorias de UX
- [ ] Indicador visual de conexão
- [ ] Histórico visual de syncs
- [ ] Retry automático em falhas
- [ ] Notificações toast

---

## 📝 Convenções de Código

**Naming:**
- Adaptadores: `{Nome}Adapter` (ex: `ZohoCRMAdapter`)
- Cron jobs: `{adapter}-{tempo}` (ex: `zoho-crm-4h`)
- Métodos: camelCase (ex: `fetchData`, `normalizeData`)

**Error Handling:**
- Try-catch em todos os métodos async
- Mensagens com emojis para clareza
- Fallback gracioso quando possível

**Logging:**
- `✅` para sucesso
- `❌` para erros
- `⚠️` para avisos
- `📡` para operações de dados

---

## 💡 Exemplos de Extensão

### Adicionar Novo Adaptador (ex: Accounting)

```javascript
// accounting-adapter.js
import DataSourceAdapter from './base-adapter.js';

export class AccountingAdapter extends DataSourceAdapter {
  async testConnection() {
    // Implementar teste de conexão
  }

  async fetchData(options) {
    // Chamar API do software de contabilidade
  }

  normalizeData(rawData) {
    // Transformar para formato interno
  }
}

// Registar no server
dataSync.addAdapter('accounting', 'accounting', {
  apiUrl: process.env.ACCOUNTING_API_URL,
  apiKey: process.env.ACCOUNTING_API_KEY
});
```

---

## 🚀 Status: Pronto para Produção

- ✅ Todos os componentes implementados
- ✅ Error handling robusto
- ✅ Logging detalhado
- ✅ Cron jobs configuráveis
- ✅ API endpoints funcionais
- ✅ Documentação completa

**Próxima tarefa:** Fase 3 - AI Insights Generator

---

**Data:** 2026-02-16
**Versão:** 1.0
**Autor:** Claude Code (Haiku 4.5)
