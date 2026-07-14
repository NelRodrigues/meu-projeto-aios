// ============================================================================
// Execução REAL das tools do agente — Stories 3.4 e 3.5.
// ----------------------------------------------------------------------------
// Substitui o `executeToolPlaceholder` (tools.ts) para as tools destas stories:
//   • qualify_lead          → invoca a inteligência de lead (Haiku + score + UPDATE)   [3.4]
//   • criar_ficha_estudante → upsert em `fichas_estudante` SEM inventar (AC4)          [3.4]
//   • check_availability    → FreeBusy do Google × janelas → 2–3 slots livres          [3.5]
//   • schedule_consultation → cria evento + fase + consultations + confirma            [3.5]
// A tool `notificar_humano` é mecânica pré-LLM (3.3) e cai no placeholder aqui.
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
import {
  parseWindows,
  generateSlots,
  buildSlotsMessage,
  validateChosenSlot,
  formatSlotLabel,
} from "./scheduling.ts";
import { getGoogleCalendarClient } from "../_shared/google-calendar.ts";
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

// ── Escalação por indisponibilidade da agenda Google (AC6) ───────────────────
// Quando o Google Calendar está indisponível (sem credenciais / token expirado /
// API em erro), NUNCA se inventa disponibilidade. Notifica-se um consultor
// (REUSE performHandoff da 3.3) e dá-se ao lead uma resposta de continuidade.
async function escalateAgendaUnavailable(
  supabase: SupabaseClient,
  agent: AgentConfig,
  uazapi: { url: string; token: string } | null,
  idioma: LeadLanguage,
  lead: LeadContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<void> {
  try {
    await performHandoff(
      supabase,
      {
        lead_id: lead.lead_id,
        lead_nome: lead.nome ?? null,
        pause_reason: "urgent",
        idioma,
        history,
      },
      { settings: agent.settings, uazapi },
    );
  } catch (e) {
    logError(FN, "agenda_escalation_failed", { leadId: lead.lead_id, err: String(e) });
  }
}

// ── Executor: check_availability (AC1, AC2, AC4) ─────────────────────────────
// Intersecta as janelas acordadas (settings.consulta_windows, placeholder até
// 14/07) com a ocupação FreeBusy do Google → 2–3 slots FUTUROS. Falha Google →
// continuidade + escalação (AC6). Nunca inventa disponibilidade.
async function execCheckAvailability(
  supabase: SupabaseClient,
  agent: AgentConfig,
  uazapi: { url: string; token: string } | null,
  lead: LeadContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const idioma: LeadLanguage = lead.idioma ?? "pt";
  const cfg = parseWindows(agent.settings.consulta_windows);
  const now = new Date();

  let gcal;
  try {
    gcal = await getGoogleCalendarClient(supabase);
  } catch (e) {
    logError(FN, "gcal_client_error", { err: String(e) });
    gcal = null;
  }

  // Sem credenciais/cliente → NÃO inventa agenda. Escala + continuidade (AC6).
  if (!gcal) {
    logInfo(FN, "check_availability_no_gcal", { leadId: lead.lead_id });
    await escalateAgendaUnavailable(supabase, agent, uazapi, idioma, lead, history);
    return continuity(
      false,
      "Não consigo consultar a agenda automaticamente agora. Diz ao lead que um consultor vai combinar o melhor horário para a consulta, sem mencionar problemas técnicos.",
      { degraded: true, escalated: true },
    );
  }

  // Horizonte de procura: de agora até horizonte_dias à frente.
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + cfg.horizonte_dias * 86400000).toISOString();

  let busy;
  try {
    busy = await gcal.freeBusy(timeMin, timeMax);
  } catch (e) {
    logError(FN, "freebusy_failed", { leadId: lead.lead_id, err: String(e) });
    await escalateAgendaUnavailable(supabase, agent, uazapi, idioma, lead, history);
    return continuity(
      false,
      "Não consegui obter a disponibilidade agora. Diz ao lead que um consultor vai combinar o horário da consulta, com naturalidade.",
      { degraded: true, escalated: true },
    );
  }

  const slots = generateSlots(cfg, busy, now, 3);
  logInfo(FN, "check_availability_slots", { leadId: lead.lead_id, count: slots.length });

  // Sem slots livres → mensagem honesta + oferta de handoff (não escala já; o
  // agente oferece encaminhar). Com slots → oferece 2–3 ao lead com fuso.
  return continuity(
    slots.length > 0,
    buildSlotsMessage(slots, cfg.timezone, idioma),
    { slots, timezone: cfg.timezone },
  );
}

