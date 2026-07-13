import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api-auth'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ADR-01: GM é single-tenant. Papéis operacionais: apenas `admin` e `operacao`.
const PERFIS_VALIDOS = ['admin', 'operacao']

// GET — listar membros da equipa
export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('team_members')
    .select('id, name, email, phone, role, is_active, auth_user_id, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ membros: data || [] })
}

// POST — criar um novo membro (com conta de login)
export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const nome = String(body?.nome || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const telefone = body?.telefone ? String(body.telefone).trim() : null
  const perfil = String(body?.perfil || 'operacao')
  const password = String(body?.password || '').trim()

  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  if (!PERFIS_VALIDOS.includes(perfil)) return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Já existe membro com este email?
  const { data: existente } = await admin
    .from('team_members')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existente) return NextResponse.json({ error: 'Já existe um membro com este email' }, { status: 409 })

  // Criar conta de autenticação. Na GM (single-tenant) a autorização resolve-se
  // via `team_members`, não via app_metadata — por isso não gravamos tenant_id/role
  // no app_metadata. `role` guarda-se só na linha de team_members abaixo.
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: nome },
  })

  let authUserId: string | null = null
  if (authErr) {
    // Se o utilizador já existir no auth, tentamos associá-lo na mesma
    if (!/already been registered|already exists/i.test(authErr.message)) {
      return NextResponse.json({ error: `Falha ao criar conta: ${authErr.message}` }, { status: 500 })
    }
  } else {
    authUserId = created?.user?.id || null
  }

  // Registar na tabela team_members
  const { data: membro, error: memErr } = await admin
    .from('team_members')
    .insert({
      auth_user_id: authUserId,
      name: nome,
      email,
      phone: telefone,
      role: perfil,
      is_active: true,
    })
    .select('id, name, email, phone, role, is_active')
    .single()

  if (memErr) return NextResponse.json({ error: `Membro: ${memErr.message}` }, { status: 500 })

  return NextResponse.json({ membro }, { status: 201 })
}
