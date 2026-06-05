// =============================================================================
// isilda-lead-intelligence — Gera insights de IA sobre um lead da Delicias da Isi
// -----------------------------------------------------------------------------
// Recebe { contact_id }. Reúne perfil + histórico de whatsapp_messages +
// pagamentos, e pede ao Claude um dossier estruturado (resumo, perfil, próximos
// passos, oportunidades de upsell, score). Grava em contacts.lead_intelligence.
// Escopado ao tenant Delicias da Isi.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TENANT_ID = "81bc8777-39f3-477a-8ad6-44f9dcf1eca8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getAnthropicKey(supabase: any): Promise<string | undefined> {
  for (const tid of [TENANT_ID, null]) {
    let q = supabase.from("integration_keys").select("key_value").eq("service", "anthropic").eq("key_name", "api_key").eq("is_active", true);
    q = tid ? q.eq("tenant_id", tid) : q.is("tenant_id", null);
    const { data } = await q.maybeSingle();
    if (data?.key_value) return data.key_value;
  }
  return Deno.env.get("ANTHROPIC_API_KEY") || undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { contact_id } = await req.json().catch(() => ({}));
    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Perfil
    const { data: contact } = await supabase
      .from("contacts")
      .select("nome, telefone, email, morada, data_aniversario, estagio, origem, notas, valor_total_pago, created_at")
      .eq("id", contact_id)
      .single();

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contacto não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Histórico de mensagens
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, created_at")
      .eq("contact_id", contact_id)
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: true })
      .limit(60);

    // Pagamentos
    const { data: pagamentos } = await supabase
      .from("payments")
      .select("valor, tipo_bolo, metodo, data_pagamento, estado")
      .eq("contact_id", contact_id)
      .order("data_pagamento", { ascending: false })
      .limit(20);

    const historico = (msgs || [])
      .map((m: any) => `${m.direction === "incoming" ? "Cliente" : "Soraya"}: ${String(m.content || "").slice(0, 300)}`)
      .join("\n");

    const totalPago = (pagamentos || []).reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const pagamentosTxt = (pagamentos || [])
      .map((p: any) => `- ${Number(p.valor).toLocaleString("pt-AO")} Kz · ${p.tipo_bolo || "—"} · ${p.metodo || "—"} · ${p.data_pagamento} (${p.estado || "registado"})`)
      .join("\n") || "Nenhum pagamento registado";

    const apiKey = await getAnthropicKey(supabase);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `És um analista de inteligência comercial da Delicias da Isi, uma confeitaria artesanal em Luanda, Angola.
Analisa o lead e produz um dossier accionável em português de Angola.

Responde APENAS com JSON válido nesta estrutura exacta:
{
  "resumo": "2-3 frases sobre quem é o cliente e o seu estado actual",
  "perfil": {
    "temperatura": "QUENTE|MORNO|FRIO",
    "intencao_principal": "string curta",
    "preferencias": ["preferências detectadas: sabores, temas, ocasiões"],
    "objeccoes": ["objecções ou hesitações detectadas, se houver"]
  },
  "score": 0-100,
  "score_justificacao": "porquê deste score",
  "proximos_passos": ["acções concretas que a Isi deve tomar"],
  "oportunidades_upsell": ["sugestões de upsell/cross-sell relevantes"],
  "datas_importantes": ["aniversários ou datas a recordar para recompra"],
  "risco_churn": "BAIXO|MEDIO|ALTO",
  "nota_interna": "alerta ou observação importante para a equipa"
}`;

    const userPrompt = `## PERFIL DO LEAD
Nome: ${contact.nome}
Telefone: ${contact.telefone || "—"}
Email: ${contact.email || "—"}
Morada: ${contact.morada || "—"}
Aniversário: ${contact.data_aniversario || "—"}
Estágio: ${contact.estagio}
Origem: ${contact.origem || "whatsapp"}
Cliente desde: ${contact.created_at}
Notas internas: ${contact.notas || "—"}

## HISTÓRICO FINANCEIRO
Total pago: ${totalPago.toLocaleString("pt-AO")} Kz
${pagamentosTxt}

## CONVERSA (WhatsApp)
${historico || "Sem mensagens registadas"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        temperature: 0.4,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Anthropic ${res.status}: ${err}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const raw = (data.content || []).find((b: any) => b.type === "text")?.text || "{}";
    let intelligence: Record<string, unknown>;
    try {
      const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      intelligence = JSON.parse(jsonStr);
    } catch {
      intelligence = { resumo: raw.slice(0, 1000), erro_parse: true };
    }

    const generatedAt = new Date().toISOString();
    await supabase
      .from("contacts")
      .update({ lead_intelligence: intelligence, lead_intelligence_at: generatedAt })
      .eq("id", contact_id);

    return new Response(JSON.stringify({ ok: true, generated_at: generatedAt, intelligence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[isilda-lead-intelligence] erro:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
