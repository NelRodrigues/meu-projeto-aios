// =============================================================================
// isilda-agent — Função dedicada e ISOLADA da Delicias da Isi (agente Soraya)
// -----------------------------------------------------------------------------
// Fluxo único e auto-contido (não partilha código com Nelma/Natacha):
//   1. Recebe webhook da uazapi (?action=webhook ou default)
//   2. Resolve/cria contacto em public.contacts (tenant Isi)
//   3. Grava mensagem incoming em public.whatsapp_messages (tenant + instance)
//   4. Chama Claude (Soraya) com histórico real de whatsapp_messages
//   5. Envia resposta via uazapi e grava outgoing em whatsapp_messages
//
// Tudo escopado ao TENANT_ID e INSTANCE_ID da Isi — nunca toca noutros tenants.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Constantes do tenant Delicias da Isi (FIXAS, isolamento explícito) ----
const TENANT_ID = "81bc8777-39f3-477a-8ad6-44f9dcf1eca8";
const INSTANCE_ID = "d861fc6c-4ee7-46a9-9808-ed964eee99b3";
const AGENT_NAME = "Soraya — Assistente Virtual Delicias da Isi";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---- Helpers -----------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeAngolaPhone(input: string): string {
  const digits = String(input)
    .replace(/@s\.whatsapp\.net/g, "")
    .replace(/@c\.us/g, "")
    .replace(/@lid/g, "")
    .replace(/\D/g, "");
  if (digits.startsWith("244") && digits.length === 12) return digits;
  if (digits.length === 9 && digits.startsWith("9")) return "244" + digits;
  if (digits.startsWith("244") && digits.length > 12) {
    const local = digits.slice(3);
    if (local.length === 9 && local.startsWith("9")) return "244" + local;
  }
  if (digits.length <= 9) return "244" + digits;
  return digits;
}

function normalizeUazapiUrl(input: string): string {
  const val = String(input).trim();
  if (val.startsWith("http://") || val.startsWith("https://")) return val.replace(/\/+$/, "");
  if (val.includes(".uazapi.com")) return `https://${val.replace(/\/+$/, "")}`;
  return `https://${val}.uazapi.com`;
}

function splitMessage(text: string, maxLength: number): string[] {
  // Parte apenas por parágrafos (\n\n). Mantém listas e linhas relacionadas
  // juntas para evitar spam de bolhas. Só re-parte um parágrafo que exceda
  // o limite (por frases).
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const result: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxLength) { result.push(para); continue; }
    const sentences = para.split(/(?<=[.!?])\s+/);
    let chunk = "";
    for (const s of sentences) {
      if (chunk && (chunk + " " + s).length > maxLength) { result.push(chunk.trim()); chunk = s; }
      else chunk = chunk ? chunk + " " + s : s;
    }
    if (chunk.trim()) result.push(chunk.trim());
  }
  return result.length > 0 ? result : [text];
}

function sanitizeForContext(text: string): string {
  let s = String(text || "");
  const patterns = [
    /\bSYSTEM\s*:/gi, /\bOVERRIDE\b/gi, /\bIGNORE\s+PREVIOUS\b/gi, /\bIGNORE\s+ALL\b/gi,
    /\bFORGET\s+(YOUR|ALL)\b/gi, /\bYOU\s+ARE\s+NOW\b/gi, /\bNEW\s+INSTRUCTIONS?\b/gi,
    /\bACT\s+AS\b/gi, /\bPRETEND\s+(TO\s+BE|YOU\s+ARE)\b/gi,
  ];
  for (const p of patterns) s = s.replace(p, "[filtrado]");
  s = s.replace(/```[\s\S]*?```/g, "[codigo removido]");
  if (s.length > 2000) s = s.substring(0, 2000) + "...";
  return s;
}

