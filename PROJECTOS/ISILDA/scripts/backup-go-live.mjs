import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }

  return env
}

async function withTimeout(promise, ms, label) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await promise(controller.signal, label)
  } finally {
    clearTimeout(timer)
  }
}

async function fetchTable(supabase, table, select = '*') {
  return withTimeout(async (signal) => {
    const query = supabase
      .from(table)
      .select(select)
      .range(0, 999)

    const result = await query
    const { data, error } = result
    if (signal.aborted) {
      return { table, error: 'timeout', rows: [] }
    }
    if (error) {
      return { table, error: error.message, rows: [] }
    }
    return { table, rows: data ?? [] }
  }, 10000, table)
}

async function main() {
  const root = process.cwd()
  const env = loadEnv(path.join(root, '.env.local'))

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local')
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const tables = [
    'tenants',
    'tenant_users',
    'team_members',
    'agent_configs',
    'usage_metrics',
    'integration_keys',
    'contacts',
    'leads',
    'deals',
    'products',
    'notificacoes',
  ]

  const backup = {
    generated_at: new Date().toISOString(),
    project_ref: 'achtvzbcczmcbvjkdjry',
    tenant_slug: 'isilda',
    tables: {},
  }

  for (const table of tables) {
    try {
      backup.tables[table] = await fetchTable(supabase, table)
    } catch (error) {
      backup.tables[table] = {
        table,
        error: error instanceof Error ? error.message : 'erro desconhecido',
        rows: [],
      }
    }
  }

  const backupDir = path.join(root, 'backups')
  fs.mkdirSync(backupDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(backupDir, `go-live-backup-${stamp}.json`)
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2))

  console.log(JSON.stringify({
    file: path.relative(root, filePath),
    tables: Object.fromEntries(
      Object.entries(backup.tables).map(([table, result]) => [
        table,
        {
          rows: result.rows.length,
          error: result.error ?? null,
        },
      ])
    ),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
