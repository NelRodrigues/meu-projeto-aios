// ============================================================================
// Detecção de idioma do lead (PT/EN) — Story 3.7 (AC3). Módulo PURO.
// ----------------------------------------------------------------------------
// Testável em node:test. Regra central da ALTERNÂNCIA PT↔EN a meio da conversa:
// o SINAL FORTE do texto ACTUAL manda sobre o idioma_pref guardado — senão um
// lead que começou em PT nunca conseguiria mudar para EN (ficaria preso no pref).
//
// Precedência:
//   1. Texto actual com sinal FORTE de EN  → "en"
//   2. Texto actual com sinal FORTE de PT  → "pt"
//   3. Texto ambíguo (sem sinal claro)     → idioma_pref guardado (memória)
//   4. Sem pref                            → default "pt" (marca angolana)
// ============================================================================

import type { LeadLanguage } from "./types.ts";

// Marcadores de inglês (palavras funcionais + vocabulário do domínio).
const EN_HINTS =
  /\b(hello|hi|hey|please|thanks|thank you|how much|cost|price|study|studying|abroad|university|college|course|which|when|where|what|would|could|i want|i'?m|i am|do you|can you|scholarship|undergraduate|master'?s|foundation)\b/i;

// Marcadores de português (funcionais + acentuação + domínio).
const PT_HINTS =
  /\b(olá|ola|bom dia|boa tarde|boa noite|obrigad[ao]|por favor|quanto|custa|preço|preco|estudar|estrangeiro|universidade|curso|qual|quando|onde|quero|gostava|podem|licenciatura|mestrado|bolsa|informação|informacao|você|voce)\b/i;

// Acentuação típica de PT (sinal forte quando presente).
const PT_ACCENTS = /[ãõáàâéêíóôúç]/i;

export function detectLanguage(pref: string | null | undefined, text: string): LeadLanguage {
  const t = (text || "").trim();

  const enHit = EN_HINTS.test(t);
  const ptHit = PT_HINTS.test(t) || PT_ACCENTS.test(t);

  // Sinal forte e SEM ambiguidade no texto actual → manda (permite alternância).
  if (enHit && !ptHit) return "en";
  if (ptHit && !enHit) return "pt";

  // Texto ambíguo (ambos ou nenhum) → memória do lead.
  if (pref === "en") return "en";
  if (pref === "pt") return "pt";

  // Sem sinal e sem pref → default PT (marca institucional angolana).
  return "pt";
}
