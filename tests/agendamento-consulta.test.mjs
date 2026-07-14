// Testes do agendamento da Consulta de Orientação (story 3.5).
//
// Testamos LÓGICA PURA em TS (sem Deno/URL, sem Google, sem supabase):
//   - scheduling.ts → parseWindows / generateSlots / validateChosenSlot /
//     formatSlotLabel / buildSlotsMessage / tzOffsetMinutes / localToUtc
//   - reminders.ts  → isDueForReminder / buildReminderMessage
//
// Relógio SIMULADO: `now` é injectado em todas as funções (nenhuma lê Date.now
// internamente nos caminhos testados). Datas de referência em Africa/Luanda (UTC+1):
//   2026-07-13 = SEGUNDA · 14=terça · 15=quarta · 16=quinta.
// As janelas placeholder são ter(2)/qua(3)/qui(4) 14:00–17:00, buffer 15, dur 45.
//
// A validação ponta-a-ponta (FreeBusy real do Google → evento → consultations →
// lembrete WhatsApp) fica PENDENTE da ligação das credenciais do Rinaldo e do
// deploy da edge `gm-agent` (sessão main).
//
// Correr: node --test tests/agendamento-consulta.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  parseWindows,
  generateSlots,
  validateChosenSlot,
  formatSlotLabel,
  buildSlotsMessage,
  tzOffsetMinutes,
  localToUtc,
  utcToLocalParts,
  PLACEHOLDER_WINDOWS,
} from '../supabase/functions/gm-agent/scheduling.ts'

import {
  isDueForReminder,
  buildReminderMessage,
} from '../supabase/functions/gm-agent/reminders.ts'

const TZ = 'Africa/Luanda'
// Segunda 2026-07-13 08:00 Luanda = 07:00 UTC.
const NOW = new Date('2026-07-13T07:00:00Z')

// ── Fuso: Africa/Luanda é UTC+1 (sem DST) ────────────────────────────────────

test('tzOffsetMinutes: Africa/Luanda = +60', () => {
  assert.equal(tzOffsetMinutes(TZ, NOW), 60)
})

test('localToUtc/utcToLocalParts: round-trip de 14:00 local terça', () => {
  // 14:00 Luanda de terça 14/07 → 13:00 UTC.
  const utc = localToUtc(TZ, 2026, 7, 14, 14, 0)
  assert.equal(utc.toISOString(), '2026-07-14T13:00:00.000Z')
  const lp = utcToLocalParts(TZ, utc)
  assert.equal(lp.h, 14)
  assert.equal(lp.d, 14)
  assert.equal(lp.dow, 2) // terça
})

// ── parseWindows: placeholder + validação ────────────────────────────────────

test('parseWindows: raw vazio → placeholder', () => {
  const cfg = parseWindows(undefined)
  assert.equal(cfg.timezone, 'Africa/Luanda')
  assert.equal(cfg.windows.length, 3)
  assert.deepEqual(cfg.windows.map((w) => w.dia), [2, 3, 4])
})

test('parseWindows: windows malformadas → cai no placeholder', () => {
  const cfg = parseWindows({ windows: [{ dia: 99, inicio: 'x' }], buffer_minutos: 10 })
  assert.equal(cfg.windows.length, PLACEHOLDER_WINDOWS.windows.length)
})

test('parseWindows: config válida do Rinaldo é respeitada', () => {
  const cfg = parseWindows({
    windows: [{ dia: 1, inicio: '09:00', fim: '12:00' }],
    buffer_minutos: 30,
    duracao_minutos: 60,
    timezone: 'Africa/Luanda',
    horizonte_dias: 7,
  })
  assert.equal(cfg.windows.length, 1)
  assert.equal(cfg.windows[0].dia, 1)
  assert.equal(cfg.buffer_minutos, 30)
  assert.equal(cfg.duracao_minutos, 60)
  assert.equal(cfg.horizonte_dias, 7)
})

// ── generateSlots: agenda livre → primeiros slots futuros nas janelas ────────