// Extrai texto legível do payload da uazapi, detectando media.
// Quando é media (áudio/imagem/etc.), devolve um marcador legível em vez
// do objecto cru, para não poluir o histórico nem confundir o Claude.
function extractMessageContent(m: Record<string, unknown>): string {
  const msg = (m.message || {}) as Record<string, unknown>;
  const directText =
    (msg.conversation as string) ||
    ((msg.extendedTextMessage as Record<string, unknown>)?.text as string) ||
    (typeof m.body === "string" ? m.body : "") ||
    (typeof m.text === "string" ? m.text : "");
  if (directText) return directText;

  // Detectar media por mediaType/mimetype/objecto.
  const mimetype = String(
    (m.mimetype as string) ||
    ((m.content as Record<string, unknown>)?.mimetype as string) ||
    (m.mediaType as string) ||
    ""
  ).toLowerCase();
  const hasAudio = msg.audioMessage || mimetype.includes("audio") || m.type === "audio";
  const hasImage = msg.imageMessage || mimetype.includes("image") || m.type === "image";
  const hasVideo = msg.videoMessage || mimetype.includes("video") || m.type === "video";
  const hasDoc = msg.documentMessage || mimetype.includes("application") || m.type === "document";
  const caption =
    ((msg.imageMessage as Record<string, unknown>)?.caption as string) ||
    ((msg.videoMessage as Record<string, unknown>)?.caption as string) ||
    (typeof m.caption === "string" ? m.caption : "") ||
    "";

  if (hasAudio) return "[O cliente enviou uma mensagem de voz (áudio)]";
  if (hasImage) return caption ? `[O cliente enviou uma imagem] ${caption}` : "[O cliente enviou uma imagem]";
  if (hasVideo) return caption ? `[O cliente enviou um vídeo] ${caption}` : "[O cliente enviou um vídeo]";
  if (hasDoc) return "[O cliente enviou um documento]";

  // Conteúdo textual residual (evita despejar JSON cru).
  if (typeof m.content === "string" && !m.content.trim().startsWith("{")) return m.content;
  return "[Mensagem recebida]";
}

// ---- System prompt fallback (usado se o agente na BD não tiver prompt) -------
const SYSTEM_PROMPT_FALLBACK = `Eu sou a Soraya, assistente virtual elegante da Delicias da Isi, uma confeitaria artesanal em Luanda, Angola.

OBJECTIVO
- Acolher o lead com elegancia, clareza e simpatia
- Qualificar encomendas, dar informacoes exactas e conduzir o cliente para orcamento e confirmacao

REGRAS DE CONVERSA
- Usa portugues de Angola natural, profissional e caloroso
- Se nao souberes o nome do lead, pergunta primeiro como deves tratar a pessoa
- Se faltar informacao essencial, faz uma pergunta de cada vez
- Nunca inventes prazos nem precos fixos; usa "a partir de"
- Mantem mensagens curtas (2 a 4 linhas)

INFORMACAO BASE
- Confeitaria de Luanda: bolos personalizados, bento cakes, cupcakes e doces para festas
- Horario: Segunda a Sabado, 08h00 as 18h00
- Encomendas com antecedencia minima de 48 horas
- Pagamento por transferencia, Multicaixa Express ou deposito; encomenda confirmada apos comprovativo`;

// ---- Anthropic ---------------------------------------------------------------

async function callClaude(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<{ content: string; tokens_input: number; tokens_output: number }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-5",
      max_tokens: maxTokens || 1024,
      temperature: typeof temperature === "number" ? temperature : 0.7,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  const data = await res.json();
  const block = (data.content as Array<{ type: string; text?: string }> | undefined)?.find((b) => b.type === "text");
  return {
    content: block?.text || "",
    tokens_input: data.usage?.input_tokens || 0,
    tokens_output: data.usage?.output_tokens || 0,
  };
}

// ---- Integration keys (escopo tenant Isi) ------------------------------------

async function getKey(supabase: SupabaseClient, keyName: string, envFallback?: string): Promise<string | undefined> {
  const { data } = await supabase
    .from("integration_keys")
    .select("key_value")
    .eq("service", "uazapi")
    .eq("key_name", keyName)
    .eq("is_active", true)
    .eq("tenant_id", TENANT_ID)
    .maybeSingle();
  if (data?.key_value) return data.key_value;
  return envFallback ? Deno.env.get(envFallback) : undefined;
}

async function getAnthropicKey(supabase: SupabaseClient): Promise<string | undefined> {
  // Tenta tenant Isi, depois global (tenant null), depois env.
  for (const tid of [TENANT_ID, null]) {
    let q = supabase
      .from("integration_keys")
      .select("key_value")
      .eq("service", "anthropic")
      .eq("key_name", "api_key")
      .eq("is_active", true);
    q = tid ? q.eq("tenant_id", tid) : q.is("tenant_id", null);
    const { data } = await q.maybeSingle();
    if (data?.key_value) return data.key_value;
  }
  return Deno.env.get("ANTHROPIC_API_KEY") || undefined;
}

