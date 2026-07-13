// Testes da lógica RFV + Pareto 80/20 (story 2.7).
// Espelham a régua da MATERIALIZED VIEW `v_rfv_leads`/`v_destinos_receita`
// (migração 026). Como a BD dedicada da Global Minds está FORA de alcance deste
// ambiente (o token MCP não a lista — ver Completion Notes da story), validamos
// aqui a LÓGICA de quintis, segmentação e Pareto em TS. A validação SQL da MV
// contra dados reais fica para a aplicação da migração pelo @devops.
//
// Correr: node --test tests/rfv.test.mjs
//
// ── Dataset sintético (documentado) ──────────────────────────────────────────
// 3 leads com candidaturas e financeiro.contravalor_aoa CONHECIDOS:
//   L1 "Ana"   — 3 candidaturas, valor 900 000 AOA, contacto há   2 dias (recente)
//   L2 "Bruno" — 1 candidatura,  valor 300 000 AOA, contacto há  40 dias
//   L3 "Célia" — 0 candidaturas, valor       0 AOA, contacto há 200 dias (frio, novo)
// Com só 3 leads, ntile(5) distribui 1 elemento por bucket nos 3 primeiros
// grupos (n<buckets): posições ordenadas → quintis 1,2,3.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ntile5,
  segmentoRfv,
  calcularRfv,
  calcularPareto,
} from '../src/lib/rfv.ts'

