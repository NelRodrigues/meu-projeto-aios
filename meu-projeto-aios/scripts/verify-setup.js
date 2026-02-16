#!/usr/bin/env node

/**
 * Script para verificar se o setup da base de dados foi executado com sucesso
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifySetup() {
  console.log('🔍 Verificando setup da base de dados...\n');

  const tables = [
    'clients',
    'projects',
    'revenues',
    'metrics_snapshots',
    'ai_insights',
    'ai_conversations',
    'data_sync_logs'
  ];

  let successCount = 0;
  let failCount = 0;

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table.padEnd(25)} - ${error.message}`);
        failCount++;
      } else {
        console.log(`✅ ${table.padEnd(25)} - ${count || 0} registos`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(25)} - Erro: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Resultados:`);
  console.log(`   Tabelas OK: ${successCount}/${tables.length}`);
  console.log(`   Erros: ${failCount}/${tables.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (successCount === tables.length) {
    console.log('✅ Setup completado com sucesso! 🎉');

    // Tentar buscar dados de exemplo
    console.log('\n📋 Dados de Exemplo:\n');

    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .limit(5);

      if (clients && clients.length > 0) {
        console.log('📌 Clientes:');
        for (const client of clients) {
          console.log(`   • ${client.name} (${client.tier}) - $${client.monthly_value}/mês`);
        }
      }

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .limit(5);

      if (projects && projects.length > 0) {
        console.log('\n📌 Projetos:');
        for (const project of projects) {
          console.log(`   • ${project.name} (${project.status}) - ${project.progress_percentage}% completo`);
        }
      }

      const { data: metrics } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1);

      if (metrics && metrics.length > 0) {
        const m = metrics[0];
        console.log('\n📊 Métricas Actuais:');
        console.log(`   • Clientes Activos: ${m.active_clients}`);
        console.log(`   • Projetos em Andamento: ${m.projects_in_progress}`);
        console.log(`   • Receita Mensal: $${m.monthly_revenue}`);
        console.log(`   • Receita Anual: $${m.annual_revenue}`);
        console.log(`   • Satisfação Média: ${m.avg_satisfaction_score}/10`);
      }
    } catch (err) {
      console.log(`⚠️  Não foi possível buscar dados: ${err.message}`);
    }
  } else {
    console.log('⚠️  Algumas tabelas não foram criadas. Execute o SQL no Supabase SQL Editor.');
    process.exit(1);
  }
}

verifySetup();