// ---- uazapi send -------------------------------------------------------------

async function uazapiSend(baseUrl: string, token: string, phone: string, text: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`uazapi send ${res.status}: ${body}`);
  }
  const result = await res.json().catch(() => ({}));
  return result?.key?.id || result?.messageId || result?.id || null;
}

async function uazapiTyping(baseUrl: string, token: string, phone: string): Promise<void> {
  try {
    await fetch(`${baseUrl}/send/composing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: phone, duration: 2500 }),
    });
  } catch (_) { /* não-bloqueante */ }
}

// ---- Persistência de mensagens em whatsapp_messages --------------------------

async function saveMessage(
  supabase: SupabaseClient,
  contactId: string,
  role: "lead" | "agent",
  content: string,
  externalId: string | null,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const msgId = externalId || `isilda-${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { error } = await supabase.from("whatsapp_messages").insert({
    tenant_id: TENANT_ID,
    instance_id: INSTANCE_ID,
    contact_id: contactId,
    message_id: msgId,
    content,
    message: content,
    message_type: "text",
    sender_type: role === "lead" ? "cliente" : "bot",
    direction: role === "lead" ? "incoming" : "outgoing",
    is_from_me: role === "agent",
    status: role === "lead" ? "received" : "sent",
    sent_at: nowIso,
    created_at: nowIso,
  });
  if (error) console.error("[isilda-agent] saveMessage erro:", error.message);
}

// ---- Processamento principal -------------------------------------------------

interface AgentRow {
  id: string;
  system_prompt: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  settings: Record<string, unknown> | null;
}

async function loadAgent(supabase: SupabaseClient): Promise<AgentRow | null> {
  const { data } = await supabase
    .from("ai_sales_agents")
    .select("id, system_prompt, model, temperature, max_tokens, settings")
    .eq("tenant_id", TENANT_ID)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as AgentRow | null;
}

async function ensureContact(
  supabase: SupabaseClient,
  phone: string,
  name: string | null,
): Promise<{ id: string } | null> {
  const candidates = new Set<string>();
  const add = (v?: string | null) => {
    if (!v) return;
    const d = String(v).replace(/\D/g, "");
    if (d.length >= 8) candidates.add(d);
  };
  add(phone);
  add(phone.slice(-9));

  const orFilter = Array.from(candidates)
    .flatMap((c) => [`telefone.ilike.%${c}%`, `whatsapp_id.ilike.%${c}%`])
    .join(",");

  const { data: found } = await supabase
    .from("contacts")
    .select("id")
    .or(orFilter)
    .limit(1)
    .maybeSingle();

  if (found) return found as { id: string };

  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      telefone: `+${phone}`,
      whatsapp_id: phone,
      nome: name || "Cliente WhatsApp",
      estagio: "lead",
      origem: "whatsapp",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[isilda-agent] erro a criar contacto:", error.message);
    return null;
  }
  return created as { id: string };
}

async function ensureConversation(
  supabase: SupabaseClient,
  contactId: string,
  agentId: string,
): Promise<{ id: string; status: string } | null> {
  const { data: existing } = await supabase
    .from("ai_agent_conversations")
    .select("id, status")
    .eq("contact_id", contactId)
    .eq("tenant_id", TENANT_ID)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === "completed") {
      await supabase
        .from("ai_agent_conversations")
        .update({ status: "active", paused_at: null, pause_reason: null })
        .eq("id", existing.id);
      return { id: existing.id, status: "active" };
    }
    return existing as { id: string; status: string };
  }

  const { data: created, error } = await supabase
    .from("ai_agent_conversations")
    .insert({
      contact_id: contactId,
      agent_id: agentId,
      agent_name: AGENT_NAME,
      tenant_id: TENANT_ID,
      status: "active",
    })
    .select("id, status")
    .single();

  if (error) {
    console.error("[isilda-agent] erro a criar conversa:", error.message);
    return null;
  }
  return created as { id: string; status: string };
}

