import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClients, getProjects, getMetrics, getAIInsights, addClient, subscribeToClients, subscribeToProjects, subscribeToMetrics, subscribeToInsights } from './supabase-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

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

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 - Página não encontrada');
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  ✅ CONTROL TOWER PRONTO              ║');
  console.log('║                                        ║');
  console.log(`║  🌐 http://localhost:${PORT}              ║`);
  console.log('║  📊 Database: Supabase PostgreSQL      ║');
  console.log('║  ⚡ Real-time Subscriptions Activas   ║');
  console.log('║                                        ║');
  console.log('║  REST Endpoints:                       ║');
  console.log('║  • GET /api/metrics/latest             ║');
  console.log('║  • GET /api/clients                    ║');
  console.log('║  • GET /api/projects                   ║');
  console.log('║  • GET /api/insights                   ║');
  console.log('║  • POST /api/clients (add)             ║');
  console.log('║                                        ║');
  console.log('║  Real-time SSE Streams:                ║');
  console.log('║  • GET /api/stream/clients             ║');
  console.log('║  • GET /api/stream/projects            ║');
  console.log('║  • GET /api/stream/metrics             ║');
  console.log('║  • GET /api/stream/insights            ║');
  console.log('║                                        ║');
  console.log('║  Pressione CTRL+C para parar          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // Inicializar real-time subscriptions
  initializeRealTimeSubscriptions();
});
