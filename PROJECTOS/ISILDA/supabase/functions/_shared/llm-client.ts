/**
 * LLM Client — Anthropic Claude
 * Classificacao: claude-haiku-4-5 (rapido, barato)
 * Resposta: claude-sonnet-4-5 (melhor qualidade para orcamentos/objeccoes)
 */

interface ClassificationResult {
  intent: string;
  confidence: number;
  reasoning: string;
}

interface GenerationResult {
  content: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
}

interface GuardrailResult {
  passed: boolean;
  violations: string[];
}

const INTENTS_CONFEITARIA = [
  "saudacao",
  "pedir_orcamento",
  "consulta_preco",
  "consulta_produto",
  "confirmar_pedido",
  "pagamento",
  "data_entrega",
  "personalizacao",
  "ver_catalogo",
  "reclamacao",
  "elogio",
  "falar_com_isi",
  "cancelar_pedido",
  "recolher_encomenda",
  "despedida",
  "outro",
] as const;

export async function callClassification(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  apiKey: string,
  model = "claude-haiku-4-5"
): Promise<ClassificationResult> {
  const startTime = Date.now();

  const classifySystem = `${systemPrompt}

Classifica a intencao da ultima mensagem do cliente.
Intencoes possiveis: ${INTENTS_CONFEITARIA.join(", ")}

Responde APENAS com JSON valido:
{"intent": "nome_intencao", "confidence": 0.0-1.0, "reasoning": "explicacao breve"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      temperature: 0.1,
      system: classifySystem,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Classification failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      intent: parsed.intent || "outro",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
      reasoning: parsed.reasoning || "",
    };
  } catch {
    return { intent: "outro", confidence: 0.3, reasoning: "Failed to parse classification" };
  }
}

export async function callResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  apiKey: string,
  model = "claude-sonnet-4-5"
): Promise<GenerationResult> {
  const startTime = Date.now();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generation failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || "";
  const latency_ms = Date.now() - startTime;

  return {
    content,
    model,
    tokens_input: data.usage?.input_tokens || 0,
    tokens_output: data.usage?.output_tokens || 0,
    latency_ms,
  };
}

export function checkGuardrails(
  response: string,
  forbiddenPhrases: string[],
  maxLength = 600
): GuardrailResult {
  const violations: string[] = [];
  const lowerResponse = response.toLowerCase();

  for (const phrase of forbiddenPhrases) {
    if (lowerResponse.includes(phrase.toLowerCase())) {
      violations.push(`Frase proibida: "${phrase}"`);
    }
  }

  if (response.length > maxLength) {
    violations.push(`Resposta excede ${maxLength} chars (${response.length})`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
