// ============================================================================
// Horário de funcionamento + rate limits do agente — Story 3.7 (AC1, AC2). PURO.
// ----------------------------------------------------------------------------
// Módulo PURO (sem Deno/URL/supabase) — testável em node:test. Aqui vivem as
// DECISÕES; a leitura/escrita de contadores (ai_agent_send_counts) e o UPDATE de
// estado da conversa são IMPuros e ficam no queue-processor.
//
// Fonte de relógio: reutiliza `nowInLuanda` (prompt.ts) — a MESMA verdade de TZ
// (Africa/Luanda, UTC+1) que governa o L0 do prompt. NUNCA duas implementações
// de relógio (Dev Note §horário-vs-L0).
//
// Limites (§8.5, sem Redis — contadores em BD):
//   • max_messages_per_conversation (default 60) — total da conversa
//   • cadence_max_messages_per_hour (default 50)
//   • cadence_max_messages_per_day  (default 60)
// Ao atingir qualquer limite: pausa DIGNA (comunicação ao lead, nunca silêncio).
// ============================================================================

import { nowInLuanda } from "./prompt.ts";
import type { AgentSettings, LeadLanguage } from "./types.ts";

// ── Horário de funcionamento (AC2) ───────────────────────────────────────────
export interface WorkingHoursDecision {
  open: boolean;
  // Minutos do dia (0–1439) de abertura/fecho, para diagnóstico/teste.
  startMin: number;
  endMin: number;
}

function hhmmToMinutes(s: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return fallback;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return fallback;
  return h * 60 + mi;
}

// Está dentro do horário de funcionamento AGORA (Africa/Luanda)? Considera dias
// úteis (`working_days`, convenção 1=segunda … 7=domingo, como no seed) e a
// janela [start, end). `now` injectável para testes.
export function isWithinWorkingHours(settings: AgentSettings, now: Date = new Date()): WorkingHoursDecision {
  const dh = nowInLuanda(now);
  const startMin = hhmmToMinutes(settings.working_hours_start, 8 * 60);
  const endMin = hhmmToMinutes(settings.working_hours_end, 20 * 60);

  // Dia da semana em Luanda (1=segunda … 7=domingo) para casar com working_days
  // do seed ([1,2,3,4,5,6]). nowInLuanda não devolve o dia — derivamos via Intl.
  const dow = luandaIsoWeekday(now);
  const days = Array.isArray(settings.working_days) && settings.working_days.length
    ? settings.working_days
    : [1, 2, 3, 4, 5, 6];
  const dayOk = days.includes(dow);

  const nowMin = dh.hour24 * 60 + parseInt(dh.hora.split(":")[1] ?? "0", 10);
  const open = dayOk && nowMin >= startMin && nowMin < endMin;
  return { open, startMin, endMin };
}

// Dia da semana ISO (1=segunda … 7=domingo) em Africa/Luanda.
export function luandaIsoWeekday(now: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Luanda", weekday: "short" }).format(now);
  const MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return MAP[wd] ?? 1;
}

// Mensagem digna de fora de horas (AC2). Nunca silêncio abrupto.
export function outOfHoursMessage(settings: AgentSettings, idioma: LeadLanguage): string {
  const explicit = settings.out_of_hours_message;
  if (typeof explicit === "string" && explicit.trim()) return explicit;
  const start = String(settings.working_hours_start ?? "08:00");
  const end = String(settings.working_hours_end ?? "20:00");
  if (idioma === "en") {
    return `Thanks for your message! Our team is available between ${start} and ${end} (Luanda time). We'll get back to you first thing when we reopen.`;
  }
  return `Obrigada pela sua mensagem! O nosso horário de atendimento é das ${start} às ${end} (hora de Luanda). Assim que reabrirmos, damos-lhe resposta com prioridade.`;
}

// ── Rate limits (AC1) ────────────────────────────────────────────────────────
export type LimitKind = "conversation" | "hour" | "day";

export interface LimitCounts {
  conversation: number; // total_messages_sent da conversa
  hour: number; // envios na janela de 1h
  day: number; // envios na janela de 1 dia
}

export interface LimitDecision {
  allowed: boolean;
  hit: LimitKind | null; // qual limite bloqueou (o primeiro atingido)
}

// Extrai os limites efectivos dos settings (com defaults de série §2.3).
export function effectiveLimits(settings: AgentSettings): { conversation: number; hour: number; day: number } {
  const num = (v: unknown, def: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);
  return {
    conversation: num(settings.max_messages_per_conversation, 60),
    hour: num(settings.cadence_max_messages_per_hour, 50),
    day: num(settings.cadence_max_messages_per_day, 60),
  };
}

// Decide se o agente PODE enviar mais uma mensagem, dados os contadores ACTUAIS
// (antes deste envio). Bloqueia quando um contador já atingiu o limite. Ordem de
// prioridade do motivo: conversa → dia → hora (o mais "estrutural" primeiro).
export function checkLimits(settings: AgentSettings, counts: LimitCounts): LimitDecision {
  const lim = effectiveLimits(settings);
  if (counts.conversation >= lim.conversation) return { allowed: false, hit: "conversation" };
  if (counts.day >= lim.day) return { allowed: false, hit: "day" };
  if (counts.hour >= lim.hour) return { allowed: false, hit: "hour" };
  return { allowed: true, hit: null };
}

// Mensagem digna ao atingir um limite (AC1). Comunica, nunca cai em silêncio.
export function limitReachedMessage(hit: LimitKind, idioma: LeadLanguage): string {
  if (idioma === "en") {
    if (hit === "conversation") {
      return `We've covered a lot here! To give you the attention you deserve, a Global Minds consultant will follow up with you personally very soon.`;
    }
    return `Thanks for all your messages today! To make sure we help you properly, a consultant will continue with you shortly.`;
  }
  if (hit === "conversation") {
    return `Já falámos bastante por aqui! Para lhe dar a atenção que merece, um consultor da Global Minds vai continuar consigo pessoalmente muito em breve.`;
  }
  return `Obrigada pelas suas mensagens de hoje! Para o atendermos como deve ser, um consultor vai dar seguimento consigo em breve.`;
}

// O estado de pausa a aplicar quando um limite é atingido. Limite de CONVERSA
// pausa por humano (excedeu a conversa — precisa de pessoa); limites de cadência
// (hora/dia) também pausam por humano com motivo próprio (a conversa não fica
// muda: já se enviou a mensagem digna). `paused_by_schedule` é só para horário.
export function pauseStateForLimit(hit: LimitKind): { status: string; pause_reason: string } {
  return { status: "paused_by_human", pause_reason: hit === "conversation" ? "limite_conversa" : "limite_cadencia" };
}
