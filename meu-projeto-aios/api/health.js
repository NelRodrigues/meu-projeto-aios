/**
 * Health Check Endpoint
 */

import { supabase } from './lib/supabase.js';
import { sendJSON, sendError } from './lib/handlers.js';

export default async function handler(req, res) {
  try {
    let dbStatus = 'not-configured';

    // Testar conexão com Supabase se disponível
    if (supabase) {
      try {
        const { error } = await supabase
          .from('metrics_snapshots')
          .select('id')
          .limit(1);

        dbStatus = error ? 'disconnected' : 'connected';
      } catch (err) {
        dbStatus = 'error';
      }
    }

    return sendJSON(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      database: dbStatus,
      version: '1.0.0'
    });
  } catch (err) {
    return sendError(res, 500, 'Health check failed', err.message);
  }
}
