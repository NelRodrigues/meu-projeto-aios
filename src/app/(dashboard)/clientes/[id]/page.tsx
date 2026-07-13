import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientDetail } from '@/components/clientes/client-detail'
import { Ficha360 } from '@/components/clientes/ficha360'
import { agregarTimeline } from '@/lib/timeline-agregador'
import type { Cliente, Programa, FichaEstudante } from '@/types/database'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

// Backend dedicado single-tenant da GM (ADR-01): a tabela nuclear de contactos e
// `leads` (era `clientes` na base ISILDA) e as mensagens usam `lead_id`.
export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  const { data: mensagens } = await supabase
    .from('mensagens_whatsapp')
    .select('id, created_at, sender_type, conteudo, direction')
    .eq('lead_id', id)
    .neq('direction', 'internal')
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Ficha 360º (story 2.4) — carregada server-side ──────────────────────
  // A ficha é 1:1 com o lead; pode ainda não existir (maybeSingle).
  const { data: ficha } = await supabase
    .from('fichas_estudante')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle()

  // Catálogo de programas para o selector de programa pretendido (2.2).
  const { data: programas } = await supabase
    .from('programas')
    .select('id, nome, tipo, is_active')
    .eq('is_active', true)
    .order('nome', { ascending: true })

  // Timeline unificada: agrega interacoes + mudancas_estagio + mensagens.
  const [{ data: interacoes }, { data: mudancas }, { data: mensagensTl }] =
    await Promise.all([
      supabase
        .from('interacoes')
        .select('id, created_at, tipo, conteudo')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('mudancas_estagio')
        .select('id, created_at, estagio_anterior, estagio_novo')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('mensagens_whatsapp')
        .select('id, created_at, sender_type, conteudo, direction')
        .eq('lead_id', id)
        .neq('direction', 'internal')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

  const timeline = agregarTimeline({
    interacoes: interacoes ?? [],
    mudancasEstagio: mudancas ?? [],
    mensagensWhatsApp: mensagensTl ?? [],
  })

  return (
    <div className="space-y-6">
      <ClientDetail cliente={cliente as Cliente} mensagensRecentes={mensagens || []} />
      <div className="mx-auto max-w-4xl px-6 pb-6">
        <Ficha360
          leadId={id}
          fichaInicial={(ficha as FichaEstudante | null) ?? null}
          programas={
            (programas as Pick<Programa, 'id' | 'nome' | 'tipo' | 'is_active'>[]) ?? []
          }
          timeline={timeline}
        />
      </div>
    </div>
  )
}
