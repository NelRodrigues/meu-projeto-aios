// Logging estruturado JSON com redacção de segredos — story 1.3 AC3.
// Arquitectura §8.5: logs `{fn, step, leadId?, ...}`; tokens/chaves NUNCA em claro.
//
// Uso nas edge functions (E3+):
//   import { logInfo, logError } from "../_shared/log.ts";
//   logInfo("gm-agent", "process_queue", { leadId, count });
//   logError("uazapi-webhook-receiver", "send_failed", { leadId, err });
//
// Qualquer campo cujo nome contenha token/key/secret/authorization/password é
// mascarado antes de sair para stdout. Objectos aninhados são percorridos.

// Chaves cujo VALOR é sempre mascarado (case-insensitive, match por inclusão).
const SENSITIVE_KEY = /(token|key|secret|authorization|password|apikey|bearer)/i;

function mask(value: unknown): string {
  const s = String(value ?? "");
  if (s.length <= 6) return "***";
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

// Redige recursivamente um valor arbitrário, mascarando campos sensíveis.
function redact(input: unknown, depth = 0): unknown {
  if (depth > 6 || input == null) return input;
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k)
        ? mask(v)
        : redact(v, depth + 1);
    }
    return out;
  }
  return input;
}

type Level = "info" | "warn" | "error";

function emit(level: Level, fn: string, step: string, ctx?: Record<string, unknown>) {
  const line = {
    level,
    fn,
    step,
    ts: new Date().toISOString(),
    ...(ctx ? (redact(ctx) as Record<string, unknown>) : {}),
  };
  // Uma linha JSON por evento — legível pelos logs da Vercel/Supabase.
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export function logInfo(fn: string, step: string, ctx?: Record<string, unknown>) {
  emit("info", fn, step, ctx);
}

export function logWarn(fn: string, step: string, ctx?: Record<string, unknown>) {
  emit("warn", fn, step, ctx);
}

export function logError(fn: string, step: string, ctx?: Record<string, unknown>) {
  emit("error", fn, step, ctx);
}

// Exposto para testes e para redigir payloads inteiros antes de logar.
export { redact };
