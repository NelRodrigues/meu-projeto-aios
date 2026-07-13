import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api-auth'
import {
  parseCsvBruto,
  correrPipeline,
  type EntradaFicheiro,
} from '@/lib/importacao/pipeline'
import type {
  FicheiroImportacao,
  RegistoFundido,
  RelatorioImportacao,
} from '@/lib/importacao/tipos'

// ============================================================
// Rota de importação de Excels do cliente — story 2.5.
// ------------------------------------------------------------
// Protegida por `requireAdmin` (§8.2 cita "importação de Excels" como rota
// privilegiada). Usa service_role (bypass de RLS). Corre o pipeline puro
// (parsing/normalização/dedup/fusão) e depois:
//   • upsert IDEMPOTENTE em `leads` por telefone (UNIQUE) — correr 2× não duplica;
//     lead sem telefone canónico faz fallback a busca por email;
//   • `origem='importacao'` (enum §2.1, migração 021);
//   • tag `'importacao_rever'` em `leads.tags` para registos sem contacto/conflito;
//   • ficha_estudante + candidatura para estudantes em acompanhamento
//     (`processo_em_curso=true` quando a fase é activa);
//   • persiste o RELATÓRIO como 1 linha em `notificacoes` (sumário JSON na
//     coluna `mensagem`, `tipo='sistema'`) — correcção C5, sem tabela nova.
//
// FORMATO: aceita CSV (campo `ficheiros: [{ ficheiro, csv }]`) OU linhas já
// parseadas (`ficheiros: [{ ficheiro, linhas }]`). Os Excels do cliente (.xlsx)
// devem ser convertidos para CSV antes de enviar (a lib `xlsx` não está
// instalada). Ver docs/importacao-mapeamento-excels.md.
// ============================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const FICHEIROS_VALIDOS: FicheiroImportacao[] = ['ficha_estudante', 'acompanhamento', 'gea']

interface FicheiroInput {
  ficheiro?: unknown
  csv?: unknown
  linhas?: unknown
}

