import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeUazapiUrl, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { cliente_id, message, media_url, media_type } = await req.json();

    if (!cliente_id || !message) {
      throw new Error("cliente_id and message are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar token do utilizador
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Token invalido");
    }

    // Obter telefone do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("telefone, whatsapp_id, nome")
      .eq("id", cliente_id)
      .single();

    const phone = cliente?.whatsapp_id || cliente?.telefone;
    if (!phone) {
      throw new Error("Numero de telefone do cliente nao encontrado");
    }

    const phoneNumber = normalizeAngolaPhone(phone);

    console.log("[uazapi-send-message] Enviando para:", phoneNumber);

    // Obter config UAZAPI
    const uazapiUrl = await getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL");
    const uazapiToken = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_TOKEN");

    if (!uazapiUrl || !uazapiToken) {
      throw new Error("UAZAPI nao configurado. Definir base_url e token em integration_keys.");
    }

    const baseUrl = normalizeUazapiUrl(uazapiUrl);

    let uazapiEndpoint: string;
    let messageBody: Record<string, unknown>;

    if (media_url && media_type) {
      uazapiEndpoint = `${baseUrl}/send/media`;

      let mediaTypeName: string;
      if (media_type.startsWith("image")) {
        mediaTypeName = "image";
      } else if (media_type.startsWith("audio")) {
        mediaTypeName = "audio";
      } else if (media_type.startsWith("video")) {
        mediaTypeName = "video";
      } else {
        mediaTypeName = "document";
      }

      messageBody = {
        number: phoneNumber,
        type: mediaTypeName,
        file: media_url,
        ...(message ? { text: message } : {}),
      };
    } else {
      uazapiEndpoint = `${baseUrl}/send/text`;
      messageBody = {
        number: phoneNumber,
        text: message,
      };
    }

    console.log("[uazapi-send-message] Endpoint:", uazapiEndpoint);

    const sendResponse = await fetch(uazapiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: uazapiToken,
      },
      body: JSON.stringify(messageBody),
    });

    const responseText = await sendResponse.text();
    console.log("[uazapi-send-message] Status UAZAPI:", sendResponse.status);

    if (!sendResponse.ok) {
      console.error("[uazapi-send-message] Erro UAZAPI:", responseText);
      throw new Error(`Falha ao enviar mensagem: ${responseText}`);
    }

    let sendData;
    try {
      sendData = JSON.parse(responseText);
    } catch {
      sendData = { raw: responseText };
    }

    const whatsappMessageId =
      sendData?.key?.id ||
      sendData?.messageId ||
      sendData?.id ||
      sendData?.message?.key?.id;

    // Guardar mensagem na base de dados
    const { data: savedMessage, error: saveError } = await supabase
      .from("mensagens_whatsapp")
      .insert({
        cliente_id,
        sender_type: "humano",
        conteudo: message,
        whatsapp_message_id: whatsappMessageId,
        direction: "outgoing",
        message_status: "sent",
        media_url: media_url || null,
        media_type: media_type || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("[uazapi-send-message] Erro ao guardar mensagem:", saveError);
    }

    // Pausar agente IA (humano assumiu a conversa)
    await supabase
      .from("ai_agent_conversations")
      .update({
        status: "paused_by_human",
        paused_at: new Date().toISOString(),
        pause_reason: "Isi enviou mensagem manual",
      })
      .eq("cliente_id", cliente_id)
      .eq("status", "active");

    return new Response(
      JSON.stringify({
        success: true,
        message_id: savedMessage?.id,
        whatsapp_message_id: whatsappMessageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[uazapi-send-message] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
