import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientDetail } from '@/components/clientes/client-detail'
import type { Cliente } from '@/types/database'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

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

  return <ClientDetail cliente={cliente as Cliente} mensagensRecentes={mensagens || []} />
}
