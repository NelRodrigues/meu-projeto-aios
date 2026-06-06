/**
 * Calculo de orcamento baseado em analise visual + similarity search
 */

export interface SimilarProduto {
  produto_id: string | null;
  produto_nome: string | null;
  produto_categoria: string | null;
  preco_base: number | null;
  complexidade: number;
  similarity: number;
  titulo: string;
  thumbnail_url: string | null;
}

interface VisionAnalysis {
  estilo?: string;
  tema?: string;
  cores?: string[];
  elementos?: string[];
  complexidade?: number;
  tamanho_estimado?: string;
  descricao?: string;
}

// Precos medios por categoria (fallback quando nenhum similar encontrado)
const PRECOS_MEDIOS: Record<string, number> = {
  chantilly: 49500,
  bento_cake: 18500,
  especiais: 37500,
  naked_vintage: 40000,
  doces: 15000,
  casamento: 0, // sob consulta
  outro: 35000,
};

// Multiplicadores por complexidade
const COMPLEXIDADE_FACTOR: Record<number, number> = {
  1: 0.7,
  2: 0.85,
  3: 1.0,
  4: 1.25,
  5: 1.6,
};

// Multiplicadores por tamanho estimado
const TAMANHO_FACTOR: Record<string, number> = {
  pequeno: 0.8,
  medio: 1.0,
  grande: 1.3,
  "muito grande": 1.6,
};

export interface OrcamentoResult {
  valor_estimado: number | null;
  sob_consulta: boolean;
  explicacao: string;
  baseado_em: "similar" | "categoria" | "consulta";
}

export function calcularOrcamento(
  analysis: VisionAnalysis,
  similares: SimilarProduto[]
): OrcamentoResult {
  const complexidade = analysis.complexidade ?? 3;
  const tamanhoStr = (analysis.tamanho_estimado ?? "medio").toLowerCase();
  const complexFactor = COMPLEXIDADE_FACTOR[complexidade] ?? 1.0;

  // Detectar fator de tamanho
  let tamanhoFactor = 1.0;
  for (const [key, factor] of Object.entries(TAMANHO_FACTOR)) {
    if (tamanhoStr.includes(key)) {
      tamanhoFactor = factor;
      break;
    }
  }

  // Caso 1: temos similares com precos
  const similaresComPreco = similares.filter(
    (s) => s.preco_base && s.preco_base > 0 && s.similarity > 0.5
  );

  if (similaresComPreco.length > 0) {
    // Usar o mais similar e ajustar por complexidade e tamanho
    const maisSimlar = similaresComPreco[0];
    const precoBase = maisSimlar.preco_base!;
    const ajuste = complexFactor * tamanhoFactor;
    const valorEstimado = Math.round((precoBase * ajuste) / 500) * 500; // arredondar para 500 Kz

    return {
      valor_estimado: valorEstimado,
      sob_consulta: false,
      explicacao: `Baseado em "${maisSimlar.produto_nome ?? maisSimlar.titulo}" (${Math.round(maisSimlar.similarity * 100)}% similar)`,
      baseado_em: "similar",
    };
  }

  // Caso 2: baseado na categoria detectada
  const categoria = detectarCategoria(analysis);

  if (categoria === "casamento") {
    return {
      valor_estimado: null,
      sob_consulta: true,
      explicacao: "Bolo de casamento — orçamento personalizado",
      baseado_em: "consulta",
    };
  }

  const precoCategoria = PRECOS_MEDIOS[categoria] ?? 35000;
  const valorEstimado = Math.round((precoCategoria * complexFactor * tamanhoFactor) / 500) * 500;

  return {
    valor_estimado: valorEstimado,
    sob_consulta: false,
    explicacao: `Estimativa para ${categoria} com complexidade ${complexidade}/5`,
    baseado_em: "categoria",
  };
}

function detectarCategoria(analysis: VisionAnalysis): string {
  const estilo = (analysis.estilo ?? "").toLowerCase();
  const tema = (analysis.tema ?? "").toLowerCase();
  const elementos = (analysis.elementos ?? []).map((e) => e.toLowerCase());
  const descricao = (analysis.descricao ?? "").toLowerCase();

  const texto = `${estilo} ${tema} ${elementos.join(" ")} ${descricao}`;

  if (texto.includes("casamento") || texto.includes("noiva") || texto.includes("wedding")) {
    return "casamento";
  }
  if (texto.includes("bento") || texto.includes("mini") || texto.includes("individual")) {
    return "bento_cake";
  }
  if (texto.includes("naked") || texto.includes("vintage") || texto.includes("rustico")) {
    return "naked_vintage";
  }
  if (texto.includes("chantilly") || texto.includes("aniversario")) {
    return "chantilly";
  }
  if (texto.includes("cupcake") || texto.includes("donut") || texto.includes("bolacha")) {
    return "doces";
  }

  return "especiais";
}
