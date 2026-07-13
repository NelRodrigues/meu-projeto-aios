// ============================================================
// Lógica RFV + Pareto 80/20 (story 2.7) — espelho TS da migração 026
// ------------------------------------------------------------
// Extraído para lib/ para ser testável com node:test SEM montar React nem BD.
// A fonte da verdade em produção é a MATERIALIZED VIEW `v_rfv_leads` /
// `v_destinos_receita` (migração 026); estas funções replicam EXACTAMENTE a
// mesma régua de quintis, segmentação e % acumulada, para:
//   1. permitir testar a lógica de negócio localmente (a BD da GM está fora de
//      alcance deste ambiente — ver Completion Notes da story);
//   2. servir de fallback de cálculo caso, no futuro, se queira computar RFV
//      client-side sobre um subconjunto (não é o caso hoje — a UI lê a MV).
//
// Módulo AUTO-CONTIDO (padrão do repo: sem imports locais, para correr com
// `--experimental-strip-types`). Regra no-fallbacks: `contravalor_aoa` NULL NÃO
// conta para o Valor; nunca se soma moedas — só o contravalor AOA agrega.
// ============================================================

export interface LeadRfvInput {
  lead_id: string
  /** dias desde a última actividade (menos = mais recente). */
  recencia_dias: number
  /** nº de candidaturas do lead. */
  n_candidaturas: number
  /** soma dos contravalores AOA (só registos com contravalor NÃO-NULL). */
  valor_aoa: number
}

export type RfvSegmento = 'novo' | 'campeao' | 'em_risco' | 'inactivo' | 'regular'

export interface LeadRfvScored extends LeadRfvInput {
  r_score: number // 1..5, 5 = mais recente
  f_score: number // 1..5, 5 = mais frequente
  v_score: number // 1..5, 5 = mais valioso
  segmento: RfvSegmento
}

/**
 * Calcula o quintil (1..5) de cada elemento por `ntile(5)`, replicando o
 * comportamento do Postgres: ordena por `key` ASC e distribui os N elementos em
 * 5 grupos o mais iguais possível; os primeiros `N % 5` grupos recebem um
 * elemento extra. Devolve um Map indexado pela posição ORIGINAL do elemento.
 *
 * `ascending=false` inverte a ordenação (para F e V, onde MAIOR = melhor = 5).
 */
export function ntile5(values: number[], ascending = true): number[] {
  const n = values.length
  if (n === 0) return []
  // pares [valorOriginalIndex, valor], ordenados de forma estável.
  const idx = values.map((v, i) => ({ i, v }))
  idx.sort((a, b) => (ascending ? a.v - b.v : b.v - a.v) || a.i - b.i)

  const buckets = 5
  const base = Math.floor(n / buckets)
  const resto = n % buckets
  const out = new Array<number>(n)
  let pos = 0
  for (let b = 0; b < buckets; b++) {
    const size = base + (b < resto ? 1 : 0)
    for (let k = 0; k < size; k++) {
      out[idx[pos].i] = b + 1 // quintil 1..5
      pos++
    }
  }
  return out
}

/**
 * Segmento RFV a partir dos três scores (mesma régua da migração 026,
 * avaliada por ordem):
 *   'novo'     → sem candidaturas E sem valor (F/V nulos de base).
 *   'campeao'  → r>=4 E f>=4 E v>=4.
 *   'em_risco' → v>=4 E r<=2 (rende mas há muito sem contacto).
 *   'inactivo' → r<=2 (e não 'em_risco').
 *   'regular'  → o resto.
 */
export function segmentoRfv(
  rScore: number,
  fScore: number,
  vScore: number,
  nCandidaturas: number,
  valorAoa: number
): RfvSegmento {
  if (nCandidaturas === 0 && valorAoa === 0) return 'novo'
  if (rScore >= 4 && fScore >= 4 && vScore >= 4) return 'campeao'
  if (vScore >= 4 && rScore <= 2) return 'em_risco'
  if (rScore <= 2) return 'inactivo'
  return 'regular'
}

