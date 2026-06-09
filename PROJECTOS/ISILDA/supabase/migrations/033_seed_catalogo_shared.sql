-- Migration 033: Seed produtos_catalogo para o tenant Isilda (modo SHARED)
--
-- Precos OFICIAIS alinhados com a KB corrigida (2026-06-09):
--   14cm 42.000 / 16cm 50.000 / 18cm 58.500 / 20cm 66.500 / 22cm 78.500
--   Bento Cake simples a partir de 15.500 Kz
--
-- tenant_id da Isilda no SIC GERAL: 81bc8777-39f3-477a-8ad6-44f9dcf1eca8
-- Idempotente: nao reinsere se ja existir produto com o mesmo nome para o tenant.

INSERT INTO public.produtos_catalogo
  (tenant_id, nome, categoria, descricao, preco_base, precos_por_tamanho, sob_consulta, tempo_producao_horas, complexidade, activo)
SELECT v.tenant_id, v.nome, v.categoria, v.descricao, v.preco_base, v.precos_por_tamanho, v.sob_consulta, v.tempo, v.complexidade, true
FROM (VALUES
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Bolo Redondo em Chantilly', 'chantilly',
   'Bolo redondo decorado em chantilly. Precos iniciais por tamanho; variam conforme acabamentos e personalizacao.',
   42000::numeric, '{"14cm":42000,"16cm":50000,"18cm":58500,"20cm":66500,"22cm":78500}'::jsonb, false, 120, 3),
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Bento Cake Simples', 'bento_cake',
   'Bento cake (chantilly ou ganache). Massa: Baunilha ou Chocolate. Recheio: Doce de leite. Decoracao simples (frases, desenhos).',
   15500::numeric, '{}'::jsonb, false, 48, 2),
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Bolo em Ganache (detalhes simples)', 'especiais',
   'Bolo em ganache com detalhes simples. Antecedencia minima 7 dias.', NULL::numeric, '{}'::jsonb, true, 168, 4),
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Bolo de Andares', 'casamento',
   'Bolo de andares com modelagens ou flores. Antecedencia minima 15 dias.', NULL::numeric, '{}'::jsonb, true, 360, 5),
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Bolo de Casamento', 'casamento',
   'Bolo de casamento personalizado. Antecedencia minima 1 mes.', NULL::numeric, '{}'::jsonb, true, 720, 5),
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Cupcakes', 'doces',
   'Cupcakes artesanais para festas e eventos.', NULL::numeric, '{}'::jsonb, true, 48, 2),
  ('81bc8777-39f3-477a-8ad6-44f9dcf1eca8'::uuid, 'Doces para Festas', 'doces',
   'Doces variados para festas e eventos (brigadeiros, beijinhos, etc.).', NULL::numeric, '{}'::jsonb, true, 48, 2)
) AS v(tenant_id, nome, categoria, descricao, preco_base, precos_por_tamanho, sob_consulta, tempo, complexidade)
WHERE NOT EXISTS (
  SELECT 1 FROM public.produtos_catalogo p
  WHERE p.tenant_id = v.tenant_id AND p.nome = v.nome
);
