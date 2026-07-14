// ============================================================
// Importação de Excels (story 2.5) — pipeline puro (parsing → normalização → dedup)
// ------------------------------------------------------------
// Núcleo testável e SEM dependência de base de dados. A rota
// `src/app/api/importacao/route.ts` chama estas funções e só depois faz o upsert
// idempotente + persiste o relatório. Manter esta separação torna todo o
// comportamento de dedup/fusão/relatório verificável por node:test com fixtures.
//
// FORMATO SUPORTADO: CSV (via papaparse, já instalado). Os ficheiros do cliente
// são .xlsx — o suporte .xlsx directo exige a lib `xlsx` (NÃO instalada) ou a
// conversão prévia .xlsx→CSV. Enquanto os Excels reais não chegam, a via
// suportada e testada é CSV. Ver `docs/importacao-mapeamento-excels.md`.
//
// Regra da casa (sem-fallbacks): valores ausentes ficam null; nada é inventado.
// ============================================================

import Papa from 'papaparse'
import { normalizeAngolaPhone } from '../normalize-phone'
import { mapearEstadoParaFase } from './mapeamento'
import type {
  FicheiroImportacao,
  LinhaBruta,
  RegistoImportado,
  RegistoFundido,
  ChaveDedup,
  RelatorioImportacao,
} from './tipos'

