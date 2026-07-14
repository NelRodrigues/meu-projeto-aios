// ============================================================================
// Cliente Google Calendar (FreeBusy + eventos) — Story 3.5. Módulo IMPURO.
// ----------------------------------------------------------------------------
// Fala com a API REST do Google Calendar:
//   • freeBusy(query)  → intervalos ocupados do calendário do Rinaldo
//   • createEvent(...)  → cria a Consulta de Orientação (devolve google_event_id)
//   • patchEvent(...)   → reagenda o MESMO evento (nunca duplica) — AC5
//
// ── INTERFACE DE CREDENCIAIS (decisão 14/07: "só interface de credenciais agora")
// A obtenção do access token vive atrás de `GoogleCredentialsProvider`. O código
// REST é real e definitivo; só a FONTE do token fica pendente da entrega das
// credenciais do Rinaldo (service account JSON OU OAuth refresh token).
//
// `getGoogleCalendarClient(supabase)` resolve o provider a partir de
// `integration_keys` (service='google'):
//   - key_name='access_token'     → token pronto (ligação directa / testes)
//   - key_name='service_account'  → JSON do SA → JWT → token (a ligar quando
//                                    o Rinaldo entregar a chave)   [PENDENTE]
// Enquanto nenhuma chave existir, o provider devolve `null` e as tools degradam
// graciosamente (continuidade + notificar_humano) — NUNCA inventam agenda (AC6).
//
// NÃO guarda segredos no git: tudo vem de integration_keys/env em runtime.
// ============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "./get-integration-key.ts";

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

export interface BusyInterval {
  start: string;
  end: string;
}

export interface GoogleCalendarClient {
  // ID do calendário alvo (o do Rinaldo). 'primary' se não configurado.
  calendarId: string;
  freeBusy(timeMinIso: string, timeMaxIso: string): Promise<BusyInterval[]>;
  createEvent(input: CreateEventInput): Promise<{ eventId: string }>;
  patchEvent(eventId: string, input: Partial<CreateEventInput>): Promise<void>;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  startIso: string; // início (UTC/offset)
  endIso: string; // fim
  timezone: string; // ex.: "Africa/Luanda"
  attendees?: string[]; // emails (opcional)
}

// ── Provider de credenciais (ponto de ligação PENDENTE) ──────────────────────
export interface GoogleCredentialsProvider {
  // Devolve um access token OAuth2 válido, ou null se ainda não há credenciais.
  getAccessToken(): Promise<string | null>;
  calendarId: string;
}

// Resolve o provider a partir de integration_keys. Ordem:
//   1. access_token directo (ligação simples / testes de integração)
//   2. service_account JSON → JWT bearer grant → token   [a ligar: Rinaldo]
// Sem nenhuma → provider que devolve null (degrada).
export async function resolveGoogleCredentials(
  supabase: SupabaseClient,
): Promise<GoogleCredentialsProvider> {
  const calendarId =
    (await getIntegrationKeyWithClient(supabase, "google", "calendar_id", "GOOGLE_CALENDAR_ID")) ||
    "primary";

  // Caminho 1: token directo já fornecido.
  const directToken = await getIntegrationKeyWithClient(supabase, "google", "access_token");
  if (directToken) {
    return { calendarId, getAccessToken: async () => directToken };
  }

  // Caminho 2: service account JSON → JWT → token (PENDENTE de credenciais).
  const saJson = await getIntegrationKeyWithClient(supabase, "google", "service_account");
  if (saJson) {
    return {
      calendarId,
      getAccessToken: async () => {
        try {
          return await tokenFromServiceAccount(saJson);
        } catch (e) {
          console.warn("google service_account token failed:", String(e));
          return null;
        }
      },
    };
  }

  // Nenhuma credencial → degrada (as tools tratam o null).
  return { calendarId, getAccessToken: async () => null };
}

