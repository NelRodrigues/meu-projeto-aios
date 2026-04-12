import type { AgentSettings } from "./types.ts";

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isWithinWorkingHours(settings: AgentSettings): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-AO", {
    timeZone: "Africa/Luanda",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const currentTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dayOfWeek = now.getDay();

  if (!settings.working_days.includes(dayOfWeek)) return false;
  if (currentTime < settings.working_hours_start) return false;
  if (currentTime > settings.working_hours_end) return false;
  return true;
}

export function splitMessage(text: string, maxLength: number): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const parts: string[] = [];

  for (const para of paragraphs) {
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      parts.push(...lines);
    } else {
      parts.push(para);
    }
  }

  const result: string[] = [];
  for (const part of parts) {
    if (part.length <= maxLength) {
      result.push(part);
    } else {
      const sentences = part.split(/(?<=[.!?])\s+/);
      let chunk = "";
      for (const sentence of sentences) {
        if (chunk && (chunk + " " + sentence).length > maxLength) {
          result.push(chunk.trim());
          chunk = sentence;
        } else {
          chunk = chunk ? chunk + " " + sentence : sentence;
        }
      }
      if (chunk.trim()) result.push(chunk.trim());
    }
  }

  return result.length > 0 ? result : [text];
}

export function sanitizeForContext(text: string): string {
  let sanitized = text;
  const injectionPatterns = [
    /\bSYSTEM\s*:/gi,
    /\bOVERRIDE\b/gi,
    /\bIGNORE\s+PREVIOUS\b/gi,
    /\bIGNORE\s+ALL\b/gi,
    /\bFORGET\s+(YOUR|ALL)\b/gi,
    /\bYOU\s+ARE\s+NOW\b/gi,
    /\bNEW\s+INSTRUCTIONS?\b/gi,
    /\bACT\s+AS\b/gi,
    /\bPRETEND\s+(TO\s+BE|YOU\s+ARE)\b/gi,
  ];
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[filtrado]");
  }
  sanitized = sanitized.replace(/```[\s\S]*?```/g, "[codigo removido]");
  if (sanitized.length > 2000) sanitized = sanitized.substring(0, 2000) + "...";
  return sanitized;
}

export const VALID_STAGES = ["novo", "contactado", "orcamento", "activo", "vip", "inactivo"];
