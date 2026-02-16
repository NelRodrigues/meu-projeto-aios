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

    this.model = config.model || 'claude-3-5-sonnet-20241022';
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
   * @returns {Promise<object>} Resposta do assistente
   *
   * @example
   * const response = await chatService.sendMessage(
   *   'conv-123',
   *   'Qual é a receita deste mês?',
   *   metrics,
   *   supabase
   * );
   */
  async sendMessage(conversationId, userMessage, metrics = {}, db = null) {
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

      // Construir prompt com sistema
      const systemPrompt = this.buildSystemPrompt(contextData);

      // Chamar Claude API
      console.log('🔄 Consultando Claude...');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: this.temperature,
        system: systemPrompt,
        messages: conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      const assistantMessage = response.content[0].text;

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
