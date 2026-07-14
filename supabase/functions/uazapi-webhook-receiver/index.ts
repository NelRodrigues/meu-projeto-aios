// ============================================================================
// Edge: uazapi-webhook-receiver (Story 3.1 — AC4, AC5)
// ----------------------------------------------------------------------------
// Recebe webhooks da uazapi (mensagens WhatsApp entrantes) para o SIC Global
// Minds. Fluxo determinístico (arquitectura §5.1):
//
//   valida x-webhook-token (401 se inválido)
//     → evento não-mensagem / fromMe / owner → 200 skip
//     → INSERT webhook_processed_messages (idempotência; 23505 → 200 skip)
//     → opt-out "SAIR" ANTES da fila → pausa conversa (pause_reason=opt_out),
//        despedida fixa, consentimento revogado → 200 (NUNCA enfileira)
//     → ensureLead + ensureConversation
//     → INSERT mensagens_whatsapp (incoming) → o trigger de enqueue (027) trata
//        do debounce 10s.
//
// Devolve SEMPRE 200 em falha de processamento (degradação graciosa, NFR11) —
// só o token inválido devolve 401. Tokens são redigidos nos logs (§8.5).
//
// DEPLOY: `supabase functions deploy uazapi-webhook-receiver --no-verify-jwt`
//   (a validação é o x-webhook-token; deployar COM verify-jwt bloqueia o
//    webhook — lição documentada). O deploy é do @devops, não desta story.
//
// Modelo dedicado GM: sem `tenant_id`, sem `sharedMode`. `lead_id` em tudo.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logInfo, logWarn, logError, redact } from "../_shared/log.ts";
import { isOptOut, OPT_OUT_FAREWELL } from "../_shared/opt-out.ts";

const FN = "uazapi-webhook-receiver";

// ── Acesso tolerante ao formato uazapi (sem `any`) ──────────────────────────
type AnyRecord = Record<string, unknown>;

// Devolve o valor num caminho "a.b.c" se cada passo for objecto; senão undefined.
function dig(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as AnyRecord)[key];
  }
  return cur;
}

// Primeiro valor não-nulo entre vários caminhos.
function firstOf(obj: unknown, paths: string[]): unknown {
  for (const p of paths) {
    const v = dig(obj, p);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

// ── Extractores tolerantes ao formato uazapi ────────────────────────────────
function extractEvent(payload: AnyRecord): string {
  return String(firstOf(payload, ["event", "type", "EventType", "eventType"]) ?? "");
}

function extractMessageData(payload: AnyRecord): AnyRecord {
  const md = payload.message ?? payload.data ?? payload;
  return (md && typeof md === "object" ? md : payload) as AnyRecord;
}

function isFromMeOrOwner(md: AnyRecord): boolean {
  return Boolean(firstOf(md, ["fromMe", "key.fromMe", "wasSentByApi", "owner"]));
}

function extractRemoteJid(md: AnyRecord, payload: AnyRecord): string | null {
  const v =
    firstOf(md, ["key.remoteJid", "chatid", "sender_pn", "from", "phone", "sender"]) ??
    firstOf(payload, ["chat.wa_chatid", "chat.phone"]);
  return v == null ? null : String(v);
}

function extractWhatsappMessageId(md: AnyRecord): string | null {
  const v = firstOf(md, ["key.id", "messageid", "id"]);
  return v == null ? null : String(v);
}

function extractText(md: AnyRecord): string {
  return String(
    firstOf(md, [
      "message.conversation",
      "message.extendedTextMessage.text",
      "body",
      "text",
      "content",
    ]) ?? "",
  );
}

// ── Lead: encontra por telefone/whatsapp_id, cria se não existir ────────────
async function ensureLead(
  supabase: SupabaseClient,
  remoteJid: string,
  senderName: string | null,
): Promise<{ id: string } | null> {
  const rawPhone = normalizeAngolaPhone(String(remoteJid));

  const candidates = new Set<string>();
  const add = (v?: string | null) => {
    if (!v) return;
    const digits = String(v).replace(/\D/g, "");
    if (digits.length >= 8) candidates.add(digits);
  };
  add(rawPhone);
  let noCountry = rawPhone;
  if (noCountry.startsWith("244") && noCountry.length > 9) noCountry = noCountry.slice(3);
  add(noCountry);
  for (const n of [12, 11, 10, 9, 8]) add(rawPhone.slice(-n));

  const orFilter = Array.from(candidates)
    .flatMap((c) => [`telefone.ilike.%${c}%`, `whatsapp_id.ilike.%${c}%`])
    .join(",");

  const { data: found } = await supabase
    .from("leads")
    .select("id")
    .or(orFilter)
    .limit(1)
    .maybeSingle();

  if (found) return found as { id: string };

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      telefone: rawPhone,
      nome: senderName || "Lead WhatsApp",
      whatsapp_id: rawPhone,
      origem: "whatsapp",
      criado_por_bot: true,
    })
    .select("id")
    .single();

  if (error) {
    logError(FN, "ensure_lead_failed", { err: error.message });
    return null;
  }
  return created as { id: string };
}

