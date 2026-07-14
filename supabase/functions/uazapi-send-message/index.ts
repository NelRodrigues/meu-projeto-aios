// ============================================================================
// Edge: uazapi-send-message (Story 3.6 — AC3)
// ----------------------------------------------------------------------------
// Envio manual de mensagem pelo operador a partir da inbox de supervisão.
// Contrato (§4.1):  entrada { lead_id, message, media_url? }  →  { ok, message_id }
//
// Fluxo:
//   valida JWT do utilizador (auth.getUser) → 401 se inválido
//     → resolve o telefone do lead (leads.telefone)
//     → envia via uazapi pelo helper humanizado (typing/split/delays — 3.1)
//     → grava mensagens_whatsapp (direction=outgoing, sender_type='humano')
//     → pausa a conversa se auto_pause_after_human_reply != false (FR14)
//     → { ok:true, message_id }
//
// Auth: JWT normal (NÃO é webhook). DEPLOY COM verify-jwt (deploy do @devops):
//   `supabase functions deploy uazapi-send-message`
//
// Modelo dedicado GM: `lead_id` em tudo, sem tenant_id.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getIntegrationKeyWithClient,
  normalizeUazapiUrl,
  normalizeAngolaPhone,
} from "../_shared/get-integration-key.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendHumanized } from "../_shared/humanized-send.ts";
import { logInfo, logWarn, logError } from "../_shared/log.ts";
import { parseSendInput, shouldPauseAfterHumanReply } from "./logic.ts";

const FN = "uazapi-send-message";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth: valida o JWT do utilizador que veio no Authorization ────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ ok: false, error: "Não autenticado" }, 401);

    // Cliente com o JWT do utilizador só para VALIDAR a identidade.
    const authClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ ok: false, error: "Sessão inválida" }, 401);
    }

    // Cliente service_role para as operações (RLS coberto; operador já validado).
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const parsed = parseSendInput(body);
    if (!parsed.ok || !parsed.lead_id || !parsed.message) {
      return json({ ok: false, error: parsed.error ?? "Pedido inválido" }, 400);
    }

    // ── Resolve o telefone do lead ────────────────────────────────────────────
    const { data: leadRow } = await supabase
      .from("leads")
      .select("telefone")
      .eq("id", parsed.lead_id)
      .maybeSingle();
    const phone = normalizeAngolaPhone((leadRow as { telefone?: string } | null)?.telefone ?? "");
    if (!phone) {
      return json({ ok: false, error: "Lead sem telefone válido" }, 422);
    }

    // ── Config uazapi (mesma convenção do receiver/agente) ────────────────────
    const rawUrl = await getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
    const uazToken = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_INSTANCE_TOKEN");
    if (!rawUrl || !uazToken) {
      logError(FN, "no_uazapi_config", {});
      return json({ ok: false, error: "Instância WhatsApp não configurada" }, 503);
    }
    const uazapiUrl = normalizeUazapiUrl(rawUrl);

    // Settings do agente (para split/delays e para a decisão de pausa).
    const { data: agent } = await supabase
      .from("ai_sales_agents")
      .select("settings")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const settings = (agent?.settings as Record<string, unknown> | undefined) ?? {};

    // ── Envia via uazapi (helper humanizado da 3.1) ───────────────────────────
    const deps = {
      async sendText(text: string): Promise<string | null> {
        const res = await fetch(`${uazapiUrl}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: uazToken },
          body: JSON.stringify({ number: phone, text }),
        });
        if (!res.ok) {
          logWarn(FN, "send_text_failed", { status: res.status });
          return null;
        }
        const data = await res.json().catch(() => ({}));
        return data?.id || data?.messageid || data?.key?.id || null;
      },
      async setTyping(on: boolean): Promise<void> {
        try {
          await fetch(`${uazapiUrl}/send/composing`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: uazToken },
            body: JSON.stringify({ number: phone, presence: on ? "composing" : "paused" }),
          });
        } catch {
          // typing é cosmético — nunca bloqueia o envio.
        }
      },
    };

    const result = await sendHumanized(parsed.message, deps, settings);
    if (result.parts.length === 0 || result.messageIds.length === 0) {
      // Nada saiu — não grava outgoing fantasma.
      return json({ ok: false, error: "Falha no envio pela instância WhatsApp" }, 502);
    }

    // ── Grava outgoing (sender_type='humano' — distingue do 'bot' do agente) ──
    for (const part of result.parts) {
      await supabase.from("mensagens_whatsapp").insert({
        lead_id: parsed.lead_id,
        conteudo: part,
        direction: "outgoing",
        sender_type: "humano",
      });
    }

    // ── Pausa a conversa se auto_pause_after_human_reply != false (FR14) ──────
    const { data: conv } = await supabase
      .from("ai_agent_conversations")
      .select("status")
      .eq("lead_id", parsed.lead_id)
      .maybeSingle();
    const currentStatus = (conv as { status?: string } | null)?.status ?? null;

    if (shouldPauseAfterHumanReply(settings, currentStatus)) {
      await supabase
        .from("ai_agent_conversations")
        .update({
          status: "paused_by_human",
          paused_at: new Date().toISOString(),
          pause_reason: "manual",
          paused_by: userData.user.id,
        })
        .eq("lead_id", parsed.lead_id)
        .in("status", ["active", "paused_by_schedule"]);
      logInfo(FN, "paused_by_human", { leadId: parsed.lead_id, by: userData.user.id });
    }

    logInfo(FN, "sent", { leadId: parsed.lead_id, parts: result.parts.length });
    return json({ ok: true, message_id: result.messageIds[0], parts: result.parts.length });
  } catch (error) {
    logError(FN, "handler_error", { err: error instanceof Error ? error.message : String(error) });
    return json({ ok: false, error: "Erro interno" }, 500);
  }
});
