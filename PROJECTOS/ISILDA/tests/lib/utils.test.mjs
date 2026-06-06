import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from '../../src/lib/utils.ts'

test('formatCurrency devolve valor em kwanzas com separador local', () => {
  const formatted = formatCurrency(1500)

  assert.match(formatted, /1[\s\u00A0]500 Kz/)
})

test('formatDate devolve data no formato pt-AO', () => {
  assert.equal(formatDate('2026-06-01T10:00:00.000Z'), '01/06/2026')
})

test('formatRelativeTime devolve minutos para datas recentes', () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  assert.equal(formatRelativeTime(thirtyMinutesAgo), 'ha 30 min')
})

test('formatRelativeTime devolve horas e dias para datas mais antigas', () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  assert.equal(formatRelativeTime(twoHoursAgo), 'ha 2h')
  assert.equal(formatRelativeTime(threeDaysAgo), 'ha 3d')
})
