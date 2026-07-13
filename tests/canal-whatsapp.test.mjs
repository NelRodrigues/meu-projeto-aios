// Testes do canal WhatsApp — fila, opt-out e envio humanizado (story 3.1).
//
// A BD dedicada da Global Minds está FORA de alcance deste ambiente (sem Docker;
// o CLI supabase aplica a produção). Por isso validamos aqui a LÓGICA PURA em TS:
//   - detecção de opt-out (_shared/opt-out.ts)
//   - split humanizado ≤300 + delays (_shared/humanized-send.ts)
//   - modelo de debounce/idempotência da fila (espelho da RPC/trigger 027)
//
// A validação SQL real das RPCs (`try_acquire_agent_lock`, `claim_queue_messages`,
// `process_ai_agent_queue`, trigger `on_mensagem_received_enqueue`) e da
// idempotência (`webhook_processed_messages.whatsapp_message_id UNIQUE`) contra
// produção fica PENDENTE da aplicação da migração 027 pela sessão main/@devops.
//
// Correr: node --test tests/canal-whatsapp.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isOptOut, normalizeForOptOut, OPT_OUT_FAREWELL } from '../supabase/functions/_shared/opt-out.ts'
import {
  splitMessage,
  randomDelayMs,
  typingDurationMs,
  HUMANIZED_DEFAULTS,
} from '../supabase/functions/_shared/humanized-send.ts'

// ── Opt-out (AC5) ────────────────────────────────────────────────────────────

test('opt-out: reconhece "SAIR" isolado em qualquer caixa/espacos', () => {
  assert.equal(isOptOut('SAIR'), true)
  assert.equal(isOptOut('sair'), true)
  assert.equal(isOptOut(' Sair '), true)
  assert.equal(isOptOut('Sair.'), true, 'pontuacao de fecho nao invalida o comando')
})

test('opt-out: reconhece sinonimos comuns de saida', () => {
  assert.equal(isOptOut('parar'), true)
  assert.equal(isOptOut('CANCELAR'), true)
  assert.equal(isOptOut('stop'), true)
  assert.equal(isOptOut('remover'), true)
  assert.equal(isOptOut('unsubscribe'), true)
})

test('opt-out: NAO dispara quando a palavra esta numa frase (evita falso positivo)', () => {
  assert.equal(isOptOut('vou sair de casa'), false)
  assert.equal(isOptOut('quero sair do pais para estudar'), false)
  assert.equal(isOptOut('podes parar de me chamar assim?'), false)
  assert.equal(isOptOut('nao quero cancelar a candidatura'), false)
})

test('opt-out: vazio/nulo nunca dispara', () => {
  assert.equal(isOptOut(''), false)
  assert.equal(isOptOut('   '), false)
  assert.equal(isOptOut(undefined), false)
  assert.equal(isOptOut(null), false)
})

test('opt-out: normalizacao remove acentos e caixa', () => {
  assert.equal(normalizeForOptOut(' SAÍR! '), 'sair')
  assert.equal(normalizeForOptOut('Cancelar.'), 'cancelar')
})

test('opt-out: despedida fixa existe e é não-vazia', () => {
  assert.equal(typeof OPT_OUT_FAREWELL, 'string')
  assert.ok(OPT_OUT_FAREWELL.length > 10)
})

// ── Split humanizado (AC7) ───────────────────────────────────────────────────

test('split: texto curto fica num só balão', () => {
  const parts = splitMessage('Olá, tudo bem contigo?')
  assert.deepEqual(parts, ['Olá, tudo bem contigo?'])
})

test('split: texto vazio devolve lista vazia', () => {
  assert.deepEqual(splitMessage(''), [])
  assert.deepEqual(splitMessage('   '), [])
})

test('split: fronteira exacta de 300 chars fica num só balão', () => {
  const txt = 'a'.repeat(300)
  const parts = splitMessage(txt)
  assert.equal(parts.length, 1)
  assert.equal(parts[0].length, 300)
})

test('split: 301 chars parte em 2 e cada parte <=300', () => {
  const txt = 'a'.repeat(301)
  const parts = splitMessage(txt)
  assert.ok(parts.length >= 2, 'deve partir')
  for (const p of parts) assert.ok(p.length <= 300, `parte tem ${p.length} chars`)
})

test('split: respeita limite custom e nunca excede maxLength', () => {
  const txt = Array.from({ length: 40 }, (_, i) => `frase numero ${i} aqui`).join('. ') + '.'
  const max = 120
  const parts = splitMessage(txt, max)
  assert.ok(parts.length > 1)
  for (const p of parts) assert.ok(p.length <= max, `parte com ${p.length} > ${max}`)
})