// ── Service Account → access token (JWT bearer grant, RFC 7523) ──────────────
// Assina um JWT RS256 com a chave privada do SA e troca-o por um access token no
// endpoint OAuth do Google. Escopo: calendar (freebusy + events). Requer que o
// calendário do Rinaldo esteja PARTILHADO com o email do SA (ou domain-wide
// delegation, caso em que se usaria `sub`). Implementação real e completa; só
// depende da chave que o Rinaldo entregará em integration_keys.
async function tokenFromServiceAccount(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson) as {
    client_email: string;
    private_key: string;
    token_uri?: string;
  };
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: tokenUri,
    iat: nowSec,
    exp: nowSec + 3600,
  };

  const enc = (obj: unknown) => base64url(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = `${enc(header)}.${enc(claim)}`;

  const key = await importPkcs8(sa.private_key);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64url(new Uint8Array(sig))}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token endpoint ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("no access_token in response");
  return data.access_token as string;
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPkcs8(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

// ── Cliente concreto sobre o provider ────────────────────────────────────────
export function makeGoogleCalendarClient(
  provider: GoogleCredentialsProvider,
): GoogleCalendarClient {
  async function authedFetch(path: string, init: RequestInit): Promise<Response> {
    const token = await provider.getAccessToken();
    if (!token) throw new GoogleAuthUnavailable();
    return fetch(`${GCAL_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  const calId = encodeURIComponent(provider.calendarId);

  return {
    calendarId: provider.calendarId,

    async freeBusy(timeMinIso, timeMaxIso) {
      const res = await authedFetch(`/freeBusy`, {
        method: "POST",
        body: JSON.stringify({
          timeMin: timeMinIso,
          timeMax: timeMaxIso,
          items: [{ id: provider.calendarId }],
        }),
      });
      if (!res.ok) throw new Error(`freeBusy ${res.status}`);
      const data = await res.json();
      const cal = data?.calendars?.[provider.calendarId];
      const busy = Array.isArray(cal?.busy) ? cal.busy : [];
      return busy.map((b: { start: string; end: string }) => ({ start: b.start, end: b.end }));
    },

    async createEvent(input) {
      const res = await authedFetch(`/calendars/${calId}/events`, {
        method: "POST",
        body: JSON.stringify(toGoogleEvent(input)),
      });
      if (!res.ok) throw new Error(`createEvent ${res.status}`);
      const data = await res.json();
      if (!data?.id) throw new Error("createEvent: no id");
      return { eventId: data.id as string };
    },

    async patchEvent(eventId, input) {
      const res = await authedFetch(
        `/calendars/${calId}/events/${encodeURIComponent(eventId)}`,
        { method: "PATCH", body: JSON.stringify(toGoogleEvent(input as CreateEventInput)) },
      );
      if (!res.ok) throw new Error(`patchEvent ${res.status}`);
    },
  };
}

// Erro dedicado: credenciais indisponíveis → as tools escalam para humano (AC6).
export class GoogleAuthUnavailable extends Error {
  constructor() {
    super("google credentials unavailable");
    this.name = "GoogleAuthUnavailable";
  }
}

function toGoogleEvent(input: CreateEventInput): Record<string, unknown> {
  const ev: Record<string, unknown> = {};
  if (input.summary !== undefined) ev.summary = input.summary;
  if (input.description !== undefined) ev.description = input.description;
  if (input.startIso !== undefined) ev.start = { dateTime: input.startIso, timeZone: input.timezone };
  if (input.endIso !== undefined) ev.end = { dateTime: input.endIso, timeZone: input.timezone };
  if (input.attendees && input.attendees.length) {
    ev.attendees = input.attendees.map((email) => ({ email }));
  }
  return ev;
}

// Conveniência: resolve credenciais + monta o cliente. Devolve null se não há
// credenciais (o chamador degrada graciosamente).
export async function getGoogleCalendarClient(
  supabase: SupabaseClient,
): Promise<GoogleCalendarClient | null> {
  const provider = await resolveGoogleCredentials(supabase);
  const token = await provider.getAccessToken();
  if (!token) return null; // credenciais ainda não ligadas → degrada
  return makeGoogleCalendarClient(provider);
}