// ── Executor: schedule_consultation (AC3, AC4, AC5) ──────────────────────────
// Valida o slot (futuro + dentro da janela), cria/reagenda o evento no Google,
// grava a linha em `consultations` (INSERT ou UPDATE do MESMO evento — nunca
// duplica), avança candidaturas.fase='consulta_agendada' + mudancas_estagio, e
// confirma na conversa com data/hora + fuso explícito.
async function execScheduleConsultation(
  supabase: SupabaseClient,
  agent: AgentConfig,
  uazapi: { url: string; token: string } | null,
  lead: LeadContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  input: Record<string, unknown>,
): Promise<string> {
  const idioma: LeadLanguage = lead.idioma ?? "pt";
  const cfg = parseWindows(agent.settings.consulta_windows);
  const now = new Date();

  const slotIso = typeof input.slot_iso === "string" ? input.slot_iso : "";
  const nomeLead = typeof input.nome_lead === "string" ? input.nome_lead : (lead.nome ?? null);

  // AC4: nunca no passado + dentro da janela acordada.
  const v = validateChosenSlot(cfg, slotIso, now);
  if (!v.ok || !v.iso) {
    const motivo =
      v.reason === "past"
        ? "Esse horário já passou. Oferece um horário futuro (usa check_availability se precisares)."
        : v.reason === "out_of_window"
          ? "Esse horário está fora das janelas de consulta disponíveis. Volta a oferecer os horários livres com check_availability."
          : "Não percebi bem o horário. Confirma com o lead uma data e hora e usa check_availability para oferecer opções válidas.";
    logInfo(FN, "schedule_slot_rejected", { leadId: lead.lead_id, reason: v.reason });
    return continuity(false, motivo, { rejected: v.reason });
  }

  const startIso = v.iso;
  const endIso = new Date(Date.parse(startIso) + cfg.duracao_minutos * 60000).toISOString();
  const label = formatSlotLabel(cfg.timezone, new Date(startIso));

  let gcal;
  try {
    gcal = await getGoogleCalendarClient(supabase);
  } catch (e) {
    logError(FN, "gcal_client_error", { err: String(e) });
    gcal = null;
  }
  if (!gcal) {
    logInfo(FN, "schedule_no_gcal", { leadId: lead.lead_id });
    await escalateAgendaUnavailable(supabase, agent, uazapi, idioma, lead, history);
    return continuity(
      false,
      "Não consigo confirmar a marcação na agenda automaticamente agora. Diz ao lead que um consultor vai confirmar a consulta em breve, com naturalidade.",
      { degraded: true, escalated: true },
    );
  }

  // Reagendamento (AC5): existe já uma consulta activa deste lead? → PATCH do
  // MESMO evento e UPDATE da MESMA linha (nunca duplica no calendar nem na BD).
  const { data: existing } = await supabase
    .from("consultations")
    .select("id, google_event_id")
    .eq("lead_id", lead.lead_id)
    .in("estado", ["agendada", "confirmada"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const existingRow = existing as { id: string; google_event_id: string | null } | null;

  const summary = `Consulta de Orientação — Global Minds${nomeLead ? ` (${nomeLead})` : ""}`;
  const description = `Consulta de Orientação agendada pelo assistente. Lead: ${nomeLead ?? lead.lead_id}.`;

  let eventId: string;
  try {
    if (existingRow?.google_event_id) {
      await gcal.patchEvent(existingRow.google_event_id, { summary, description, startIso, endIso, timezone: cfg.timezone });
      eventId = existingRow.google_event_id;
    } else {
      const created = await gcal.createEvent({ summary, description, startIso, endIso, timezone: cfg.timezone });
      eventId = created.eventId;
    }
  } catch (e) {
    logError(FN, "gcal_event_failed", { leadId: lead.lead_id, err: String(e) });
    await escalateAgendaUnavailable(supabase, agent, uazapi, idioma, lead, history);
    return continuity(
      false,
      "Não consegui gravar a marcação na agenda agora. Diz ao lead que um consultor vai confirmar a consulta, sem mencionar problemas técnicos.",
      { degraded: true, escalated: true },
    );
  }

  // Grava a linha em `consultations` (INSERT ou UPDATE da existente — AC3/AC5).
  try {
    if (existingRow?.id) {
      await supabase
        .from("consultations")
        .update({
          google_event_id: eventId,
          scheduled_at: startIso,
          timezone: cfg.timezone,
          estado: "agendada",
          lembrete_24h_enviado: false, // reinicia o lembrete para o novo horário
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRow.id);
    } else {
      await supabase.from("consultations").insert({
        lead_id: lead.lead_id,
        google_event_id: eventId,
        scheduled_at: startIso,
        timezone: cfg.timezone,
        estado: "agendada",
      });
    }
  } catch (e) {
    logError(FN, "consultation_persist_failed", { leadId: lead.lead_id, err: String(e) });
    // O evento no calendar já existe; não escala (o lembrete/dashboard pode
    // recuperar). Continua a conversa confirmando o horário.
  }

  // Avança a candidatura para 'consulta_agendada' + mudancas_estagio (AC3). O
  // trigger 017 audita mudanças de fase em `candidaturas`; ao actualizar a fase
  // aqui, o registo em mudancas_estagio é feito por esse trigger.
  await advanceCandidaturaToConsulta(supabase, lead.lead_id);

  const fuso = cfg.timezone === "Africa/Luanda" ? (idioma === "en" ? "Luanda time" : "hora de Luanda") : cfg.timezone;
  logInfo(FN, "consultation_scheduled", { leadId: lead.lead_id, eventId, when: startIso, reschedule: !!existingRow });
  return continuity(
    true,
    `Consulta ${existingRow ? "reagendada" : "marcada"} para ${label} (${fuso}). Confirma ao lead com a data, hora e fuso, agradece e diz que recebe um lembrete no dia anterior.`,
    { scheduled_at: startIso, timezone: cfg.timezone, reschedule: !!existingRow },
  );
}

// Avança a candidatura activa do lead para 'consulta_agendada'. Se não houver
// candidatura, cria uma leve (o pipeline de candidaturas é o registo de fase).
// O trigger 017 audita a mudança em mudancas_estagio.
async function advanceCandidaturaToConsulta(
  supabase: SupabaseClient,
  leadId: string,
): Promise<void> {
  try {
    const { data: cand } = await supabase
      .from("candidaturas")
      .select("id, fase")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = cand as { id: string; fase: string } | null;

    if (row?.id) {
      // Não regride quem já passou de 'consulta_agendada'.
      const ordem = ["lead", "qualificado", "consulta_agendada"];
      if (ordem.includes(row.fase)) {
        await supabase.from("candidaturas").update({ fase: "consulta_agendada", fase_desde: new Date().toISOString() }).eq("id", row.id);
      }
    } else {
      await supabase.from("candidaturas").insert({ lead_id: leadId, fase: "consulta_agendada" });
    }
  } catch (e) {
    logError(FN, "advance_candidatura_failed", { leadId, err: String(e) });
  }
}

// ── Ponto de entrada: executa uma tool pelo nome ─────────────────────────────
// Devolve SEMPRE uma string JSON de continuidade para o `tool_result` do loop.
// A tool `notificar_humano` (mecânica pré-LLM 3.3) cai no placeholder seguro.
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
      case "check_availability":
        return await execCheckAvailability(
          ctx.supabase,
          ctx.agent,
          ctx.uazapi,
          ctx.lead,
          ctx.history,
        );
      case "schedule_consultation":
        return await execScheduleConsultation(
          ctx.supabase,
          ctx.agent,
          ctx.uazapi,
          ctx.lead,
          ctx.history,
          input,
        );
      // notificar_humano → mecânica pré-LLM (3.3); aqui cai no placeholder seguro.
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
