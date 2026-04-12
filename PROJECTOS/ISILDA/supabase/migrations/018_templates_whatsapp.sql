CREATE TABLE public.templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'boas_vindas', 'orcamento', 'confirmacao_pedido',
    'lembrete_entrega', 'pos_entrega', 'reactivacao'
  )),
  conteudo TEXT NOT NULL,
  variaveis TEXT[] NOT NULL DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_categoria ON public.templates_whatsapp(categoria);
CREATE INDEX idx_templates_ordem ON public.templates_whatsapp(ordem);

ALTER TABLE public.templates_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visiveis para autenticados" ON public.templates_whatsapp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode inserir templates" ON public.templates_whatsapp FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin pode actualizar templates" ON public.templates_whatsapp FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin pode apagar templates" ON public.templates_whatsapp FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role gere templates" ON public.templates_whatsapp FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.templates_whatsapp (titulo, categoria, conteudo, variaveis, ordem) VALUES
  ('Boas-vindas', 'boas_vindas', 'Ola {{nome}}! Sou a Isilda, da Delicias da Isi. Que bom ter o seu contacto! Fazemos bolos artesanais com muito carinho em Luanda. Como posso ajuda-la hoje?', ARRAY['nome'], 1),
  ('Orcamento recebido', 'orcamento', 'Ola {{nome}}! Recebi o seu pedido de orcamento para {{produto}}. Vou preparar os detalhes e envio-lhe em breve. Tem alguma preferencia especial de sabor ou decoracao?', ARRAY['nome', 'produto'], 2),
  ('Confirmacao de pedido', 'confirmacao_pedido', 'Ola {{nome}}! O seu pedido esta confirmado. Bolo: {{produto}} para o dia {{data_entrega}}. Valor total: {{valor}} Kz. Aguardo o pagamento de 50% para iniciar a producao. Obrigada pela confianca!', ARRAY['nome', 'produto', 'data_entrega', 'valor'], 3),
  ('Lembrete de entrega', 'lembrete_entrega', 'Ola {{nome}}! Lembrando que o seu bolo esta pronto para entrega amanha, dia {{data_entrega}}. Confirme o horario e local de entrega, por favor!', ARRAY['nome', 'data_entrega'], 4),
  ('Pos-entrega', 'pos_entrega', 'Ola {{nome}}! Espero que o bolo tenha encantado toda a gente! Ficaria muito feliz se pudesse partilhar uma foto da festa. O seu feedback e muito importante para mim. Muito obrigada!', ARRAY['nome'], 5),
  ('Reactivacao', 'reactivacao', 'Ola {{nome}}! Ja faz algum tempo que nao nos falamos. Tenho novidades no catalogo e promocoes especiais este mes. Tem algum evento a caminho? Posso ajuda-la a tornar especial!', ARRAY['nome'], 6);
