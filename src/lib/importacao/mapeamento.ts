// ============================================================
// Importação de Excels (story 2.5) — mapeamento estado-Excel → pipeline_fase
// ------------------------------------------------------------
// AC5: estudantes em acompanhamento geram fichas + candidaturas na fase
// correspondente do pipeline (8 fases, §2.1). O mapa estado→fase vive AQUI e é
// documentado por escrito em `docs/importacao-mapeamento-excels.md`.
//
// ⚠️ PLACEHOLDER: os valores de estado abaixo são o FORMATO ESPERADO com base no
// domínio (as 8 fases). Os rótulos EXACTOS que o cliente usa nas planilhas só se
// conhecem quando os Excels reais chegarem — nessa altura preenche-se o mapa
// definitivo. Estado desconhecido NÃO é adivinhado: devolve null e o registo vai
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

// Mapa placeholder estado-Excel → fase. Chaves já normalizadas.
// A PREENCHER/CONFIRMAR com os rótulos reais das planilhas do cliente.
const MAPA_ESTADO_FASE: Record<string, PipelineFase> = {
  // lead / contacto inicial
  lead: 'lead',
  novo: 'lead',
  contacto: 'lead',
  // qualificado
  qualificado: 'qualificado',
  interessado: 'qualificado',
  // consulta
  'consulta agendada': 'consulta_agendada',
  reuniao: 'consulta_agendada',
  // proposta
  'proposta enviada': 'proposta_enviada',
  proposta: 'proposta_enviada',
  // pagamento / formalização
  'formalizacao': 'formalizacao_pagamento',
  pagamento: 'formalizacao_pagamento',
  matriculado: 'formalizacao_pagamento',
  // candidatura submetida
  'candidatura submetida': 'candidatura_submetida',
  submetido: 'candidatura_submetida',
  // em curso (processo activo)
  'em curso': 'em_curso',
  ativo: 'em_curso',
  activo: 'em_curso',
  acompanhamento: 'em_curso',
  // concluído
  concluido: 'concluido',
  finalizado: 'concluido',
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
