// ============================================================================
// Montagem PURA do handoff — resumo, link do CRM e texto de notificação.
// Story 3.3 (AC3). Módulo PURO (sem Deno/URL) — testável em node:test.
//
// Separado de handoff.ts (que faz o envio/registo, IMPURO) para manter a lógica
// de montagem testável isoladamente — mesma convenção de safety.ts/prompt.ts.
// ============================================================================

import { sanitizeForContext } from "./safety.ts";
import type { LeadLanguage } from "./types.ts";

export interface HandoffContext {
  lead_id: string;
  lead_nome?: string | null;
  pause_reason: string; // human_request | urgent | escalation_d5 | no_answer
  idioma?: LeadLanguage;
  // Últimas mensagens da conversa (ordem cronológica). Sanitizadas na montagem.
  history: Array<{ role: "user" | "assistant"; content: string }>;
  lastIncoming?: string;
}

export const REASON_LABEL: Record<string, string> = {
  human_request: "Pedido de humano",
  urgent: "Urgência / problema grave",
  escalation_d5: "Custos / pagamento / negociação (regra D5)",
  no_answer: "Sem resposta na base de conhecimento",
  manual: "Transferência manual",
};

/**
 * Monta um resumo curto e seguro da conversa para o consultor. Sanitiza cada
 * balão (injecção via histórico) e limita a `maxMessages`. Função PURA.
 */
export function buildHandoffSummary(ctx: HandoffContext, maxMessages = 6): string {
  const label = REASON_LABEL[ctx.pause_reason] ?? ctx.pause_reason;
  const nome = ctx.lead_nome ? sanitizeForContext(ctx.lead_nome) : "Lead sem nome";

  const tail = (ctx.history ?? []).slice(-maxMessages);
  const linhas = tail.map((m) => {
    const quem = m.role === "user" ? "Lead" : "Assistente";
    const txt = sanitizeForContext(m.content || "").slice(0, 240);
    return `${quem}: ${txt}`;
  });

  const partes = [
    `Motivo: ${label}.`,
    `Lead: ${nome}.`,
    linhas.length ? `Últimas mensagens:\n${linhas.join("\n")}` : "Sem histórico recente.",
  ];
  return partes.join("\n");
}

/**
 * Constrói o link do CRM para o lead. `siteUrl` vem do env/integration_keys.
 * Sem barra final duplicada. Ausência de siteUrl → link relativo. Função PURA.
 */
export function buildCrmLink(siteUrl: string | null | undefined, leadId: string): string {
  const base = String(siteUrl ?? "").replace(/\/+$/, "");
  const prefix = base ? (base.startsWith("http") ? base : `https://${base}`) : "";
  return `${prefix}/inbox?lead=${encodeURIComponent(leadId)}`;
}

/**
 * Mensagem WhatsApp ao consultor: aviso + resumo + link. Função PURA.
 */
export function buildNotificationText(summary: string, crmLink: string): string {
  return [
    "🔔 Global Minds — transferência de conversa",
    "",
    summary,
    "",
    `Abrir no CRM: ${crmLink}`,
  ].join("\n");
}
