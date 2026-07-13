// ============================================================================
// Execução REAL das tools do agente — Story 3.4 (AC1, AC4, AC6).
// ----------------------------------------------------------------------------
// Substitui o `executeToolPlaceholder` (tools.ts) para as tools desta story:
//   • qualify_lead          → invoca a inteligência de lead (Haiku + score + UPDATE)
//   • criar_ficha_estudante → upsert em `fichas_estudante` SEM inventar (AC4)
// As outras 3 tools (check_availability, schedule_consultation) ficam para a
// 3.5 e continuam a devolver o placeholder seguro.
//
// Regras transversais:
//   • Resposta de CONTINUIDADE (AC6): o resultado devolvido ao loop é sempre um
//     JSON com `continue_hint` — nunca um fallback técnico ao lead. Mesmo em
//     falha, o agente recebe indicação de continuar a conversa naturalmente.
//   • Degradação graciosa: nenhuma tool lança; falha → { ok:false } + hint.
//   • Alerta de lead quente vive aqui (buildHotLeadHandler) porque combina a
//     inteligência de lead (score) com o handoff (3.3) e a mudança de fase.
//
// Módulo IMPURO (importa supabase-js/_shared). A lógica testável vive em
// lead-intelligence.ts (PURO).
// ============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClassification } from "../_shared/llm-client.ts";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";
import { logInfo, logError } from "../_shared/log.ts";
import {
  qualifyLead,
  buildFichaFromConversation,
  buildFichaFormLink,
  buildContinuity,
  type BantExtraction,
  type HotLeadContext,
  type QualifyDeps,
} from "./lead-intelligence.ts";
import { performHandoff } from "./handoff.ts";
import { executeToolPlaceholder } from "./tools.ts";
import type { AgentConfig, LeadContext, LeadLanguage } from "./types.ts";

const FN = "gm-agent-tools";

// ── Adaptador Haiku para a inteligência de lead ──────────────────────────────
// Reusa callClassification (Haiku 4.5), mas precisamos do TEXTO bruto (o JSON de
// extracção), não do intent. callClassification devolve intent estruturado — por
// isso a extracção usa uma chamada directa mínima aqui, mantendo o modelo Haiku.
async function callHaikuExtraction(system: string, userContent: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Haiku extraction failed: ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "{}";
}

// ── Alerta de lead quente (AC3) ──────────────────────────────────────────────
// Handler injectado em qualifyLead. Distinto da escalação D5 (3.3): é um alerta
// POSITIVO — a conversa CONTINUA com o agente, só se notifica o Rinaldo e se move
// a fase. Passos:
//   1. performHandoff (REUSE 3.3) → WhatsApp ao Rinaldo/Ana + notificacoes
//   2. leads.pipeline_fase = 'qualificado' (se ainda estiver em 'lead')
//   3. INSERT mudancas_estagio (o trigger 017 só ouve `candidaturas`, não `leads`,
//      por isso a auditoria da mudança directa em `leads` é feita aqui)
export function buildHotLeadHandler(
  supabase: SupabaseClient,
  agent: AgentConfig,
  uazapi: { url: string; token: string } | null,
  idioma: LeadLanguage,
): (ctx: HotLeadContext) => Promise<void> {
  return async (ctx: HotLeadContext) => {
    // 1. Notifica o consultor (REUSE performHandoff da 3.3). Usamos um motivo
    //    dedicado para distinguir do handoff de escalação nos registos.
    await performHandoff(
      supabase,
      {
        lead_id: ctx.lead_id,
        lead_nome: ctx.lead_nome,
        pause_reason: "lead_quente",
        idioma,
        history: ctx.history,
      },
      { settings: agent.settings, uazapi },
    );

    // 2. Move a fase para 'qualificado' — só se ainda estiver em 'lead' (não
    //    regride quem já avançou). Lê a fase actual primeiro.
    const { data: leadRow } = await supabase
      .from("leads")
      .select("pipeline_fase")
      .eq("id", ctx.lead_id)
      .maybeSingle();
    const faseActual = (leadRow as { pipeline_fase?: string })?.pipeline_fase ?? "lead";

    if (faseActual === "lead") {
      const { error: updErr } = await supabase
        .from("leads")
        .update({ pipeline_fase: "qualificado" })
        .eq("id", ctx.lead_id);

      if (!updErr) {
        // 3. Auditoria da mudança directa em `leads` (o trigger 017 não cobre isto).
        await supabase.from("mudancas_estagio").insert({
          lead_id: ctx.lead_id,
          estagio_anterior: "lead",
          estagio_novo: "qualificado",
          // changed_by fica NULL — a escrita vem do agente (service_role).
        });
        logInfo(FN, "hot_lead_promoted", { leadId: ctx.lead_id, score: ctx.score.sales_score });
      } else {
        logError(FN, "hot_lead_promote_failed", { leadId: ctx.lead_id, err: updErr.message });
      }
    }
  };
}

