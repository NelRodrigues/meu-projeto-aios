// =============================================================================
// isilda-recompra-cron — Lembretes de aniversário/ocasiões pela Soraya
// -----------------------------------------------------------------------------
// Corre periodicamente (cron). Para o tenant Delicias da Isi:
//   1. Lê ocasioes_cliente activas cujo evento (MM-DD) está nos próximos N dias
//   2. Evita reenvio se já houve lembrete nos últimos 300 dias (1x/ano)
//   3. Gera mensagem calorosa via Claude (persona Soraya)
//   4. Envia via uazapi e grava em whatsapp_messages (tenant Isi)
//   5. Marca ultimo_lembrete_enviado
// Isolado: só toca no tenant Isi e na instância Delicias_Isi.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TENANT_ID = "81bc8777-39f3-477a-8ad6-44f9dcf1eca8";
const INSTANCE_ID = "d861fc6c-4ee7-46a9-9808-ed964eee99b3";

const JANELA_DIAS = 10;       // antecedência do lembrete
const MAX_LEMBRETES = 10;     // limite por execução
const COOLDOWN_DIAS = 300;    // não reenviar antes disto (1x por ano)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIPO_LABELS: Record<string, string> = {
  aniversario_proprio: "aniversário",
  aniversario_filho: "aniversário do filho(a)",
  aniversario_familiar: "aniversário familiar",
  casamento: "aniversário de casamento",
  batizado: "batizado",
  formatura: "formatura",
  natal: "Natal",
  outro: "evento especial",
};

function normalizeAngolaPhone(input: string): string {
  const digits = String(input).replace(/@s\.whatsapp\.net/g, "").replace(/@c\.us/g, "").replace(/@lid/g, "").replace(/\D/g, "");
  if (digits.startsWith("244") && digits.length === 12) return digits;
  if (digits.length === 9 && digits.startsWith("9")) return "244" + digits;
  if (digits.startsWith("244") && digits.length > 12) { const local = digits.slice(3); if (local.length === 9 && local.startsWith("9")) return "244" + local; }
  if (digits.length <= 9) return "244" + digits;
  return digits;
}
function normalizeUazapiUrl(input: string): string {
  const val = String(input).trim();
  if (val.startsWith("http://") || val.startsWith("https://")) return val.replace(/\/+$/, "");
  if (val.includes(".uazapi.com")) return `https://${val.replace(/\/+$/, "")}`;
  return `https://${val}.uazapi.com`;
}

// Dias até ao próximo evento recorrente (MM-DD), a partir de hoje (WAT).
function diasAteEvento(mmdd: string, hojeWAT: Date): number {
  const [mes, dia] = mmdd.split("-").map((n) => parseInt(n, 10));
  if (!mes || !dia) return 9999;
  const ano = hojeWAT.getUTCFullYear();
  let evento = Date.UTC(ano, mes - 1, dia);
  const hoje = Date.UTC(hojeWAT.getUTCFullYear(), hojeWAT.getUTCMonth(), hojeWAT.getUTCDate());
  if (evento < hoje) evento = Date.UTC(ano + 1, mes - 1, dia);
  return Math.round((evento - hoje) / (1000 * 60 * 60 * 24));
}

