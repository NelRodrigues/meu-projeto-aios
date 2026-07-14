import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api-auth'

// ADR-01: GM é single-tenant. Papéis operacionais: apenas `admin` e `operacao`.
const PERFIS_VALIDOS = ['admin', 'operacao']

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// PATCH — actualizar perfil / activo
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const admin = getSupabaseAdmin()
  const { data: membro } = await admin.from('team_members').select('id, auth_user_id, role').eq('id', id).maybeSingle()
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  const update: Record<string, unknown> = {}
  if (typeof body.perfil === 'string') {
    if (!PERFIS_VALIDOS.includes(body.perfil)) return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    update.role = body.perfil
  }
  if (typeof body.activo === 'boolean') update.is_active = body.activo
  if (typeof body.nome === 'string' && body.nome.trim()) update.name = body.nome.trim()

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  const { error } = await admin.from('team_members').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nota: na GM o papel vive só em `team_members` (o RLS lê via is_admin(auth.uid())).
  // Não é preciso sincronizar app_metadata como na base multi-tenant ISILDA.

  return NextResponse.json({ ok: true })
}

// DELETE — eliminar membro (e a conta de login)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params

  const admin = getSupabaseAdmin()
  const { data: membro } = await admin.from('team_members').select('id, auth_user_id, email').eq('id', id).maybeSingle()
  if (!membro) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  // Não permitir auto-eliminação do próprio admin logado
  if (membro.auth_user_id && membro.auth_user_id === auth.userId) {
    return NextResponse.json({ error: 'Não podes eliminar a tua própria conta.' }, { status: 400 })
  }

  // Eliminar o registo da equipa
  const { error: delErr } = await admin.from('team_members').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Eliminar a conta de autenticação associada (best-effort)
  if (membro.auth_user_id) {
    await admin.auth.admin.deleteUser(membro.auth_user_id).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