// ── Conversa activa com o agente activo; cria se não existir ────────────────
async function ensureConversation(
  supabase: SupabaseClient,
  leadId: string,
): Promise<{ id: string; agentId: string | null } | null> {
  const { data: existing } = await supabase
    .from("ai_agent_conversations")
    .select("id, status, agent_id")
    .eq("lead_id", leadId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Reactiva se estava concluída.
    if (existing.status === "completed") {
      await supabase
        .from("ai_agent_conversations")
        .update({ status: "active", paused_at: null, pause_reason: null })
        .eq("id", existing.id);
    }
    return { id: existing.id as string, agentId: (existing.agent_id as string) ?? null };
  }

  const { data: agent } = await supabase
    .from("ai_sales_agents")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!agent) {
    logWarn(FN, "no_active_agent", { leadId });
    return null;
  }

  const { data: conv, error } = await supabase
    .from("ai_agent_conversations")
    .insert({ lead_id: leadId, agent_id: agent.id, status: "active" })
    .select("id")
    .single();

  if (error) {
    logError(FN, "ensure_conversation_failed", { leadId, err: error.message });
    return null;
  }
  return { id: conv.id as string, agentId: agent.id as string };
}

// ── Pausa por resposta humana (Story 3.3, AC4) ──────────────────────────────
// Uma mensagem `fromMe`/owner é o número da GM a falar. Se veio de um humano
// (resposta manual pela inbox/telemóvel) numa conversa activa, pausa o agente
// nessa conversa (`status='paused_by_human'`), respeitando o setting
// `auto_pause_after_human_reply`.
//
// Nota (brief 3.3): o próprio agente também envia como `fromMe`. Não há sinal
// 100% fiável para distinguir no webhook, por isso o comportamento desejado é
// conservador: uma resposta pelo número da GM pausa a conversa do lead — o
// operador retoma o controlo. Aceite explicitamente na story.
async function handleHumanReply(
  supabase: SupabaseClient,
  md: AnyRecord,
  payload: AnyRecord,
): Promise<void> {
  try {
    // Verifica o setting no agente activo.
    const { data: agent } = await supabase
      .from("ai_sales_agents")
      .select("settings")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const autoPause = (agent?.settings as Record<string, unknown> | undefined)?.auto_pause_after_human_reply;
    if (autoPause === false) return; // desligado por configuração

    // Resolve o número do DESTINATÁRIO (o lead) a partir do chat.
    const remoteJid = extractRemoteJid(md, payload);
    if (!remoteJid) return;
    const lead = await ensureLead(supabase, String(remoteJid), null);
    if (!lead) return;

    // Pausa apenas conversas activas (não mexe em transferred/completed).
    await supabase
      .from("ai_agent_conversations")
      .update({
        status: "paused_by_human",
        paused_at: new Date().toISOString(),
        pause_reason: "human_request",
      })
      .eq("lead_id", lead.id)
      .in("status", ["active", "paused_by_schedule"]);

    logInfo(FN, "paused_by_human", { leadId: lead.id });
  } catch (e) {
    logWarn(FN, "human_reply_pause_failed", { err: e instanceof Error ? e.message : String(e) });
  }
}

// ── Opt-out determinístico (pré-fila): pausa, despedida, revoga consentimento ─
async function handleOptOut(
  supabase: SupabaseClient,
  leadId: string,
): Promise<void> {
  // Pausa qualquer conversa activa do lead.
  await supabase
    .from("ai_agent_conversations")
    .update({
      status: "paused_by_human",
      paused_at: new Date().toISOString(),
      pause_reason: "opt_out",
    })
    .eq("lead_id", leadId)
    .in("status", ["active", "paused_by_schedule"]);

  // Regista consentimento revogado (whatsapp_bot). A tabela `consentimentos`
  // modela um consentimento DADO; a revogação marca `revogado_em`.
  await supabase.from("consentimentos").insert({
    lead_id: leadId,
    tipo: "whatsapp_bot",
    consentido: false,
    fonte: "whatsapp_resposta",
    revogado_em: new Date().toISOString(),
    prova: "Opt-out por palavra-chave no WhatsApp",
  });

  logInfo(FN, "opt_out_registered", { leadId });
}

