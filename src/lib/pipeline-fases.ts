// ============================================================
// Pipeline de candidaturas — fonte única das 8 fases (story 2.3)
// ------------------------------------------------------------
// As 8 fases reais do enum `pipeline_fase` (Arquitectura §2.1), na ordem
// canónica lead→…→concluido. Rótulos pt-AO num ÚNICO mapa — sem strings soltas
// espalhadas pela UI. O trigger da migração 017 (`ordem_pipeline_fase`) usa esta
// mesma ordem no lado da base de dados.
// ============================================================

export type PipelineFase =
  | 'lead'
  | 'qualificado'
  | 'consulta_agendada'
  | 'proposta_enviada'
  | 'formalizacao_pagamento'
  | 'candidatura_submetida'
  | 'em_curso'
  | 'concluido'

// Ordem canónica das colunas do kanban (idêntica à do enum §2.1).
export const PIPELINE_FASES: readonly PipelineFase[] = [
  'lead',
  'qualificado',
  'consulta_agendada',
  'proposta_enviada',
  'formalizacao_pagamento',
  'candidatura_submetida',
  'em_curso',
  'concluido',
] as const

// Rótulos pt-AO legíveis — o único sítio onde vivem os nomes das fases.
export const FASE_LABEL: Record<PipelineFase, string> = {
  lead: 'Lead',
  qualificado: 'Qualificado',
  consulta_agendada: 'Consulta agendada',
  proposta_enviada: 'Proposta enviada',
  formalizacao_pagamento: 'Formalização & Pagamento',
  candidatura_submetida: 'Candidatura submetida',
  em_curso: 'Em curso',
  concluido: 'Concluído',
}

// Posição ordinal (1..8) — espelho JS de `ordem_pipeline_fase` (migração 017).
export function ordemFase(fase: PipelineFase): number {
  const i = PIPELINE_FASES.indexOf(fase)
  return i < 0 ? 0 : i + 1
}
