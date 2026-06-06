import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AgentSettings } from "./types.ts";
import { sanitizeForContext } from "./helpers.ts";
import { isSharedBackendModeRuntime } from "../_shared/backend-mode.ts";

export async function gatherContext(
  supabase: SupabaseClient,
  clienteId: string,
  settings: AgentSettings
): Promise<string> {
  const parts: string[] = [];
  const sharedMode = isSharedBackendModeRuntime();

  // Dados do cliente
  const { data: cliente } = await supabase
    .from(sharedMode ? "contacts" : "clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  if (cliente) {
    parts.push(`## Dados do Cliente
- Nome: ${sanitizeForContext(cliente.nome || "Nao informado")}
- Telefone: ${cliente.telefone || "Nao informado"}
- Estagio actual: ${cliente.estagio}
- Total pedidos: ${cliente.total_pedidos || 0}
- Total gasto: ${cliente.total_gasto || 0} Kz
- Ultima compra: ${cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString("pt-AO") : "Nenhuma"}
- Origem: ${cliente.origem || "whatsapp"}
- Notas: ${sanitizeForContext(cliente.notas || "Nenhuma")}`);
  }

  // Historico de mensagens
  const { data: messages } = sharedMode
    ? { data: [] as Array<{ sender_type: string; conteudo: string; direction: string; created_at: string }> }
    : await supabase
        .from("mensagens_whatsapp")
        .select("sender_type, conteudo, direction, created_at")
        .eq("cliente_id", clienteId)
        .neq("sender_type", "sistema")
        .neq("direction", "internal")
        .order("created_at", { ascending: false })
        .limit(settings.context_messages_limit || 30);

  if (messages && messages.length > 0) {
    const history = messages.reverse().map((m: { direction: string; created_at: string; conteudo: string; sender_type: string }) => {
      const sender = m.direction === "incoming" ? "Cliente" : "Isi";
      return `[${new Date(m.created_at).toLocaleString("pt-AO", { timeZone: "Africa/Luanda" })}] ${sender}: ${sanitizeForContext(m.conteudo)}`;
    }).join("\n");
    parts.push(`## Historico de Mensagens (ultimas ${messages.length})\n${history}`);
  }

  parts.push(`## Estagios do Pipeline da Confeitaria
novo: Novo cliente (primeiro contacto), contactado: Ja contactado (recebeu resposta), orcamento: Pediu/recebeu orcamento, activo: Pedido confirmado e em producao, vip: Cliente recorrente fiel, inactivo: Sem actividade ha mais de 60 dias`);

  return parts.join("\n\n");
}
