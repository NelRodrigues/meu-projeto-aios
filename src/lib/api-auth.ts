import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

const TENANT_ISI = process.env.NEXT_PUBLIC_SHARED_TENANT_ID?.trim() || '81bc8777-39f3-477a-8ad6-44f9dcf1eca8'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AuthResult =
  | { ok: true; tenantId: string; role: string; userId: string }
  | { ok: false; status: number; error: string }

// Resolve o utilizador autenticado: Bearer token OU sessão por cookies (@supabase/ssr).
async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (token) {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  }

  // Sem Bearer: usar a sessão do browser (cookies) — é assim que os componentes
  // client-side chamam estas rotas via fetch same-origin.
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

/**
 * Valida o chamador (Bearer token ou sessão por cookies) e confirma que
 * pertence ao tenant Isi. Usar em TODA rota de API que opera com
 * service_role (bypass de RLS).
 *
 * @param request  o Request do route handler
 * @param opts.requireAdmin  se true, exige role === 'admin' (default: false)
 */
export async function requireTenantAuth(
  request: Request,
  opts: { requireAdmin?: boolean } = {}
): Promise<AuthResult> {
  const user = await getAuthenticatedUser(request)
  if (!user) return { ok: false, status: 401, error: 'Não autenticado' }

  const meta = (user.app_metadata || {}) as Record<string, unknown>
  const tenantId = String(meta.tenant_id || '')
  const role = String(meta.role || '')
  if (tenantId !== TENANT_ISI) return { ok: false, status: 403, error: 'Sem acesso a este tenant' }
  if (opts.requireAdmin && role !== 'admin') {
    return { ok: false, status: 403, error: 'Apenas administradores têm acesso' }
  }

  return { ok: true, tenantId, role, userId: user.id }
}
