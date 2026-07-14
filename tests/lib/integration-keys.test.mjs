import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIntegrationKeysPayload } from '../../src/lib/configuracoes/integration-keys.ts'

test('buildIntegrationKeysPayload trim e filtra linhas invalidas', () => {
  const result = buildIntegrationKeysPayload([
    { service: ' uazapi ', key_name: ' token ', key_value: '  abc123  ', is_active: true },
    { service: ' ', key_name: 'x', key_value: 'y', is_active: false },
  ])

  assert.deepEqual(result, [
    { service: 'uazapi', key_name: 'token', key_value: 'abc123', is_active: true },
  ])
})
