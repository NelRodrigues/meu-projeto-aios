import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Tool Definitions (Anthropic format)
// ============================================================

export const AGENT_TOOLS = [
  {
    name: "verificar_disponibilidade",
    description: "Verifica se uma data específica está disponível para entrega de pedidos. Usa quando o cliente menciona uma data ou pergunta sobre disponibilidade. Retorna se tem vagas e o próximo dia disponível se estiver lotado.",
    input_schema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Data no formato YYYY-MM-DD (ex: 2026-04-20)",
        },
      },
      required: ["data"],
    },
  },
  {
    name: "criar_pedido",
    description: "Cria um novo pedido quando o cliente confirma os detalhes da encomenda. Só usar quando o cliente explicitamente confirmar que quer fazer o pedido com os detalhes combinados.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: {
          type: "string",
          description: "UUID do cliente (já fornecido no contexto)",
        },
        descricao: {
          type: "string",
          description: "Descrição completa do pedido",
        },
        tema: {
          type: "string",
          description: "Tema do bolo (ex: Frozen, Safari, Minimalista)",
        },
        tamanho: {
          type: "string",
          description: "Tamanho do bolo (ex: 16cm, médio)",
        },
        sabor_massa: {
          type: "string",
          description: "Sabor da massa (ex: Baunilha, Chocolate)",
        },
        sabor_recheio: {
          type: "string",
          description: "Sabor do recheio",
        },
        data_entrega: {
          type: "string",
          description: "Data de entrega no formato YYYY-MM-DD",
        },
        modo_entrega: {
          type: "string",
          enum: ["retirada", "entrega"],
          description: "Modo de entrega",
        },
        valor_orcamento: {
          type: "number",
          description: "Valor do orçamento em Kz (se já foi combinado)",
        },
        notas: {
          type: "string",
          description: "Notas adicionais do pedido",
        },
      },
      required: ["cliente_id", "data_entrega"],
    },
  },
  {
    name: "registar_ocasiao",
    description: "Regista uma ocasião especial do cliente (aniversário, casamento, etc.) para enviar lembretes automáticos no futuro. Usar quando cliente mencionar datas especiais e confirmar que quer ser lembrado.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: {
          type: "string",
          description: "UUID do cliente",
        },
        tipo: {
          type: "string",
          enum: ["aniversario_proprio", "aniversario_filho", "aniversario_familiar", "casamento", "batizado", "formatura", "natal", "outro"],
          description: "Tipo de ocasiao",
        },
        nome_pessoa: {
          type: "string",
          description: "Nome da pessoa cujo evento é celebrado",
        },
        mes: {
          type: "string",
          description: "Mês do evento (01-12)",
        },
        dia: {
          type: "string",
          description: "Dia do evento (01-31)",
        },
        notas: {
          type: "string",
          description: "Notas adicionais (preferencias, tema habitual)",
        },
      },
      required: ["cliente_id", "tipo", "mes", "dia"],
    },
  },
  {
    name: "enviar_foto_portfolio",
    description: "Envia uma foto do portfolio da Isi para o cliente via WhatsApp. Usar quando tiver similares encontrados pelo sistema de visao ou quando cliente pedir para ver exemplos.",
    input_schema: {
      type: "object",
      properties: {
        referencia_id: {
          type: "string",
          description: "UUID da referencia visual na tabela referencias_visuais",
        },
        caption: {
          type: "string",
          description: "Legenda a enviar com a foto (descricao breve)",
        },
        cliente_id: {
          type: "string",
          description: "UUID do cliente (para guardar mensagem)",
        },
      },
      required: ["referencia_id", "cliente_id"],
    },
  },
  {
    name: "consultar_catalogo",
    description: "Consulta o catálogo de produtos disponíveis para responder a perguntas sobre preços e produtos específicos.",
    input_schema: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          enum: ["chantilly", "bento_cake", "especiais", "naked_vintage", "doces", "casamento"],
          description: "Categoria de produtos a consultar",
        },
        nome: {
          type: "string",
          description: "Nome ou parte do nome do produto a pesquisar",
        },
      },
    },
  },
];

// ============================================================
// Tool Executors
// ============================================================

export async function executeTool(
  supabase: SupabaseClient,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "verificar_disponibilidade":
      return await verificarDisponibilidade(supabase, toolInput.data as string);

    case "criar_pedido":
      return await criarPedidoTool(supabase, toolInput);

    case "registar_ocasiao":
      return await registarOcasiao(supabase, toolInput);

    case "enviar_foto_portfolio":
      return await enviarFotoPortfolio(supabase, toolInput);

    case "consultar_catalogo":
      return await consultarCatalogo(supabase, toolInput);

    default:
      return JSON.stringify({ erro: `Tool desconhecida: ${toolName}` });
  }
}

