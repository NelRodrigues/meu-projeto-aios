// ============================================================================
// Lembrete D-1 da Consulta de Orientação — Story 3.5 (AC5). Lógica PURA.
// ----------------------------------------------------------------------------
// Módulo PURO (sem Deno/URL/supabase) — testável em node:test. A EXECUÇÃO (query
// às consultas, envio WhatsApp, marcar `lembrete_24h_enviado`) é IMPura e vive no
// queue-processor (handleLembretesTick). Aqui só a decisão + a montagem:
//   • isDueForReminder: a consulta está na janela [now, now+24h) e ainda não
//     recebeu lembrete? (idempotência garantida a jusante pela flag na BD)
//   • buildReminderMessage: texto do lembrete ao lead (fuso explícito).
// ============================================================================

import { formatSlotLabel } from "./scheduling.ts";
import type { LeadLanguage } from "./types.ts";

export interface ConsultationRow {
  id: string;
  lead_id: string;
  scheduled_at: string; // ISO
  timezone: string;
  estado: string;
  lembrete_24h_enviado: boolean;
}

// A consulta deve receber lembrete D-1 se:
//   • está 'agendada' ou 'confirmada',
//   • ainda não foi lembrada,
//   • começa DENTRO das próximas 24h (e ainda não começou — não lembra o passado).
// A query na BD já filtra estado + flag; esta função é a régra de tempo (testável
// e reutilizada na dupla-verificação antes de enviar).
export function isDueForReminder(c: ConsultationRow, now: Date): boolean {
  if (c.lembrete_24h_enviado) return false;
  if (c.estado !== "agendada" && c.estado !== "confirmada") return false;
  const t = Date.parse(c.scheduled_at);
  if (!Number.isFinite(t)) return false;
  const nowMs = now.getTime();
  const in24h = nowMs + 24 * 3600000;
  return t > nowMs && t <= in24h;
}

// Texto do lembrete ao lead (fuso SEMPRE explícito). Função PURA.
export function buildReminderMessage(c: ConsultationRow, idioma: LeadLanguage): string {
  const label = formatSlotLabel(c.timezone, new Date(c.scheduled_at));
  const fuso =
    c.timezone === "Africa/Luanda" ? (idioma === "en" ? "Luanda time" : "hora de Luanda") : c.timezone;
  if (idioma === "en") {
    return `Hi! Just a friendly reminder of your Orientation Consultation with Global Minds tomorrow, ${label} (${fuso}). See you then — reply here if you need to reschedule.`;
  }
  return `Olá! Só um lembrete da sua Consulta de Orientação com a Global Minds amanhã, ${label} (${fuso}). Até lá — se precisar de remarcar, é só responder por aqui.`;
}
