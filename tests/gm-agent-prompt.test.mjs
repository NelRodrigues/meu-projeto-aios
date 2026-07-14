// Testes do agente Global Minds — prompt em camadas, regra de faixas,
// guardrails e persona (story 3.2).
//
// Testamos LÓGICA PURA em TS (sem tocar Deno/URL nem chamar a API Anthropic):
//   - prompt.ts  → nowInLuanda (L0), buildPrompt (ordem L0→L8), FORBIDDEN_PHRASES
//   - knowledge.ts → responderFaixa (regra de faixas), matchFaq (no_answer)
//   - checkGuardrails (_shared/llm-client.ts) → detecção de frase proibida
//   - persona → o system_prompt semeado na migração 029 tem saudação + regras
//
// A validação ponta-a-ponta com a API Anthropic (Haiku→Sonnet) fica PENDENTE
// de deploy (sessão main). O conteúdo oficial das FAQ marcadas
// FAQ_PENDENTE_VALIDACAO_CLIENTE é gate do cliente.
//
// Correr: node --test tests/gm-agent-prompt.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  nowInLuanda,
  buildPrompt,
  LAYER_ORDER,
  FORBIDDEN_PHRASES,
} from '../supabase/functions/gm-agent/prompt.ts'
import { responderFaixa, matchFaq, FAQ } from '../supabase/functions/gm-agent/knowledge.ts'
import { checkGuardrails } from '../supabase/functions/_shared/llm-client.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── L0: data/hora com TZ Africa/Luanda (dinâmica) ────────────────────────────

test('L0: nowInLuanda devolve data/hora formatada e período', () => {
  const dh = nowInLuanda(new Date('2026-07-13T13:35:00Z')) // 14:35 em Luanda (UTC+1)
  assert.equal(dh.data, '13/07/2026')
  assert.equal(dh.hora, '14:35')
  assert.equal(dh.periodo, 'tarde')
  assert.equal(dh.hour24, 14)
})

test('L0: período de manhã/noite conforme a hora de Luanda', () => {
  const manha = nowInLuanda(new Date('2026-07-13T07:00:00Z')) // 08:00 Luanda
  assert.equal(manha.periodo, 'manha')
  const noite = nowInLuanda(new Date('2026-07-13T20:00:00Z')) // 21:00 Luanda
  assert.equal(noite.periodo, 'noite')
})

test('L0: data falsa no histórico não afecta L0 — usa sempre o relógio actual', () => {
  // O buildPrompt calcula L0 a partir de `now`, ignorando qualquer data que o
  // lead tenha escrito. Simulamos "hoje" e uma data antiga na memória do lead.
  const hoje = new Date('2026-07-13T09:00:00Z') // 10:00 Luanda
  const prompt = buildPrompt({
    agent: { system_prompt: 'Assistente GM' },
    lead: { lead_id: 'x', idioma: 'pt', memoria: 'O lead disse que hoje era 01/01/2020.' },
    now: hoje,
  })
  assert.ok(prompt.includes('13/07/2026'), 'L0 usa a data actual de Luanda')
  assert.ok(!prompt.split('[L1]')[0].includes('2020'), 'a data falsa não entra na camada L0')
  assert.ok(prompt.includes('IGNORA quaisquer datas do histórico'))
})

// ── buildPrompt: 9 camadas na ordem L0→L8 ────────────────────────────────────

test('buildPrompt: as 9 camadas aparecem na ordem exacta L0→L8', () => {
  const prompt = buildPrompt({
    agent: { system_prompt: 'És a Assistente da Global Minds.' },
    lead: {
      lead_id: 'lead-1',
      nome: 'Ana',
      idioma: 'pt',
      pipeline_fase: 'qualificado',
      destino: 'Portugal',
      bant_budget: 'faixa média',
    },
    now: new Date('2026-07-13T09:00:00Z'),
  })

  const posicoes = LAYER_ORDER.map((tag) => ({ tag, idx: prompt.indexOf(`[${tag}]`) }))
  for (const { tag, idx } of posicoes) {
    assert.ok(idx >= 0, `camada ${tag} presente`)
  }
  for (let i = 1; i < posicoes.length; i++) {
    assert.ok(
      posicoes[i].idx > posicoes[i - 1].idx,
      `ordem: ${posicoes[i].tag} deve vir depois de ${posicoes[i - 1].tag}`,
    )
  }
})

test('buildPrompt: L2 injecta contexto conhecido e L4 tem a regra de faixas', () => {
  const prompt = buildPrompt({
    agent: { system_prompt: 'Assistente GM' },
    lead: { lead_id: 'l', nome: 'João', idioma: 'pt', destino: 'Reino Unido' },
    now: new Date('2026-07-13T09:00:00Z'),
  })
  assert.ok(prompt.includes('João'), 'nome do lead entra em L2')
  assert.ok(prompt.includes('Reino Unido'))
  assert.ok(prompt.includes('NUNCA dás uma cotação exacta'), 'L4 regra de faixas presente')
})

// ── Regra de faixas (knowledge.ts) ───────────────────────────────────────────

