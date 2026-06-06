-- Migration 024: Seed Catalogo de Produtos — Delicias da Isi
-- Precos reais do Anexo A do Project Brief

-- ============================================================
-- CHANTILLY (bolos clássicos com chantilly)
-- ============================================================

INSERT INTO public.produtos_catalogo (nome, descricao, categoria, tags, preco_base, precos_por_tamanho, tempo_producao_horas, complexidade, activo)
VALUES
(
  'Bolo Chantilly 10cm',
  'Bolo pequeno com chantilly, ideal para celebracoes intimas. Serve até 6 pessoas.',
  'chantilly',
  ARRAY['chantilly', 'pequeno', 'aniversario'],
  13500,
  '{"10cm": 13500}'::jsonb,
  48, 2, true
),
(
  'Bolo Chantilly 14cm',
  'Bolo médio com chantilly. Serve até 15 pessoas.',
  'chantilly',
  ARRAY['chantilly', 'medio', 'aniversario'],
  42000,
  '{"14cm": 42000}'::jsonb,
  48, 2, true
),
(
  'Bolo Chantilly 16cm',
  'Bolo grande com chantilly. Serve até 20 pessoas.',
  'chantilly',
  ARRAY['chantilly', 'grande', 'aniversario', 'festa'],
  49500,
  '{"16cm": 49500}'::jsonb,
  48, 2, true
),
(
  'Bolo Chantilly 18cm',
  'Bolo extra grande com chantilly. Serve até 28 pessoas.',
  'chantilly',
  ARRAY['chantilly', 'extra-grande', 'festa'],
  58500,
  '{"18cm": 58500}'::jsonb,
  48, 2, true
),
(
  'Bolo Chantilly 20cm',
  'Bolo festeiro com chantilly. Serve até 35 pessoas.',
  'chantilly',
  ARRAY['chantilly', 'festeiro', 'aniversario', 'festa'],
  66500,
  '{"20cm": 66500}'::jsonb,
  48, 2, true
);

-- ============================================================
-- ESPECIAIS
-- ============================================================

INSERT INTO public.produtos_catalogo (nome, descricao, categoria, tags, preco_base, precos_por_tamanho, sob_consulta, tempo_producao_horas, complexidade, activo)
VALUES
(
  'Red Velvet Médio',
  'Bolo Red Velvet clássico com cream cheese. Massa aveludada vermelha irresistível. Tamanho médio.',
  'especiais',
  ARRAY['red-velvet', 'cream-cheese', 'especial'],
  32000,
  '{"medio": 32000}'::jsonb,
  false, 72, 3, true
),
(
  'Bolo de Cenoura',
  'Bolo de cenoura artesanal com cobertura de chocolate. Receita especial da Isi.',
  'especiais',
  ARRAY['cenoura', 'chocolate', 'artesanal'],
  42000,
  '{"padrao": 42000}'::jsonb,
  false, 48, 2, true
),
(
  'Bolo Chocolate/Red Velvet',
  'Combinacao irresistível de chocolate e Red Velvet em camadas.',
  'especiais',
  ARRAY['chocolate', 'red-velvet', 'camadas'],
  39500,
  '{"padrao": 39500}'::jsonb,
  false, 72, 3, true
),
(
  'Bolo Nórdico Pequeno',
  'Bolo com design nórdico artesanal. Tamanho pequeno, grande impacto visual.',
  'especiais',
  ARRAY['nordico', 'artesanal', 'design'],
  29500,
  '{"pequeno": 29500}'::jsonb,
  false, 72, 4, true
),
(
  'Naked Cake',
  'Bolo com camadas expostas e decoracao minimalista. Design elegante e natural. A partir de 37.500 Kz.',
  'naked_vintage',
  ARRAY['naked', 'minimalista', 'elegante', 'camadas'],
  37500,
  '{}'::jsonb,
  false, 72, 4, true
),
(
  'Bolo Vintage',
  'Bolo com decoracao vintage retro, flores e detalhes artesanais. A partir de 42.000 Kz.',
  'naked_vintage',
  ARRAY['vintage', 'retro', 'flores', 'artesanal'],
  42000,
  '{}'::jsonb,
  false, 72, 4, true
),
(
  'Bolo Caseiro Pequeno',
  'Bolo caseiro artesanal, sabores variados. Tamanho pequeno, sabor de casa.',
  'especiais',
  ARRAY['caseiro', 'artesanal', 'simples'],
  24000,
  '{"pequeno": 24000}'::jsonb,
  false, 48, 2, true
);

-- ============================================================
-- BENTO CAKES
-- ============================================================

