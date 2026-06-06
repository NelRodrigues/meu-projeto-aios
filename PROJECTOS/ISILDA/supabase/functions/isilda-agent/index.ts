// isilda-agent v10 — Soraya: + memoria/humanizacao (nao pede nome a clientes conhecidos)
// SINCRONIZADO com a versao deployed em producao (Supabase edge function v10).
// Capacidades: webhook async (waitUntil), memoria/humanizacao, tools criar_pedido
// e notificar_isilda, deteccao de media, prompt/modelo/temperatura lidos da BD.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TENANT_ID = "81bc8777-39f3-477a-8ad6-44f9dcf1eca8";
const INSTANCE_ID = "d861fc6c-4ee7-46a9-9808-ed964eee99b3";
const AGENT_NAME = "Soraya — Assistente Virtual Delicias da Isi";
const OWNER_PHONE_FALLBACK = "244923894318";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sleep(ms) { return new Promise((r) => setTimeout(r, Math.max(0, ms))); }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function normalizeAngolaPhone(input) {
  const digits = String(input).replace(/@s\.whatsapp\.net/g, "").replace(/@c\.us/g, "").replace(/@lid/g, "").replace(/\D/g, "");
  if (digits.startsWith("244") && digits.length === 12) return digits;
  if (digits.length === 9 && digits.startsWith("9")) return "244" + digits;
  if (digits.startsWith("244") && digits.length > 12) { const local = digits.slice(3); if (local.length === 9 && local.startsWith("9")) return "244" + local; }
  if (digits.length <= 9) return "244" + digits;
  return digits;
}
function normalizeUazapiUrl(input) {
  const val = String(input).trim();
  if (val.startsWith("http://") || val.startsWith("https://")) return val.replace(/\/+$/, "");
  if (val.includes(".uazapi.com")) return `https://${val.replace(/\/+$/, "")}`;
  return `https://${val}.uazapi.com`;
}
function splitMessage(text, maxLength) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const result = [];
  for (const para of paragraphs) {
    if (para.length <= maxLength) { result.push(para); continue; }
    const sentences = para.split(/(?<=[.!?])\s+/); let chunk = "";
    for (const s of sentences) { if (chunk && (chunk + " " + s).length > maxLength) { result.push(chunk.trim()); chunk = s; } else chunk = chunk ? chunk + " " + s : s; }
    if (chunk.trim()) result.push(chunk.trim());
  }
  return result.length > 0 ? result : [text];
}
function sanitizeForContext(text) {
  let s = String(text || "");
  const patterns = [/\bSYSTEM\s*:/gi, /\bOVERRIDE\b/gi, /\bIGNORE\s+PREVIOUS\b/gi, /\bIGNORE\s+ALL\b/gi, /\bFORGET\s+(YOUR|ALL)\b/gi, /\bYOU\s+ARE\s+NOW\b/gi, /\bNEW\s+INSTRUCTIONS?\b/gi, /\bACT\s+AS\b/gi, /\bPRETEND\s+(TO\s+BE|YOU\s+ARE)\b/gi];
  for (const p of patterns) s = s.replace(p, "[filtrado]");
  s = s.replace(/```[\s\S]*?```/g, "[codigo removido]");
  if (s.length > 2000) s = s.substring(0, 2000) + "...";
  return s;
}
function extractMessageContent(m) {
  const msg = m.message || {};
  const directText = msg.conversation || (msg.extendedTextMessage && msg.extendedTextMessage.text) || (typeof m.body === "string" ? m.body : "") || (typeof m.text === "string" ? m.text : "");
  if (directText) return directText;
  const mimetype = String(m.mimetype || (m.content && m.content.mimetype) || m.mediaType || "").toLowerCase();
  const hasAudio = msg.audioMessage || mimetype.includes("audio") || m.type === "audio";
  const hasImage = msg.imageMessage || mimetype.includes("image") || m.type === "image";
  const hasVideo = msg.videoMessage || mimetype.includes("video") || m.type === "video";
  const hasDoc = msg.documentMessage || mimetype.includes("application") || m.type === "document";
  const caption = (msg.imageMessage && msg.imageMessage.caption) || (msg.videoMessage && msg.videoMessage.caption) || (typeof m.caption === "string" ? m.caption : "") || "";
  if (hasAudio) return "[O cliente enviou uma mensagem de voz (audio)]";
  if (hasImage) return caption ? `[O cliente enviou uma imagem] ${caption}` : "[O cliente enviou uma imagem]";
  if (hasVideo) return caption ? `[O cliente enviou um video] ${caption}` : "[O cliente enviou um video]";
  if (hasDoc) return "[O cliente enviou um documento]";
  if (typeof m.content === "string" && !m.content.trim().startsWith("{")) return m.content;
  return "[Mensagem recebida]";
}

