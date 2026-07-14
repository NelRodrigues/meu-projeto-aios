// ============================================================================
// Lógica PURA da edge `uazapi-send-message` — Story 3.6 (AC3). Testável.
// ----------------------------------------------------------------------------
// Módulo PURO (sem Deno/URL/supabase). A EXECUÇÃO (JWT, uazapi, BD) é IMPura e
// vive em index.ts. Aqui só a validação de input e a decisão de pausa.
// ============================================================================

export interface SendInput {
  lead_id?: unknown;
  message?: unknown;
  media_url?: unknown;
}

export interface ParsedSend {
  ok: boolean;
  lead_id?: string;
  message?: string;
  media_url?: string | null;
  error?: string;
}

// Valida e normaliza o corpo do pedido. Exige lead_id (UUID não vazio) e uma
// mensagem não vazia. media_url é opcional.
export function parseSendInput(body: SendInput): ParsedSend {
  const lead_id = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!lead_id) return { ok: false, error: "lead_id em falta" };
  if (!message) return { ok: false, error: "message em falta" };
  const media_url = typeof body.media_url === "string" && body.media_url.trim() ? body.media_url.trim() : null;
  return { ok: true, lead_id, message, media_url };
}

// Decide se a conversa deve ser pausada após uma resposta manual do humano (AC3).
// Só pausa se o setting `auto_pause_after_human_reply` NÃO estiver explicitamente
// desligado (default: pausa — FR14). Só faz sentido pausar conversas que ainda
// estão sob controlo do agente (active/paused_by_schedule).
export function shouldPauseAfterHumanReply(
  settings: Record<string, unknown> | null | undefined,
  currentStatus: string | null | undefined,
): boolean {
  const auto = settings?.auto_pause_after_human_reply;
  if (auto === false) return false;
  // Não "re-pausa" o que já está transferido/completed/paused_by_human.
  return currentStatus === "active" || currentStatus === "paused_by_schedule";
}
