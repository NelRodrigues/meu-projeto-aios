import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();

    const event =
      payload.event ||
      payload.type ||
      payload.EventType ||
      payload.eventType;

    // Logs sanitizados (redact tokens)
    const redactedPayload = JSON.parse(
      JSON.stringify(payload, (key, value) => {
        const k = String(key).toLowerCase();
        if (k === "token" || k === "admintoken" || k === "authorization") return "[REDACTED]";
        return value;
      })
    );

    console.log("[webhook] event:", event);
    console.log("[webhook] payload:", JSON.stringify(redactedPayload, null, 2));

    // Verificar token do webhook
    const webhookToken = await getIntegrationKeyWithClient(supabase, "uazapi", "webhook_token");
    if (webhookToken) {
      const incomingToken = req.headers.get("x-webhook-token") || payload.webhook_token;
      if (!incomingToken || incomingToken !== webhookToken) {
        console.log("[webhook] Token invalido");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    switch (event) {
      case "messages":
      case "message":
      case "messages.upsert": {
        const messageData = payload.message || payload.data || payload;

        const isFromMe = Boolean(
          messageData.fromMe ?? messageData.key?.fromMe ?? messageData.wasSentByApi
        );

        if (isFromMe) {
          console.log("[webhook] Ignorar mensagem outgoing");
          break;
        }

        const remoteJid =
          messageData.key?.remoteJid ||
          messageData.chatid ||
          payload.chat?.wa_chatid ||
          messageData.sender_pn ||
          payload.chat?.phone ||
          messageData.from ||
          messageData.phone ||
          messageData.sender ||
          null;

        if (!remoteJid) {
          console.log("[webhook] Sem remoteJid");
          break;
        }

        const whatsappMessageId =
          messageData.key?.id || messageData.messageid || messageData.id || null;

        // Idempotencia
        if (whatsappMessageId) {
          const { error: idempotencyError } = await supabase
            .from("webhook_processed_messages")
            .insert({
              whatsapp_message_id: whatsappMessageId,
              event_type: "messages.upsert",
            });

          if (idempotencyError?.code === "23505") {
            console.log("[webhook] Duplicado, ignorar:", whatsappMessageId);
            break;
          }
        }

        // Normalizar telefone
        const rawPhone = normalizeAngolaPhone(String(remoteJid));

        const candidates = new Set<string>();
        const addCandidate = (v?: string | null) => {
          if (!v) return;
          const digits = String(v).replace(/\D/g, "");
          if (digits.length >= 8) candidates.add(digits);
        };

        addCandidate(rawPhone);
        addCandidate(payload.chat?.phone);
        let noCountry = rawPhone;
        if (noCountry.startsWith("244") && noCountry.length > 9) noCountry = noCountry.slice(3);
        addCandidate(noCountry);
        for (const n of [12, 11, 10, 9, 8]) addCandidate(rawPhone.slice(-n));

        // Lookup cliente por telefone ou whatsapp_id
        const orFilter = Array.from(candidates)
          .flatMap((c) => [`telefone.ilike.%${c}%`, `whatsapp_id.ilike.%${c}%`])
          .join(",");

        const { data: foundCliente } = await supabase
          .from("clientes")
          .select("id")
          .or(orFilter)
          .limit(1)
          .maybeSingle();

        let cliente = foundCliente;

        if (!cliente) {
          console.log("[webhook] Cliente nao encontrado para:", rawPhone, "— a criar...");

          const phoneForDb = normalizeAngolaPhone(
            messageData.chatid || payload.chat?.wa_chatid || remoteJid
          );

          const clienteName =
            messageData.senderName ||
            payload.chat?.wa_contactName ||
            payload.chat?.wa_name ||
            payload.chat?.name ||
            null;

          const { data: newCliente, error: createError } = await supabase
            .from("clientes")
            .insert({
              telefone: phoneForDb,
              nome: clienteName || "Cliente WhatsApp",
              estagio: "novo",
              origem: "whatsapp",
              whatsapp_id: phoneForDb,
              criado_por_bot: true,
            })
            .select("id")
            .single();

          if (createError) {
            console.error("[webhook] Erro ao criar cliente:", createError);
            break;
          }

          console.log("[webhook] Novo cliente criado:", newCliente.id);
          cliente = newCliente;
        }

        // Garantir conversa activa com agente IA
        const { data: existingConv } = await supabase
          .from("ai_agent_conversations")
          .select("id, status")
          .eq("cliente_id", cliente.id)
          .limit(1)
          .maybeSingle();

        if (!existingConv) {
          const { data: activeAgent } = await supabase
            .from("ai_sales_agents")
            .select("id")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

          if (activeAgent) {
            await supabase.from("ai_agent_conversations").insert({
              cliente_id: cliente.id,
              agent_id: activeAgent.id,
              status: "active",
            });
            console.log("[webhook] Conversa criada para cliente:", cliente.id);
          }
        } else if (existingConv.status === "completed") {
          await supabase
            .from("ai_agent_conversations")
            .update({ status: "active", paused_at: null, pause_reason: null })
            .eq("id", existingConv.id);
          console.log("[webhook] Conversa reactivada para cliente:", cliente.id);
        }

        // Detectar tipo de media
        const mediaType =
          messageData.mediaType ||
          messageData.media_type ||
          (messageData.type && messageData.type !== "text" ? messageData.type : null) ||
          (messageData.message?.imageMessage ? "image"
            : messageData.message?.videoMessage ? "video"
            : messageData.message?.audioMessage ? "audio"
            : messageData.message?.documentMessage ? "document"
            : messageData.message?.stickerMessage ? "sticker"
            : messageData.message?.locationMessage ? "location"
            : null);

        const mediaUrl =
          messageData.mediaUrl ||
          messageData.media_url ||
          messageData.message?.imageMessage?.url ||
          messageData.message?.videoMessage?.url ||
          messageData.message?.audioMessage?.url ||
          messageData.message?.documentMessage?.url ||
          null;

        const mediaCaption =
          messageData.message?.imageMessage?.caption ||
          messageData.message?.videoMessage?.caption ||
          messageData.caption ||
          null;

        const mediaLabels: Record<string, string> = {
          image: "[Imagem recebida]",
          video: "[Video recebido]",
          audio: "[Audio recebido]",
          document: "[Documento recebido]",
          sticker: "[Sticker]",
          location: "[Localizacao]",
        };

        let messageContent: string;
        if (mediaType) {
          messageContent = mediaCaption || mediaLabels[mediaType] || "[Media recebida]";
        } else {
          messageContent =
            messageData.message?.conversation ||
            messageData.message?.extendedTextMessage?.text ||
            messageData.body ||
            messageData.text ||
            messageData.content ||
            "[Mensagem recebida]";
        }

        // Guardar mensagem
        const { error: insertError } = await supabase.from("mensagens_whatsapp").insert({
          cliente_id: cliente.id,
          sender_type: "cliente",
          conteudo: messageContent,
          whatsapp_message_id: whatsappMessageId,
          direction: "incoming",
          message_status: "delivered",
          media_url: mediaUrl,
          media_type: mediaType,
        });

        if (insertError) {
          console.error("[webhook] Erro ao guardar mensagem:", insertError);
        } else {
          console.log("[webhook] Mensagem guardada para cliente:", cliente.id);

          // Actualizar ultimo_contacto
          await supabase
            .from("clientes")
            .update({ ultimo_contacto: new Date().toISOString() })
            .eq("id", cliente.id);

          // Fire-and-forget: triggerar agente IA
          fetch(`${supabaseUrl}/functions/v1/ai-sales-agent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ action: "process_queue" }),
          }).catch((e) => console.warn("[webhook] AI trigger error (non-blocking):", e));
        }
        break;
      }

      case "messages_update":
      case "message.ack": {
        const ackData = payload.data || payload.message || payload;
        const messageId =
          ackData.key?.id || ackData.messageId || ackData.messageid || ackData.id;
        const ack = ackData.ack || ackData.status;

        if (!messageId) break;

        let status = "sent";
        if (ack === 2 || ack === "DELIVERY_ACK") status = "delivered";
        if (ack === 3 || ack === "READ") status = "read";

        await supabase
          .from("mensagens_whatsapp")
          .update({ message_status: status })
          .eq("whatsapp_message_id", messageId);

        console.log(`[webhook] Mensagem ${messageId} -> ${status}`);
        break;
      }

      default:
        console.log("[webhook] Evento nao tratado:", event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[webhook] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
