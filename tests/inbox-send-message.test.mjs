// Testes da lógica pura da edge uazapi-send-message (story 3.6, AC3).
//
// Testamos a validação de input e a decisão de pausa (PURO, sem Deno/uazapi/BD).
// A validação ponta-a-ponta (JWT real → uazapi → mensagens_whatsapp → pausa)
// fica PENDENTE de deploy da edge (sessão main).
//
// Correr: node --test tests/inbox-send-message.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  parseSendInput,
  shouldPauseAfterHumanReply,
} from '../supabase/functions/uazapi-send-message/logic.ts'

// ── parseSendInput: contrato { lead_id, message, media_url? } ────────────────

test('parseSendInput: input válido → ok + normalizado', () => {
  const r = parseSendInput({ lead_id: '  abc-123  ', message: '  Olá  ' })
  assert.equal(r.ok, true)
  assert.equal(r.lead_id, 'abc-123')
  assert.equal(r.message, 'Olá')
  assert.equal(r.media_url, null)
})

test('parseSendInput: media_url opcional preservado', () => {
  const r = parseSendInput({ lead_id: 'l1', message: 'foto', media_url: 'https://x/img.jpg' })
  assert.equal(r.media_url, 'https://x/img.jpg')
})

test('parseSendInput: sem lead_id → erro', () => {
  const r = parseSendInput({ message: 'olá' })
  assert.equal(r.ok, false)
  assert.match(r.error, /lead_id/)
})

test('parseSendInput: mensagem vazia → erro', () => {
  const r = parseSendInput({ lead_id: 'l1', message: '   ' })
  assert.equal(r.ok, false)
  assert.match(r.error, /message/)
})

test('parseSendInput: tipos errados → erro (não crasha)', () => {
  const r = parseSendInput({ lead_id: 123, message: { x: 1 } })
  assert.equal(r.ok, false)
})

// ── shouldPauseAfterHumanReply: FR14 (auto_pause_after_human_reply) ──────────

test('pausa: setting ausente (default) + conversa active → pausa', () => {
  assert.equal(shouldPauseAfterHumanReply({}, 'active'), true)
})

test('pausa: auto_pause_after_human_reply=true + active → pausa', () => {
  assert.equal(shouldPauseAfterHumanReply({ auto_pause_after_human_reply: true }, 'active'), true)
})

test('pausa: auto_pause_after_human_reply=false → NÃO pausa', () => {
  assert.equal(shouldPauseAfterHumanReply({ auto_pause_after_human_reply: false }, 'active'), false)
})

test('pausa: conversa fora de horas (paused_by_schedule) → pausa (assume controlo)', () => {
  assert.equal(shouldPauseAfterHumanReply({}, 'paused_by_schedule'), true)
})

test('pausa: conversa já transferida → NÃO re-pausa', () => {
  assert.equal(shouldPauseAfterHumanReply({}, 'transferred'), false)
})

test('pausa: conversa já paused_by_human → NÃO re-pausa', () => {
  assert.equal(shouldPauseAfterHumanReply({}, 'paused_by_human'), false)
})

test('pausa: conversa completed → NÃO pausa', () => {
  assert.equal(shouldPauseAfterHumanReply({}, 'completed'), false)
})
