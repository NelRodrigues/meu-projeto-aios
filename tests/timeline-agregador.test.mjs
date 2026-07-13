// Testes do agregador de timeline unificada — story 2.4 AC3.
// Cobrem: ordenação cronológica (desc), merge das 3 fontes com tipo
// discriminado, e degradação graciosa (fonte vazia/nula não quebra).
// Inclui também a validação de item de documento (estado fora do enum rejeitado).
//
// Correr: node --test tests/timeline-agregador.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agregarTimeline } from '../src/lib/timeline-agregador.ts'
import {
  validarItemDocumento,
  mudarEstadoDocumento,
  normalizarDocumentos,
  isEstadoValido,
} from '../src/lib/documentos.ts'

// ── Fixtures ──────────────────────────────────────────────────────
const interacoes = [
  { id: 'i1', created_at: '2026-07-10T10:00:00Z', tipo: 'nota', conteudo: 'Ligou hoje' },
]
const mudancas = [
  { id: 'm1', created_at: '2026-07-12T09:00:00Z', estagio_anterior: 'lead', estagio_novo: 'qualificado' },
]
const mensagens = [
  { id: 'w1', created_at: '2026-07-11T08:00:00Z', sender_type: 'cliente', conteudo: 'Olá', direction: 'incoming' },
  { id: 'w2', created_at: '2026-07-13T15:00:00Z', sender_type: 'humano', conteudo: 'Bom dia', direction: 'outgoing' },
]

// ── Ordenação cronológica ─────────────────────────────────────────
test('timeline: ordena do mais recente para o mais antigo', () => {
  const eventos = agregarTimeline({
    interacoes,
    mudancasEstagio: mudancas,
    mensagensWhatsApp: mensagens,
  })
  const timestamps = eventos.map((e) => e.timestamp)
  const ordenado = [...timestamps].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  assert.deepEqual(timestamps, ordenado)
  // O mais recente é a mensagem w2 (13 Jul 15h)
  assert.equal(eventos[0].id, 'mensagem_whatsapp:w2')
})

// ── Merge das 3 fontes ────────────────────────────────────────────
test('timeline: junta as 3 fontes com o tipo discriminado', () => {
  const eventos = agregarTimeline({
    interacoes,
    mudancasEstagio: mudancas,
    mensagensWhatsApp: mensagens,
  })
  assert.equal(eventos.length, 4)
  const fontes = new Set(eventos.map((e) => e.fonte))
  assert.ok(fontes.has('interacao'))
  assert.ok(fontes.has('mudanca_estagio'))
  assert.ok(fontes.has('mensagem_whatsapp'))
})

test('timeline: mensagem incoming vs outgoing têm títulos distintos', () => {
  const eventos = agregarTimeline({ mensagensWhatsApp: mensagens })
  const recebida = eventos.find((e) => e.id === 'mensagem_whatsapp:w1')
  const enviada = eventos.find((e) => e.id === 'mensagem_whatsapp:w2')
  assert.equal(recebida.titulo, 'Mensagem recebida')
  assert.equal(enviada.titulo, 'Mensagem enviada')
})

// ── Degradação graciosa ───────────────────────────────────────────
test('timeline: fonte vazia não quebra', () => {
  const eventos = agregarTimeline({ interacoes: [], mudancasEstagio: [], mensagensWhatsApp: [] })
  assert.deepEqual(eventos, [])
})

test('timeline: fonte nula/ausente não quebra', () => {
  const eventos = agregarTimeline({
    interacoes: null,
    mensagensWhatsApp: mensagens,
    // mudancasEstagio ausente de propósito
  })
  assert.equal(eventos.length, 2)
  assert.equal(eventos[0].id, 'mensagem_whatsapp:w2')
})

test('timeline: input totalmente vazio devolve []', () => {
  assert.deepEqual(agregarTimeline({}), [])
})

// ── Validação de item de documento ────────────────────────────────
test('documento: estado dentro do enum é aceite', () => {
  assert.deepEqual(validarItemDocumento({ tipo: 'Passaporte', estado: 'validado' }), { ok: true })
})

test('documento: estado fora do enum é rejeitado', () => {
  const r = validarItemDocumento({ tipo: 'Passaporte', estado: 'aprovado' })
  assert.equal(r.ok, false)
  assert.match(r.erro, /Estado inválido/)
})

test('documento: tipo vazio é rejeitado', () => {
  const r = validarItemDocumento({ tipo: '  ', estado: 'recebido' })
  assert.equal(r.ok, false)
})

test('documento: isEstadoValido só aceita os 4 valores do enum', () => {
  assert.equal(isEstadoValido('em_falta'), true)
  assert.equal(isEstadoValido('recebido'), true)
  assert.equal(isEstadoValido('validado'), true)
  assert.equal(isEstadoValido('rejeitado'), true)
  assert.equal(isEstadoValido('pendente'), false)
  assert.equal(isEstadoValido(null), false)
})

test('documento: mudarEstado actualiza estado e updated_at, sem mutar original', () => {
  const docs = [
    { tipo: 'Passaporte', estado: 'em_falta', url: null, updated_at: '2026-01-01T00:00:00Z' },
  ]
  const novo = mudarEstadoDocumento(docs, 0, 'recebido', '2026-07-13T12:00:00Z')
  assert.equal(novo[0].estado, 'recebido')
  assert.equal(novo[0].updated_at, '2026-07-13T12:00:00Z')
  // original intacto
  assert.equal(docs[0].estado, 'em_falta')
})

test('documento: mudarEstado lança para estado inválido', () => {
  const docs = [{ tipo: 'Passaporte', estado: 'em_falta', url: null, updated_at: '2026-01-01T00:00:00Z' }]
  assert.throws(() => mudarEstadoDocumento(docs, 0, 'aprovado'), /Estado inválido/)
})

test('documento: normalizarDocumentos ignora malformados e cai para em_falta', () => {
  const raw = [
    { tipo: 'Passaporte', estado: 'validado', url: 'https://x/p.pdf', updated_at: '2026-01-01T00:00:00Z' },
    { tipo: 'Certificado', estado: 'estado_x' }, // estado inválido → em_falta
    { estado: 'recebido' }, // sem tipo → ignorado
    'lixo', // não-objecto → ignorado
  ]
  const out = normalizarDocumentos(raw)
  assert.equal(out.length, 2)
  assert.equal(out[0].estado, 'validado')
  assert.equal(out[1].estado, 'em_falta')
})