async function getKey(supabase: any, service: string, keyName: string, env?: string): Promise<string | undefined> {
  for (const tid of [TENANT_ID, null]) {
    let q = supabase.from("integration_keys").select("key_value").eq("service", service).eq("key_name", keyName).eq("is_active", true);
    q = tid ? q.eq("tenant_id", tid) : q.is("tenant_id", null);
    const { data } = await q.maybeSingle();
    if (data?.key_value) return data.key_value;
  }
  return env ? Deno.env.get(env) : undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";

  try {
    const now = new Date();
    const horaWAT = (now.getUTCHours() + 1) % 24;
    // Horário de envio 09h–19h WAT (exceto dry_run).
    if (!dryRun && (horaWAT < 9 || horaWAT >= 19)) {
      return new Response(JSON.stringify({ skipped: true, reason: `fora do horario (${horaWAT}h WAT)` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseUrlRaw = await getKey(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
    const token = await getKey(supabase, "uazapi", "token", "UAZAPI_TOKEN");
    const apiKey = await getKey(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
    if (!baseUrlRaw || !token) throw new Error("uazapi não configurado");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    const baseUrl = normalizeUazapiUrl(baseUrlRaw);

    // Ocasiões activas do tenant Isi
    const { data: ocasioes, error } = await supabase
      .from("ocasioes_cliente")
      .select("id, cliente_id, tipo, nome_pessoa, data_evento, ultimo_lembrete_enviado")
      .eq("activo", true)
      .or(`tenant_id.eq.${TENANT_ID},tenant_id.is.null`);
    if (error) throw error;

    const candidatas = (ocasioes || [])
      .map((o: any) => ({ ...o, dias: diasAteEvento(o.data_evento, now) }))
      .filter((o: any) => o.dias >= 0 && o.dias <= JANELA_DIAS)
      .filter((o: any) => {
        if (!o.ultimo_lembrete_enviado) return true;
        const diff = (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - new Date(o.ultimo_lembrete_enviado).getTime()) / (1000 * 60 * 60 * 24);
        return diff >= COOLDOWN_DIAS;
      })
      .sort((a: any, b: any) => a.dias - b.dias)
      .slice(0, MAX_LEMBRETES);

    if (candidatas.length === 0) {
      return new Response(JSON.stringify({ processed: 0, enviados: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let enviados = 0;
    const detalhes: any[] = [];

    for (const oc of candidatas) {
      try {
        const { data: contact } = await supabase
          .from("contacts")
          .select("nome, telefone, whatsapp_id")
          .eq("id", oc.cliente_id)
          .single();
        const phoneRaw = contact?.whatsapp_id || contact?.telefone;
        if (!phoneRaw) { detalhes.push({ ocasiao: oc.id, skip: "sem telefone" }); continue; }
        const phone = normalizeAngolaPhone(phoneRaw);
        const tipoLabel = TIPO_LABELS[oc.tipo] || "evento especial";
        const nomePessoa = oc.nome_pessoa || contact?.nome || "alguém especial";

        // Último pagamento/bolo do cliente para personalizar
        const { data: ultimoPgto } = await supabase
          .from("payments")
          .select("tipo_bolo")
          .eq("contact_id", oc.cliente_id)
          .order("data_pagamento", { ascending: false })
          .limit(1)
          .maybeSingle();

        const contexto = `Cliente: ${contact?.nome || "—"}. Aproxima-se o ${tipoLabel} de ${nomePessoa} (faltam ${oc.dias} dias).${ultimoPgto?.tipo_bolo ? ` Já encomendou antes: ${ultimoPgto.tipo_bolo}.` : ""}`;

        const systemPrompt = `És a Soraya, assistente da Delicias da Isi, confeitaria artesanal em Luanda.
Escreve UMA mensagem de WhatsApp curta e calorosa (máx 220 caracteres) a lembrar o cliente do evento que se aproxima e a convidar a começar a pensar no bolo.
Regras: português de Angola natural, tom amigo e elegante, sem markdown nem asteriscos, sem inventar preços. Assina como Soraya da Delicias da Isi.`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 300, temperature: 0.7, system: systemPrompt, messages: [{ role: "user", content: contexto }] }),
        });
        if (!res.ok) { detalhes.push({ ocasiao: oc.id, erro: `claude ${res.status}` }); continue; }
        const data = await res.json();
        const mensagem = ((data.content || []).find((b: any) => b.type === "text")?.text || "").trim();
        if (!mensagem) { detalhes.push({ ocasiao: oc.id, skip: "mensagem vazia" }); continue; }

        if (dryRun) {
          detalhes.push({ ocasiao: oc.id, cliente: contact?.nome, dias: oc.dias, mensagem });
          enviados++;
          continue;
        }

        // Enviar via uazapi
        const sendRes = await fetch(`${baseUrl}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ number: phone, text: mensagem }),
        });
        if (!sendRes.ok) { detalhes.push({ ocasiao: oc.id, erro: `uazapi ${sendRes.status}` }); continue; }
        const sendResult = await sendRes.json().catch(() => ({}));
        const messageId = sendResult?.key?.id || sendResult?.messageId || `recompra-${Date.now()}`;

        // Gravar em whatsapp_messages (tenant Isi)
        const nowIso = new Date().toISOString();
        await supabase.from("whatsapp_messages").insert({
          tenant_id: TENANT_ID, instance_id: INSTANCE_ID, contact_id: oc.cliente_id,
          message_id: messageId, content: mensagem, message: mensagem, message_type: "text",
          sender_type: "bot", direction: "outgoing", is_from_me: true, status: "sent",
          sent_at: nowIso, created_at: nowIso,
        });

        // Marcar lembrete enviado
        await supabase.from("ocasioes_cliente").update({ ultimo_lembrete_enviado: nowIso.slice(0, 10) }).eq("id", oc.id);

        enviados++;
        detalhes.push({ ocasiao: oc.id, cliente: contact?.nome, dias: oc.dias, enviado: true });
      } catch (e) {
        detalhes.push({ ocasiao: oc.id, erro: String(e) });
      }
    }

    return new Response(JSON.stringify({ processed: candidatas.length, enviados, dry_run: dryRun, detalhes }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[isilda-recompra-cron] erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
