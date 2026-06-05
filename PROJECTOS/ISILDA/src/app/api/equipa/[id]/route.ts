import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TENANT_ISI = process.env.NEXT_PUBLIC_SHARED_TENANT_ID?.trim() || '81bc8777-39f3-477a-8ad6-44f9dcf1eca8'
const PERFIS_VALIDOS = ['admin', 'gestor', 'operador', 'visualizador']

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin(request: Request): Promise<{ ok: true; tenantId: string; userId: string } | { ok: false; status: number; error: string }> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Não autenticado' }
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { ok: false, status: 401, error: 'Sessão inválida' }
  const meta = (data.user.app_metadata || {}) as Record<string, unknown>
  if (String(meta.tenant_id || '') !== TENANT_ISI) return { ok: false, status: 403, error: 'Sem acesso' }
  if (String(meta.role || '') !== 'admin') return { ok: false, status: 403, error: 'Apenas administradores' }
  return { ok: true, tenantId: TENANT_ISI, userId: data.user.id }
}

// PATCH — actualizar perfil / activo
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const admin = getSupabaseAdmin()
  const { data: membro } = await admin.from('team_members').select('id, auth_user_id, role').eq('id', id).eq('tenant_id', auth.tenantId).maybeSingle()
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  const update: Record<string, unknown> = {}
  if (typeof body.perfil === 'string') {
    if (!PERFIS_VALIDOS.includes(body.perfil)) return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    update.role = body.perfil
  }
  if (typeof body.activo === 'boolean') update.is_active = body.activo
  if (typeof body.nome === 'string' && body.nome.trim()) update.name = body.nome.trim()

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  const { error } = await admin.from('team_members').update(update).eq('id', id).eq('tenant_id', auth.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sincronizar role no auth (app_metadata) para o RLS funcionar
  if (update.role && membro.auth_user_id) {
    await admin.auth.admin.updateUserById(membro.auth_user_id, {
      app_metadata: { tenant_id: auth.tenantId, role: update.role },
    })
  }

  return NextResponse.json({ ok: true })
}

// DELETE — eliminar membro (e a conta de login)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params

  const admin = getSupabaseAdmin()
  const { data: membro } = await admin.from('team_members').select('id, auth_user_id, email').eq('id', id).eq('tenant_id', auth.tenantId).maybeSingle()
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  // Não permitir auto-eliminação do próprio admin logado
  if (membro.auth_user_id && membro.auth_user_id === auth.userId) {
    return NextResponse.json({ error: 'Não podes eliminar a tua própria conta.' }, { status: 400 })
  }

  // Eliminar o registo da equipa
  const { error: delErr } = await admin.from('team_members').delete().eq('id', id).eq('tenant_id', auth.tenantId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Eliminar a conta de autenticação associada (best-effort)
  if (membro.auth_user_id) {
    await admin.auth.admin.deleteUser(membro.auth_user_id).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
