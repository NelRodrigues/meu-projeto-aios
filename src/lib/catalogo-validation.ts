// ============================================================
// Validação de formulários do catálogo (story 2.2)
// ------------------------------------------------------------
// Extraído para lib/ para ser testável com node:test sem montar React.
// Espelha os CHECK da migração 008:
//   - moeda: CHAR(3) ~ '^[A-Z]{3}$'  (ISO 4217, 3 letras maiúsculas)
//   - faixas: custo_min <= custo_max
// ============================================================

export const CURRENCY_REGEX = /^[A-Z]{3}$/

/**
 * Valida um código de moeda ISO 4217 (3 letras maiúsculas).
 * Campo opcional: string vazia / null / undefined = válido (moeda não obrigatória).
 * Qualquer outro valor tem de casar exactamente com ^[A-Z]{3}$.
 */
export function isValidCurrency(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === '') return true
  return CURRENCY_REGEX.test(value)
}

/**
 * Valida uma faixa de custo: min <= max.
 * Qualquer extremo null/undefined = faixa aberta = válido (não obrigatório).
 * NaN em qualquer extremo = inválido.
 */
export function isValidRange(
  min: number | null | undefined,
  max: number | null | undefined
): boolean {
  if (min === null || min === undefined || max === null || max === undefined) return true
  if (Number.isNaN(min) || Number.isNaN(max)) return false
  return min <= max
}

export interface ProgramaFormValues {
  nome?: string
  currency?: string | null
  custo_min?: number | null
  custo_max?: number | null
}

export interface DestinoFormValues {
  pais?: string
  custo_vida_currency?: string | null
}

export interface CatalogoErrors {
  [field: string]: string
}

/**
 * Valida os campos de um programa. Devolve mapa de erros (vazio = válido).
 */
export function validatePrograma(v: ProgramaFormValues): CatalogoErrors {
  const errors: CatalogoErrors = {}
  if (!v.nome || v.nome.trim() === '') {
    errors.nome = 'O nome é obrigatório.'
  }
  if (!isValidCurrency(v.currency)) {
    errors.currency = 'A moeda tem de ter 3 letras maiúsculas (ex.: EUR, USD, GBP).'
  }
  if (!isValidRange(v.custo_min, v.custo_max)) {
    errors.custo_max = 'O custo mínimo não pode ser maior que o máximo.'
  }
  return errors
}

/**
 * Valida os campos de um destino. Devolve mapa de erros (vazio = válido).
 */
export function validateDestino(v: DestinoFormValues): CatalogoErrors {
  const errors: CatalogoErrors = {}
  if (!v.pais || v.pais.trim() === '') {
    errors.pais = 'O país é obrigatório.'
  }
  if (!isValidCurrency(v.custo_vida_currency)) {
    errors.custo_vida_currency = 'A moeda tem de ter 3 letras maiúsculas (ex.: EUR, USD, GBP).'
  }
  return errors
}
