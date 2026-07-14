// ============================================================
// SIC Global Minds — Normalização de telefone angolano
// ------------------------------------------------------------
// Versão TypeScript de `normalizeAngolaPhone` das edge functions Deno
// (`supabase/functions/_shared/get-integration-key.ts`). Mantém-se em sincronia:
// devolve o número em formato canónico `244XXXXXXXXX` (12 dígitos, sem '+'),
// aceitando entradas com espaços, '+', e sufixos WhatsApp (@s.whatsapp.net /
// @c.us / @lid). É a chave de deduplicação de leads no formulário público (2.4).
// ============================================================

/**
 * Normaliza um número de telefone angolano para o formato canónico `244XXXXXXXXX`.
 *
 * Regras (idênticas à edge function):
 * - Remove sufixos WhatsApp e qualquer caractere não numérico.
 * - `244` + 9 dígitos → devolve tal e qual.
 * - 9 dígitos a começar por `9` → prefixa `244`.
 * - `244` com mais de 12 dígitos, mas cujo local é um `9XXXXXXXX` válido → reduz a `244` + local.
 * - até 9 dígitos → prefixa `244` (número curto/parcial).
 * - caso contrário devolve os dígitos como estão (defensivo).
 */
export function normalizeAngolaPhone(input: string): string {
  const digits = input
    .replace(/@s\.whatsapp\.net/g, '')
    .replace(/@c\.us/g, '')
    .replace(/@lid/g, '')
    .replace(/\D/g, '')

  if (digits.startsWith('244') && digits.length === 12) {
    return digits
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    return '244' + digits
  }

  if (digits.startsWith('244') && digits.length > 12) {
    const local = digits.slice(3)
    if (local.length === 9 && local.startsWith('9')) {
      return '244' + local
    }
  }

  if (digits.length <= 9) {
    return '244' + digits
  }

  return digits
}
