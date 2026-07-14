// ============================================================================
// Declaração das tools do agente (formato Anthropic tool-use). Story 3.2.
//
// AQUI só há DECLARAÇÃO/schema — a EXECUÇÃO real vive em tools-exec.ts (stories
// 3.4 e 3.5). `executeToolPlaceholder` é a rede de segurança para tools ainda
// sem executor (hoje só `notificar_humano`, cuja mecânica é pré-LLM na 3.3):
// devolve uma continuação segura, nunca um fallback técnico ao lead. O schema
// tem de coincidir com o seed em `029_seed_agent.sql` (ai_agent_tools).
// ============================================================================

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "qualify_lead",
    description:
      "Regista o que se percebeu sobre o lead (orçamento por faixa, quem decide, necessidade, prazo, destino e nível) para pontuar e avançar a qualificação.",
    input_schema: {
      type: "object",
      properties: {
        bant_budget: { type: "string" },
        bant_authority: { type: "string" },
        bant_need: { type: "string" },
        bant_timeline: { type: "string" },
        destino: { type: "string" },
        nivel: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "check_availability",
    description: "Consulta janelas disponíveis para uma consulta com um consultor.",
    input_schema: {
      type: "object",
      properties: { preferencia: { type: "string" } },
      required: [],
    },
  },
  {
    name: "schedule_consultation",
    description: "Agenda a consulta num horário confirmado pelo lead.",
    input_schema: {
      type: "object",
      properties: {
        slot_iso: { type: "string" },
        nome_lead: { type: "string" },
      },
      required: ["slot_iso"],
    },
  },
  {
    name: "criar_ficha_estudante",
    description: "Abre a ficha de candidatura do estudante quando qualificado e pronto a avançar.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        destino: { type: "string" },
        nivel: { type: "string" },
      },
      required: ["nome"],
    },
  },
  {
    name: "notificar_humano",
    description:
      "Encaminha a conversa para um consultor humano (pedido de humano, custos/pagamentos, sem resposta na base).",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string" },
        resumo: { type: "string" },
      },
      required: ["motivo"],
    },
  },
];

/**
 * Placeholder de execução — a execução REAL das tools é 3.4/3.5. Devolve uma
 * continuação segura para o loop, nunca uma mensagem técnica ao lead.
 */
export function executeToolPlaceholder(name: string): string {
  return JSON.stringify({
    ok: false,
    pending: true,
    note: `Tool '${name}' declarada mas ainda não executável (stories 3.4/3.5). Continua a conversa normalmente sem depender do resultado.`,
  });
}
