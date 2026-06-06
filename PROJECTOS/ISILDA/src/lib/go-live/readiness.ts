import fs from 'node:fs'
import path from 'node:path'

export type GoLiveCheckStatus = 'ok' | 'warn' | 'manual'

export interface GoLiveCheck {
  key: string
  label: string
  status: GoLiveCheckStatus
  detail: string
}

export interface GoLiveReadinessReport {
  generated_at: string
  auto_ready: boolean
  auto_ok: number
  auto_warn: number
  manual_pending: number
  checks: GoLiveCheck[]
}

function exists(rootDir: string, relativePath: string) {
  return fs.existsSync(path.join(rootDir, relativePath))
}

function hasBackupSnapshot(rootDir: string) {
  const backupDir = path.join(rootDir, 'backups')
  if (!fs.existsSync(backupDir)) return false
  return fs
    .readdirSync(backupDir)
    .some((entry) => entry.startsWith('go-live-backup-') && entry.endsWith('.json'))
}

function hasAnalyticsEnabled(rootDir: string) {
  const layoutPath = path.join(rootDir, 'src/app/layout.tsx')
  const packagePath = path.join(rootDir, 'package.json')
  if (!fs.existsSync(layoutPath) || !fs.existsSync(packagePath)) return false
  return fs.readFileSync(layoutPath, 'utf8').includes('<Analytics />')
    && fs.readFileSync(packagePath, 'utf8').includes('@vercel/analytics')
}

function hasValue(value: string | undefined | null) {
  return Boolean(value && value.trim() && !value.includes('YOUR_') && !value.includes('placeholder'))
}

export function getGoLiveReadinessReport(
  env: NodeJS.ProcessEnv = process.env,
  rootDir = process.cwd()
): GoLiveReadinessReport {
  const checks: GoLiveCheck[] = [
    {
      key: 'manifest',
      label: 'PWA manifest',
      status: exists(rootDir, 'public/manifest.json') ? 'ok' : 'warn',
      detail: exists(rootDir, 'public/manifest.json')
        ? 'manifest.json presente'
        : 'manifest.json em falta',
    },
    {
      key: 'service-worker',
      label: 'Service Worker',
      status: exists(rootDir, 'public/sw.js') ? 'ok' : 'warn',
      detail: exists(rootDir, 'public/sw.js') ? 'sw.js presente' : 'sw.js em falta',
    },
    {
      key: 'icons',
      label: 'Icones PWA',
      status: exists(rootDir, 'public/icon-192.png') && exists(rootDir, 'public/icon-512.png') ? 'ok' : 'warn',
      detail:
        exists(rootDir, 'public/icon-192.png') && exists(rootDir, 'public/icon-512.png')
          ? 'icon-192.png e icon-512.png presentes'
          : 'faltam icones PWA',
    },
    {
      key: 'webhook-route',
      label: 'Webhook UAZAPI',
      status: exists(rootDir, 'src/app/api/webhooks/uazapi/route.ts') ? 'ok' : 'warn',
      detail: exists(rootDir, 'src/app/api/webhooks/uazapi/route.ts')
        ? 'proxy /api/webhooks/uazapi activo'
        : 'proxy /api/webhooks/uazapi em falta',
    },
    {
      key: 'vision-fn',
      label: 'Vision',
      status: exists(rootDir, 'supabase/functions/process-vision/index.ts') ? 'ok' : 'warn',
      detail: exists(rootDir, 'supabase/functions/process-vision/index.ts')
        ? 'Edge Function process-vision presente'
        : 'Edge Function process-vision em falta',
    },
    {
      key: 'recompra-fn',
      label: 'Recompra cron',
      status: exists(rootDir, 'supabase/functions/recompra-cron/index.ts') ? 'ok' : 'warn',
      detail: exists(rootDir, 'supabase/functions/recompra-cron/index.ts')
        ? 'Edge Function recompra-cron presente'
        : 'Edge Function recompra-cron em falta',
    },
    {
      key: 'shared-cutover-doc',
      label: 'Cutover documentado',
      status: exists(rootDir, 'docs/architecture/shared-supabase-isilda-cutover.md') ? 'ok' : 'warn',
      detail: exists(rootDir, 'docs/architecture/shared-supabase-isilda-cutover.md')
        ? 'cutover partilhado documentado'
        : 'documentacao de cutover em falta',
    },
    {
      key: 'supabase-url',
      label: 'Supabase partilhado',
      status: hasValue(env.NEXT_PUBLIC_SUPABASE_URL) ? 'ok' : 'warn',
      detail: hasValue(env.NEXT_PUBLIC_SUPABASE_URL)
        ? 'NEXT_PUBLIC_SUPABASE_URL definido'
        : 'NEXT_PUBLIC_SUPABASE_URL em falta',
    },
    {
      key: 'supabase-mode',
      label: 'Modo partilhado',
      status: env.NEXT_PUBLIC_APP_BACKEND_MODE === 'shared' ? 'ok' : 'warn',
      detail:
        env.NEXT_PUBLIC_APP_BACKEND_MODE === 'shared'
          ? 'backend em modo shared'
          : 'backend ainda nao está em modo shared',
    },
    {
      key: 'vercel-domain',
      label: 'Domino/URL Vercel',
      status: hasValue(env.VERCEL_URL) || hasValue(env.NEXT_PUBLIC_SITE_URL) ? 'ok' : 'manual',
      detail:
        hasValue(env.VERCEL_URL) || hasValue(env.NEXT_PUBLIC_SITE_URL)
          ? 'URL de produção detectada'
          : 'precisa de configuracao manual na Vercel',
    },
    {
      key: 'uazapi-config',
      label: 'UAZAPI ligada',
      status: hasValue(env.UAZAPI_BASE_URL) && hasValue(env.UAZAPI_TOKEN) ? 'ok' : 'manual',
      detail:
        hasValue(env.UAZAPI_BASE_URL) && hasValue(env.UAZAPI_TOKEN)
          ? 'UAZAPI configurada no ambiente'
          : 'precisa de configuracao manual da UAZAPI',
    },
    {
      key: 'backup',
      label: 'Backup da base',
      status: hasBackupSnapshot(rootDir) ? 'ok' : 'manual',
      detail: hasBackupSnapshot(rootDir)
        ? 'snapshot de backup gerado'
        : 'confirmar backup recente antes do go-live',
    },
    {
      key: 'monitoring',
      label: 'Monitoring basico',
      status: hasAnalyticsEnabled(rootDir) ? 'ok' : 'manual',
      detail: hasAnalyticsEnabled(rootDir)
        ? 'Vercel Analytics activado e logs Supabase mantidos'
        : 'confirmar Vercel Analytics e logs do Supabase',
    },
    {
      key: 'catalogo-fotos',
      label: 'Catalogo com fotos',
      status: 'manual',
      detail: 'confirmar 30 produtos com fotos carregadas',
    },
  ]

  const autoChecks = checks.filter((check) => check.status !== 'manual')
  const autoReady = autoChecks.every((check) => check.status === 'ok')

  return {
    generated_at: new Date().toISOString(),
    auto_ready: autoReady,
    auto_ok: autoChecks.filter((check) => check.status === 'ok').length,
    auto_warn: autoChecks.filter((check) => check.status === 'warn').length,
    manual_pending: checks.filter((check) => check.status === 'manual').length,
    checks,
  }
}
