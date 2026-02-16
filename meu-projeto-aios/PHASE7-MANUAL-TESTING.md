# Phase 7: Guia de Testes Manuais

Este ficheiro contém instruções para testar manualmente as funcionalidades de SSE Real-time implementadas.

---

## 🚀 Iniciar o Servidor

```bash
# Terminal 1: Iniciar servidor backend
cd /Users/admin/meu-projeto-aios
node simple-server.js
```

Você deverá ver:
```
✅ CONTROL TOWER PRONTO
🌐 http://localhost:3000
...
║  • GET /api/stream/tasks                    ║
```

---

## 🧪 Teste 1: Verificar Endpoint SSE

### Terminal 2: Testar conexão com curl

```bash
curl -N http://localhost:3000/api/stream/tasks
```

### Esperado:
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"initial","data":{"tasks":[...], "assignees":[...]}}

:keep-alive

:keep-alive
```

### Verificar:
- ✓ Status HTTP 200
- ✓ Content-Type: text/event-stream
- ✓ Dados iniciais chegam
- ✓ Keep-alive a cada 30 segundos

---

## 🧪 Teste 2: Abrir Dashboard no Browser

### Terminal 2: Abrir página

```bash
open http://localhost:3000#tasks
```

### Verificar no Browser Console (F12):
```
🔌 Conectando a stream de tarefas...
✅ Stream de tarefas conectado
📡 Dados iniciais de tarefas recebidos via SSE
```

### Verificar Tabela:
- ✓ Tarefas aparecem listadas
- ✓ KPIs actualizam-se
- ✓ Filtro de assignees funciona

---

## 🧪 Teste 3: Testar Actualização em Tempo Real

### Terminal 3: Actualizar uma tarefa no Supabase

```bash
# Opção A: Via SQL no Supabase Dashboard
# Ir para: https://supabase.com/dashboard
# Abrir tabela: tasks
# Editar uma tarefa: mudar status para "in_progress"

# Opção B: Via Node.js script
cat << 'EOF' > /tmp/update-task.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { error } = await supabase
  .from('tasks')
  .update({ status: 'in_progress' })
  .eq('id', '3c40241a-68d4-492c-bc09-89893b44d12c')
  .single();

if (error) {
  console.error('Erro:', error);
} else {
  console.log('✅ Tarefa actualizada!');
}
EOF

node /tmp/update-task.js
```

### Verificar:
- ✓ Console do Browser mostra: `📡 Mudança de tarefas detectada: UPDATE`
- ✓ Tabela recarrega automaticamente
- ✓ Dados mostram novo status
- ✓ KPIs actualizam-se automaticamente

---

## 🧪 Teste 4: Testar Fallback para Polling

### Parar o servidor enquanto dashboard está aberto

```bash
# Terminal 1: Parar servidor
CTRL+C
```

### No Console do Browser, você deverá ver:
```
⚠️  Erro no stream de tarefas. Usando polling como fallback...
```

### Verificar:
- ✓ Dashboard mostra aviso
- ✓ Dados continuam a actualizar (polling a cada 10s)
- ✓ Sem erros críticos

### Reiniciar servidor:
```bash
node simple-server.js
```

### Verificar:
- ✓ Dashboard reconecta a SSE
- ✓ Volta a usar stream de tempo real

---

## 🧪 Teste 5: Keep-alive

### Deixar curl rodando por 2 minutos

```bash
curl -N http://localhost:3000/api/stream/tasks
```

### Verificar no Console do Servidor (Terminal 1):
```
🔌 Cliente conectou ao stream de tarefas
[mantém keep-alive a cada 30s]
:keep-alive
:keep-alive
:keep-alive
[após 2 minutos]
🔌 Cliente desconectou do stream de tarefas
```

### Verificar:
- ✓ Conexão mantém-se viva
- ✓ Sem timeout
- ✓ Keep-alive enviado regularmente

---

## 🧪 Teste 6: Performance com Múltiplos Clientes

### Terminal 2-4: Múltiplas conexões curl
```bash
# Terminal 2
curl -N http://localhost:3000/api/stream/tasks > /tmp/client1.txt &

# Terminal 3
curl -N http://localhost:3000/api/stream/tasks > /tmp/client2.txt &