INSERT INTO public.produtos_catalogo (nome, descricao, categoria, tags, preco_base, precos_por_tamanho, tempo_producao_horas, complexidade, activo)
VALUES
(
  'Bento Cake Simples',
  'Mini bolo individual estilo coreano, decoracao simples e elegante. Ideal para mesversarios e momentos especiais.',
  'bento_cake',
  ARRAY['bento', 'coreano', 'mini', 'individual'],
  15500,
  '{"padrao": 15500}'::jsonb,
  48, 2, true
),
(
  'Bento Cake com Papel',
  'Mini bolo bento com decoracao em papel personalizado. Perfeito para mensagens especiais.',
  'bento_cake',
  ARRAY['bento', 'papel', 'personalizado', 'mensagem'],
  17000,
  '{"padrao": 17000}'::jsonb,
  48, 3, true
),
(
  'Bento Cake Ganache Pintura',
  'Mini bolo bento com ganache e pintura artesanal. Arte comestível de alto nível.',
  'bento_cake',
  ARRAY['bento', 'ganache', 'pintura', 'arte'],
  20500,
  '{"padrao": 20500}'::jsonb,
  72, 4, true
),
(
  'Bento Cake Mesversario',
  'Mini bolo especial para mesversario de bebé. Decoracao temática fofa.',
  'bento_cake',
  ARRAY['bento', 'mesversario', 'bebe', 'fofo'],
  16000,
  '{"padrao": 16000}'::jsonb,
  48, 3, true
),
(
  'Bento Cake 3D',
  'Mini bolo bento com elemento 3D artesanal. Criacao única e surpreendente.',
  'bento_cake',
  ARRAY['bento', '3d', 'artesanal', 'unico'],
  31500,
  '{"padrao": 31500}'::jsonb,
  72, 5, true
),
(
  'Mini Bento Vintage',
  'Mini bolo bento com estética vintage delicada. Flores e tons pastéis.',
  'bento_cake',
  ARRAY['bento', 'vintage', 'flores', 'pastel'],
  17500,
  '{"padrao": 17500}'::jsonb,
  48, 3, true
),
(
  'Mini Cake Vintage',
  'Versao mini do bolo vintage clássico. Decoracao intrincada em escala reduzida.',
  'bento_cake',
  ARRAY['mini', 'vintage', 'delicado', 'artesanal'],
  18500,
  '{"padrao": 18500}'::jsonb,
  48, 3, true
);

-- ============================================================
-- DOCES
-- ============================================================

INSERT INTO public.produtos_catalogo (nome, descricao, categoria, tags, preco_base, precos_por_tamanho, tempo_producao_horas, complexidade, activo)
VALUES
(
  'Cupcakes',
  'Cupcakes artesanais com cobertura em chantilly ou buttercream. Decoracao personalizada. Preco por unidade.',
  'doces',
  ARRAY['cupcake', 'individual', 'festa'],
  3000,
  '{"unidade": 3000}'::jsonb,
  24, 2, true
),
(
  'Mini Donuts',
  'Mini donuts artesanais com cobertura e granulado. Venda por duzia. Perfeitos para mesa de doces.',
  'doces',
  ARRAY['donuts', 'mini', 'duzia', 'mesa-de-doces'],
  18500,
  '{"duzia": 18500}'::jsonb,
  24, 2, true
),
(
  'Bolachas Decoradas',
  'Bolachas artesanais decoradas com glacé real. Personalizadas com nomes, datas ou temas. Venda em pack de 6.',
  'doces',
  ARRAY['bolachas', 'decoradas', 'glace', 'personalizado'],
  15000,
  '{"6_unidades": 15000}'::jsonb,
  48, 3, true
),
(
  'Churros',
  'Churros artesanais crocantes. Acompanhados de calda de chocolate ou doce de leite.',
  'doces',
  ARRAY['churros', 'frito', 'chocolate'],
  0,
  '{}'::jsonb,
  24, 1, true
);

-- ============================================================
-- SOB CONSULTA (casamento, andares, especiais)
-- ============================================================

INSERT INTO public.produtos_catalogo (nome, descricao, categoria, tags, preco_base, precos_por_tamanho, sob_consulta, tempo_producao_horas, complexidade, activo)
VALUES
(
  'Bolo de Casamento',
  'Bolo de casamento personalizado com design exclusivo. Sabores e tamanhos a combinar. Orcamento mediante consulta.',
  'casamento',
  ARRAY['casamento', 'exclusivo', 'personalizado', 'elegante'],
  0,
  '{}'::jsonb,
  true, 96, 5, true
),
(
  'Bolo 2 Andares',
  'Bolo de 2 andares para grandes celebracoes. Design e sabores a combinar. Orcamento mediante consulta.',
  'especiais',
  ARRAY['andares', '2-andares', 'grande', 'celebracao'],
  0,
  '{}'::jsonb,
  true, 96, 5, true
),
(
  'Bolo 3 Andares',
  'Bolo imponente de 3 andares. Para eventos especiais que merecem o melhor. Orcamento mediante consulta.',
  'especiais',
  ARRAY['andares', '3-andares', 'imponente', 'evento'],
  0,
  '{}'::jsonb,
  true, 96, 5, true
),
(
  'Bolo de Noivado',
  'Bolo especial para cerimonia de noivado. Elegante e romantico. Orcamento mediante consulta.',
  'casamento',
  ARRAY['noivado', 'romantico', 'elegante', 'especial'],
  0,
  '{}'::jsonb,
  true, 72, 5, true
),
(
  'Bolo Ganache Premium',
  'Bolo com cobertura de ganache de chocolate premium. Acabamento profissional. Orcamento mediante consulta.',
  'especiais',
  ARRAY['ganache', 'premium', 'chocolate', 'profissional'],
  0,
  '{}'::jsonb,
  true, 72, 4, true
),
(
  'Bolo Papel Hóstia',
  'Bolo decorado com papel hóstia personalizado — fotos, logos ou arte. Orcamento mediante consulta.',
  'especiais',
  ARRAY['papel-hostia', 'foto', 'personalizado', 'logo'],
  0,
  '{}'::jsonb,
  true, 72, 4, true
),
(
  'Doces Finos',
  'Seleccao de doces finos para eventos e mesas de doces. Variedade e quantidade a combinar. Orcamento mediante consulta.',
  'doces',
  ARRAY['doces-finos', 'evento', 'mesa-de-doces', 'variedade'],
  0,
  '{}'::jsonb,
  true, 48, 3, true
);
