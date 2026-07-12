import test from 'node:test'
import assert from 'node:assert/strict'
import { getGoLiveReadinessReport } from '../../src/lib/go-live/readiness.ts'

test('go-live readiness report identifica verificacoes automaticas e manuais', () => {
  const report = getGoLiveReadinessReport({
    NEXT_PUBLIC_SUPABASE_URL: 'https://achtvzbcczmcbvjkdjry.supabase.co',
    NEXT_PUBLIC_APP_BACKEND_MODE: 'shared',
    NEXT_PUBLIC_SHARED_TENANT_SLUG: 'isilda',
    NEXT_PUBLIC_SHARED_TENANT_ID: '81bc8777-39f3-477a-8ad6-44f9dcf1eca8',
  })

  assert.equal(report.auto_ready, true)
  assert.ok(report.auto_ok >= 5)
  assert.ok(report.manual_pending >= 2)
  assert.equal(report.checks.find((check) => check.key === 'backup')?.status, 'ok')
  assert.equal(report.checks.find((check) => check.key === 'monitoring')?.status, 'ok')
  assert.match(
    report.checks.map((check) => check.key).join(' '),
    /manifest|service-worker|webhook-route/
  )
})
