import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis Supabase não configuradas. Verifique .env');
  process.exit(1);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase client com service role key para operações administrativas (sync de dados)
export const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : supabase; // Fallback para anon key se service key não estiver configurada

// Log de inicialização
if (SUPABASE_SERVICE_KEY) {
  console.log('✅ Supabase Admin Client inicializado (service key disponível)');
} else {
  console.warn('⚠️  Supabase Service Key não configurada. Usando anon key para sync (pode ter problemas de RLS)');
}

// Dados de fallback locais
const fallbackClients = [
  {
    name: 'Acme Corporation',
    email: 'contato@acme.ao',
    tier: 'Platinum',
    revenue: 5000,
    status: 'active',
    satisfaction: 9
  },
  {
    name: 'Startup XYZ',
    email: 'hello@startup.io',
    tier: 'Gold',
    revenue: 2000,
    status: 'active',
    satisfaction: 8
  },
  {
    name: 'Local Business',
    email: 'info@local.ao',
    tier: 'Silver',
    revenue: 1000,
    status: 'active',
    satisfaction: 7
  }
];

const fallbackProjects = [
  {
    name: 'Website Redesign',
    status: 'in_progress',
    progress: 75,
    client: 'Acme Corporation',
    budget: 10000,
    spent: 7500
  },
  {
    name: 'Marketing Campaign Q1',
    status: 'in_progress',
    progress: 65,
    client: 'Startup XYZ',
    budget: 5000,
    spent: 3250
  },
  {
    name: 'Mobile App Development',
    status: 'completed',
    progress: 100,
    client: 'Acme Corporation',
    budget: 15000,
    spent: 15000
  }
];

// Funções helper para buscar dados
export async function getClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
      .order('monthly_value', { ascending: false });

    if (error) {
      console.warn('⚠️  Erro ao buscar do Supabase, usando dados locais:', error.message);
      return fallbackClients;
    }

    if (data && data.length > 0) {
      return data.map(client => ({
        name: client.name,
        email: client.email,
        tier: client.tier.charAt(0).toUpperCase() + client.tier.slice(1),
        revenue: client.monthly_value || 0,
        status: client.status,
        satisfaction: client.satisfaction_score
      }));
    }

    return fallbackClients;
  } catch (error) {
    console.warn('⚠️  Erro na conexão Supabase, usando dados locais');
    return fallbackClients;
  }
}

export async function getProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️  Erro ao buscar projectos, usando dados locais:', error.message);
      return fallbackProjects;
    }

    if (data && data.length > 0) {
      return data.map(project => ({
        name: project.name,
        status: project.status,
        progress: project.progress_percentage || 0,
        client: project.clients?.name || 'N/A',
        budget: project.budget || 0,
        spent: project.spent || 0
      }));
    }

    return fallbackProjects;
  } catch (error) {
    console.warn('⚠️  Erro na conexão Supabase para projectos, usando dados locais');
    return fallbackProjects;
  }
}

export async function getMetrics() {
  try {
    const { data, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .eq('snapshot_date', new Date().toISOString().split('T')[0])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('⚠️  Erro ao buscar métricas, calculando localmente');
    }

    if (data) {
      return {
        active_clients: data.active_clients,
        monthly_revenue: data.monthly_revenue,
        projects_in_progress: data.projects_in_progress,
        avg_satisfaction_score: data.avg_satisfaction_score
      };
    }

    // Fallback para dados calculados localmente
    return {
      active_clients: fallbackClients.length,
      monthly_revenue: fallbackClients.reduce((sum, c) => sum + c.revenue, 0),
      projects_in_progress: fallbackProjects.filter(p => p.status === 'in_progress').length,
      avg_satisfaction_score: parseFloat(
        (fallbackClients.reduce((sum, c) => sum + c.satisfaction, 0) / fallbackClients.length).toFixed(1)
      )
    };
  } catch (error) {
    console.warn('⚠️  Erro ao buscar métricas, usando dados locais');
    return {
      active_clients: fallbackClients.length,
      monthly_revenue: fallbackClients.reduce((sum, c) => sum + c.revenue, 0),
      projects_in_progress: fallbackProjects.filter(p => p.status === 'in_progress').length,
      avg_satisfaction_score: 8.0
    };
  }
}

