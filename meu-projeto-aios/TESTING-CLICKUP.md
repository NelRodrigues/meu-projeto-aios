# Guia de Testes - Integração ClickUp

## 📋 Testes do Backend (Fase 1-4)

### 1. Verificação de Código
```bash
# Validar sintaxe
node -c clickup-adapter.js
node -c simple-server.js
node -c adapter-factory.js

# Esperado: Sem erros
```

### 2. Startup do Servidor
```bash
# Iniciar
node simple-server.js

# Esperado no console:
# ✅ ClickUp detectado, registando adaptador...
# ✅ ClickUp adaptador registado e agendado (3h/3h)
# ✅ Data Sync Orchestrator inicializado
#    1 adaptador(es) registado(s)
#    1 cron job(s) agendado(s)
```

### 3. Testar Endpoint /api/tasks
```bash
# Sem base de dados configurada ainda (vai retornar erro)
curl http://localhost:3000/api/tasks

# Esperado inicialmente:
# {"error": "..."}  (porque tabelas não existem ainda)
```

### 4. Status do Adaptador
```bash
# Ver status de todos os adaptadores
curl http://localhost:3000/api/sync/status | jq '.'

# Esperado:
# {
#   "adapters": {
#     "clickup": {
#       "name": "ClickUp",
#       "configured": false,  ← Enquanto não houver credenciais
#       "lastSyncTime": null,
#       "lastError": null
#     }
#   },
#   "jobs": {...}
# }
```

---

## 🔧 Testes de Integração (Pós-Fase 5)

Depois de executar a migration SQL:

### 1. Verificar Tabelas
```bash
# Via Supabase SQL Editor
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM task_assignments;

# Esperado: 0 registos (tabelas vazias)
```

### 2. Configurar Credenciais ClickUp
```bash
# Editar .env
CLICKUP_API_TOKEN=pk_...
CLICKUP_TEAM_ID=...
CLICKUP_LIST_ID=...
```

### 3. Testar Conexão
```bash
# Novo endpoint (adicionar ao ClickUpAdapter para teste):
# GET /api/sync/clickup/test

# Esperado:
# {
#   "success": true,
#   "user": "seu_username",
#   "email": "seu_email@..."
# }
```

### 4. Sync Manual
```bash
# Trigger primeiro sync
curl -X POST http://localhost:3000/api/sync/clickup

# Esperado:
# {
#   "success": true,
#   "recordsSynced": 15,
#   "assignmentsSynced": 23,
#   "timestamp": "2026-02-16T12:30:00Z"
# }
```

### 5. Verificar Dados Sincronizados
```bash
# Listar tarefas
curl http://localhost:3000/api/tasks | jq '.tasks | length'

# Esperado: 15 (ou número de tarefas no ClickUp)

# Ver estrutura de uma tarefa
curl http://localhost:3000/api/tasks | jq '.tasks[0]'

# Esperado:
# {
#   "id": "uuid",
#   "external_id": "clickup_task_id",
#   "name": "Nome da tarefa",
#   "client_id": null,
#   "status": "open",
#   "priority": 3,
#   "due_date": "2026-02-20T00:00:00.000Z",
#   "start_date": null,
#   "time_estimate": 120,
#   "time_tracked": 45,
#   "tags": ["frontend", "urgent"],
#   "metadata": {...},
#   "assignments": [
#     {"assignee_name": "João Silva", "assignee_email": "joao@..."}
#   ]
# }
```

### 6. Verificar Cron Job
```bash
# Deixar o servidor rodando por 3+ horas
# Esperar pelo próximo sync automático

# Ver histórico de syncs
curl http://localhost:3000/api/sync/history | jq '.data[] | select(.source == "clickup")'

# Esperado:
# {
#   "source": "clickup",
#   "timestamp": "2026-02-16T12:30:00Z",
#   "recordsSynced": 15,
#   "assignmentsSynced": 23,
#   "success": true
# }
```

---

## 🧪 Testes de Funcionalidades Específicas

### Teste: Normalização de Status
```javascript
// No ficheiro clickup-adapter.js, testar mapearStatus():

const adapter = new ClickUpAdapter();

const statusTests = [
  { input: 'to do', expected: 'open' },
  { input: 'in progress', expected: 'in_progress' },
  { input: 'review', expected: 'review' },
  { input: 'complete', expected: 'completed' },
  { input: 'closed', expected: 'closed' }
];

statusTests.forEach(test => {
  const result = adapter.mapearStatus(test.input);
  console.assert(
    result === test.expected,
    `Status ${test.input} → ${result} (esperado: ${test.expected})`
  );
});
```

