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
