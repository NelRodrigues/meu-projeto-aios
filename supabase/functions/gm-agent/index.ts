// ============================================================================
// Edge `gm-agent` — voz do agente Global Minds (Story 3.2).
//
// Invocada pelo cron `process-ai-agent-queue` (028) com {action:"process_queue"}.
// Auth: JWT normal (service_role no cron) — NÃO é webhook público, por isso é
// deployada COM verify-jwt (§4.1).
//
// Acções:
//   - process_queue : consome a fila, gera e envia respostas (default).
//   - lembretes_tick : lembrete D-1 das consultas (cron `lembretes-tick`, 3.5).
//   - test_prompt    : monta o prompt em camadas e devolve-o (não envia).
//   - ping           : health-check simples.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logInfo, logError } from "../_shared/log.ts";
import { handleProcessQueue, handleTestPrompt, handleLembretesTick } from "./queue-processor.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "process_queue";
    logInfo("gm-agent", "invoke", { action });

    let result: unknown;
    switch (action) {
      case "process_queue":
        result = await handleProcessQueue(supabase);
        break;
      case "test_prompt":
        result = await handleTestPrompt(supabase, body.lead_id);
        break;
      case "lembretes_tick":
        // Lembrete D-1 da Consulta de Orientação (Story 3.5) — cron lembretes-tick.
        result = await handleLembretesTick(supabase);
        break;
      case "ping":
        result = { pong: true };
        break;
      default:
        throw new Error(`Acção desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ ok: true, ...(result as object) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logError("gm-agent", "handler_error", { err: String(error) });
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
