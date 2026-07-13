// ============================================================================
// Base de conhecimento do agente Global Minds (§6, AC3/AC4). Story 3.2.
// Módulo PURO (sem Deno/URL) — importável em testes.
//
// DECISÃO DO UTILIZADOR (brief 3.2): a base CONSTRÓI-SE do catálogo (E2) + da
// arquitectura/PRD. O doc "fluxo 03/07" com as 12 FAQ NÃO está no repo. Por
// isso:
//   - As faixas de investimento/custo de vida vêm do CATÁLOGO real em runtime
//     (destinos.custo_vida_faixa, programas.custo_min/max) — nunca hardcoded,
//     nunca valor exacto (regra de faixas, §6 L4 / FR3).
//   - As 12 FAQ são um ESQUELETO PT+EN derivado da arquitectura/PRD. Cada FAQ
//     SEM conteúdo oficial validado está marcada `FAQ_PENDENTE_VALIDACAO_CLIENTE`
//     e devolve `no_answer` (escala para humano — mecânica na 3.3). ZERO invenção.
//
// Regra extraction-no-fallbacks: onde não há fonte, NÃO se inventa um valor —
// remete-se para escalação. `answer: null` é uma lacuna honesta, não um default.
// ============================================================================

import type { LeadLanguage } from "./types.ts";

// ── Faixas (regra de faixas — FR3, §6 L4) ────────────────────────────────────

export interface FaixaFonte {
  // Faixa de custo de vida do destino (ex.: "500–800 EUR/mês").
  custo_vida_faixa?: string | null;
  custo_vida_currency?: string | null;
  // Faixa de investimento do programa (min/max + moeda).
  custo_min?: number | null;
  custo_max?: number | null;
  currency?: string | null;
}

export interface FaixaResposta {
  temFaixa: boolean;
  texto: string; // frase pronta para o agente citar (faixa + nota de proposta)
}

// Nota obrigatória de compliance: a cotação exacta só vai na proposta.
const NOTA_PROPOSTA_PT =
  "A cotação exacta vai na proposta por email, depois da consulta — não damos valores fechados por aqui.";
const NOTA_PROPOSTA_EN =
  "The exact quote goes in the proposal by email, after the consultation — we don't give closed figures here.";

function formatFaixaInvestimento(f: FaixaFonte, idioma: LeadLanguage): string | null {
  const cur = (f.currency || "").trim();
  const min = f.custo_min;
  const max = f.custo_max;
  if (min == null && max == null) return null;
  const nums = [min, max].filter((n): n is number => n != null);
  const faixa =
    nums.length === 2 ? `${nums[0]}–${nums[1]}` : `${idioma === "en" ? "from " : "a partir de "}${nums[0]}`;
  return `${faixa}${cur ? " " + cur : ""}`.trim();
}

/**
 * Dada a fonte do catálogo (destino/programa), devolve uma FAIXA educativa —
 * NUNCA um valor exacto. Se não houver faixa no catálogo, `temFaixa=false` e o
 * texto remete para a consulta (não inventa números). Função PURA.
 */
export function responderFaixa(fonte: FaixaFonte | null | undefined, idioma: LeadLanguage = "pt"): FaixaResposta {
  const nota = idioma === "en" ? NOTA_PROPOSTA_EN : NOTA_PROPOSTA_PT;

  if (!fonte) {
    return {
      temFaixa: false,
      texto:
        idioma === "en"
          ? `I don't have a range on hand for that yet. ${nota}`
          : `Ainda não tenho uma faixa à mão para isso. ${nota}`,
    };
  }

  const partes: string[] = [];
  const investimento = formatFaixaInvestimento(fonte, idioma);
  if (investimento) {
    partes.push(
      idioma === "en"
        ? `The investment sits in the ${investimento} range`
        : `O investimento situa-se na faixa de ${investimento}`,
    );
  }
  if (fonte.custo_vida_faixa) {
    const cv = `${fonte.custo_vida_faixa}${fonte.custo_vida_currency ? " " + fonte.custo_vida_currency : ""}`.trim();
    partes.push(
      idioma === "en" ? `and the cost of living around ${cv}` : `e o custo de vida à volta de ${cv}`,
    );
  }

  if (partes.length === 0) {
    return {
      temFaixa: false,
      texto:
        idioma === "en"
          ? `I don't have a published range for that yet. ${nota}`
          : `Ainda não tenho uma faixa publicada para isso. ${nota}`,
    };
  }

  return {
    temFaixa: true,
    texto: `${partes.join(" ")}. ${nota}`,
  };
}

