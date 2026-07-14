// ============================================================
// Importação de Excels (story 2.5) — mapeamento estado-Excel → pipeline_fase
// ------------------------------------------------------------
// AC5: estudantes em acompanhamento geram fichas + candidaturas na fase
// correspondente do pipeline (8 fases, §2.1). O mapa estado→fase vive AQUI e é
// documentado por escrito em `docs/importacao-mapeamento-excels.md`.
//
// ✅ MAPA REAL: os rótulos abaixo são os ESTADOS OFICIAIS da Global Minds,
// extraídos da folha "Legenda e Indicadores" do ficheiro
// `PRIORITY - Acompanhamento_processos_Global Minds.xlsx` (dados reais do cliente,
// recebidos). Estado desconhecido NÃO é adivinhado: devolve null e o registo vai
// para revisão (regra da casa sem-fallbacks). Nada de fase inventada às cegas.
// ============================================================

import type { PipelineFase } from '../pipeline-fases'

// Normaliza um rótulo de estado para comparação tolerante (minúsculas, sem
// acentos, espaços colapsados). Não altera o valor guardado — só a chave de busca.
export function normalizarEstado(estado: string): string {
  return estado
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// Mapa estado-GM → fase. Chaves já normalizadas (minúsculas, sem acentos).
// Fonte: legenda oficial do ficheiro de acompanhamento (11 estados) + variantes
// observadas na coluna "Estado do Processo" dos 15 processos reais.
const MAPA_ESTADO_FASE: Record<string, PipelineFase> = {
  // ── Estados da legenda oficial da Global Minds ──────────────────────────
  // "Proposta a Enviar" (cotação/proposta ainda por enviar) → antes da proposta.
  // A GM não tem estado explícito de "consulta agendada" no acompanhamento
  // (a consulta acontece antes de entrar aqui); estes processos já passaram a
  // consulta, por isso "a enviar proposta" fica em consulta_agendada (pré-proposta).
  'proposta a enviar': 'consulta_agendada',
  // "Aguarda Contrato" (contrato por assinar/receber) → proposta já enviada,
  // a caminho da formalização.
  'aguarda contrato': 'proposta_enviada',
  // "Pagamento Pendente" → formalização/pagamento.
  'pagamento pendente': 'formalizacao_pagamento',
  // "Em Curso" (processo activo e a decorrer) → em_curso.
  'em curso': 'em_curso',
  // "Concluído" (finalizado com sucesso) → concluido.
  concluido: 'concluido',
  // "Cancelado" → concluido (terminal; a UI distingue por notas/tag).
  cancelado: 'concluido',
  // ── Estados de acompanhamento operacional (não são fases; um processo activo
  //    que aguarda algo continua "em curso" — a acção pendente vai para notas) ──
  'aguarda documentos': 'em_curso',
  'aguarda decisao': 'em_curso',
  'aguarda decisao familia': 'em_curso',
  'seguimento necessario': 'em_curso',
  'sem resposta': 'em_curso',
  'verificar situacao': 'em_curso',
  // ── Variantes genéricas toleradas (segurança) ───────────────────────────
  lead: 'lead',
  novo: 'lead',
  qualificado: 'qualificado',
  'proposta enviada': 'proposta_enviada',
  'candidatura submetida': 'candidatura_submetida',
}

// Fases que representam um processo ACTIVO (protegido da rotina de retenção de
// 2 anos — `processo_em_curso=true`). AC5.
const FASES_PROCESSO_ACTIVO: ReadonlySet<PipelineFase> = new Set<PipelineFase>([
  'formalizacao_pagamento',
  'candidatura_submetida',
  'em_curso',
])

export interface ResultadoFase {
  fase: PipelineFase | null // null ⇒ estado desconhecido, vai para revisão
  processo_em_curso: boolean
}

// Deriva a fase e o flag de processo activo a partir do estado-Excel bruto.
// estado null/vazio ⇒ fase null (revisão). Estado desconhecido ⇒ fase null (revisão).
export function mapearEstadoParaFase(estado: string | null): ResultadoFase {
  if (!estado || !estado.trim()) return { fase: null, processo_em_curso: false }
  const chave = normalizarEstado(estado)
  const fase = MAPA_ESTADO_FASE[chave] ?? null
  const processo_em_curso = fase !== null && FASES_PROCESSO_ACTIVO.has(fase)
  return { fase, processo_em_curso }
}

// Exposto para os testes e para a documentação gerada.
export const _MAPA_ESTADO_FASE = MAPA_ESTADO_FASE
export const _FASES_PROCESSO_ACTIVO = FASES_PROCESSO_ACTIVO
