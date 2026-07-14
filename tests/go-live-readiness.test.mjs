// Suite GO-LIVE-READINESS do agente Global Minds (story 3.7, AC4).
//
// Prova de fogo do E3 antes da validação de 14/07 (NFR7). Integra a lógica PURA
// das stories 3.1–3.7 num só sítio: rate limits, horário, multilingue, opt-out,
// guardrails e escalação D5. NÃO chama Deno/API — só funções puras.
//
// Correr: node --test tests/go-live-readiness.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  isWithinWorkingHours,
  outOfHoursMessage,
  checkLimits,
  limitReachedMessage,
  pauseStateForLimit,
  effectiveLimits,
  luandaIsoWeekday,
} from '../supabase/functions/gm-agent/agent-limits.ts'
import { detectLanguage } from '../supabase/functions/gm-agent/language.ts'
import { resolveEscalation, isConversationalMessage } from '../supabase/functions/gm-agent/escalation.ts'
import { matchFaq } from '../supabase/functions/gm-agent/knowledge.ts'
import { isOptOut } from '../supabase/functions/_shared/opt-out.ts'
import { checkGuardrails } from '../supabase/functions/_shared/llm-client.ts'
import { FORBIDDEN_PHRASES } from '../supabase/functions/gm-agent/prompt.ts'

// Settings de série (§2.3) — os valores que vão a produção.
const SETTINGS = {
  working_hours_start: '08:00',
  working_hours_end: '20:00',
  working_days: [1, 2, 3, 4, 5, 6],
  max_messages_per_conversation: 60,
  cadence_max_messages_per_hour: 50,
  cadence_max_messages_per_day: 60,
}

// ── AC1: RATE LIMITS (60 / 50 / 60) ──────────────────────────────────────────

test('limites de série: 60 conversa / 50 hora / 60 dia', () => {
  assert.deepEqual(effectiveLimits(SETTINGS), { conversation: 60, hour: 50, day: 60 })
})

test('limite de conversa: 59 permite, 60 bloqueia (61ª mensagem)', () => {
  assert.equal(checkLimits(SETTINGS, { conversation: 59, hour: 0, day: 0 }).allowed, true)
  const d = checkLimits(SETTINGS, { conversation: 60, hour: 0, day: 0 })
  assert.equal(d.allowed, false)
  assert.equal(d.hit, 'conversation')
})

test('limite por hora: 49 permite, 50 bloqueia (51ª/hora)', () => {
  assert.equal(checkLimits(SETTINGS, { conversation: 0, hour: 49, day: 0 }).allowed, true)
  const d = checkLimits(SETTINGS, { conversation: 0, hour: 50, day: 0 })
  assert.equal(d.allowed, false)
  assert.equal(d.hit, 'hour')
})

test('limite por dia: 59 permite, 60 bloqueia (61ª/dia)', () => {
  assert.equal(checkLimits(SETTINGS, { conversation: 0, hour: 0, day: 59 }).allowed, true)
  const d = checkLimits(SETTINGS, { conversation: 0, hour: 0, day: 60 })
  assert.equal(d.allowed, false)
  assert.equal(d.hit, 'day')
})

test('prioridade do motivo: conversa antes de dia antes de hora', () => {
  const d = checkLimits(SETTINGS, { conversation: 60, hour: 50, day: 60 })
  assert.equal(d.hit, 'conversation')
})

test('mensagem de limite é digna (nunca silêncio) e comunica em PT/EN', () => {
  assert.match(limitReachedMessage('conversation', 'pt'), /consultor/i)
  assert.match(limitReachedMessage('day', 'en'), /consultant/i)
})

test('pausa por limite: conversa → paused_by_human; cadência → paused_by_human', () => {
  assert.equal(pauseStateForLimit('conversation').status, 'paused_by_human')
  assert.equal(pauseStateForLimit('hour').pause_reason, 'limite_cadencia')
  assert.equal(pauseStateForLimit('conversation').pause_reason, 'limite_conversa')
})

// ── AC2: HORÁRIO 08:00–20:00 (Africa/Luanda), fronteiras ─────────────────────
// Luanda = UTC+1. 08:00 Luanda = 07:00 UTC. Usamos uma TERÇA (2026-07-14).

function luandaAt(hhmmUtc) {
  return new Date(`2026-07-14T${hhmmUtc}:00Z`)
}

test('fronteira 07:59 Luanda (06:59 UTC) → FECHADO', () => {
  assert.equal(isWithinWorkingHours(SETTINGS, luandaAt('06:59')).open, false)
})