// ── FAQ (12 — esqueleto PT+EN; conteúdo oficial = gate cliente) ───────────────

export interface FaqEntry {
  id: string;
  // Palavras-chave (normalizadas) que activam a FAQ.
  keywords: string[];
  // Resposta oficial validada. `null` = sem fonte oficial → no_answer (escala).
  answer_pt: string | null;
  answer_en: string | null;
  // true quando falta conteúdo oficial do cliente.
  pendente: boolean;
}

// NOTA: as respostas abaixo com `answer_*: null` estão marcadas
// FAQ_PENDENTE_VALIDACAO_CLIENTE — carecem do doc oficial do fluxo (03/07).
// As faixas de preço/custo NÃO vivem aqui: derivam do catálogo via
// responderFaixa() em runtime (regra de faixas).
export const FAQ: FaqEntry[] = [
  {
    id: "faq_destinos",
    keywords: ["destinos", "paises", "onde", "countries", "where", "destinations"],
    answer_pt:
      "Trabalhamos com vários destinos de educação internacional — entre eles África do Sul, Portugal, Reino Unido, Emirados Árabes Unidos, EUA e China. Qual é que lhe interessa mais?",
    answer_en:
      "We work with several international study destinations — including South Africa, Portugal, the United Kingdom, the United Arab Emirates, the USA and China. Which one are you most interested in?",
    pendente: false,
  },
  {
    id: "faq_programas",
    keywords: ["programas", "cursos", "niveis", "programs", "courses", "levels"],
    answer_pt:
      "Temos programas de summer camp, línguas, foundation, licenciatura, mestrado e voluntariado. Está a pensar em que nível?",
    answer_en:
      "We offer summer camp, language, foundation, bachelor's, master's and volunteering programmes. Which level are you considering?",
    pendente: false,
  },
  {
    id: "faq_como_comecar",
    keywords: ["comecar", "processo", "como funciona", "start", "process", "how does it work"],
    answer_pt:
      "O primeiro passo é uma consulta connosco, onde percebemos o seu objectivo e o destino ideal. A partir daí montamos a candidatura. Quer que avancemos para marcar essa consulta?",
    answer_en:
      "The first step is a consultation with us, where we understand your goal and the ideal destination. From there we build the application. Shall we go ahead and schedule that consultation?",
    pendente: false,
  },
  {
    id: "faq_prazos_candidatura",
    // FAQ_PENDENTE_VALIDACAO_CLIENTE — prazos oficiais por destino/intake não estão no repo.
    keywords: ["prazo", "prazos", "quando candidatar", "deadline", "intake", "when apply"],
    answer_pt: null,
    answer_en: null,
    pendente: true,
  },
  {
    id: "faq_documentos",
    // FAQ_PENDENTE_VALIDACAO_CLIENTE — lista oficial de documentos por programa não está no repo.
    keywords: ["documentos", "papeis", "requisitos", "documents", "requirements", "papers"],
    answer_pt: null,
    answer_en: null,
    pendente: true,
  },
  {
    id: "faq_custos_faixa",
    // Respondida por responderFaixa() a partir do catálogo — nunca valor exacto.
    keywords: ["custo", "custos", "preco", "precos", "quanto custa", "valor", "cost", "price", "how much"],
    answer_pt:
      "Trabalhamos sempre com faixas de investimento e de custo de vida, conforme o destino e o programa. Diga-me o destino que tem em mente e dou-lhe a faixa. A cotação exacta vai na proposta, depois da consulta.",
    answer_en:
      "We always work with investment and cost-of-living ranges, depending on the destination and programme. Tell me the destination you have in mind and I'll give you the range. The exact quote goes in the proposal, after the consultation.",
    pendente: false,
  },
  {
    id: "faq_custo_vida",
    keywords: ["custo de vida", "viver", "morar", "cost of living", "living", "accommodation", "alojamento"],
    answer_pt:
      "O custo de vida varia por cidade e é algo que educamos por faixas. Diga-me o destino e partilho a faixa que temos no catálogo.",
    answer_en:
      "The cost of living varies by city and is something we explain in ranges. Tell me the destination and I'll share the range we have in the catalogue.",
    pendente: false,
  },
  {
    id: "faq_bolsas",
    // FAQ_PENDENTE_VALIDACAO_CLIENTE — política oficial de bolsas/financiamento não está no repo.
    keywords: ["bolsa", "bolsas", "financiamento", "scholarship", "funding", "grant"],
    answer_pt: null,
    answer_en: null,
    pendente: true,
  },
  {
    id: "faq_admissao",
    keywords: ["admissao", "entrar", "aceite", "garantia", "admission", "guarantee", "get in"],
    answer_pt:
      "A admissão depende sempre da universidade ou escola — acompanhamos a candidatura de perto para a tornar o mais forte possível, mas não prometemos entrada garantida. Quer perceber os requisitos do destino que tem em mente?",
    answer_en:
      "Admission always depends on the university or school — we support the application closely to make it as strong as possible, but we don't promise guaranteed entry. Would you like to understand the requirements for the destination you have in mind?",
    pendente: false,
  },
  {
    id: "faq_vistos",
    // FAQ_PENDENTE_VALIDACAO_CLIENTE — regras oficiais de visto por país não estão no repo.
    keywords: ["visto", "vistos", "imigracao", "visa", "immigration", "permit"],
    answer_pt: null,
    answer_en: null,
    pendente: true,
  },
  {
    id: "faq_idade",
    // FAQ_PENDENTE_VALIDACAO_CLIENTE — critérios oficiais de idade/elegibilidade por programa não estão no repo.
    keywords: ["idade", "menores", "elegibilidade", "age", "minors", "eligibility"],
    answer_pt: null,
    answer_en: null,
    pendente: true,
  },
  {
    id: "faq_contacto",
    keywords: ["contacto", "falar", "consultor", "telefone", "contact", "talk", "consultant", "phone"],
    answer_pt:
      "Com todo o gosto — posso encaminhá-lo(a) para um consultor da Global Minds ou ajudá-lo(a) a marcar uma consulta. O que prefere?",
    answer_en:
      "Happy to help — I can connect you with a Global Minds consultant or help you book a consultation. Which do you prefer?",
    pendente: false,
  },
];

export interface FaqMatch {
  status: "answered" | "no_answer";
  faq_id?: string;
  answer?: string;
  // motivo de escalação quando no_answer (consumido pela 3.3).
  escalate_reason?: "no_answer";
}

function normalize(text: string): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Procura uma FAQ para a mensagem do lead. Sem match OU FAQ pendente de
 * validação → `no_answer` (nunca responde por conta própria). Função PURA.
 */
export function matchFaq(message: string, idioma: LeadLanguage = "pt"): FaqMatch {
  const norm = normalize(message);
  if (!norm.trim()) return { status: "no_answer", escalate_reason: "no_answer" };

  for (const faq of FAQ) {
    if (faq.keywords.some((kw) => norm.includes(normalize(kw)))) {
      const answer = idioma === "en" ? faq.answer_en : faq.answer_pt;
      // FAQ_PENDENTE_VALIDACAO_CLIENTE ou sem resposta → escala, não inventa.
      if (faq.pendente || !answer) {
        return { status: "no_answer", faq_id: faq.id, escalate_reason: "no_answer" };
      }
      return { status: "answered", faq_id: faq.id, answer };
    }
  }
  return { status: "no_answer", escalate_reason: "no_answer" };
}
