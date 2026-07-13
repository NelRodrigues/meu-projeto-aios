// ============================================================
// Sinalização de atraso no pipeline (story 2.3, AC3)
// ------------------------------------------------------------
// Uma candidatura está atrasada quando o tempo passado na fase actual excede o
// prazo esperado da fase: `now() - fase_desde > prazo_fase_dias`.
//
// Regra sem valores inventados (rule extraction-no-fallbacks / Dev Notes C2):
// se `prazo_fase_dias` for NULL (prazo da fase ainda não definido na Ficha C2),
// a candidatura NUNCA é sinalizada como atrasada.
// ============================================================

const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Devolve `true` se a candidatura está além do prazo da fase.
 * @param faseDesde  timestamp de entrada na fase (ISO string ou Date). NULL → nunca atrasada.
 * @param prazoFaseDias  prazo esperado da fase em dias. NULL → nunca atrasada.
 * @param agora  instante de referência (default: agora) — injectável para testes.
 */
export function isAtrasada(
  faseDesde: string | Date | null | undefined,
  prazoFaseDias: number | null | undefined,
  agora: Date = new Date()
): boolean {
  // Sem prazo definido → nunca sinaliza (sem fallbacks).
  if (prazoFaseDias == null || !faseDesde) return false

  const desde = faseDesde instanceof Date ? faseDesde : new Date(faseDesde)
  if (Number.isNaN(desde.getTime())) return false

  const diasNaFase = (agora.getTime() - desde.getTime()) / MS_POR_DIA
  return diasNaFase > prazoFaseDias
}

/** Dias inteiros passados na fase actual (para "tempo em fase"). */
export function diasNaFase(
  faseDesde: string | Date | null | undefined,
  agora: Date = new Date()
): number | null {
  if (!faseDesde) return null
  const desde = faseDesde instanceof Date ? faseDesde : new Date(faseDesde)
  if (Number.isNaN(desde.getTime())) return null
  return Math.floor((agora.getTime() - desde.getTime()) / MS_POR_DIA)
}
