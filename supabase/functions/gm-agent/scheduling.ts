// ============================================================================
// Lógica PURA de agendamento da Consulta de Orientação — Story 3.5.
// ----------------------------------------------------------------------------
// Módulo PURO (sem Deno/URL/supabase) — importável em node:test. Aqui vive TODA
// a decisão de negócio testável do agendamento:
//   • intersecção `consulta_windows` × ocupação FreeBusy → 2–3 slots livres
//   • regra ANTI-PASSADO (AC4/NFR10): nenhum slot antes de agora (Africa/Luanda)
//   • buffer entre consultas e fuso explícito
//   • formatação da mensagem de slots ao lead (fuso sempre explícito)
//   • resolução do slot escolhido pelo lead (match do ISO devolvido pela tool)
//
// A EXECUÇÃO (FreeBusy real, criar evento, gravar BD) é IMPURA e vive em
// tools-exec.ts + _shared/google-calendar.ts. Este módulo só calcula.
//
// PENDENTE-3 (dono: Rinaldo, questão 4 de 14/07): as janelas reais (dias/horas/
// buffer/fuso) ainda não estão fixadas. Até lá, `parseWindows` lê o placeholder
// configurável de `ai_sales_agents.settings.consulta_windows` — muda-se DADOS,
// nunca este código.
// ============================================================================

// Janela de disponibilidade acordada (placeholder até 14/07). Estrutura mínima:
//   { dia: 0-6 (0=domingo), inicio: "HH:MM", fim: "HH:MM" }
export interface ConsultaWindow {
  dia: number; // 0=domingo … 6=sábado (getUTCDay convention)
  inicio: string; // "HH:MM" (hora local do `timezone`)
  fim: string; // "HH:MM"
}

export interface ConsultaWindowsConfig {
  windows: ConsultaWindow[];
  buffer_minutos: number; // buffer aplicado antes/depois de ocupação
  duracao_minutos: number; // duração de uma consulta
  timezone: string; // ex.: "Africa/Luanda"
  // Quantos dias para a frente procurar slots (janela de procura).
  horizonte_dias: number;
}

// Intervalo ocupado devolvido pelo FreeBusy do Google (ISO 8601, UTC).
export interface BusyInterval {
  start: string; // ISO
  end: string; // ISO
}

// Slot proposto ao lead.
export interface Slot {
  iso: string; // início em ISO 8601 (UTC, com offset) — o que a tool devolve
  label: string; // rótulo humano no fuso do config (ex.: "quinta 15/07, 14:00")
}

// ── Placeholder provisório (PENDENTE-3) ──────────────────────────────────────
// Espelha o que a migração semeia em settings.consulta_windows. Serve de default
// defensivo quando os settings vierem vazios/malformados — NÃO é um fallback de
// extracção (não há brand-signal aqui; é política de agenda acordada, editável
// sem redeploy). Marcado provisório: substituir pelos valores do Rinaldo.
export const PLACEHOLDER_WINDOWS: ConsultaWindowsConfig = {
  // ter(2)–qui(4), 14:00–17:00 — provisório até 14/07.
  windows: [
    { dia: 2, inicio: "14:00", fim: "17:00" },
    { dia: 3, inicio: "14:00", fim: "17:00" },
    { dia: 4, inicio: "14:00", fim: "17:00" },
  ],
  buffer_minutos: 15,
  duracao_minutos: 45,
  timezone: "Africa/Luanda",
  horizonte_dias: 14,
};

// ── Fuso: offset em minutos de um timezone IANA numa dada instância ──────────
// Deriva o offset (minutos que se somam ao UTC para obter a hora local) usando
// Intl — sem libs externas. Para Africa/Luanda é sempre +60 (sem DST), mas a
// função é geral (suporta o Rinaldo em viagem com outro fuso nos settings).
export function tzOffsetMinutes(timezone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(at);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = parseInt(p.value, 10);
  }
  let hour = map.hour;
  if (hour === 24) hour = 0; // meia-noite normalizada
  // Instante "como se" os componentes locais fossem UTC.
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  // Diferença face ao instante real → offset local.
  return Math.round((asUTC - at.getTime()) / 60000);
}

// Constrói o instante UTC (Date) correspondente a uma hora LOCAL num timezone.
// (ano/mês/dia/hora/min são componentes no fuso `timezone`.)
export function localToUtc(
  timezone: string,
  y: number,
  mo: number, // 1-12
  d: number,
  h: number,
  mi: number,
): Date {
  // Primeira aproximação: trata os componentes como UTC.
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  // Corrige pelo offset do fuso NESSE instante (estável sem DST; 1 iteração basta
  // para fusos sem transição, que é o caso de Africa/Luanda).
  const off = tzOffsetMinutes(timezone, guess);
  return new Date(guess.getTime() - off * 60000);
}

