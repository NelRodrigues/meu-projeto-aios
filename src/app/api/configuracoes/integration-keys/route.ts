import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api-auth'
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

    // ADR-01: `integration_keys` na GM não tem `tenant_id`. UNIQUE (service, key_name).
    for (const row of cleaned) {
      const { data: existing, error: findError } = await supabase
        .from('integration_keys')
        .select('id')
        .eq('service', row.service)
        .eq('key_name', row.key_name)
        .maybeSingle()

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
