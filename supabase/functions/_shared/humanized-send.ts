// ============================================================================
// Helper de envio humanizado (Story 3.1 — AC7, NFR2).
//
// Usado pelo caminho de envio partilhado: o `gm-agent` (3.2+) e a edge
// `uazapi-send-message`. Simula presença humana no WhatsApp:
//   - typing indicator (presence "composing") antes de cada balão;
//   - split de respostas longas em partes <= max (300 chars/parte por defeito);
//   - delays 1500–4000ms entre balões (jitter aleatório).
//
// A persona/limite de 1 emoji fica a cargo do prompt do agente (story 3.2) —
// aqui só tratamos da mecânica de entrega.
//
// Arquitectura §4.1 (uazapi send: typing, split <=300, delays), §5.1.
// ============================================================================

export interface HumanizedSendSettings {
  message_split_max_length?: number;      // defeito 300
  response_delay_min_ms?: number;         // defeito 1500
  response_delay_max_ms?: number;         // defeito 4000
  typing_speed_cpm?: number;              // chars/min p/ estimar tempo de typing
}

export const HUMANIZED_DEFAULTS = {
  splitMaxLength: 300,
  delayMinMs: 1500,
  delayMaxMs: 4000,
  typingSpeedCpm: 280,
} as const;

/**
 * Divide um texto em partes <= maxLength, preferindo cortar em fronteiras
 * naturais (parágrafo → frase → espaço) e só partindo à força em último caso.
 * Função PURA — testável isoladamente.
 */
export function splitMessage(text: string, maxLength = HUMANIZED_DEFAULTS.splitMaxLength): string[] {
  const clean = String(text ?? "").trim();
  if (!clean) return [];
  if (clean.length <= maxLength) return [clean];

  const parts: string[] = [];
  let remaining = clean;

  while (remaining.length > maxLength) {
    let cut = -1;

    // 1. Fronteira de parágrafo dentro da janela.
    const paraBreak = remaining.lastIndexOf("\n\n", maxLength);
    if (paraBreak > maxLength * 0.4) cut = paraBreak;

    // 2. Fim de frase (. ! ?) dentro da janela.
    if (cut === -1) {
      for (const sep of [". ", "! ", "? ", "\n"]) {
        const idx = remaining.lastIndexOf(sep, maxLength);
        if (idx > maxLength * 0.4) {
          cut = idx + sep.trimEnd().length; // inclui a pontuação
          break;
        }
      }
    }

    // 3. Último espaço dentro da janela.
    if (cut === -1) {
      const space = remaining.lastIndexOf(" ", maxLength);
      if (space > maxLength * 0.4) cut = space;
    }

    // 4. Corte forçado.
    if (cut === -1) cut = maxLength;

    const chunk = remaining.slice(0, cut).trim();
    if (chunk) parts.push(chunk);
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

/** Delay aleatório (inclusivo) entre min e max, em ms. */
export function randomDelayMs(minMs: number, maxMs: number): number {
  const lo = Math.min(minMs, maxMs);
  const hi = Math.max(minMs, maxMs);
  return Math.floor(lo + Math.random() * (hi - lo));
}

/** Estima o tempo de "escrita" de um balão a partir do comprimento e do CPM. */
export function typingDurationMs(text: string, cpm = HUMANIZED_DEFAULTS.typingSpeedCpm): number {
  const chars = String(text ?? "").length;
  const ms = Math.round((chars / Math.max(cpm, 1)) * 60_000);
  // Limites sãos: entre 600ms e 6s de "a escrever".
  return Math.min(Math.max(ms, 600), 6000);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Dependências injectadas — mantém o helper testável e desacoplado da uazapi.
 *  - sendText: envia UMA parte de texto e devolve o whatsapp_message_id (se houver).
 *  - setTyping: (opcional) liga/desliga o indicador "a escrever".
 */
export interface HumanizedSendDeps {
  sendText: (text: string) => Promise<string | null>;
  setTyping?: (on: boolean) => Promise<void>;
  sleepFn?: (ms: number) => Promise<void>;
}

export interface HumanizedSendResult {
  parts: string[];
  messageIds: string[];
}

/**
 * Envia uma resposta longa de forma humanizada: split, typing e delays.
 * Devolve as partes efectivamente enviadas e os ids devolvidos pela uazapi.
 */
export async function sendHumanized(
  fullText: string,
  deps: HumanizedSendDeps,
  settings: HumanizedSendSettings = {},
): Promise<HumanizedSendResult> {
  const maxLen = settings.message_split_max_length ?? HUMANIZED_DEFAULTS.splitMaxLength;
  const delayMin = settings.response_delay_min_ms ?? HUMANIZED_DEFAULTS.delayMinMs;
  const delayMax = settings.response_delay_max_ms ?? HUMANIZED_DEFAULTS.delayMaxMs;
  const cpm = settings.typing_speed_cpm ?? HUMANIZED_DEFAULTS.typingSpeedCpm;
  const wait = deps.sleepFn ?? sleep;

  const parts = splitMessage(fullText, maxLen);
  const messageIds: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Delay entre balões (não antes do primeiro).
    if (i > 0) await wait(randomDelayMs(delayMin, delayMax));

    // Typing indicator durante o "tempo de escrita" estimado.
    if (deps.setTyping) {
      try {
        await deps.setTyping(true);
        await wait(typingDurationMs(part, cpm));
      } finally {
        await deps.setTyping(false);
      }
    }

    const id = await deps.sendText(part);
    if (id) messageIds.push(id);
  }

  return { parts, messageIds };
}
