// ============================================================================
// Edge `gm-lead-intelligence` — Story 3.4 (AC1, AC2, AC6).
// ----------------------------------------------------------------------------
// Contrato §4.1:
//   Entrada : { lead_id, conversation_ctx }
//             conversation_ctx = array [{role, content}] OU objecto { history }.
//   Efeitos : Haiku 4.5 extrai BANT; calcula sales_score/score_confidence/fit_score;
//             UPDATE `leads` (o trigger 010 deriva `temperature`); se
//             `≥70 & conf≠low` → alerta de lead quente (handoff + mudança de fase).
//   Saída   : { score, confidence, temperature }
//   Auth    : JWT (invocada pelo gm-agent/tool qualify_lead OU cron de re-score).
//
// A LÓGICA vive em ../gm-agent/lead-intelligence.ts (partilhada e testável). Esta
// edge é só o wrapper HTTP: resolve chave/uazapi/agente e delega. Degradação
// graciosa (AC6): falha do modelo → perfil anterior mantido, erro não propagado
// de forma a partir a conversa (devolve 200 com degraded:true).
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getIntegrationKeyWithClient, normalizeUazapiUrl } from "../_shared/get-integration-key.ts";
import { logInfo, logError } from "../_shared/log.ts";
import { qualifyLead, type QualifyDeps } from "../gm-agent/lead-intelligence.ts";
import { buildHotLeadHandler } from "../gm-agent/tools-exec.ts";
import type { AgentConfig, LeadLanguage } from "../gm-agent/types.ts";

const FN = "gm-lead-intelligence";

// Haiku directo — extracção JSON (mesma convenção do tools-exec).
async function callHaikuExtraction(system: string, userContent: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) throw new Error(`Haiku extraction failed: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "{}";
}

async function getUazapiConfig(
  supabase: SupabaseClient,
): Promise<{ url: string; token: string } | null> {
  const rawUrl = await getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
  const token = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_INSTANCE_TOKEN");
  if (!rawUrl || !token) return null;
  return { url: normalizeUazapiUrl(rawUrl), token };
}

async function loadActiveAgent(supabase: SupabaseClient): Promise<AgentConfig | null> {
  const { data } = await supabase
    .from("ai_sales_agents")
    .select("id,name,system_prompt,personality_traits,target_stages,settings,model,temperature,max_tokens")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as AgentConfig) ?? null;
}

// Normaliza conversation_ctx → history [{role,content}].
function toHistory(ctx: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  const arr = Array.isArray(ctx)
    ? ctx
    : ctx && typeof ctx === "object" && Array.isArray((ctx as { history?: unknown }).history)
    ? (ctx as { history: unknown[] }).history
    : [];
  return (arr as Array<Record<string, unknown>>)
    .map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      const content = typeof m.content === "string" ? m.content : "";
      return { role: role as "user" | "assistant", content };
    })
    .filter((m) => m.content.length > 0);
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const leadId = body.lead_id;
    if (!leadId || typeof leadId !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "lead_id obrigatório" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const history = toHistory(body.conversation_ctx);

    const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
    if (!apiKey) {
      logError(FN, "no_anthropic_key", { leadId });
      // Degradação graciosa: sem chave, não sobrescreve nada. Devolve 200 degraded.
      return new Response(JSON.stringify({ ok: false, degraded: true, error: "sem chave anthropic" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Idioma do lead (para o texto do alerta de lead quente).
    const { data: leadRow } = await supabase
      .from("leads")
      .select("idioma_pref")
      .eq("id", leadId)
      .maybeSingle();
    const idioma: LeadLanguage = (leadRow as { idioma_pref?: string })?.idioma_pref === "en" ? "en" : "pt";

    const agent = await loadActiveAgent(supabase);
    const uazapi = await getUazapiConfig(supabase);

    const deps: QualifyDeps = {
      supabase,
      apiKey,
      callHaiku: callHaikuExtraction,
      onHotLead: agent ? buildHotLeadHandler(supabase, agent, uazapi, idioma) : undefined,
      logInfo: (step, c) => logInfo(FN, step, c),
      logError: (step, c) => logError(FN, step, c),
    };

    const result = await qualifyLead(deps, leadId, history);

    // Saída do contrato §4.1: { score, confidence, temperature }.
    return new Response(
      JSON.stringify({
        ok: result.ok,
        degraded: result.degraded ?? false,
        score: result.score?.sales_score ?? null,
        confidence: result.confidence ?? null,
        temperature: result.temperature ?? null,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    logError(FN, "handler_error", { err: String(error) });
    // NUNCA propaga erro que parta o chamador — devolve 200 degraded.
    return new Response(JSON.stringify({ ok: false, degraded: true, error: String(error) }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
