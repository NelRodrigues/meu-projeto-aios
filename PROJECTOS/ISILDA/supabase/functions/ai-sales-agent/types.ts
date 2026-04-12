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
  cadence_steps: Record<string, CadenceStep[]>;
}

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
  cadence_silence_timeout_minutes: number;
  cadence_reactivation_map: Record<string, string>;
  cadence_max_messages_per_hour: number;
  cadence_max_messages_per_day: number;
  fallback_message: string;
}

export interface CadenceStep {
  step_order: number;
  action_type: "ai_message" | "template_message";
  content: string;
  caption?: string;
  delay_minutes: number;
  only_if_no_reply: boolean;
  post_action?: { type: string; target_stage: string };
}

export interface QueueMessage {
  id: string;
  cliente_id: string;
  message_id: string;
  conversation_id: string;
  message_content: string;
  attempts: number;
  max_attempts: number;
}
