import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config/supabase.js';

const client = new Anthropic();

export class AIInsightsGenerator {
  constructor() {
    this.model = 'claude-3-5-sonnet-20241022';
    this.systemPrompt = `Você é um analista de negócios especializado em agências de IA em Angola.
Analise as métricas de negócio fornecidas e gere insights accionáveis.

Forneça 3-5 insights em JSON com os seguintes campos:
- type: "alert" | "trend" | "recommendation" | "prediction"
- severity: "low" | "medium" | "high" | "critical"
- title: Título conciso do insight
- description: Descrição detalhada e accionável
- action_items: Array de 2-3 acções recomendadas

Responda APENAS com um array JSON válido, sem texto adicional.`;
  }

  /**
   * Buscar métricas recentes para contexto de IA
   */
  async getContextMetrics() {
    try {
      // Últimas 30 métricas para contexto
      const { data: metrics, error } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!metrics || metrics.length === 0) {
        return null;
      }

      // Calcular tendências
      const latest = metrics[0];
      const previous = metrics[29] || metrics[metrics.length - 1];

      const clientsTrend = ((latest.active_clients - previous.active_clients) / previous.active_clients) * 100;
      const revenueTrend = ((latest.monthly_revenue - previous.monthly_revenue) / previous.monthly_revenue) * 100;
      const satisfactionTrend = ((latest.avg_satisfaction_score - previous.avg_satisfaction_score) / previous.avg_satisfaction_score) * 100;

      return {
        current: latest,
        trend: {
          clientsPercentage: clientsTrend.toFixed(2),
          revenuePercentage: revenueTrend.toFixed(2),
          satisfactionPercentage: satisfactionTrend.toFixed(2),
        },
        historicalRange: {
          minClients: Math.min(...metrics.map(m => m.active_clients)),
          maxClients: Math.max(...metrics.map(m => m.active_clients)),
          minRevenue: Math.min(...metrics.map(m => m.monthly_revenue)),
          maxRevenue: Math.max(...metrics.map(m => m.monthly_revenue)),
          minSatisfaction: Math.min(...metrics.map(m => m.avg_satisfaction_score)),
          maxSatisfaction: Math.max(...metrics.map(m => m.avg_satisfaction_score)),
        },
      };
    } catch (error) {
      console.error('Erro ao buscar métricas contextuais:', error);
      return null;
    }
  }

  /**
   * Buscar clientes com baixa satisfação
   */
  async getRiskClients() {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, satisfaction_score')
        .lt('satisfaction_score', 6)
        .limit(10);

      if (error) throw error;
      return clients || [];
    } catch (error) {
      console.error('Erro ao buscar clientes em risco:', error);
      return [];
    }
  }

  /**
   * Buscar projetos bloqueados
   */
  async getBlockedProjects() {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, client_id, progress_percentage')
        .eq('status', 'blocked')
        .limit(10);

      if (error) throw error;
      return projects || [];
    } catch (error) {
      console.error('Erro ao buscar projectos bloqueados:', error);
      return [];
    }
  }

  /**
   * Gerar insights com Claude API
   */
  async generateInsights() {
    try {
      console.log('[AIInsightsGenerator] Iniciando geração de insights...');

      // Recolher contexto
      const metrics = await this.getContextMetrics();
      const riskClients = await this.getRiskClients();
      const blockedProjects = await this.getBlockedProjects();

      if (!metrics) {
        console.warn('[AIInsightsGenerator] Sem dados de métricas disponíveis');
        return [];
      }

      // Construir prompt com contexto
      const contextPrompt = `
Análise de Métricas - Marca Digital

## Métricas Actuais
- Clientes Activos: ${metrics.current.active_clients}
- Receita Mensal: KZ ${metrics.current.monthly_revenue.toLocaleString('pt-AO')}
- Receita Anual: KZ ${metrics.current.annual_revenue.toLocaleString('pt-AO')}
- Satisfação Média: ${metrics.current.avg_satisfaction_score.toFixed(2)}/10
- Projectos em Andamento: ${metrics.current.projects_in_progress}

## Tendências (últimos 30 dias)
- Clientes: ${metrics.trend.clientsPercentage}%
- Receita: ${metrics.trend.revenuePercentage}%
- Satisfação: ${metrics.trend.satisfactionPercentage}%

## Intervalo Histórico (últimos 30 dias)
- Clientes: ${metrics.historicalRange.minClients}-${metrics.historicalRange.maxClients}
- Receita: KZ ${metrics.historicalRange.minRevenue.toLocaleString('pt-AO')}-KZ ${metrics.historicalRange.maxRevenue.toLocaleString('pt-AO')}
- Satisfação: ${metrics.historicalRange.minSatisfaction.toFixed(2)}-${metrics.historicalRange.maxSatisfaction.toFixed(2)}/10

## Clientes em Risco (satisfação < 6)
${riskClients.length > 0 ? riskClients.map(c => `- ${c.name}: ${c.satisfaction_score}/10`).join('\n') : 'Nenhum cliente em risco'}

## Projectos Bloqueados
${blockedProjects.length > 0 ? blockedProjects.map(p => `- ${p.name}: ${p.progress_percentage}% completo`).join('\n') : 'Nenhum projecto bloqueado'}

Forneça insights accionáveis baseados nestes dados.`;

      // Chamar Claude API
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2000,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: contextPrompt,
          },
        ],
      });

      // Extrair insights do response
      const responseText = response.content[0].text;
      let insights = [];

      try {
        // Tentar parse JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('[AIInsightsGenerator] Erro ao fazer parse de insights:', parseError);
        // Criar insight genérico se falhar parse
        insights = [
          {
            type: 'recommendation',
            severity: 'medium',
            title: 'Análise de Negócio',
            description: responseText.substring(0, 200),
            action_items: ['Revisar métricas', 'Contactar clientes'],
          },
        ];
      }

      // Salvar insights em base de dados
      const insightsToSave = insights.map((insight) => ({
        type: insight.type || 'recommendation',
        severity: insight.severity || 'medium',
        title: insight.title,
        description: insight.description,
        action_items: insight.action_items || [],
        is_dismissed: false,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      }));

      const { data: savedInsights, error: saveError } = await supabase
        .from('ai_insights')
        .insert(insightsToSave)
        .select();

      if (saveError) {
        console.error('[AIInsightsGenerator] Erro ao salvar insights:', saveError);
        throw saveError;
      }

      console.log(`[AIInsightsGenerator] ✅ ${savedInsights.length} insights gerados com sucesso`);
      return savedInsights;
    } catch (error) {
      console.error('[AIInsightsGenerator] Erro ao gerar insights:', error);
      throw error;
    }
  }

  /**
   * Obter insights não lidos
   */
  async getActiveInsights() {
    try {
      const { data: insights, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('is_dismissed', false)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return insights || [];
    } catch (error) {
      console.error('Erro ao buscar insights activos:', error);
      return [];
    }
  }

  /**
   * Marcar insight como lido
   */
  async dismissInsight(insightId) {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId)
        .select();

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Erro ao descartar insight:', error);
      throw error;
    }
  }
}

export default AIInsightsGenerator;