// ── Resposta de continuidade (AC6) ───────────────────────────────────────────
// Alias local para a função pura buildContinuity (partilhada e testável). O que
// a tool devolve ao loop NUNCA é um erro técnico — é sempre um JSON com
// `continue_hint` que instrui o agente a seguir a conversa naturalmente.
const continuity = buildContinuity;

// ── Executor: qualify_lead ───────────────────────────────────────────────────
async function execQualifyLead(
  supabase: SupabaseClient,
  agent: AgentConfig,
  apiKey: string,
  uazapi: { url: string; token: string } | null,
  lead: LeadContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const idioma: LeadLanguage = lead.idioma ?? "pt";
  const deps: QualifyDeps = {
    supabase,
    apiKey,
    callHaiku: callHaikuExtraction,
    onHotLead: buildHotLeadHandler(supabase, agent, uazapi, idioma),
    logInfo: (step, ctx) => logInfo(FN, step, ctx),
    logError: (step, ctx) => logError(FN, step, ctx),
  };

  const result = await qualifyLead(deps, lead.lead_id, history);

  if (!result.ok) {
    // Degradação graciosa: perfil anterior mantido, agente continua a conversa.
    return continuity(
      false,
      "Não foi possível actualizar a qualificação agora. Continua a conversa normalmente, sem mencionar problemas técnicos, e vai recolhendo o que faltar com naturalidade.",
      { degraded: true },
    );
  }

  return continuity(
    true,
    "Qualificação registada. Continua a conversa com naturalidade: agradece a informação e avança para o próximo passo (o que ainda falta perceber, ou marcar a consulta se já houver base).",
    {
      sales_score: result.score?.sales_score,
      score_confidence: result.score?.score_confidence,
      temperature: result.temperature,
    },
  );
}

