import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientDetail } from '@/components/clientes/client-detail'
import type { Cliente } from '@/types/database'
import { isSharedBackendMode, PUBLIC_SHARED_TENANT_ID } from '@/lib/backend/config'
import { mapSharedContactToCliente } from '@/lib/backend/shared-mappers'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  if (isSharedBackendMode()) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (!contact) {
      notFound()
    }

    const cliente = mapSharedContactToCliente(contact as Parameters<typeof mapSharedContactToCliente>[0])

    // Mensagens reais de whatsapp_messages (backend partilhado SIC).
    let wmQuery = supabase
      .from('whatsapp_messages')
      .select('id,created_at,content,message,sender_type,direction')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (PUBLIC_SHARED_TENANT_ID) wmQuery = wmQuery.eq('tenant_id', PUBLIC_SHARED_TENANT_ID)
    const { data: wmRows } = await wmQuery

    const mensagensRecentes = ((wmRows ?? []) as Array<Record<string, unknown>>)
      .reverse()
      .map((row) => ({
        id: String(row.id),
        created_at: String(row.created_at),
        sender_type: row.direction === 'outgoing' ? (row.sender_type === 'humano' ? 'humano' : 'bot') : 'cliente',
        conteudo: String(row.content || row.message || ''),
        direction: row.direction === 'outgoing' ? 'outgoing' : 'incoming',
      }))

    return (
      <ClientDetail
        cliente={cliente as Cliente}
        mensagensRecentes={mensagensRecentes}
        sharedMode
      />
    )
  }

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  const { data: mensagens } = await supabase
    .from('mensagens_whatsapp')
    .select('id, created_at, sender_type, conteudo, direction')
    .eq('cliente_id', id)
    .neq('direction', 'internal')
    .order('created_at', { ascending: false })
    .limit(20)

  return <ClientDetail cliente={cliente as Cliente} mensagensRecentes={mensagens || []} sharedMode={false} />
}
