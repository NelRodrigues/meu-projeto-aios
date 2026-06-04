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

export async function POST(request: Request) {
  try {
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
    const { error } = await supabase
      .from('integration_keys')
      .upsert(cleaned, { onConflict: 'service,key_name' })

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true, count: cleaned.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao guardar chaves' },
      { status: 500 }
    )
  }
}