test('faixas: "quanto custa exactamente Portugal?" → faixa + nota de proposta, nunca valor exacto', () => {
  // Fonte simulada do catálogo (destino Portugal com faixas reais).
  const fonte = {
    custo_vida_faixa: '500–800',
    custo_vida_currency: 'EUR',
    custo_min: 4000,
    custo_max: 7000,
    currency: 'EUR',
  }
  const r = responderFaixa(fonte, 'pt')
  assert.equal(r.temFaixa, true)
  assert.ok(r.texto.includes('4000–7000') || r.texto.includes('4000'), 'usa a FAIXA do catálogo')
  assert.ok(r.texto.toLowerCase().includes('proposta'), 'inclui a nota de cotação na proposta')
  // Educa por faixa: apresenta um intervalo (min–max), nunca um valor único fechado.
  assert.ok(r.texto.includes('–'), 'apresenta um intervalo, não um valor único')
  // "exacta" só pode aparecer na nota de compliance ("cotação exacta na proposta"),
  // nunca a apresentar um preço fechado ("custa exactamente X").
  assert.ok(!/custa exactamente|preço final/i.test(r.texto))
})

test('faixas: sem fonte no catálogo → não inventa valor, remete para consulta', () => {
  const r = responderFaixa(null, 'pt')
  assert.equal(r.temFaixa, false)
  assert.ok(r.texto.toLowerCase().includes('proposta'))
  assert.ok(!/\d{3,}/.test(r.texto), 'não inventa números')
})

test('faixas: versão EN devolve nota em inglês', () => {
  const r = responderFaixa({ custo_min: 4000, custo_max: 7000, currency: 'EUR' }, 'en')
  assert.ok(r.texto.includes('proposal'))
  assert.ok(r.texto.includes('4000–7000'))
})

// ── FAQ: no_answer para pendentes e sem match ────────────────────────────────

test('FAQ: pergunta sem match → no_answer (escala, nunca inventa)', () => {
  const m = matchFaq('qual é o teu prato preferido?', 'pt')
  assert.equal(m.status, 'no_answer')
  assert.equal(m.escalate_reason, 'no_answer')
})

test('FAQ: FAQ pendente de validação do cliente → no_answer', () => {
  // faq_documentos está marcada pendente (sem conteúdo oficial no repo).
  const m = matchFaq('que documentos preciso?', 'pt')
  assert.equal(m.status, 'no_answer')
  assert.equal(m.faq_id, 'faq_documentos')
})

test('FAQ: pergunta com conteúdo oficial → answered', () => {
  const m = matchFaq('que destinos têm?', 'pt')
  assert.equal(m.status, 'answered')
  assert.ok((m.answer || '').length > 10)
})

test('FAQ: existem 12 entradas e todas as pendentes têm answer null', () => {
  assert.equal(FAQ.length, 12)
  for (const f of FAQ) {
    if (f.pendente) {
      assert.equal(f.answer_pt, null, `FAQ pendente ${f.id} não deve ter resposta PT`)
      assert.equal(f.answer_en, null, `FAQ pendente ${f.id} não deve ter resposta EN`)
    }
  }
})

// ── Guardrails: frase proibida detectada ─────────────────────────────────────

test('guardrails: "garantimos a admissão" é detectado por checkGuardrails', () => {
  const resposta = 'Fique tranquilo, garantimos a admissão na universidade.'
  const g = checkGuardrails(resposta, FORBIDDEN_PHRASES, 900)
  assert.equal(g.passed, false)
  assert.ok(g.violations.some((v) => v.toLowerCase().includes('garantimos')))
})

test('guardrails: resposta limpa passa', () => {
  const resposta = 'Acompanhamos a candidatura de perto para a tornar forte. Quer marcar uma consulta?'
  const g = checkGuardrails(resposta, FORBIDDEN_PHRASES, 900)
  assert.equal(g.passed, true)
  assert.deepEqual(g.violations, [])
})

test('guardrails: FORBIDDEN_PHRASES cobre variantes com/sem acento', () => {
  assert.ok(FORBIDDEN_PHRASES.includes('admissão garantida'))
  assert.ok(FORBIDDEN_PHRASES.includes('admissao garantida'))
})

// ── Persona: o seed 029 contém saudação oficial + regras ─────────────────────

test('persona: migração 029 semeia saudação oficial e regras (você/tu, nunca IA)', () => {
  const sql = readFileSync(join(__dirname, '../supabase/migrations/029_seed_agent.sql'), 'utf8')
  assert.ok(sql.includes('Assistente Global Minds'), 'nome do agente')
  assert.ok(
    sql.includes('Global Minds, muito bom dia/boa tarde/boa noite, em que podemos ser-lhe útil?'),
    'saudação oficial',
  )
  assert.ok(sql.includes('"você"') && sql.includes('"tu"'), 'regra você/tu')
  assert.ok(/nunca te identificas como IA/i.test(sql), 'regra nunca-IA')
  assert.ok(/admissão garantida/i.test(sql), 'proíbe admissão garantida')
  // Coluna correcta é `name`, não `nome`.
  assert.ok(/INSERT INTO public\.ai_sales_agents[\s\S]*\bname\b/.test(sql))
})

test('persona: seed 029 declara as 5 tools', () => {
  const sql = readFileSync(join(__dirname, '../supabase/migrations/029_seed_agent.sql'), 'utf8')
  for (const t of ['qualify_lead', 'check_availability', 'schedule_consultation', 'criar_ficha_estudante', 'notificar_humano']) {
    assert.ok(sql.includes(`'${t}'`), `tool ${t} declarada`)
  }
})
