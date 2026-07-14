import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'

// ============================================================
// POST /api/rfv/refresh — refresca as materialized views RFV/receita (story 2.7)
// ------------------------------------------------------------
// Só-admin (defesa em profundidade sobre o GRANT service_role de `refresh_rfv`).
// Corre `refresh_rfv('manual')` com a service key (a função é SECURITY DEFINER e
// só concede EXECUTE a service_role). Devolve a data do refresh (a UI mostra-a).
//
// As views NUNCA são calculadas por pedido de leitura — este é o único caminho
// de invocação manual; o cron diário `refresh-rfv` (E4, migração futura) chama a
// mesma `refresh_rfv('cron')`.
// ============================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, { requireAdmin: true })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('refresh_rfv', { p_origem: 'manual' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ refreshed_at: data })
}
