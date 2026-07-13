// Testes dos helpers de validação do catálogo — story 2.2.
// Cobrem: moeda ISO 4217 (^[A-Z]{3}$) e faixa min<=max.
//
// Correr: node --test tests/catalogo-validation.test.mjs
//
// Nota: o módulo é TypeScript; corremos com --experimental-strip-types
// (já configurado no script `test` do package.json).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidCurrency,
  isValidRange,
  validatePrograma,
  validateDestino,
} from '../src/lib/catalogo-validation.ts'

// ── Moeda ─────────────────────────────────────────────────────────
test('moeda: 3 letras maiúsculas é válida', () => {
  assert.equal(isValidCurrency('EUR'), true)
  assert.equal(isValidCurrency('USD'), true)
  assert.equal(isValidCurrency('GBP'), true)
  assert.equal(isValidCurrency('ZAR'), true)
})

test('moeda: vazia/null/undefined é válida (campo opcional)', () => {
  assert.equal(isValidCurrency(''), true)
  assert.equal(isValidCurrency(null), true)
  assert.equal(isValidCurrency(undefined), true)
})

test('moeda: minúsculas, tamanho errado ou dígitos são inválidos', () => {
  assert.equal(isValidCurrency('eur'), false)
  assert.equal(isValidCurrency('EU'), false)
  assert.equal(isValidCurrency('EURO'), false)
  assert.equal(isValidCurrency('E1R'), false)
  assert.equal(isValidCurrency('123'), false)
  assert.equal(isValidCurrency('Eur'), false)
})

// ── Faixa min<=max ────────────────────────────────────────────────
test('faixa: min < max é válida', () => {
  assert.equal(isValidRange(1600, 2000), true)
})

test('faixa: min == max é válida', () => {
  assert.equal(isValidRange(5000, 5000), true)
})

test('faixa: min > max é inválida', () => {
  assert.equal(isValidRange(2000, 1600), false)
})

test('faixa: extremo aberto (null/undefined) é válido', () => {
  assert.equal(isValidRange(null, 2000), true)
  assert.equal(isValidRange(1600, null), true)
  assert.equal(isValidRange(null, null), true)
  assert.equal(isValidRange(undefined, undefined), true)
})

test('faixa: NaN é inválido', () => {
  assert.equal(isValidRange(NaN, 2000), false)
  assert.equal(isValidRange(1600, NaN), false)
})

// ── validatePrograma ──────────────────────────────────────────────
test('validatePrograma: programa válido não tem erros', () => {
  const errs = validatePrograma({ nome: 'Foundation', currency: 'EUR', custo_min: 18000, custo_max: 35000 })
  assert.deepEqual(errs, {})
})

test('validatePrograma: nome vazio, moeda má e min>max acumulam erros', () => {
  const errs = validatePrograma({ nome: '', currency: 'eur', custo_min: 100, custo_max: 50 })
  assert.ok(errs.nome)
  assert.ok(errs.currency)
  assert.ok(errs.custo_max)
})

// ── validateDestino ───────────────────────────────────────────────
test('validateDestino: país obrigatório e moeda validada', () => {
  assert.deepEqual(validateDestino({ pais: 'Portugal', custo_vida_currency: 'EUR' }), {})
  const errs = validateDestino({ pais: '', custo_vida_currency: 'eur' })
  assert.ok(errs.pais)
  assert.ok(errs.custo_vida_currency)
})
