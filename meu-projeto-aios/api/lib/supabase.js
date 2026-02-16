/**
 * Supabase Client Initialization
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase = null;
let supabaseAdmin = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    // Cliente anónimo (para operações públicas)
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Cliente com service role (para operações administrativas)
    if (supabaseServiceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    } else {
      supabaseAdmin = supabase;
    }
  } else {
    console.warn('⚠️  Supabase environment variables not configured. API features will not work.');
  }
} catch (err) {
  console.error('Failed to initialize Supabase:', err.message);
}

export { supabase, supabaseAdmin };