test('generateSlots: agenda vazia → 3 slots, todos futuros e em janela', () => {
  const cfg = parseWindows(undefined)
  const slots = generateSlots(cfg, [], NOW, 3)
  assert.equal(slots.length, 3)
  for (const s of slots) {
    const t = Date.parse(s.iso)
    assert.ok(t > NOW.getTime(), 'slot deve ser futuro')
    const lp = utcToLocalParts(TZ, new Date(s.iso))
    assert.ok([2, 3, 4].includes(lp.dow), 'slot deve cair em ter/qua/qui')
    assert.ok(lp.h >= 14 && lp.h < 17, 'slot dentro de 14:00–17:00')
  }
  // Primeiro slot livre: terça 14/07 14:00 (Luanda) = 13:00 UTC.
  assert.equal(slots[0].iso, '2026-07-14T13:00:00.000Z')
})

test('generateSlots (ANTI-PASSADO): nenhum slot antes de now', () => {
  const cfg = parseWindows(undefined)
  // now = quinta 16/07 15:30 Luanda (14:30 UTC) → o slot das 14:00 já passou.
  const now = new Date('2026-07-16T14:30:00Z')
  const slots = generateSlots(cfg, [], now, 3)
  assert.ok(slots.length >= 1)
  for (const s of slots) {
    assert.ok(Date.parse(s.iso) > now.getTime(), `slot ${s.iso} não pode estar no passado`)
  }
  // O 1º slot de quinta (14:00, já passado às 15:30) é saltado; o próximo slot
  // desse mesmo dia é 14:45 — também já passado — logo o 1º proposto tem de ser
  // estritamente depois de now.
  assert.ok(Date.parse(slots[0].iso) > now.getTime())
})

test('generateSlots: ocupação FreeBusy remove o slot colidido (com buffer)', () => {
  const cfg = parseWindows(undefined)
  // Ocupa terça 14/07 das 14:00 às 14:30 (Luanda) = 13:00–13:30 UTC.
  const busy = [{ start: '2026-07-14T13:00:00Z', end: '2026-07-14T13:30:00Z' }]
  const slots = generateSlots(cfg, busy, NOW, 3)
  // O slot das 14:00 (13:00 UTC) tem de desaparecer (colide + buffer 15).
  assert.ok(!slots.some((s) => s.iso === '2026-07-14T13:00:00.000Z'))
  // Mas continua a haver slots livres.
  assert.ok(slots.length >= 2)
})

test('generateSlots: agenda totalmente ocupada nas janelas → 0 slots (mensagem honesta)', () => {
  const cfg = parseWindows({
    windows: [{ dia: 2, inicio: '14:00', fim: '15:00' }], // só 1 slot de 45m possível na terça
    buffer_minutos: 15,
    duracao_minutos: 45,
    timezone: TZ,
    horizonte_dias: 1, // só olha para amanhã (terça 14)
  })
  const busy = [{ start: '2026-07-14T12:00:00Z', end: '2026-07-14T16:00:00Z' }] // cobre tudo
  const slots = generateSlots(cfg, busy, NOW, 3)
  assert.equal(slots.length, 0)
  const msg = buildSlotsMessage(slots, TZ, 'pt')
  assert.match(msg, /consultor/i) // oferece handoff
})

// ── buildSlotsMessage: fuso SEMPRE explícito ─────────────────────────────────

test('buildSlotsMessage: inclui fuso explícito (hora de Luanda) e o ISO', () => {
  const cfg = parseWindows(undefined)
  const slots = generateSlots(cfg, [], NOW, 2)
  const msg = buildSlotsMessage(slots, TZ, 'pt')
  assert.match(msg, /hora de Luanda/)
  assert.match(msg, /ISO:/)
})

test('buildSlotsMessage EN: timezone em inglês', () => {
  const cfg = parseWindows(undefined)
  const slots = generateSlots(cfg, [], NOW, 2)
  const msg = buildSlotsMessage(slots, TZ, 'en')
  assert.match(msg, /Luanda time/)
})

// ── validateChosenSlot: futuro + dentro da janela ────────────────────────────

test('validateChosenSlot: slot futuro numa janela → ok', () => {
  const cfg = parseWindows(undefined)
  const v = validateChosenSlot(cfg, '2026-07-14T13:00:00Z', NOW) // terça 14:00 Luanda
  assert.equal(v.ok, true)
  assert.equal(v.iso, '2026-07-14T13:00:00.000Z')
})

