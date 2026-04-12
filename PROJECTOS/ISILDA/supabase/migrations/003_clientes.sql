CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp_id TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'Luanda',
  estagio TEXT DEFAULT 'novo' CHECK (estagio IN ('novo', 'contactado', 'orcamento', 'activo', 'vip', 'inactivo')),
  origem TEXT DEFAULT 'whatsapp' CHECK (origem IN ('instagram', 'tiktok', 'whatsapp', 'indicacao', 'outro')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  total_pedidos INTEGER DEFAULT 0,
  total_gasto NUMERIC(12,2) DEFAULT 0,
  ticket_medio NUMERIC(12,2) DEFAULT 0,
  ultima_compra TIMESTAMPTZ,
  ultimo_contacto TIMESTAMPTZ,
  etiquetas TEXT[] DEFAULT '{}',
  notas TEXT,
  criado_por_bot BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clientes_telefone_unique UNIQUE (telefone)
);

CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_whatsapp_id ON clientes(whatsapp_id) WHERE whatsapp_id IS NOT NULL;
CREATE INDEX idx_clientes_estagio ON clientes(estagio);
CREATE INDEX idx_clientes_origem ON clientes(origem);
CREATE INDEX idx_clientes_ultima_compra ON clientes(ultima_compra DESC);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read clientes" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clientes" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clientes" ON clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete clientes" ON clientes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role all clientes" ON clientes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
