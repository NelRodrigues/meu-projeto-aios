// ============================================================================
// Detector determinístico de escalação (regra D5) — Story 3.3 (AC1, AC2).
// Módulo PURO (sem Deno/URL) — testável em node:test e reutilizável.
//
// Corre ANTES de qualquer chamada ao LLM (arquitectura §5.2, princípio 6). A
// regra D5 é compromisso contratual validado pelo cliente: falar de dinheiro,
// pagamentos ou negociação NUNCA pode depender do julgamento do modelo. Por
// isso a decisão é CÓDIGO determinístico — o LLM nem vê a mensagem quando
// dispara um gatilho hard.
//
// Precedência (§5.2): human_request / urgent / escalation_d5 são HARD (disparam
// de imediato). no_answer é o ÚLTIMO recurso e vem da base de conhecimento
// (knowledge.ts, story 3.2) — nunca inventa resposta.
//
// FRONTEIRA CRÍTICA (evita falsos positivos D5): perguntas sobre FAIXAS de
// investimento são LEGÍTIMAS para o agente (L4 da 3.2) e NÃO escalam. O gatilho
// D5 é para NEGOCIAÇÃO/PAGAMENTO/COTAÇÃO de serviços da GM (prestações, sinal,
// IBAN, desconto, valor exacto). Ver testes em escalation.test.mjs.
// ============================================================================

import type { LeadLanguage } from "./types.ts";

export type EscalationReason = "human_request" | "urgent" | "escalation_d5" | "no_answer";

export interface EscalationResult {
  escalate: boolean;
  pause_reason?: EscalationReason;
  reply?: string; // resposta fixa de transição ao lead (idioma do lead)
}

// ── Resposta fixa de transição (nunca passa pelo LLM) ────────────────────────
const TRANSITION_REPLY_PT =
  "Vou passar a um consultor da Global Minds que lhe dará a melhor resposta. Um momento, por favor.";
const TRANSITION_REPLY_EN =
  "I'll pass you to a Global Minds consultant who will give you the best answer. One moment, please.";

export function transitionReply(lang: LeadLanguage): string {
  return lang === "en" ? TRANSITION_REPLY_EN : TRANSITION_REPLY_PT;
}

// ── Normalização (minúsculas, sem acento) — igual à convenção da knowledge.ts ─
function normalize(text: string): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// ── Padrões HARD ─────────────────────────────────────────────────────────────

// Pedido explícito de humano (PT + EN).
const HUMAN_REQUEST_PATTERNS: RegExp[] = [
  /falar\s+com\s+(um|uma\s+)?(humano|pessoa|consultor|atendente|alguem|responsavel|gerente)/,
  /quero\s+(um|uma\s+)?(humano|pessoa|consultor|atendente|responsavel)/,
  /passa(r|-me)?\s+(a|para)\s+(um|uma\s+)?(humano|pessoa|consultor|atendente)/,
  /(atendimento|apoio)\s+humano/,
  /talk\s+to\s+(a\s+)?(human|person|someone|agent|consultant|representative)/,
  /speak\s+(to|with)\s+(a\s+)?(human|person|someone|agent|consultant|representative)/,
  /(real|actual)\s+person/,
  /human\s+(agent|support|being)/,
];

// Urgência / problema grave / reclamação (PT + EN).
const URGENT_PATTERNS: RegExp[] = [
  /\burgente\b/,
  /\burgencia\b/,
  /\bemergencia\b/,
  /problema\s+(grave|serio|urgente)/,
  /\breclamacao\b/,
  /\breclamar\b/,
  /quero\s+reclamar/,
  /\burgent\b/,
  /\bemergency\b/,
  /\bcomplaint\b/,
  /serious\s+problem/,
  /this\s+is\s+urgent/,
];

// D5 — custos/pagamentos/valores/negociação (o gatilho crítico, PT + EN).
// NOTA: NÃO inclui "quanto custa"/"faixa"/"investimento" simples — esses são
// tratados por faixas (L4). Só o pedido de VALOR EXACTO, PLANO DE PAGAMENTO,
// NEGOCIAÇÃO ou DADOS BANCÁRIOS escala.
const D5_PATTERNS: RegExp[] = [
  // Planos/prestações de pagamento.
  /pagar\s+em\s+\d+\s*(x|vezes|prestacoes|prestacao)/,
  /(em|a)\s+\d+\s+(vezes|prestacoes)/,
  /\bprestacoes?\b/,
  /\bprestacao\b/,
  /parcela(r|s|mento)?/,
  /\bpayment\s+plan\b/,
  /\binstal?lments?\b/,
  /\bpay\s+in\s+\d+/,
  /pay\s+(in|over)\s+(instal?lments?|\d+\s+(times|months))/,
  // Negociação / desconto.
  /\bdesconto\b/,
  /\bnegociar\b/,
  /\bnegociacao\b/,
  /fazem\s+desconto/,
  /da(o|r)\s+desconto/,
  /\bdiscount\b/,
  /\bnegotiate\b/,
  /can\s+(i|we)\s+(negotiate|get\s+a\s+discount)/,
  // Sinal / entrada / dados bancários.
  /\bsinal\b/,
  /\bentrada\s+(inicial|de\s+pagamento)/,
  /transferencia\s+bancaria/,
  /\biban\b/,
  /dados\s+bancarios/,
  /numero\s+de\s+conta/,
  /conta\s+bancaria/,
  /\bdeposit\b/,
  /\bbank\s+(transfer|account|details)\b/,
  /\bwire\s+transfer\b/,
  // Pedido explícito de valor EXACTO (não faixa).
  /quanto\s+(pago|e\s+que\s+pago|tenho\s+que\s+pagar|vou\s+pagar)/,
  /quanto\s+custa\s+exact/,
  /valor\s+exact/,
  /preco\s+exact/,
  /how\s+much\s+(do|will|should)\s+(i|we)\s+pay/,
  /exact\s+(price|cost|amount|figure)/,
];

