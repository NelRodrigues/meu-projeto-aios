// ============================================================================
// Processador da fila do agente Global Minds (`gm-agent`). Story 3.2.
// Módulo IMPURO — importa URLs Deno, _shared e supabase-js. NÃO importar em
// node:test (a lógica testável vive em prompt.ts/knowledge.ts/safety.ts).
//
// Fluxo (§5.1): claim_queue_messages → try_acquire_agent_lock → contexto do
// lead → buildPrompt (§6 L0–L8) → Haiku classifica → Sonnet responde (loop de
// tools ≤4) → checkGuardrails (regenera) → sendHumanized → grava outgoing +
// ai_agent_logs → release_agent_lock.
//
// NÃO faz (por design, outras stories): escalação D5 pré-LLM (3.3), execução
// real de tools (3.4/3.5), limites/horário de envio (3.7).
// ============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callClassification,
  callResponseWithTools,
  checkGuardrails,
} from "../_shared/llm-client.ts";
import { getIntegrationKeyWithClient, normalizeUazapiUrl, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import { sendHumanized } from "../_shared/humanized-send.ts";
import { logInfo, logError } from "../_shared/log.ts";
import { buildPrompt, FORBIDDEN_PHRASES } from "./prompt.ts";
import { detectJailbreakAttempt, sanitizeForContext, stripInternalThinking } from "./safety.ts";
import { AGENT_TOOLS, executeToolPlaceholder } from "./tools.ts";
import { matchFaq } from "./knowledge.ts";
import { isConversationalMessage, resolveEscalation } from "./escalation.ts";
import { performHandoff } from "./handoff.ts";
import type { AgentConfig, LeadContext, LeadLanguage, QueueMessage } from "./types.ts";

const FN = "gm-agent";

interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Config uazapi (instância partilhada — integration_keys) ──────────────────
async function getUazapiConfig(supabase: SupabaseClient): Promise<{ url: string; token: string } | null> {
  // Alinhado com a edge `uazapi-webhook-receiver` (3.1), que já lê `uazapi/base_url`
  // e `uazapi/token` da `integration_keys` — uma só convenção para a mesma
  // integração. (A 3.2 tinha divergido para `instance_url`/`instance_token`, que
  // não existiam na BD → getUazapiConfig devolvia null e a fila nunca era processada.)
  const rawUrl = await getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
  const token = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_INSTANCE_TOKEN");
  if (!rawUrl || !token) return null;
  return { url: normalizeUazapiUrl(rawUrl), token };
}

// ── Deps de envio humanizado ligadas à uazapi (/send/text, /send/composing) ──
function makeUazapiSendDeps(cfg: { url: string; token: string }, phone: string) {
  return {
    async sendText(text: string): Promise<string | null> {
      const res = await fetch(`${cfg.url}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: cfg.token },
        body: JSON.stringify({ number: phone, text }),
      });
      if (!res.ok) {
        logError(FN, "send_text_failed", { status: res.status });
        return null;
      }
      const data = await res.json().catch(() => ({}));
      return data?.id || data?.messageid || data?.key?.id || null;
    },
    async setTyping(on: boolean): Promise<void> {
      try {
        await fetch(`${cfg.url}/send/composing`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: cfg.token },
          body: JSON.stringify({ number: phone, presence: on ? "composing" : "paused" }),
        });
      } catch {
        // typing é cosmético — nunca deixa cair o envio.
      }
    },
  };
}

// ── Idioma: usa idioma_pref do lead; heurística leve como reforço ────────────
function detectLanguage(pref: string | null | undefined, text: string): LeadLanguage {
  if (pref === "en") return "en";
  if (pref === "pt") return "pt";
  const t = (text || "").toLowerCase();
  const enHits = /\b(hello|hi|please|thanks|thank you|how much|cost|study|university|which|when)\b/.test(t);
  return enHits ? "en" : "pt";
}

// ── Carrega a config do agente activo ────────────────────────────────────────
async function loadAgent(supabase: SupabaseClient): Promise<AgentConfig | null> {
  const { data } = await supabase
    .from("ai_sales_agents")
    .select("id,name,system_prompt,personality_traits,target_stages,settings,model,temperature,max_tokens")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as AgentConfig) ?? null;
}

// ── Contexto do lead (L2) + histórico ────────────────────────────────────────
async function loadLeadContext(
  supabase: SupabaseClient,
  leadId: string,
  limit: number,
): Promise<{ lead: LeadContext; history: Array<{ role: "user" | "assistant"; content: string }>; lastIncoming: string }> {
  const { data: lead } = await supabase
    .from("leads")
    .select("id,nome,idioma_pref,pipeline_fase,bant_budget,bant_authority,bant_need,bant_timeline,destino,nivel,orcamento")
    .eq("id", leadId)
    .maybeSingle();

  const { data: msgs } = await supabase
    .from("mensagens_whatsapp")
    .select("conteudo,direction,created_at")
    .eq("lead_id", leadId)
    .neq("direction", "internal")
    .order("created_at", { ascending: true })
    .limit(limit);

  const rows = (msgs as Array<{ conteudo: string; direction: string }>) ?? [];
  let lastIncoming = "";
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of rows) {
    const role: "user" | "assistant" = m.direction === "incoming" ? "user" : "assistant";
    if (role === "user") lastIncoming = m.conteudo || "";
    const clean = sanitizeForContext(m.conteudo || "");
    const last = history[history.length - 1];
    if (last && last.role === role) last.content += "\n" + clean;
    else history.push({ role, content: clean });
  }
  if (history.length === 0) history.push({ role: "user", content: "Olá" });
  if (history[history.length - 1].role !== "user") history.push({ role: "user", content: "..." });

  const l = (lead as Record<string, unknown>) ?? {};
  const idioma = detectLanguage(l.idioma_pref as string, lastIncoming);
  const ctx: LeadContext = {
    lead_id: leadId,
    nome: (l.nome as string) ?? null,
    idioma,
    pipeline_fase: (l.pipeline_fase as string) ?? null,
    bant_budget: (l.bant_budget as string) ?? null,
    bant_authority: (l.bant_authority as string) ?? null,
    bant_need: (l.bant_need as string) ?? null,
    bant_timeline: (l.bant_timeline as string) ?? null,
    destino: (l.destino as string) ?? null,
    nivel: (l.nivel as string) ?? null,
    orcamento: (l.orcamento as string) ?? null,
  };
  return { lead: ctx, history, lastIncoming };
}

// ── Gera a resposta: prompt → Haiku → Sonnet (loop tools) → guardrails ───────
async function generateResponse(
  agent: AgentConfig,
  lead: LeadContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  lastIncoming: string,
  apiKey: string,
  softHint?: string | null,
): Promise<{ text: string; tokensIn: number; tokensOut: number; intent: string }> {
  const jailbreakDetected = detectJailbreakAttempt(lastIncoming);
  const basePrompt = buildPrompt({ agent, lead, idioma: lead.idioma, jailbreakDetected });
  // Dica de escalação soft (§5.2) — sugere handoff, nunca força. Não altera L8.
  const systemPrompt = softHint ? `${basePrompt}\n\n---\n\n${softHint}` : basePrompt;

  // Haiku classifica intenção/score (barato) — logado, não bloqueia o fluxo.
  let intent = "outro";
  try {
    const cls = await callClassification(
      [{ role: "user", content: sanitizeForContext(lastIncoming || "Olá") }],
      systemPrompt,
      apiKey,
    );
    intent = cls.intent;
  } catch (e) {
    logError(FN, "classify_failed", { err: String(e) });
  }

  const maxIter = Number(agent.settings.max_tool_iterations ?? 4);
  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [...history];
  let tokensIn = 0;
  let tokensOut = 0;
  let finalText = agent.settings.fallback_message;

  for (let i = 0; i < maxIter; i++) {
    const res = await callResponseWithTools(
      messages as Array<{ role: "user" | "assistant"; content: string }>,
      systemPrompt,
      apiKey,
      agent.model || "claude-sonnet-4-5",
      AGENT_TOOLS,
    );
    tokensIn += res.tokens_input;
    tokensOut += res.tokens_output;

    if (res.stop_reason === "tool_use") {
      const blocks = (res.raw_content as ContentBlock[]).filter((b) => b.type === "tool_use");
      const toolResults = blocks.map((b) => ({
        type: "tool_result" as const,
        tool_use_id: b.id,
        // Execução real é 3.4/3.5 — placeholder seguro para o loop continuar.
        content: executeToolPlaceholder(b.name || "unknown"),
      }));
      messages.push({ role: "assistant", content: res.raw_content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    finalText = stripInternalThinking(res.content || "") || agent.settings.fallback_message;
    break;
  }

  // Guardrails pós-geração: regenera 1x indicando o termo violado (padrão Salus).
  const splitMax = Number(agent.settings.message_split_max_length ?? 300) * 3;
  const guard = checkGuardrails(finalText, FORBIDDEN_PHRASES, splitMax);
  if (!guard.passed) {
    logInfo(FN, "guardrail_regenerate", { violations: guard.violations });
    const regenSystem =
      systemPrompt +
      `\n\n---\n\n[REGENERAÇÃO] A resposta anterior violou: ${guard.violations.join("; ")}. ` +
      `Reescreve SEM esses termos. Nunca prometas admissão garantida; educa com faixas; nunca te identifiques como IA.`;
    try {
      const regen = await callResponseWithTools(
        [...history] as Array<{ role: "user" | "assistant"; content: string }>,
        regenSystem,
        apiKey,
        agent.model || "claude-sonnet-4-5",
        [],
      );
      tokensIn += regen.tokens_input;
      tokensOut += regen.tokens_output;
      const regenText = stripInternalThinking(regen.content || "") || finalText;
      const guard2 = checkGuardrails(regenText, FORBIDDEN_PHRASES, splitMax);
      finalText = guard2.passed ? regenText : agent.settings.fallback_message;
    } catch (e) {
      logError(FN, "regenerate_failed", { err: String(e) });
      finalText = agent.settings.fallback_message;
    }
  }

  return { text: finalText, tokensIn, tokensOut, intent };
}

// ── Grava uma mensagem outgoing enviada + log (partilhado) ───────────────────
async function recordOutgoing(
  supabase: SupabaseClient,
  leadId: string,
  parts: string[],
): Promise<void> {
  for (const part of parts) {
    await supabase.from("mensagens_whatsapp").insert({
      lead_id: leadId,
      conteudo: part,
      direction: "outgoing",
      // CHECK em mensagens_whatsapp (002): sender_type IN
      // ('cliente','bot','humano','sistema'). O agente grava como 'bot'.
      sender_type: "bot",
    });
  }
}

// ── Escalação determinística (§5.2) — pré-LLM. Transfere e notifica humano ────
// Devolve true se escalou (o LLM NÃO deve ser chamado a seguir).
async function handleEscalationIfNeeded(
  supabase: SupabaseClient,
  agent: AgentConfig,
  uazapi: { url: string; token: string },
  item: QueueMessage,
  lead: LeadContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  lastIncoming: string,
  phone: string,
): Promise<boolean> {
  const lang: LeadLanguage = lead.idioma ?? "pt";
  // Sinal da base de conhecimento (no_answer) — só se não for conversa social.
  const social = isConversationalMessage(lastIncoming);
  const knowledge = matchFaq(lastIncoming, lang);
  const decision = resolveEscalation(lastIncoming, lang, knowledge, social);

  if (!decision.escalate || !decision.pause_reason) return false;

  // 1. Transfere a conversa (o LLM não é chamado).
  await supabase
    .from("ai_agent_conversations")
    .update({
      status: "transferred",
      paused_at: new Date().toISOString(),
      pause_reason: decision.pause_reason,
    })
    .eq("lead_id", item.lead_id);

  // 2. Resposta fixa de transição ao lead (sem passar pelo LLM).
  const reply = decision.reply ?? "";
  let sentParts: string[] = [];
  if (phone && reply) {
    const deps = makeUazapiSendDeps(uazapi, phone);
    const result = await sendHumanized(reply, deps, agent.settings);
    sentParts = result.parts;
    await recordOutgoing(supabase, lead.lead_id, sentParts);
  }

  // 3. Handoff: resumo + link + WhatsApp ao Rinaldo/Ana + INSERT notificacoes.
  const handoff = await performHandoff(
    supabase,
    {
      lead_id: lead.lead_id,
      lead_nome: lead.nome,
      pause_reason: decision.pause_reason,
      idioma: lang,
      history,
      lastIncoming,
    },
    { settings: agent.settings, uazapi },
  );

  // 4. Log da escalação.
  await supabase.from("ai_agent_logs").insert({
    lead_id: lead.lead_id,
    conversation_id: item.conversation_id,
    agent_id: agent.id,
    log_type: "escalation",
    data: {
      pause_reason: decision.pause_reason,
      numbers_notified: handoff.numbers_notified,
      notificacao_id: handoff.notificacao_id,
      parts: sentParts.length,
    },
  });

  logInfo(FN, "escalated", { leadId: lead.lead_id, reason: decision.pause_reason });
  return true;
}

// ── Escalação SOFT (§5.2): N mensagens sem avanço de fase → sugere handoff ────
// Devolve uma DICA para o prompt (não transfere à força). Simples: conta as
// mensagens da conversa desde a última mudança de fase.
async function softEscalationHint(
  supabase: SupabaseClient,
  agent: AgentConfig,
  lead: LeadContext,
  idioma: LeadLanguage,
): Promise<string | null> {
  const threshold = Number(agent.settings.soft_escalation_after_messages ?? 0);
  if (!threshold || threshold <= 0) return null;

  // Última mudança de fase do lead (mudancas_estagio; se não houver, usa a
  // criação implícita — conta todas as mensagens).
  const { data: lastChange } = await supabase
    .from("mudancas_estagio")
    .select("created_at")
    .eq("lead_id", lead.lead_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let q = supabase
    .from("mensagens_whatsapp")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", lead.lead_id)
    .neq("direction", "internal");
  const since = (lastChange as { created_at?: string })?.created_at;
  if (since) q = q.gt("created_at", since);
  const { count } = await q;

  if ((count ?? 0) < threshold) return null;

  return idioma === "en"
    ? "[SOFT-HANDOFF] The conversation has gone several messages without progress. If it feels stuck, gently OFFER to connect the lead with a Global Minds consultant — suggest it, never force it, and never talk about prices/payments yourself."
    : "[SOFT-HANDOFF] A conversa já vai em várias mensagens sem avançar de fase. Se sentires que empancou, SUGERE com delicadeza passar o lead a um consultor da Global Minds — sugere, nunca forces, e nunca fales tu de preços/pagamentos.";
}

// ── Processa uma mensagem da fila (com lock por lead) ────────────────────────
async function processOne(
  supabase: SupabaseClient,
  agent: AgentConfig,
  apiKey: string,
  uazapi: { url: string; token: string },
  item: QueueMessage,
): Promise<boolean> {
  const lid = item.lead_id;
  const locked = await supabase.rpc("try_acquire_agent_lock", { p_lead_id: lid });
  if (locked.error || locked.data !== true) {
    logInfo(FN, "lock_skip", { leadId: lid });
    // Devolve o item à fila para outra passagem.
    await supabase.from("ai_agent_message_queue").update({ status: "pending" }).eq("id", item.id);
    return false;
  }

  try {
    const limit = Number(agent.settings.context_messages_limit ?? 250);
    const { lead, history, lastIncoming } = await loadLeadContext(supabase, lid, limit);

    // Resolve telefone do lead (necessário tanto para escalação como para envio).
    const { data: leadRow } = await supabase.from("leads").select("telefone").eq("id", lid).maybeSingle();
    const phone = normalizeAngolaPhone((leadRow as { telefone?: string })?.telefone || "");

    // ── ESCALAÇÃO DETERMINÍSTICA (§5.2) — ANTES do LLM ──────────────────────
    // Se dispara um gatilho hard (human_request/urgent/escalation_d5) ou
    // no_answer, transfere a conversa e notifica o humano SEM chamar o modelo.
    const escalated = await handleEscalationIfNeeded(
      supabase,
      agent,
      uazapi,
      item,
      lead,
      history,
      lastIncoming,
      phone,
    );
    if (escalated) {
      await supabase
        .from("ai_agent_message_queue")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", item.id);
      return true;
    }

    // ── ESCALAÇÃO SOFT: dica ao prompt se a conversa estagnou (não força) ────
    const softHint = await softEscalationHint(supabase, agent, lead, lead.idioma ?? "pt");

    const { text, tokensIn, tokensOut, intent } = await generateResponse(
      agent,
      lead,
      history,
      lastIncoming,
      apiKey,
      softHint,
    );

    // Envia a resposta gerada (phone já resolvido acima).
    let sentParts: string[] = [];
    if (phone) {
      const deps = makeUazapiSendDeps(uazapi, phone);
      const result = await sendHumanized(text, deps, agent.settings);
      sentParts = result.parts;
    }

    // Grava outgoing (uma linha por balão enviado).
    await recordOutgoing(supabase, lid, sentParts);

    // Log de tokens.
    await supabase.from("ai_agent_logs").insert({
      lead_id: lid,
      conversation_id: item.conversation_id,
      agent_id: agent.id,
      log_type: "response_generated",
      data: { intent, parts: sentParts.length },
      tokens_input: tokensIn,
      tokens_output: tokensOut,
    });

    await supabase
      .from("ai_agent_message_queue")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", item.id);

    logInfo(FN, "processed", { leadId: lid, tokensIn, tokensOut, parts: sentParts.length });
    return true;
  } catch (e) {
    logError(FN, "process_failed", { leadId: lid, err: String(e) });
    await supabase
      .from("ai_agent_message_queue")
      .update({ status: "failed", error_message: String(e) })
      .eq("id", item.id);
    return false;
  } finally {
    await supabase.rpc("release_agent_lock", { p_lead_id: lid });
  }
}

// ── Entrada: process_queue (do cron 028) ─────────────────────────────────────
export async function handleProcessQueue(supabase: SupabaseClient): Promise<{ processed: number }> {
  const agent = await loadAgent(supabase);
  if (!agent) {
    logError(FN, "no_active_agent", {});
    return { processed: 0 };
  }

  const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) {
    logError(FN, "no_anthropic_key", {});
    return { processed: 0 };
  }

  const uazapi = await getUazapiConfig(supabase);
  if (!uazapi) {
    logError(FN, "no_uazapi_config", {});
    return { processed: 0 };
  }

  const batch = Number(agent.settings.queue_batch_size ?? 5);
  const { data: claimed, error } = await supabase.rpc("claim_queue_messages", { p_batch_size: batch });
  if (error) {
    logError(FN, "claim_failed", { err: error.message });
    return { processed: 0 };
  }

  const items = (claimed as QueueMessage[]) ?? [];
  let processed = 0;
  for (const item of items) {
    const ok = await processOne(supabase, agent, apiKey, uazapi, item);
    if (ok) processed++;
  }
  return { processed };
}

// ── Entrada de teste: test_prompt (monta o prompt e devolve, sem enviar) ─────
export async function handleTestPrompt(
  supabase: SupabaseClient,
  leadId?: string,
): Promise<{ system_prompt: string; lead: LeadContext | null }> {
  const agent = await loadAgent(supabase);
  if (!agent) return { system_prompt: "", lead: null };

  if (!leadId) {
    const synthetic: LeadContext = { lead_id: "test", nome: null, idioma: "pt", pipeline_fase: "lead" };
    return { system_prompt: buildPrompt({ agent, lead: synthetic }), lead: synthetic };
  }

  const limit = Number(agent.settings.context_messages_limit ?? 250);
  const { lead } = await loadLeadContext(supabase, leadId, limit);
  return { system_prompt: buildPrompt({ agent, lead, idioma: lead.idioma }), lead };
}
