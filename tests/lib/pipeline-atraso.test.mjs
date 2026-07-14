import test from 'node:test'
import assert from 'node:assert/strict'
import { isAtrasada, diasNaFase } from '../../src/lib/pipeline-atraso.ts'

const AGORA = new Date('2026-07-13T12:00:00.000Z')
const diasAtras = (n) => new Date(AGORA.getTime() - n * 24 * 60 * 60 * 1000)

test('isAtrasada: prazo NULL nunca sinaliza (sem valores inventados)', () => {
  // 100 dias na fase, mas sem prazo definido → nunca atrasada.
  assert.equal(isAtrasada(diasAtras(100), null, AGORA), false)
  assert.equal(isAtrasada(diasAtras(100), undefined, AGORA), false)
})

test('isAtrasada: fase_desde NULL nunca sinaliza', () => {
  assert.equal(isAtrasada(null, 5, AGORA), false)
  assert.equal(isAtrasada(undefined, 5, AGORA), false)
})

test('isAtrasada: dentro do prazo → não atrasada', () => {
  // 3 dias na fase, prazo 5 → dentro.
  assert.equal(isAtrasada(diasAtras(3), 5, AGORA), false)
})

test('isAtrasada: além do prazo → atrasada', () => {
  // 7 dias na fase, prazo 5 → atrasada.
  assert.equal(isAtrasada(diasAtras(7), 5, AGORA), true)
})

test('isAtrasada: exactamente no prazo → não atrasada (estritamente maior)', () => {
  // 5 dias exactos, prazo 5 → NÃO atrasada (regra: > , não >=).
  assert.equal(isAtrasada(diasAtras(5), 5, AGORA), false)
})

test('isAtrasada: prazo 0 sinaliza logo que passa qualquer tempo', () => {
  assert.equal(isAtrasada(diasAtras(1), 0, AGORA), true)
})

test('isAtrasada: data inválida nunca sinaliza', () => {
  assert.equal(isAtrasada('data-invalida', 5, AGORA), false)
})

test('isAtrasada: aceita string ISO', () => {
  assert.equal(isAtrasada(diasAtras(10).toISOString(), 5, AGORA), true)
})

test('diasNaFase: conta dias inteiros', () => {
  assert.equal(diasNaFase(diasAtras(3), AGORA), 3)
  assert.equal(diasNaFase(diasAtras(0), AGORA), 0)
})

test('diasNaFase: NULL devolve null', () => {
  assert.equal(diasNaFase(null, AGORA), null)
  assert.equal(diasNaFase('data-invalida', AGORA), null)
})
