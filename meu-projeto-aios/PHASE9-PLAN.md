# Phase 9: Chat AI Integration com Contexto de Tarefas

## 📋 Objectivo

Integrar totalmente o Claude API com contexto rico de tarefas ClickUp, permitindo ao chat:
- **Compreender** estado actual de tarefas
- **Responder** com recomendações baseadas em dados
- **Sugerir** acções (criar tarefas, alertar sobre atrasos, etc.)
- **Analisar** tendências de tarefas em tempo real

**Resultado Final:** Chat inteligente que ajuda a gerir tarefas através de conversação natural.

---

## 🎯 Requisitos Funcionais

### 1. **Enriquecimento de Contexto de Tarefas**
- Passar últimas 10 tarefas abertas para contexto do chat
- Incluir: nome, status, assignee, data vencimento, prioridade
- Indicar tarefas atrasadas (overdue)
- Mostrar % de conclusão geral

### 2. **Compreensão de Queries sobre Tarefas**
- "Quantas tarefas abertas temos?"
- "Quem tem mais tarefas?"
- "Quais tarefas estão atrasadas?"
- "Qual é o status de [tarefa X]?"
- "Quem está disponível?"

### 3. **Recomendações Inteligentes**
- Alertar sobre tarefas críticas atrasadas
- Sugerir redistribuição de tarefas sobrecarregadas
- Recomendar prioridades baseadas em datas
- Análise de padrões de conclusão

### 4. **Features de UX Melhoradas**
- Sugestões rápidas (quick suggestions) baseadas em contexto
- Typing indicator enquanto AI "digita"
- Formatting melhor (listas, bold, código)
- Limpar histórico de conversa
- Persistência de conversa entre recargas

### 5. **Integração com Acções Directas**
- Sugerir: "Criar tarefa: [descrição]"
- Botões clickáveis para acções (criar, actualizar, completar)
- Feedback visual quando AI sugere acção

---

## 🏗️ Arquitectura da Solução

### Fluxo Completo

```
Utilizador digita: "Quantas tarefas abertas temos?"
    ↓
Frontend: sendChatMessage()
    ├─ Vai buscar allTasks array (já carregado)
    ├─ Filtra tarefas abertas
    ├─ Prepara contexto de tarefas
    └─ POST /api/chat { conversationId, message, taskContext }
    ↓
Backend: POST /api/chat
    ├─ Recebe taskContext do frontend
    ├─ Valida entrada
    ├─ Call AIChat.sendMessage(conversationId, message, taskContext)
    ↓
AIChat Service
    ├─ Fetch recent metrics (contexto de negócio)
    ├─ Fetch recent projects (contexto de negócio)
    ├─ Fetch top clients (contexto de negócio)
    ├─ Usar taskContext passado (contexto de tarefas)
    ├─ Build system prompt enriquecido com:
    │  ├─ Status de negócio
    │  ├─ Tarefas abertas + atrasadas
    │  ├─ Workload por pessoa
    │  └─ Performance histórica
    └─ Call Claude API com contexto completo
    ↓
Claude API
    ├─ System Prompt (português Angola)
    ├─ Context: metricas, projectos, clientes, tarefas
    ├─ Message history (últimas 10 mensagens)
    └─ User message
    ↓
Response: "Temos 12 tarefas abertas: 3 atrasadas..."
    ↓
Backend: Save to ai_conversations
    ↓
Frontend: renderChatMessages()
    ├─ Mostrar resposta
    ├─ Parse se contém sugestão de acção
    ├─ Mostrar botões clickáveis se aplicável
    └─ Quick suggestions para próxima pergunta
```

---

## 📂 Ficheiros a Modificar/Criar

### 1. **dashboard.html** (Frontend)

#### 1.1. Enriquecimento do Contexto (Linha ~2300)

Próximo a `sendChatMessage()`, adicionar função para preparar contexto de tarefas:

