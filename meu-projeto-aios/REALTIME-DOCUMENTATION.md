# ⚡ Real-time Subscriptions - Control Tower Dashboard

## 🎯 Visão Geral

O Control Tower Dashboard agora suporta **Real-time Subscriptions** através de Server-Sent Events (SSE) e Supabase Realtime. As alterações nos dados são propagadas instantaneamente para todos os clientes conectados.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│         Supabase PostgreSQL (Cloud)             │
│  • Tabelas: clients, projects, metrics, insights│
│  • Realtime enabled                             │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Supabase Realtime API
                   ▼
┌─────────────────────────────────────────────────┐
│      Backend: supabase-client.js                │
│  • subscribeToClients()                         │
│  • subscribeToProjects()                        │
│  • subscribeToMetrics()                         │
│  • subscribeToInsights()                        │
└──────────────────┬──────────────────────────────┘
                   │
                   │ notifyClients() → EventSource data
                   ▼
┌─────────────────────────────────────────────────┐
│   Server: simple-server.js (HTTP/SSE)           │
│  • /api/stream/clients (EventSource)            │
│  • /api/stream/projects                         │
│  • /api/stream/metrics                          │
│  • /api/stream/insights                         │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Browser EventSource API
                   ▼
┌─────────────────────────────────────────────────┐
│      Frontend: dashboard.html                   │
│  • subscribeToClientsStream()                   │
│  • subscribeToProjectsStream()                  │
│  • subscribeToMetricsStream()                   │
│  • subscribeToInsightsStream()                  │
│  • Auto-update KPI cards, tabelas, gráficos    │
└─────────────────────────────────────────────────┘
```

## 🔌 Real-time Endpoints (SSE)

### GET /api/stream/clients
Actualiza em tempo real quando há mudanças na tabela `clients`.

**Exemplo de stream:**
```
data: {"type":"initial","data":[...]}

data: {"type":"clients","event":"INSERT","timestamp":"2026-02-16T10:00:00Z","data":{...}}

data: {"type":"clients","event":"UPDATE","timestamp":"2026-02-16T10:01:00Z","data":{...}}
```

### GET /api/stream/projects
Actualiza em tempo real quando há mudanças em projectos.

### GET /api/stream/metrics
Actualiza em tempo real quando há novos snapshots de métricas.

### GET /api/stream/insights
Actualiza em tempo real quando há novos insights de IA.

## 📱 Como Funciona no Frontend

### 1. Conexão ao Stream
```javascript
subscribeToClientsStream();
```

### 2. Recebimento de Dados Iniciais
```
data: {"type":"initial","data":[...]}
↓
renderClientsTable(data.data)
```

### 3. Actualização em Tempo Real
```
(Alguém actualiza um cliente no Supabase)
↓ (via Supabase Realtime)
Backend detecta mudança
↓
notifyClients() envia para todos os clientes SSE
↓
Frontend recebe: {"type":"clients","event":"UPDATE"}
↓
loadClientsData() recarrega dados
↓
renderClientsTable() actualiza UI instantaneamente
```

## 🔄 Fluxo de Mudanças em Tempo Real

### Cenário: Adicionar novo cliente
```
1. Frontend: POST /api/clients
   └─ Backend: addClient() insere no Supabase

2. Supabase: INSERT detectado
   └─ Supabase Realtime notifica subscriptions

3. Backend: subscribeToClients() callback triggered
   └─ Chama: notifyClients(clientSet, event)

4. Server SSE: Envia evento para todos os clientes conectados
   └─ Escreve: res.write(`data: {...}\n\n`)

5. Frontend: EventSource.onmessage recebe evento
   └─ Chama: loadClientsData() para refresh

6. UI: Tabela actualiza com novo cliente
   └─ Animação suave da mudança
