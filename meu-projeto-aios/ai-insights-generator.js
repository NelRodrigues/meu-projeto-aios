/**
 * @fileoverview AI Insights Generator using Anthropic Claude API
 *
 * Gera insights inteligentes sobre o negócio usando análise de dados em tempo real
 * Implementa agendamento automático e contexto dinâmico.
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Gerador de Insights de IA
 *
 * Funcionalidades:
 * - Análise de métricas em tempo real
 * - Geração de alertas, tendências e recomendações
 * - Contexto dinâmico (clientes, projectos, receitas)
 * - Armazenamento em base de dados
 */
export class AIInsightsGenerator {
  constructor(config = {}) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature || 0.7;
    this.lastGenerationTime = null;
    this.lastError = null;
  }

  /**
   * Gerar insights baseado em métricas e dados do negócio
   *
   * @param {object} metrics - Métricas actuais (clientes, receita, projectos)
   * @param {object} db - Cliente Supabase para buscar contexto
   * @returns {Promise<array>} Array de insights
   *
   * @example
   * const insights = await generator.generateInsights(metrics, supabase);
   * // Retorna:
   * // [
   * //   {
   * //     type: 'alert',
   * //     severity: 'high',
   * //     title: 'Receita em queda',
   * //     description: '...',
   * //     actionItems: [...]
   * //   }
   * // ]
   */
  async generateInsights(metrics, db) {
    try {
      console.log('🧠 Gerando insights de IA...');

      // Buscar contexto adicional
      const context = await this.buildContext(metrics, db);

      // Criar prompt
      const prompt = this.buildPrompt(metrics, context);

      // Chamar Claude API
      console.log('🔄 Consultando Claude API...');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Parsear resposta
      const content = response.content[0].text;
      const insights = this.parseInsights(content);

      this.lastGenerationTime = new Date();

      console.log(`✅ ${insights.length} insights gerados com sucesso`);

      return insights;
    } catch (error) {
      this.lastError = error;
      console.error('❌ Erro ao gerar insights:', error.message);
      return [];
    }
  }

  /**
   * Construir contexto dinâmico para o prompt
   */
  async buildContext(metrics, db) {
    try {
      const context = {
        topClients: [],
        recentProjects: [],
        churnRisk: [],
        growthOpportunities: []
      };

      if (!db) {
        return context;
      }

      // Top clientes por receita
      try {
        const { data: topClients } = await db
          .from('clients')
          .select('name, monthly_value, status, satisfaction_score')
          .eq('status', 'active')
          .order('monthly_value', { ascending: false })
          .limit(5);

        context.topClients = topClients || [];
      } catch (error) {
        console.warn('⚠️  Erro ao buscar top clientes:', error.message);
      }

      // Projectos recentes
      try {
        const { data: recentProjects } = await db
          .from('projects')
          .select('name, status, progress_percentage, client_id')
          .order('created_at', { ascending: false })
          .limit(5);

        context.recentProjects = recentProjects || [];
      } catch (error) {
        console.warn('⚠️  Erro ao buscar projectos recentes:', error.message);
      }

      // Detectar clientes em risco de churn
      try {
        const { data: churnRisk } = await db
          .from('clients')
          .select('name, satisfaction_score, monthly_value')
          .lt('satisfaction_score', 6)
          .eq('status', 'active');

        context.churnRisk = churnRisk || [];
      } catch (error) {
        console.warn('⚠️  Erro ao detectar churn risk:', error.message);
      }

      return context;
    } catch (error) {
      console.warn('⚠️  Erro ao construir contexto:', error.message);
      return {};
    }
  }

  /**
   * Construir prompt para Claude
   */
  buildPrompt(metrics, context) {
    const contextStr = this.formatContext(context);

    return `Você é um analista de negócios especializado em agências de IA em Angola.
Analise os dados abaixo e forneça 3-5 insights accionáveis em formato JSON.

## DADOS ACTUAIS

Clientes Activos: ${metrics.active_clients || 0}
Receita Mensal: €${(metrics.monthly_revenue || 0).toLocaleString('pt-AO')}
Receita Anual: €${(metrics.annual_revenue || 0).toLocaleString('pt-AO')}
Projectos em Progresso: ${metrics.projects_in_progress || 0}
Satisfação Média: ${metrics.avg_satisfaction_score || 0}/10

## CONTEXTO ADICIONAL

${contextStr}

## INSTRUÇÕES

Analise os dados e forneça insights em JSON VÁLIDO com a estrutura:
\`\`\`json
[
  {
    "type": "alert|trend|recommendation|prediction",
    "severity": "low|medium|high|critical",
    "title": "Título breve",
    "description": "Descrição detalhada em 1-2 frases",
    "actionItems": ["Acção 1", "Acção 2"],
    "impact": "Impacto estimado"
  }
]
\`\`\`

**Tipos de Insights:**
- **alert**: Situação imediata que requer atenção
- **trend**: Padrão identificado nos dados
- **recommendation**: Sugestão de acção baseada em análise
- **prediction**: Previsão futura baseada em dados históricos

**Contexto de Angola:**
- Use moeda Angolana (AOA/€)
- Considere mercado de IA em crescimento
- Foco em agências de IA como cliente típico

Retorne APENAS o JSON válido, sem explicações adicionais.`;
  }

  /**
   * Formatar contexto para o prompt
   */
  formatContext(context) {
    let str = '';

    if (context.topClients && context.topClients.length > 0) {
      str += '\n### Top Clientes por Receita\n';
      context.topClients.forEach(client => {
        str += `- ${client.name}: €${(client.monthly_value || 0).toLocaleString('pt-AO')}/mês (Satisfação: ${client.satisfaction_score}/10)\n`;
      });
    }

    if (context.recentProjects && context.recentProjects.length > 0) {
      str += '\n### Projectos Recentes\n';
      context.recentProjects.forEach(proj => {
        str += `- ${proj.name}: ${proj.progress_percentage}% (${proj.status})\n`;
      });
    }

    if (context.churnRisk && context.churnRisk.length > 0) {
      str += '\n### Clientes em Risco de Churn (Satisfação < 6)\n';
      context.churnRisk.forEach(client => {
        str += `- ${client.name}: €${(client.monthly_value || 0).toLocaleString('pt-AO')}/mês (Satisfação: ${client.satisfaction_score}/10)\n`;
      });
    }

    return str || 'Sem contexto adicional disponível.';
  }

  /**
   * Parsear JSON de insights da resposta
   */
  parseInsights(content) {
    try {
      // Tentar extrair JSON do content
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('⚠️  Nenhum JSON encontrado na resposta');
        return [];
      }

      const insights = JSON.parse(jsonMatch[0]);

      // Validar e enriquecer insights
      return insights.map(insight => ({
        type: insight.type || 'recommendation',
        severity: insight.severity || 'medium',
        title: insight.title || 'Insight',
        description: insight.description || '',
        actionItems: insight.actionItems || [],
        impact: insight.impact || 'Desconhecido',
        generatedAt: new Date().toISOString(),
        isDismissed: false
      }));
    } catch (error) {
      console.error('❌ Erro ao parsear JSON de insights:', error.message);
      // Retornar insight de erro
      return [{
        type: 'alert',
        severity: 'medium',
        title: 'Erro ao gerar insights',
        description: 'Houve um erro ao gerar insights. Tente novamente mais tarde.',
        actionItems: ['Contacte o administrador'],
        impact: 'Nenhum',
        generatedAt: new Date().toISOString(),
        isDismissed: false
      }];
    }
  }

  /**
   * Salvar insights na base de dados
   */
  async saveInsights(insights, db) {
    try {
      if (!db || insights.length === 0) {
        return { success: true, saved: 0 };
      }

      // Primeiro, dismiss insights antigos (mais de 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await db
        .from('ai_insights')
        .update({ is_dismissed: true })
        .lt('created_at', yesterday)
        .eq('is_dismissed', false);

      // Salvar novos insights
      let saved = 0;
      for (const insight of insights) {
        try {
          const { error } = await db
            .from('ai_insights')
            .insert([{
              type: insight.type,
              severity: insight.severity,
              title: insight.title,
              description: insight.description,
              action_items: insight.actionItems,
              impact: insight.impact,
              valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              is_dismissed: false
            }]);

          if (!error) {
            saved++;
          }
        } catch (error) {
          console.warn(`⚠️  Erro ao salvar insight "${insight.title}":`, error.message);
        }
      }

      console.log(`✅ ${saved}/${insights.length} insights salvos na base de dados`);

      return { success: true, saved };
    } catch (error) {
      console.error('❌ Erro ao salvar insights:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gerar insights e salvar (pipeline completo)
   */
  async generateAndSaveInsights(metrics, db) {
    try {
      const insights = await this.generateInsights(metrics, db);
      const saveResult = await this.saveInsights(insights, db);

      return {
        success: saveResult.success,
        insightsGenerated: insights.length,
        insightsSaved: saveResult.saved,
        insights
      };
    } catch (error) {
      console.error('❌ Erro no pipeline de insights:', error.message);
      return {
        success: false,
        error: error.message,
        insightsGenerated: 0,
        insightsSaved: 0
      };
    }
  }

  /**
   * Obter status
   */
  getStatus() {
    return {
      lastGenerationTime: this.lastGenerationTime,
      lastError: this.lastError ? this.lastError.message : null,
      model: this.model,
      configured: !!process.env.ANTHROPIC_API_KEY
    };
  }
}

export default AIInsightsGenerator;
