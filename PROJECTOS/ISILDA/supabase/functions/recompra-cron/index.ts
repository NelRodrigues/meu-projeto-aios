import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getIntegrationKeyWithClient, normalizeUazapiUrl, normalizeAngolaPhone } from "../_shared/get-integration-key.ts";
import { callResponse } from "../_shared/llm-client.ts";

const TIPO_LABELS: Record<string, string> = {
  aniversario_proprio: "aniversário",
  aniversario_filho: "aniversário do filho(a)",
  aniversario_familiar: "aniversário familiar",
  casamento: "casamento",
  batizado: "batizado",
  formatura: "formatura",
  natal: "Natal",
  outro: "evento especial",
};

const MAX_LEMBRETES_DIA = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Verificar horario (09:00-19:00 WAT = UTC+1)
    const now = new Date();
    const horaWAT = (now.getUTCHours() + 1) % 24;
    if (horaWAT < 9 || horaWAT >= 19) {
      console.log(`[recompra] Fora do horario de envio (${horaWAT}h WAT)`);
      return new Response(JSON.stringify({ skipped: true, reason: "fora do horario" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obter configs UAZAPI e Anthropic
    const [baseUrl, token, apiKey] = await Promise.all([
      getIntegrationKeyWithClient(supabase, "uazapi", "base_url", "UAZAPI_BASE_URL"),
      getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_TOKEN"),
      getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY"),
    ]);

    if (!baseUrl || !token) {
      throw new Error("UAZAPI nao configurado");
    }
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY nao configurada");
    }

    const uazapiBaseUrl = normalizeUazapiUrl(baseUrl);

    // Obter proximas ocasioes
    const { data: ocasioes, error } = await supabase.rpc("get_upcoming_occasions");
    if (error) throw error;

    if (!ocasioes || ocasioes.length === 0) {
      console.log("[recompra] Nenhuma ocasiao proxima");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[recompra] ${ocasioes.length} ocasioes a processar`);

    let enviados = 0;

    for (const ocasiao of ocasioes) {
      if (enviados >= MAX_LEMBRETES_DIA) {
        console.log("[recompra] Limite diario atingido");
        break;
      }

      try {
        // Buscar ultimo pedido do cliente
        const { data: ultimoPedido } = await supabase
          .from("pedidos")
          .select("descricao, tema, estado, data_entrega, produtos_catalogo!produto_id(nome)")
          .eq("cliente_id", ocasiao.cliente_id)
          .eq("estado", "entregue")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Gerar mensagem personalizada
        const tipoLabel = TIPO_LABELS[ocasiao.tipo] ?? "evento especial";
        const nomePessoa = ocasiao.nome_pessoa || "a pessoa especial";
        const diasFalta = ocasiao.dias_falta;

        // O join produtos_catalogo pode vir como objecto ou array consoante a relacao.
        const catalogoRel = (
          ultimoPedido as { produtos_catalogo?: { nome?: string } | { nome?: string }[] } | null
        )?.produtos_catalogo;
        const produtoNome = Array.isArray(catalogoRel) ? catalogoRel[0]?.nome : catalogoRel?.nome;

        const promptContext = ultimoPedido
          ? `Cliente ${ocasiao.cliente_nome} tem ${tipoLabel} de ${nomePessoa} em ${diasFalta} dias. No passado encomendou: ${produtoNome || ultimoPedido.descricao || ultimoPedido.tema}.`
          : `Cliente ${ocasiao.cliente_nome} tem ${tipoLabel} de ${nomePessoa} em ${diasFalta} dias. Sem pedidos anteriores.`;

        const systemPrompt = `Sou a assistente da Isi, confeiteira artesanal em Luanda. Envia uma mensagem WhatsApp curta e calorosa para lembrar o cliente do evento que se aproxima.

Regras:
- Maximo 200 caracteres
- Tom amigo e caloroso, estilo angolano
- Menciona a Isi ou a Delicias da Isi
- Pergunta se quer comecar a pensar no bolo
- Sem markdown, sem asteriscos
- Portugues de Angola natural`;

        const result = await callResponse(
          [{ role: "user", content: promptContext }],
          systemPrompt,
          apiKey,
          "claude-haiku-4-5"
        );

        const mensagem = result.content.trim();
        if (!mensagem) continue;

        const phoneRaw = ocasiao.cliente_telefone;
        if (!phoneRaw) {
          console.warn("[recompra] Cliente sem telefone:", ocasiao.cliente_id);
          continue;
        }

        const phone = normalizeAngolaPhone(phoneRaw);

        // Enviar via UAZAPI
        const sendRes = await fetch(`${uazapiBaseUrl}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ number: phone, text: mensagem }),
        });

        if (!sendRes.ok) {
          console.error(`[recompra] Falha ao enviar para ${phone}:`, await sendRes.text());
          continue;
        }

        const sendResult = await sendRes.json();
        const messageId = sendResult?.key?.id || null;

        // Guardar mensagem
        await supabase.from("mensagens_whatsapp").insert({
          cliente_id: ocasiao.cliente_id,
          sender_type: "bot",
          conteudo: mensagem,
          whatsapp_message_id: messageId,
          direction: "outgoing",
          message_status: "sent",
        });

        // Actualizar ultimo_lembrete_enviado
        await supabase
          .from("ocasioes_cliente")
          .update({ ultimo_lembrete_enviado: new Date().toISOString().split("T")[0] })
          .eq("id", ocasiao.ocasiao_id);

        // Notificar Isi
        await supabase.from("notificacoes").insert({
          cliente_id: ocasiao.cliente_id,
          tipo: "recompra",
          mensagem: `Lembrete enviado para ${ocasiao.cliente_nome} — ${tipoLabel} de ${nomePessoa} em ${diasFalta} dias`,
        });

        enviados++;
        console.log(`[recompra] Lembrete enviado para ${ocasiao.cliente_nome} (${tipoLabel})`);
      } catch (err) {
        console.error(`[recompra] Erro ao processar ocasiao ${ocasiao.ocasiao_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ processed: ocasioes.length, enviados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[recompra] Erro geral:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