// ── Parsing de CSV → linhas brutas ───────────────────────────────────────────
// Header obrigatório (papaparse header:true). Valores preservados como string;
// vazios → null. Não há coerção de tipos nem correcção silenciosa (AC1).
export function parseCsvBruto(conteudo: string): { linhas: LinhaBruta[]; erros: string[] } {
  const res = Papa.parse<Record<string, string>>(conteudo, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  const erros = (res.errors || []).map((e) => `Linha ${e.row ?? '?'}: ${e.message}`)
  const linhas: LinhaBruta[] = (res.data || []).map((row) => {
    const out: LinhaBruta = {}
    for (const [k, v] of Object.entries(row)) {
      const t = typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
      out[k] = t === '' ? null : t
    }
    return out
  })
  return { linhas, erros }
}

// ── Resolução tolerante de colunas ───────────────────────────────────────────
// Os cabeçalhos reais das planilhas só se conhecem quando os Excels chegarem.
// Aqui aceitamos um conjunto de aliases plausíveis por campo (placeholder,
// documentado em docs/importacao-mapeamento-excels.md). Devolve null se nenhum
// alias existir na linha — NÃO inventa.
function valorPorAliases(linha: LinhaBruta, aliases: string[]): string | null {
  const chavesNorm = new Map<string, string>()
  for (const k of Object.keys(linha)) chavesNorm.set(k.toLowerCase().trim(), k)
  for (const a of aliases) {
    const real = chavesNorm.get(a.toLowerCase().trim())
    if (real && linha[real] != null) return linha[real]
  }
  return null
}

// Aliases placeholder por campo (a confirmar com os ficheiros reais).
const ALIASES = {
  nome: ['nome', 'nome completo', 'nome_completo', 'estudante', 'aluno', 'name'],
  telefone: ['telefone', 'telemovel', 'contacto', 'contacto telefonico', 'phone', 'whatsapp', 'nr'],
  email: ['email', 'e-mail', 'correio', 'mail'],
  estado: ['estado', 'fase', 'status', 'situacao', 'etapa', 'estagio'],
  destino: ['destino', 'destino pretendido', 'pais', 'país'],
  orcamento: ['orcamento', 'orçamento', 'orcamento_faixa', 'budget', 'faixa'],
  percurso: ['percurso', 'percurso academico', 'formacao', 'habilitacoes'],
  encarregado_nome: ['encarregado', 'encarregado nome', 'responsavel', 'pai/mae'],
  encarregado_contacto: ['encarregado contacto', 'contacto encarregado', 'tel encarregado'],
} as const

// Colunas já consumidas por campos próprios — o resto vai para `notas`.
function colunasConsumidas(): Set<string> {
  const s = new Set<string>()
  for (const arr of Object.values(ALIASES)) for (const a of arr) s.add(a.toLowerCase().trim())
  return s
}

// ── Normalização de uma linha bruta → RegistoImportado ───────────────────────
// `emAcompanhamento` distingue ficheiros que geram ficha/candidatura (planilha de
// acompanhamento e GEA) da simples Ficha de Estudante de contacto.
export function normalizarLinha(
  linha: LinhaBruta,
  origem_ficheiro: FicheiroImportacao,
  numeroLinha: number,
  emAcompanhamento: boolean
): RegistoImportado {
  const nome = valorPorAliases(linha, [...ALIASES.nome])
  const telefone_bruto = valorPorAliases(linha, [...ALIASES.telefone])
  const emailRaw = valorPorAliases(linha, [...ALIASES.email])
  const email = emailRaw ? emailRaw.toLowerCase() : null
  const estado_excel = valorPorAliases(linha, [...ALIASES.estado])

  const telefone_normalizado = telefoneValido(telefone_bruto)
    ? normalizeAngolaPhone(telefone_bruto as string)
    : null

  const { fase, processo_em_curso } = emAcompanhamento
    ? mapearEstadoParaFase(estado_excel)
    : { fase: null, processo_em_curso: false }

  // Notas = colunas sem campo próprio, preservadas "como estão".
  const consumidas = colunasConsumidas()
  const extras: string[] = []
  for (const [k, v] of Object.entries(linha)) {
    if (v == null) continue
    if (consumidas.has(k.toLowerCase().trim())) continue
    extras.push(`${k}: ${v}`)
  }
  const notas = extras.length ? extras.join(' | ') : null

  const motivos_revisao: string[] = []
  if (!telefone_normalizado && !email) {
    motivos_revisao.push('sem contacto válido (telefone/email)')
  }
  if (emAcompanhamento && estado_excel && fase === null) {
    motivos_revisao.push(`estado desconhecido: "${estado_excel}"`)
  }

  return {
    origem_ficheiro,
    linha: numeroLinha,
    nome,
    telefone_normalizado,
    telefone_bruto,
    email,
    em_acompanhamento: emAcompanhamento,
    processo_em_curso,
    pipeline_fase: fase,
    estado_excel,
    destino_pretendido: valorPorAliases(linha, [...ALIASES.destino]),
    orcamento_faixa: valorPorAliases(linha, [...ALIASES.orcamento]),
    percurso_academico: valorPorAliases(linha, [...ALIASES.percurso]),
    encarregado_nome: valorPorAliases(linha, [...ALIASES.encarregado_nome]),
    encarregado_contacto: valorPorAliases(linha, [...ALIASES.encarregado_contacto]),
    notas,
    motivos_revisao,
  }
}

// Um telefone é "válido para chave" se, depois de normalizado, tiver a forma
// canónica 244 + 9 dígitos. Números curtos/parciais NÃO servem de chave (iriam
// colidir entre si) — o registo cai em revisão via fallback email/sem-contacto.
function telefoneValido(bruto: string | null): boolean {
  if (!bruto) return false
  const norm = normalizeAngolaPhone(bruto)
  return /^244\d{9}$/.test(norm)
}

// ── Chave de deduplicação ────────────────────────────────────────────────────
// telefone normalizado (canónico) → fallback email (minúsculas) → null.
export function chaveDedup(r: RegistoImportado): ChaveDedup {
  if (r.telefone_normalizado && /^244\d{9}$/.test(r.telefone_normalizado)) {
    return `tel:${r.telefone_normalizado}`
  }
  if (r.email) return `email:${r.email}`
  return null
}

// ── Fusão de duplicados ──────────────────────────────────────────────────────
// 1 RegistoFundido por chave. Registos sem chave (null) NÃO são descartados:
// cada um vira o seu próprio contacto marcado para revisão (AC2). A fusão junta
// campos preferindo o primeiro valor não-nulo; divergências entre valores
// não-nulos são CONFLITOS → revisão (AC3), nunca resolvidas às cegas.
export function fundirRegistos(registos: RegistoImportado[]): RegistoFundido[] {
  const porChave = new Map<string, RegistoFundido>()
  const semChave: RegistoFundido[] = []

  for (const r of registos) {
    const chave = chaveDedup(r)
    if (chave == null) {
      semChave.push({ ...r, ficheiros_origem: [r.origem_ficheiro], chave: null })
      continue
    }
    const existente = porChave.get(chave)
    if (!existente) {
      porChave.set(chave, {
        ...r,
        ficheiros_origem: [r.origem_ficheiro],
        chave,
        motivos_revisao: [...r.motivos_revisao],
      })
      continue
    }
    // Fundir r em existente.
    // O NOME é o campo mais propenso a variação legítima (abreviaturas, ordem):
    // preferimos o primeiro não-vazio e guardamos a variante em notas, SEM marcar
    // revisão. Só conflitos em campos identificadores (email/telefone/fase) exigem
    // olho humano — evita ruído de revisão por "Ana Silva" vs "Ana S.".
    if (existente.nome == null && r.nome != null) {
      existente.nome = r.nome
    } else if (r.nome != null && existente.nome !== r.nome) {
      const variante = `variante de nome: "${r.nome}"`
      existente.notas = existente.notas ? `${existente.notas} | ${variante}` : variante
    }
    fundirCampo(existente, r, 'email')
    fundirCampo(existente, r, 'telefone_normalizado')
    fundirCampo(existente, r, 'destino_pretendido')
    fundirCampo(existente, r, 'orcamento_faixa')
    fundirCampo(existente, r, 'percurso_academico')
    fundirCampo(existente, r, 'encarregado_nome')
    fundirCampo(existente, r, 'encarregado_contacto')
    fundirCampo(existente, r, 'estado_excel')
    // Sinais de acompanhamento: OR lógico — se qualquer ficheiro o marca activo.
    existente.em_acompanhamento = existente.em_acompanhamento || r.em_acompanhamento
    existente.processo_em_curso = existente.processo_em_curso || r.processo_em_curso
    if (existente.pipeline_fase == null && r.pipeline_fase != null) {
      existente.pipeline_fase = r.pipeline_fase
    } else if (r.pipeline_fase != null && existente.pipeline_fase !== r.pipeline_fase) {
      registarConflito(existente, `fase divergente (${existente.pipeline_fase} vs ${r.pipeline_fase})`)
    }
    // Notas concatenadas.
    if (r.notas) existente.notas = existente.notas ? `${existente.notas} | ${r.notas}` : r.notas
    if (!existente.ficheiros_origem.includes(r.origem_ficheiro)) {
      existente.ficheiros_origem.push(r.origem_ficheiro)
    }
    // Herdar motivos de revisão do registo fundido.
    for (const m of r.motivos_revisao) registarConflito(existente, m)
  }

  return [...porChave.values(), ...semChave]
}

// Funde um campo escalar: preenche se vazio; se ambos têm valor divergente, é conflito.
function fundirCampo(
  alvo: RegistoFundido,
  origem: RegistoImportado,
  campo: keyof RegistoImportado
): void {
  const va = alvo[campo] as string | null
  const vo = origem[campo] as string | null
  if (vo == null) return
  if (va == null) {
    ;(alvo as unknown as Record<string, unknown>)[campo] = vo
    return
  }
  if (va !== vo) registarConflito(alvo, `${String(campo)} divergente ("${va}" vs "${vo}")`)
}

function registarConflito(r: RegistoFundido, motivo: string): void {
  if (!r.motivos_revisao.includes(motivo)) r.motivos_revisao.push(motivo)
}

// ── Relatório ────────────────────────────────────────────────────────────────
export function construirRelatorio(
  contagensLidos: Record<FicheiroImportacao, number>,
  fundidos: RegistoFundido[],
  totalRegistosPreFusao: number
): RelatorioImportacao {
  const total_lidos = Object.values(contagensLidos).reduce((a, b) => a + b, 0)
  const importados = fundidos.length
  const duplicados_unificados = Math.max(0, totalRegistosPreFusao - importados)
  const marcados_revisao = fundidos.filter((f) => f.motivos_revisao.length > 0).length
  const emAcomp = fundidos.filter((f) => f.em_acompanhamento && f.pipeline_fase != null)
  const fichas_criadas = emAcomp.length
  const candidaturas_criadas = emAcomp.length

  return {
    gerado_em: new Date().toISOString(),
    por_ficheiro: {
      ficha_estudante: { lidos: contagensLidos.ficha_estudante ?? 0 },
      acompanhamento: { lidos: contagensLidos.acompanhamento ?? 0 },
      gea: { lidos: contagensLidos.gea ?? 0 },
    },
    total_lidos,
    importados,
    duplicados_unificados,
    marcados_revisao,
    fichas_criadas,
    candidaturas_criadas,
  }
}

// ── Orquestração pura (sem BD) ───────────────────────────────────────────────
export interface EntradaFicheiro {
  ficheiro: FicheiroImportacao
  linhas: LinhaBruta[]
}

// Ficheiros que geram ficha/candidatura (acompanhamento). A Ficha de Estudante
// pura é tratada como contacto; acompanhamento e GEA como estudantes activos.
const FICHEIROS_ACOMPANHAMENTO: ReadonlySet<FicheiroImportacao> = new Set<FicheiroImportacao>([
  'acompanhamento',
  'gea',
])

export interface ResultadoPipeline {
  fundidos: RegistoFundido[]
  relatorio: RelatorioImportacao
}

// Corre o pipeline completo sobre um conjunto de ficheiros já parseados.
// Determinístico e idempotente na sua saída: as mesmas entradas produzem sempre
// as mesmas contagens e chaves (a idempotência de escrita fica na rota, via upsert).
export function correrPipeline(entradas: EntradaFicheiro[]): ResultadoPipeline {
  const contagens: Record<FicheiroImportacao, number> = {
    ficha_estudante: 0,
    acompanhamento: 0,
    gea: 0,
  }
  const registos: RegistoImportado[] = []

  for (const { ficheiro, linhas } of entradas) {
    const emAcomp = FICHEIROS_ACOMPANHAMENTO.has(ficheiro)
    linhas.forEach((linha, idx) => {
      contagens[ficheiro] += 1
      registos.push(normalizarLinha(linha, ficheiro, idx + 1, emAcomp))
    })
  }

  const fundidos = fundirRegistos(registos)
  const relatorio = construirRelatorio(contagens, fundidos, registos.length)
  return { fundidos, relatorio }
}
