// ============================================================================
// Inteligência de lead (BANT + score) — Story 3.4 (AC1, AC2, AC6).
// ----------------------------------------------------------------------------
// Este ficheiro tem DUAS metades:
//
//   1. LÓGICA PURA (topo) — sem Deno/URL/supabase-js, testável em node:test:
//        - parseExtraction()      : lê o JSON do Haiku e normaliza os campos BANT/domínio
//        - computeScore()         : régua de sales_score/score_confidence/fit_score
//        - shouldAlertHotLead()   : regra do alerta (≥70 AND ≠low)
//        - buildLeadUpdate()      : monta o objecto UPDATE de `leads` SEM sobrescrever
//                                   com vazio (degradação graciosa, AC6)
//        - buildFichaFromConversation() : monta a ficha_estudante SEM inventar (AC4)
//
//   2. WRAPPER IMPURO (fundo, atrás de dynamic import de supabase-js) —
//        - qualifyLead()          : chama Haiku, calcula, faz UPDATE `leads`,
//                                   dispara o alerta de lead quente. Degradação
//                                   graciosa: falha → mantém perfil anterior.
//
// A régua de score é DEFENSÁVEL e documentada abaixo (RÉGUA DE SCORE). A
// temperatura NÃO é calculada aqui — deriva do trigger `calcular_temperatura_lead`
// (migração 010) quando gravamos sales_score/score_confidence.
// ============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface BantExtraction {
  bant_budget: string | null; // faixa declarada (nunca valor exacto pedido por nós)
  bant_authority: string | null; // encarregado | estudante
  bant_need: string | null;
  bant_timeline: string | null;
  destino: string | null;
  nivel: string | null;
  orcamento: string | null; // faixa declarada
  nome: string | null;
  encarregado_nome: string | null;
  encarregado_contacto: string | null;
  encarregado_relacao: string | null;
  percurso_academico: string | null;
}

export interface ScoreResult {
  sales_score: number; // 0–100
  score_confidence: "low" | "medium" | "high";
  fit_score: number; // 0–100
}

// ── RÉGUA DE SCORE (documentada — AC2) ───────────────────────────────────────
//
// Objectivo: pontuar a PRONTIDÃO comercial do lead (sales_score) e a CONFIANÇA
// nessa pontuação (score_confidence), mais o ENCAIXE ao catálogo (fit_score).
// Escala 0–100 (a arquitectura normalizou a escala 0–10 do brief para 0–100).
//
// sales_score = soma ponderada dos 4 sinais BANT presentes + bónus de fit:
//   • bant_need      → 25 pts  (o sinal mais forte: sabe o que quer)
//   • bant_timeline  → 20 pts  (prazo declarado = intenção real)
//   • bant_authority → 20 pts  (sabemos quem decide)
//   • bant_budget    → 20 pts  (faixa de orçamento partilhada)
//   • fit (destino+nível conhecidos e no catálogo GM) → até 15 pts
//   Total teórico: 100. Um lead com BANT completo + fit alto → ~85–100 (quente).
//   Um lead que só disse "olá, quero estudar fora" (need vago) → ~25 (frio/morno).
//
// score_confidence = quantidade E qualidade dos sinais (NÃO o valor do score):
//   • ≥4 campos BANT preenchidos                        → high
//   • 2–3 campos                                        → medium
//   • 0–1 campos                                        → low
//   A regra conservadora (trigger 010) impede 'quente' com confidence 'low'.
//   Isto protege contra um score inflado por 1 só sinal muito forte.
//
// fit_score = encaixe do pedido ao catálogo GM (destino + nível reconhecidos):
//   • destino conhecido  → +50
//   • nível reconhecido (summer/linguas/foundation/licenciatura/mestrado/
//     voluntariado) → +50
//   Sem destino nem nível → 0 (não sabemos se a GM serve este lead).
//
// Estas constantes são a régua vinculativa. Alterá-las muda o comportamento do
// alerta de lead quente — mudar com intenção e testes.

const PESO_NEED = 25;
const PESO_TIMELINE = 20;
const PESO_AUTHORITY = 20;
const PESO_BUDGET = 20;
const PESO_FIT_MAX = 15;

const NIVEIS_CATALOGO = [
  "summer",
  "linguas",
  "línguas",
  "foundation",
  "licenciatura",
  "mestrado",
  "voluntariado",
];

const ALERT_SCORE_THRESHOLD = 70;

