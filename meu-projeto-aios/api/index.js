/**
 * Servidor Node.js que serves frontend estático + APIs
 * Este ficheiro é o entrypoint para o Vercel
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './lib/supabase.js';
import { sendJSON, sendSuccess, sendError } from './lib/handlers.js';
import healthHandler from './health.js';
import metricsLatestHandler from './metrics/latest.js';
import insightsIndexHandler from './insights/index.js';
import insightsGenerateHandler from './insights/generate.js';
import chatHandler from './chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// API Routes
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/metrics/latest', metricsLatestHandler);
app.get('/api/insights', insightsIndexHandler);
app.post('/api/insights/generate', insightsGenerateHandler);
app.post('/api/chat', chatHandler);

// Serve frontend estático
const frontendPath = join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback - redirecionar todas as rotas não-API para index.html
app.get('*', (req, res) => {
  res.sendFile(join(frontendPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
