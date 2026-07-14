// ============================================================
// Importação de Excels do cliente (story 2.5) — tipos partilhados
// ------------------------------------------------------------
// A story 2.5 importa 3 ficheiros do cliente (Ficha de Estudante, planilha de
// acompanhamento e planilha GEA) para o CRM. Este módulo define os tipos que
// atravessam as três camadas: parsing → normalização/dedup → upsert.
//
// ⚠️ FRONTEIRA construído-vs-gate: os 3 Excels REAIS do cliente NÃO estão em
// disco. Todo o pipeline aqui é construído e testado com FIXTURES SINTÉTICAS
// (ver `tests/lib/importacao.test.mjs`). O mapeamento coluna→campo definitivo e
// a importação dos dados reais ficam como GATE HUMANO — ver
// `docs/importacao-mapeamento-excels.md` (template a preencher).
//
// Regra da casa (sem-fallbacks na extracção): campos sem correspondência ficam
// NULL ou vão para `notas` — NUNCA se inventam valores por omissão.
// ============================================================

import type { PipelineFase } from '../pipeline-fases'

// Os 3 ficheiros esperados. A `origem_ficheiro` viaja no relatório para dar
// rastreabilidade por planilha (AC4).
export type FicheiroImportacao = 'ficha_estudante' | 'acompanhamento' | 'gea'

// Uma linha bruta, já com header→chave resolvido. Valores sempre string|null
// (parsing preserva "como está", sem coerção silenciosa — AC1).
export type LinhaBruta = Record<string, string | null>

// Registo normalizado, pronto para dedup/upsert. Espelha o subconjunto de
// `leads` + sinais de ficha/candidatura que a importação escreve.
export interface RegistoImportado {
  origem_ficheiro: FicheiroImportacao
  linha: number // 1-based, para rastreio de erros/revisão
  nome: string | null
  telefone_normalizado: string | null // 244XXXXXXXXX ou null se sem telefone
  telefone_bruto: string | null
  email: string | null
  // Sinais de ficha/candidatura (só usados para ficheiros de acompanhamento)
  em_acompanhamento: boolean
  processo_em_curso: boolean
  pipeline_fase: PipelineFase | null // derivada do estado-Excel (mapeamento documentado)
  estado_excel: string | null // valor original do estado, preservado para auditoria
  // Campos de ficha (preservados como estão; NULL quando ausentes)
  destino_pretendido: string | null
  orcamento_faixa: string | null
  percurso_academico: string | null
  encarregado_nome: string | null
  encarregado_contacto: string | null
  // Tudo o resto que não tem coluna própria vai para `notas` (sem inventar).
  notas: string | null
  // Marcações de qualidade
  motivos_revisao: string[] // não-vazio ⇒ recebe tag 'importacao_rever'
}

// Chave de deduplicação: telefone normalizado; fallback email (minúsculas).
// null quando o registo não tem contacto válido (vai para revisão, não descartado).
export type ChaveDedup = string | null

// Registo após fusão de duplicados: 1 por contacto, com os vários ficheiros
// fundidos e a lista de conflitos preservada para revisão (AC3).
export interface RegistoFundido extends RegistoImportado {
  ficheiros_origem: FicheiroImportacao[] // todos os ficheiros que contribuíram
  chave: ChaveDedup
}

// Sumário do relatório persistido em `notificacoes` (AC4 / correcção C5).
export interface RelatorioImportacao {
  gerado_em: string // ISO
  por_ficheiro: Record<FicheiroImportacao, { lidos: number }>
  total_lidos: number
  importados: number // contactos finais (leads distintos criados/actualizados)
  duplicados_unificados: number // linhas fundidas em contactos já vistos
  marcados_revisao: number // contactos finais com tag 'importacao_rever'
  fichas_criadas: number
  candidaturas_criadas: number
}
