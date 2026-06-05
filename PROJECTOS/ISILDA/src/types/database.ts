// ============================================================
// Delicias da Isi CRM — Database Types
// ============================================================

// ========================
// ENUM Types
// ========================

export type ClienteEstagio =
  | 'novo'
  | 'contactado'
  | 'orcamento'
  | 'activo'
  | 'vip'
  | 'inactivo'

export type OrigemCanal =
  | 'whatsapp'
  | 'instagram'
  | 'referencia'
  | 'outro'

export type InteractionType =
  | 'nota'
  | 'chamada'
  | 'mensagem_whatsapp'
  | 'email'
  | 'visita'
  | 'seguimento'

// ========================
// Table Interfaces
// ========================

export interface Cliente {
  id: string
  created_at: string
  updated_at: string
  nome: string
  telefone: string | null
  whatsapp_id: string | null
  email: string | null
  estagio: ClienteEstagio
  origem: OrigemCanal | null
  notas: string | null
  morada: string | null
  data_aniversario: string | null
  lead_intelligence: Record<string, unknown> | null
  lead_intelligence_at: string | null
  total_pedidos: number
  total_gasto: number
  ticket_medio: number
  ultima_compra: string | null
  criado_por_bot: boolean
}

export interface Interacao {
  id: string
  created_at: string
  cliente_id: string
  tipo: InteractionType | null
  conteudo: string | null
  criado_por: string | null
}

export interface MessageTemplate {
  id: string
  created_at: string
  updated_at: string
  nome: string
  categoria: string | null
  conteudo: string
  activo: boolean
}

// ========================
// AI Agent / WhatsApp Types
// ========================

export type WhatsAppSenderType = 'cliente' | 'bot' | 'humano' | 'sistema'
export type WhatsAppDirection = 'incoming' | 'outgoing' | 'internal'
export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationStatus = 'active' | 'paused_by_human' | 'paused_by_schedule' | 'transferred' | 'completed'
export type ModoConversa = 'bot' | 'humano' | 'pausado'

export interface MensagemWhatsApp {
  id: string
  created_at: string
  cliente_id: string
  sender_type: WhatsAppSenderType
  conteudo: string
  direction: WhatsAppDirection
  message_status: WhatsAppMessageStatus
  whatsapp_message_id: string | null
  media_url: string | null
  media_type: string | null
  intencao_classificada: string | null
  confianca_resposta: number | null
  modelo_llm: string | null
  tokens_input: number | null
  tokens_output: number | null
  latencia_ms: number | null
}

export interface AiAgentConversation {
  id: string
  created_at: string
  updated_at: string
  cliente_id: string
  agent_id: string
  status: ConversationStatus
  total_messages_sent: number
  paused_by: string | null
  paused_at: string | null
  pause_reason: string | null
  last_processed_at: string | null
}

// ========================
// View: v_conversas_activas
// ========================

export interface ConversaActiva {
  conversa_id: string
  cliente_id: string
  cliente_nome: string
  telefone: string | null
  modo: ModoConversa
  estado: ConversationStatus
  total_messages_sent: number
  ultima_mensagem: string | null
  ultimo_remetente: WhatsAppSenderType | null
  ultima_mensagem_em: string | null
  estagio: ClienteEstagio
}

// ========================
// Notifications
// ========================

export type NotificacaoTipo = 'takeover' | 'pagamento' | 'urgente' | 'conflito_calendario' | 'recompra' | 'sistema'

export interface Notificacao {
  id: string
  created_at: string
  cliente_id: string | null
  tipo: NotificacaoTipo
  mensagem: string
  lida: boolean
  lida_em: string | null
}

// ========================
// Integration Keys
// ========================

export interface IntegrationKey {
  id: string
  created_at: string
  updated_at: string
  service: string
  key_name: string
  key_value: string
  is_active: boolean
}

// ========================
// WhatsApp Instances
// ========================

export type WhatsAppInstanceStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WhatsAppInstance {
  id: string
  created_at: string
  updated_at: string
  tenant_id: string | null
  name: string
  phone_number: string | null
  teams: string[] | null
  status: WhatsAppInstanceStatus
  api_key: string | null
  api_url: string | null
  webhook_url: string | null
  bypass_disconnect: boolean | null
  purpose: string | null
  metadata: Record<string, unknown> | null
}

// ========================
// Catalogo
// ========================

export type ProdutoCategoria =
  | 'chantilly'
  | 'bento_cake'
  | 'especiais'
  | 'naked_vintage'
  | 'doces'
  | 'casamento'
  | 'outro'

export interface Produto {
  id: string
  created_at: string
  updated_at: string
  nome: string
  descricao: string | null
  categoria: ProdutoCategoria
  tags: string[]
  fotos: string[]
  foto_principal: string | null
  preco_base: number | null
  precos_por_tamanho: Record<string, number>
  sob_consulta: boolean
  tempo_producao_horas: number
  complexidade: number
  activo: boolean
}

// ========================
// Pedidos
// ========================

export type PedidoEstado =
  | 'novo'
  | 'orcamento'
  | 'confirmado'
  | 'pago'
  | 'em_producao'
  | 'pronto'
  | 'entregue'
  | 'cancelado'

export type ModoEntrega = 'retirada' | 'entrega'

export interface Pedido {
  id: string
  created_at: string
  updated_at: string
  cliente_id: string
  produto_id: string | null
  conversa_id: string | null
  descricao: string | null
  tema: string | null
  tamanho: string | null
  sabor_massa: string | null
  sabor_recheio: string | null
  decoracao: string | null
  imagem_referencia: string | null
  data_entrega: string
  hora_entrega: string | null
  modo_entrega: ModoEntrega
  endereco_entrega: string | null
  valor_orcamento: number | null
  valor_final: number | null
  estado: PedidoEstado
  notas: string | null
  confirmado_at: string | null
  pago_at: string | null
  producao_inicio_at: string | null
  pronto_at: string | null
  entregue_at: string | null
  cancelado_at: string | null
}

export interface PedidoComCliente extends Pedido {
  cliente_nome: string
  cliente_telefone: string | null
  produto_nome: string | null
}

// ========================
// Calendario
// ========================

export type CalendarioStatus = 'disponivel' | 'quase_lotado' | 'lotado' | 'bloqueado' | 'passado'

export interface CalendarioDia {
  data: string
  capacidade_maxima: number
  notas: string | null
  bloqueado: boolean
  pedidos_agendados: number
  vagas_disponiveis: number
  status: CalendarioStatus
}
