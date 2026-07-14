// ============================================================================
// Detecção de opt-out por palavra-chave (Story 3.1 — AC5, FR8).
//
// Corre no receiver ANTES de qualquer enfileiramento para o agente
// (determinismo pré-LLM, princípio 6 da arquitectura §1): nunca depender do LLM
// para respeitar um pedido de saída.
//
// Função PURA — testável isoladamente.
// ============================================================================

// Palavras-chave de opt-out (comparação normalizada: sem acentos, minúsculas,
// trim, pontuação de fecho removida). "SAIR" é a canónica do brief; incluímos
// sinónimos comuns em WhatsApp para robustez.
const OPT_OUT_KEYWORDS = new Set([
  "sair",
  "parar",
  "cancelar",
  "stop",
  "remover",
  "unsubscribe",
]);

/** Mensagem de despedida fixa enviada ao lead após opt-out. */
export const OPT_OUT_FAREWELL =
  "Entendido. Não voltarás a receber mensagens automáticas nossas. " +
  "Se mudares de ideias, é só escreveres-nos. Um abraço da Global Minds.";

/**
 * Normaliza texto para comparação: minúsculas, sem acentos, sem pontuação de
 * fecho, colapsa espaços.
 */
export function normalizeForOptOut(text: string): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/[.!?,;:]+$/g, "")         // pontuação de fecho (após trim)
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * True se a mensagem for um pedido de opt-out. Só considera a mensagem quando
 * é *exactamente* a palavra-chave (evita falsos positivos como "não quero sair
 * do país"). Aceita a palavra isolada, opcionalmente rodeada de pontuação.
 */
export function isOptOut(text: string): boolean {
  const norm = normalizeForOptOut(text);
  if (!norm) return false;
  return OPT_OUT_KEYWORDS.has(norm);
}
