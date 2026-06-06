import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { getGoLiveReadinessReport } from '@/lib/go-live/readiness'

function updateCheck(
  report: ReturnType<typeof getGoLiveReadinessReport>,
  key: string,
  status: 'ok' | 'warn' | 'manual',
  detail: string
) {
  const check = report.checks.find((item) => item.key === key)
  if (check) {
    check.status = status
    check.detail = detail
  }
}

export async function GET() {
  const report = getGoLiveReadinessReport()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const [uazapiResult, catalogoResult] = await Promise.all([
      supabase
        .from('integration_keys')
        .select('key_name,key_value,is_active')
        .eq('service', 'uazapi')
        .in('key_name', ['base_url', 'token', 'webhook_token']),
      supabase
        .from('products')
        .select('id,tenant_id,is_active')
        .eq('tenant_id', '81bc8777-39f3-477a-8ad6-44f9dcf1eca8')
        .eq('is_active', true),
    ])

    const uazapiKeys = (uazapiResult.data ?? []) as Array<{
      key_name: string
      key_value: string
      is_active: boolean | null
    }>
    const hasUazapiConfig =
      ['base_url', 'token', 'webhook_token'].every((key) =>
        uazapiKeys.some((row) => row.key_name === key && row.is_active !== false && Boolean(row.key_value?.trim()))
      )

    updateCheck(
      report,
      'uazapi-config',
      hasUazapiConfig ? 'ok' : 'warn',
      hasUazapiConfig
        ? 'UAZAPI configurada no backend'
        : 'faltam chaves UAZAPI em integration_keys'
    )

    const totalProdutosCatalogo = (catalogoResult.data ?? []).length
    const catalogAssets = ['chantilly.svg', 'bento-cake.svg', 'doces.svg', 'especiais.svg', 'casamento.svg']
    const assetsOk = catalogAssets.every((asset) => fs.existsSync(path.join(process.cwd(), 'public/catalogo', asset)))

    updateCheck(
      report,
      'catalogo-fotos',
      totalProdutosCatalogo >= 30 && assetsOk ? 'ok' : 'warn',
      totalProdutosCatalogo >= 30 && assetsOk
        ? `Catalogo com ${totalProdutosCatalogo} produtos activos e assets visuais prontos`
        : `Catalogo com ${totalProdutosCatalogo} produtos activos; assets visuais ${assetsOk ? 'ok' : 'em falta'}`
    )
  } else {
    updateCheck(report, 'uazapi-config', 'manual', 'precisa de verificacao manual da UAZAPI')
    updateCheck(report, 'catalogo-fotos', 'manual', 'precisa de verificacao manual do catalogo com fotos')
  }

  report.auto_ok = report.checks.filter((check) => check.status === 'ok').length
  report.auto_warn = report.checks.filter((check) => check.status === 'warn').length
  report.manual_pending = report.checks.filter((check) => check.status === 'manual').length
  report.auto_ready = report.checks.filter((check) => check.status !== 'manual').every((check) => check.status === 'ok')

  return NextResponse.json(report)
}