async function verificarDisponibilidade(supabase: SupabaseClient, data: string): Promise<string> {
  const { data: result, error } = await supabase.rpc("verificar_disponibilidade", {
    p_data: data,
  });

  if (error) {
    return JSON.stringify({ disponivel: false, motivo: "Erro ao verificar disponibilidade" });
  }

  return JSON.stringify(result);
}

async function criarPedidoTool(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: input.cliente_id,
      descricao: input.descricao || null,
      tema: input.tema || null,
      tamanho: input.tamanho || null,
      sabor_massa: input.sabor_massa || null,
      sabor_recheio: input.sabor_recheio || null,
      data_entrega: input.data_entrega,
      modo_entrega: input.modo_entrega || "retirada",
      valor_orcamento: input.valor_orcamento || null,
      notas: input.notas || null,
      estado: "novo",
    })
    .select("id")
    .single();

  if (error) {
    return JSON.stringify({ sucesso: false, erro: error.message });
  }

  // Notificar Isi
  await supabase.from("notificacoes").insert({
    cliente_id: input.cliente_id as string,
    tipo: "urgente",
    mensagem: `Novo pedido criado pelo bot para ${input.data_entrega}`,
  });

  return JSON.stringify({
    sucesso: true,
    pedido_id: data.id,
    mensagem: "Pedido criado com sucesso",
  });
}

async function registarOcasiao(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const mes = String(input.mes).padStart(2, "0");
  const dia = String(input.dia).padStart(2, "0");

  const { data, error } = await supabase.from("ocasioes_cliente").insert({
    cliente_id: input.cliente_id,
    tipo: input.tipo,
    nome_pessoa: input.nome_pessoa || null,
    data_evento: `${mes}-${dia}`,
    notas: input.notas || null,
    activo: true,
  }).select("id").single();

  if (error) {
    return JSON.stringify({ sucesso: false, erro: error.message });
  }

  return JSON.stringify({
    sucesso: true,
    ocasiao_id: data.id,
    mensagem: `Ocasiao registada — ${input.tipo} em ${mes}/${dia}`,
  });
}

async function enviarFotoPortfolio(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const { data: referencia, error } = await supabase
    .from("referencias_visuais")
    .select("titulo, url_imagem, thumbnail_url, descricao_visual")
    .eq("id", input.referencia_id)
    .single();

  if (error || !referencia) {
    return JSON.stringify({ sucesso: false, erro: "Referencia nao encontrada" });
  }

  const imageUrl = referencia.thumbnail_url || referencia.url_imagem;
  if (!imageUrl) {
    return JSON.stringify({ sucesso: false, erro: "Sem URL de imagem disponivel" });
  }

  // O envio real é feito fora desta funcao — retornamos URL para o agente enviar
  return JSON.stringify({
    sucesso: true,
    image_url: imageUrl,
    titulo: referencia.titulo,
    descricao: referencia.descricao_visual,
    nota: "Enviar esta imagem via UAZAPI com a legenda fornecida",
  });
}

async function consultarCatalogo(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  let query = supabase
    .from("produtos_catalogo")
    .select("nome, categoria, preco_base, precos_por_tamanho, sob_consulta, descricao")
    .eq("activo", true);

  if (input.categoria) {
    query = query.eq("categoria", input.categoria);
  }
  if (input.nome) {
    query = query.ilike("nome", `%${input.nome}%`);
  }

  const { data, error } = await query.order("categoria").order("nome").limit(10);

  if (error || !data) {
    return JSON.stringify({ erro: "Erro ao consultar catálogo" });
  }

  type ProdutoRow = {
    nome: string;
    categoria: string;
    sob_consulta: boolean;
    preco_base: number | null;
    precos_por_tamanho: Record<string, number> | null;
  };
  const produtos = (data as ProdutoRow[]).map((p) => ({
    nome: p.nome,
    categoria: p.categoria,
    preco: p.sob_consulta
      ? "Sob consulta"
      : p.preco_base
      ? `A partir de ${p.preco_base.toLocaleString()} Kz`
      : "Preço não definido",
    precos_tamanho: Object.entries(p.precos_por_tamanho || {})
      .map(([t, v]) => `${t}: ${(v as number).toLocaleString()} Kz`)
      .join(", "),
  }));

  return JSON.stringify({ produtos });
}
