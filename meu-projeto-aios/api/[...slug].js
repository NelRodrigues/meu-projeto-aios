/**
 * Catch-all API route para Vercel
 * Trata todas as rotas que começam com /api/
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import healthHandler from './health.js';
import metricsLatestHandler from './metrics/latest.js';
import insightsIndexHandler from './insights/index.js';
import insightsGenerateHandler from './insights/generate.js';
import chatHandler from './chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

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
app.get('/api/health', healthHandler);
app.get('/api/metrics/latest', metricsLatestHandler);
app.get('/api/insights', insightsIndexHandler);
app.post('/api/insights/generate', insightsGenerateHandler);
app.post('/api/chat', chatHandler);

// Rota catch-all para frontend (retornar HTML)
app.get('*', (req, res) => {
  const indexPath = join(__dirname, '..', 'frontend', 'dist', 'index.html');

  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } else {
    res.status(404).send('Frontend not found');
  }
});

// Exportar como serverless function
export default app;
