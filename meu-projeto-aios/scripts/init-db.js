#!/usr/bin/env node

/**
 * Script para inicializar a base de dados com dados de exemplo
 * e verificar se as tabelas existem
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function initDatabase() {
  console.log('🚀 Inicializando base de dados...\n');

  try {
    // 1. Inserir clientes de exemplo
    console.log('📝 1. Inserindo clientes de exemplo...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .insert([
        {
          name: 'Acme Corporation',
          email: 'contact@acme.com',
          phone: '+244 923 456 789',
          tier: 'platinum',
          status: 'active',
          monthly_value: 5000.00,
          satisfaction_score: 9
        },
        {
          name: 'Startup XYZ',
          email: 'hello@startup.com',
          phone: '+244 912 345 678',
          tier: 'gold',
          status: 'active',
          monthly_value: 2000.00,
          satisfaction_score: 8
        },
        {
          name: 'Local Business',
          email: 'info@local.ao',
          phone: '+244 934 567 890',
          tier: 'silver',
          status: 'active',
          monthly_value: 1000.00,
          satisfaction_score: 7
        }
      ])
      .select();

    if (clientsError) {
      console.log(`   ℹ️  ${clientsError.message}`);
    } else {
      console.log(`   ✅ ${clients.length} clientes inseridos`);
    }

    // 2. Inserir projetos de exemplo
    console.log('\n📝 2. Inserindo projetos de exemplo...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .insert([
        {
          client_id: clients?.[0]?.id,
          name: 'Website Redesign',
          status: 'in_progress',
          progress_percentage: 75,
          budget: 10000.00,
          spent: 7500.00
        },
        {
          client_id: clients?.[1]?.id,
          name: 'Mobile App Development',
          status: 'planning',
          progress_percentage: 10,
          budget: 20000.00,
          spent: 2000.00
        }
      ])
      .select();

    if (projectsError) {
      console.log(`   ℹ️  ${projectsError.message}`);
    } else {
      console.log(`   ✅ ${projects?.length || 0} projetos inseridos`);
    }

    // 3. Inserir receitas de exemplo
    console.log('\n📝 3. Inserindo receitas de exemplo...');
    const { data: revenues, error: revenuesError } = await supabase
      .from('revenues')
      .insert([
        {
          client_id: clients?.[0]?.id,
          amount: 5000.00,
          type: 'recurring',
          status: 'received',
          invoice_date: new Date().toISOString().split('T')[0],
          paid_date: new Date().toISOString().split('T')[0]
        },
        {
          client_id: clients?.[1]?.id,
          amount: 2000.00,
          type: 'recurring',
          status: 'received',
          invoice_date: new Date().toISOString().split('T')[0],
          paid_date: new Date().toISOString().split('T')[0]
        },
        {
          client_id: clients?.[2]?.id,
          amount: 1000.00,
          type: 'recurring',
          status: 'received',
          invoice_date: new Date().toISOString().split('T')[0],
          paid_date: new Date().toISOString().split('T')[0]
        }
      ])
      .select();

    if (revenuesError) {
      console.log(`   ℹ️  ${revenuesError.message}`);
    } else {
      console.log(`   ✅ ${revenues?.length || 0} receitas inseridas`);
    }

    // 4. Inserir snapshot de métricas
    console.log('\n📝 4. Inserindo snapshot de métricas...');
    const today = new Date().toISOString().split('T')[0];
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics_snapshots')
      .insert([
        {
          snapshot_date: today,
          active_clients: 3,
          projects_in_progress: 1,
          monthly_revenue: 8000.00,
          annual_revenue: 96000.00,
          avg_satisfaction_score: 8.0
        }
      ])
      .select();

    if (metricsError) {
      console.log(`   ℹ️  ${metricsError.message}`);
    } else {
      console.log(`   ✅ Snapshot de métricas inserido`);
    }

    // 5. Verificar dados
    console.log('\n📊 5. Verificando dados inseridos...');
    const { data: verifyClients, count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact' });

    const { data: verifyProjects, count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact' });

    const { data: verifyRevenues, count: revenuesCount } = await supabase
      .from('revenues')
      .select('*', { count: 'exact' });

    const { data: verifyMetrics, count: metricsCount } = await supabase
      .from('metrics_snapshots')
      .select('*', { count: 'exact' });

    console.log(`\n${'='.repeat(50)}`);
    console.log('✅ Base de Dados Inicializada com Sucesso!');
    console.log(`${'='.repeat(50)}`);
    console.log(`📊 Dados Inseridos:`);
    console.log(`   Clientes:        ${clientsCount || 0}`);
    console.log(`   Projetos:        ${projectsCount || 0}`);
    console.log(`   Receitas:        ${revenuesCount || 0}`);
    console.log(`   Métricas:        ${metricsCount || 0}`);
    console.log(`${'='.repeat(50)}\n`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

initDatabase();