// Envio da despedida fixa (best-effort; não bloqueia a resposta 200).
async function sendFarewell(supabase: SupabaseClient, remoteJid: string): Promise<void> {
  try {
    const uazapiUrl = await getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
    const uazapiToken = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_TOKEN");
    if (!uazapiUrl || !uazapiToken) {
      logWarn(FN, "farewell_skipped_no_uazapi", {});
      return;
    }
    const base = uazapiUrl.replace(/\/+$/, "");
    const url = base.startsWith("http") ? base : `https://${base}`;
    await fetch(`${url}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: uazapiToken },
      body: JSON.stringify({ number: normalizeAngolaPhone(remoteJid), text: OPT_OUT_FAREWELL }),
    });
  } catch (e) {
    logWarn(FN, "farewell_send_failed", { err: e instanceof Error ? e.message : String(e) });
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload: AnyRecord;
    try {
      payload = (await req.json()) as AnyRecord;
    } catch {
      // Payload malformado → 200 (degradação graciosa, NFR11).
      logWarn(FN, "malformed_payload", {});
      return json({ received: true, skipped: "malformed" });
    }

    const event = extractEvent(payload);
    logInfo(FN, "received", { event, payload: redact(payload) });

    // ── Validação do x-webhook-token (401 se inválido) ──────────────────────
    const expectedToken = await getIntegrationKeyWithClient(
      supabase,
      "uazapi",
      "webhook_token",
      "UAZAPI_WEBHOOK_TOKEN",
    );
    if (expectedToken) {
      const incoming = req.headers.get("x-webhook-token") || (payload.webhook_token as string | undefined);
      if (!incoming || incoming !== expectedToken) {
        logWarn(FN, "invalid_token", {});
        return json({ error: "Invalid token" }, 401);
      }
    }

    // ── Só eventos de mensagem passam; o resto → 200 skip ───────────────────
    const messageEvents = new Set(["messages", "message", "messages.upsert"]);
    if (!messageEvents.has(event)) {
      logInfo(FN, "skip_non_message", { event });
      return json({ received: true, skipped: "non_message" });
    }

    const md = extractMessageData(payload);

    if (isFromMeOrOwner(md)) {
      logInfo(FN, "skip_from_me", {});
      return json({ received: true, skipped: "from_me" });
    }

    const remoteJid = extractRemoteJid(md, payload);
    if (!remoteJid) {
      logWarn(FN, "no_remote_jid", {});
      return json({ received: true, skipped: "no_jid" });
    }

    const whatsappMessageId = extractWhatsappMessageId(md);

    // ── Idempotência: INSERT em webhook_processed_messages (23505 → skip) ────
    if (whatsappMessageId) {
      const { error: idemErr } = await supabase
        .from("webhook_processed_messages")
        .insert({ whatsapp_message_id: whatsappMessageId });
      if (idemErr?.code === "23505") {
        logInfo(FN, "duplicate_skip", { whatsappMessageId });
        return json({ received: true, skipped: "duplicate" });
      }
    }

    const senderNameVal =
      firstOf(md, ["senderName"]) ??
      firstOf(payload, ["chat.wa_contactName", "chat.wa_name", "chat.name"]);
    const senderName = senderNameVal == null ? null : String(senderNameVal);
    const text = extractText(md);

    // ── ensureLead (necessário para opt-out e para a conversa) ──────────────
    const lead = await ensureLead(supabase, String(remoteJid), senderName);
    if (!lead) {
      // Não conseguimos resolver/criar o lead → 200 gracioso.
      return json({ received: true, skipped: "no_lead" });
    }

    // ── OPT-OUT "SAIR" ANTES da fila (determinismo pré-LLM, princípio 6) ─────
    if (isOptOut(text)) {
      await handleOptOut(supabase, lead.id);
      await sendFarewell(supabase, String(remoteJid));
      // NUNCA enfileira.
      return json({ received: true, opt_out: true });
    }

    // ── Conversa activa (cria se preciso) ───────────────────────────────────
    const conv = await ensureConversation(supabase, lead.id);

    // ── INSERT mensagens_whatsapp (incoming) → trigger 027 faz o enqueue ────
    const typeVal = firstOf(md, ["type"]);
    const mediaTypeVal =
      firstOf(md, ["mediaType", "media_type"]) ??
      (typeVal && typeVal !== "text" ? typeVal : null);
    const mediaType = mediaTypeVal == null ? null : String(mediaTypeVal);
    const mediaUrlVal = firstOf(md, ["mediaUrl", "media_url"]);
    const mediaUrl = mediaUrlVal == null ? null : String(mediaUrlVal);
    const content = text || (mediaType ? `[${mediaType} recebido]` : "[Mensagem recebida]");

    const { error: msgErr } = await supabase.from("mensagens_whatsapp").insert({
      lead_id: lead.id,
      sender_type: "cliente",
      conteudo: content,
      direction: "incoming",
      message_status: "delivered",
      whatsapp_message_id: whatsappMessageId,
      media_url: mediaUrl,
      media_type: mediaType,
    });

    if (msgErr) {
      logError(FN, "insert_message_failed", { leadId: lead.id, err: msgErr.message });
      // 200 gracioso mesmo em falha de gravação.
      return json({ received: true, skipped: "insert_failed" });
    }

    // Actualiza último contacto (best-effort).
    await supabase
      .from("leads")
      .update({ ultimo_contacto: new Date().toISOString() })
      .eq("id", lead.id);

    logInfo(FN, "queued", { leadId: lead.id, conversationId: conv?.id ?? null });
    return json({ received: true, queued: true });
  } catch (error) {
    // Degradação graciosa (NFR11): erro inesperado → 200, nunca 500.
    logError(FN, "unhandled", { err: error instanceof Error ? error.message : String(error) });
    return json({ received: true, error: "handled" });
  }
});
