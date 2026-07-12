import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SHARED_SUPABASE_PROJECT_REF,
  getBackendCompatibilityReport,
  parseSupabaseProjectRef,
} from '../../src/lib/backend/config.ts'

test('parseSupabaseProjectRef extrai o ref do projecto Supabase', () => {
  assert.equal(
    parseSupabaseProjectRef('https://achtvzbcczmcbvjkdjry.supabase.co'),
    SHARED_SUPABASE_PROJECT_REF
  )
  assert.equal(parseSupabaseProjectRef('nao-e-url'), null)
  assert.equal(parseSupabaseProjectRef(null), null)
})

test('report marca placeholder como nao configurado', () => {
  const report = getBackendCompatibilityReport({
    NEXT_PUBLIC_SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  })

  assert.equal(report.mode, 'standalone')
  assert.equal(report.isPlaceholderUrl, true)
  assert.equal(report.canUseCurrentRepoContract, false)
  assert.match(report.warnings.join(' '), /placeholder/i)
})

test('report aceita backend partilhado quando o tenant estah definido', () => {
  const report = getBackendCompatibilityReport({
    NEXT_PUBLIC_APP_BACKEND_MODE: 'shared',
    NEXT_PUBLIC_SUPABASE_URL: 'https://achtvzbcczmcbvjkdjry.supabase.co',
    NEXT_PUBLIC_SHARED_TENANT_SLUG: 'isilda',
    NEXT_PUBLIC_SHARED_TENANT_ID: '81bc8777-39f3-477a-8ad6-44f9dcf1eca8',
  })

  assert.equal(report.mode, 'shared')
  assert.equal(report.usesSharedSupabaseProject, true)
  assert.equal(report.canUseCurrentRepoContract, true)
  assert.equal(report.sharedTenantSlug, 'isilda')
  assert.equal(report.requiredStandaloneTables.includes('clientes'), true)
  assert.equal(report.warnings.length, 0)
})
