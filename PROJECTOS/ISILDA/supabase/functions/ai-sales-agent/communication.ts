import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeUazapiUrl, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import type { AgentSettings } from "./types.ts";
import { sleep, randomBetween, splitMessage } from "./helpers.ts";

export async function getUazapiConfig(
  supabase: SupabaseClient,
  clienteId: string
): Promise<{ baseUrl: string; token: string; phone: string } | null> {
  const { data: cliente } = await supabase
    .from("clientes")
    .select("telefone, whatsapp_id")
    .eq("id", clienteId)
    .single();

  const phone = cliente?.whatsapp_id || cliente?.telefone;
  if (!phone) return null;

  const baseUrl = await getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
  const token = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_TOKEN");

  if (!baseUrl || !token) return null;

  return {
    baseUrl: normalizeUazapiUrl(baseUrl),
    token,
    phone: normalizeAngolaPhone(phone),
  };
}

export async function sendTypingIndicator(
  phone: string,
  config: { baseUrl: string; token: string }
): Promise<void> {
  try {
    await fetch(`${config.baseUrl}/send/composing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: config.token },
      body: JSON.stringify({ number: phone, duration: 3000 }),
    });
  } catch (e) {
    console.warn("[comm] Typing indicator failed:", e);
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  text: string,
  config: { baseUrl: string; token: string },
  supabase: SupabaseClient,
  clienteId: string
): Promise<string | null> {
  const res = await fetch(`${config.baseUrl}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: config.token },
    body: JSON.stringify({ number: phone, text }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    console.error(`[comm] UAZAPI send failed (${res.status}): ${errorBody}`);
    throw new Error(`UAZAPI send failed: ${res.status}`);
  }

  const result = await res.json();
  const messageId = result?.key?.id || result?.messageId || null;

  await supabase.from("mensagens_whatsapp").insert({
    cliente_id: clienteId,
    sender_type: "bot",
    conteudo: text,
    whatsapp_message_id: messageId,
    direction: "outgoing",
    message_status: "sent",
  });

  return messageId;
}

export async function sendHumanizedResponse(
  phone: string,
  text: string,
  settings: AgentSettings,
  config: { baseUrl: string; token: string },
  supabase: SupabaseClient,
  clienteId: string
): Promise<void> {
  await sleep(randomBetween(settings.response_delay_min_ms, settings.response_delay_max_ms));

  const parts = splitMessage(text, settings.message_split_max_length);

  for (const part of parts) {
    await sendTypingIndicator(phone, config);
    const typingMs = (part.length / settings.typing_speed_cpm) * 60000;
    await sleep(Math.min(typingMs, 8000));
    await sendWhatsAppMessage(phone, part, config, supabase, clienteId);

    if (parts.length > 1) {
      await sleep(randomBetween(settings.delay_between_messages_min_ms, settings.delay_between_messages_max_ms));
    }
  }
}

export async function atomicRateLimit(
  supabase: SupabaseClient,
  clienteId: string,
  maxPerHour: number,
  maxPerDay: number
): Promise<boolean> {
  // Simple rate limit via ai_agent_send_counts
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [hourResult, dayResult] = await Promise.all([
    supabase
      .from("ai_agent_send_counts")
      .select("message_count")
      .eq("cliente_id", clienteId)
      .eq("window_type", "hour")
      .eq("window_start", hourStart)
      .maybeSingle(),
    supabase
      .from("ai_agent_send_counts")
      .select("message_count")
      .eq("cliente_id", clienteId)
      .eq("window_type", "day")
      .eq("window_start", dayStart)
      .maybeSingle(),
  ]);

  const hourCount = hourResult.data?.message_count || 0;
  const dayCount = dayResult.data?.message_count || 0;

  if (hourCount >= maxPerHour || dayCount >= maxPerDay) return false;

  // Increment counters
  await Promise.all([
    supabase.from("ai_agent_send_counts").upsert(
      { cliente_id: clienteId, window_type: "hour", window_start: hourStart, message_count: hourCount + 1 },
      { onConflict: "cliente_id,window_start,window_type" }
    ),
    supabase.from("ai_agent_send_counts").upsert(
      { cliente_id: clienteId, window_type: "day", window_start: dayStart, message_count: dayCount + 1 },
      { onConflict: "cliente_id,window_start,window_type" }
    ),
  ]);

  return true;
}

export async function insertSystemMessage(
  supabase: SupabaseClient,
  clienteId: string,
  message: string
): Promise<void> {
  try {
    await supabase.from("mensagens_whatsapp").insert({
      cliente_id: clienteId,
      sender_type: "sistema",
      conteudo: message,
      direction: "internal",
      message_status: "delivered",
    });
  } catch (e) {
    console.error("[comm] Failed to insert system message:", e);
  }
}
