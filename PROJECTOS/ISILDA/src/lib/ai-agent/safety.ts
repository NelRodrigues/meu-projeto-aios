export function removeZeroWidth(text: string): string {
  return text.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
}

export function normalizeText(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

export function sanitizeForContext(text: string): string {
  let sanitized = removeZeroWidth(text)
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
  ]
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[filtrado]')
  }
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '[codigo removido]')
  if (sanitized.length > 2000) sanitized = `${sanitized.substring(0, 2000)}...`
  return sanitized
}

export function detectJailbreakAttempt(userMessage: string): boolean {
  const normalized = normalizeText(removeZeroWidth(userMessage)).toLowerCase()
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
    /ignore\s+tudo|ignore\s+acima|esque(c|ç)a\s+(?:tudo|suas?\s+regras)/i,
    /finja\s+(?:que\s+(?:voce|vc)\s+(?:e|eh|é))|finja\s+ser/i,
    /revele\s+(?:o|seu|suas?)\s+(?:prompt|instruc)/i,
    /mostre\s+(?:o|seu|suas?)\s+(?:prompt|instruc)/i,
    /qual\s+(?:e|eh|é)\s+(?:o\s+)?seu\s+(?:system\s+)?prompt/i,
  ]
  return jailbreakPatterns.some((pattern) => pattern.test(normalized))
}

export function stripInternalThinking(message: string): string {
  if (!message) return message

  let cleaned = removeZeroWidth(message)
  const normalized = normalizeText(cleaned)
  const lowerMsg = normalized.toLowerCase()

  const internalKeywords = [
    'o lead ',
    'do lead ',
    'ao lead ',
    'pro lead',
    'desqualificacao',
    'desqualificar',
    'qualificacao do',
    'fluxo de ',
    'faturamento abaixo',
    'abaixo do minimo',
    'internal',
    'nao fale isso',
    'preciso aplicar',
    'preciso seguir o',
    'vou aplicar o fluxo',
    'vou seguir o fluxo',
    'regra de negocio',
    'pipeline_stage',
    'tool_call',
    'function_call',
    'qualify_lead',
    'check_availability',
    'sales_rep',
    'lead_id',
    'system prompt',
    'system_prompt',
    'instrucoes internas',
    'ignore previous',
    'ignore acima',
    'ignore tudo',
    'reveal prompt',
    'revele o prompt',
    'mostre o prompt',
  ]

  if (internalKeywords.some((kw) => lowerMsg.includes(kw))) {
    return ''
  }

  cleaned = cleaned.replace(
    /^(Analisand[oa]|Vou |Preciso |Pensand[oa]|Considerand[oa]|Avaliand[oa]|Observand[oa]|Verificand[oa]|Notei que|Percebi que|Olhando|Com base|Baseado|Entendi que|O lead )[^\n]*(\n[^\n]*)*?\n\n/i,
    ''
  )
  cleaned = cleaned.replace(/^\[(?!ai_media|MEDIA)[^\]]{10,}\]\s*\n*/g, '').trim()
  cleaned = cleaned.replace(/^(Resposta|Mensagem|Texto|Reply|Message)\s*:\s*/i, '').trim()

  return cleaned
}

export function splitAgentMessage(text: string, maxLength: number): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const parts: string[] = []

  for (const para of paragraphs) {
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length > 1) {
      parts.push(...lines)
    } else {
      parts.push(para)
    }
  }

  const result: string[] = []
  for (const part of parts) {
    if (part.length <= maxLength) {
      result.push(part)
    } else {
      const sentences = part.split(/(?<=[.!?])\s+/)
      let chunk = ''
      for (const sentence of sentences) {
        if (chunk && `${chunk} ${sentence}`.length > maxLength) {
          result.push(chunk.trim())
          chunk = sentence
        } else {
          chunk = chunk ? `${chunk} ${sentence}` : sentence
        }
      }
      if (chunk.trim()) result.push(chunk.trim())
    }
  }

  return result.length > 0 ? result : [text]
}
