// Testes do pipeline de importação de Excels — story 2.5.
// node --test tests/importacao-pipeline.test.mjs
//
// ⚠ Os 3 Excels reais do cliente (Ficha de Estudante, acompanhamento, GEA) NÃO
// estão em disco — a importação REAL é GATE HUMANO (ver docs/importacao-
// mapeamento-excels.md). Estes testes usam FIXTURES SINTÉTICAS e validam a
// lógica pura do pipeline (dedup, estado→fase, tag de revisão, idempotência).
//
// Padrão da casa: node:test não executa TypeScript; a lógica pura é reimplementada
// aqui em espelho ao src/lib/importacao/*.ts (lógica trivial e estável).

import { test } from 'node:test'
import assert from 'node:assert/strict'

// ── espelho de mapeamento.ts ────────────────────────────────────────────────
const MAPA_ESTADO_FASE = {
  lead: 'lead', novo: 'lead', contacto: 'lead',
  qualificado: 'qualificado', interessado: 'qualificado',
  'consulta agendada': 'consulta_agendada', reuniao: 'consulta_agendada',
  'proposta enviada': 'proposta_enviada', proposta: 'proposta_enviada',
  formalizacao: 'formalizacao_pagamento', pagamento: 'formalizacao_pagamento', matriculado: 'formalizacao_pagamento',
  'candidatura submetida': 'candidatura_submetida', submetido: 'candidatura_submetida',
  'em curso': 'em_curso', ativo: 'em_curso', activo: 'em_curso', acompanhamento: 'em_curso',
  concluido: 'concluido', finalizado: 'concluido',
}
const FASES_PROCESSO_ACTIVO = new Set(['formalizacao_pagamento', 'candidatura_submetida', 'em_curso'])

function normalizarEstado(estado) {
  return estado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}
function mapearEstadoParaFase(estado) {
  if (!estado || !estado.trim()) return { fase: null, processo_em_curso: false }
  const fase = MAPA_ESTADO_FASE[normalizarEstado(estado)] ?? null
  return { fase, processo_em_curso: fase !== null && FASES_PROCESSO_ACTIVO.has(fase) }
}

// ── espelho de normalize-phone (Angola) ─────────────────────────────────────
function normalizarTelefone(raw) {
  if (!raw) return null
  const d = String(raw).split('@')[0].replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('244') && d.length >= 12) return d.slice(0, 12)
  if (d.length === 9) return '244' + d
  if (d.length >= 9) return '244' + d.slice(-9)
  return null
}

// ── chave de dedup (telefone normalizado, fallback email) ───────────────────
function chaveDedup(tel, email) {
  const t = normalizarTelefone(tel)
  if (t) return `tel:${t}`
  if (email && email.includes('@')) return `email:${email.toLowerCase().trim()}`
  return null // sem contacto → revisão
}

// ── testes ──────────────────────────────────────────────────────────────────

test('estado → fase: acentos e maiúsculas normalizados', () => {
  assert.equal(mapearEstadoParaFase('Em Curso').fase, 'em_curso')
  assert.equal(mapearEstadoParaFase('ACTIVO').fase, 'em_curso')
  assert.equal(mapearEstadoParaFase('Consulta Agendada').fase, 'consulta_agendada')
})

test('estado desconhecido/vazio → fase null (revisão, não inventa)', () => {
  assert.equal(mapearEstadoParaFase('estado-que-nao-existe').fase, null)
  assert.equal(mapearEstadoParaFase('').fase, null)
  assert.equal(mapearEstadoParaFase(null).fase, null)
})

test('processo_em_curso = true só nas fases activas', () => {
  assert.equal(mapearEstadoParaFase('em curso').processo_em_curso, true)
  assert.equal(mapearEstadoParaFase('matriculado').processo_em_curso, true)
  assert.equal(mapearEstadoParaFase('lead').processo_em_curso, false)
  assert.equal(mapearEstadoParaFase('concluido').processo_em_curso, false)
})

test('telefone: 923..., espaços, +244 → 244XXXXXXXXX', () => {
  assert.equal(normalizarTelefone('923 456 789'), '244923456789')
  assert.equal(normalizarTelefone('+244923456789'), '244923456789')
  assert.equal(normalizarTelefone('244 923 456 789'), '244923456789')
})

test('dedup: mesmo telefone em formatos diferentes → mesma chave', () => {
  assert.equal(chaveDedup('923 456 789', null), chaveDedup('+244923456789', null))
})

test('sem telefone válido mas com email → chave por email (não descartado)', () => {
  assert.equal(chaveDedup('', 'ana@exemplo.ao'), 'email:ana@exemplo.ao')
})

test('sem telefone nem email → chave null (marca importacao_rever)', () => {
  assert.equal(chaveDedup('', ''), null)
  assert.equal(chaveDedup(null, null), null)
})

test('idempotência conceptual: dedup colapsa duplicados de 2 ficheiros', () => {
  const linhas = [
    { tel: '923 456 789', email: null }, // ficheiro A
    { tel: '244923456789', email: null }, // ficheiro B — mesmo contacto
    { tel: '911 222 333', email: null }, // outro
  ]
  const chaves = new Set(linhas.map((l) => chaveDedup(l.tel, l.email)))
  assert.equal(chaves.size, 2) // 3 linhas → 2 leads únicos
})
