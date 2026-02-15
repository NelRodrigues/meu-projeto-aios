import Fastify from 'fastify';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Fastify
const fastify = Fastify({
  logger: true,
});

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

// Health Check Endpoint
fastify.get('/health', async (request, reply) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabase: supabaseUrl ? 'connected' : 'not configured',
  };

  return reply.send(status);
});

// Endpoint: Obter últimas métricas
fastify.get('/api/metrics/latest', async (request, reply) => {
  try {
    if (!supabase) {
      return reply.status(503).send({ error: 'Supabase não configurado' });
    }

    const { data, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    if (!data) {
      // Retornar métricas padrão se não existirem dados
      return reply.send({
        snapshot_date: new Date().toISOString().split('T')[0],
        active_clients: 0,
        projects_in_progress: 0,
        monthly_revenue: 0,
        annual_revenue: 0,
        avg_satisfaction_score: 0,
      });
    }

    return reply.send(data);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

// Endpoint: Histórico de métricas
fastify.get('/api/metrics/history', async (request, reply) => {
  try {
    const days = parseInt(request.query.days) || 30;

    if (!supabase) {
      return reply.status(503).send({ error: 'Supabase não configurado' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(data || []);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

// Endpoint: Insights de IA
fastify.get('/api/insights', async (request, reply) => {
  try {
    if (!supabase) {
      return reply.status(503).send({ error: 'Supabase não configurado' });
    }

    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send(data || []);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

// Endpoint: Descartar insight
fastify.post('/api/insights/:id/dismiss', async (request, reply) => {
  try {
    const { id } = request.params;

    if (!supabase) {
      return reply.status(503).send({ error: 'Supabase não configurado' });
    }

    const { data, error } = await supabase
      .from('ai_insights')
      .update({ is_dismissed: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send({ success: true, data });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

// Endpoint: Chat com IA (placeholder)
fastify.post('/api/chat', async (request, reply) => {
  try {
    const { conversationId, message } = request.body;

    if (!message) {
      return reply.status(400).send({ error: 'Mensagem é obrigatória' });
    }

    // TODO: Implementar integração com Claude API
    const response = {
      conversationId,
      message: 'Resposta de IA - implementação em curso',
      timestamp: new Date().toISOString(),
    };

    return reply.send(response);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

// Endpoint: Trigger manual de sync
fastify.post('/api/sync/:source', async (request, reply) => {
  try {
    const { source } = request.params;

    // TODO: Implementar lógica de sync com adaptadores
    return reply.send({
      message: `Sync iniciado para ${source}`,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

// Função: Agregar métricas diárias
async function aggregateDailyMetrics() {
  try {
    if (!supabaseAdmin) {
      fastify.log.warn('Supabase admin não configurado para agregação de métricas');
      return;
    }

    fastify.log.info('Iniciando agregação de métricas diárias...');

    const today = new Date().toISOString().split('T')[0];

    // Contar clientes activos
    const { data: clientsData } = await supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    // Contar projetos em andamento
    const { data: projectsData } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('status', 'in_progress');

    // Calcular receita mensal (este mês)
    const monthStart = new Date();
    monthStart.setDate(1);
    const { data: monthlyRevenue } = await supabaseAdmin
      .from('revenues')
      .select('amount')
      .gte('invoice_date', monthStart.toISOString().split('T')[0]);

    const monthlyTotal = (monthlyRevenue || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Calcular receita anual (últimos 12 meses)
    const yearStart = new Date();
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    const { data: yearlyRevenue } = await supabaseAdmin
      .from('revenues')
      .select('amount')
      .gte('invoice_date', yearStart.toISOString().split('T')[0]);

    const yearlyTotal = (yearlyRevenue || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Calcular satisfação média
    const { data: satisfactionData } = await supabaseAdmin
      .from('clients')
      .select('satisfaction_score')
      .not('satisfaction_score', 'is', null);

    const avgSatisfaction = satisfactionData && satisfactionData.length > 0
      ? (satisfactionData.reduce((sum, c) => sum + (c.satisfaction_score || 0), 0) / satisfactionData.length).toFixed(2)
      : 0;

    // Inserir snapshot
    const { error } = await supabaseAdmin
      .from('metrics_snapshots')
      .upsert(
        {
          snapshot_date: today,
          active_clients: clientsData?.length || 0,
          projects_in_progress: projectsData?.length || 0,
          monthly_revenue: monthlyTotal,
          annual_revenue: yearlyTotal,
          avg_satisfaction_score: parseFloat(avgSatisfaction),
        },
        { onConflict: 'snapshot_date' }
      );

    if (error) {
      fastify.log.error('Erro ao inserir snapshot de métricas:', error);
    } else {
      fastify.log.info(`✅ Snapshot de métricas inserido para ${today}`);
    }
  } catch (error) {
    fastify.log.error('Erro na agregação de métricas:', error);
  }
}

// Cron job: Agregar métricas diariamente às 23:59
cron.schedule('59 23 * * *', aggregateDailyMetrics);

// Opcional: Agregar imediatamente ao iniciar (comentado para testes)
// aggregateDailyMetrics();

// Iniciar servidor
const start = async () => {
  try {
    const port = parseInt(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Servidor iniciado em porta ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
