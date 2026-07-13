-- ============================================================================
-- Migração 016 — Seed do catálogo: parceiros → destinos → programas
-- ----------------------------------------------------------------------------
-- Porquê: a story 2.2 (Épico 2) exige o catálogo semeado com os parceiros e
-- destinos REAIS enviados pelo cliente Global Minds, para que o agente (E3) e a
-- equipa citem sempre informação correcta (faixas de custo, moedas, brochuras).
--
-- REGRA CRÍTICA — SEM FALLBACKS (extraction-no-fallbacks): só se preenche o que
-- temos evidência do cliente. Campos sem dado ficam NULL, NUNCA valores
-- inventados. `comissao_percent`, `website`, `brochura_url` = NULL onde o cliente
-- não forneceu. Faixas de custo só onde há dado real.
--
-- Nota sobre a contagem: a story 2.2 (§Testing) previa `count(parceiros)=10`
-- tratando "U.Europeia/IADE/IPAM" como um grupo. O cliente forneceu, porém, 12
-- entidades DISTINTAS (as três universidades portuguesas são instituições
-- separadas com destinos próprios). Semeamos as 12 como parceiros distintos —
-- é o dado honesto. A verificação pós-seed usa `count(parceiros)=12`.
--
-- Idempotência: cada INSERT usa NOT EXISTS por nome/chave natural, por isso a
-- migração pode correr mais de uma vez sem duplicar. O rollback apaga por nome.
--
-- Fonte vinculativa: Arquitectura §2.5 (colunas), §3 linha 016 (seed),
-- brief da story 2.2 (lista de parceiros/destinos/faixas reais).
-- Dependência: migração 008 (cria parceiros/destinos/programas).
-- ============================================================================


-- ── PARCEIROS (12 entidades reais; comissão/website/brochura = NULL sem dado) ──
INSERT INTO public.parceiros (nome, tipo, comissao_percent, website, brochura_url, notas)
SELECT v.nome, v.tipo, NULL, NULL, NULL, v.notas
FROM (VALUES
  ('Kaplan',                        'rede/pathway',            'Rede internacional de pathways e cursos de línguas'),
  ('INTO',                          'pathway universitário',   'Pathways universitários (foundation, pré-mestrado)'),
  ('MPW',                           'colégio/foundation',      'Colégio; programas foundation'),
  ('Inspired',                      'summer camps',            'Summer camps internacionais'),
  ('International House Cape Town',  'escola de línguas',       'Escola de línguas na Cidade do Cabo (África do Sul)'),
  ('SAMIAD',                        'summer camp',             'Summer camp no Reino Unido'),
  ('Universidade Europeia',         'universidade',            'Universidade em Portugal'),
  ('IADE',                          'universidade',            'Universidade em Portugal (design/criativo)'),
  ('IPAM',                          'universidade',            'Universidade em Portugal (marketing/gestão)'),
  ('Global Education Alliance',     'aliança',                 'Aliança de educação (GEA)'),
  ('Xior Student Housing',          'alojamento',              'Alojamento estudantil'),
  ('EDU4WORD',                      'cursos de verão',         'Cursos de verão')
) AS v(nome, tipo, notas)
WHERE NOT EXISTS (
  SELECT 1 FROM public.parceiros p WHERE p.nome = v.nome
);


-- ── DESTINOS (top-6; custo de vida só onde há dado real, senão NULL) ──────────
-- Associação a parceiros: ligamos cada destino ao parceiro mais óbvio pela
-- geografia conhecida. Onde a associação é incerta, o destino fica com
-- parceiro_id NULL (a coluna permite NULL) e o comentário regista a incerteza.
--
-- Custo de vida MENSAL com dado real (brief):
--   África do Sul  → USD 600-1200
--   Portugal       → EUR 750-1300
--   Reino Unido    → GBP 1100-1800
--   EAU / EUA / China → sem dado → NULL