const SYSTEM_PROMPT_FALLBACK = `Eu sou a Soraya, assistente virtual da Delicias da Isi, confeitaria em Luanda.\nSou incisiva, humana e lembro-me dos clientes. Nunca invento dados.`;

const AGENT_TOOLS = [
  {
    name: "criar_pedido",
    description: "Regista uma encomenda/pedido no CRM quando o cliente CONFIRMA os detalhes (tipo de bolo, data e valor). Usa quando a venda fecha ou quando enviares um orcamento formal.",
    input_schema: { type: "object", properties: {
      tipo_bolo: { type: "string" }, valor: { type: "number" }, data_entrega: { type: "string", description: "AAAA-MM-DD" },
      estado: { type: "string", enum: ["orcamento", "confirmado"] }, notas: { type: "string" }
    }, required: ["tipo_bolo", "estado"] }
  },
  {
    name: "notificar_isilda",
    description: "Notifica a Isilda (dona da confeitaria) por WhatsApp. Usa SEMPRE que: (1) o cliente pede para falar com uma pessoa/dona; (2) e um orcamento especial/complexo que foge as orientacoes (bolos de andar, casamento, temas muito elaborados, grandes quantidades); (3) o cliente diz que fez um pagamento ou envia comprovativo; (4) o cliente quer cancelar uma encomenda; (5) qualquer assunto fora da tua competencia ou que precise de decisao humana. NAO uses para perguntas normais que ja sabes responder.",
    input_schema: { type: "object", properties: {
      motivo: { type: "string", enum: ["falar_humano", "orcamento_especial", "pagamento", "cancelamento", "outro"] },
      resumo: { type: "string", description: "Resumo claro e curto do que a Isilda precisa de saber/decidir" }
    }, required: ["motivo", "resumo"] }
  }
];

