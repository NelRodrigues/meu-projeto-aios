import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config/supabase.js';

const client = new Anthropic();

export class AIChat {
  constructor() {
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Buscar métricas recentes para contexto
   */
  async getRecentMetrics() {
    try {
      const { data: metrics, error } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return metrics || [];
    } catch (error) {
      console.error('Erro ao buscar métricas recentes:', error);
      return [];
    }
  }

  /**
   * Buscar projectos recentes
   */
  async getRecentProjects() {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, status, progress_percentage, client_id')
        .limit(5)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return projects || [];
    } catch (error) {
      console.error('Erro ao buscar projectos recentes:', error);
      return [];
    }
  }

  /**
   * Buscar clientes principais
   */
  async getTopClients() {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, monthly_value, satisfaction_score')
        .order('monthly_value', { ascending: false })
        .limit(5);

      if (error) throw error;
      return clients || [];
    } catch (error) {
      console.error('Erro ao buscar clientes principais:', error);
      return [];
    }
  }

  /**
   * Processar mensagem do utilizador e gerar resposta
   */
  async processMessage(conversationId, userMessage) {
    try {
      console.log(`[AIChat] Processando mensagem: "${userMessage.substring(0, 50)}..."`);

      // Recolher contexto
      const metrics = await this.getRecentMetrics();
      const projects = await this.getRecentProjects();
      const clients = await this.getTopClients();

      // Buscar histórico de conversa
      const { data: conversation, error: convError } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (convError && convError.code !== 'PGRST116') {
        throw convError;
      }

      let messages = [];
      if (conversation && conversation.messages) {
        messages = conversation.messages;
      }

      // Construir sistema prompt com contexto
      const systemPrompt = `Você é um gestor de marketing de IA especializado em agências de IA em Angola.
Responde com base nos dados de negócio em tempo real da agência Marca Digital.

## Contexto Actual
### Últimas Métricas
${metrics.length > 0 ? `- Clientes Activos: ${metrics[0].active_clients}
- Receita Mensal: KZ ${metrics[0].monthly_revenue.toLocaleString('pt-AO')}
- Satisfação Média: ${metrics[0].avg_satisfaction_score.toFixed(2)}/10
- Projectos em Andamento: ${metrics[0].projects_in_progress}` : 'Sem dados disponíveis'}

### Projectos Recentes
${projects.length > 0 ? projects.map(p => `- ${p.name} (${p.status}, ${p.progress_percentage}%)`).join('\n') : 'Sem projectos'}

### Clientes Principais
${clients.length > 0 ? clients.map(c => `- ${c.name}: KZ ${c.monthly_value.toLocaleString('pt-AO')}/mês (${c.satisfaction_score}/10)`).join('\n') : 'Sem clientes'}

## Instruções
- Responda em português de Angola
- Seja conciso e accionável
- Use dados reais no contexto
- Ofereça recomendações práticas
- Se perguntarem sobre números específicos, use os dados do contexto
- Mantenha tom profissional mas amigável`;

      // Adicionar nova mensagem ao histórico
      const userMsg = {
        role: 'user',
        content: userMessage,
      };

      // Preparar mensagens para Claude API
      const apiMessages = [
        ...messages,
        userMsg,
      ];

      // Chamar Claude API
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: apiMessages,
      });

      const assistantMessage = response.content[0].text;

      // Actualizar histórico de conversa
      const updatedMessages = [
        ...messages,
        userMsg,
        {
          role: 'assistant',
          content: assistantMessage,
        },
      ];

      // Salvar conversa actualizada
      const { error: updateError } = await supabase
        .from('ai_conversations')
        .upsert({
          id: conversationId,
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        console.error('[AIChat] Erro ao salvar conversa:', updateError);
        // Não lançar erro - apenas retornar resposta
      }

      console.log('[AIChat] ✅ Resposta gerada com sucesso');

      return {
        conversationId,
        userMessage,
        assistantMessage,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[AIChat] Erro ao processar mensagem:', error);
      throw error;
    }
  }

  /**
   * Criar nova conversa
   */
  async createConversation() {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          messages: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de conversa
   */
  async getConversationHistory(conversationId) {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data?.messages || [];
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }
}

export default AIChat;
