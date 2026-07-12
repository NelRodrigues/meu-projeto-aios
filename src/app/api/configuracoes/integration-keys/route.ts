import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildIntegrationKeysPayload, type IntegrationKeyInput } from '@/lib/configuracoes/integration-keys'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase nao configurado')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getSharedTenantId() {
  return process.env.NEXT_PUBLIC_SHARED_TENANT_ID?.trim() || null
}

// Valida o token do chamador e confirma que é admin do tenant configurado.
async function requireAdmin(request: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Não autenticado' }
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { ok: false, status: 401, error: 'Sessão inválida' }
  const meta = (data.user.app_metadata || {}) as Record<string, unknown>
  const tenantId = getSharedTenantId()
  if (tenantId && String(meta.tenant_id || '') !== tenantId) {
    return { ok: false, status: 403, error: 'Sem acesso a este tenant' }
  }
  if (String(meta.role || '') !== 'admin') {
    return { ok: false, status: 403, error: 'Apenas administradores podem gerir as chaves de integração' }
  }
  return { ok: true }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null)
    const rows = Array.isArray(body?.rows) ? (body.rows as IntegrationKeyInput[]) : null

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma chave enviada' }, { status: 400 })
    }

    const cleaned = buildIntegrationKeysPayload(rows)

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const tenantId = getSharedTenantId()

    for (const row of cleaned) {
      let query = supabase
        .from('integration_keys')
        .select('id')
        .eq('service', row.service)
        .eq('key_name', row.key_name)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: existing, error: findError } = await query.maybeSingle()

      if (findError) {
        throw findError
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('integration_keys')
          .update({
            key_value: row.key_value,
            is_active: row.is_active,
          })
          .eq('id', existing.id)

        if (updateError) {
          throw updateError
        }
      } else {
        const { error: insertError } = await supabase.from('integration_keys').insert({
          ...row,
          tenant_id: tenantId,
        })

        if (insertError) {
          throw insertError
        }
      }
    }

    return NextResponse.json({ ok: true, count: cleaned.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao guardar chaves' },
      { status: 500 }
    )
  }
}