async function callClaude(messages, systemPrompt, apiKey, model, maxTokens, temperature, tools) {
  const body = { model: model || "claude-sonnet-4-5", max_tokens: maxTokens || 1024, temperature: typeof temperature === "number" ? temperature : 0.7, system: systemPrompt, messages };
  if (tools && tools.length) body.tools = tools;
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.text(); throw new Error(`Anthropic ${res.status}: ${err}`); }
  const data = await res.json();
  const block = (data.content || []).find((b) => b.type === "text");
  return { content: (block && block.text) || "", raw_content: data.content || [], stop_reason: data.stop_reason || "end_turn", tokens_input: (data.usage && data.usage.input_tokens) || 0, tokens_output: (data.usage && data.usage.output_tokens) || 0 };
}
async function getKey(supabase, keyName, envFallback) {
  const { data } = await supabase.from("integration_keys").select("key_value").eq("service", "uazapi").eq("key_name", keyName).eq("is_active", true).eq("tenant_id", TENANT_ID).maybeSingle();
  if (data && data.key_value) return data.key_value;
  return envFallback ? Deno.env.get(envFallback) : undefined;
}
async function getAnthropicKey(supabase) {
  for (const tid of [TENANT_ID, null]) {
    let q = supabase.from("integration_keys").select("key_value").eq("service", "anthropic").eq("key_name", "api_key").eq("is_active", true);
    q = tid ? q.eq("tenant_id", tid) : q.is("tenant_id", null);
    const { data } = await q.maybeSingle();
    if (data && data.key_value) return data.key_value;
  }
  return Deno.env.get("ANTHROPIC_API_KEY") || undefined;
}
async function uazapiSend(baseUrl, token, phone, text) {
  const res = await fetch(`${baseUrl}/send/text`, { method: "POST", headers: { "Content-Type": "application/json", token }, body: JSON.stringify({ number: phone, text }) });
  if (!res.ok) { const body = await res.text().catch(() => ""); throw new Error(`uazapi send ${res.status}: ${body}`); }
  const result = await res.json().catch(() => ({}));
  return (result && result.key && result.key.id) || result.messageId || result.id || null;
}
async function uazapiTyping(baseUrl, token, phone) {
  try { await fetch(`${baseUrl}/send/composing`, { method: "POST", headers: { "Content-Type": "application/json", token }, body: JSON.stringify({ number: phone, duration: 2500 }) }); } catch (_) {}
}
async function saveMessage(supabase, contactId, role, content, externalId) {
  const nowIso = new Date().toISOString();
  const msgId = externalId || `isilda-${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { error } = await supabase.from("whatsapp_messages").insert({
    tenant_id: TENANT_ID, instance_id: INSTANCE_ID, contact_id: contactId, message_id: msgId,
    content, message: content, message_type: "text",
    sender_type: role === "lead" ? "cliente" : "bot",
    direction: role === "lead" ? "incoming" : "outgoing",
    is_from_me: role === "agent", status: role === "lead" ? "received" : "sent",
    sent_at: nowIso, created_at: nowIso,
  });
  if (error) console.error("[isilda-agent] saveMessage erro:", error.message);
  return error ? null : msgId;
}
async function loadAgent(supabase) {
  const { data } = await supabase.from("ai_sales_agents").select("id, system_prompt, model, temperature, max_tokens, settings").eq("tenant_id", TENANT_ID).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}
async function ensureContact(supabase, phone, name) {
  const candidates = new Set();
  const add = (v) => { if (!v) return; const d = String(v).replace(/\D/g, ""); if (d.length >= 8) candidates.add(d); };
  add(phone); add(phone.slice(-9));
  const orFilter = Array.from(candidates).flatMap((c) => [`telefone.ilike.%${c}%`, `whatsapp_id.ilike.%${c}%`]).join(",");
  const { data: found } = await supabase.from("contacts").select("id").or(orFilter).limit(1).maybeSingle();
  if (found) return found;
  const { data: created, error } = await supabase.from("contacts").insert({ telefone: `+${phone}`, whatsapp_id: phone, nome: name || "Cliente WhatsApp", estagio: "lead", origem: "whatsapp" }).select("id").single();
  if (error) { console.error("[isilda-agent] erro criar contacto:", error.message); return null; }
  return created;
}
async function ensureConversation(supabase, contactId, agentId) {
  const { data: existing } = await supabase.from("ai_agent_conversations").select("id, status, total_messages_received, total_messages_sent").eq("contact_id", contactId).eq("tenant_id", TENANT_ID).limit(1).maybeSingle();
  if (existing) {
    if (existing.status === "completed") { await supabase.from("ai_agent_conversations").update({ status: "active", paused_at: null, pause_reason: null }).eq("id", existing.id); return { ...existing, status: "active" }; }
    return existing;
  }
  const { data: created, error } = await supabase.from("ai_agent_conversations").insert({ contact_id: contactId, agent_id: agentId, agent_name: AGENT_NAME, tenant_id: TENANT_ID, status: "active" }).select("id, status, total_messages_received, total_messages_sent").single();
  if (error) { console.error("[isilda-agent] erro criar conversa:", error.message); return null; }
  return created;
}
async function buildHistory(supabase, contactId, limit) {
  const { data } = await supabase.from("whatsapp_messages").select("direction, content, created_at").eq("contact_id", contactId).eq("tenant_id", TENANT_ID).order("created_at", { ascending: false }).limit(limit || 30);
  const rows = (data || []).reverse(); const history = [];
  for (const m of rows) { const role = m.direction === "incoming" ? "user" : "assistant"; const last = history[history.length - 1]; const text = sanitizeForContext(m.content || ""); if (!text) continue; if (last && last.role === role) last.content += "\n" + text; else history.push({ role, content: text }); }
  if (history.length === 0) history.push({ role: "user", content: "Ola" });
  if (history[history.length - 1].role !== "user") history.push({ role: "user", content: "..." });
  return history;
}
async function criarPedido(supabase, contactId, input) {
  const { data: contact } = await supabase.from("contacts").select("nome, telefone, whatsapp_id").eq("id", contactId).single();
  const nome = (contact && contact.nome) || "Cliente WhatsApp";
  const phone = (contact && (contact.telefone || contact.whatsapp_id)) || null;
  const phoneDigits = phone ? String(phone).replace(/\D/g, "") : "";
  let leadId = null;
  if (phoneDigits.length >= 8) {
    const { data: leadExist } = await supabase.from("leads").select("id").eq("tenant_id", TENANT_ID).ilike("phone", `%${phoneDigits.slice(-9)}%`).limit(1).maybeSingle();
    if (leadExist) leadId = leadExist.id;
  }
  if (!leadId) {
    const { data: leadNew, error: leadErr } = await supabase.from("leads").insert({ tenant_id: TENANT_ID, name: nome, phone: phone, source: "whatsapp", metadata: { contact_id: contactId, origem: "soraya" } }).select("id").single();
    if (leadErr) return `ERRO ao criar lead: ${leadErr.message}`;
    leadId = leadNew.id;
  }
  const estado = input.estado === "confirmado" ? "confirmed" : "negotiation";
  const valor = Number(input.valor) || 0;
  const dealPayload = { lead_id: leadId, tenant_id: TENANT_ID, title: String(input.tipo_bolo || "Encomenda").slice(0, 200), status: estado, original_price: valor || null, negotiated_price: valor || null, expected_close_date: /^\d{4}-\d{2}-\d{2}$/.test(String(input.data_entrega || "")) ? input.data_entrega : null, notes: input.notas ? String(input.notas).slice(0, 1000) : null, metadata: { origem: "soraya_whatsapp", contact_id: contactId } };
  const { data: deal, error: dealErr } = await supabase.from("deals").insert(dealPayload).select("id").single();
  if (dealErr) return `ERRO ao criar pedido: ${dealErr.message}`;
  return `Pedido registado (estado ${estado}, valor ${valor} Kz). Aparece na pagina de Pedidos.`;
}
async function notificarIsilda(supabase, contactId, input, agentSettings, baseUrl, token) {
  const { data: contact } = await supabase.from("contacts").select("nome, telefone, whatsapp_id").eq("id", contactId).single();
  const clienteNome = (contact && contact.nome) || "Cliente";
  const clienteTel = (contact && (contact.telefone || contact.whatsapp_id)) || "-";
  const ownerPhone = normalizeAngolaPhone((agentSettings && agentSettings.notify_owner_phone) || OWNER_PHONE_FALLBACK);
  const motivoLabels = { falar_humano: "Cliente quer falar consigo", orcamento_especial: "Orcamento especial", pagamento: "Pagamento realizado", cancelamento: "Pedido cancelado", outro: "Atencao necessaria" };
  const titulo = motivoLabels[input.motivo] || "Atencao necessaria";
  const texto = `Ola Isilda! Aqui e a Soraya.\n\n${titulo}\n\nCliente: ${clienteNome}\nContacto: ${clienteTel}\n\n${input.resumo}\n\nPodes responder diretamente ao cliente quando puderes.`;
  let enviada = false;
  try { await uazapiSend(baseUrl, token, ownerPhone, texto); enviada = true; } catch (e) { console.error("[isilda-agent] notificar Isilda falhou:", e); }
  await supabase.from("isilda_notificacoes").insert({ tenant_id: TENANT_ID, contact_id: contactId, motivo: input.motivo, mensagem: input.resumo, cliente_nome: clienteNome, cliente_telefone: clienteTel, enviada }).then(() => {}, () => {});
  return enviada ? `Isilda notificada com sucesso (${titulo}).` : `Notificacao registada mas o envio falhou; a Isilda vera no CRM.`;
}
async function respondToContact(supabase, contactId, incomingText, senderName) {
  const agent = await loadAgent(supabase);
  if (!agent) return { ok: false, reason: "Nenhum agente Soraya activo no tenant Isi" };
  const settings = agent.settings || {};
  const conv = await ensureConversation(supabase, contactId, agent.id);
  if (!conv) return { ok: false, reason: "Falha ao garantir conversa" };
  if (conv.status !== "active") return { ok: false, reason: `Conversa nao activa (${conv.status})` };
  const baseUrlRaw = await getKey(supabase, "base_url", "UAZAPI_BASE_URL");
  const token = await getKey(supabase, "token", "UAZAPI_TOKEN");
  if (!baseUrlRaw || !token) return { ok: false, reason: "uazapi base_url/token em falta" };
  const baseUrl = normalizeUazapiUrl(baseUrlRaw);
  const { data: contact } = await supabase.from("contacts").select("telefone, whatsapp_id, nome").eq("id", contactId).single();
  const phone = normalizeAngolaPhone((contact && (contact.whatsapp_id || contact.telefone)) || "");
  if (!phone) return { ok: false, reason: "Contacto sem telefone" };
  const apiKey = await getAnthropicKey(supabase);
  if (!apiKey) return { ok: false, reason: "ANTHROPIC_API_KEY nao configurada" };
  const history = await buildHistory(supabase, contactId, settings.context_messages_limit || 30);

  // Memoria/humanizacao: detectar se ja conhecemos o cliente pelo nome real.
  const nomeRaw = (contact && contact.nome) ? String(contact.nome).trim() : "";
  const nomesGenericos = ["cliente whatsapp", "cliente", "", "lead whatsapp"];
  const clienteConhecido = nomeRaw && !nomesGenericos.includes(nomeRaw.toLowerCase());
  const primeiroNome = clienteConhecido ? nomeRaw.split(/\s+/)[0] : null;
  const blocoMemoria = clienteConhecido
    ? `MEMORIA: JA CONHECES este cliente. O nome dele e "${nomeRaw}". Trata-o por "${primeiroNome}" desde o inicio, de forma natural e calorosa, como se ja o conhecesses. NUNCA perguntes o nome dele. Da continuidade ao atendimento usando o historico da conversa; nao repitas perguntas cujas respostas ja tens.`
    : `MEMORIA: E a primeira vez que falas com este contacto e ainda nao sabes o nome. Pergunta o nome UMA vez, de forma natural, e depois usa-o sempre.`;

  const fullPrompt = `${agent.system_prompt || SYSTEM_PROMPT_FALLBACK}\n\n---\nDADOS DO CONTACTO\n- Nome: ${sanitizeForContext(nomeRaw || senderName || "Nao informado")}\n- Telefone: ${phone}\n\n${blocoMemoria}\n\nFERRAMENTAS:\n- criar_pedido: usa quando o cliente confirma encomenda ou fechas orcamento formal.\n- notificar_isilda: usa quando o cliente quer falar com a dona, ha orcamento especial/complexo, pagamento realizado, cancelamento, ou qualquer assunto fora da tua competencia. Notifica em silencio e diz ao cliente que a Isilda vai falar com ele.\nNao anuncies as ferramentas; usa-as e continua a conversa naturalmente.\n\nNOTA: Se a ultima mensagem indicar audio/voz, pede gentilmente que escreva por texto.\n\n---\nHoje e ${new Date().toLocaleDateString("pt-AO", { timeZone: "Africa/Luanda" })}`;
  const fallback = settings.fallback_message || "Desculpa, tive um problema tecnico. A Isi vai responder-te em breve!";
  const agentic = history.slice();
  let finalText = fallback; let tIn = 0; let tOut = 0; let pedidoInfo = null; let notifInfo = null;
  try {
    for (let i = 0; i < 4; i++) {
      const r = await callClaude(agentic, fullPrompt, apiKey, agent.model || "claude-sonnet-4-5", agent.max_tokens || 1024, typeof agent.temperature === "number" ? agent.temperature : 0.7, AGENT_TOOLS);
      tIn += r.tokens_input; tOut += r.tokens_output;
      if (r.stop_reason === "tool_use") {
        const toolUses = (r.raw_content || []).filter((b) => b.type === "tool_use");
        const toolResults = [];
        for (const tu of toolUses) {
          let out = "Ferramenta desconhecida.";
          if (tu.name === "criar_pedido") { out = await criarPedido(supabase, contactId, tu.input || {}); pedidoInfo = out; }
          else if (tu.name === "notificar_isilda") { out = await notificarIsilda(supabase, contactId, tu.input || {}, settings, baseUrl, token); notifInfo = out; }
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: out });
        }
        agentic.push({ role: "assistant", content: r.raw_content });
        agentic.push({ role: "user", content: toolResults });
        continue;
      }
      finalText = (r.content || "").trim() || fallback;
      break;
    }
  } catch (e) { console.error("[isilda-agent] Claude/tool falhou:", e); finalText = fallback; }

  const parts = splitMessage(finalText, settings.message_split_max_length || 900);
  await sleep(randomBetween(settings.response_delay_min_ms || 1500, settings.response_delay_max_ms || 4000));
  let sent = 0;
  for (const part of parts) {
    await uazapiTyping(baseUrl, token, phone);
    await sleep(Math.min((part.length / (settings.typing_speed_cpm || 280)) * 60000, 6000));
    const msgId = await uazapiSend(baseUrl, token, phone, part);
    await saveMessage(supabase, contactId, "agent", part, msgId);
    sent++;
    if (parts.length > 1) await sleep(randomBetween(settings.delay_between_messages_min_ms || 500, settings.delay_between_messages_max_ms || 1500));
  }
  await supabase.from("ai_agent_conversations").update({ last_processed_at: new Date().toISOString(), total_messages_sent: (conv.total_messages_sent || 0) + sent }).eq("id", conv.id);
  await supabase.from("ai_agent_logs").insert({ contact_id: contactId, conversation_id: conv.id, agent_id: agent.id, log_type: "message_sent", data: { response: finalText.substring(0, 500), pedido: pedidoInfo, notificacao: notifInfo }, tokens_input: tIn, tokens_output: tOut }).then(() => {}, () => {});
  return { ok: true, response: finalText, pedido: pedidoInfo, notificacao: notifInfo };
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const url = new URL(req.url);
    const payload = await req.json().catch(() => ({}));
    const action = url.searchParams.get("action") || payload.action || "webhook";
    if (action === "ping") return new Response(JSON.stringify({ ok: true, tenant: TENANT_ID, agent: AGENT_NAME, version: 10 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (action === "test_prompt") {
      const apiKey = await getAnthropicKey(supabase);
      if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY nao configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const systemPrompt = String(payload.system_prompt || SYSTEM_PROMPT_FALLBACK);
      const userMsg = String(payload.message || "Ola");
      const fullPrompt = `${systemPrompt}\n\n---\nMODO DE TESTE: simulacao no painel.\n\nHoje e ${new Date().toLocaleDateString("pt-AO", { timeZone: "Africa/Luanda" })}`;
      try {
        const r = await callClaude([{ role: "user", content: sanitizeForContext(userMsg) }], fullPrompt, apiKey, String(payload.model || "claude-sonnet-4-5"), Number(payload.max_tokens) || 1024, typeof payload.temperature === "number" ? payload.temperature : 0.7, null);
        return new Response(JSON.stringify({ ok: true, response: (r.content || "").trim(), tokens_input: r.tokens_input, tokens_output: r.tokens_output }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    }
    if (action === "test_message") {
      const phone = normalizeAngolaPhone(String(payload.phone || ""));
      const text = String(payload.text || "Ola");
      const name = payload.name ? String(payload.name) : null;
      if (!phone) return new Response(JSON.stringify({ error: "phone obrigatorio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const contact = await ensureContact(supabase, phone, name);
      if (!contact) return new Response(JSON.stringify({ error: "Falha contacto" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await saveMessage(supabase, contact.id, "lead", text, `test-${Date.now()}`);
      const r = await respondToContact(supabase, contact.id, text, name);
      return new Response(JSON.stringify({ contact_id: contact.id, ...r }), { status: r.ok ? 200 : 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const event = payload.event || payload.type || payload.EventType || payload.eventType;
    console.log("[isilda-agent] webhook event:", event);
    if (event !== "messages" && event !== "message" && event !== "messages.upsert") return new Response(JSON.stringify({ received: true, ignored: event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const m = payload.message || payload.data || payload;
    const isFromMe = Boolean(m.fromMe ?? (m.key && m.key.fromMe) ?? m.wasSentByApi);
    if (isFromMe) return new Response(JSON.stringify({ received: true, skipped: "fromMe" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const remoteJid = (m.key && m.key.remoteJid) || m.chatid || (payload.chat && payload.chat.wa_chatid) || m.sender_pn || (payload.chat && payload.chat.phone) || m.from || m.phone || m.sender || null;
    if (!remoteJid) return new Response(JSON.stringify({ received: true, skipped: "no-jid" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const remotePhone = normalizeAngolaPhone(String(remoteJid));
    if (remotePhone === normalizeAngolaPhone(OWNER_PHONE_FALLBACK)) return new Response(JSON.stringify({ received: true, skipped: "owner" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const whatsappMessageId = (m.key && m.key.id) || m.messageid || m.id || null;
    if (whatsappMessageId) { const { error: dupErr } = await supabase.from("webhook_processed_messages").insert({ whatsapp_message_id: whatsappMessageId }); if (dupErr && dupErr.code === "23505") return new Response(JSON.stringify({ received: true, skipped: "duplicate" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    const phone = remotePhone;
    const senderName = m.senderName || (payload.chat && (payload.chat.wa_contactName || payload.chat.wa_name || payload.chat.name)) || null;
    const messageContent = extractMessageContent(m);
    const contact = await ensureContact(supabase, phone, senderName);
    if (!contact) return new Response(JSON.stringify({ error: "Falha ao resolver contacto" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    await saveMessage(supabase, contact.id, "lead", messageContent, whatsappMessageId);
    const work = respondToContact(supabase, contact.id, messageContent, senderName).then((r) => console.log("[isilda-agent] resposta:", JSON.stringify(r).substring(0, 200))).catch((e) => console.error("[isilda-agent] erro background:", e));
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) { EdgeRuntime.waitUntil(work); } else { await work; }
    return new Response(JSON.stringify({ received: true, contact_id: contact.id, queued: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[isilda-agent] erro:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