```javascript
/**
 * Preparar contexto de tarefas para enviar ao chat
 */
function prepareTaskContext() {
  // Filtrar tarefas abertas
  const openTasks = allTasks.filter(t =>
    !['completed', 'closed'].includes(t.status)
  );

  // Tarefas atrasadas
  const now = new Date();
  const overdueTasks = openTasks.filter(t =>
    t.due_date && new Date(t.due_date) < now
  );

  // Workload por assignee
  const workloadByAssignee = {};
  openTasks.forEach(task => {
    const assignee = task.assignments?.[0]?.assignee_name || 'Não atribuído';
    workloadByAssignee[assignee] = (workloadByAssignee[assignee] || 0) + 1;
  });

  // Retornar contexto estruturado
  return {
    total_open_tasks: openTasks.length,
    overdue_count: overdueTasks.length,
    overdue_tasks: overdueTasks.slice(0, 5).map(t => ({
      name: t.name,
      assignee: t.assignments?.[0]?.assignee_name,
      due_date: t.due_date,
      priority: t.priority
    })),
    workload_by_assignee: workloadByAssignee,
    tasks_by_status: {
      open: openTasks.filter(t => t.status === 'open').length,
      in_progress: openTasks.filter(t => t.status === 'in_progress').length,
      in_review: openTasks.filter(t => t.status === 'in_review').length
    }
  };
}
```

**Localização:** Depois de `updateTaskKPIs()` (linha ~2300)

#### 1.2. Modificar sendChatMessage() (Linha ~1900)

Actualizar para enviar contexto de tarefas:

```javascript
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  // Preparar contexto de tarefas
  const taskContext = prepareTaskContext();

  // Adicionar à UI
  chatHistory.push({ role: 'user', message });
  renderChatMessages();
  input.value = '';

  // Mostrar typing indicator
  showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message,
        taskContext  // ← ADICIONAR
      })
    });

    const data = await response.json();

    if (data.success) {
      chatHistory.push({ role: 'assistant', message: data.message });
      renderChatMessages();
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    chatHistory.push({
      role: 'system',
      message: '❌ Erro ao processar sua mensagem'
    });
    renderChatMessages();
  } finally {
    hideTypingIndicator();
  }
}
```

#### 1.3. Adicionar Sugestões Rápidas (Linha ~1920)

```javascript
/**
 * Mostrar sugestões rápidas baseadas em contexto
 */
function showQuickSuggestions() {
  const context = prepareTaskContext();
  const suggestions = [];

  // Sugerir baseado em contexto
  if (context.overdue_count > 0) {
    suggestions.push('📌 Ver tarefas atrasadas');
  }

  if (Math.max(...Object.values(context.workload_by_assignee)) > 5) {
    suggestions.push('⚖️ Balancear workload');
  }

  if (context.total_open_tasks > 10) {
    suggestions.push('📊 Análise de tarefas');
  }

  suggestions.push('❓ Qual é o status?');

  // Renderizar botões
  const suggestionsContainer = document.getElementById('chatSuggestions');
  if (suggestionsContainer) {
    suggestionsContainer.innerHTML = suggestions
      .map(s => `<button class="quick-suggestion" onclick="sendChatMessage('${s}')">${s}</button>`)
      .join('');
  }
}
```

#### 1.4. Adicionar Typing Indicator (Linha ~1940)

```javascript
/**
 * Mostrar indicador de digitação
 */
function showTypingIndicator() {
  const messagesDiv = document.getElementById('chatbot-messages');
  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.className = 'chat-message bot';
  typingDiv.innerHTML = `
    <div class="chat-bubble" style="background: #e8e8e8; color: #333;">
      <span style="display: inline-flex; gap: 4px;">
        <span style="animation: pulse 0.6s infinite;">●</span>
        <span style="animation: pulse 0.6s infinite 0.2s;">●</span>
        <span style="animation: pulse 0.6s infinite 0.4s;">●</span>
      </span>
    </div>
  `;
  messagesDiv.appendChild(typingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}
```

#### 1.5. CSS para Sugestões Rápidas (Linha ~770)

```css
/* Quick Suggestions */
#chatSuggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 10px;
}

.quick-suggestion {
  padding: 6px 12px;
  background: #2a5298;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-suggestion:hover {
  background: #1e3c72;
  transform: translateY(-2px);
}
```

---

