import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";
import { callResponse } from "../_shared/llm-client.ts";
import type { AgentConfig, QueueMessage } from "./types.ts";
import { isWithinWorkingHours, sanitizeForContext, sleep } from "./helpers.ts";
import { getUazapiConfig, sendHumanizedResponse, atomicRateLimit, insertSystemMessage } from "./communication.ts";
import { gatherContext } from "./context-gatherer.ts";

const SYSTEM_PROMPT_ISI = `Eu sou a assistente virtual da Isilda (a Isi), dona da Delicias da Isi — confeitaria artesanal em Luanda, Angola.

PERSONALIDADE:
- Calorosa, simpática e orgulhosa do trabalho artesanal
- Apaixonada por bolos e pela arte da confeitaria
- Angolana, fala com expressoes naturais de Angola
- Profissional mas proxima, como uma amiga que faz bolos

CATALOGO RESUMIDO (preco base):
- Bolo simples (1 andar): a partir de 15.000 Kz
- Bolo 2 andares: a partir de 35.000 Kz
- Bolo 3 andares: a partir de 65.000 Kz
- Cupcakes (12 unid): a partir de 8.000 Kz
- Doces finos (por kg): a partir de 5.000 Kz
Nota: precos variam com personalizacao, tema, recheio especial

REGRAS DE NEGOCIO:
- Preco base = massa + recheio simples (baunilha/chocolate)
- Personalizacoes (pasta americana, impressao, figurinhas) aumentam o preco
- Prazo minimo: 5 dias uteis antes da data do evento
- Pagamento: 50% no pedido, 50% na entrega
- Entrega: disponivel em Luanda (taxa extra fora de Talatona/Miramar/Benfica)

FLUXO DE VENDA:
1. Briefing (o que pretende, data do evento, numero de pessoas)
2. Orcamento (enviar proposta com preco)
3. Confirmacao do pedido (cliente aceita)
4. Pagamento inicial (50%)
5. Producao
6. Entrega

HORARIO: Seg-Sab 08:00-20:00 WAT
ESCALADA PARA ISI: Se cliente reclama, pede desconto excessivo (>20%), tem urgencia extreme (<3 dias), ou pergunta algo que nao consegues responder com certeza.

INSTRUCOES:
- Nunca inventes precos sem dizer "a partir de" ou "dependendo da personalizacao"
- Maximo 300 caracteres por mensagem
- Portugues de Angola natural (usa "fixe", "na boa", "tudo bem" etc)
- Sem markdown ou asteriscos
- Usa emojis com moderacao (1-2 por mensagem)`;

