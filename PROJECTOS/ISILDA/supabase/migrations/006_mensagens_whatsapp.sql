CREATE TABLE mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('cliente', 'bot', 'humano', 'sistema')),
  conteudo TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing', 'internal')),
  message_status TEXT DEFAULT 'sent' CHECK (message_status IN ('sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT,
  media_url TEXT,
  media_type TEXT,
  intencao_classificada TEXT,
  confianca_classificacao NUMERIC(3,2),
  llm_model TEXT,
  llm_tokens_input INTEGER,
  llm_tokens_output INTEGER,
  llm_latencia_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_msgs_whatsapp_id ON mensagens_whatsapp(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX idx_msgs_cliente ON mensagens_whatsapp(cliente_id);
CREATE INDEX idx_msgs_created ON mensagens_whatsapp(created_at DESC);
CREATE INDEX idx_msgs_direction ON mensagens_whatsapp(direction) WHERE direction = 'incoming';

ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read mensagens" ON mensagens_whatsapp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert mensagens" ON mensagens_whatsapp FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update mensagens" ON mensagens_whatsapp FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role all mensagens" ON mensagens_whatsapp FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
