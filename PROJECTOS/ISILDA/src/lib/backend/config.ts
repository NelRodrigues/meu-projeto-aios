export type BackendMode = 'standalone' | 'shared'

export interface BackendConfig {
  mode: BackendMode
  supabaseUrl: string | null
  projectRef: string | null
  sharedTenantSlug: string | null
  sharedTenantId: string | null
  isPlaceholderUrl: boolean
}

export interface BackendCompatibilityReport extends BackendConfig {
  usesSharedSupabaseProject: boolean
  canUseCurrentRepoContract: boolean
  requiredStandaloneTables: string[]
  warnings: string[]
  nextSteps: string[]
}

export const SHARED_SUPABASE_PROJECT_REF = 'achtvzbcczmcbvjkdjry'

export const PUBLIC_BACKEND_MODE = normalizarEnv(process.env.NEXT_PUBLIC_APP_BACKEND_MODE)
export const PUBLIC_SUPABASE_URL = normalizarEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
export const PUBLIC_SHARED_TENANT_SLUG = normalizarEnv(process.env.NEXT_PUBLIC_SHARED_TENANT_SLUG)
export const PUBLIC_SHARED_TENANT_ID = normalizarEnv(process.env.NEXT_PUBLIC_SHARED_TENANT_ID)

export const REQUIRED_STANDALONE_TABLES = [
  'clientes',
  'pedidos',
  'mensagens_whatsapp',
  'produtos_catalogo',
  'ocasioes_cliente',
  'calendario_producao',
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
  const modeEnv = normalizarEnv(env.NEXT_PUBLIC_APP_BACKEND_MODE ?? PUBLIC_BACKEND_MODE)
  const projectRef = parseSupabaseProjectRef(supabaseUrl)

  const mode: BackendMode =
    modeEnv === 'shared' || projectRef === SHARED_SUPABASE_PROJECT_REF
      ? 'shared'
      : 'standalone'

  return {
    mode,
    supabaseUrl,
    projectRef,
    sharedTenantSlug: normalizarEnv(env.NEXT_PUBLIC_SHARED_TENANT_SLUG ?? PUBLIC_SHARED_TENANT_SLUG),
    sharedTenantId: normalizarEnv(env.NEXT_PUBLIC_SHARED_TENANT_ID ?? PUBLIC_SHARED_TENANT_ID),
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
  const usesSharedSupabaseProject =
    config.projectRef === SHARED_SUPABASE_PROJECT_REF

  if (config.isPlaceholderUrl) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL ainda esta com placeholder.')
    nextSteps.push('Preencher as variaveis reais do Supabase antes de testar login ou dados.')
  }

  if (config.mode === 'shared' || usesSharedSupabaseProject) {
    if (!config.sharedTenantSlug) {
      warnings.push('NEXT_PUBLIC_SHARED_TENANT_SLUG nao foi definido para o modo shared.')
      nextSteps.push('Definir o slug do tenant activo para diagnostico e futuras queries scoping-aware.')
    }

    if (!config.sharedTenantId) {
      warnings.push('NEXT_PUBLIC_SHARED_TENANT_ID nao foi definido para o modo shared.')
    }

    nextSteps.push('Validar que os módulos visíveis já usam os adaptadores shared do frontend.')
    nextSteps.push('Manter o contrato local apenas como fallback técnico, sem expor aviso ao utilizador.')
  }

  return {
    ...config,
    usesSharedSupabaseProject,
    canUseCurrentRepoContract:
      !config.isPlaceholderUrl &&
      (config.mode === 'standalone' || (config.mode === 'shared' && Boolean(config.sharedTenantSlug) && Boolean(config.sharedTenantId))),
    requiredStandaloneTables: [...REQUIRED_STANDALONE_TABLES],
    warnings,
    nextSteps,
  }
}

export function isSharedBackendMode(
  env: Record<string, string | undefined> = process.env
): boolean {
  const report = getBackendCompatibilityReport(env)
  return report.mode === 'shared' || report.usesSharedSupabaseProject
}