-- África do Sul — IH Cape Town opera aqui (Cidade do Cabo).
INSERT INTO public.destinos (parceiro_id, pais, cidade, custo_vida_faixa, custo_vida_currency, notas)
SELECT p.id, 'África do Sul', 'Cidade do Cabo', '600-1200', 'USD',
       'Custo de vida mensal estimado (brief cliente)'
FROM public.parceiros p
WHERE p.nome = 'International House Cape Town'
  AND NOT EXISTS (SELECT 1 FROM public.destinos d WHERE d.pais = 'África do Sul' AND d.cidade = 'Cidade do Cabo');

-- Portugal — Universidade Europeia (Lisboa). IADE/IPAM também operam em Portugal,
-- mas semeamos um único destino "Portugal/Lisboa" âncora ligado à U.Europeia; os
-- destinos específicos de IADE/IPAM podem ser criados pela equipa na UI.
INSERT INTO public.destinos (parceiro_id, pais, cidade, custo_vida_faixa, custo_vida_currency, notas)
SELECT p.id, 'Portugal', 'Lisboa', '750-1300', 'EUR',
       'Custo de vida mensal estimado (brief cliente)'
FROM public.parceiros p
WHERE p.nome = 'Universidade Europeia'
  AND NOT EXISTS (SELECT 1 FROM public.destinos d WHERE d.pais = 'Portugal' AND d.cidade = 'Lisboa');

-- Reino Unido — MPW/INTO/SAMIAD operam aqui. Ligamos à MPW (foundation/colégio)
-- como parceiro âncora; cidade desconhecida com precisão → NULL.
INSERT INTO public.destinos (parceiro_id, pais, cidade, custo_vida_faixa, custo_vida_currency, notas)
SELECT p.id, 'Reino Unido', NULL, '1100-1800', 'GBP',
       'Custo de vida mensal estimado (brief cliente). Cidade não especificada.'
FROM public.parceiros p
WHERE p.nome = 'MPW'
  AND NOT EXISTS (SELECT 1 FROM public.destinos d WHERE d.pais = 'Reino Unido');

-- Emirados Árabes Unidos — sem parceiro/cidade/custo confirmados → NULLs.
INSERT INTO public.destinos (parceiro_id, pais, cidade, custo_vida_faixa, custo_vida_currency, notas)
SELECT NULL, 'Emirados Árabes Unidos', NULL, NULL, NULL,
       'Destino top-6 (brief). Parceiro e custo de vida ainda sem dado — a preencher pela equipa.'
WHERE NOT EXISTS (SELECT 1 FROM public.destinos d WHERE d.pais = 'Emirados Árabes Unidos');

-- Estados Unidos — Kaplan opera nos EUA (rede/pathway). Cidade/custo → NULL.
INSERT INTO public.destinos (parceiro_id, pais, cidade, custo_vida_faixa, custo_vida_currency, notas)
SELECT p.id, 'Estados Unidos', NULL, NULL, NULL,
       'Destino top-6 (brief). Custo de vida sem dado — a preencher pela equipa.'
FROM public.parceiros p
WHERE p.nome = 'Kaplan'
  AND NOT EXISTS (SELECT 1 FROM public.destinos d WHERE d.pais = 'Estados Unidos');

-- China — sem parceiro/cidade/custo confirmados → NULLs.
INSERT INTO public.destinos (parceiro_id, pais, cidade, custo_vida_faixa, custo_vida_currency, notas)
SELECT NULL, 'China', NULL, NULL, NULL,
       'Destino top-6 (brief). Parceiro e custo de vida ainda sem dado — a preencher pela equipa.'
WHERE NOT EXISTS (SELECT 1 FROM public.destinos d WHERE d.pais = 'China');


-- ── PROGRAMAS-TIPO (faixas reais do brief; currency EUR; comissao_percent NULL) ──
-- Cada programa é ligado ao destino mais plausível. Onde a associação é incerta,
-- regista-se num comentário. duracao/brochura/link = NULL onde sem dado.

