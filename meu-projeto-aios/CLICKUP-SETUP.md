# Guia de Integração ClickUp com Control Tower

## 📋 Visão Geral

Este guia explica como configurar a integração ClickUp com o Control Tower para sincronizar tarefas em tempo real (a cada 3 horas).

**Status:** ✅ Implementado - Fases 1-4 Completas
**Próximas:** Fases 5-7 (Database, Dashboard, AI Integration)

---

## 🚀 Implementação Completa

### ✅ Fase 1: ClickUp Adapter
- **Ficheiro:** `clickup-adapter.js` (400+ linhas)
- **Funcionalidades:**
  - Autenticação via Bearer Token
  - Fetch de tarefas da API v2 do ClickUp
  - Normalização para formato interno
  - Sync de tasks e task_assignments separadamente
  - Mapeamento de status e prioridades

### ✅ Fase 2: Adapter Factory
- **Ficheiro:** `adapter-factory.js`
- **Mudanças:**
  - Tipo `CLICKUP: 'clickup'` adicionado
  - Factory method updated

### ✅ Fase 3: Configuração .env
- **Ficheiro:** `.env`
- **Variáveis:**
  ```bash
  CLICKUP_API_TOKEN=pk_your_token
  CLICKUP_TEAM_ID=your_team_id
  CLICKUP_SPACE_ID=your_space_id
  CLICKUP_LIST_ID=your_list_id
  ```

### ✅ Fase 4: Integração no Servidor
- **Ficheiro:** `simple-server.js`
- **Mudanças:**
  - Detecção automática de config ClickUp (linhas 550-564)
  - Agendamento de sync job (3h/3h) com cron
  - Endpoint genérico `/api/sync/clickup` já suportado
  - Novo endpoint `/api/tasks` para listar tarefas

---

## 🔧 Configuração Passo a Passo

### Passo 1: Obter Credenciais ClickUp

#### 1.1 API Token
1. Abrir ClickUp → Settings → Apps → Integrations
2. Procurar "API Token"
3. Clicar em "Generate"
4. Copiar token (formato: `pk_...`)

#### 1.2 Team ID
1. Ir para workspace do ClickUp
2. Na URL da browser, procurar: `https://app.clickup.com/{TEAM_ID}/...`
3. Copiar o ID entre `/app/clickup.com/` e `/`

#### 1.3 List ID
1. Abrir a lista principal de tarefas
2. Na URL: `https://app.clickup.com/.../list/{LIST_ID}`
3. Copiar o ID após `/list/`

#### 1.4 Space ID (Opcional)
- Se usar múltiplos espaços, obter de: `https://app.clickup.com/.../space/{SPACE_ID}`

### Passo 2: Configurar Variáveis de Ambiente

```bash
# Editar .env
nano .env

# Adicionar:
CLICKUP_API_TOKEN=pk_...
CLICKUP_TEAM_ID=...
CLICKUP_LIST_ID=...
CLICKUP_SPACE_ID=...  # Opcional
```

### Passo 3: Criar Tabelas no Supabase

Opção A: Via Supabase SQL Editor (Recomendado)
1. Abrir https://app.supabase.com
2. Ir para: SQL Editor > New Query
3. Copiar conteúdo de `migrations/001_add_tasks_tables.sql`
4. Executar Query

Opção B: Via Script
```bash
node scripts/setup-clickup-tables.js
```

### Passo 4: Iniciar Servidor

```bash
# Terminal 1: Iniciar servidor
node simple-server.js

# Esperado:
# ✅ ClickUp sync agendado (3h/3h)
# ✅ Data Sync Orchestrator inicializado
```

### Passo 5: Testar Integração

#### 5.1 Teste de Conexão
```bash
# Verificar status do adaptador
curl http://localhost:3000/api/sync/status | jq '.adapters.clickup'
```

**Esperado:**
```json
{
  "name": "ClickUp",
  "configured": true,
  "lastSyncTime": null,
  "lastError": null
}
```

#### 5.2 Sync Manual
```bash
# Trigger manual do sync
curl -X POST http://localhost:3000/api/sync/clickup

# Esperado:
# {"success": true, "recordsSynced": N, "assignmentsSynced": M}
```

#### 5.3 Verificar Dados
```bash
# Listar tarefas sincronizadas
curl http://localhost:3000/api/tasks | jq '.tasks | length'
```

---

## 📊 Estrutura de Dados

### Tabela: tasks
```sql
{
  id: UUID,
  external_id: TEXT UNIQUE,  -- ID do ClickUp
  name: TEXT,
  description: TEXT,
  client_id: UUID,           -- Opcional, para relacionar com clientes
  status: TEXT,              -- open, in_progress, review, completed, closed
  priority: INTEGER,         -- 1-4
  due_date: TIMESTAMPTZ,
  start_date: TIMESTAMPTZ,
  time_estimate: INTEGER,    -- minutos
  time_tracked: INTEGER,     -- minutos
  tags: TEXT[],
  metadata: JSONB,           -- Dados extras do ClickUp
  created_at, updated_at
}
```