```

## 📊 Tipos de Eventos

### INSERT
Novo registo adicionado à tabela.
```javascript
{
  "type": "clients",
  "event": "INSERT",
  "timestamp": "2026-02-16T10:00:00Z",
  "data": { "id": "...", "name": "Nova Empresa", ... }
}
```

### UPDATE
Registo modificado.
```javascript
{
  "type": "clients",
  "event": "UPDATE",
  "timestamp": "2026-02-16T10:01:00Z",
  "data": { "id": "...", "monthly_value": 5000, ... }
}
```

### DELETE
Registo removido.
```javascript
{
  "type": "clients",
  "event": "DELETE",
  "timestamp": "2026-02-16T10:02:00Z",
  "data": { "id": "..." }
}
```

## 🛡️ Fallback Automático

Se a conexão SSE falhar:

1. **Frontend detecta erro** → `clientsStream.onerror`
2. **Fecha stream** → `clientsStream.close()`
3. **Activa polling** → `setInterval(loadClientsData, 5000)`
4. **Dashboard continua funcionando** → Dados actualizam a cada 5s

Isto garante que **nunca há perda de dados** ou interrupção da aplicação.

## 🧪 Testar Real-time

### 1. Abrir duas abas do browser
```
Tab 1: http://localhost:3000 (Dashboard A)
Tab 2: http://localhost:3000 (Dashboard B)
```

### 2. Abrir Console (F12)
Ambas as abas devem mostrar:
```
🚀 Inicializando Control Tower Dashboard...
🔌 Conectando a stream de clientes...
🔌 Conectando a stream de projectos...
🔌 Conectando a stream de métricas...
🔌 Conectando a stream de insights...
✅ Real-time subscriptions activas!
```

### 3. Fazer mudanças
**Tab 1:**
1. Clique em "👥 Clientes"
2. Clique em "+ Novo Cliente"
3. Preencha formulário e envie

**Tab 2:**
- Vê a mudança instantaneamente!
- Logs mostram: `📡 Dados iniciais recebidos: 4 clientes`

### 4. Monitorar dados em tempo real
```javascript
// Console mostra:
// 🔌 Conectando a stream de clientes...
// 📡 Dados iniciais recebidos: 3 clientes
// 🔄 Actualização de clientes (INSERT, UPDATE, DELETE)
```

## 📈 Performance

### Latência
- **Initial data**: < 100ms
- **Real-time updates**: < 500ms (depende do Supabase)
- **Polling fallback**: 5 segundos

### Escalabilidade
- SSE suporta **centenas de conexões simultâneas**
- Cada cliente requer 1 conexão HTTP persistente
- Servidor envia heartbeat a cada 30 segundos para evitar timeout

### Bandwidth
- **Initial message**: ~1-5 KB (depende do volume de dados)
- **Update messages**: ~100-500 bytes
- **Keep-alive**: 1 byte a cada 30 segundos

## 🔧 Configuração

### Habilitar Real-time no Supabase

Já foi feito na criação da base de dados, mas para confirmar:

1. Supabase Dashboard → Settings → Realtime
2. Certifique-se que as tabelas estão habilitadas:
   - ✅ clients
   - ✅ projects
   - ✅ metrics_snapshots
   - ✅ ai_insights

### Server-side (Node.js)

As subscriptions são inicializadas automaticamente:
```javascript
// No servidor, quando inicia:
initializeRealTimeSubscriptions()
```

### Client-side (Browser)

As subscriptions ao SSE são feitas automaticamente:
```javascript
// No dashboard.html, ao carregar:
subscribeToClientsStream()
subscribeToProjectsStream()
subscribeToMetricsStream()
subscribeToInsightsStream()
```

## 🐛 Troubleshooting

### ❌ "Stream não está respondendo"
**Solução**: Isto é normal - SSE fica aberto esperando mudanças. Use um cliente JavaScript (browser) para testar.

### ❌ "Dados não actualizam"
**Solução**:
1. Verifique console (F12) para ver se há erros
2. Certifique-se que Realtime está habilitado no Supabase
3. Fallback para polling funciona se SSE falhar

### ✅ "Como saber se está a funcionar?"
1. Abra F12 → Console
2. Veja logs como:
   ```
   🔌 Conectando a stream de clientes...
   📡 Dados iniciais recebidos: 3 clientes
   ```
3. Faça uma mudança (adicionar cliente) noutra aba
4. Veja actualizar instantaneamente

### ❓ "Posso desactivar real-time?"
Sim! O fallback para polling é automático se SSE falhar. O dashboard funciona perfeitamente sem real-time.

## 🚀 Próximos Passos

### Fase 1: Melhorias de Real-time ✅ COMPLETA
- [x] Server-Sent Events (SSE)
- [x] Supabase Realtime subscriptions
- [x] Fallback automático para polling
- [x] Keep-alive heartbeat (30s)

### Fase 2: Melhorias de UX 🚧
- [ ] Indicador visual "Conectado/Offline"
- [ ] Animações ao receber actualizações
- [ ] Toast notifications para mudanças críticas
- [ ] Retry automático se conexão cair

### Fase 3: Optimizações 🚧
- [ ] Compressão de dados (gzip para SSE)
- [ ] Delta updates (enviar apenas mudanças)
- [ ] Batching de eventos (agrupar mudanças)
- [ ] WebSocket como alternativa a SSE

### Fase 4: Features Avançadas 🚧
- [ ] Sincronização de estado entre abas
- [ ] Conflict resolution se múltiplas edições
- [ ] Rollback de mudanças
- [ ] Undo/Redo com histórico real-time

## 📚 Referências

### Supabase Realtime
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [@supabase/supabase-js v2 API](https://supabase.com/docs/reference/javascript/introduction)

### Server-Sent Events
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [HTML5 EventSource API](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## 📝 Log de Mudanças

### v1.0 - 2026-02-16
- ✅ Real-time subscriptions implementadas
- ✅ Server-Sent Events (SSE) activas
- ✅ Fallback automático para polling
- ✅ Keep-alive heartbeat
- ✅ 4 streams: clients, projects, metrics, insights

---

**Status**: ✅ Produção
**Última Actualização**: 2026-02-16
**Versão**: 1.0