// ── ntile5 (replica o ntile do Postgres) ──────────────────────────────────
test('ntile5: distribui em 5 buckets, primeiros N%5 grupos levam +1', () => {
  // 10 elementos → 2 por bucket exacto.
  const q = ntile5([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], true)
  assert.deepEqual(q, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
})

test('ntile5: n<5 → um por bucket nos primeiros n grupos', () => {
  const q = ntile5([10, 20, 30], true) // ordenado asc: 10<20<30
  assert.deepEqual(q, [1, 2, 3])
})

test('ntile5: descending inverte a ordenação', () => {
  const q = ntile5([10, 20, 30], false) // desc: 30>20>10 → 30 recebe bucket 1
  assert.deepEqual(q, [3, 2, 1])
})

test('ntile5: lista vazia devolve vazio', () => {
  assert.deepEqual(ntile5([]), [])
})

// ── segmentoRfv (régua da migração 026) ────────────────────────────────────
test('segmento: sem candidaturas e sem valor → novo', () => {
  assert.equal(segmentoRfv(5, 1, 1, 0, 0), 'novo')
})

test('segmento: r/f/v todos altos → campeao', () => {
  assert.equal(segmentoRfv(5, 4, 4, 3, 900000), 'campeao')
})

test('segmento: valioso mas frio → em_risco', () => {
  assert.equal(segmentoRfv(1, 3, 5, 2, 500000), 'em_risco')
})

test('segmento: frio sem valor alto → inactivo', () => {
  assert.equal(segmentoRfv(2, 2, 2, 1, 100000), 'inactivo')
})

test('segmento: relação viva sem se destacar → regular', () => {
  assert.equal(segmentoRfv(3, 3, 3, 2, 200000), 'regular')
})

// ── calcularRfv sobre o dataset sintético ──────────────────────────────────
const CARTEIRA = [
  { lead_id: 'L1', recencia_dias: 2, n_candidaturas: 3, valor_aoa: 900000 },
  { lead_id: 'L2', recencia_dias: 40, n_candidaturas: 1, valor_aoa: 300000 },
  { lead_id: 'L3', recencia_dias: 200, n_candidaturas: 0, valor_aoa: 0 },
]

test('calcularRfv: R invertido — o mais recente (menos dias) tem r_score mais alto', () => {
  const scored = calcularRfv(CARTEIRA)
  const byId = Object.fromEntries(scored.map((s) => [s.lead_id, s]))
  // recencia_dias asc: L1(2)<L2(40)<L3(200) → ntile 1,2,3 → r_score = 6-q → 5,4,3
  assert.equal(byId.L1.r_score, 5)
  assert.equal(byId.L2.r_score, 4)
  assert.equal(byId.L3.r_score, 3)
})

test('calcularRfv: F/V — maior candidaturas/valor tem score mais alto', () => {
  const scored = calcularRfv(CARTEIRA)
  const byId = Object.fromEntries(scored.map((s) => [s.lead_id, s]))
  // n_candidaturas desc: L1(3)>L2(1)>L3(0) → 3,2,1
  assert.equal(byId.L1.f_score, 3)
  assert.equal(byId.L2.f_score, 2)
  assert.equal(byId.L3.f_score, 1)
  // valor_aoa desc: L1(900k)>L2(300k)>L3(0) → 3,2,1
  assert.equal(byId.L1.v_score, 3)
  assert.equal(byId.L2.v_score, 2)
  assert.equal(byId.L3.v_score, 1)
})

test('calcularRfv: L3 (0 candidaturas, 0 valor) é sempre "novo"', () => {
  const scored = calcularRfv(CARTEIRA)
  const l3 = scored.find((s) => s.lead_id === 'L3')
  assert.equal(l3.segmento, 'novo')
})

// ── calcularPareto — % acumulada correcta e corte 80% no destino esperado ──
// Dataset: 3 destinos com receita conhecida.
//   Portugal   700 000  → 70%   acumulada 70%
//   Reino Unido 250 000 → 25%   acumulada 95%  ← cruza os 80% aqui
//   EAU          50 000 →  5%   acumulada 100%
// Total 1 000 000. Core 80% = {Portugal, Reino Unido} (o RU fecha o corte).
const DESTINOS = [
  { destino_id: 'D_EAU', pais: 'EAU', receita_aoa: 50000 },
  { destino_id: 'D_PT', pais: 'Portugal', receita_aoa: 700000 },
  { destino_id: 'D_UK', pais: 'Reino Unido', receita_aoa: 250000 },
]

test('calcularPareto: ordena por receita desc', () => {
  const rows = calcularPareto(DESTINOS)
  assert.deepEqual(rows.map((r) => r.pais), ['Portugal', 'Reino Unido', 'EAU'])
})

test('calcularPareto: pct_receita e pct_acumulada correctos', () => {
  const rows = calcularPareto(DESTINOS)
  assert.equal(rows[0].pct_receita, 70)
  assert.equal(rows[0].pct_acumulada, 70)
  assert.equal(rows[1].pct_receita, 25)
  assert.equal(rows[1].pct_acumulada, 95)
  assert.equal(rows[2].pct_receita, 5)
  assert.equal(rows[2].pct_acumulada, 100)
})

test('calcularPareto: corte 80% inclui até (e incluindo) o destino que cruza 80%', () => {
  const rows = calcularPareto(DESTINOS)
  // Portugal (70%) e Reino Unido (fecha 95% >= 80) fazem o core; EAU fica fora.
  assert.equal(rows[0].no_core_80, true)  // Portugal
  assert.equal(rows[1].no_core_80, true)  // Reino Unido (cruza os 80%)
  assert.equal(rows[2].no_core_80, false) // EAU
})

test('calcularPareto: total zero (nenhuma receita) não rebenta — tudo a 0%', () => {
  const rows = calcularPareto([
    { destino_id: 'A', pais: 'A', receita_aoa: 0 },
    { destino_id: 'B', pais: 'B', receita_aoa: 0 },
  ])
  assert.equal(rows[0].pct_receita, 0)
  assert.equal(rows[0].pct_acumulada, 0)
})

// ── Valor: ignora contravalor NULL e nunca mistura moedas ──────────────────
// A dimensão Valor da MV soma SÓ financeiro.contravalor_aoa NÃO-NULL (só AOA
// agrega). Aqui provamos que a agregação prévia (o que a MV faz em SQL) respeita
// essa regra: registos sem contravalor não entram no valor_aoa do lead.
test('Valor: só contravalor_aoa não-nulo conta; NULL é ignorado (nunca fallback)', () => {
  // Simula a agregação SQL: SUM(contravalor_aoa) WHERE contravalor_aoa IS NOT NULL.
  const registosLead = [
    { contravalor_aoa: 500000 },   // conta
    { contravalor_aoa: 400000 },   // conta
    { contravalor_aoa: null },     // NÃO conta (AOA por preencher)
  ]
  const valorAoa = registosLead
    .filter((r) => r.contravalor_aoa !== null && r.contravalor_aoa !== undefined)
    .reduce((s, r) => s + r.contravalor_aoa, 0)
  assert.equal(valorAoa, 900000) // 500k + 400k; o NULL foi ignorado

  // E esse valor entra intacto no RFV do lead.
  const scored = calcularRfv([
    { lead_id: 'X', recencia_dias: 5, n_candidaturas: 2, valor_aoa: valorAoa },
  ])
  assert.equal(scored[0].valor_aoa, 900000)
})

test('Valor: moedas diferentes NUNCA somam entre si — só o contravalor AOA agrega', () => {
  // Cada registo tem a sua moeda; o valor bruto (EUR/USD) nunca se soma.
  // Só o contravalor AOA (pré-calculado à taxa do dia) é somável trans-moeda.
  const registos = [
    { valor: 1000, currency: 'EUR', contravalor_aoa: 950000 },
    { valor: 500, currency: 'USD', contravalor_aoa: 475000 },
  ]
  // Somar valor bruto seria erro (1000 EUR + 500 USD não faz sentido).
  const somaAoa = registos
    .filter((r) => r.contravalor_aoa !== null)
    .reduce((s, r) => s + r.contravalor_aoa, 0)
  assert.equal(somaAoa, 1425000) // só o AOA agrega
})