const fallbackInsights = [
  {
    type: 'alert',
    severity: 'high',
    title: '⚠️ Receita em Alta',
    description: 'Crescimento de 15% detectado este mês em relação ao período anterior!',
    icon: '📈'
  },
  {
    type: 'recommendation',
    severity: 'medium',
    title: '💡 Oportunidade de Crescimento',
    description: 'Considere iniciar novo projecto com cliente Acme para maximizar receita.',
    icon: '🎯'
  },
  {
    type: 'trend',
    severity: 'low',
    title: '📊 Satisfação Excelente',
    description: 'Taxa de satisfação dos clientes mantém-se em 8/10. Ótimo desempenho!',
    icon: '✅'
  },
  {
    type: 'prediction',
    severity: 'medium',
    title: '🔮 Previsão Q2',
    description: 'Com base no crescimento, projectamos 25% de aumento de receita no próximo trimestre.',
    icon: '🚀'
  }
];

export async function getAIInsights() {
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.warn('⚠️  Erro ao buscar insights, usando dados locais:', error.message);
      return fallbackInsights;
    }

    if (data && data.length > 0) {
      return data.map(insight => ({
        type: insight.type,
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        icon: getInsightIcon(insight.type, insight.severity)
      }));
    }

    return fallbackInsights;
  } catch (error) {
    console.warn('⚠️  Erro ao buscar insights, usando dados locais');
    return fallbackInsights;
  }
}

function getInsightIcon(type, severity) {
  const icons = {
    alert: '⚠️',
    trend: '📊',
    recommendation: '💡',
    prediction: '🔮'
  };
  return icons[type] || '📌';
}

export async function addClient(clientData) {
  const { data, error } = await supabase
    .from('clients')
    .insert([
      {
        name: clientData.name,
        email: clientData.email,
        tier: clientData.tier.toLowerCase(),
        status: 'active',
        monthly_value: clientData.revenue || 0,
        satisfaction_score: 8
      }
    ])
    .select();

  if (error) {
    console.error('Erro ao adicionar cliente:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data[0] };
}

export async function dismissInsight(insightId) {
  const { error } = await supabase
    .from('ai_insights')
    .update({ is_dismissed: true })
    .eq('id', insightId);

  if (error) {
    console.error('Erro ao descartar insight:', error);
    return { success: false };
  }

  return { success: true };
}

// Real-time Subscriptions
export function subscribeToClients(callback) {
  console.log('🔔 Subscrevendo a mudanças de clientes...');

  const subscription = supabase
    .from('clients')
    .on('*', (payload) => {
      console.log('📡 Mudança de clientes detectada:', payload.eventType);
      callback(payload);
    })
    .subscribe();

  return subscription;
}

export function subscribeToProjects(callback) {
  console.log('🔔 Subscrevendo a mudanças de projectos...');

  const subscription = supabase
    .from('projects')
    .on('*', (payload) => {
      console.log('📡 Mudança de projectos detectada:', payload.eventType);
      callback(payload);
    })
    .subscribe();

  return subscription;
}

export function subscribeToMetrics(callback) {
  console.log('🔔 Subscrevendo a mudanças de métricas...');

  const subscription = supabase
    .from('metrics_snapshots')
    .on('*', (payload) => {
      console.log('📡 Mudança de métricas detectada:', payload.eventType);
      callback(payload);
    })
    .subscribe();

  return subscription;
}

export function subscribeToInsights(callback) {
  console.log('🔔 Subscrevendo a mudanças de insights...');

  const subscription = supabase
    .from('ai_insights')
    .on('*', (payload) => {
      console.log('📡 Mudança de insights detectada:', payload.eventType);
      callback(payload);
    })
    .subscribe();

  return subscription;
}

export function subscribeToTasks(callback) {
  console.log('🔔 Subscrevendo a mudanças de tarefas...');

  const subscription = supabase
    .from('tasks')
    .on('*', (payload) => {
      console.log('📡 Mudança de tarefas detectada:', payload.eventType);
      callback(payload);
    })
    .subscribe();

  return subscription;
}

// Remover subscription
export function unsubscribe(subscription) {
  if (subscription) {
    supabase.removeSubscription(subscription);
  }
}

console.log('✅ Cliente Supabase inicializado com Real-time Subscriptions');
