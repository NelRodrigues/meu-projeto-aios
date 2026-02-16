import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/api/metrics/latest', async (req, res) => {
  try {
    res.json({
      active_clients: 3,
      monthly_revenue: 8000,
      projects_in_progress: 1,
      avg_satisfaction_score: 8
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Frontend fallback
app.get('*', (req, res) => {
  // Servir index.html do frontend
  const indexPath = join(__dirname, '..', 'frontend', 'dist', 'index.html');
  res.sendFile(indexPath);
});

export default app;
