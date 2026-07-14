// Testes dos helpers de validação/cálculo do financeiro — story 2.6.
// Cobrem: moeda ISO 4217 (reutilizada do catálogo), cálculo de contravalor AOA,
// validação de registo e factura, e totais POR MOEDA (nunca mistura moedas).
//
// Correr: node --test tests/financeiro-validation.test.mjs
// (o módulo é TypeScript; corre com --experimental-strip-types já no script `test`).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidCurrency,
  calcularContravalorAoa,
  validateFinanceiro,
  validateFactura,
  totaisPorMoeda,
} from '../src/lib/financeiro-validation.ts'

// ── Moeda (REUSE do catálogo) ─────────────────────────────────────
test('moeda: 3 letras maiúsculas é válida; minúsculas/tamanho errado não', () => {
  assert.equal(isValidCurrency('EUR'), true)
  assert.equal(isValidCurrency('USD'), true)
  assert.equal(isValidCurrency('ZAR'), true)
  assert.equal(isValidCurrency('usd'), false)
  assert.equal(isValidCurrency('EU'), false)
  assert.equal(isValidCurrency('EURO'), false)
})

// ── Cálculo de contravalor AOA ────────────────────────────────────
test('contravalor: valor × taxa, arredondado a 2 casas', () => {
  assert.equal(calcularContravalorAoa(1000, 950), 950000)
  assert.equal(calcularContravalorAoa(100.5, 950.25), Math.round(100.5 * 950.25 * 100) / 100)
})

test('contravalor: sem valor ou sem taxa devolve null (NUNCA fallback)', () => {
  assert.equal(calcularContravalorAoa(null, 950), null)
  assert.equal(calcularContravalorAoa(1000, null), null)
  assert.equal(calcularContravalorAoa(undefined, undefined), null)
  assert.equal(calcularContravalorAoa(NaN, 950), null)
  assert.equal(calcularContravalorAoa(1000, NaN), null)
})

// ── validateFinanceiro ────────────────────────────────────────────
test('validateFinanceiro: registo válido não tem erros', () => {
  const errs = validateFinanceiro({ tipo: 'honorario', valor: 5000, currency: 'EUR', percentagem: null })
  assert.deepEqual(errs, {})
})

test('validateFinanceiro: comissão com % válida não tem erros', () => {
  const errs = validateFinanceiro({ tipo: 'comissao', valor: 3000, currency: 'USD', percentagem: 12.5 })
  assert.deepEqual(errs, {})
})

test('validateFinanceiro: tipo inválido, moeda má, valor em falta e % fora de gama acumulam erros', () => {
  const errs = validateFinanceiro({ tipo: 'despesa', valor: null, currency: 'usd', percentagem: 150 })
  assert.ok(errs.tipo)
  assert.ok(errs.valor)
  assert.ok(errs.currency)
  assert.ok(errs.percentagem)
})

test('validateFinanceiro: moeda obrigatória (vazia é erro, ao contrário do catálogo)', () => {
  const errs = validateFinanceiro({ tipo: 'honorario', valor: 100, currency: '' })
  assert.ok(errs.currency)
})

// ── validateFactura ───────────────────────────────────────────────
test('validateFactura: factura válida não tem erros', () => {
  const errs = validateFactura({ valor: 5000, currency: 'EUR', vencimento: '2026-08-01' })
  assert.deepEqual(errs, {})
})

test('validateFactura: sem vencimento, moeda má e sem valor acumulam erros', () => {
  const errs = validateFactura({ valor: null, currency: 'eur', vencimento: '' })
  assert.ok(errs.valor)
  assert.ok(errs.currency)
  assert.ok(errs.vencimento)
})

// ── totaisPorMoeda: NUNCA mistura moedas ──────────────────────────
test('totaisPorMoeda: segrega por moeda e nunca soma moedas diferentes', () => {
  const t = totaisPorMoeda([
    { valor: 1000, currency: 'EUR', contravalor_aoa: 950000 },
    { valor: 500, currency: 'EUR', contravalor_aoa: 475000 },
    { valor: 200, currency: 'USD', contravalor_aoa: 190000 },
  ])
  assert.equal(t.porMoeda.EUR, 1500)
  assert.equal(t.porMoeda.USD, 200)
  // as moedas ficam em chaves distintas — nada mistura
  assert.deepEqual(Object.keys(t.porMoeda).sort(), ['EUR', 'USD'])
})

test('totaisPorMoeda: só contravalor_aoa agrega em AOA (trans-moeda)', () => {
  const t = totaisPorMoeda([
    { valor: 1000, currency: 'EUR', contravalor_aoa: 950000 },
    { valor: 200, currency: 'USD', contravalor_aoa: 190000 },
  ])
  assert.equal(t.totalAoa, 1140000)
  assert.equal(t.comContravalor, 2)
  assert.equal(t.semContravalor, 0)
})

test('totaisPorMoeda: registos sem contravalor não contam para o AOA', () => {
  const t = totaisPorMoeda([
    { valor: 1000, currency: 'EUR', contravalor_aoa: 950000 },
    { valor: 300, currency: 'GBP', contravalor_aoa: null },
  ])
  assert.equal(t.totalAoa, 950000)
  assert.equal(t.comContravalor, 1)
  assert.equal(t.semContravalor, 1)
  // mas o valor em GBP ainda entra no total por moeda
  assert.equal(t.porMoeda.GBP, 300)
})

test('totaisPorMoeda: lista vazia devolve zeros', () => {
  const t = totaisPorMoeda([])
  assert.deepEqual(t.porMoeda, {})
  assert.equal(t.totalAoa, 0)
  assert.equal(t.comContravalor, 0)
  assert.equal(t.semContravalor, 0)
})
