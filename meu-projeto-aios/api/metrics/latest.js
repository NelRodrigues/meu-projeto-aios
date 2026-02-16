/**
 * GET /api/metrics/latest
 * Retorna o snapshot de métricas mais recente
 */

import { supabase } from '../lib/supabase.js';
import { sendJSON, sendError, sendSuccess } from '../lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { data, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Se não houver dados, retornar valores padrão
    if (!data) {
      return sendSuccess(res, {
        snapshot_date: new Date().toISOString().split('T')[0],
        active_clients: 0,
        projects_in_progress: 0,
        monthly_revenue: 0,
        annual_revenue: 0,
        avg_satisfaction_score: 0
      });
    }

    return sendSuccess(res, data);
  } catch (err) {
    console.error('Error fetching latest metrics:', err);
    return sendError(res, 500, 'Failed to fetch metrics', err.message);
  }
}
