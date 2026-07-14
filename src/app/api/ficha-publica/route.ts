import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeAngolaPhone } from '@/lib/normalize-phone'

// ============================================================
// Formulário público de ficha de estudante — story 2.4 AC4.
// ------------------------------------------------------------
// Endpoint público (sem sessão), análogo ao webhook uazapi: usa service_role
// com validação de input estrita. Cria/actualiza lead + ficha_estudante,
// deduplicando por telefone normalizado (`leads.telefone` é UNIQUE), marca
// `origem='formulario_site'` (enum §2.1, alinhado via migração 021) e regista
// o consentimento de dados pessoais (FR24).
// ============================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase nao configurado')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

interface FichaPublicaInput {
  nome?: unknown
  telefone?: unknown
  email?: unknown
  // campos da ficha
  nome_completo?: unknown
  data_nascimento?: unknown
  nacionalidade?: unknown
  encarregado_nome?: unknown
  encarregado_contacto?: unknown
  encarregado_relacao?: unknown
  percurso_academico?: unknown
  nivel_linguistico?: unknown
  destino_pretendido?: unknown
  orcamento_faixa?: unknown
  consentimento?: unknown // checkbox obrigatório de RGPD
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

export async function POST(request: Request) {
  let body: FichaPublicaInput
  try {
    body = (await request.json()) as FichaPublicaInput
  } catch {
    return NextResponse.json({ error: 'Corpo inválido (JSON esperado).' }, { status: 400 })
  }

  // ── Validação de input ──────────────────────────────────────────
  const nome = str(body.nome)
  const telefoneRaw = str(body.telefone)
  if (!nome) {
    return NextResponse.json({ error: 'O nome é obrigatório.' }, { status: 400 })
  }
  if (!telefoneRaw) {
    return NextResponse.json({ error: 'O telefone é obrigatório.' }, { status: 400 })
  }
  if (body.consentimento !== true) {
    return NextResponse.json(
      { error: 'É necessário consentir o tratamento de dados pessoais.' },
      { status: 400 }
    )
  }

  const telefone = normalizeAngolaPhone(telefoneRaw)

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 })
  }

  // ── Upsert do lead (dedup por telefone normalizado — UNIQUE) ─────
  // Procura primeiro; se existir actualiza dados de contacto e origem,
  // senão cria. `origem='formulario_site'` (enum §2.1, migração 021).
  const { data: existente } = await admin
    .from('leads')
    .select('id')
    .eq('telefone', telefone)
    .maybeSingle()

  let leadId: string
  if (existente?.id) {
    leadId = existente.id as string
    const patch: Record<string, unknown> = { origem: 'formulario_site' }
    const email = str(body.email)
    if (email) patch.email = email
    await admin.from('leads').update(patch).eq('id', leadId)
  } else {
    const { data: novo, error: erroLead } = await admin
      .from('leads')
      .insert({
        nome,
        telefone,
        email: str(body.email),
        origem: 'formulario_site',
        estagio: 'novo',
        utm_source: 'formulario_site',
      })
      .select('id')
      .single()

    if (erroLead || !novo) {
      return NextResponse.json(
        { error: `Falha ao registar o contacto: ${erroLead?.message ?? 'desconhecido'}` },
        { status: 500 }
      )
    }
    leadId = novo.id as string
  }

  // ── Upsert da ficha de estudante (1:1 com o lead via lead_id UNIQUE) ──
  const fichaPayload = {
    lead_id: leadId,
    nome_completo: str(body.nome_completo) ?? nome,
    data_nascimento: str(body.data_nascimento),
    nacionalidade: str(body.nacionalidade),
    encarregado_nome: str(body.encarregado_nome),
    encarregado_contacto: str(body.encarregado_contacto),
    encarregado_relacao: str(body.encarregado_relacao),
    percurso_academico: str(body.percurso_academico),
    nivel_linguistico: str(body.nivel_linguistico),
    destino_pretendido: str(body.destino_pretendido),
    orcamento_faixa: str(body.orcamento_faixa),
  }

  const { error: erroFicha } = await admin
    .from('fichas_estudante')
    .upsert(fichaPayload, { onConflict: 'lead_id' })

  if (erroFicha) {
    return NextResponse.json(
      { error: `Contacto registado, mas a ficha falhou: ${erroFicha.message}` },
      { status: 500 }
    )
  }

  // ── Registo de consentimento (FR24) ──────────────────────────────
  // Não bloqueia a resposta se falhar (o lead+ficha já persistiram); apenas loga.
  const { error: erroConsent } = await admin.from('consentimentos').insert({
    lead_id: leadId,
    tipo: 'dados_pessoais',
    fonte: 'formulario',
  })
  if (erroConsent) {
    console.warn('[ficha-publica] consentimento não registado:', erroConsent.message)
  }

  return NextResponse.json({ ok: true, lead_id: leadId }, { status: 201 })
}
