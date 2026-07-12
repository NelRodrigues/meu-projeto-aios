import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireTenantAuth } from '@/lib/api-auth'

type Params = Promise<{ id: string }>

function isAuthError(status: number) {
  return status === 401 || status === 403
}

function normalizeUazapiUrl(input: string): string {
  const value = input.trim()
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/\/+$/, '')
  }
  if (value.includes('.uazapi.com')) {
    return `https://${value.replace(/\/+$/, '')}`
  }
  return `https://${value}.uazapi.com`
}

async function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase nao configurado')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getUazapiConfig(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>) {
  const tenantId = await getTenantId()

  let query = supabase
    .from('integration_keys')
    .select('service,key_name,key_value,is_active')
    .eq('service', 'uazapi')
    .in('key_name', ['base_url', 'token'])
    .eq('is_active', true)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const map = new Map((data ?? []).map((row) => [row.key_name, row.key_value]))
  const rawUrl = map.get('base_url')
  const token = map.get('token')

  if (!rawUrl || !token) {
    throw new Error('Configura primeiro a UAZAPI em Chaves de API')
  }

  return {
    url: normalizeUazapiUrl(rawUrl),
    token,
  }
}

async function getTenantId() {
  return process.env.NEXT_PUBLIC_SHARED_TENANT_ID?.trim() || null
}

async function fetchStatus(instance: { api_url: string | null; api_key: string | null }) {
  if (!instance.api_url || !instance.api_key) return null
  const res = await fetch(`${instance.api_url}/instance/status`, {
    headers: { token: instance.api_key },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    if (isAuthError(res.status)) {
      throw new Error('Token da instância UAZAPI inválido ou expirado.')
    }
    throw new Error(json?.message || `Falha ao verificar status (${res.status})`)
  }
  return json
}

export async function GET(request: Request, context: { params: Params }) {
  const auth = await requireTenantAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { id } = await context.params
    const supabase = await getSupabaseAdmin()
    const tenantId = await getTenantId()

    let query = supabase.from('whatsapp_instances').select('*').eq('id', id)
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    const liveStatus = await fetchStatus(data).catch(() => null)

    return NextResponse.json({ instance: data, liveStatus })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao carregar instância' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, context: { params: Params }) {
  const auth = await requireTenantAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || 'status')

    const supabase = await getSupabaseAdmin()
    const tenantId = await getTenantId()
    const uazapi = await getUazapiConfig(supabase)

    let query = supabase.from('whatsapp_instances').select('*').eq('id', id)
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data: instance, error } = await query.maybeSingle()

    if (error) throw error
    if (!instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    if (action === 'status') {
      const liveStatus = await fetchStatus(instance)
      const newStatus = liveStatus?.status?.connected ? 'connected' : 'disconnected'
      if (instance.status !== newStatus) {
        await supabase.from('whatsapp_instances').update({ status: newStatus }).eq('id', id)
      }
      return NextResponse.json({ instance: { ...instance, status: newStatus }, liveStatus })
    }

    if (action === 'connect') {
      const res = await fetch(`${instance.api_url || uazapi.url}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: instance.api_key,
        },
      })
      const qrData = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (isAuthError(res.status)) {
          throw new Error('Token da instância UAZAPI inválido ou expirado.')
        }
        throw new Error(qrData?.message || `UAZAPI retornou HTTP ${res.status}`)
      }
      const qrcode = qrData?.instance?.qrcode || qrData?.qrcode || null
      const newStatus = qrData?.status?.connected ? 'connected' : 'connecting'
      if (newStatus && newStatus !== instance.status) {
        await supabase.from('whatsapp_instances').update({ status: newStatus }).eq('id', id)
      }
      return NextResponse.json({ instance: { ...instance, status: newStatus }, qrcode, raw: qrData })
    }

    if (action === 'disconnect') {
      const res = await fetch(`${instance.api_url || uazapi.url}/instance/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: instance.api_key,
        },
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (isAuthError(res.status)) {
          throw new Error('Token da instância UAZAPI inválido ou expirado.')
        }
        throw new Error(result?.message || `UAZAPI retornou HTTP ${res.status}`)
      }
      await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', id)
      return NextResponse.json({ ok: true, result })
    }

    if (action === 'delete') {
      await supabase.from('whatsapp_instances').delete().eq('id', id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: `Acção desconhecida: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na acção da instância' },
      { status: 500 }
    )
  }
}
