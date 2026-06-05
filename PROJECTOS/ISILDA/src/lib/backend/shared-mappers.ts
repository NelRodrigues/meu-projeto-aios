import type {
  Cliente,
  ClienteEstagio,
  ConversaActiva,
  MensagemWhatsApp,
  ModoConversa,
  OrigemCanal,
  PedidoComCliente,
  PedidoEstado,
  WhatsAppDirection,
  WhatsAppMessageStatus,
  WhatsAppSenderType,
  ConversationStatus,
} from '@/types/database'

export type SharedContactRow = {
  id: string
  created_at: string
  updated_at: string
  nome: string
  telefone: string | null
  email: string | null
  estagio: string | null
  origem: string | null
  notas: string | null
  valor_total_pago: number | string | null
  whatsapp_id: string | null
  morada?: string | null
  data_aniversario?: string | null
  lead_intelligence?: Record<string, unknown> | null
  lead_intelligence_at?: string | null
}

export type SharedDealRow = {
  id: string
  lead_id: string
  title: string | null
  status: string | null
  total_paid: number | string | null
  created_at: string
  updated_at: string
  expected_close_date: string | null
  notes: string | null
  payment_status: string | null
  leads?: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
}

function leadFromDeal(row: SharedDealRow) {
  return Array.isArray(row.leads) ? row.leads[0] ?? null : row.leads
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

export function mapSharedContactStage(stage: string | null | undefined): ClienteEstagio {
  const value = (stage || '').toLowerCase()
  if (['vip'].includes(value)) return 'vip'
  if (['inactive', 'inactivo', 'blocked'].includes(value)) return 'inactivo'
  if (['contacted', 'contactado'].includes(value)) return 'contactado'
  if (['quote', 'orcamento', 'proposal'].includes(value)) return 'orcamento'
  if (['active', 'activo', 'customer', 'client'].includes(value)) return 'activo'
  return 'novo'
}

export function mapSharedOrigin(origin: string | null | undefined): OrigemCanal | null {
  const value = (origin || '').toLowerCase()
  if (['whatsapp', 'wa'].includes(value)) return 'whatsapp'
  if (['instagram', 'instagram_dm'].includes(value)) return 'instagram'
  if (['indicacao', 'referencia', 'reference'].includes(value)) return 'referencia'
  if (!value) return null
  return 'outro'
}

export function mapSharedContactToCliente(row: SharedContactRow): Cliente {
  const totalGasto = toNumber(row.valor_total_pago)

  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    nome: row.nome,
    telefone: row.telefone,
    whatsapp_id: row.whatsapp_id,
    email: row.email,
    estagio: mapSharedContactStage(row.estagio),
    origem: mapSharedOrigin(row.origem),
    notas: row.notas,
    morada: row.morada ?? null,
    data_aniversario: row.data_aniversario ?? null,
    lead_intelligence: row.lead_intelligence ?? null,
    lead_intelligence_at: row.lead_intelligence_at ?? null,
    total_pedidos: totalGasto > 0 ? 1 : 0,
    total_gasto: totalGasto,
    ticket_medio: totalGasto,
    ultima_compra: null,
    criado_por_bot: false,
  }
}

export function mapSharedDealStatus(status: string | null | undefined): PedidoEstado {
  const value = (status || '').toLowerCase()
  if (['won', 'paid', 'pago'].includes(value)) return 'pago'
  if (['negotiation', 'proposal', 'orcamento', 'quote'].includes(value)) return 'orcamento'
  if (['confirmed', 'confirmado'].includes(value)) return 'confirmado'
  if (['production', 'em_producao'].includes(value)) return 'em_producao'
  if (['ready', 'pronto'].includes(value)) return 'pronto'
  if (['delivered', 'entregue'].includes(value)) return 'entregue'
  if (['cancelled', 'canceled', 'lost', 'cancelado'].includes(value)) return 'cancelado'
  return 'novo'
}

export function mapSharedDealToPedido(row: SharedDealRow): PedidoComCliente {
  const lead = leadFromDeal(row)
  const clienteNome = lead?.name ?? row.title ?? 'Cliente desconhecido'
  const clienteTelefone = lead?.phone ?? null
  const valor = toNumber(row.total_paid)
  const dataBase = row.expected_close_date || row.created_at
  const estado = mapSharedDealStatus(row.status)

  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    cliente_id: row.lead_id,
    produto_id: null,
    conversa_id: null,
    descricao: row.notes,
    tema: null,
    tamanho: null,
    sabor_massa: null,
    sabor_recheio: null,
    decoracao: null,
    imagem_referencia: null,
    data_entrega: dataBase.split('T')[0],
    hora_entrega: null,
    modo_entrega: 'retirada',
    endereco_entrega: null,
    valor_orcamento: valor || null,
    valor_final: valor || null,
    estado,
    notas: row.notes,
    confirmado_at: null,
    pago_at: estado === 'pago' ? row.updated_at : null,
    producao_inicio_at: null,
    pronto_at: null,
    entregue_at: null,
    cancelado_at: estado === 'cancelado' ? row.updated_at : null,
    cliente_nome: clienteNome,
    cliente_telefone: clienteTelefone,
    produto_nome: row.title,
  }
}

function inferConversationMode(contact: SharedContactRow, deal: SharedDealRow | null): ModoConversa {
  const stage = mapSharedContactStage(contact.estagio)
  if (stage === 'inactivo') return 'pausado'
  if (deal && ['won', 'paid', 'confirmed', 'proposal', 'negotiation'].includes((deal.status || '').toLowerCase())) {
    return 'humano'
  }
  if (stage === 'orcamento' || stage === 'activo' || stage === 'vip') return 'humano'
  return 'bot'
}

