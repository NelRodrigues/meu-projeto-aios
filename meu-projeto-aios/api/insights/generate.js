/**
 * POST /api/insights/generate
 * Gera insights de IA com base nas métricas atuais
 */

import { sendJSON, sendError, sendSuccess } from '../lib/handlers.js';
import { supabase, supabaseAdmin } from '../lib/supabase.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return sendError(res, 500, 'Anthropic API key not configured');
    }

    // Buscar métricas atuais
    const { data: metrics } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (!metrics) {
      return sendError(res, 400, 'No metrics available to generate insights');
    }

    const prompt = `Analise as seguintes métricas de uma agência de IA em Angola e forneça 3-5 insights accionáveis:

Métricas:
- Clientes Ativos: ${metrics.active_clients}
- Projetos em Andamento: ${metrics.projects_in_progress}
- Receita Mensal: AOA ${metrics.monthly_revenue?.toLocaleString()}
- Receita Anual: AOA ${metrics.annual_revenue?.toLocaleString()}
- Satisfação Média: ${metrics.avg_satisfaction_score}/10

Para cada insight, forneça:
1. Tipo (alert | trend | recommendation | prediction)
2. Severidade (low | medium | high | critical)
3. Título
4. Descrição
5. Acções recomendadas

Responda em formato JSON com array de insights.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: 'Você é um analista de negócios especializado em agências de IA em Angola. Forneça insights em formato JSON.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.message}`);
    }

    const result = await response.json();
    let insightText = result.content[0].text;

    // Tentar extrair JSON da resposta
    const jsonMatch = insightText.match(/\[[\s\S]*\]/);
    let insights = [];

    if (jsonMatch) {
      try {
        insights = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.warn('Failed to parse insights JSON:', err);
        insights = [
          {
            type: 'recommendation',
            severity: 'medium',
            title: 'Análise Gerada',
            description: insightText,
            action_items: []
          }
        ];
      }
    }

    // Salvar insights no banco de dados
    for (const insight of insights) {
      try {
        await supabaseAdmin
          .from('ai_insights')
          .insert({
            type: insight.type || 'recommendation',
            severity: insight.severity || 'medium',
            title: insight.title,
            description: insight.description,
            action_items: insight.action_items || [],
            is_dismissed: false,
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
      } catch (err) {
        console.warn('Failed to save insight:', err);
      }
    }

    return sendSuccess(res, {
      count: insights.length,
      insights: insights
    });
  } catch (err) {
    console.error('Insights generation error:', err);
    return sendError(res, 500, 'Failed to generate insights', err.message);
  }
}
