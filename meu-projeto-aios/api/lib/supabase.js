/**
 * Supabase Client Initialization
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Cliente anónimo (para operações públicas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role (para operações administrativas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