### Tabela: task_assignments
```sql
{
  id: UUID,
  task_id: TEXT,             -- Referência ao external_id de tasks
  assignee_name: TEXT,       -- Nome do colaborador
  assignee_email: TEXT,
  assignee_id: TEXT,         -- ID do ClickUp
  created_at
}
```

---

## 🔄 Processo de Sincronização

### Fluxo Automático (3h/3h)
```
[ClickUp API]
    ↓
[fetchData()] → Lista de tarefas bruto
    ↓
[normalizeData()] → Format interno
    ↓
[sync(db)] → Upsert na tabela tasks
    ↓
[Parse assignees] → Salvar em task_assignments
    ↓
[Log] → Histórico em data_sync_logs
```

### Mapeamento de Status
```
ClickUp        → Internal
'to do'        → 'open'
'in progress'  → 'in_progress'
'in review'    → 'review'
'complete'     → 'completed'
'closed'       → 'closed'
```

### Mapeamento de Prioridade
```
ClickUp    → Escala (1-4)
urgent     → 1
high       → 2
normal     → 3
low        → 4
```

---

## 📈 Próximas Fases (Implementação Futura)

### Fase 5: Dashboard Integration
- Nova secção "Tarefas (ClickUp)" no dashboard
- Filtros por status, colaborador, cliente
- Cards de KPIs (abertas, em progresso, concluídas, atrasadas)

### Fase 6: AI Integration
- Contexto de tarefas no chat AI
- Detecção automática de tarefas atrasadas
- Recomendações baseadas em padrões de tarefas

### Fase 7: Análise e Relatórios
- Estatísticas de produtividade por colaborador
- Tempo médio de conclusão por tipo de tarefa
- Alertas de tarefas críticas atrasadas

---

## 🐛 Troubleshooting

### Erro: "Token inválido ou expirado"
```
Solução: Regenerar API Token no ClickUp e actualizar .env
```

### Erro: "List ID não encontrada"
```
Solução: Verificar se o List ID está correcto
curl "https://api.clickup.com/api/v2/list/{LIST_ID}/task" \
  -H "Authorization: pk_your_token"
```

### Tarefas não aparecem
```
1. Verificar logs: tail logs/data_sync.log
2. Confirmar que LIST_ID tem tarefas
3. Verificar RLS policies no Supabase
```

### Assignees vazios
```
Verificar se as tarefas no ClickUp têm assignees
Se vazias, campo será null na base de dados
```

---

## 📝 Ficheiros Criados/Modificados

### Novos
- ✅ `clickup-adapter.js` - Adaptador principal
- ✅ `migrations/001_add_tasks_tables.sql` - Schema das tabelas
- ✅ `scripts/setup-clickup-tables.js` - Script de setup

### Modificados
- ✅ `adapter-factory.js` - +3 linhas (tipo e case)
- ✅ `simple-server.js` - +30 linhas (init + endpoint)
- ✅ `.env` - +4 linhas (variáveis)

### A Fazer
- 🔲 `dashboard.html` - Secção de tarefas
- 🔲 `ai-chat.js` - Contexto de tarefas
- 🔲 `ai-insights-generator.js` - Insights de tarefas

---

## 📊 Estatísticas de Implementação

| Métrica | Valor |
|---------|-------|
| Ficheiros Criados | 3 |
| Ficheiros Modificados | 3 |
| Linhas de Código | ~500 |
| Tabelas BD | 2 |
| Índices | 6 |
| Funções SQL | 1 |
| Endpoints API | 2 |
| Cron Jobs | 1 |

---

## ✅ Checklist de Implementação

### Backend
- [x] Criar ClickUpAdapter com autenticação Bearer
- [x] Implementar testConnection, fetchData, normalizeData
- [x] Registar no AdapterFactory
- [x] Adicionar variáveis .env
- [x] Integrar no simple-server.js
- [x] Criar endpoint /api/tasks
- [x] Agendar cron job 3h/3h

### Database
- [x] Schema SQL com tabelas tasks e task_assignments
- [x] Índices para performance
- [x] Função get_task_stats()
- [x] RLS policies configuradas
- [x] Script de migração criado

### Frontend (Próximo)
- [ ] Secção de tarefas no dashboard
- [ ] Filtros por status e colaborador
- [ ] Cards de KPIs
- [ ] Estilização responsive

### AI Integration (Próximo)
- [ ] Contexto de tarefas no buildContextData()
- [ ] Alerts de tarefas atrasadas
- [ ] Recomendações contextuais

---

## 🔗 Referências Úteis

- [ClickUp API v2 Docs](https://clickup.com/api)
- [Supabase PostgreSQL](https://supabase.com/docs)
- [Cron Jobs (node-cron)](https://www.npmjs.com/package/node-cron)

---

**Última Atualização:** 2026-02-16
**Versão:** 1.0 - MVP
**Status:** ✅ Pronto para Teste
