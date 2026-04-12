CREATE TABLE integration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service, key_name)
);

ALTER TABLE integration_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage integration_keys" ON integration_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration_keys" ON integration_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