export async function processClienteMessage(
  supabase: SupabaseClient,
  clienteId: string,
  agent: AgentConfig,
  apiKey: string,
  conversationId: string
): Promise<void> {
  // 1. Verificar horario
  if (!isWithinWorkingHours(agent.settings)) {
    console.log("[agent] Fora do horario de trabalho");
    await insertSystemMessage(supabase, clienteId, `[Sistema] Mensagem recebida fora do horario (${agent.settings.working_hours_start}-${agent.settings.working_hours_end}).`);
    return;
  }

  // 2. Verificar status da conversa
  const { data: conversation } = await supabase
    .from("ai_agent_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conversation || conversation.status !== "active") {
    console.log("[agent] Conversa nao activa:", conversation?.status);
    return;
  }

  // 3. Verificar max mensagens
  if (conversation.total_messages_sent >= agent.settings.max_messages_per_conversation) {
    console.log("[agent] Max mensagens atingido, transferir para Isi");
    await supabase
      .from("ai_agent_conversations")
      .update({ status: "paused_by_human", pause_reason: "Limite de mensagens atingido" })
      .eq("id", conversationId);
    await insertSystemMessage(supabase, clienteId, "[Sistema] Agente IA pausado. A Isi vai responder em breve.");
    return;
  }

  // 4. Config UAZAPI
  const uazapiConfig = await getUazapiConfig(supabase, clienteId);
  if (!uazapiConfig) {
    console.error("[agent] UAZAPI nao configurado para cliente:", clienteId);
    return;
  }

  // 5. Rate limit
  const withinLimit = await atomicRateLimit(
    supabase,
    clienteId,
    agent.settings.cadence_max_messages_per_hour,
    agent.settings.cadence_max_messages_per_day
  );
  if (!withinLimit) {
    console.log("[agent] Rate limit atingido para:", clienteId);
    return;
  }

  // 6. Recolher contexto
  const context = await gatherContext(supabase, clienteId, agent.settings);

  // 7. Construir system prompt completo
  const fullSystemPrompt = `${agent.system_prompt || SYSTEM_PROMPT_ISI}

---
CONTEXTO ACTUAL:
${context}

---
Hoje e ${new Date().toLocaleDateString("pt-AO", { timeZone: "Africa/Luanda" })}
Horario: ${new Date().toLocaleTimeString("pt-AO", { timeZone: "Africa/Luanda" })}`;

  // 8. Construir historico de conversa
  const limit = agent.settings.context_messages_limit || 30;
  const { data: recentMessages } = await supabase
    .from("mensagens_whatsapp")
    .select("sender_type, conteudo, direction")
    .eq("cliente_id", clienteId)
    .neq("sender_type", "sistema")
    .neq("direction", "internal")
    .order("created_at", { ascending: true })
    .limit(limit);

  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (recentMessages && recentMessages.length > 0) {
    for (const msg of recentMessages) {
      const role: "user" | "assistant" =
        msg.direction === "incoming" || msg.sender_type === "cliente" ? "user" : "assistant";
      const lastMsg = conversationHistory[conversationHistory.length - 1];
      if (lastMsg && lastMsg.role === role) {
        lastMsg.content += "\n" + sanitizeForContext(msg.conteudo);
      } else {
        conversationHistory.push({ role, content: sanitizeForContext(msg.conteudo) });
      }
    }
  }

  if (conversationHistory.length === 0) {
    conversationHistory.push({ role: "user", content: "Ola" });
  }

  if (conversationHistory[conversationHistory.length - 1].role !== "user") {
    conversationHistory.push({ role: "user", content: "..." });
  }

  // 9. Chamar Claude
  const result = await callResponse(
    conversationHistory,
    fullSystemPrompt,
    apiKey,
    agent.model || "claude-sonnet-4-5"
  );

  const finalResponse = result.content || agent.settings.fallback_message;

  // 10. Enviar resposta humanizada
  await sendHumanizedResponse(
    uazapiConfig.phone,
    finalResponse,
    agent.settings,
    uazapiConfig,
    supabase,
    clienteId
  );

  // 11. Actualizar conversa
  await supabase
    .from("ai_agent_conversations")
    .update({
      total_messages_sent: (conversation.total_messages_sent || 0) + 1,
      last_processed_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  // 12. Log
  await supabase.from("ai_agent_logs").insert({
    conversation_id: conversationId,
    cliente_id: clienteId,
    agent_id: agent.id,
    log_type: "message_sent",
    data: { response: finalResponse.substring(0, 500) },
    tokens_input: result.tokens_input,
    tokens_output: result.tokens_output,
  });
}

export async function handleProcessQueue(supabase: SupabaseClient): Promise<{ processed: number }> {
  const { data: agent } = await supabase
    .from("ai_sales_agents")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!agent) {
    console.log("[agent] Nenhum agente activo");
    return { processed: 0 };
  }

  // Recovery de mensagens presas
  await supabase.rpc("process_ai_agent_queue");

  // Claim mensagens
  let { data: messages } = await supabase.rpc("claim_queue_messages", {
    p_batch_size: agent.settings?.queue_batch_size || 5,
  });

  // Aguardar mensagens com debounce
  if (!messages || messages.length === 0) {
    const { data: nextPending } = await supabase
      .from("ai_agent_message_queue")
      .select("scheduled_for")
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextPending?.scheduled_for) {
      const waitMs = new Date(nextPending.scheduled_for).getTime() - Date.now() + 500;
      if (waitMs > 0 && waitMs <= 45000) {
        console.log(`[agent] Aguardar ${Math.round(waitMs / 1000)}s para mensagem com debounce...`);
        await sleep(waitMs);
        const retried = await supabase.rpc("claim_queue_messages", {
          p_batch_size: agent.settings?.queue_batch_size || 5,
        });
        messages = retried.data;
      }
    }
  }

  if (!messages || messages.length === 0) return { processed: 0 };

  // Obter API key Anthropic
  const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[agent] ANTHROPIC_API_KEY nao configurada");
    for (const msg of messages) {
      await supabase
        .from("ai_agent_message_queue")
        .update({ status: "failed", error_message: "Anthropic API key nao configurada" })
        .eq("id", msg.id);
    }
    return { processed: 0 };
  }

  // Agrupar por cliente
  const clienteMessages = new Map<string, QueueMessage>();
  for (const msg of messages) {
    clienteMessages.set(msg.cliente_id, msg);
  }

  let processed = 0;
  for (const [clienteId, msg] of clienteMessages) {
    try {
      const { data: lockAcquired } = await supabase.rpc("try_acquire_agent_lock", {
        p_cliente_id: clienteId,
        p_lock_duration: `${agent.settings?.lock_duration_seconds || 30} seconds`,
      });

      if (!lockAcquired) {
        console.log("[agent] Lock nao adquirido para cliente:", clienteId);
        await supabase
          .from("ai_agent_message_queue")
          .update({ status: "pending" })
          .eq("id", msg.id);
        continue;
      }

      try {
        await processClienteMessage(supabase, clienteId, agent, apiKey, msg.conversation_id);
        await supabase
          .from("ai_agent_message_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", msg.id);
        processed++;
      } finally {
        await supabase.rpc("release_agent_lock", { p_cliente_id: clienteId });
      }
    } catch (error) {
      console.error(`[agent] Erro ao processar cliente ${clienteId}:`, error);
      const errorStr = String(error);
      const isFinal = msg.attempts >= (msg.max_attempts || 3);
      await supabase
        .from("ai_agent_message_queue")
        .update({
          status: isFinal ? "failed" : "pending",
          error_message: errorStr,
        })
        .eq("id", msg.id);

      if (isFinal) {
        await insertSystemMessage(supabase, clienteId, "[Sistema] Agente IA falhou. A Isi vai responder em breve.");
      }
    }
  }

  return { processed };
}

