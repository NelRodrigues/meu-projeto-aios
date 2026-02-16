import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { getClients, getProjects, getMetrics, getAIInsights, addClient, subscribeToClients, subscribeToProjects, subscribeToMetrics, subscribeToInsights, supabase } from './supabase-client.js';
import DataSyncOrchestrator from './data-sync.js';
import AdapterFactory from './adapter-factory.js';
import AIInsightsGenerator from './ai-insights-generator.js';
import AIChatService from './ai-chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Data Sync Orchestrator
let dataSync = null;

// AI Services
let insightsGenerator = null;
let chatService = null;

// Clientes SSE conectados
const clients = new Set();
const projectsClients = new Set();
const metricsClients = new Set();
const insightsClients = new Set();

// Função para notificar todos os clientes SSE
function notifyClients(clientSet, data) {
  clientSet.forEach(client => {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Inicializar real-time subscriptions (com fallback gracioso)
function initializeRealTimeSubscriptions() {
  try {
    // Subscribe a clientes
    subscribeToClients((payload) => {
      notifyClients(clients, {
        type: 'clients',
        event: payload.eventType,
        timestamp: new Date().toISOString(),
        data: payload.new || payload.old
      });
    });

    // Subscribe a projectos
    subscribeToProjects((payload) => {
      notifyClients(projectsClients, {
        type: 'projects',
        event: payload.eventType,
        timestamp: new Date().toISOString(),
        data: payload.new || payload.old
      });
    });

    // Subscribe a métricas
    subscribeToMetrics((payload) => {
      notifyClients(metricsClients, {
        type: 'metrics',
        event: payload.eventType,
        timestamp: new Date().toISOString(),
        data: payload.new || payload.old
      });
    });

    // Subscribe a insights
    subscribeToInsights((payload) => {
      notifyClients(insightsClients, {
        type: 'insights',
        event: payload.eventType,
        timestamp: new Date().toISOString(),
        data: payload.new || payload.old
      });
    });

    console.log('✅ Real-time subscriptions inicializadas');
  } catch (error) {
    console.warn('⚠️  Erro ao inicializar real-time subscriptions:', error.message);
    console.log('   Continuando sem real-time (polling vai funcionar)');
  }
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Dashboard
  if (req.url === '/' || req.url === '/dashboard.html') {
    const filePath = path.join(__dirname, 'dashboard.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // API Health Check
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: '✅ Servidor a correr com Supabase',
      database: 'Supabase PostgreSQL'
    }));
    return;
  }

  // API Metrics (com dados reais do Supabase)
  if (req.url === '/api/metrics/latest') {
    try {
      const metrics = await getMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics));
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar métricas' }));
    }
    return;
  }

  // API Clients (com dados reais do Supabase)
  if (req.url === '/api/clients') {
    try {
      const clients = await getClients();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: clients }));
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar clientes' }));
    }
    return;
  }

  // API Projects (com dados reais do Supabase)
  if (req.url === '/api/projects') {
    try {
      const projects = await getProjects();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: projects }));
    } catch (error) {
      console.error('Erro ao buscar projectos:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar projectos' }));
    }
    return;
  }

  // API Insights (com dados reais do Supabase)
  if (req.url === '/api/insights') {
    try {
      const insights = await getAIInsights();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: insights }));
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar insights' }));
    }
    return;
  }

  // API Add Client (POST)
  if (req.url === '/api/clients' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const clientData = JSON.parse(body);
        const result = await addClient(clientData);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao adicionar cliente' }));
      }
    });
    return;
  }

  // Real-time SSE Endpoints
  // GET /api/stream/clients - Real-time de clientes
  if (req.url === '/api/stream/clients') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientObj = { res };
    clients.add(clientObj);

    // Enviar dados iniciais
    getClients().then(data => {
      res.write(`data: ${JSON.stringify({ type: 'initial', data })}\n\n`);
    });

    // Manter conexão aberta com keep-alive
    const keepAlive = setInterval(() => {
      res.write(':keep-alive\n\n');
    }, 30000);

    req.on('close', () => {
      clients.delete(clientObj);
      clearInterval(keepAlive);
    });

    return;
  }

  // GET /api/stream/projects - Real-time de projectos
  if (req.url === '/api/stream/projects') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientObj = { res };
    projectsClients.add(clientObj);

    // Enviar dados iniciais
    getProjects().then(data => {
      res.write(`data: ${JSON.stringify({ type: 'initial', data })}\n\n`);
    });

    const keepAlive = setInterval(() => {
      res.write(':keep-alive\n\n');
    }, 30000);

    req.on('close', () => {
      projectsClients.delete(clientObj);
      clearInterval(keepAlive);
    });

    return;
  }

  // GET /api/stream/metrics - Real-time de métricas
  if (req.url === '/api/stream/metrics') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientObj = { res };
    metricsClients.add(clientObj);

    // Enviar dados iniciais
    getMetrics().then(data => {
      res.write(`data: ${JSON.stringify({ type: 'initial', data })}\n\n`);
    });

    const keepAlive = setInterval(() => {
      res.write(':keep-alive\n\n');
    }, 30000);

    req.on('close', () => {
      metricsClients.delete(clientObj);
      clearInterval(keepAlive);
    });

    return;
  }

  // GET /api/stream/insights - Real-time de insights
  if (req.url === '/api/stream/insights') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientObj = { res };
    insightsClients.add(clientObj);

    // Enviar dados iniciais
    getAIInsights().then(data => {
      res.write(`data: ${JSON.stringify({ type: 'initial', data })}\n\n`);
    });

    const keepAlive = setInterval(() => {
      res.write(':keep-alive\n\n');
    }, 30000);

    req.on('close', () => {
      insightsClients.delete(clientObj);
      clearInterval(keepAlive);
    });

    return;
  }

  // Data Sync Endpoints

  // GET /api/sync/status - Status dos adaptadores e jobs
  if (req.url === '/api/sync/status' && req.method === 'GET') {
    try {
      const status = dataSync ? dataSync.getStatus() : { error: 'Sync not initialized' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    } catch (error) {
      console.error('Erro ao buscar status de sync:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar status' }));
    }
    return;
  }

  // POST /api/sync/:source - Trigger sync manual de um adaptador
  if (req.url.startsWith('/api/sync/') && req.method === 'POST') {
    const source = req.url.replace('/api/sync/', '');
    if (source && source !== 'status' && source !== 'history') {
      try {
        if (!dataSync) {
          throw new Error('Sync not initialized');
        }

        // Determinar tabela baseada no nome do adaptador
        let tableName = 'clients';
        if (source.includes('sheets') || source.includes('revenue')) {
          tableName = 'revenues';
        }

        const result = await dataSync.syncAdapter(source, tableName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error(`Erro ao sincronizar ${source}:`, error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    }
    return;
  }

  // GET /api/sync/history - Histórico de syncs
  if (req.url === '/api/sync/history' && req.method === 'GET') {
    try {
      const history = dataSync ? dataSync.getSyncHistory() : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: history }));
    } catch (error) {
      console.error('Erro ao buscar histórico de sync:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar histórico' }));
    }
    return;
  }

  // AI Insights Endpoints

  // POST /api/insights/generate - Gerar insights de IA
  if (req.url === '/api/insights/generate' && req.method === 'POST') {
    try {
      if (!insightsGenerator) {
        throw new Error('Insights generator not initialized');
      }

      (async () => {
        const metrics = await getMetrics();
        const result = await insightsGenerator.generateAndSaveInsights(metrics, supabase);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      })();
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // POST /api/chat - Chat com IA
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        if (!chatService) {
          throw new Error('Chat service not initialized');
        }

        const { conversationId, message } = JSON.parse(body);
        if (!conversationId || !message) {
          throw new Error('conversationId e message são obrigatórios');
        }

        const metrics = await getMetrics();
        const response = await chatService.sendMessage(conversationId, message, metrics, supabase);

        // Salvar conversa
        await chatService.saveConversation(conversationId, supabase);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Erro ao processar chat:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message,
          message: 'Erro ao processar mensagem'
        }));
      }
    });
    return;
  }

  // GET /api/chat/:conversationId - Histórico de chat
  if (req.url.startsWith('/api/chat/') && req.method === 'GET') {
    try {
      if (!chatService) {
        throw new Error('Chat service not initialized');
      }

      const conversationId = req.url.replace('/api/chat/', '');
      const history = chatService.getConversationHistory(conversationId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: history }));
    } catch (error) {
      console.error('Erro ao buscar histórico de chat:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // GET /api/ai/status - Status dos serviços de IA
  if (req.url === '/api/ai/status' && req.method === 'GET') {
    try {
      const status = {
        insightsGenerator: insightsGenerator ? insightsGenerator.getStatus() : null,
        chatService: chatService ? chatService.getStatus() : null,
        apiKey: !!process.env.ANTHROPIC_API_KEY
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    } catch (error) {
      console.error('Erro ao buscar status de IA:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 - Página não encontrada');
});

server.listen(PORT, async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  ✅ CONTROL TOWER PRONTO                    ║');
  console.log('║                                              ║');
  console.log(`║  🌐 http://localhost:${PORT}                      ║`);
  console.log('║  📊 Database: Supabase PostgreSQL            ║');
  console.log('║  ⚡ Real-time Subscriptions Activas         ║');
  console.log('║  📡 Data Adapters (Phase 2)                 ║');
  console.log('║                                              ║');
  console.log('║  REST Endpoints:                            ║');
  console.log('║  • GET /api/metrics/latest                  ║');
  console.log('║  • GET /api/clients                         ║');
  console.log('║  • GET /api/projects                        ║');
  console.log('║  • GET /api/insights                        ║');
  console.log('║  • POST /api/clients (add)                  ║');
  console.log('║                                              ║');
  console.log('║  Real-time SSE Streams:                     ║');
  console.log('║  • GET /api/stream/clients                  ║');
  console.log('║  • GET /api/stream/projects                 ║');
  console.log('║  • GET /api/stream/metrics                  ║');
  console.log('║  • GET /api/stream/insights                 ║');
  console.log('║                                              ║');
  console.log('║  Data Sync Endpoints:                       ║');
  console.log('║  • GET /api/sync/status                     ║');
  console.log('║  • POST /api/sync/:source (trigger)         ║');
  console.log('║  • GET /api/sync/history                    ║');
  console.log('║                                              ║');
  console.log('║  Pressione CTRL+C para parar               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Inicializar real-time subscriptions
  initializeRealTimeSubscriptions();

  // Inicializar Data Sync Orchestrator
  console.log('🔧 Inicializando Data Sync Orchestrator...');
  try {
    dataSync = new DataSyncOrchestrator(supabase);

    // Registar adaptadores disponíveis (se configurados)
    const hasZohoCRM = process.env.ZOHO_ACCESS_TOKEN || process.env.ZOHO_REFRESH_TOKEN;
    const hasGoogleSheets = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_API_KEY;

    if (hasZohoCRM) {
      dataSync.addAdapter('zoho-crm', 'zoho-crm', {
        accessToken: process.env.ZOHO_ACCESS_TOKEN,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN,
        clientId: process.env.ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET,
        organizationId: process.env.ZOHO_ORG_ID
      });

      // Agendar sync a cada 4 horas
      dataSync.scheduleSyncJob('zoho-crm', 'clients', '0 */4 * * *', 'zoho-crm-4h');
      console.log('✅ Zoho CRM sync agendado (4h/4h)');
    } else {
      console.log('⚠️  Zoho CRM não configurado (faltam environment variables)');
    }

    if (hasGoogleSheets) {
      dataSync.addAdapter('google-sheets', 'google-sheets', {
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        sheetName: process.env.GOOGLE_SHEETS_NAME || 'Receitas',
        apiKey: process.env.GOOGLE_SHEETS_API_KEY
      });

      // Agendar sync a cada 6 horas
      dataSync.scheduleSyncJob('google-sheets', 'revenues', '0 */6 * * *', 'sheets-6h');
      console.log('✅ Google Sheets sync agendado (6h/6h)');
    } else {
      console.log('⚠️  Google Sheets não configurado (faltam environment variables)');
    }

    console.log('✅ Data Sync Orchestrator inicializado');
    console.log(`   ${dataSync.adapters.size} adaptador(es) registado(s)`);
    console.log(`   ${dataSync.jobs.size} cron job(s) agendado(s)`);
  } catch (error) {
    console.warn('⚠️  Erro ao inicializar Data Sync:', error.message);
    console.log('   Sistema continuará sem sincronização automática');
  }

  // Inicializar AI Services (Phase 3)
  console.log('\n🧠 Inicializando AI Services (Phase 3)...');
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY não configurada. AI Services desactivados.');
    } else {
      // Inicializar Insights Generator
      insightsGenerator = new AIInsightsGenerator({
        model: 'claude-instant-1.3'
      });
      console.log('✅ AI Insights Generator inicializado');

      // Inicializar Chat Service
      chatService = new AIChatService({
        model: 'claude-instant-1.3'
      });
      console.log('✅ AI Chat Service inicializado');

      // Agendar cron job para insights diários às 08:00
      try {
        const insightsJob = cron.schedule('0 8 * * *', async () => {
          console.log('\n🧠 [CRON] Gerando insights diários...');
          try {
            const metrics = await getMetrics();
            const result = await insightsGenerator.generateAndSaveInsights(metrics, supabase);
            console.log(`✅ Insights gerados: ${result.insightsSaved} salvos`);

            // Notificar clientes SSE de novos insights
            insightsClients.forEach(client => {
              client.res.write(`data: ${JSON.stringify({
                type: 'insights',
                event: 'INSERT',
                timestamp: new Date().toISOString(),
                data: result.insights
              })}\n\n`);
            });
          } catch (error) {
            console.error('❌ Erro ao gerar insights agendados:', error.message);
          }
        });

        // Teste imediato se houver variável de ambiente DEBUG
        if (process.env.DEBUG_INSIGHTS === 'true') {
          console.log('🧪 [DEBUG] Executando geração de insights para teste...');
          try {
            const metrics = await getMetrics();
            await insightsGenerator.generateAndSaveInsights(metrics, supabase);
          } catch (error) {
            console.warn('⚠️  Erro no teste de insights:', error.message);
          }
        }

        console.log('✅ Cron job de insights agendado (diariamente às 08:00)');
      } catch (error) {
        console.warn('⚠️  Erro ao agendar cron job de insights:', error.message);
      }

      // Limpeza automática de conversas antigas (a cada 6 horas)
      setInterval(() => {
        chatService.cleanupOldConversations(24);
      }, 6 * 60 * 60 * 1000);

      console.log('✅ Limpeza automática de conversas agendada');
    }
  } catch (error) {
    console.warn('⚠️  Erro ao inicializar AI Services:', error.message);
    console.log('   Sistema continuará sem IA (endpoints desactivados)');
  }

  // Atualizar banner final
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🚀 SISTEMA COMPLETO - PRONTO PARA OPERAÇÃO       ║');
  console.log('║                                                    ║');
  console.log('║  ✅ Real-time Subscriptions        (Phase 1)      ║');
  console.log('║  ✅ Data Adapters (Zoho, Sheets)  (Phase 2)      ║');
  console.log('║  ✅ AI Insights & Chat             (Phase 3)      ║');
  console.log('║                                                    ║');
  console.log('║  📊 Dashboard: http://localhost:3000             ║');
  console.log('║  🔗 Docs: http://localhost:3000/docs (coming)    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
});
