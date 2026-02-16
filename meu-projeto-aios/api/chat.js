/**
 * POST /api/chat
 * Conversational chat with Claude AI
 */

import { sendJSON, sendError, sendSuccess } from './lib/handlers.js';
import { supabase } from './lib/supabase.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { conversationId, message, context } = req.body;

    if (!message) {
      return sendError(res, 400, 'Message is required');
    }

    if (!ANTHROPIC_API_KEY) {
      return sendError(res, 500, 'Anthropic API key not configured');
    }

    // Buscar contexto de métricas atuais
    let metricsContext = '';
    try {
      const { data: metrics } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (metrics) {
        metricsContext = `
Métricas Atuais:
- Clientes Ativos: ${metrics.active_clients}
- Projetos em Andamento: ${metrics.projects_in_progress}
- Receita Mensal: AOA ${metrics.monthly_revenue?.toLocaleString()}
- Receita Anual: AOA ${metrics.annual_revenue?.toLocaleString()}
- Satisfação Média: ${metrics.avg_satisfaction_score}/10
`;
      }
    } catch (err) {
      console.warn('Failed to fetch metrics context:', err);
    }

    // Chamar Claude API
    const systemPrompt = `Você é um assistente de IA especializado em gestão de agências de IA em Angola.
Você fornece insights accionáveis, análise de dados e recomendações estratégicas.
Responda em português de Angola de forma concisa e profissional.

${metricsContext}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.message}`);
    }

    const result = await response.json();
    const assistantMessage = result.content[0].text;

    // Salvar conversação (opcional)
    if (conversationId) {
      try {
        await supabase
          .from('ai_conversations')
          .upsert({
            id: conversationId,
            messages: [
              { role: 'user', content: message },
              { role: 'assistant', content: assistantMessage }
            ],
            updated_at: new Date().toISOString()
          });
      } catch (err) {
        console.warn('Failed to save conversation:', err);
      }
    }

    return sendSuccess(res, {
      conversationId,
      response: assistantMessage,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Chat error:', err);
    return sendError(res, 500, 'Failed to process chat message', err.message);
  }
}
