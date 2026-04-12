import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  handleProcessQueue,
  handleToggleConversation,
} from "./queue-processor.ts";

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

    console.log(`[ai-sales-agent] action: ${action}`, { cliente_id: body.cliente_id });

    let result: unknown;

    switch (action) {
      case "process_queue":
        result = await handleProcessQueue(supabase);
        break;

      case "toggle_conversation":
        if (!body.cliente_id) throw new Error("cliente_id obrigatorio");
        result = await handleToggleConversation(
          supabase,
          body.cliente_id,
          body.toggle_action || "pause",
          body.reason,
          body.agent_id
        );
        break;

      default:
        throw new Error(`Accao desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai-sales-agent] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