### 2. **backend/services/AIChat.js** (Backend)

#### 2.1. Actualizar processMessage() (Linha ~50)

Modificar assinatura para receber taskContext:

```javascript
async processMessage(conversationId, userMessage, taskContext = {}) {
  try {
    // Obter histórico
    const conversation = await this.getConversation(conversationId);
    const messageHistory = conversation?.messages || [];

    // Construir system prompt enriquecido
    const systemPrompt = this.buildEnrichedSystemPrompt(taskContext);

    // Chamar Claude API
    const response = await this.callClaudeAPI(
      systemPrompt,
      messageHistory,
      userMessage
    );

    // Salvar conversa
    await this.saveConversation(conversationId, userMessage, response.content[0].text);

    return response.content[0].text;
  } catch (error) {
    console.error('Erro em processMessage:', error);
    throw error;
  }
}
```

#### 2.2. Criar buildEnrichedSystemPrompt() (Linha ~80)

```javascript
buildEnrichedSystemPrompt(taskContext = {}) {
  const {
    total_open_tasks = 0,
    overdue_count = 0,
    overdue_tasks = [],
    workload_by_assignee = {},
    tasks_by_status = {}
  } = taskContext;

  return `Você é um Gestor de IA para Marca Digital Angola, especializado em gestão de projectos e tarefas.

CONTEXTO DE NEGÓCIO ACTUAL:
${this.getBusinessContext()}

CONTEXTO DE TAREFAS ACTUAL:
- Total de tarefas abertas: ${total_open_tasks}
- Tarefas atrasadas: ${overdue_count}
- Status: ${tasks_by_status.open || 0} Open, ${tasks_by_status.in_progress || 0} Em Progresso, ${tasks_by_status.in_review || 0} Em Revisão

${overdue_tasks.length > 0 ? `TAREFAS ATRASADAS (CRÍTICO):
${overdue_tasks.map(t => `- ${t.name} (${t.assignee}, vencimento: ${t.due_date})`).join('\n')}` : ''}

WORKLOAD POR PESSOA:
${Object.entries(workload_by_assignee).map(([name, count]) => `- ${name}: ${count} tarefas`).join('\n')}

INSTRUÇÕES:
1. Responda em português de Angola
2. Seja conciso e accionável
3. Forneça recomendações baseadas em dados
4. Se relevante, sugira acções directas (criar tarefa, alertar, etc.)
5. Cite números e datas específicas
6. Priorize tarefas atrasadas`;
}
```

#### 2.3. Actualizar callClaudeAPI() para Task Context (Linha ~120)

```javascript
async callClaudeAPI(systemPrompt, messageHistory, userMessage) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Construir message history
  const messages = [
    ...messageHistory.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,  // ← Aumentado para mais contexto
    system: systemPrompt,
    messages
  });

  return response;
}
```

---

### 3. **simple-server.js** (Backend Main)

#### 3.1. Actualizar POST /api/chat (Linha ~525)

```javascript
// POST /api/chat - Chat com contexto de tarefas
if (req.url === '/api/chat' && req.method === 'POST') {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { conversationId, message, taskContext } = JSON.parse(body);

      if (!conversationId || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
        return;
      }

      // Validar taskContext
      const validatedContext = {
        total_open_tasks: taskContext?.total_open_tasks || 0,
        overdue_count: taskContext?.overdue_count || 0,
        overdue_tasks: taskContext?.overdue_tasks || [],
        workload_by_assignee: taskContext?.workload_by_assignee || {},
        tasks_by_status: taskContext?.tasks_by_status || {}
      };

      // Processar com contexto
      const aiResponse = await chatService.sendMessage(
        conversationId,
        message,
        validatedContext  // ← Passar contexto
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: aiResponse
      }));
    } catch (error) {
      console.error('Erro em POST /api/chat:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });

  return;
}
```

---

## ✅ Critérios de Verificação

### Funcionalidades

- [ ] Contexto de tarefas preparado correctamente
- [ ] Contexto enviado para API POST /api/chat
- [ ] Claude recebe contexto e sistema prompt enriquecido
- [ ] Respostas reconhecem tarefas abertas/atrasadas
- [ ] Typing indicator funciona
- [ ] Sugestões rápidas aparecem baseadas em contexto
- [ ] Histórico de conversa persistido
- [ ] Mensagens renderizam correctamente

