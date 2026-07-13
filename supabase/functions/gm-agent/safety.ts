// ============================================================================
// Camada de segurança do prompt (§6 L8). Story 3.2.
// Módulo PURO (sem Deno/URL) — base testável e reutilizável na 3.3.
//
// Portado do padrão Salus/ISILDA (ai-sales-agent/helpers.ts) e adaptado ao
// domínio Global Minds: identificadores `lead_id`, tools GM, e a regra
// validada da GM "nunca se identificar como IA" (§6 L7, descoberta C3).
// ============================================================================

// Remove caracteres invisíveis usados para contornar filtros.
function removeZeroWidth(text: string): string {
  return String(text ?? "").replace(/[​-‍⁠﻿­]/g, "");
}

function normalizeText(text: string): string {
  return String(text ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/**
 * Neutraliza injecção de prompt no texto do lead antes de o injectar no
 * histórico (L2/L8). Função PURA.
 */
export function sanitizeForContext(text: string): string {
  let sanitized = String(text ?? "");
  const injectionPatterns = [
    /\bSYSTEM\s*:/gi,
    /\bOVERRIDE\b/gi,
    /\bIGNORE\s+PREVIOUS\b/gi,
    /\bIGNORE\s+ALL\b/gi,
    /\bFORGET\s+(YOUR|ALL)\b/gi,
    /\bYOU\s+ARE\s+NOW\b/gi,
    /\bNEW\s+INSTRUCTIONS?\b/gi,
    /\bACT\s+AS\b/gi,
    /\bPRETEND\s+(TO\s+BE|YOU\s+ARE)\b/gi,
    /\bIGNORA\s+(TUDO|AS\s+INSTRU)/gi,
  ];
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[filtrado]");
  }
  sanitized = sanitized.replace(/```[\s\S]*?```/g, "[codigo removido]");
  if (sanitized.length > 2000) sanitized = sanitized.substring(0, 2000) + "...";
  return sanitized;
}

/**
 * Detecta tentativa de jailbreak / extracção de prompt. Função PURA.
 */
export function detectJailbreakAttempt(userMessage: string): boolean {
  const cleaned = removeZeroWidth(userMessage);
  const normalized = normalizeText(cleaned).toLowerCase();
  const jailbreakPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|prompts?)/i,
    /you\s+are\s+now\s+(?:a|an)\s+/i,
    /pretend\s+(?:you\s+are|to\s+be|you're)/i,
    /act\s+as\s+(?:if|a|an)/i,
    /forget\s+(?:all|everything|your)\s+(?:rules?|instructions?|training)/i,
    /what\s+(?:is|are)\s+your\s+(?:system|initial)\s+(?:prompt|instructions?)/i,
    /reveal\s+(?:your|the)\s+(?:system|initial)\s+(?:prompt|instructions?)/i,
    /show\s+me\s+(?:your|the)\s+(?:system|initial)\s+(?:prompt|instructions?)/i,
    /repeat\s+(?:your|the)\s+(?:system|initial|first)\s+(?:prompt|instructions?|message)/i,
    /(mostra|mostre|revela|revele)\s*-?\s*me\s+.*prompt/i,
    /(mostra|mostre|revela|revele)\s*-?\s*me\s+.*instruc/i,
    /\bDAN\s+mode\b/i,
    /\bjailbreak\b/i,
    /bypass\s+(?:your|the)\s+(?:rules?|filter|safety)/i,
    /ignora\s+tudo|ignora\s+acima|esque(c|ç)a\s+(?:tudo|as\s+regras)/i,
    /qual\s+(?:e|eh|é)\s+(?:o\s+)?(?:teu|seu)\s+(?:system\s+)?prompt/i,
    // Domínio GM: tentativas de forçar a auto-identificação como IA.
    /(es|és|e|eh|é)\s+(um|uma)\s+(bot|robo|robô|ia|inteligencia\s+artificial)/i,
  ];
  return jailbreakPatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Remove "pensamento interno" / vazamento de regras da resposta antes do envio.
 * Devolve "" quando a resposta contém marcadores internos (o chamador cai no
 * fallback). Função PURA.
 */
export function stripInternalThinking(message: string): string {
  if (!message) return message;

  let cleaned = removeZeroWidth(message);
  const normalized = normalizeText(cleaned);
  const lowerMsg = normalized.toLowerCase();

  const INTERNAL_KEYWORDS = [
    "o lead ",
    "do lead ",
    "ao lead ",
    "pipeline_fase",
    "pipeline_stage",
    "tool_call",
    "function_call",
    "qualify_lead",
    "check_availability",
    "schedule_consultation",
    "criar_ficha_estudante",
    "notificar_humano",
    "lead_id",
    "system prompt",
    "system_prompt",
    "instrucoes internas",
    "ignore previous",
    "regra de negocio",
    "reveal prompt",
    "revele o prompt",
    "mostre o prompt",
  ];

  if (INTERNAL_KEYWORDS.some((kw) => lowerMsg.includes(kw))) {
    return "";
  }

  cleaned = cleaned.replace(
    /^(Analisand[oa]|Vou |Preciso |Pensand[oa]|Considerand[oa]|Avaliand[oa]|Observand[oa]|Verificand[oa]|Notei que|Percebi que|Olhando|Com base|Baseado|Entendi que|O lead )[^\n]*(\n[^\n]*)*?\n\n/i,
    ""
  );
  cleaned = cleaned.replace(/^\[(?!ai_media|MEDIA)[^\]]{10,}\]\s*\n*/g, "").trim();
  cleaned = cleaned.replace(/^(Resposta|Mensagem|Texto|Reply|Message)\s*:\s*/i, "").trim();

  return cleaned;
}