// Padrões que, mesmo contendo palavras de dinheiro, são PERGUNTAS DE FAIXA
// legítimas — NÃO devem escalar (o agente responde com faixa, L4).
const FAIXA_SAFE_PATTERNS: RegExp[] = [
  /\bfaixa\b/,
  /faixa\s+de\s+(investimento|preco|custo|precos|valores)/,
  /investment\s+range/,
  /price\s+range/,
  /cost\s+range/,
];

function anyMatch(patterns: RegExp[], norm: string): boolean {
  return patterns.some((p) => p.test(norm));
}

/**
 * Detector determinístico pré-LLM. Devolve o motivo de escalação (hard) para a
 * mensagem do lead, ou `{ escalate: false }` se nenhum gatilho hard dispara.
 *
 * `no_answer` NÃO é decidido aqui (depende da base de conhecimento) — usa-se
 * `resolveEscalation` no processador, que combina este resultado com o sinal
 * da knowledge.ts. Função PURA.
 */
export function detectEscalation(text: string, lang: LeadLanguage = "pt"): EscalationResult {
  const norm = normalize(text);
  if (!norm.trim()) return { escalate: false };

  // Precedência hard: human_request → urgent → escalation_d5.
  if (anyMatch(HUMAN_REQUEST_PATTERNS, norm)) {
    return { escalate: true, pause_reason: "human_request", reply: transitionReply(lang) };
  }
  if (anyMatch(URGENT_PATTERNS, norm)) {
    return { escalate: true, pause_reason: "urgent", reply: transitionReply(lang) };
  }

  // D5: só escala se NÃO for uma pergunta de faixa legítima.
  if (anyMatch(D5_PATTERNS, norm) && !anyMatch(FAIXA_SAFE_PATTERNS, norm)) {
    return { escalate: true, pause_reason: "escalation_d5", reply: transitionReply(lang) };
  }

  return { escalate: false };
}

/**
 * Sinal da base de conhecimento (story 3.2). O processador passa aqui o
 * resultado de `matchFaq` (status 'no_answer' + escalate_reason). Só devolve
 * `no_answer` quando NÃO houve gatilho hard e a base não tem resposta — é o
 * último recurso, nunca invenção. Função PURA.
 */
export function noAnswerEscalation(
  knowledge: { status: string; escalate_reason?: string } | null | undefined,
  lang: LeadLanguage = "pt",
): EscalationResult {
  if (knowledge && knowledge.status === "no_answer" && knowledge.escalate_reason === "no_answer") {
    return { escalate: true, pause_reason: "no_answer", reply: transitionReply(lang) };
  }
  return { escalate: false };
}

/**
 * Combina hard + no_answer na ordem de precedência de §5.2. Função PURA.
 * `isConversational` permite ao chamador suprimir o `no_answer` em conversa
 * social (saudações, agradecimentos) — evita transferir "obrigado"/"olá".
 */
export function resolveEscalation(
  text: string,
  lang: LeadLanguage,
  knowledge: { status: string; escalate_reason?: string } | null | undefined,
  isConversational = false,
): EscalationResult {
  const hard = detectEscalation(text, lang);
  if (hard.escalate) return hard;
  if (isConversational) return { escalate: false };
  // `no_answer` só escala quando a mensagem é uma PERGUNTA que a base não cobre.
  // Mensagens declarativas (o lead a dar informação/intenção — ex.: "sou
  // encarregado, quero licenciatura em Portugal") NÃO são perguntas sem resposta:
  // seguem para o agente qualificar (BANT/ficha, story 3.4). Sem esta condição, o
  // agente transferia qualquer mensagem que não batesse nas FAQ (agravado por 8/12
  // FAQ estarem pendentes de validação) — bug apanhado na validação da 3.4.
  if (!isQuestion(text)) return { escalate: false };
  return noAnswerEscalation(knowledge, lang);
}

// ── É uma pergunta? (só perguntas escalam por no_answer) ─────────────────────
// Interrogativa explícita ('?') OU começada por partícula interrogativa PT/EN.
const QUESTION_STARTERS =
  /^\s*(qual|quais|quanto|quantos|quanta|como|onde|quando|porque|porquê|por\s+que|o\s+que|que\b|quem|posso|podem|poderia|tem|têm|há|existe|existem|what|which|how|where|when|why|who|can|could|do|does|is|are|any)\b/;

export function isQuestion(text: string): boolean {
  const norm = normalize(text);
  if (norm.includes("?")) return true;
  return QUESTION_STARTERS.test(norm);
}

// ── Conversa social: não escala por no_answer (saudações/agradecimentos) ─────
const SOCIAL_PATTERNS: RegExp[] = [
  /^\s*(ola|oi|bom\s+dia|boa\s+tarde|boa\s+noite|hey|hello|hi)\b/,
  /\b(obrigad[oa]|obg|valeu|thank\s+you|thanks|ok|okay|otimo|optimo|perfeito|certo|entendi|percebi|great|perfect)\b/,
  /^\s*(sim|nao|claro|talvez|yes|no|maybe)\s*[.!?]?\s*$/,
];

/**
 * Heurística leve: a mensagem é puramente social (saudação/agradecimento/
 * confirmação)? Nesse caso NÃO se escala por no_answer. Função PURA.
 */
export function isConversationalMessage(text: string): boolean {
  const norm = normalize(text);
  if (!norm.trim()) return true;
  // Mensagens muito curtas e sociais.
  return SOCIAL_PATTERNS.some((p) => p.test(norm));
}