### Teste: Normalização de Tarefas
```javascript
// Simular fetch de tarefas do ClickUp
const mockClickUpTasks = [
  {
    id: 'task_123',
    name: 'Implementar dashboard',
    description: 'Criar dashboard de tarefas',
    status: { status: 'in progress' },
    priority: { id: 2 },
    due_date: '1739816400000', // timestamp
    tags: [{ name: 'frontend' }],
    assignees: [
      { id: 'user_1', username: 'joao', email: 'joao@example.com' }
    ]
  }
];

const adapter = new ClickUpAdapter();
const normalized = adapter.normalizeData(mockClickUpTasks);

console.log(normalized[0]);
// Esperado:
// {
//   external_id: 'task_123',
//   name: 'Implementar dashboard',
//   status: 'in_progress',
//   priority: 2,
//   due_date: '2025-02-17T...',
//   tags: ['frontend'],
//   metadata: {...}
// }
```

### Teste: Upsert de Tarefas
```javascript
// Simular sync completo
const mockDB = {
  from: (table) => ({
    upsert: async (data, options) => ({
      error: null // Sucesso
    }),
    insert: async (data) => ({
      error: null
    })
  })
};

const adapter = new ClickUpAdapter({
  apiToken: 'test_token',
  listId: 'test_list'
});

// Mock fetchData
adapter.fetchData = async () => ({
  success: true,
  data: mockClickUpTasks
});

const result = await adapter.sync(mockDB, 'tasks');

console.assert(
  result.success === true,
  'Sync deve ser bem sucedido'
);
console.assert(
  result.recordsSynced === 1,
  'Deve sincronizar 1 tarefa'
);
```

---

## ⚠️ Casos de Erro

### Teste: Token Inválido
```bash
# Configurar token inválido
CLICKUP_API_TOKEN=invalid_token

# Trigger sync
curl -X POST http://localhost:3000/api/sync/clickup

# Esperado:
# {
#   "success": false,
#   "error": "Token inválido ou expirado",
#   "recordsSynced": 0
# }
```

### Teste: List ID Inválido
```bash
# Configurar list ID que não existe
CLICKUP_LIST_ID=invalid_list_id

# Trigger sync
curl -X POST http://localhost:3000/api/sync/clickup

# Esperado: erro HTTP 404
```

### Teste: Sem Configuração
```bash
# Remover variáveis ClickUp
unset CLICKUP_API_TOKEN
unset CLICKUP_LIST_ID

# Restart server
# Esperado:
# ⚠️  ClickUp não configurado (faltam environment variables)
```

---

## 📊 Testes de Performance

### Load Test: 100 Tarefas
```bash
# Simular sync de 100 tarefas
# Medir tempo de resposta

time curl -X POST http://localhost:3000/api/sync/clickup

# Esperado: < 5 segundos para 100 tarefas
```

### Load Test: GET /api/tasks com 1000 registos
```bash
# Depois de ter muitos dados
time curl http://localhost:3000/api/tasks > /dev/null

# Esperado: < 500ms com índices configurados
```

---

## 🔐 Testes de Segurança

### Teste: RLS Policies (Pós-Fase 5)
```bash
# Tentar acesso sem autenticação
curl -X GET \
  "https://byfzlwkgzftpzduswxus.supabase.co/rest/v1/tasks" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Esperado: erro 403 Forbidden (sem token JWT)
```

### Teste: SQL Injection
```bash
# Tentar injectar SQL no filtro
curl "http://localhost:3000/api/tasks?name='; DROP TABLE tasks; --"

# Esperado: nenhum efeito (Supabase usa prepared statements)
```

---

## ✅ Checklist de Testes

### Antes de Produção
- [ ] Código valida (node -c)
- [ ] Servidor inicia sem erros
- [ ] Endpoint /api/tasks responde
- [ ] Status do adaptador mostra correcto
- [ ] Tabelas criadas no Supabase
- [ ] Conexão ClickUp bem sucedida
- [ ] Sync manual completa
- [ ] Dados sincronizados visíveis
- [ ] Cron job executado
- [ ] RLS policies activadas
- [ ] Testes de erro funcionam
- [ ] Performance aceitável

### Testes Recomendados de Regressão
- Sync completo (100+ tarefas)
- Actualização de tarefas existentes
- Novas tarefas no ClickUp
- Remoção de tarefas
- Mudanças de status
- Atribuição de colaboradores

---

## 📝 Template de Relatório de Teste

```markdown
# Teste de Integração ClickUp - Relatório

**Data:** 2026-02-16
**Executor:** [Nome]
**Versão:** 1.0

## Testes Executados
- [ ] Backend Validado
- [ ] Servidor Iniciado
- [ ] Endpoints Testados
- [ ] Dados Sincronizados
- [ ] Performance Aceitável

## Resultados
| Teste | Status | Notas |
|-------|--------|-------|
| Código Válido | ✅ | node -c passou |
| Servidor Start | ✅ | Sem erros |
| /api/tasks | ✅ | Retorna dados |
| Sync Manual | ✅ | 15 tarefas |
| Cron Job | 🔲 | Aguardando 3h |

## Problemas Encontrados
- Nenhum

## Recomendações
- Implementar Fase 5 (Database)
- Implementar Fase 6 (Dashboard)
- Testes unitários para ClickUpAdapter

## Assinado
[Data] - Testado por: [Nome]
```

---

**Próximo Passo:** Executar migration SQL e testar Fase 5