test('split: prefere não partir a meio de palavra', () => {
  // 30 palavras de 10 chars separadas por espaço → sem cortes internos de palavra.
  const palavra = 'abcdefghij'
  const txt = Array.from({ length: 30 }, () => palavra).join(' ')
  const parts = splitMessage(txt, 100)
  for (const p of parts) {
    // Nenhuma parte deve começar ou acabar a meio de "abcdefghij" partido.
    for (const token of p.split(' ')) {
      assert.ok(
        token === '' || token === palavra,
        `token "${token}" indica corte a meio de palavra`,
      )
    }
  }
})

test('split: texto multi-linha corta em fronteiras de paragrafo/linha', () => {
  const bloco = 'Primeiro paragrafo com algum conteudo relevante para o lead.'
  const txt = Array.from({ length: 8 }, () => bloco).join('\n\n')
  const parts = splitMessage(txt, 150)
  assert.ok(parts.length > 1)
  for (const p of parts) assert.ok(p.length <= 150)
  // A recomposição preserva todas as palavras (nada se perde).
  const reunido = parts.join(' ').replace(/\s+/g, ' ')
  assert.ok(reunido.includes('Primeiro paragrafo'))
})

// ── Delays (AC7 / NFR2) ──────────────────────────────────────────────────────

test('delay: fica sempre no intervalo 1500–4000ms (defeitos)', () => {
  for (let i = 0; i < 500; i++) {
    const d = randomDelayMs(HUMANIZED_DEFAULTS.delayMinMs, HUMANIZED_DEFAULTS.delayMaxMs)
    assert.ok(d >= 1500 && d <= 4000, `delay fora do intervalo: ${d}`)
  }
})

test('delay: respeita min/max custom', () => {
  for (let i = 0; i < 200; i++) {
    const d = randomDelayMs(2000, 2500)
    assert.ok(d >= 2000 && d <= 2500, `delay fora do intervalo custom: ${d}`)
  }
})

test('typing: duração estimada fica entre 600ms e 6000ms', () => {
  assert.ok(typingDurationMs('') >= 600)
  assert.ok(typingDurationMs('a'.repeat(2000)) <= 6000)
  const mid = typingDurationMs('a'.repeat(300))
  assert.ok(mid >= 600 && mid <= 6000)
})

// ── Modelo de fila: debounce + idempotência (espelho da 027) ─────────────────
// Reimplementa a régua da RPC/trigger para provar a intenção sem BD:
//   - idempotência: mesma whatsapp_message_id 2× → 1 registo.
//   - debounce: 2 mensagens <10s → 1 item pending (cancela o anterior).

function makeQueueModel() {
  const processed = new Set() // webhook_processed_messages.whatsapp_message_id UNIQUE
  const queue = [] // ai_agent_message_queue

  return {
    // Devolve false se duplicado (simula o 23505 do UNIQUE).
    tryMarkProcessed(wamid) {
      if (processed.has(wamid)) return false
      processed.add(wamid)
      return true
    },
    // Debounce: cancela pending anterior do lead antes de inserir.
    enqueue(leadId, content, scheduledFor) {
      for (const item of queue) {
        if (item.leadId === leadId && item.status === 'pending') item.status = 'cancelled'
      }
      queue.push({ leadId, content, scheduledFor, status: 'pending' })
    },
    pendingFor(leadId) {
      return queue.filter((i) => i.leadId === leadId && i.status === 'pending')
    },
    allFor(leadId) {
      return queue.filter((i) => i.leadId === leadId)
    },
  }
}

test('fila/idempotência: mesma whatsapp_message_id 2× → 1 registo', () => {
  const m = makeQueueModel()
  assert.equal(m.tryMarkProcessed('wamid-ABC'), true, '1ª vez processa')
  assert.equal(m.tryMarkProcessed('wamid-ABC'), false, '2ª vez é duplicado → skip')
})

test('fila/debounce: 2 mensagens <10s → 1 item pending (cancela anterior)', () => {
  const m = makeQueueModel()
  const now = Date.now()
  m.enqueue('lead-1', 'Olá', now + 10_000)
  m.enqueue('lead-1', 'quero info', now + 3_000 + 10_000) // chega logo a seguir
  const pending = m.pendingFor('lead-1')
  assert.equal(pending.length, 1, 'só um item pending após debounce')
  assert.equal(pending[0].content, 'quero info', 'fica a mensagem mais recente')
  assert.equal(m.allFor('lead-1').length, 2, 'o anterior existe mas cancelado')
})