async function buildHistory(
  supabase: SupabaseClient,
  contactId: string,
  limit: number,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("direction, content, created_at")
    .eq("contact_id", contactId)
    .eq("tenant_id", TENANT_ID)
    .order("created_at", { ascending: false })
    .limit(limit || 30);

  const rows = (data || []).reverse();
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of rows) {
    const role: "user" | "assistant" = m.direction === "incoming" ? "user" : "assistant";
    const last = history[history.length - 1];
    const text = sanitizeForContext(m.content || "");
    if (!text) continue;
    if (last && last.role === role) last.content += "\n" + text;
    else history.push({ role, content: text });
  }
  if (history.length === 0) history.push({ role: "user", content: "Ola" });
  if (history[history.length - 1].role !== "user") history.push({ role: "user", content: "..." });
  return history;
}

async function respondToContact(
  supabase: SupabaseClient,
  contactId: string,
  incomingText: string,
  senderName: string | null,
): Promise<{ ok: boolean; reason?: string; response?: string }> {
  const agent = await loadAgent(supabase);
  if (!agent) return { ok: false, reason: "Nenhum agente Soraya activo no tenant Isi" };

  const settings = (agent.settings || {}) as Record<string, number>;
  const conv = await ensureConversation(supabase, contactId, agent.id);
  if (!conv) return { ok: false, reason: "Falha ao garantir conversa" };
  if (conv.status !== "active") return { ok: false, reason: `Conversa não activa (${conv.status})` };

  // uazapi config
  const baseUrlRaw = await getKey(supabase, "base_url", "UAZAPI_BASE_URL");
  const token = await getKey(supabase, "token", "UAZAPI_TOKEN");
  if (!baseUrlRaw || !token) return { ok: false, reason: "uazapi base_url/token em falta" };
  const baseUrl = normalizeUazapiUrl(baseUrlRaw);

  // contacto/telefone
  const { data: contact } = await supabase
    .from("contacts")
    .select("telefone, whatsapp_id, nome")
    .eq("id", contactId)
    .single();
  const phone = normalizeAngolaPhone(contact?.whatsapp_id || contact?.telefone || "");
  if (!phone) return { ok: false, reason: "Contacto sem telefone" };

  // API key Anthropic
  const apiKey = await getAnthropicKey(supabase);
  if (!apiKey) return { ok: false, reason: "ANTHROPIC_API_KEY não configurada" };

  // histórico + prompt
  const history = await buildHistory(supabase, contactId, settings.context_messages_limit || 30);
  const fullPrompt = `${agent.system_prompt || SYSTEM_PROMPT_FALLBACK}

---
DADOS DO CONTACTO
- Nome: ${sanitizeForContext(contact?.nome || senderName || "Não informado")}
- Telefone: ${phone}

---
Hoje é ${new Date().toLocaleDateString("pt-AO", { timeZone: "Africa/Luanda" })}
Horário: ${new Date().toLocaleTimeString("pt-AO", { timeZone: "Africa/Luanda" })}`;

  const fallback = (settings as unknown as { fallback_message?: string }).fallback_message
    || "Desculpa, tive um problema técnico. A Isi vai responder-te em breve!";

  let result;
  try {
    result = await callClaude(
      history,
      fullPrompt,
      apiKey,
      agent.model || "claude-sonnet-4-5",
      agent.max_tokens || 1024,
      typeof agent.temperature === "number" ? agent.temperature : 0.7,
    );
  } catch (e) {
    console.error("[isilda-agent] Claude falhou:", e);
    result = { content: fallback, tokens_input: 0, tokens_output: 0 };
  }

  const finalText = (result.content || "").trim() || fallback;

  // enviar humanizado (split + typing)
  const parts = splitMessage(finalText, settings.message_split_max_length || 300);
  await sleep(randomBetween(settings.response_delay_min_ms || 1500, settings.response_delay_max_ms || 4000));
  for (const part of parts) {
    await uazapiTyping(baseUrl, token, phone);
    await sleep(Math.min((part.length / (settings.typing_speed_cpm || 280)) * 60000, 6000));
    const msgId = await uazapiSend(baseUrl, token, phone, part);
    await saveMessage(supabase, contactId, "agent", part, msgId);
    if (parts.length > 1) {
      await sleep(randomBetween(settings.delay_between_messages_min_ms || 500, settings.delay_between_messages_max_ms || 1500));
    }
  }

  // actualizar conversa + log
  await supabase
    .from("ai_agent_conversations")
    .update({ last_processed_at: new Date().toISOString() })
    .eq("id", conv.id);

  await supabase.from("ai_agent_logs").insert({
    contact_id: contactId,
    conversation_id: conv.id,
    agent_id: agent.id,
    log_type: "message_sent",
    data: { response: finalText.substring(0, 500) },
    tokens_input: result.tokens_input,
    tokens_output: result.tokens_output,
  }).then(() => {}, () => {}); // log best-effort

  return { ok: true, response: finalText };
}

