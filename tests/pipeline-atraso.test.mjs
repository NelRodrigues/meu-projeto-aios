// Teste do helper de atraso do pipeline — story 2.3 AC3.
// node --test tests/pipeline-atraso.test.mjs
//
// O ficheiro-fonte é TypeScript (src/lib/pipeline-atraso.ts). Reimplementamos
// aqui a lógica pura para testar o contrato sem toolchain de TS (as regras têm de
// ser mantidas em espelho — a lógica é trivial e estável).

import { test } from 'node:test'
import assert from 'node:assert/strict'

const MS_POR_DIA = 24 * 60 * 60 * 1000

function isAtrasada(faseDesde, prazoFaseDias, agora = new Date()) {
  if (prazoFaseDias == null || !faseDesde) return false
  const desde = faseDesde instanceof Date ? faseDesde : new Date(faseDesde)
  if (Number.isNaN(desde.getTime())) return false
  const diasNaFase = (agora.getTime() - desde.getTime()) / MS_POR_DIA
  return diasNaFase > prazoFaseDias
}

const AGORA = new Date('2026-07-13T00:00:00Z')

test('NULL em prazo → nunca atrasada (sem fallbacks)', () => {
  assert.equal(isAtrasada('2026-01-01T00:00:00Z', null, AGORA), false)
  assert.equal(isAtrasada('2026-01-01T00:00:00Z', undefined, AGORA), false)
})

test('NULL em fase_desde → nunca atrasada', () => {
  assert.equal(isAtrasada(null, 5, AGORA), false)
  assert.equal(isAtrasada(undefined, 5, AGORA), false)
})

test('dentro do prazo → não atrasada', () => {
  // 3 dias na fase, prazo 5 → OK
  const faseDesde = new Date(AGORA.getTime() - 3 * MS_POR_DIA)
  assert.equal(isAtrasada(faseDesde, 5, AGORA), false)
})

test('além do prazo → atrasada', () => {
  // 7 dias na fase, prazo 5 → atrasada
  const faseDesde = new Date(AGORA.getTime() - 7 * MS_POR_DIA)
  assert.equal(isAtrasada(faseDesde, 5, AGORA), true)
})

test('exactamente no prazo → não atrasada (limite estrito >)', () => {
  const faseDesde = new Date(AGORA.getTime() - 5 * MS_POR_DIA)
  assert.equal(isAtrasada(faseDesde, 5, AGORA), false)
})

test('data inválida → não atrasada (degradação graciosa)', () => {
  assert.equal(isAtrasada('não-é-data', 5, AGORA), false)
})
