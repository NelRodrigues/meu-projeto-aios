// ============================================================
// SIC Global Minds — Database Types
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

// Contacto nuclear do CRM. Na base de dados a tabela chama-se `leads`
// (renomeada a partir de `clientes` na migracao 002); mantemos o nome de
// dominio "Cliente"/"Lead" no frontend para leitura clara.
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
  lead_id: string
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
// Catálogo: parceiros → destinos → programas (story 2.2)
// ========================

// Tipos de programa — CHECK na migração 008 (§2.5). Nunca enum na BD.
export type ProgramaTipo =
  | 'summer_camp'
  | 'linguas'
  | 'foundation'
  | 'licenciatura'
  | 'mestrado'
  | 'voluntariado'
  | 'outro'

export interface Parceiro {
  id: string
  created_at: string
  updated_at: string
  nome: string
  tipo: string | null
  comissao_percent: number | null
  website: string | null
  brochura_url: string | null
  notas: string | null
  is_active: boolean
}

export interface Destino {
  id: string
  created_at: string
  updated_at: string
  parceiro_id: string | null
  pais: string
  cidade: string | null
  custo_vida_faixa: string | null
  custo_vida_currency: string | null
  notas: string | null
}

export interface Programa {
  id: string
  created_at: string
  updated_at: string
  destino_id: string | null
  nome: string
  tipo: ProgramaTipo
  custo_min: number | null
  custo_max: number | null
  currency: string | null
  comissao_percent: number | null
  duracao: string | null
  brochura_url: string | null
  link: string | null
  is_active: boolean
}

// ========================
// Candidaturas: pipeline 8 fases (story 2.3)
// ========================

// As 8 fases reais do enum `pipeline_fase` (§2.1). Rótulos/ordem em lib/pipeline-fases.ts.
export type PipelineFase =
  | 'lead'
  | 'qualificado'
  | 'consulta_agendada'
  | 'proposta_enviada'
  | 'formalizacao_pagamento'
  | 'candidatura_submetida'
  | 'em_curso'
  | 'concluido'

// Espelha a tabela `candidaturas` (migração 009). `fase_desde`/`prazo_fase_dias`
// alimentam o "tempo em fase" e a sinalização de atraso; o trigger 017 mantém
// `fase_desde`, a auditoria e o espelhamento em `leads.pipeline_fase`.
export interface Candidatura {
  id: string
  created_at: string
  updated_at: string
  lead_id: string
  ficha_id: string | null
  programa_id: string | null
  parceiro_id: string | null
  fase: PipelineFase
  fase_desde: string | null
  prazo_fase_dias: number | null
  estado_documental: string | null
  notas: string | null
}

// Cartão do kanban — candidatura enriquecida com o essencial para decisão
// (nome do lead, programa/destino via catálogo, temperature do lead).
export interface CandidaturaCartao extends Candidatura {
  lead_nome: string
  lead_temperature: 'quente' | 'morno' | 'frio' | null
  programa_nome: string | null
  destino_pais: string | null
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
  lead_id: string
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
  lead_id: string
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
  lead_id: string
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
  lead_id: string | null
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

// single-tenant (ADR-01): a tabela `whatsapp_instances` NAO tem coluna tenant_id.
export interface WhatsAppInstance {
  id: string
  created_at: string
  updated_at: string
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