// ---- HTTP handler ------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const payload = await req.json().catch(() => ({}));
    const action = url.searchParams.get("action") || payload.action || "webhook";

    // --- Endpoint de teste/healthcheck ---
    if (action === "ping") {
      return new Response(JSON.stringify({ ok: true, tenant: TENANT_ID, agent: AGENT_NAME }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Endpoint de teste directo: simula um lead sem uazapi real entregar ---
    if (action === "test_message") {
      const phone = normalizeAngolaPhone(String(payload.phone || ""));
      const text = String(payload.text || "Olá");
      const name = payload.name ? String(payload.name) : null;
      if (!phone) return new Response(JSON.stringify({ error: "phone obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const contact = await ensureContact(supabase, phone, name);
      if (!contact) return new Response(JSON.stringify({ error: "Falha contacto" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await saveMessage(supabase, contact.id, "lead", text, `test-${Date.now()}`);
      const r = await respondToContact(supabase, contact.id, text, name);
      return new Response(JSON.stringify({ contact_id: contact.id, ...r }), {
        status: r.ok ? 200 : 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Webhook real da uazapi ---
    const event = payload.event || payload.type || payload.EventType || payload.eventType;
    const redacted = JSON.parse(JSON.stringify(payload, (k, v) =>
      ["token", "admintoken", "authorization"].includes(String(k).toLowerCase()) ? "[REDACTED]" : v));
    console.log("[isilda-agent] webhook event:", event, JSON.stringify(redacted).substring(0, 800));

    if (event !== "messages" && event !== "message" && event !== "messages.upsert") {
      console.log("[isilda-agent] evento ignorado:", event);
      return new Response(JSON.stringify({ received: true, ignored: event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const m = payload.message || payload.data || payload;
    const isFromMe = Boolean(m.fromMe ?? m.key?.fromMe ?? m.wasSentByApi);
    if (isFromMe) {
      console.log("[isilda-agent] ignorar outgoing");
      return new Response(JSON.stringify({ received: true, skipped: "fromMe" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const remoteJid = m.key?.remoteJid || m.chatid || payload.chat?.wa_chatid || m.sender_pn || payload.chat?.phone || m.from || m.phone || m.sender || null;
    if (!remoteJid) {
      console.log("[isilda-agent] sem remoteJid");
      return new Response(JSON.stringify({ received: true, skipped: "no-jid" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const whatsappMessageId = m.key?.id || m.messageid || m.id || null;

    // Idempotência
    if (whatsappMessageId) {
      const { error: dupErr } = await supabase
        .from("webhook_processed_messages")
        .insert({ whatsapp_message_id: whatsappMessageId });
      if (dupErr?.code === "23505") {
        console.log("[isilda-agent] duplicado:", whatsappMessageId);
        return new Response(JSON.stringify({ received: true, skipped: "duplicate" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const phone = normalizeAngolaPhone(String(remoteJid));
    const senderName = m.senderName || payload.chat?.wa_contactName || payload.chat?.wa_name || payload.chat?.name || null;

    const messageContent = extractMessageContent(m);

    const contact = await ensureContact(supabase, phone, senderName);
    if (!contact) {
      return new Response(JSON.stringify({ error: "Falha ao resolver contacto" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await saveMessage(supabase, contact.id, "lead", messageContent, whatsappMessageId);

    // Processar em background: responde 200 já, para a uazapi não dar timeout
    // (Claude + envios humanizados podem demorar 10-60s). Idempotência protege
    // contra reenvios. EdgeRuntime.waitUntil mantém a função viva até concluir.
    const work = respondToContact(supabase, contact.id, messageContent, senderName)
      .then((r) => console.log("[isilda-agent] resposta:", JSON.stringify(r).substring(0, 300)))
      .catch((e) => console.error("[isilda-agent] erro background:", e));

    // @ts-ignore EdgeRuntime existe no runtime Supabase Edge
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work);
    } else {
      await work;
    }

    return new Response(JSON.stringify({ received: true, contact_id: contact.id, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[isilda-agent] erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
