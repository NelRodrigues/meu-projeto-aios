CREATE TABLE webhook_processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  payload_hash TEXT
);

CREATE INDEX idx_webhook_processed_msg_id ON webhook_processed_messages(whatsapp_message_id);

ALTER TABLE webhook_processed_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages webhook_processed" ON webhook_processed_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
