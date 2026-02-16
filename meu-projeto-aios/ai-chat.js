/**
 * @fileoverview AI Chatbot Service using Anthropic Claude API
 *
 * Serviço de chat conversacional com contexto de negócio em tempo real
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Serviço de Chat de IA
 *
 * Funcionalidades:
 * - Chat conversacional com contexto
 * - Histórico de conversas
 * - Análise de métricas em tempo real
 * - Recomendações accionáveis
 */
export class AIChatService {
  constructor(config = {}) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.temperature = config.temperature || 0.7;
    this.conversations = new Map(); // In-memory store for conversations
  }

  /**
   * Criar ou obter conversa
   */
  getOrCreateConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return this.conversations.get(conversationId);
  }

  /**
   * Enviar mensagem e obter resposta
   *
   * @param {string} conversationId - ID único da conversa
   * @param {string} userMessage - Mensagem do utilizador
   * @param {object} metrics - Métricas actuais para contexto
   * @param {object} db - Cliente Supabase para contexto
   * @param {object} taskContext - Contexto de tarefas (Phase 9)
   * @returns {Promise<object>} Resposta do assistente
   *
   * @example
   * const response = await chatService.sendMessage(
   *   'conv-123',
   *   'Qual é a receita deste mês?',
   *   metrics,
   *   supabase,
   *   taskContext
   * );
   */
  async sendMessage(conversationId, userMessage, metrics = {}, db = null, taskContext = null) {
    try {
      console.log(`💬 Processando mensagem (conv: ${conversationId.substring(0, 8)}...)`);

      const conversation = this.getOrCreateConversation(conversationId);

      // Adicionar mensagem do utilizador
      conversation.messages.push({
        role: 'user',
        content: userMessage
      });

      // Buscar contexto
      const contextData = await this.buildContextData(metrics, db);

      // Construir prompt com sistema (enriquecido com tarefas se disponível)
      const systemPrompt = taskContext
        ? this.buildEnrichedSystemPrompt(contextData, taskContext)
        : this.buildSystemPrompt(contextData);

      // Chamar Claude API
      console.log('🔄 Consultando Claude...');
      let assistantMessage;

      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 2000,
          temperature: this.temperature,
          system: systemPrompt,
          messages: conversation.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        });
        assistantMessage = response.content[0].text;
      } catch (apiError) {
        // Fallback: Gerar resposta inteligente localmente
        console.warn(`⚠️  Claude API falhou (${apiError.message}), usando fallback inteligente`);
        assistantMessage = this.generateFallbackResponse(userMessage, contextData);
      }

      // Adicionar resposta ao histórico
      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage
      });

      conversation.updatedAt = new Date();

      // Limitar histórico a últimas 10 mensagens (5 pares)
      if (conversation.messages.length > 10) {
        conversation.messages = conversation.messages.slice(-10);
      }

      console.log('✅ Resposta gerada com sucesso');

      return {
        success: true,
        message: assistantMessage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error.message);
      return {
        success: false,
        error: error.message,
        message: '❌ Desculpe, não consegui processar a sua mensagem. Tente novamente.'
      };
    }
  }

  /**
   * Construir dados de contexto
   */
  async buildContextData(metrics, db) {
    const context = {
      metrics,
      currentDate: new Date().toLocaleDateString('pt-AO'),
      recentEvents: []
    };

    if (!db) return context;

    try {
      // Buscar insights recentes não dismissidos
      const { data: insights } = await db
        .from('ai_insights')
        .select('title, severity')
        .eq('is_dismissed', false)
        .limit(3)
        .order('created_at', { ascending: false });

      context.recentInsights = insights || [];
    } catch (error) {
      console.warn('⚠️  Erro ao buscar insights:', error.message);
    }

    return context;
  }

  /**
   * Construir prompt do sistema
   */
  buildSystemPrompt(contextData) {
    return `Você é o gestor de marketing de IA da Marca Digital, uma agência especializada em soluções de IA em Angola.

Você é amigável, profissional e conhecedor do negócio. Ajuda o CEO/gestor com:
- Análise de métricas e performance
- Recomendações de negócio
- Explicações de dados
- Próximos passos estratégicos

## CONTEXTO ACTUAL

**Data:** ${contextData.currentDate}

**Métricas Actuais:**
- Clientes Activos: ${contextData.metrics.active_clients || 0}
- Receita Mensal: €${(contextData.metrics.monthly_revenue || 0).toLocaleString('pt-AO')}
- Receita Anual: €${(contextData.metrics.annual_revenue || 0).toLocaleString('pt-AO')}
- Projectos em Progresso: ${contextData.metrics.projects_in_progress || 0}
- Satisfação Média: ${contextData.metrics.avg_satisfaction_score || 0}/10

${contextData.recentInsights && contextData.recentInsights.length > 0 ? `**Insights Recentes:**
${contextData.recentInsights.map(i => `- [${i.severity.toUpperCase()}] ${i.title}`).join('\n')}` : ''}

## REGRAS

1. Sempre ser honesto sobre dados e limitações
2. Fornecer números reais quando disponíveis
3. Fazer recomendações accionáveis
4. Usar linguagem clara e profissional
5. Considerar contexto de Angola e agências de IA
6. Respeitar moedas locais (AOA/€)

Responda de forma concisa (2-3 parágrafos) a menos que pedido contexto mais detalhado.`;
  }

  /**
   * Construir prompt enriquecido com contexto de tarefas (Phase 9)
   */
  buildEnrichedSystemPrompt(contextData, taskContext) {
    // Formatar workload por assignee
    const workloadEntries = Object.entries(taskContext.workload_by_assignee || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `  - ${name}: ${count} tarefa${count !== 1 ? 's' : ''}`)
      .join('\n');

    // Formatar tarefas atrasadas
    const overdueList = (taskContext.overdue_tasks || [])
      .slice(0, 3)
      .map(task => `  - [${task.status || 'open'}] ${task.name || 'Tarefa sem nome'} (vencimento: ${new Date(task.due_date).toLocaleDateString('pt-AO')})`)
      .join('\n');

    return `Você é o gestor de marketing de IA da Marca Digital, uma agência especializada em soluções de IA em Angola.

Você é amigável, profissional e conhecedor do negócio. Ajuda o CEO/gestor com:
- Análise de métricas e performance
- Recomendações de negócio
- Explicações de dados
- Próximos passos estratégicos
- **NOVO:** Gestão e análise de tarefas (Phase 9)

## CONTEXTO ACTUAL

**Data:** ${contextData.currentDate}

**Métricas Actuais:**
- Clientes Activos: ${contextData.metrics.active_clients || 0}
- Receita Mensal: €${(contextData.metrics.monthly_revenue || 0).toLocaleString('pt-AO')}
- Receita Anual: €${(contextData.metrics.annual_revenue || 0).toLocaleString('pt-AO')}
- Projectos em Progresso: ${contextData.metrics.projects_in_progress || 0}
- Satisfação Média: ${contextData.metrics.avg_satisfaction_score || 0}/10

${contextData.recentInsights && contextData.recentInsights.length > 0 ? `**Insights Recentes:**
${contextData.recentInsights.map(i => `- [${i.severity.toUpperCase()}] ${i.title}`).join('\n')}` : ''}

## CONTEXTO DE TAREFAS (Phase 9)

**Resumo de Tarefas Abertas:**
- Total de Tarefas Abertas: ${taskContext.total_open_tasks || 0}
- Tarefas Atrasadas: ${taskContext.overdue_count || 0}
- Tarefas em Progresso: ${taskContext.tasks_by_status?.in_progress || 0}
- Tarefas em Revisão: ${taskContext.tasks_by_status?.in_review || 0}
- Tarefas Não Iniciadas: ${taskContext.tasks_by_status?.open || 0}

${workloadEntries ? `**Workload por Assignee (Top 5):**
${workloadEntries}` : ''}

${overdueList ? `**Tarefas Atrasadas (Críticas):**
${overdueList}` : 'Nenhuma tarefa atrasada - Excelente!'}

## INSTRUÇÕES PARA TAREFAS

Quando o utilizador pergunta sobre tarefas:
1. Use os dados acima para fornecer informações precisas
2. Identifique gargalos (assignees sobrecarregados)
3. Recomende redistribuição de tarefas se necessário
4. Sugira priorização baseada em prazos
5. Alerte para tarefas críticas atrasadas

## REGRAS

1. Sempre ser honesto sobre dados e limitações
2. Fornecer números reais quando disponíveis
3. Fazer recomendações accionáveis
4. Usar linguagem clara e profissional
5. Considerar contexto de Angola e agências de IA
6. Respeitar moedas locais (AOA/€)
7. **NEW (Phase 9):** Reconhecer e responder a perguntas sobre tarefas e workload

Responda de forma concisa (2-3 parágrafos) a menos que pedido contexto mais detalhado.`;
  }

  /**
   * Obter histórico de conversa
   */
  getConversationHistory(conversationId, limit = 10) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }

    return conversation.messages.slice(-limit).map((msg, idx) => ({
      id: idx,
      role: msg.role,
      content: msg.content,
      timestamp: new Date().toISOString() // Aproximado
    }));
  }

  /**
   * Salvar conversa na base de dados
   */
  async saveConversation(conversationId, db) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (!conversation || !db) {
        return { success: false };
      }

      const { error } = await db
        .from('ai_conversations')
        .upsert([{
          id: conversationId,
          messages: conversation.messages,
          created_at: conversation.createdAt.toISOString(),
          updated_at: conversation.updatedAt.toISOString()
        }], { onConflict: 'id' });

      if (error) {
        console.warn('⚠️  Erro ao salvar conversa:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Conversa ${conversationId.substring(0, 8)}... salva com sucesso`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao salvar conversa:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gerar resposta inteligente quando Claude API falha
   */
  generateFallbackResponse(userMessage, contextData) {
    const msg = userMessage.toLowerCase();

    // Respostas inteligentes baseadas em palavras-chave
    if (msg.includes('receita') || msg.includes('faturamento')) {
      return `📊 **Análise de Receita:**\n\nA receita mensal actual é de €${(contextData.metrics.monthly_revenue || 0).toLocaleString('pt-AO')}, com receita anual de €${(contextData.metrics.annual_revenue || 0).toLocaleString('pt-AO')}. Temos ${contextData.metrics.active_clients || 0} clientes activos gerando receita.`;
    }

    if (msg.includes('cliente') || msg.includes('clientes')) {
      return `👥 **Estado dos Clientes:**\n\nActualmente temos ${contextData.metrics.active_clients || 0} clientes activos com taxa de satisfação média de ${contextData.metrics.avg_satisfaction_score || 0}/10. Continue focado em retenção de clientes.`;
    }

    if (msg.includes('projecto') || msg.includes('projeto') || msg.includes('project')) {
      return `📋 **Projectos em Andamento:**\n\nTemos ${contextData.metrics.projects_in_progress || 0} projectos em execução no momento. Recomendo acompanhamento regular para garantir prazos.`;
    }

    if (msg.includes('satisfação') || msg.includes('satisfacao')) {
      return `⭐ **Índice de Satisfação:**\n\nA taxa de satisfação dos clientes é de ${contextData.metrics.avg_satisfaction_score || 0}/10. Mantenha este nível focando em qualidade e atendimento.`;
    }

    if (msg.includes('resumo') || msg.includes('status') || msg.includes('análise')) {
      return `📈 **Resumo Geral da Agência (${contextData.currentDate}):**\n\n✅ Clientes Activos: ${contextData.metrics.active_clients || 0}\n✅ Projectos: ${contextData.metrics.projects_in_progress || 0}\n✅ Receita Mensal: €${(contextData.metrics.monthly_revenue || 0).toLocaleString('pt-AO')}\n✅ Receita Anual: €${(contextData.metrics.annual_revenue || 0).toLocaleString('pt-AO')}\n✅ Satisfação: ${contextData.metrics.avg_satisfaction_score || 0}/10\n\nA agência está em boa posição operacional.`;
    }

    if (msg.includes('crescimento') || msg.includes('oportunidade')) {
      return `🚀 **Oportunidades de Crescimento:**\n\nRecomendações estratégicas:\n1. Expandir carteira de clientes (${contextData.metrics.active_clients || 0} actuais)\n2. Aumentar valor médio dos projectos\n3. Implementar automações para melhorar margem\n4. Desenvolver novos serviços complementares`;
    }

    // Resposta genérica amigável
    return `💡 **Resposta Analítica:**\n\nBaseado nos dados actuais da Marca Digital:\n- Clientes: ${contextData.metrics.active_clients || 0}\n- Projectos: ${contextData.metrics.projects_in_progress || 0}  \n- Receita Mensal: €${(contextData.metrics.monthly_revenue || 0).toLocaleString('pt-AO')}\n- Satisfação: ${contextData.metrics.avg_satisfaction_score || 0}/10\n\nPara análise mais detalhada sobre "${userMessage}", consulte o dashboard ou tente uma pergunta mais específica.`;
  }

  /**
   * Limpar conversas antigas (manutenção)
   */
  cleanupOldConversations(maxAgeHours = 24) {
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, conv] of this.conversations.entries()) {
      if (conv.updatedAt.getTime() < cutoffTime) {
        this.conversations.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} conversas antigas removidas do cache`);
    }

    return cleaned;
  }

  /**
   * Obter status
   */
  getStatus() {
    return {
      model: this.model,
      configured: !!process.env.ANTHROPIC_API_KEY,
      activeConversations: this.conversations.size,
      conversations: Array.from(this.conversations.values()).map(conv => ({
        id: conv.id,
        messageCount: conv.messages.length,
        lastUpdated: conv.updatedAt.toISOString()
      }))
    };
  }
}

export default AIChatService;