// Componentes locais (no timezone) de um instante UTC.
export function utcToLocalParts(
  timezone: string,
  at: Date,
): { y: number; mo: number; d: number; h: number; mi: number; dow: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(at);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let h = parseInt(map.hour, 10);
  if (h === 24) h = 0;
  return {
    y: parseInt(map.year, 10),
    mo: parseInt(map.month, 10),
    d: parseInt(map.day, 10),
    h,
    mi: parseInt(map.minute, 10),
    dow: DOW[map.weekday] ?? 0,
  };
}

function parseHHMM(s: string): { h: number; mi: number } {
  const [h, mi] = String(s).split(":").map((x) => parseInt(x, 10));
  return { h: Number.isFinite(h) ? h : 0, mi: Number.isFinite(mi) ? mi : 0 };
}

// ── Config: lê e valida `settings.consulta_windows` (com placeholder) ────────
export function parseWindows(raw: unknown): ConsultaWindowsConfig {
  if (!raw || typeof raw !== "object") return PLACEHOLDER_WINDOWS;
  const o = raw as Record<string, unknown>;
  const wins = Array.isArray(o.windows) ? o.windows : [];
  const windows: ConsultaWindow[] = [];
  for (const w of wins) {
    if (!w || typeof w !== "object") continue;
    const ww = w as Record<string, unknown>;
    const dia = Number(ww.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) continue;
    const inicio = typeof ww.inicio === "string" ? ww.inicio : null;
    const fim = typeof ww.fim === "string" ? ww.fim : null;
    if (!inicio || !fim) continue;
    windows.push({ dia, inicio, fim });
  }
  if (windows.length === 0) return PLACEHOLDER_WINDOWS;
  const num = (v: unknown, def: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);
  return {
    windows,
    buffer_minutos: num(o.buffer_minutos, PLACEHOLDER_WINDOWS.buffer_minutos),
    duracao_minutos: num(o.duracao_minutos, PLACEHOLDER_WINDOWS.duracao_minutos),
    timezone: typeof o.timezone === "string" && o.timezone ? o.timezone : PLACEHOLDER_WINDOWS.timezone,
    horizonte_dias: num(o.horizonte_dias, PLACEHOLDER_WINDOWS.horizonte_dias),
  };
}

// Sobreposição de dois intervalos [aStart,aEnd) e [bStart,bEnd) em ms.
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ── Núcleo: gera slots livres ────────────────────────────────────────────────
// Percorre o horizonte dia-a-dia, expande cada janela em slots de `duracao`, e
// filtra os que: (a) começam no passado (AC4), (b) colidem com ocupação FreeBusy
// (aplicando `buffer` de ambos os lados da ocupação). Devolve os primeiros
// `max` (default 3, mínimo 2 quando existirem).
export function generateSlots(
  cfg: ConsultaWindowsConfig,
  busy: BusyInterval[],
  now: Date,
  max = 3,
): Slot[] {
  const tz = cfg.timezone;
  const durMs = cfg.duracao_minutos * 60000;
  const bufMs = cfg.buffer_minutos * 60000;
  const nowMs = now.getTime();

  // Pré-processa ocupação (ignora intervalos malformados).
  const busyMs = busy
    .map((b) => ({ s: Date.parse(b.start), e: Date.parse(b.end) }))
    .filter((b) => Number.isFinite(b.s) && Number.isFinite(b.e) && b.e > b.s);

  const slots: Slot[] = [];
  const seen = new Set<string>();

  // Data local de hoje como ponto de partida.
  const today = utcToLocalParts(tz, now);
  const base = new Date(Date.UTC(today.y, today.mo - 1, today.d));

  for (let dayOffset = 0; dayOffset <= cfg.horizonte_dias && slots.length < max; dayOffset++) {
    // Componentes locais do dia alvo.
    const dayUtc = new Date(base.getTime() + dayOffset * 86400000);
    const lp = utcToLocalParts(tz, dayUtc);
    const winsForDay = cfg.windows.filter((w) => w.dia === lp.dow);
    if (winsForDay.length === 0) continue;

    for (const w of winsForDay) {
      if (slots.length >= max) break;
      const { h: hI, mi: miI } = parseHHMM(w.inicio);
      const { h: hF, mi: miF } = parseHHMM(w.fim);
      const winStart = localToUtc(tz, lp.y, lp.mo, lp.d, hI, miI).getTime();
      const winEnd = localToUtc(tz, lp.y, lp.mo, lp.d, hF, miF).getTime();

      // Slots alinhados à duração, do início ao fim da janela.
      for (let s = winStart; s + durMs <= winEnd && slots.length < max; s += durMs) {
        const e = s + durMs;
        // AC4: nunca no passado (nem "agora mesmo"; exige começar > now).
        if (s <= nowMs) continue;
        // Colisão com ocupação (buffer de ambos os lados).
        const clash = busyMs.some((b) => overlaps(s, e, b.s - bufMs, b.e + bufMs));
        if (clash) continue;

        const iso = new Date(s).toISOString();
        if (seen.has(iso)) continue;
        seen.add(iso);
        slots.push({ iso, label: formatSlotLabel(tz, new Date(s)) });
      }
    }
  }

  return slots;
}