function inferConversationStatus(mode: ModoConversa): ConversationStatus {
  if (mode === 'pausado') return 'paused_by_human'
  return 'active'
}

function inferLastSender(contact: SharedContactRow, deal: SharedDealRow | null): WhatsAppSenderType | null {
  if (deal) {
    const status = (deal.status || '').toLowerCase()
    if (['won', 'paid', 'confirmed'].includes(status)) return 'humano'
    if (['proposal', 'negotiation', 'quote'].includes(status)) return 'bot'
    if (['cancelled', 'canceled', 'lost'].includes(status)) return 'sistema'
  }
  if (contact.notas) return 'humano'
  return null
}

function inferPreview(contact: SharedContactRow, deal: SharedDealRow | null): string | null {
  if (deal) {
    const status = (deal.status || '').toLowerCase()
    const title = deal.title || 'Pedido'
    if (status === 'paid' || status === 'won') return `${title} confirmado e pago`
    if (status === 'confirmed') return `${title} confirmado`
    if (status === 'proposal' || status === 'negotiation' || status === 'quote') return `${title} em negociação`
    if (status === 'production' || status === 'em_producao') return `${title} em produção`
    if (status === 'ready' || status === 'pronto') return `${title} pronto para entrega`
    if (status === 'delivered' || status === 'entregue') return `${title} entregue`
    if (status === 'cancelled' || status === 'canceled' || status === 'lost') return `${title} cancelado`
    return title
  }

  return contact.notas?.trim() || null
}

function inferMessageTime(contact: SharedContactRow, deal: SharedDealRow | null): string {
  const candidate = deal?.updated_at || contact.updated_at || contact.created_at
  return candidate
}

function createSyntheticMessage({
  id,
  createdAt,
  clienteId,
  senderType,
  direction,
  conteudo,
  messageStatus,
}: {
  id: string
  createdAt: string
  clienteId: string
  senderType: WhatsAppSenderType
  direction: WhatsAppDirection
  conteudo: string
  messageStatus: WhatsAppMessageStatus
}): MensagemWhatsApp {
  return {
    id,
    created_at: createdAt,
    cliente_id: clienteId,
    sender_type: senderType,
    conteudo,
    direction,
    message_status: messageStatus,
    whatsapp_message_id: null,
    media_url: null,
    media_type: null,
    intencao_classificada: null,
    confianca_resposta: null,
    modelo_llm: null,
    tokens_input: null,
    tokens_output: null,
    latencia_ms: null,
  }
}

export function mapSharedContactToConversa(
  contact: SharedContactRow,
  latestDeal: SharedDealRow | null = null
): ConversaActiva {
  const modo = inferConversationMode(contact, latestDeal)
  const preview = inferPreview(contact, latestDeal)
  const lastSender = inferLastSender(contact, latestDeal)
  const lastTime = inferMessageTime(contact, latestDeal)

  return {
    conversa_id: contact.id,
    cliente_id: contact.id,
    cliente_nome: contact.nome,
    telefone: contact.telefone,
    modo,
    estado: inferConversationStatus(modo),
    total_messages_sent: (contact.notas ? 1 : 0) + (latestDeal ? 1 : 0),
    ultima_mensagem: preview,
    ultimo_remetente: lastSender,
    ultima_mensagem_em: lastTime,
    estagio: mapSharedContactStage(contact.estagio),
  }
}

export function buildSharedInboxMessages(
  contact: SharedContactRow,
  latestDeal: SharedDealRow | null = null
): MensagemWhatsApp[] {
  const mensagens: MensagemWhatsApp[] = []
  const agora = latestDeal?.updated_at || contact.updated_at || contact.created_at

  if (contact.notas?.trim()) {
    mensagens.push(
      createSyntheticMessage({
        id: `${contact.id}-nota`,
        createdAt: contact.updated_at || contact.created_at,
        clienteId: contact.id,
        senderType: 'humano',
        direction: 'internal',
        conteudo: `Notas do contacto: ${contact.notas.trim()}`,
        messageStatus: 'read',
      })
    )
  }

  if (latestDeal) {
    const lead = leadFromDeal(latestDeal)
    const title = latestDeal.title || lead?.name || 'Pedido'
    const status = (latestDeal.status || '').toLowerCase()
    const statusLabel =
      status === 'paid' || status === 'won' ? 'pago'
      : status === 'confirmed' ? 'confirmado'
      : status === 'proposal' || status === 'negotiation' || status === 'quote' ? 'em negociação'
      : status === 'production' || status === 'em_producao' ? 'em produção'
      : status === 'ready' || status === 'pronto' ? 'pronto'
      : status === 'delivered' || status === 'entregue' ? 'entregue'
      : status === 'cancelled' || status === 'canceled' || status === 'lost' ? 'cancelado'
      : 'actualizado'

    mensagens.push(
      createSyntheticMessage({
        id: `${contact.id}-deal`,
        createdAt: agora,
        clienteId: contact.id,
        senderType: inferLastSender(contact, latestDeal) || 'bot',
        direction: 'outgoing',
        conteudo: `${title} ${statusLabel}`.trim(),
        messageStatus: 'sent',
      })
    )
  }

  if (mensagens.length === 0) {
    mensagens.push(
      createSyntheticMessage({
        id: `${contact.id}-vazio`,
        createdAt: agora,
        clienteId: contact.id,
        senderType: 'sistema',
        direction: 'internal',
        conteudo: 'Sem histórico de mensagens disponível neste backend partilhado.',
        messageStatus: 'read',
      })
    )
  }

  return mensagens.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}
