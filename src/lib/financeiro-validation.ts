// ============================================================
// Validação e cálculo do módulo financeiro (story 2.6)
// ------------------------------------------------------------
// Extraído para lib/ para ser testável com node:test sem montar React.
// Espelha os CHECK da migração 025:
//   - moeda: CHAR(3) ~ '^[A-Z]{3}$'  (ISO 4217, 3 letras maiúsculas)
//   - tipo:   'honorario' | 'comissao'
//   - estado financeiro: 'previsto' | 'facturado' | 'recebido' | 'anulado'
//   - estado factura: 'pendente' | 'enviada' | 'paga' | 'vencida' | 'cancelada'
//
// REUSE (moeda ISO 4217): a regra canónica é `CURRENCY_REGEX` de
// `catalogo-validation.ts` (^[A-Z]{3}$). NÃO importamos entre libs porque o
// padrão vinculativo do codebase é ter os módulos de validação AUTO-CONTIDOS —
// `normalize-phone.ts`, `timeline-agregador.ts` e o próprio `catalogo-validation.ts`
// não têm imports locais, para serem testáveis com `--experimental-strip-types`
// (o loader não resolve `import './x'` sem extensão, e `import './x.ts'` é
// recusado pelo tsc sem `allowImportingTsExtensions`). Reexpomos aqui a MESMA
// regra (mesma fonte da verdade — a regex da migração), sem acoplamento de teste.
// ============================================================

import type {
  FinanceiroTipo,
  FinanceiroEstado,
  FacturaEstado,
} from '@/types/database'

// Fonte da verdade da moeda ISO 4217 (idêntica a catalogo-validation.CURRENCY_REGEX).
export const CURRENCY_REGEX = /^[A-Z]{3}$/

/**
 * Valida um código de moeda ISO 4217 (3 letras maiúsculas).
 * Campo opcional aqui (o `validateFinanceiro`/`validateFactura` exigem-no à parte):
 * string vazia/null/undefined = válido; qualquer outro valor casa `^[A-Z]{3}$`.
 */
export function isValidCurrency(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === '') return true
  return CURRENCY_REGEX.test(value)
}

export const FINANCEIRO_TIPOS: FinanceiroTipo[] = ['honorario', 'comissao']
export const FINANCEIRO_ESTADOS: FinanceiroEstado[] = [
  'previsto',
  'facturado',
  'recebido',
  'anulado',
]
export const FACTURA_ESTADOS: FacturaEstado[] = [
  'pendente',
  'enviada',
  'paga',
  'vencida',
  'cancelada',
]

/**
 * Calcula o contravalor em AOA de um valor em moeda forte à taxa dada.
 * `contravalor_aoa = valor × taxa_cambio_aoa`, arredondado a 2 casas.
 *
 * REGRA no-fallbacks: a taxa NUNCA é buscada nem inventada. Se `valor` ou `taxa`
 * forem null/undefined/NaN, devolve `null` (contravalor por preencher) — jamais
 * um valor por defeito. O RFV (story 2.7) trata `null` como "não conta".
 */
export function calcularContravalorAoa(
  valor: number | null | undefined,
  taxa: number | null | undefined
): number | null {
  if (valor === null || valor === undefined || taxa === null || taxa === undefined) return null
  if (Number.isNaN(valor) || Number.isNaN(taxa)) return null
  return Math.round(valor * taxa * 100) / 100
}

export interface FinanceiroFormValues {
  tipo?: FinanceiroTipo
  valor?: number | null
  currency?: string | null
  percentagem?: number | null
}

export interface FacturaFormValues {
  valor?: number | null
  currency?: string | null
  vencimento?: string | null // ISO date (YYYY-MM-DD)
}

export interface FinanceiroErrors {
  [field: string]: string
}

/**
 * Valida os campos de um registo financeiro. Devolve mapa de erros (vazio = válido).
 */
export function validateFinanceiro(v: FinanceiroFormValues): FinanceiroErrors {
  const errors: FinanceiroErrors = {}
  if (v.tipo !== 'honorario' && v.tipo !== 'comissao') {
    errors.tipo = 'O tipo tem de ser honorário ou comissão.'
  }
  if (v.valor === null || v.valor === undefined || Number.isNaN(v.valor)) {
    errors.valor = 'O valor é obrigatório.'
  } else if (v.valor < 0) {
    errors.valor = 'O valor não pode ser negativo.'
  }
  if (!v.currency || v.currency.trim() === '') {
    errors.currency = 'A moeda é obrigatória (ex.: EUR, USD, GBP).'
  } else if (!isValidCurrency(v.currency)) {
    errors.currency = 'A moeda tem de ter 3 letras maiúsculas (ex.: EUR, USD, GBP).'
  }
  if (
    v.percentagem !== null &&
    v.percentagem !== undefined &&
    !Number.isNaN(v.percentagem) &&
    (v.percentagem < 0 || v.percentagem > 100)
  ) {
    errors.percentagem = 'A percentagem tem de estar entre 0 e 100.'
  }
  return errors
}

/**
 * Valida os campos de uma factura. Devolve mapa de erros (vazio = válido).
 */
export function validateFactura(v: FacturaFormValues): FinanceiroErrors {
  const errors: FinanceiroErrors = {}
  if (v.valor === null || v.valor === undefined || Number.isNaN(v.valor)) {
    errors.valor = 'O valor é obrigatório.'
  } else if (v.valor < 0) {
    errors.valor = 'O valor não pode ser negativo.'
  }
  if (!v.currency || v.currency.trim() === '') {
    errors.currency = 'A moeda é obrigatória (ex.: EUR, USD, GBP).'
  } else if (!isValidCurrency(v.currency)) {
    errors.currency = 'A moeda tem de ter 3 letras maiúsculas (ex.: EUR, USD, GBP).'
  }
  if (!v.vencimento || v.vencimento.trim() === '') {
    errors.vencimento = 'A data de vencimento é obrigatória.'
  }
  return errors
}

/**
 * Agrega uma lista de registos financeiros em totais POR MOEDA (nunca mistura
 * moedas — somar EUR com USD é um erro de negócio). O único agregado trans-moeda
 * permitido é a soma de `contravalor_aoa` (devolvido em `totalAoa`).
 *
 * Consumido pela vista de comissões por parceiro (AC5) e pelo dashboard.
 */
export interface TotaisPorMoeda {
  porMoeda: Record<string, number>   // { EUR: 12000, USD: 3000 }
  totalAoa: number                    // soma de contravalor_aoa (registos sem contravalor não contam)
  comContravalor: number              // nº de registos que contribuíram para totalAoa
  semContravalor: number              // nº de registos sem contravalor (AOA por preencher)
}

export interface RegistoAgregavel {
  valor: number | null
  currency: string | null
  contravalor_aoa: number | null
}

export function totaisPorMoeda(registos: RegistoAgregavel[]): TotaisPorMoeda {
  const porMoeda: Record<string, number> = {}
  let totalAoa = 0
  let comContravalor = 0
  let semContravalor = 0

  for (const r of registos) {
    const cur = r.currency
    const valor = r.valor
    if (cur && valor !== null && valor !== undefined && !Number.isNaN(valor)) {
      porMoeda[cur] = (porMoeda[cur] ?? 0) + valor
    }
    if (r.contravalor_aoa !== null && r.contravalor_aoa !== undefined && !Number.isNaN(r.contravalor_aoa)) {
      totalAoa += r.contravalor_aoa
      comContravalor += 1
    } else {
      semContravalor += 1
    }
  }

  totalAoa = Math.round(totalAoa * 100) / 100
  return { porMoeda, totalAoa, comContravalor, semContravalor }
}
