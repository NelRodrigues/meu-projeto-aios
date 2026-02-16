/**
 * GET /api/insights
 * Retorna insights de IA não descartados
 */

import { supabase } from '../lib/supabase.js';
import { sendJSON, sendError, sendSuccess } from '../lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return sendSuccess(res, {
      count: data?.length || 0,
      insights: data || []
    });
  } catch (err) {
    console.error('Error fetching insights:', err);
    return sendError(res, 500, 'Failed to fetch insights', err.message);
  }
}
