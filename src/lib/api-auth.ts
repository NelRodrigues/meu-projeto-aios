import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

// ADR-01: a Global Minds é single-tenant (projecto Supabase dedicado). NÃO há
// `tenant_id` nem `NEXT_PUBLIC_SHARED_TENANT_ID`. A autorização faz-se via
// `team_members` (Arquitectura §8.2): a partir de `auth_user_id = user.id`
// confirmamos que o membro está activo e, se necessário, que é admin.

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AuthResult =
  | { ok: true; role: string; userId: string; memberId: string }
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
 * Valida o chamador (Bearer token ou sessão por cookies) e confirma que é um
 * membro ACTIVO da equipa Global Minds. Usar em TODA a rota de API que opera com
 * service_role (bypass de RLS) — defesa em profundidade sobre o middleware.
 *
 * @param request  o Request do route handler
 * @param opts.requireAdmin  se true, exige `role === 'admin'` (default: false)
 */
export async function requireAuth(
  request: Request,
  opts: { requireAdmin?: boolean } = {}
): Promise<AuthResult> {
  const user = await getAuthenticatedUser(request)
  if (!user) return { ok: false, status: 401, error: 'Não autenticado' }

  // Resolver o membro da equipa a partir da conta de autenticação.
  const admin = getSupabaseAdmin()
  const { data: member, error } = await admin
    .from('team_members')
    .select('id, role, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error) return { ok: false, status: 500, error: 'Falha ao verificar equipa' }
  if (!member || !member.is_active) {
    return { ok: false, status: 403, error: 'Sem acesso: conta não pertence à equipa activa' }
  }

  const role = String(member.role || '')
  if (opts.requireAdmin && role !== 'admin') {
    return { ok: false, status: 403, error: 'Apenas administradores têm acesso' }
  }

  return { ok: true, role, userId: user.id, memberId: member.id }
}

/**
 * Atalho para rotas exclusivas de admin. Equivale a `requireAuth(request, { requireAdmin: true })`.
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  return requireAuth(request, { requireAdmin: true })
}

/**
 * @deprecated Herança ISILDA multi-tenant. Na GM (single-tenant) usar `requireAuth`.
 * Mantido como alias para compatibilidade de importadores existentes.
 */
export const requireTenantAuth = requireAuth
