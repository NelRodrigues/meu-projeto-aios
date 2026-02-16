/**
 * POST /api/insights/[id]/dismiss
 * Marca um insight como descartado
 */

import { supabaseAdmin } from '../../lib/supabase.js';
import { sendJSON, sendError, sendSuccess } from '../../lib/handlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { id } = req.query;

    if (!id) {
      return sendError(res, 400, 'Insight ID is required');
    }

    const { error } = await supabaseAdmin
      .from('ai_insights')
      .update({ is_dismissed: true })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return sendSuccess(res);
  } catch (err) {
    console.error('Error dismissing insight:', err);
    return sendError(res, 500, 'Failed to dismiss insight', err.message);
  }
}