-- Summer Camp 1600-2000 — via SAMIAD/Inspired (summer camps). Ligado ao Reino
-- Unido (SAMIAD opera no RU). INCERTEZA: podia também ser destino genérico.
INSERT INTO public.programas (destino_id, nome, tipo, custo_min, custo_max, currency, comissao_percent, duracao, brochura_url, link)
SELECT d.id, 'Summer Camp', 'summer_camp', 1600, 2000, 'EUR', NULL, NULL, NULL, NULL
FROM public.destinos d
WHERE d.pais = 'Reino Unido'
  AND NOT EXISTS (SELECT 1 FROM public.programas pr WHERE pr.nome = 'Summer Camp' AND pr.tipo = 'summer_camp');

-- Curso de Inglês 6 meses 6000-18000 — ligado à África do Sul (IH Cape Town,
-- escola de línguas). duracao conhecida: "6 meses".
INSERT INTO public.programas (destino_id, nome, tipo, custo_min, custo_max, currency, comissao_percent, duracao, brochura_url, link)
SELECT d.id, 'Curso de Inglês (6 meses)', 'linguas', 6000, 18000, 'EUR', NULL, '6 meses', NULL, NULL
FROM public.destinos d
WHERE d.pais = 'África do Sul'
  AND NOT EXISTS (SELECT 1 FROM public.programas pr WHERE pr.nome = 'Curso de Inglês (6 meses)' AND pr.tipo = 'linguas');

-- Foundation 18000-35000 — ligado ao Reino Unido (MPW/INTO fazem foundation).
INSERT INTO public.programas (destino_id, nome, tipo, custo_min, custo_max, currency, comissao_percent, duracao, brochura_url, link)
SELECT d.id, 'Foundation', 'foundation', 18000, 35000, 'EUR', NULL, NULL, NULL, NULL
FROM public.destinos d
WHERE d.pais = 'Reino Unido'
  AND NOT EXISTS (SELECT 1 FROM public.programas pr WHERE pr.nome = 'Foundation' AND pr.tipo = 'foundation');

-- Licenciatura 19000-70000 — ligado a Portugal (U.Europeia/IADE/IPAM).
INSERT INTO public.programas (destino_id, nome, tipo, custo_min, custo_max, currency, comissao_percent, duracao, brochura_url, link)
SELECT d.id, 'Licenciatura', 'licenciatura', 19000, 70000, 'EUR', NULL, NULL, NULL, NULL
FROM public.destinos d
WHERE d.pais = 'Portugal' AND d.cidade = 'Lisboa'
  AND NOT EXISTS (SELECT 1 FROM public.programas pr WHERE pr.nome = 'Licenciatura' AND pr.tipo = 'licenciatura');

-- Mestrado 5700-40000 — ligado a Portugal (U.Europeia/IADE/IPAM).
INSERT INTO public.programas (destino_id, nome, tipo, custo_min, custo_max, currency, comissao_percent, duracao, brochura_url, link)
SELECT d.id, 'Mestrado', 'mestrado', 5700, 40000, 'EUR', NULL, NULL, NULL, NULL
FROM public.destinos d
WHERE d.pais = 'Portugal' AND d.cidade = 'Lisboa'
  AND NOT EXISTS (SELECT 1 FROM public.programas pr WHERE pr.nome = 'Mestrado' AND pr.tipo = 'mestrado');


-- ============================================================================
-- ROLLBACK (idempotente — apaga por chave natural, ordem filhos→pais):
--   DELETE FROM public.programas WHERE nome IN
--     ('Summer Camp','Curso de Inglês (6 meses)','Foundation','Licenciatura','Mestrado');
--   DELETE FROM public.destinos WHERE pais IN
--     ('África do Sul','Portugal','Reino Unido','Emirados Árabes Unidos','Estados Unidos','China');
--   DELETE FROM public.parceiros WHERE nome IN
--     ('Kaplan','INTO','MPW','Inspired','International House Cape Town','SAMIAD',
--      'Universidade Europeia','IADE','IPAM','Global Education Alliance',
--      'Xior Student Housing','EDU4WORD');
-- ============================================================================
