// SIC Global Minds — backend DEDICATED single-tenant (standalone).
// Nao ha modo shared/tenant partilhado: esta fundacao usa o proprio projecto
// Supabase com as tabelas base da migracao 002.

export interface BackendConfig {
  supabaseUrl: string | null
  projectRef: string | null
  isPlaceholderUrl: boolean
}

export interface BackendCompatibilityReport extends BackendConfig {
  canUseCurrentRepoContract: boolean
  requiredStandaloneTables: string[]
  warnings: string[]
  nextSteps: string[]
}

export const PUBLIC_SUPABASE_URL = normalizarEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)

// Tabelas base reais desta fundacao (migracao 002). `leads` = ex-`clientes`.
export const REQUIRED_STANDALONE_TABLES = [
  'profiles',
  'leads',
  'interacoes',
  'mudancas_estagio',
  'mensagens_whatsapp',
  'integration_keys',
  'whatsapp_instances',
] as const

function normalizarEnv(valor: string | null | undefined): string | null {
  const texto = valor?.trim()
  return texto ? texto : null
}

export function parseSupabaseProjectRef(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const host = new URL(url).hostname
    const [projectRef] = host.split('.')
    return projectRef || null
  } catch {
    return null
  }
}

export function getBackendConfig(
  env: Record<string, string | undefined> = process.env
): BackendConfig {
  const supabaseUrl = normalizarEnv(env.NEXT_PUBLIC_SUPABASE_URL ?? PUBLIC_SUPABASE_URL)
  const projectRef = parseSupabaseProjectRef(supabaseUrl)

  return {
    supabaseUrl,
    projectRef,
    isPlaceholderUrl:
      !supabaseUrl || /your_project\.supabase\.co/i.test(supabaseUrl),
  }
}

export function getBackendCompatibilityReport(
  env: Record<string, string | undefined> = process.env
): BackendCompatibilityReport {
  const config = getBackendConfig(env)
  const warnings: string[] = []
  const nextSteps: string[] = []

  if (config.isPlaceholderUrl) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL ainda esta com placeholder.')
    nextSteps.push('Preencher as variaveis reais do Supabase antes de testar login ou dados.')
  }

  return {
    ...config,
    canUseCurrentRepoContract: !config.isPlaceholderUrl,
    requiredStandaloneTables: [...REQUIRED_STANDALONE_TABLES],
    warnings,
    nextSteps,
  }
}