# Terminal 4
curl -N http://localhost:3000/api/stream/tasks > /tmp/client3.txt &
```

### Terminal 1: Monitorar servidor
```
🔌 Cliente conectou ao stream de tarefas (3x)
```

### Actualizar tarefa no Supabase

### Verificar:
- ✓ Todos os 3 clientes recebem notificação
- ✓ Sem atrasos
- ✓ Sem perda de dados

---

## 🧪 Teste 7: Dados Correctos

### Verificar estrutura de dados no SSE

```bash
curl -N http://localhost:3000/api/stream/tasks | head -1 | jq '.'
```

### Deve conter:
```json
{
  "type": "initial",
  "data": {
    "tasks": [
      {
        "id": "uuid...",
        "name": "Tarefa...",
        "status": "open|in_progress|completed|closed",
        "priority": 1-5,
        "due_date": "ISO date",
        "assignments": [
          {
            "assignee_id": "id",
            "assignee_name": "Nome",
            "assignee_email": "email@domain.com"
          }
        ]
      }
    ],
    "assignees": ["Nome1", "Nome2", ...]
  }
}
```

### Verificar:
- ✓ Todas as tarefas incluídas
- ✓ Relacionamentos corretos
- ✓ Assignees extraídos corretamente

---

## 📋 Checklist de Testes

- [ ] Endpoint responde com HTTP 200
- [ ] Content-Type é `text/event-stream`
- [ ] Dados iniciais carregam
- [ ] Keep-alive enviado a cada 30s
- [ ] Dashboard conecta sem erros
- [ ] Tabela renderiza com dados
- [ ] KPIs actualizam-se
- [ ] Actualização em tempo real funciona
- [ ] Fallback para polling funciona
- [ ] Múltiplos clientes suportados
- [ ] Dados estruturados correctamente
- [ ] Cleanup ao desconectar

---

## 🔍 Debugging

### Ver logs do servidor

```bash
# Terminal 1: Servidor com verbose
node simple-server.js 2>&1 | tee server.log
```

### Procurar por:
```
🔌 Cliente conectou ao stream de tarefas
📡 Mudança de tarefas detectada
notifyClients()
:keep-alive
🔌 Cliente desconectou
```

### Ver logs do browser

```javascript
// Console do browser (F12)
// Procurar por:
console.log('🔌 Conectando a stream de tarefas...');
console.log('✅ Stream de tarefas conectado');
console.log('📡 Dados iniciais de tarefas recebidos via SSE');
console.log('📡 Mudança de tarefas detectada:', data.event);
```

---

## 🐛 Troubleshooting

### Problema: Endpoint retorna 404

**Solução:**
1. Verificar se servidor está a rodar
2. Verificar se porta é 3000
3. Verificar se `/api/stream/tasks` está no código

### Problema: Sem keep-alive

**Solução:**
1. Aguardar 30 segundos
2. Se nada chegar, servidor pode estar com problema
3. Verificar logs do servidor

### Problema: Fallback para polling não funciona

**Solução:**
1. Verificar se SSE falha primeiro
2. Verificar se `loadTasks()` existe
3. Verificar interval de 10 segundos no console

### Problema: Dados não actualizam em tempo real

**Solução:**
1. Verificar se subscription do Supabase está ativa
2. Verificar se `notifyClients()` é chamado
3. Verificar se EventSource recebe evento
4. Verificar se `loadTasks()` é chamado após evento

---

## 📊 Métricas de Performance

### Medições esperadas:

**Latência de actualização**: <500ms
- Mudança no Supabase → Subscription callback
- Callback → notifyClients()
- notifyClients() → Browser recebe
- Browser → loadTasks()
- loadTasks() → Render

**Uso de banda**: <1KB por actualização
- Evento SSE: ~500 bytes
- Dados recarregados: ~200KB (raro)

**Conexões simultâneas**: Ilimitadas
- Cada cliente é um Set entry
- Sem limite de clientes

---

## ✅ Conclusão dos Testes

Quando TODOS os testes passarem:

- ✅ Phase 7 está funcionando correctamente
- ✅ Sistema pronto para produção
- ✅ Próxima fase pode começar

---

**Última actualização**: 2026-02-16
**Versão**: 1.0