/**
 * Calcula scores R/F/V e segmento para uma carteira de leads.
 * Alinhado com a MV `v_rfv_leads` (migração 026), que usa em TODAS as dimensões
 * `ntile(5) OVER (ORDER BY <dim> ASC)` — ou seja, o quintil sobe com a ordem ASC:
 * o MAIOR valor cai no bucket mais alto.
 *   • R: 5 = mais recente (MENOR `recencia_dias`) → ntile ASC sobre dias, depois
 *     invertido (6 - q), tal como o SQL `6 - ntile(5) OVER (ORDER BY dias ASC)`.
 *   • F/V: 5 = mais alto → ntile ASC directo (maior candidaturas/valor no topo),
 *     replicando `ntile(5) OVER (ORDER BY n_candidaturas ASC)` do SQL. NÃO usar
 *     `ascending=false` aqui: com DESC o maior cairia no bucket 1 (inverte a
 *     semântica "5 = melhor" e corrompe a segmentação em_risco/campeao).
 */
export function calcularRfv(leads: LeadRfvInput[]): LeadRfvScored[] {
  if (leads.length === 0) return []
  // R: ntile ASC sobre dias, depois invertido para 5 = mais recente.
  const rAsc = ntile5(leads.map((l) => l.recencia_dias), true)
  const rScore = rAsc.map((q) => 6 - q)
  // F/V: ntile ASC → maior candidaturas/valor recebe o quintil mais alto (= SQL).
  const fScore = ntile5(leads.map((l) => l.n_candidaturas), true)
  const vScore = ntile5(leads.map((l) => l.valor_aoa), true)

  return leads.map((l, i) => ({
    ...l,
    r_score: rScore[i],
    f_score: fScore[i],
    v_score: vScore[i],
    segmento: segmentoRfv(rScore[i], fScore[i], vScore[i], l.n_candidaturas, l.valor_aoa),
  }))
}

// ============================================================
// Pareto 80/20 por destino
// ============================================================

export interface DestinoReceitaInput {
  destino_id: string
  pais: string
  cidade?: string | null
  /** receita AOA agregada (só contravalor NÃO-NULL). */
  receita_aoa: number
}

export interface DestinoReceitaRow extends DestinoReceitaInput {
  pct_receita: number   // % desta receita sobre o total (0..100)
  pct_acumulada: number // % acumulada ordenada por receita desc (0..100)
  no_core_80: boolean   // true até (e incluindo) o destino que cruza os 80%
}

/**
 * Ordena destinos por receita desc e calcula % individual e % acumulada.
 * Marca `no_core_80=true` em todos os destinos até (e incluindo) o primeiro cuja
 * `pct_acumulada` atinge/ultrapassa 80 — é o "core 80%" do Pareto.
 * Arredonda a 2 casas (mesma régua do SQL `ROUND(...,2)`).
 */
export function calcularPareto(destinos: DestinoReceitaInput[]): DestinoReceitaRow[] {
  const total = destinos.reduce((s, d) => s + (d.receita_aoa || 0), 0)
  const ordenados = [...destinos].sort((a, b) => b.receita_aoa - a.receita_aoa)

  let acumulada = 0
  let cortou = false
  return ordenados.map((d) => {
    acumulada += d.receita_aoa
    const pctReceita = total > 0 ? Math.round((d.receita_aoa / total) * 10000) / 100 : 0
    const pctAcumulada = total > 0 ? Math.round((acumulada / total) * 10000) / 100 : 0
    // no_core_80: inclui este destino se ainda não cruzámos os 80%.
    const noCore = !cortou
    if (pctAcumulada >= 80) cortou = true
    return {
      ...d,
      pct_receita: pctReceita,
      pct_acumulada: pctAcumulada,
      no_core_80: noCore,
    }
  })
}
