// ============================================================
// SIC Global Minds — Checklist documental (story 2.4 AC2)
// ------------------------------------------------------------
// A checklist vive em `fichas_estudante.documentos` como JSONB
// (`[{tipo, estado, url, updated_at}]`). Não há tabela filha nem CHECK por
// item na BD (decisão da arquitectura §2.5): o enum `documento_estado`
// aplica-se por VALIDAÇÃO APLICACIONAL, definida aqui. Reutilizado pela UI
// e testado isoladamente.
// ============================================================

// Estados válidos — espelho exacto do enum `documento_estado` (§2.1).
export const ESTADOS_DOCUMENTO = [
  'em_falta',
  'recebido',
  'validado',
  'rejeitado',
] as const

export type DocumentoEstado = (typeof ESTADOS_DOCUMENTO)[number]

export interface DocumentoItem {
  tipo: string
  estado: DocumentoEstado
  url: string | null
  updated_at: string
}

// Checklist base sugerida (a Ana pode ter mais tipos por ficha; estes são o arranque).
export const DOCUMENTOS_BASE: string[] = [
  'Passaporte',
  'Certificado de habilitações',
  'Comprovativo de nível linguístico',
  'Comprovativo financeiro',
  'Fotografia tipo passe',
]

export const ESTADO_LABEL: Record<DocumentoEstado, string> = {
  em_falta: 'Em falta',
  recebido: 'Recebido',
  validado: 'Validado',
  rejeitado: 'Rejeitado',
}

/** True se `estado` é um valor do enum `documento_estado`. */
export function isEstadoValido(estado: unknown): estado is DocumentoEstado {
  return (
    typeof estado === 'string' &&
    (ESTADOS_DOCUMENTO as readonly string[]).includes(estado)
  )
}

/**
 * Valida um item de documento. Rejeita estado fora do enum e tipo vazio.
 * Devolve `{ ok, erro? }` — a UI usa isto antes de persistir no JSONB.
 */
export function validarItemDocumento(item: {
  tipo?: unknown
  estado?: unknown
}): { ok: boolean; erro?: string } {
  if (typeof item.tipo !== 'string' || !item.tipo.trim()) {
    return { ok: false, erro: 'O tipo de documento é obrigatório.' }
  }
  if (!isEstadoValido(item.estado)) {
    return {
      ok: false,
      erro: `Estado inválido: "${String(item.estado)}". Válidos: ${ESTADOS_DOCUMENTO.join(', ')}.`,
    }
  }
  return { ok: true }
}

/**
 * Normaliza a lista de documentos vinda do JSONB (defensivo: ignora itens
 * malformados, garante `estado` válido — cai para 'em_falta' se inválido).
 */
export function normalizarDocumentos(raw: unknown): DocumentoItem[] {
  if (!Array.isArray(raw)) return []
  const out: DocumentoItem[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    if (typeof o.tipo !== 'string' || !o.tipo.trim()) continue
    out.push({
      tipo: o.tipo,
      estado: isEstadoValido(o.estado) ? o.estado : 'em_falta',
      url: typeof o.url === 'string' && o.url ? o.url : null,
      updated_at:
        typeof o.updated_at === 'string' ? o.updated_at : new Date().toISOString(),
    })
  }
  return out
}

/**
 * Aplica uma mudança de estado a um item (por índice), actualizando `updated_at`.
 * Não muta a lista original. Lança se o estado for inválido (contrato aplicacional).
 */
export function mudarEstadoDocumento(
  documentos: DocumentoItem[],
  index: number,
  novoEstado: DocumentoEstado,
  agoraISO: string = new Date().toISOString()
): DocumentoItem[] {
  if (!isEstadoValido(novoEstado)) {
    throw new Error(`Estado inválido: "${String(novoEstado)}"`)
  }
  return documentos.map((doc, i) =>
    i === index ? { ...doc, estado: novoEstado, updated_at: agoraISO } : doc
  )
}