const TAG_REVISAO = 'importacao_rever'

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { ficheiros?: FicheiroInput[]; dry_run?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Corpo inválido (JSON esperado).' }, { status: 400 })
  }

  if (!Array.isArray(body.ficheiros) || body.ficheiros.length === 0) {
    return NextResponse.json({ error: 'Nenhum ficheiro fornecido.' }, { status: 400 })
  }

  // ── Parsing de cada ficheiro ────────────────────────────────────
  const entradas: EntradaFicheiro[] = []
  const errosParsing: string[] = []
  for (const f of body.ficheiros) {
    const tipo = String(f.ficheiro || '') as FicheiroImportacao
    if (!FICHEIROS_VALIDOS.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo de ficheiro inválido: "${tipo}". Esperado: ${FICHEIROS_VALIDOS.join(', ')}.` },
        { status: 400 }
      )
    }
    if (typeof f.csv === 'string') {
      const { linhas, erros } = parseCsvBruto(f.csv)
      if (erros.length) errosParsing.push(...erros.map((e) => `[${tipo}] ${e}`))
      entradas.push({ ficheiro: tipo, linhas })
    } else if (Array.isArray(f.linhas)) {
      entradas.push({ ficheiro: tipo, linhas: f.linhas as EntradaFicheiro['linhas'] })
    } else {
      return NextResponse.json(
        { error: `Ficheiro "${tipo}" sem conteúdo (esperado campo "csv" string ou "linhas" array).` },
        { status: 400 }
      )
    }
  }

  // ── Pipeline puro (dedup/fusão/relatório) ───────────────────────
  const { fundidos, relatorio } = correrPipeline(entradas)

  // Dry-run: só devolve o que seria feito, sem tocar na BD.
  if (body.dry_run === true) {
    return NextResponse.json({ relatorio, preview: fundidos, dry_run: true, avisos: errosParsing })
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 })
  }

  // ── Escrita idempotente ─────────────────────────────────────────
  let fichas_criadas = 0
  let candidaturas_criadas = 0
  const errosEscrita: string[] = []

  for (const reg of fundidos) {
    try {
      const leadId = await upsertLead(admin, reg)
      if (!leadId) continue
      if (reg.em_acompanhamento && reg.pipeline_fase) {
        const ok = await upsertFichaCandidatura(admin, leadId, reg)
        if (ok) {
          fichas_criadas += 1
          candidaturas_criadas += 1
        }
      }
    } catch (e) {
      errosEscrita.push(`linha ${reg.linha} (${reg.origem_ficheiro}): ${(e as Error).message}`)
    }
  }

  // O relatório reflecte as contagens reais de escrita de ficha/candidatura.
  const relatorioFinal: RelatorioImportacao = {
    ...relatorio,
    fichas_criadas,
    candidaturas_criadas,
  }

  // ── Persistir relatório em `notificacoes` (correcção C5) ─────────
  // Sem tabela nova: `tipo='sistema'`, `lead_id=null`, sumário JSON em `mensagem`.
  const { error: erroNotif } = await admin.from('notificacoes').insert({
    tipo: 'sistema',
    lead_id: null,
    mensagem: JSON.stringify({ evento: 'importacao_excels', relatorio: relatorioFinal }),
    lida: false,
  })
  if (erroNotif) {
    errosEscrita.push(`relatório não persistido em notificacoes: ${erroNotif.message}`)
  }

  return NextResponse.json({
    relatorio: relatorioFinal,
    avisos: [...errosParsing, ...errosEscrita],
  })
}

// Upsert idempotente de 1 lead a partir de um registo fundido.
// Dedup por telefone (UNIQUE); fallback por email quando não há telefone canónico.
// Devolve o id do lead ou null se o registo não tem qualquer identificador.
async function upsertLead(
  admin: ReturnType<typeof getSupabaseAdmin>,
  reg: RegistoFundido
): Promise<string | null> {
  const temRevisao = reg.motivos_revisao.length > 0

  // Localizar lead existente (idempotência).
  let existenteId: string | null = null
  if (reg.telefone_normalizado) {
    const { data } = await admin
      .from('leads')
      .select('id, tags')
      .eq('telefone', reg.telefone_normalizado)
      .maybeSingle()
    existenteId = data?.id ?? null
    if (data) return await aplicarPatchLead(admin, data.id as string, data.tags as string[] | null, reg, temRevisao)
  }
  if (!existenteId && reg.email) {
    const { data } = await admin
      .from('leads')
      .select('id, tags')
      .eq('email', reg.email)
      .limit(1)
      .maybeSingle()
    if (data) return await aplicarPatchLead(admin, data.id as string, data.tags as string[] | null, reg, temRevisao)
  }

  // Sem telefone canónico E sem email → não há chave; ainda assim importamos
  // (AC2: nunca descartar). Usamos um telefone-placeholder derivado da linha
  // para satisfazer o NOT NULL de `leads.telefone`, e marcamos para revisão.
  const telefoneParaGravar =
    reg.telefone_normalizado || reg.telefone_bruto || `sem-telefone-${reg.origem_ficheiro}-${reg.linha}`

  const tags = temRevisao || !reg.telefone_normalizado ? [TAG_REVISAO] : []

  const { data: novo, error } = await admin
    .from('leads')
    .insert({
      nome: reg.nome || 'Sem nome (importação)',
      telefone: telefoneParaGravar,
      email: reg.email,
      origem: 'importacao',
      estagio: 'novo',
      tags,
      notas: montarNotas(reg),
      utm_source: 'importacao',
    })
    .select('id')
    .single()

  if (error || !novo) throw new Error(error?.message || 'falha ao inserir lead')
  return novo.id as string
}

// Actualiza um lead já existente sem duplicar (idempotência): só preenche o que
// falta e garante a tag de revisão quando aplicável.
async function aplicarPatchLead(
  admin: ReturnType<typeof getSupabaseAdmin>,
  leadId: string,
  tagsActuais: string[] | null,
  reg: RegistoFundido,
  temRevisao: boolean
): Promise<string> {
  const patch: Record<string, unknown> = { origem: 'importacao' }
  if (reg.email) patch.email = reg.email
  if (reg.nome) patch.nome = reg.nome

  // União de tags — garante idempotência (correr 2× não acumula duplicados).
  const base = new Set<string>(tagsActuais || [])
  if (temRevisao) base.add(TAG_REVISAO)
  patch.tags = [...base]

  const notas = montarNotas(reg)
  if (notas) patch.notas = notas

  const { error } = await admin.from('leads').update(patch).eq('id', leadId)
  if (error) throw new Error(error.message)
  return leadId
}

function montarNotas(reg: RegistoFundido): string | null {
  const partes: string[] = []
  if (reg.notas) partes.push(reg.notas)
  if (reg.motivos_revisao.length) partes.push(`[revisão] ${reg.motivos_revisao.join('; ')}`)
  return partes.length ? partes.join(' | ') : null
}

// Upsert idempotente de ficha (1:1 por lead_id) + candidatura na fase mapeada.
// Para a candidatura, evita duplicar por (lead_id, fase) ao correr 2×.
async function upsertFichaCandidatura(
  admin: ReturnType<typeof getSupabaseAdmin>,
  leadId: string,
  reg: RegistoFundido
): Promise<boolean> {
  const { data: ficha, error: erroFicha } = await admin
    .from('fichas_estudante')
    .upsert(
      {
        lead_id: leadId,
        nome_completo: reg.nome,
        destino_pretendido: reg.destino_pretendido,
        orcamento_faixa: reg.orcamento_faixa,
        percurso_academico: reg.percurso_academico,
        encarregado_nome: reg.encarregado_nome,
        encarregado_contacto: reg.encarregado_contacto,
        processo_em_curso: reg.processo_em_curso,
        notas: reg.estado_excel ? `estado-Excel: ${reg.estado_excel}` : null,
      },
      { onConflict: 'lead_id' }
    )
    .select('id')
    .single()

  if (erroFicha || !ficha) throw new Error(erroFicha?.message || 'falha ao gravar ficha')

  // Candidatura idempotente: só cria se ainda não existir uma na mesma fase.
  const { data: existente } = await admin
    .from('candidaturas')
    .select('id')
    .eq('lead_id', leadId)
    .eq('fase', reg.pipeline_fase as string)
    .limit(1)
    .maybeSingle()

  if (existente) return true

  const { error: erroCand } = await admin.from('candidaturas').insert({
    lead_id: leadId,
    ficha_id: ficha.id,
    fase: reg.pipeline_fase,
    estado_documental: reg.estado_excel,
    notas: 'Criada por importação (story 2.5).',
  })
  if (erroCand) throw new Error(erroCand.message)
  return true
}
