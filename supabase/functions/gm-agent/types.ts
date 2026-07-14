// ============================================================================
// Tipos do agente Global Minds (`gm-agent`). Story 3.2.
// Módulo PURO — sem imports de URL/Deno; importável em testes node:test.
// Domínio GM: `lead_id` (nunca `cliente_id`), `pipeline_fase`, `idioma_pref`.
// ============================================================================

export interface AgentSettings {
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  debounce_seconds: number;
  response_delay_min_ms: number;
  response_delay_max_ms: number;
  typing_speed_cpm: number;
  message_split_max_length: number;
  delay_between_messages_min_ms: number;
  delay_between_messages_max_ms: number;
  context_messages_limit: number;
  max_messages_per_conversation: number;
  auto_pause_after_human_reply: boolean;
  lock_duration_seconds: number;
  max_retry_attempts: number;
  queue_batch_size: number;
  max_tool_iterations?: number;
  fallback_message: string;
  [key: string]: unknown;
}

export interface AgentConfig {
  id: string;
  name: string;
  system_prompt: string;
  personality_traits: string[];
  target_stages: string[];
  settings: AgentSettings;
  model: string;
  temperature: number;
  max_tokens: number;
}

// Idioma detectado/preferido do lead.
export type LeadLanguage = "pt" | "en";

// Contexto do lead injectado na camada L2 do prompt.
export interface LeadContext {
  lead_id: string;
  nome?: string | null;
  idioma?: LeadLanguage;
  pipeline_fase?: string | null;
  bant_budget?: string | null;
  bant_authority?: string | null;
  bant_need?: string | null;
  bant_timeline?: string | null;
  destino?: string | null;
  nivel?: string | null;
  orcamento?: string | null;
  // Memória curta: resumo já conhecido para não repetir perguntas.
  memoria?: string | null;
}

// Mensagem de fila reclamada (espelho de ai_agent_message_queue, domínio lead).
export interface QueueMessage {
  id: string;
  lead_id: string;
  message_id: string | null;
  conversation_id: string | null;
  agent_id: string | null;
  message_content: string | null;
  attempts: number;
  max_attempts: number;
}
