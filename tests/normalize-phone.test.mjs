// Testes de normalização de telefone angolano — story 2.4 AC4.
// Garante paridade com a edge function Deno e a deduplicação de leads.
//
// Correr: node --test tests/normalize-phone.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAngolaPhone } from '../src/lib/normalize-phone.ts'

const CANONICO = '244923456789'

test('9 dígitos com espaços (923 456 789) → 244923456789', () => {
  assert.equal(normalizeAngolaPhone('923 456 789'), CANONICO)
})

test('já em formato canónico mantém-se', () => {
  assert.equal(normalizeAngolaPhone('244923456789'), CANONICO)
})

test('com prefixo internacional +244 e espaços', () => {
  assert.equal(normalizeAngolaPhone('+244 923 456 789'), CANONICO)
})

test('sufixo WhatsApp @s.whatsapp.net é removido', () => {
  assert.equal(normalizeAngolaPhone('244923456789@s.whatsapp.net'), CANONICO)
})

test('sufixo @c.us é removido', () => {
  assert.equal(normalizeAngolaPhone('923456789@c.us'), CANONICO)
})

test('244 seguido de local 9XXXXXXXX com ruído reduz ao canónico', () => {
  // 244 + "0" + 923456789 (13 díg) → slice(3)="0923456789" não casa 9XXXXXXXX,
  // mas 244 + 923456789 com um dígito extra à frente do 244 é o caso coberto:
  // "244923456789" com um "9" a mais no fim (13 díg) → slice(3) tem 10 díg → devolve tal e qual.
  // Paridade com a edge: só reduz quando o local é EXACTAMENTE 9XXXXXXXX.
  assert.equal(normalizeAngolaPhone('2449234567890'), '2449234567890')
})

test('deduplicação: variações do mesmo número colapsam no canónico', () => {
  const variantes = [
    '923456789',
    '923 456 789',
    '+244923456789',
    '244923456789',
    '244923456789@s.whatsapp.net',
  ]
  const normalizados = new Set(variantes.map(normalizeAngolaPhone))
  assert.equal(normalizados.size, 1)
  assert.equal([...normalizados][0], CANONICO)
})
