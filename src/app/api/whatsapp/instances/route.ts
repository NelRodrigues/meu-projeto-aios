import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api-auth'

type UazapiConfig = {
  url: string
  token: string
}

async function readResponseMessage(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return null
  try {
    const json = JSON.parse(text)
    return json?.message || json?.error || json?.response || text
  } catch {
    return text
  }
}

function isAuthError(status: number) {
  return status === 401 || status === 403
}

function slugifySystemName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'globalminds'
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

async function getUazapiConfig(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>): Promise<UazapiConfig> {
  // ADR-01: `integration_keys` na GM não tem `tenant_id` (single-tenant).
  const { data, error } = await supabase
    .from('integration_keys')
    .select('service,key_name,key_value,is_active')
    .eq('service', 'uazapi')
    .in('key_name', ['base_url', 'token'])
    .eq('is_active', true)

  if (error) {
    throw new Error(error.message)
  }

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

async function setWebhook(uazapi: UazapiConfig, instanceToken: string) {
  // Aponta DIRECTAMENTE para a edge function do agente de produção da Isi
  // (gm-agent). Antes apontava para o proxy Vercel → uazapi-webhook-receiver
  // → ai-sales-agent (stack legado), o que regredia o agente em reconfigurações.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  const webhookUrl = `${supabaseUrl}/functions/v1/gm-agent`

  const response = await fetch(`${uazapi.url}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: instanceToken,
    },
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl,
      events: ['messages', 'messages_update', 'connection', 'groups', 'contacts', 'call', 'chats'],
      excludeMessages: ['wasSentByApi'],
      addUrlEvents: true,
    }),
  })

  if (!response.ok) {
    const message = await readResponseMessage(response)
    if (isAuthError(response.status)) {
      throw new Error('Token da instância UAZAPI inválido ou expirado. Verifica a instância ou recria-a.')
    }
    throw new Error(message || `Falha ao configurar webhook (${response.status})`)
  }

  return webhookUrl
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const supabase = await getSupabaseAdmin()

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ instances: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao listar instancias' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Nome da instância é obrigatório' }, { status: 400 })
    }

    const supabase = await getSupabaseAdmin()
    const uazapi = await getUazapiConfig(supabase)

    const createRes = await fetch(`${uazapi.url}/instance/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        admintoken: uazapi.token,
      },
      body: JSON.stringify({
        name,
        systemName: slugifySystemName(name),
        adminField01: 'globalminds',
        adminField02: 'globalminds',
      }),
    })
    const createData = await createRes.json().catch(() => ({}))

    if (!createRes.ok) {
      if (isAuthError(createRes.status)) {
        throw new Error('Token admin da UAZAPI inválido ou expirado. Actualiza-o em Configurações > Chaves de API.')
      }
      throw new Error(createData?.message || `UAZAPI retornou HTTP ${createRes.status}`)
    }

    const instanceToken =
      createData?.token ||
      createData?.api_key ||
      createData?.apikey ||
      createData?.instance?.token ||
      createData?.instance?.api_key ||
      createData?.instance?.apikey

    if (!instanceToken) {
      throw new Error('A UAZAPI não devolveu token da instância')
    }

    const webhookUrl = await setWebhook(uazapi, instanceToken)

    const { data: savedInstance, error: insertError } = await supabase
      .from('whatsapp_instances')
      .insert({
        name: createData?.name || name,
        phone_number: null,
        teams: ['comercial'],
        status: 'connecting',
        api_key: instanceToken,
        api_url: uazapi.url,
        webhook_url: webhookUrl,
        purpose: 'inbox',
        bypass_disconnect: false,
        metadata: {
          provider: 'uazapi',
          uazapi_instance_id: createData?.instance?.id || createData?.id || null,
          webhook_url: webhookUrl,
        },
      })
      .select('*')
      .single()

    if (insertError) {
      throw insertError
    }

    const qrRes = await fetch(`${uazapi.url}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: instanceToken,
      },
    })
    const qrData = await qrRes.json().catch(() => ({}))
    const qrcode = qrData?.instance?.qrcode || qrData?.qrcode || null

    if (!qrRes.ok) {
      if (isAuthError(qrRes.status)) {
        await supabase.from('whatsapp_instances').update({
          status: 'error',
          metadata: {
            provider: 'uazapi',
            uazapi_instance_id: createData?.instance?.id || createData?.id || null,
            webhook_url: webhookUrl,
            error: 'Token da instância UAZAPI inválido ou expirado',
          },
        }).eq('id', savedInstance.id)
        throw new Error('Token da instância UAZAPI inválido ou expirado. Recria a instância ou confirma o token.')
      }
      throw new Error(qrData?.message || `UAZAPI retornou HTTP ${qrRes.status}`)
    }

    const statusToStore = qrData?.status?.connected ? 'connected' : 'connecting'
    if (statusToStore !== savedInstance.status) {
      await supabase.from('whatsapp_instances').update({ status: statusToStore }).eq('id', savedInstance.id)
    }

    return NextResponse.json({
      instance: { ...savedInstance, status: statusToStore },
      qrcode,
      raw: qrData,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao criar instância' },
      { status: 500 }
    )
  }
}
