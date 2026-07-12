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

// Bloco de conteudo de uma mensagem Anthropic (texto, imagem, tool_use, etc.)
type ContentBlock = {
  type: string;
  text?: string;
  [key: string]: unknown;
};

// Conteudo de uma mensagem: string simples ou lista de blocos.
type MessageContent = string | ContentBlock[];

// Definicao de uma tool no formato esperado pela API Anthropic.
type ToolDefinition = Record<string, unknown>;

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
  messages: Array<{ role: "user" | "assistant"; content: MessageContent }>,
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

interface GenerationResultWithTools extends GenerationResult {
  stop_reason: string;
  raw_content: ContentBlock[];
}

export async function callResponseWithTools(
  messages: Array<{ role: "user" | "assistant"; content: MessageContent }>,
  systemPrompt: string,
  apiKey: string,
  model = "claude-sonnet-4-5",
  tools: ToolDefinition[] = []
): Promise<GenerationResultWithTools> {
  const startTime = Date.now();

  const body: Record<string, unknown> = {
    model,
    max_tokens: 1024,
    temperature: 0.7,
    system: systemPrompt,
    messages,
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generation failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const textBlock = (data.content as ContentBlock[] | undefined)?.find(
    (b) => b.type === "text"
  );
  const content = textBlock?.text || "";
  const latency_ms = Date.now() - startTime;

  return {
    content,
    model,
    tokens_input: data.usage?.input_tokens || 0,
    tokens_output: data.usage?.output_tokens || 0,
    latency_ms,
    stop_reason: data.stop_reason || "end_turn",
    raw_content: data.content || [],
  };
}

// ============================================================
// Vision + Embeddings
// ============================================================

interface VisionResult {
  content: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
}

export async function callVision(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  prompt: string,
  apiKey: string,
  model = "claude-sonnet-4-5"
): Promise<VisionResult> {
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vision failed: ${res.status} - ${err}`);
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

export async function generateEmbedding(
  text: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<number[]> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ input: text }),
    });

    if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);

    const data = await res.json();
    return data.embedding || [];
  } catch (err) {
    console.error("[llm-client] Embedding generation failed:", err);
    // Return zero vector as fallback — embedding will be generated later
    return new Array(384).fill(0);
  }
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