// ── Formatação humana do slot (fuso explícito garantido pelo chamador) ───────
const DIAS_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function formatSlotLabel(timezone: string, at: Date): string {
  const p = utcToLocalParts(timezone, at);
  const dia = DIAS_PT[p.dow] ?? "";
  const dd = String(p.d).padStart(2, "0");
  const mm = String(p.mo).padStart(2, "0");
  const hh = String(p.h).padStart(2, "0");
  const min = String(p.mi).padStart(2, "0");
  return `${dia} ${dd}/${mm}, ${hh}h${min}`;
}

// ── Mensagem de continuidade com os slots (fuso SEMPRE explícito) ────────────
// Devolve o texto que instrui o agente a oferecer os slots ao lead. Se não há
// slots, devolve uma mensagem honesta + sugestão de handoff (AC1 / testing).
export function buildSlotsMessage(slots: Slot[], timezone: string, idioma: "pt" | "en"): string {
  const fuso = timezone === "Africa/Luanda" ? (idioma === "en" ? "Luanda time" : "hora de Luanda") : timezone;
  if (slots.length === 0) {
    return idioma === "en"
      ? `No free slots were found in the agreed windows. Tell the lead honestly and offer to connect them with a consultant to find a time.`
      : `Não há janelas livres nos próximos dias dentro do horário acordado. Diz isso ao lead com honestidade e oferece encaminhar para um consultor combinar um horário.`;
  }
  const linhas = slots.map((s, i) => `${i + 1}) ${s.label} (${fuso}) [ISO: ${s.iso}]`).join("\n");
  return idioma === "en"
    ? `Offer these free slots to the lead (always state the timezone, ${fuso}). Ask them to pick one; do NOT invent other times:\n${linhas}`
    : `Oferece estes horários livres ao lead (indica sempre o fuso, ${fuso}). Pede que escolha um; NÃO inventes outros horários:\n${linhas}`;
}

// ── Resolução do slot escolhido ──────────────────────────────────────────────
// A tool schedule_consultation recebe `slot_iso`. Validamos que:
//   • é um ISO parseável,
//   • está no futuro (AC4),
//   • cai dentro de uma janela acordada (não um horário arbitrário).
// Não exige que tenha sido um dos oferecidos (o lead pode escrever a hora), mas
// tem de respeitar janela + futuro. Devolve o instante normalizado ou erro.
export interface SlotValidation {
  ok: boolean;
  iso?: string; // normalizado (UTC)
  reason?: "invalid" | "past" | "out_of_window";
}

// Padrão ISO-8601 mínimo (data + hora). O V8 aceita strings livres em Date.parse
// ("amanhã às 3" pode devolver um número) — exigimos formato ISO para não tomar
// lixo por uma data válida. A tool devolve sempre ISO (o prompt instrui-a a isso).
const ISO_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

export function validateChosenSlot(
  cfg: ConsultaWindowsConfig,
  slotIso: string,
  now: Date,
): SlotValidation {
  if (typeof slotIso !== "string" || !ISO_RE.test(slotIso.trim())) {
    return { ok: false, reason: "invalid" };
  }
  const t = Date.parse(slotIso);
  if (!Number.isFinite(t)) return { ok: false, reason: "invalid" };
  if (t <= now.getTime()) return { ok: false, reason: "past" };

  const at = new Date(t);
  const lp = utcToLocalParts(cfg.timezone, at);
  const winsForDay = cfg.windows.filter((w) => w.dia === lp.dow);
  if (winsForDay.length === 0) return { ok: false, reason: "out_of_window" };

  const localMinutes = lp.h * 60 + lp.mi;
  const inWindow = winsForDay.some((w) => {
    const { h: hI, mi: miI } = parseHHMM(w.inicio);
    const { h: hF, mi: miF } = parseHHMM(w.fim);
    const startM = hI * 60 + miI;
    const endM = hF * 60 + miF;
    // Precisa de caber uma consulta inteira antes do fim da janela.
    return localMinutes >= startM && localMinutes + cfg.duracao_minutos <= endM;
  });
  if (!inWindow) return { ok: false, reason: "out_of_window" };

  return { ok: true, iso: at.toISOString() };
}