// Um valor "presente" é uma string não vazia depois de trim.
function present(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Normaliza a saída do Haiku (JSON livre) num BantExtraction estável. Campos
 * ausentes/ruído → null (nunca string vazia — para a degradação graciosa a
 * jusante distinguir "não sei" de "sei que é vazio"). Função PURA.
 */
export function parseExtraction(raw: unknown): BantExtraction {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (k: string): string | null => {
    const v = o[k];
    if (typeof v !== "string") return null;
    const t = v.trim();
    // O modelo às vezes devolve "n/a", "desconhecido", "-", "null" — tratamos como ausência.
    if (!t || /^(n\/?a|desconhecido|indeterminado|null|none|-|—)$/i.test(t)) return null;
    return t.slice(0, 500);
  };
  return {
    bant_budget: s("bant_budget"),
    bant_authority: s("bant_authority"),
    bant_need: s("bant_need"),
    bant_timeline: s("bant_timeline"),
    destino: s("destino"),
    nivel: s("nivel"),
    orcamento: s("orcamento") ?? s("bant_budget"), // orcamento espelha a faixa declarada
    nome: s("nome"),
    encarregado_nome: s("encarregado_nome"),
    encarregado_contacto: s("encarregado_contacto"),
    encarregado_relacao: s("encarregado_relacao"),
    percurso_academico: s("percurso_academico"),
  };
}

/** Encaixe ao catálogo (0–100). PURA. */
export function computeFitScore(ext: BantExtraction): number {
  let fit = 0;
  if (present(ext.destino)) fit += 50;
  if (present(ext.nivel) && NIVEIS_CATALOGO.some((n) => ext.nivel!.toLowerCase().includes(n))) {
    fit += 50;
  } else if (present(ext.nivel)) {
    // nível declarado mas fora do catálogo conhecido → meio-crédito
    fit += 20;
  }
  return Math.min(100, fit);
}

/**
 * Régua de score (ver RÉGUA DE SCORE acima). Recebe o BANT extraído e devolve
 * sales_score/score_confidence/fit_score. Função PURA e determinística.
 */
export function computeScore(ext: BantExtraction): ScoreResult {
  const fit = computeFitScore(ext);

  let score = 0;
  if (present(ext.bant_need)) score += PESO_NEED;
  if (present(ext.bant_timeline)) score += PESO_TIMELINE;
  if (present(ext.bant_authority)) score += PESO_AUTHORITY;
  if (present(ext.bant_budget)) score += PESO_BUDGET;
  // Bónus de fit proporcional (até PESO_FIT_MAX).
  score += Math.round((fit / 100) * PESO_FIT_MAX);
  score = Math.max(0, Math.min(100, score));

  // Confiança = número de campos BANT preenchidos (qualidade dos sinais).
  const bantFilled = [ext.bant_need, ext.bant_timeline, ext.bant_authority, ext.bant_budget].filter(
    present,
  ).length;
  let confidence: ScoreResult["score_confidence"];
  if (bantFilled >= 4) confidence = "high";
  else if (bantFilled >= 2) confidence = "medium";
  else confidence = "low";

  return { sales_score: score, score_confidence: confidence, fit_score: fit };
}

/**
 * Regra do alerta de lead quente (AC3): sales_score ≥ 70 AND score_confidence ≠ 'low'.
 * Distinta da temperatura (que o trigger deriva) e distinta da escalação D5 (3.3):
 * isto é um alerta POSITIVO — a conversa continua com o agente, só se notifica o
 * Rinaldo e se move a fase. Função PURA.
 */
export function shouldAlertHotLead(score: ScoreResult): boolean {
  return score.sales_score >= ALERT_SCORE_THRESHOLD && score.score_confidence !== "low";
}

/**
 * Monta o objecto de UPDATE de `leads` SEM sobrescrever com vazio (AC6). Só
 * inclui os campos BANT/domínio que foram REALMENTE extraídos; os ausentes ficam
 * de fora do UPDATE (o valor anterior do lead mantém-se). O score é SEMPRE
 * incluído (é recalculado a cada passagem). Função PURA.
 */
export function buildLeadUpdate(ext: BantExtraction, score: ScoreResult): Record<string, unknown> {
  const upd: Record<string, unknown> = {
    sales_score: score.sales_score,
    score_confidence: score.score_confidence,
    fit_score: score.fit_score,
    // temperature NÃO vai aqui — deriva do trigger calcular_temperatura_lead.
  };
  const maybe = (col: string, val: string | null) => {
    if (present(val)) upd[col] = val;
  };
  maybe("bant_budget", ext.bant_budget);
  maybe("bant_authority", ext.bant_authority);
  maybe("bant_need", ext.bant_need);
  maybe("bant_timeline", ext.bant_timeline);
  maybe("destino", ext.destino);
  maybe("nivel", ext.nivel);
  maybe("orcamento", ext.orcamento);
  return upd;
}

/**
 * Monta a ficha_estudante a partir do que se recolheu (AC4). SEM inventar: cada
 * campo sem dado fica ausente do objecto (a coluna fica NULL na BD / mantém o
 * valor anterior no upsert). `lead_id` é sempre incluído (chave 1:1). PURA.
 *
 * `overrides` permite ao agente passar campos que a tool recebeu directamente
 * (ex.: nome escrito pelo lead na tool criar_ficha_estudante), com precedência.
 */
export function buildFichaFromConversation(
  leadId: string,
  ext: Partial<BantExtraction>,
  overrides: Partial<Record<string, string | null>> = {},
): Record<string, unknown> {
  const ficha: Record<string, unknown> = { lead_id: leadId };
  const pick = (col: string, ...vals: Array<string | null | undefined>) => {
    for (const v of vals) {
      if (present(v as string)) {
        ficha[col] = (v as string).trim();
        return;
      }
    }
  };
  pick("nome_completo", overrides.nome, ext.nome);
  pick("encarregado_nome", overrides.encarregado_nome, ext.encarregado_nome);
  pick("encarregado_contacto", overrides.encarregado_contacto, ext.encarregado_contacto);
  pick("encarregado_relacao", overrides.encarregado_relacao, ext.encarregado_relacao);
  pick("percurso_academico", overrides.percurso_academico, ext.percurso_academico);
  pick("destino_pretendido", overrides.destino, ext.destino);
  pick("orcamento_faixa", overrides.orcamento, ext.orcamento, ext.bant_budget);
  return ficha;
}

/**
 * Resposta de CONTINUIDADE (AC6). O que uma tool devolve ao loop NUNCA é um erro
 * técnico ao lead — é sempre um JSON com `continue_hint` que instrui o agente a
 * seguir a conversa naturalmente. Mesmo em falha (`ok:false`), há sempre hint.
 * Função PURA (partilhada por tools-exec e testável).
 */
export function buildContinuity(
  ok: boolean,
  continueHint: string,
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({ ok, continue_hint: continueHint, ...extra });
}

/**
 * Link do formulário público de ficha (story 2.4): `<site_url>/ficha?lead=<id>`.
 * Ausência de siteUrl → link relativo. Sem barra final duplicada. Função PURA.
 */
export function buildFichaFormLink(siteUrl: string | null | undefined, leadId: string): string {
  const base = String(siteUrl ?? "").replace(/\/+$/, "");
  const prefix = base ? (base.startsWith("http") ? base : `https://${base}`) : "";
  return `${prefix}/ficha?lead=${encodeURIComponent(leadId)}`;
}

// ── System prompt de extracção (Haiku 4.5) ───────────────────────────────────
// Instruímos o modelo a devolver SÓ o que está na conversa (nunca inventa) e a
// respeitar a regra de faixas (orçamento = faixa declarada, nunca valor exacto).

export const EXTRACTION_SYSTEM = `És um analista da Global Minds (educação internacional, Luanda). Lês uma conversa de WhatsApp entre um lead e a assistente, e extrais APENAS o que o LEAD declarou. NUNCA inventes. Se um dado não aparece na conversa, devolve null nesse campo.

Regra de orçamento: só regista uma FAIXA declarada pelo próprio lead (ex.: "até 5000 euros", "mais ou menos 3 a 4 mil"). NUNCA registes um valor que a assistente tenha cotado.

Responde SÓ com JSON válido nesta estrutura exacta (sem texto à volta):
{
  "bant_need": "o objectivo/necessidade do lead, ou null",
  "bant_timeline": "quando pretende iniciar/prazo, ou null",
  "bant_authority": "encarregado ou estudante (quem decide), ou null",
  "bant_budget": "faixa de orçamento declarada pelo lead, ou null",
  "orcamento": "mesma faixa (espelho de bant_budget), ou null",
  "destino": "país/destino pretendido, ou null",
  "nivel": "summer, linguas, foundation, licenciatura, mestrado ou voluntariado, ou null",
  "nome": "nome do estudante se declarado, ou null",
  "encarregado_nome": "nome do encarregado se declarado, ou null",
  "encarregado_contacto": "contacto do encarregado se declarado, ou null",
  "encarregado_relacao": "relação (mãe, pai, tutor...), ou null",
  "percurso_academico": "percurso académico se mencionado, ou null"
}`;

/**
 * Constrói o transcript da conversa para o extractor. PURA. Limita o tamanho.
 */
export function buildConversationText(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  maxMessages = 40,
): string {
  const tail = (history ?? []).slice(-maxMessages);
  return tail
    .map((m) => `${m.role === "user" ? "Lead" : "Assistente"}: ${String(m.content || "").slice(0, 400)}`)
    .join("\n");
}

// ============================================================================
// WRAPPER IMPURO — qualifyLead(): Haiku → score → UPDATE leads → alerta quente.
// Importa só tipos de supabase-js (o cliente é injectado). NÃO é carregado em
// node:test (a lógica testável é a PURA acima). Degradação graciosa em toda a
// parte (AC6): qualquer falha mantém o perfil anterior e nunca propaga erro.
// ============================================================================

export interface QualifyDeps {
  supabase: SupabaseClient;
  apiKey: string;
  // Chamada Haiku injectável (para não acoplar ao llm-client em runtime + testes).
  callHaiku: (system: string, userContent: string, apiKey: string) => Promise<string>;
  // Alerta de lead quente (injectado — usa performHandoff + mudança de fase).
  onHotLead?: (ctx: HotLeadContext) => Promise<void>;
  logInfo?: (step: string, ctx?: Record<string, unknown>) => void;
  logError?: (step: string, ctx?: Record<string, unknown>) => void;
}

export interface HotLeadContext {
  lead_id: string;
  lead_nome: string | null;
  score: ScoreResult;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface QualifyResult {
  ok: boolean;
  score?: ScoreResult;
  temperature?: string; // relido da BD após o trigger derivar
  confidence?: ScoreResult["score_confidence"];
  extracted?: BantExtraction;
  degraded?: boolean; // true se manteve o perfil anterior por falha
}

async function parseHaikuJson(text: string): Promise<unknown> {
  const cleaned = String(text || "{}")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Qualifica um lead: extrai BANT via Haiku, calcula o score, actualiza `leads`
 * (sem sobrescrever com vazio) e dispara o alerta de lead quente se aplicável.
 * NUNCA lança — em falha devolve { ok:false, degraded:true } e o perfil anterior
 * do lead fica intacto.
 */
export async function qualifyLead(
  deps: QualifyDeps,
  leadId: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<QualifyResult> {
  const log = deps.logInfo ?? (() => {});
  const logErr = deps.logError ?? (() => {});

  // 1. Extracção via Haiku (barato). Falha → mantém perfil anterior (AC6).
  let ext: BantExtraction;
  try {
    const convo = buildConversationText(history);
    const raw = await deps.callHaiku(EXTRACTION_SYSTEM, convo || "Lead: (sem mensagens)", deps.apiKey);
    ext = parseExtraction(await parseHaikuJson(raw));
  } catch (e) {
    logErr("extraction_failed", { leadId, err: String(e) });
    return { ok: false, degraded: true };
  }

  const score = computeScore(ext);

  // 2. UPDATE leads — só campos extraídos + score (nunca vazio). O trigger
  //    calcular_temperatura_lead deriva `temperature` deste UPDATE.
  try {
    const upd = buildLeadUpdate(ext, score);
    const { error } = await deps.supabase.from("leads").update(upd).eq("id", leadId);
    if (error) {
      logErr("leads_update_failed", { leadId, err: error.message });
      return { ok: false, degraded: true, extracted: ext, score };
    }
  } catch (e) {
    logErr("leads_update_error", { leadId, err: String(e) });
    return { ok: false, degraded: true, extracted: ext, score };
  }

  // 3. Relê a temperatura derivada pelo trigger (informativo — não crítico).
  let temperature: string | undefined;
  let leadNome: string | null = null;
  try {
    const { data } = await deps.supabase
      .from("leads")
      .select("temperature,nome")
      .eq("id", leadId)
      .maybeSingle();
    temperature = (data as { temperature?: string })?.temperature;
    leadNome = (data as { nome?: string | null })?.nome ?? null;
  } catch {
    // não crítico
  }

  // 4. Alerta de lead quente (≥70 AND ≠low). Isolado — falha não afecta o resto.
  if (shouldAlertHotLead(score) && deps.onHotLead) {
    try {
      await deps.onHotLead({ lead_id: leadId, lead_nome: leadNome, score, history });
    } catch (e) {
      logErr("hot_lead_alert_failed", { leadId, err: String(e) });
    }
  }

  log("qualified", {
    leadId,
    score: score.sales_score,
    confidence: score.score_confidence,
    temperature,
  });

  return {
    ok: true,
    score,
    confidence: score.score_confidence,
    temperature,
    extracted: ext,
  };
}