test('fronteira 08:00 Luanda (07:00 UTC) → ABERTO', () => {
  assert.equal(isWithinWorkingHours(SETTINGS, luandaAt('07:00')).open, true)
})

test('fronteira 19:59 Luanda (18:59 UTC) → ABERTO', () => {
  assert.equal(isWithinWorkingHours(SETTINGS, luandaAt('18:59')).open, true)
})

test('fronteira 20:00 Luanda (19:00 UTC) → FECHADO', () => {
  assert.equal(isWithinWorkingHours(SETTINGS, luandaAt('19:00')).open, false)
})

test('domingo → fechado (working_days não inclui 7)', () => {
  // 2026-07-19 é domingo. 12:00 Luanda (11:00 UTC).
  const dom = new Date('2026-07-19T11:00:00Z')
  assert.equal(luandaIsoWeekday(dom), 7)
  assert.equal(isWithinWorkingHours(SETTINGS, dom).open, false)
})

test('mensagem de fora de horas menciona o horário e o fuso', () => {
  const pt = outOfHoursMessage(SETTINGS, 'pt')
  assert.match(pt, /08:00/)
  assert.match(pt, /20:00/)
  assert.match(pt, /Luanda/)
  assert.match(outOfHoursMessage(SETTINGS, 'en'), /Luanda time/)
})

// ── AC3: MULTILINGUE PT↔EN (alternância a meio) ──────────────────────────────

test('lead novo em PT → pt', () => {
  assert.equal(detectLanguage(null, 'Bom dia, quero estudar em Portugal'), 'pt')
})

test('lead novo em EN → en', () => {
  assert.equal(detectLanguage(null, 'Hi, how much does it cost to study abroad?'), 'en')
})

test('ALTERNÂNCIA: pref=pt mas escreve em inglês → en (não fica preso no pref)', () => {
  assert.equal(detectLanguage('pt', 'Actually, can you tell me the price in English please?'), 'en')
})

test('ALTERNÂNCIA: pref=en mas volta a escrever em português → pt', () => {
  assert.equal(detectLanguage('en', 'Obrigada, e quanto custa a licenciatura?'), 'pt')
})

test('texto ambíguo (só número) → mantém a memória (pref)', () => {
  assert.equal(detectLanguage('en', '2026'), 'en')
  assert.equal(detectLanguage('pt', '2026'), 'pt')
})

test('acentuação portuguesa é sinal forte de PT', () => {
  assert.equal(detectLanguage('en', 'informação sobre a candidatura'), 'pt')
})

// ── AC4 (regressão): OPT-OUT "SAIR" ──────────────────────────────────────────

test('opt-out: "SAIR" é reconhecido', () => {
  assert.equal(isOptOut('SAIR'), true)
  assert.equal(isOptOut('sair'), true)
})

test('opt-out: mensagem normal não dispara', () => {
  assert.equal(isOptOut('quero sair do país para estudar'), false)
})

// ── AC4 (regressão): GUARDRAILS (frases proibidas) ───────────────────────────

test('guardrail: "admissão garantida" é bloqueada', () => {
  const g = checkGuardrails('Temos admissão garantida na universidade!', FORBIDDEN_PHRASES, 600)
  assert.equal(g.passed, false)
  assert.ok(g.violations.length > 0)
})

test('guardrail: resposta limpa passa', () => {
  const g = checkGuardrails('Trabalhamos com faixas de investimento conforme o destino.', FORBIDDEN_PHRASES, 600)
  assert.equal(g.passed, true)
})

// ── AC4 (regressão): ESCALAÇÃO D5 (custos/pagamentos) ────────────────────────

test('escalação D5: pergunta de custos/pagamento escala', () => {
  const txt = 'Quero pagar agora, qual é o valor exacto e o IBAN?'
  const social = isConversationalMessage(txt)
  const knowledge = matchFaq(txt, 'pt')
  const d = resolveEscalation(txt, 'pt', knowledge, social)
  assert.equal(d.escalate, true)
  assert.equal(d.pause_reason, 'escalation_d5')
})

test('escalação: pedido explícito de humano escala', () => {
  const txt = 'Quero falar com uma pessoa, por favor'
  const d = resolveEscalation(txt, 'pt', matchFaq(txt, 'pt'), isConversationalMessage(txt))
  assert.equal(d.escalate, true)
  assert.equal(d.pause_reason, 'human_request')
})

test('conversa social (saudação) NÃO escala por no_answer', () => {
  const txt = 'Olá, tudo bem?'
  const d = resolveEscalation(txt, 'pt', matchFaq(txt, 'pt'), isConversationalMessage(txt))
  assert.equal(d.escalate, false)
})
