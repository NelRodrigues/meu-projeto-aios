# 🚀 Phase 5 Database Migration - Quick Start

## 📊 Situação Actual

**Fases 1-4:** ✅ **COMPLETAS** (Backend implementado)
**Fase 5:** 🔲 **PRONTO PARA EXECUTAR** (Migration preparada)

---

## ⚡ PRÓXIMO PASSO: Executar Migration SQL

### Opção 1️⃣: Manual no Supabase Dashboard (RECOMENDADO)

#### 1. Abrir Supabase
```
https://app.supabase.com/project/nvkcsojyjwzpiqwvmzwi/sql/new
```

#### 2. Copiar SQL
```sql
-- Copie o conteúdo de: migrations/001_add_tasks_tables.sql
-- OU click no botão abaixo
```

**[📋 Clique aqui para abrir instruções interactivas](MIGRATION-SETUP.html)**

#### 3. Executar
```
Ctrl+Enter (Windows/Linux) ou Cmd+Enter (Mac)
```

---

## 📋 Instruções Detalhadas

### Via Browser (Mais Fácil)
1. Abrir: **[MIGRATION-SETUP.html](MIGRATION-SETUP.html)** (com botão de cópia automática)
2. Clicar em "Copy SQL to Clipboard"
3. Clicar em "Open Supabase SQL Editor"
4. Colar (Ctrl+V)
5. Executar (Ctrl+Enter)

### Via Terminal (Manual)
```bash
# Ver o SQL a executar
cat migrations/001_add_tasks_tables.sql

# Tentar execução automática (pode não funcionar)
node scripts/execute-migration.js
```

### Via Ficheiro de Texto
1. Abrir: **[EXECUTE-MIGRATION-MANUAL.txt](EXECUTE-MIGRATION-MANUAL.txt)**
2. Copiar o SQL
3. Colar no Supabase SQL Editor
4. Executar

---

## 📊 O Que Será Criado

### Tabelas
```
✅ tasks (15 colunas + metadata JSONB)
   - external_id (TEXT UNIQUE) - ID do ClickUp
   - name, description, client_id
   - status, priority, due_date, start_date
   - time_estimate, time_tracked
   - tags (array), metadata (JSON)

✅ task_assignments (4 colunas)
   - task_id, assignee_name, assignee_email
   - assignee_id (ClickUp user ID)
```

### Índices (6 total)
```
✅ idx_tasks_external_id - Rápido lookup por ClickUp ID
✅ idx_tasks_status - Filtros por status
✅ idx_tasks_client_id - Relação com clientes
✅ idx_tasks_due_date - Ordenação por data
✅ idx_tasks_priority - Filtros por prioridade
✅ idx_task_assignments_* - Filtros de assignees
```

### Função SQL
```
✅ get_task_stats() - Retorna:
   - Total de tarefas
   - Contagem por status
   - Tarefas atrasadas
```

### Segurança
```
✅ RLS enabled on both tables
✅ Policies para authenticated users
✅ ON DELETE CASCADE para integridade
```

---

## ✅ Verificar Sucesso

Depois de executar a migration:

```bash
# 1. Iniciar servidor
node simple-server.js

# 2. Em outro terminal, testar endpoint
curl http://localhost:3000/api/tasks

# Esperado: {"tasks": [], "assignees": []}
# (vazio até sincronizar dados do ClickUp)
```

---

## 🎯 Depois de Phase 5

### Configurar ClickUp
```bash
# Editar .env
CLICKUP_API_TOKEN=pk_...
CLICKUP_LIST_ID=...
```

### Teste Sync
```bash
curl -X POST http://localhost:3000/api/sync/clickup

# Esperado:
# {
#   "success": true,
#   "recordsSynced": N,
#   "assignmentsSynced": M
# }
```

### Verificar Dados
```bash
curl http://localhost:3000/api/tasks | jq '.tasks | length'
# Deve retornar número de tarefas sincronizadas
```

---

## 📂 Ficheiros Criados

| Ficheiro | Propósito |
|----------|-----------|
| `migrations/001_add_tasks_tables.sql` | Schema completo |
| `scripts/execute-migration.js` | Execução automática |
| `scripts/run-migration.js` | Alternativa |
| `MIGRATION-SETUP.html` | **Guia interactivo com 1-click** |
| `EXECUTE-MIGRATION-MANUAL.txt` | Instruções de texto |

---

## ⏱️ Duração Esperada

| Etapa | Duração |
|-------|---------|
| Copiar SQL | 30 segundos |
| Abrir Supabase | 1-2 segundos |
| Executar SQL | 3-5 segundos |
| **Total** | **< 1 minuto** |

---

## ❓ Dúvidas Frequentes

### "O SQL não executa"
- Verificar se está no projecto correcto (nvkcsojyjwzpiqwvmzwi)
- Testar sintaxe com `-- test comment` primeiro
- Ver erro exact no Supabase UI
- Consultar CLICKUP-SETUP.md → Troubleshooting

### "Tabelas não aparecem após execução"
- Refresh página Supabase (F5)
- Verificar em "Database" → "Tables" à esquerda
- Confirmar que SQL executou sem erros

### "Como sei se migration teve sucesso?"
- Mensagem "Query executed successfully" no Supabase
- Tabelas visíveis em Database → Tables
- Endpoint `/api/tasks` retorna `{"tasks": [], "assignees": []}`

---

## 🚀 Status Geral

```
Phase 1: ClickUpAdapter         ✅ 100%
Phase 2: AdapterFactory         ✅ 100%
Phase 3: Environment Config     ✅ 100%
Phase 4: Server Integration     ✅ 100%
Phase 5: Database Schema        🔲 READY TO EXECUTE
         ↳ Migration prepared   ✅ 100%
         ↳ Execute in Supabase  🔲 AWAITING USER
Phase 6: Dashboard Integration  ⏳ 0%
Phase 7: AI Integration         ⏳ 0%
```

---

## 📚 Documentação Relacionada

- **CLICKUP-SETUP.md** - Guia completo de configuração
- **IMPLEMENTATION-PROGRESS.md** - Status de fases
- **TESTING-CLICKUP.md** - Guide de testes
- **MIGRATION-SETUP.html** - Guia interactivo (abrir no browser)

---

## 🎓 Próximas Fases (Depois de Phase 5)

### Phase 6: Dashboard Integration
- Adicionar secção "Tarefas (ClickUp)"
- Filtros por status/colaborador
- Cards de KPIs

### Phase 7: AI Integration
- Contexto de tarefas no chat
- Alerts de tarefas atrasadas
- Insights de produtividade

---

## 📞 Resumo Rápido

1. **Abrir:** [MIGRATION-SETUP.html](MIGRATION-SETUP.html) (ou link do Supabase acima)
2. **Clicar:** "Copy SQL to Clipboard"
3. **Clicar:** "Open Supabase SQL Editor"
4. **Colar:** Ctrl+V
5. **Executar:** Ctrl+Enter
6. **Pronto!** Phase 5 completa ✅

---

**Tempo estimado:** < 1 minuto
**Status:** ✅ Tudo preparado, pronto para execução manual
**Data:** 2026-02-16

