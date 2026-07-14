// Testes da qualificação BANT + ficha em conversa (story 3.4).
//
// Testamos LÓGICA PURA em TS (sem tocar Deno/URL nem chamar a API Anthropic):
//   - lead-intelligence.ts → parseExtraction / computeScore / computeFitScore /
//     shouldAlertHotLead / buildLeadUpdate / buildFichaFromConversation /
//     buildFichaFormLink / buildContinuity
//
// A régua de score é a documentada em lead-intelligence.ts (RÉGUA DE SCORE):
//   need 25 · timeline 20 · authority 20 · budget 20 · fit até 15 → 0–100.
//   confidence: ≥4 campos BANT = high · 2–3 = medium · 0–1 = low.
//   alerta de lead quente: sales_score>=70 AND score_confidence<>'low'.
//
// A validação ponta-a-ponta (Haiku real → UPDATE leads → trigger temperatura →
// alerta) fica PENDENTE de deploy da edge `gm-lead-intelligence` (sessão main).
//
// Correr: node --test tests/qualificacao-bant.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  parseExtraction,
  computeScore,
  computeFitScore,
  shouldAlertHotLead,
  buildLeadUpdate,
  buildFichaFromConversation,
  buildFichaFormLink,
  buildContinuity,
} from '../supabase/functions/gm-agent/lead-intelligence.ts'

// ── RÉGUA DE SCORE: BANT completo + fit alto → score alto + confidence high ──

test('score: BANT completo + fit alto → score alto (>=85) + confidence high', () => {
  const ext = parseExtraction({
    bant_need: 'quer licenciatura em engenharia em Portugal',
    bant_timeline: 'início em Setembro de 2026',
    bant_authority: 'encarregado (mãe)',
    bant_budget: 'até 6000 euros por ano',
    destino: 'Portugal',
    nivel: 'licenciatura',
  })
  const s = computeScore(ext)
  // need25 + timeline20 + authority20 + budget20 + fit15 = 100
  assert.equal(s.sales_score, 100)
  assert.equal(s.score_confidence, 'high')
  assert.equal(s.fit_score, 100)
})

test('score: sinais fracos (só um need vago) → score baixo + confidence low', () => {
  const ext = parseExtraction({ bant_need: 'quero estudar fora' })
  const s = computeScore(ext)
  // só need25, sem fit → 25. 1 campo BANT → low.
  assert.equal(s.sales_score, 25)
  assert.equal(s.score_confidence, 'low')
  assert.equal(s.fit_score, 0)
})

test('score: sinais parciais (2 campos BANT + destino) → confidence medium', () => {
  const ext = parseExtraction({
    bant_need: 'mestrado no Reino Unido',
    bant_timeline: 'próximo ano',
    destino: 'Reino Unido',
  })
  const s = computeScore(ext)
  // need25 + timeline20 + fit(destino=50 → 7) = 52. 2 campos BANT → medium.
  assert.equal(s.score_confidence, 'medium')
  assert.ok(s.sales_score >= 40 && s.sales_score < 70, `score=${s.sales_score}`)
})

test('fit_score: destino + nível do catálogo → 100; só destino → 50; nada → 0', () => {
  assert.equal(computeFitScore(parseExtraction({ destino: 'Portugal', nivel: 'mestrado' })), 100)
  assert.equal(computeFitScore(parseExtraction({ destino: 'Portugal' })), 50)
  assert.equal(computeFitScore(parseExtraction({})), 0)
  // nível fora do catálogo conhecido → meio-crédito (20), sem destino
  assert.equal(computeFitScore(parseExtraction({ nivel: 'doutoramento' })), 20)
})

// ── REGRA DO ALERTA DE LEAD QUENTE: >=70 AND confidence <> 'low' ─────────────

test('alerta: score 85 + confidence low → NÃO alerta (regra conservadora)', () => {
  assert.equal(shouldAlertHotLead({ sales_score: 85, score_confidence: 'low', fit_score: 50 }), false)
})

test('alerta: score 85 + confidence medium → ALERTA', () => {
  assert.equal(shouldAlertHotLead({ sales_score: 85, score_confidence: 'medium', fit_score: 50 }), true)
})

test('alerta: score 85 + confidence high → ALERTA', () => {
  assert.equal(shouldAlertHotLead({ sales_score: 85, score_confidence: 'high', fit_score: 100 }), true)
})

test('alerta: score 65 + confidence high → NÃO alerta (abaixo de 70)', () => {
  assert.equal(shouldAlertHotLead({ sales_score: 65, score_confidence: 'high', fit_score: 100 }), false)
})

test('alerta: exactamente 70 + medium → ALERTA (limiar inclusivo)', () => {
  assert.equal(shouldAlertHotLead({ sales_score: 70, score_confidence: 'medium', fit_score: 50 }), true)
})

// ── buildLeadUpdate: NUNCA sobrescreve com vazio (AC6) ──────────────────────

