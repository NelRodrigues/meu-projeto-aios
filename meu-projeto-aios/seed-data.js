import { supabase } from './supabase-client.js';

async function seedData() {
  console.log('🌱 A inserir dados de teste no Supabase...\n');

  try {
    // Limpar dados antigos (opcional)
    // await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 1. Inserir Clientes
    console.log('📝 Inserindo clientes...');
    const clientsData = [
      {
        name: 'Acme Corporation',
        email: 'contato@acme.ao',
        phone: '+244 923 456 789',
        tier: 'platinum',
        status: 'active',
        monthly_value: 5000,
        satisfaction_score: 9
      },
      {
        name: 'Startup XYZ',
        email: 'hello@startup.io',
        phone: '+244 912 345 678',
        tier: 'gold',
        status: 'active',
        monthly_value: 2000,
        satisfaction_score: 8
      },
      {
        name: 'Local Business',
        email: 'info@local.ao',
        phone: '+244 934 567 890',
        tier: 'silver',
        status: 'active',
        monthly_value: 1000,
        satisfaction_score: 7
      }
    ];

    const { data: insertedClients, error: clientsError } = await supabase
      .from('clients')
      .insert(clientsData)
      .select();

    if (clientsError) {
      console.error('❌ Erro ao inserir clientes:', clientsError.message);
    } else {
      console.log(`✅ ${insertedClients.length} clientes inseridos\n`);

      // 2. Inserir Projectos
      console.log('📝 Inserindo projectos...');
      const acmeId = insertedClients.find(c => c.name === 'Acme Corporation')?.id;
      const startupId = insertedClients.find(c => c.name === 'Startup XYZ')?.id;

      if (acmeId && startupId) {
        const projectsData = [
          {
            client_id: acmeId,
            name: 'Website Redesign',
            status: 'in_progress',
            progress_percentage: 75,
            budget: 10000,
            spent: 7500
          },
          {
            client_id: startupId,
            name: 'Marketing Campaign Q1',
            status: 'in_progress',
            progress_percentage: 65,
            budget: 5000,
            spent: 3250
          },
          {
            client_id: acmeId,
            name: 'Mobile App Development',
            status: 'completed',
            progress_percentage: 100,
            budget: 15000,
            spent: 15000
          }
        ];

        const { data: insertedProjects, error: projectsError } = await supabase
          .from('projects')
          .insert(projectsData)
          .select();

        if (projectsError) {
          console.error('❌ Erro ao inserir projectos:', projectsError.message);
        } else {
          console.log(`✅ ${insertedProjects.length} projectos inseridos\n`);
        }
      }

      // 3. Inserir Métricas
      console.log('📝 Inserindo métricas...');
      const metricsData = {
        snapshot_date: new Date().toISOString().split('T')[0],
        active_clients: 3,
        projects_in_progress: 2,
        monthly_revenue: 8000,
        annual_revenue: 96000,
        avg_satisfaction_score: 8.0
      };

      const { data: insertedMetrics, error: metricsError } = await supabase
        .from('metrics_snapshots')
        .insert([metricsData])
        .select();

      if (metricsError && metricsError.code !== '23505') { // Ignore duplicate key error
        console.error('❌ Erro ao inserir métricas:', metricsError.message);
      } else {
        console.log('✅ Métricas inseridas\n');
      }

      // 4. Inserir Insights de IA
      console.log('📝 Inserindo insights de IA...');
      const insightsData = [
        {
          type: 'alert',
          severity: 'high',
          title: '⚠️ Receita em Alta',
          description: 'Crescimento de 15% detectado este mês em relação ao mês anterior!',
          is_dismissed: false
        },
        {
          type: 'recommendation',
          severity: 'medium',
          title: '💡 Oportunidade de Crescimento',
          description: 'Considere iniciar novo projecto com cliente Acme Corporation para maximizar receita.',
          is_dismissed: false
        },
        {
          type: 'trend',
          severity: 'low',
          title: '📊 Satisfação Mantém-se Excelente',
          description: 'Taxa de satisfação dos clientes mantém-se em 8/10. Ótimo desempenho do team.',
          is_dismissed: false
        },
        {
          type: 'prediction',
          severity: 'medium',
          title: '🔮 Previsão para Q2',
          description: 'Com base no crescimento actual, projectamos 25% aumento de receita no próximo trimestre.',
          is_dismissed: false
        }
      ];

      const { data: insertedInsights, error: insightsError } = await supabase
        .from('ai_insights')
        .insert(insightsData)
        .select();

      if (insightsError) {
        console.error('❌ Erro ao inserir insights:', insightsError.message);
      } else {
        console.log(`✅ ${insertedInsights.length} insights de IA inseridos\n`);
      }
    }

    console.log('✅ Dados de teste inseridos com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('  • 3 clientes activos');
    console.log('  • 3 projectos em andamento');
    console.log('  • 4 insights de IA');
    console.log('  • Métricas diárias');
    console.log('\n🚀 Acesse http://localhost:3000 para ver os dados!\n');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

seedData();