### Performance

- [ ] Contexto de tarefas preparado em < 100ms
- [ ] POST /api/chat responde em < 3s
- [ ] Claude API responde em < 5s
- [ ] Sem bloqueio de UI enquanto aguarda resposta
- [ ] Memory não cresce com histórico

### Compatibilidade

- [ ] Funciona em Chrome/Firefox/Safari
- [ ] Graceful degradation sem CSS
- [ ] Funciona em mobile
- [ ] Fallback se API falhar

---

## 🧪 Testes End-to-End

### Teste 1: Contexto de Tarefas
1. Abrir DevTools (F12)
2. No Console, executar:
   ```javascript
   prepareTaskContext()
   ```
3. **Esperado:** Ver objecto com total_open_tasks, overdue_count, workload_by_assignee

### Teste 2: Pergunta sobre Tarefas
1. Abrir chat
2. Perguntar: "Quantas tarefas abertas temos?"
3. **Esperado:** Chat responde com número exacto

### Teste 3: Sugestões Rápidas
1. Ter tarefas atrasadas
2. Abrir chat
3. **Esperado:** Ver botão "📌 Ver tarefas atrasadas"
4. Clicar
5. **Esperado:** Chat responde com tarefas atrasadas

### Teste 4: Typing Indicator
1. Enviar pergunta para chat
2. **Esperado:** Ver dots piscando enquanto aguarda resposta

### Teste 5: Contexto em Resposta
1. Mudar status de tarefa no Supabase
2. Perguntar ao chat: "Qual é o status actual?"
3. **Esperado:** Chat reconhece mudança

---

## 🚀 Implementação Passo-a-Passo

### Fase 1: Preparação de Contexto (30 min)
- [ ] Criar `prepareTaskContext()`
- [ ] Testar contexto no console
- [ ] Validar estrutura de dados

### Fase 2: Integração Backend (30 min)
- [ ] Actualizar POST /api/chat
- [ ] Modificar `buildEnrichedSystemPrompt()`
- [ ] Aumentar max_tokens em Claude API
- [ ] Testar com curl

### Fase 3: Integração Frontend (30 min)
- [ ] Modificar `sendChatMessage()`
- [ ] Enviar taskContext na requisição
- [ ] Testar com perguntas sobre tarefas

### Fase 4: UX Melhorias (30 min)
- [ ] Adicionar typing indicator
- [ ] Implementar quick suggestions
- [ ] Adicionar CSS
- [ ] Testar responsividade

### Fase 5: Testes (30 min)
- [ ] Testes end-to-end
- [ ] Performance profiling
- [ ] Cross-browser testing
- [ ] Mobile testing

---

## 📊 Antes vs Depois

### Antes (Phase 8)
- ❌ Chat genérico, sem contexto de tarefas
- ❌ Não compreende estado de tarefas
- ❌ Respostas genéricas
- ❌ Sem UX feedback (typing indicator)

### Depois (Phase 9)
- ✅ Chat enriquecido com contexto de tarefas
- ✅ Compreende tarefas abertas/atrasadas/workload
- ✅ Respostas baseadas em dados
- ✅ UX melhorada (typing, sugestões)
- ✅ Ajuda real na gestão de tarefas

---

## 🎯 Próximas Fases

### Phase 10: Mobile Responsivity
- Optimizar chat para mobile
- Touch-friendly interactions
- Offline support

### Phase 11: Advanced Analytics
- Análise de padrões de conversa
- Métricas de satisfação
- Insights sobre uso

---

## 📚 Recursos Úteis

### Anthropic Claude API
- [Claude API Docs](https://docs.anthropic.com)
- [API Reference](https://docs.anthropic.com/en/api)

### JavaScript Promises
- [MDN: Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

### Fetch API
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Plano pronto para execução!** 🎯

**Estimativa:** 2-3 horas de implementação + testes
**Complexidade:** Média
**Impacto na UX:** Alto

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
