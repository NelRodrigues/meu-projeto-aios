// ============================================================================
// Mecânica de handoff / `notificar_humano` — Story 3.3 (AC3).
// ----------------------------------------------------------------------------
// A DECLARAÇÃO da tool `notificar_humano` já existe (migração 029, ai_agent_tools).
// AQUI implementa-se a MECÂNICA: montar resumo + link do CRM, notificar o
// Rinaldo/Ana por WhatsApp e registar a notificação em `notificacoes` (FR26).
//
// Módulo IMPURO (importa supabase-js + _shared). A lógica de MONTAGEM (resumo,
// link, texto) vive em handoff-format.ts (PURO, testável em node:test).
//
// Números do Rinaldo/Ana (onde vêm): por ordem de preferência
//   1. ai_sales_agents.settings.notify_numbers (array de números E.164/AO)
//   2. team_members (role='admin', is_active, phone não nulo)
//   3. NENHUM → NÃO se inventa número (regra do brief). Regista só a notificação
//      interna em `notificacoes` e loga a lacuna (handoff_no_numbers).
// ============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import { logInfo, logWarn, logError } from "../_shared/log.ts";
import {
  buildCrmLink,
  buildHandoffSummary,
  buildNotificationText,
  REASON_LABEL,
  type HandoffContext,
} from "./handoff-format.ts";

// Re-export das funções puras para consumidores que importem daqui.
export {
  buildCrmLink,
  buildHandoffSummary,
  buildNotificationText,
  REASON_LABEL,
} from "./handoff-format.ts";
export type { HandoffContext } from "./handoff-format.ts";

const FN = "gm-agent-handoff";

// ── IMPURO: resolve os números do Rinaldo/Ana ────────────────────────────────

/**
 * Resolve os números de notificação. Preferência:
 *   settings.notify_numbers → team_members(admin) → [] (sem inventar número).
 */
export async function resolveNotifyNumbers(
  supabase: SupabaseClient,
  settings: Record<string, unknown> | null | undefined,
): Promise<string[]> {
  // 1. Setting explícito.
  const raw = settings?.notify_numbers;
  if (Array.isArray(raw) && raw.length) {
    const nums = raw
      .map((n) => normalizeAngolaPhone(String(n)))
      .filter((n) => n && n.replace(/\D/g, "").length >= 8);
    if (nums.length) return Array.from(new Set(nums));
  }

  // 2. team_members admin com telefone.
  try {
    const { data } = await supabase
      .from("team_members")
      .select("phone")
      .eq("role", "admin")
      .eq("is_active", true)
      .not("phone", "is", null);
    const nums = ((data as Array<{ phone: string | null }>) ?? [])
      .map((r) => normalizeAngolaPhone(String(r.phone ?? "")))
      .filter((n) => n && n.replace(/\D/g, "").length >= 8);
    if (nums.length) return Array.from(new Set(nums));
  } catch (e) {
    logWarn(FN, "resolve_numbers_query_failed", { err: String(e) });
  }

  // 3. Nenhum — NÃO inventa. O chamador regista só a notificação interna.
  return [];
}

// ── IMPURO: notificação WhatsApp ao consultor ────────────────────────────────

async function sendWhatsappNotification(
  uazapi: { url: string; token: string },
  phone: string,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${uazapi.url}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: uazapi.token },
      body: JSON.stringify({ number: phone, text }),
    });
    if (!res.ok) {
      logWarn(FN, "notify_send_failed", { status: res.status });
      return false;
    }
    return true;
  } catch (e) {
    logWarn(FN, "notify_send_error", { err: String(e) });
    return false;
  }
}

// ── IMPURO: executa o handoff completo ───────────────────────────────────────

export interface PerformHandoffResult {
  summary: string;
  crm_link: string;
  numbers_notified: number;
  notificacao_id: string | null;
}

/**
 * Executa o handoff: resumo + link, notificação WhatsApp aos números resolvidos
 * e INSERT em `notificacoes` (tipo 'takeover'). Degradação graciosa — nunca
 * lança; falhas são logadas. `uazapi=null` desliga o envio (só regista).
 */
export async function performHandoff(
  supabase: SupabaseClient,
  ctx: HandoffContext,
  opts: {
    settings: Record<string, unknown> | null | undefined;
    uazapi: { url: string; token: string } | null;
  },
): Promise<PerformHandoffResult> {
  const summary = buildHandoffSummary(ctx);

  // Link do CRM (site_url via integration_keys/env; ausência → link relativo).
  const siteUrl = await getIntegrationKeyWithClient(supabase, "app", "site_url", "NEXT_PUBLIC_SITE_URL");
  const crmLink = buildCrmLink(siteUrl, ctx.lead_id);
  const notifText = buildNotificationText(summary, crmLink);

  // Envia WhatsApp aos números resolvidos (se houver uazapi e números).
  let notified = 0;
  if (opts.uazapi) {
    const numbers = await resolveNotifyNumbers(supabase, opts.settings);
    if (numbers.length === 0) {
      logWarn(FN, "handoff_no_numbers", { leadId: ctx.lead_id });
    }
    for (const phone of numbers) {
      const ok = await sendWhatsappNotification(opts.uazapi, phone, notifText);
      if (ok) notified++;
    }
  }

  // Regista SEMPRE a notificação interna (FR26), mesmo sem números WhatsApp.
  const prioridade = ctx.pause_reason === "urgent" ? "urgente" : "alta";
  let notificacaoId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("notificacoes")
      .insert({
        tipo: "takeover",
        titulo: `Transferência: ${REASON_LABEL[ctx.pause_reason] ?? ctx.pause_reason}`,
        mensagem: summary,
        prioridade,
        lead_id: ctx.lead_id,
        accao_url: crmLink,
        metadata: { pause_reason: ctx.pause_reason, numbers_notified: notified },
      })
      .select("id")
      .single();
    if (error) {
      logError(FN, "notificacao_insert_failed", { err: error.message });
    } else {
      notificacaoId = (data as { id: string }).id;
    }
  } catch (e) {
    logError(FN, "notificacao_insert_error", { err: String(e) });
  }

  logInfo(FN, "handoff_done", {
    leadId: ctx.lead_id,
    reason: ctx.pause_reason,
    numbers_notified: notified,
    notificacao_id: notificacaoId,
  });

  return { summary, crm_link: crmLink, numbers_notified: notified, notificacao_id: notificacaoId };
}