test('buildLeadUpdate: só inclui campos extraídos; score sempre presente', () => {
  const ext = parseExtraction({ bant_need: 'licenciatura', destino: 'Portugal' })
  const score = computeScore(ext)
  const upd = buildLeadUpdate(ext, score)
  // score sempre presente
  assert.equal(upd.sales_score, score.sales_score)
  assert.equal(upd.score_confidence, score.score_confidence)
  assert.equal(upd.fit_score, score.fit_score)
  // temperature NÃO é gravada (deriva do trigger)
  assert.equal('temperature' in upd, false)
  // campos extraídos presentes
  assert.equal(upd.bant_need, 'licenciatura')
  assert.equal(upd.destino, 'Portugal')
  // campos NÃO extraídos ausentes do UPDATE (não sobrescreve com vazio)
  assert.equal('bant_budget' in upd, false)
  assert.equal('bant_authority' in upd, false)
  assert.equal('nivel' in upd, false)
})

test('parseExtraction: ruído do modelo (n/a, -, null) → null (não string vazia)', () => {
  const ext = parseExtraction({ bant_need: 'n/a', bant_budget: '-', destino: 'null', nivel: '  ' })
  assert.equal(ext.bant_need, null)
  assert.equal(ext.bant_budget, null)
  assert.equal(ext.destino, null)
  assert.equal(ext.nivel, null)
})

// ── FICHA SEM INVENTAR (AC4): campos sem dado ficam ausentes (→ NULL na BD) ──

test('ficha: dados parciais → só campos com dado; restantes ausentes (sem inventar)', () => {
  const ext = parseExtraction({ destino: 'África do Sul' })
  const ficha = buildFichaFromConversation('lead-123', ext, { nome: 'Ana Salombo' })
  // lead_id sempre presente (chave 1:1)
  assert.equal(ficha.lead_id, 'lead-123')
  // dados fornecidos presentes
  assert.equal(ficha.nome_completo, 'Ana Salombo')
  assert.equal(ficha.destino_pretendido, 'África do Sul')
  // dados NÃO fornecidos ausentes do objecto → NULL/mantém na BD (nunca inventados)
  assert.equal('encarregado_nome' in ficha, false)
  assert.equal('encarregado_contacto' in ficha, false)
  assert.equal('percurso_academico' in ficha, false)
  assert.equal('orcamento_faixa' in ficha, false)
})

test('ficha: overrides têm precedência sobre a extracção', () => {
  const ext = parseExtraction({ nome: 'Nome Antigo', destino: 'Portugal' })
  const ficha = buildFichaFromConversation('lead-9', ext, { nome: 'Nome Novo' })
  assert.equal(ficha.nome_completo, 'Nome Novo')
  assert.equal(ficha.destino_pretendido, 'Portugal')
})

test('ficha: sem nenhum dado → só lead_id (objecto mínimo, nada inventado)', () => {
  const ficha = buildFichaFromConversation('lead-x', {})
  assert.deepEqual(Object.keys(ficha), ['lead_id'])
})

// ── buildFichaFormLink: <site_url>/ficha?lead=<id> ──────────────────────────

test('form link: constrói <site_url>/ficha?lead=<id> sem barra dupla', () => {
  assert.equal(
    buildFichaFormLink('https://sic.globalmindsconsultoria.com/', 'abc-123'),
    'https://sic.globalmindsconsultoria.com/ficha?lead=abc-123',
  )
})

test('form link: sem protocolo → prefixa https://', () => {
  assert.equal(
    buildFichaFormLink('sic.globalmindsconsultoria.com', 'l1'),
    'https://sic.globalmindsconsultoria.com/ficha?lead=l1',
  )
})

test('form link: sem site_url → link relativo', () => {
  assert.equal(buildFichaFormLink(null, 'l2'), '/ficha?lead=l2')
})

// ── CONTINUIDADE (AC6): pós-tool devolve continue_hint, nunca erro técnico ───

test('continuidade: tool falhada devolve continue_hint (não erro técnico)', () => {
  const raw = buildContinuity(false, 'Continua a conversa normalmente, sem mencionar problemas técnicos.', {
    degraded: true,
  })
  const parsed = JSON.parse(raw)
  assert.equal(parsed.ok, false)
  assert.equal(parsed.degraded, true)
  // há sempre uma pista de continuidade
  assert.ok(typeof parsed.continue_hint === 'string' && parsed.continue_hint.length > 0)
  // nunca expõe erro técnico ao lead
  assert.equal('error' in parsed, false)
  assert.equal('stack' in parsed, false)
})

test('continuidade: tool bem-sucedida devolve ok:true + hint + extra', () => {
  const raw = buildContinuity(true, 'Qualificação registada. Continua a conversa.', {
    sales_score: 80,
    score_confidence: 'high',
  })
  const parsed = JSON.parse(raw)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.sales_score, 80)
  assert.equal(parsed.score_confidence, 'high')
  assert.ok(parsed.continue_hint.length > 0)
})