test('validateChosenSlot (ANTI-PASSADO): ontem → rejeitado com reason=past', () => {
  const cfg = parseWindows(undefined)
  const v = validateChosenSlot(cfg, '2026-07-12T13:00:00Z', NOW) // domingo passado
  assert.equal(v.ok, false)
  assert.equal(v.reason, 'past')
})

test('validateChosenSlot: dia fora das janelas (segunda) → out_of_window', () => {
  const cfg = parseWindows(undefined)
  // Segunda seguinte 20/07 14:00 Luanda — dia 1 não está nas janelas (2,3,4).
  const v = validateChosenSlot(cfg, '2026-07-20T13:00:00Z', NOW)
  assert.equal(v.ok, false)
  assert.equal(v.reason, 'out_of_window')
})

test('validateChosenSlot: hora fora da janela (18:00) → out_of_window', () => {
  const cfg = parseWindows(undefined)
  // Terça 14/07 18:00 Luanda (17:00 UTC) — fora de 14:00–17:00.
  const v = validateChosenSlot(cfg, '2026-07-14T17:00:00Z', NOW)
  assert.equal(v.ok, false)
  assert.equal(v.reason, 'out_of_window')
})

test('validateChosenSlot: ISO inválido → reason=invalid', () => {
  const cfg = parseWindows(undefined)
  const v = validateChosenSlot(cfg, 'amanhã às 3', NOW)
  assert.equal(v.ok, false)
  assert.equal(v.reason, 'invalid')
})

// ── formatSlotLabel: rótulo humano no fuso ───────────────────────────────────

test('formatSlotLabel: terça 14/07 14:00 Luanda', () => {
  const label = formatSlotLabel(TZ, new Date('2026-07-14T13:00:00Z'))
  assert.match(label, /terça 14\/07, 14h00/)
})

// ── reminders: lembrete D-1 idempotente ──────────────────────────────────────

function consultation(overrides = {}) {
  return {
    id: 'c1',
    lead_id: 'l1',
    scheduled_at: '2026-07-14T13:00:00Z', // terça 14:00 Luanda
    timezone: TZ,
    estado: 'agendada',
    lembrete_24h_enviado: false,
    ...overrides,
  }
}

test('isDueForReminder: consulta a <24h, não lembrada, agendada → true', () => {
  // now = segunda 13/07 15:00 UTC → faltam ~22h para a consulta (terça 13:00 UTC).
  const now = new Date('2026-07-13T15:00:00Z')
  assert.equal(isDueForReminder(consultation(), now), true)
})

test('isDueForReminder (IDEMPOTÊNCIA): já lembrada → false', () => {
  const now = new Date('2026-07-13T15:00:00Z')
  assert.equal(isDueForReminder(consultation({ lembrete_24h_enviado: true }), now), false)
})

test('isDueForReminder: consulta a >24h → false (ainda cedo)', () => {
  // now = domingo 12/07 12:00 UTC → faltam >24h.
  const now = new Date('2026-07-12T12:00:00Z')
  assert.equal(isDueForReminder(consultation(), now), false)
})

test('isDueForReminder: consulta no passado → false', () => {
  const now = new Date('2026-07-14T14:00:00Z') // já depois da consulta
  assert.equal(isDueForReminder(consultation(), now), false)
})

test('isDueForReminder: estado cancelada → false', () => {
  const now = new Date('2026-07-13T15:00:00Z')
  assert.equal(isDueForReminder(consultation({ estado: 'cancelada' }), now), false)
})

test('buildReminderMessage: menciona amanhã + fuso explícito', () => {
  const msg = buildReminderMessage(consultation(), 'pt')
  assert.match(msg, /amanhã/)
  assert.match(msg, /hora de Luanda/)
  assert.match(msg, /14h00/)
})

test('buildReminderMessage EN: tomorrow + Luanda time', () => {
  const msg = buildReminderMessage(consultation(), 'en')
  assert.match(msg, /tomorrow/)
  assert.match(msg, /Luanda time/)
})