export async function handleToggleConversation(
  supabase: SupabaseClient,
  clienteId: string,
  action: "pause" | "resume" | "activate",
  reason?: string,
  agentId?: string
): Promise<{ success: boolean; status: string }> {
  let selectedAgentId = agentId;

  if (!selectedAgentId) {
    const { data: agent } = await supabase
      .from("ai_sales_agents")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!agent) throw new Error("Nenhum agente activo");
    selectedAgentId = agent.id;
  }

  if (action === "activate") {
    const { data: existing } = await supabase
      .from("ai_agent_conversations")
      .select("id, status")
      .eq("cliente_id", clienteId)
      .eq("agent_id", selectedAgentId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ai_agent_conversations")
        .update({ status: "active", paused_by: null, pause_reason: null, paused_at: null })
        .eq("id", existing.id);
    } else {
      await supabase.from("ai_agent_conversations").insert({
        cliente_id: clienteId,
        agent_id: selectedAgentId,
        status: "active",
      });
    }
    return { success: true, status: "active" };
  }

  if (action === "pause") {
    await supabase
      .from("ai_agent_conversations")
      .update({
        status: "paused_by_human",
        paused_at: new Date().toISOString(),
        pause_reason: reason || "Pausado pela Isi",
      })
      .eq("cliente_id", clienteId)
      .eq("agent_id", selectedAgentId);
    return { success: true, status: "paused_by_human" };
  }

  if (action === "resume") {
    await supabase
      .from("ai_agent_conversations")
      .update({ status: "active", paused_by: null, pause_reason: null, paused_at: null })
      .eq("cliente_id", clienteId)
      .eq("agent_id", selectedAgentId);
    return { success: true, status: "active" };
  }

  throw new Error("Accao invalida");
}