// ── Executor: criar_ficha_estudante (AC4) ────────────────────────────────────
// Upsert em `fichas_estudante` (1:1 com lead — lead_id UNIQUE). SEM inventar:
// campos sem dado ficam de fora (a coluna fica NULL / mantém valor anterior).
// Oferece a alternativa do formulário público quando não há dados suficientes.
async function execCriarFicha(
  supabase: SupabaseClient,
  lead: LeadContext,
  input: Record<string, unknown>,
): Promise<string> {
  // Dados que a tool recebeu directamente (precedência) + contexto já no lead.
  const overrides: Partial<Record<string, string | null>> = {
    nome: typeof input.nome === "string" ? input.nome : null,
    destino: typeof input.destino === "string" ? input.destino : (lead.destino ?? null),
    orcamento: lead.orcamento ?? lead.bant_budget ?? null,
    encarregado_nome: typeof input.encarregado_nome === "string" ? input.encarregado_nome : null,
    encarregado_contacto:
      typeof input.encarregado_contacto === "string" ? input.encarregado_contacto : null,
    encarregado_relacao: typeof input.encarregado_relacao === "string" ? input.encarregado_relacao : null,
    percurso_academico: typeof input.percurso_academico === "string" ? input.percurso_academico : null,
  };
  const extFromLead: Partial<BantExtraction> = {
    destino: lead.destino ?? null,
    orcamento: lead.orcamento ?? null,
    bant_budget: lead.bant_budget ?? null,
  };

  const ficha = buildFichaFromConversation(lead.lead_id, extFromLead, overrides);

  // Precisa de pelo menos o nome para abrir a ficha com sentido. Sem nome →
  // oferece o formulário público (story 2.4) em vez de criar uma ficha vazia.
  const temNome = typeof ficha.nome_completo === "string" && (ficha.nome_completo as string).length > 0;
  const siteUrl = await getIntegrationKeyWithClient(supabase, "app", "site_url", "NEXT_PUBLIC_SITE_URL");
  const formLink = buildFichaFormLink(siteUrl, lead.lead_id);

  if (!temNome) {
    return continuity(
      false,
      `Ainda não há nome para abrir a ficha. Pergunta o nome do estudante com naturalidade, ou oferece preencher a ficha por este formulário: ${formLink}`,
      { form_link: formLink, needs: "nome" },
    );
  }

  try {
    const { error } = await supabase
      .from("fichas_estudante")
      .upsert(ficha, { onConflict: "lead_id" });
    if (error) {
      logError(FN, "ficha_upsert_failed", { leadId: lead.lead_id, err: error.message });
      return continuity(
        false,
        `Não consegui abrir a ficha agora. Continua a conversa e, se preferir, o lead pode preencher por aqui: ${formLink}`,
        { degraded: true, form_link: formLink },
      );
    }
  } catch (e) {
    logError(FN, "ficha_upsert_error", { leadId: lead.lead_id, err: String(e) });
    return continuity(
      false,
      `Não consegui abrir a ficha agora. Continua a conversa e oferece o formulário: ${formLink}`,
      { degraded: true, form_link: formLink },
    );
  }

  logInfo(FN, "ficha_created", { leadId: lead.lead_id, campos: Object.keys(ficha).length });
  return continuity(
    true,
    "Ficha aberta com os dados que já temos. Continua a conversa: confirma o que falta com o lead e avança para o passo seguinte (consulta/documentos). Se algum dado ficou em falta, pede-o com naturalidade, um de cada vez.",
    { form_link: formLink },
  );
}

// ── Ponto de entrada: executa uma tool pelo nome ─────────────────────────────
// Devolve SEMPRE uma string JSON de continuidade para o `tool_result` do loop.
// As tools não implementadas nesta story caem no placeholder seguro (3.5).
export interface ExecToolContext {
  supabase: SupabaseClient;
  agent: AgentConfig;
  apiKey: string;
  uazapi: { url: string; token: string } | null;
  lead: LeadContext;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ExecToolContext,
): Promise<string> {
  try {
    switch (name) {
      case "qualify_lead":
        return await execQualifyLead(
          ctx.supabase,
          ctx.agent,
          ctx.apiKey,
          ctx.uazapi,
          ctx.lead,
          ctx.history,
        );
      case "criar_ficha_estudante":
        return await execCriarFicha(ctx.supabase, ctx.lead, input);
      // check_availability / schedule_consultation / notificar_humano → 3.5 / pré-LLM.
      default:
        return executeToolPlaceholder(name);
    }
  } catch (e) {
    // Rede de segurança final — nunca deixa uma tool derrubar o loop (AC6).
    logError(FN, "tool_exec_unhandled", { name, err: String(e) });
    return continuity(
      false,
      "Continua a conversa normalmente, sem mencionar problemas técnicos.",
      { degraded: true },
    );
  }
}

// callClassification é re-exportado para conveniência de quem monta deps de teste.
export { callClassification };
