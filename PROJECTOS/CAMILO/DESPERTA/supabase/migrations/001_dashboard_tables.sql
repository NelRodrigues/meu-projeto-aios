-- ================================================================
-- DESPERTA Dashboard — Schema de Base de Dados
-- Migração 001: Tabelas core do dashboard de implementação
-- ================================================================

-- Tabela: Equipa (responsáveis)
CREATE TABLE IF NOT EXISTS desperta_equipa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  cor TEXT DEFAULT '#1A3A52',
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Semanas
CREATE TABLE IF NOT EXISTS desperta_semanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  periodo TEXT NOT NULL,
  objectivo TEXT,
  fase TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Tarefas
CREATE TABLE IF NOT EXISTS desperta_tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,           -- e.g. '1.1', '2.3', '5.14'
  semana_id UUID REFERENCES desperta_semanas(id),
  seccao TEXT NOT NULL,                  -- e.g. 'Acções Urgentes (Dia 1-2)'
  descricao TEXT NOT NULL,
  responsaveis TEXT,                     -- e.g. 'md', 'dev', 'camilo', 'md+camilo'
  data_prevista TEXT,                    -- e.g. '06-07/04', '12/04'
  bloqueador BOOLEAN DEFAULT FALSE,
  concluida BOOLEAN DEFAULT FALSE,
  concluida_em TIMESTAMPTZ,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Actividade / Log de eventos
CREATE TABLE IF NOT EXISTS desperta_actividade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID REFERENCES desperta_tarefas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('concluida', 'reaberta', 'comentario', 'bloqueio', 'desbloqueio')),
  descricao TEXT,
  autor TEXT,                            -- quem fez a acção
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: KPIs (para tracking futuro)
CREATE TABLE IF NOT EXISTS desperta_kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  indicador TEXT NOT NULL,
  meta TEXT NOT NULL,
  valor_actual TEXT,
  periodo TEXT,                          -- 'implementacao' ou 'execucao'
  categoria TEXT,
  ordem INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- ÍNDICES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_tarefas_semana ON desperta_tarefas(semana_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_concluida ON desperta_tarefas(concluida);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsaveis ON desperta_tarefas(responsaveis);
CREATE INDEX IF NOT EXISTS idx_actividade_tarefa ON desperta_actividade(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_actividade_created ON desperta_actividade(created_at DESC);

-- ================================================================
-- TRIGGER: auto-update updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tarefas_updated
  BEFORE UPDATE ON desperta_tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- TRIGGER: log de actividade ao concluir/reabrir tarefa
-- ================================================================
CREATE OR REPLACE FUNCTION log_tarefa_toggle()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.concluida IS DISTINCT FROM NEW.concluida THEN
    IF NEW.concluida = TRUE THEN
      NEW.concluida_em = now();
      INSERT INTO desperta_actividade (tarefa_id, tipo, descricao)
      VALUES (NEW.id, 'concluida', 'Tarefa marcada como concluída');
    ELSE
      NEW.concluida_em = NULL;
      INSERT INTO desperta_actividade (tarefa_id, tipo, descricao)
      VALUES (NEW.id, 'reaberta', 'Tarefa reaberta');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tarefas_toggle
  BEFORE UPDATE ON desperta_tarefas
  FOR EACH ROW EXECUTE FUNCTION log_tarefa_toggle();

-- ================================================================
-- RLS (Row Level Security) — acesso público para o dashboard
-- ================================================================
ALTER TABLE desperta_equipa ENABLE ROW LEVEL SECURITY;
ALTER TABLE desperta_semanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE desperta_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE desperta_actividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE desperta_kpis ENABLE ROW LEVEL SECURITY;

-- Policies: leitura pública, escrita com service_role
CREATE POLICY "Leitura pública equipa" ON desperta_equipa FOR SELECT USING (true);
CREATE POLICY "Leitura pública semanas" ON desperta_semanas FOR SELECT USING (true);
CREATE POLICY "Leitura pública tarefas" ON desperta_tarefas FOR SELECT USING (true);
CREATE POLICY "Leitura pública actividade" ON desperta_actividade FOR SELECT USING (true);
CREATE POLICY "Leitura pública kpis" ON desperta_kpis FOR SELECT USING (true);

-- Escrita com anon key (dashboard sem auth)
CREATE POLICY "Escrita anon tarefas" ON desperta_tarefas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Insert anon actividade" ON desperta_actividade FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon kpis" ON desperta_kpis FOR UPDATE USING (true) WITH CHECK (true);

-- ================================================================
-- REALTIME: activar para tarefas
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE desperta_tarefas;

-- ================================================================
-- SEED DATA: Equipa
-- ================================================================
INSERT INTO desperta_equipa (codigo, nome, funcao, cor, ordem) VALUES
  ('md', 'Marca Digital', 'Estratégia, Conteúdo, Redes Sociais', '#C4A053', 1),
  ('dev', 'Marca Digital (dev)', 'CRM, Agente IA, Integrações', '#2B7A5F', 2),
  ('camilo', 'Dr. Camilo Ortet', 'CEO & Fundador, Desperta Academy', '#1A3A52', 3),
  ('md+camilo', 'Marca Digital + Camilo', 'Colaboração conjunta', '#5a6a7a', 4)
ON CONFLICT (codigo) DO NOTHING;

-- ================================================================
-- SEED DATA: Semanas
-- ================================================================
INSERT INTO desperta_semanas (numero, titulo, periodo, objectivo, fase, ordem) VALUES
  (1, 'Fundações', '6 — 12 de Abril', 'Correcções urgentes nos canais digitais + setup do CRM + recolha de materiais', 'FUNDAÇÕES', 1),
  (2, 'Organização + Construção', '13 — 19 de Abril', 'Organizar base de clientes + catalogar conteúdo + CRM Sprint 2', 'ORGANIZAÇÃO', 2),
  (3, 'Construção + Activação', '20 — 26 de Abril', 'Reescrita website + optimização LinkedIn/Instagram + CRM Sprint 3', 'CONSTRUÇÃO', 3),
  (4, 'Lançamento', '27 — 30 de Abril', 'Campanha reactivação + conteúdo + validação final + go-live', 'LANÇAMENTO', 4)
ON CONFLICT (numero) DO NOTHING;

-- ================================================================
-- SEED DATA: Tarefas (todas as 60+ tarefas do plano)
-- ================================================================
DO $$
DECLARE
  s1_id UUID; s2_id UUID; s3_id UUID; s4_id UUID;
BEGIN
  SELECT id INTO s1_id FROM desperta_semanas WHERE numero = 1;
  SELECT id INTO s2_id FROM desperta_semanas WHERE numero = 2;
  SELECT id INTO s3_id FROM desperta_semanas WHERE numero = 3;
  SELECT id INTO s4_id FROM desperta_semanas WHERE numero = 4;

  -- ═══ SEMANA 1: FUNDAÇÕES ═══
  INSERT INTO desperta_tarefas (codigo, semana_id, seccao, descricao, responsaveis, data_prevista, bloqueador, ordem) VALUES
    ('1.1', s1_id, 'Acções Urgentes (Dia 1-2)', 'Preencher bio do Instagram @desperta.co', 'md', '06-07/04', false, 1),
    ('1.2', s1_id, 'Acções Urgentes (Dia 1-2)', 'Adicionar link website na bio @desperta.co', 'md', '06-07/04', false, 2),
    ('1.3', s1_id, 'Acções Urgentes (Dia 1-2)', 'Criar 4-5 destaques no Instagram @desperta.co (Sobre, Programas, Testemunhos, Contacto, Resultados)', 'md', '06-07/04', false, 3),
    ('1.4', s1_id, 'Acções Urgentes (Dia 1-2)', 'Actualizar foto de perfil @desperta.co — logo profissional consistente', 'md+camilo', '06-07/04', false, 4),
    ('1.5', s1_id, 'Setup CRM + Agente IA (Dia 1-7)', 'Definir requisitos do CRM Desperta', 'md', '06-08/04', false, 5),
    ('1.6', s1_id, 'Setup CRM + Agente IA (Dia 1-7)', 'Configurar ambiente de desenvolvimento CRM (Next.js + Supabase)', 'dev', '07-08/04', false, 6),
    ('1.7', s1_id, 'Setup CRM + Agente IA (Dia 1-7)', 'Estruturar base de dados: contactos, empresas, pipeline', 'dev', '08-09/04', false, 7),
    ('1.8', s1_id, 'Setup CRM + Agente IA (Dia 1-7)', 'Iniciar desenvolvimento módulo de contactos e empresas (CRUD)', 'dev', '09-12/04', false, 8),
    ('1.9', s1_id, 'Recolha de Materiais (Dia 1-7)', 'Lista completa de clientes históricos (Excel: empresa, contacto, formação, ano)', 'camilo', '09/04', true, 9),
    ('1.10', s1_id, 'Recolha de Materiais (Dia 1-7)', 'Vídeos de palestras/formações existentes', 'camilo', '12/04', false, 10),
    ('1.11', s1_id, 'Recolha de Materiais (Dia 1-7)', 'Fotos de eventos passados', 'camilo', '12/04', false, 11),
    ('1.12', s1_id, 'Recolha de Materiais (Dia 1-7)', 'Testemunhos existentes (escritos ou vídeo)', 'camilo', '12/04', false, 12),
    ('1.13', s1_id, 'Recolha de Materiais (Dia 1-7)', 'Materiais de formação (slides, manuais)', 'camilo', '12/04', false, 13),
    ('1.14', s1_id, 'Recolha de Materiais (Dia 1-7)', 'Logos das empresas onde trabalhou', 'camilo', '12/04', false, 14)
  ON CONFLICT (codigo) DO NOTHING;

  -- ═══ SEMANA 2: ORGANIZAÇÃO + CONSTRUÇÃO ═══
  INSERT INTO desperta_tarefas (codigo, semana_id, seccao, descricao, responsaveis, data_prevista, bloqueador, ordem) VALUES
    ('2.1', s2_id, 'Organização da Base de Clientes', 'Segmentar base de clientes em 3 tiers (Premium / Estratégico / Relacional)', 'md', '13-14/04', false, 15),
    ('2.2', s2_id, 'Organização da Base de Clientes', 'Identificar decisores actuais (podem ter mudado de cargo)', 'md+camilo', '14-15/04', false, 16),
    ('2.3', s2_id, 'Organização da Base de Clientes', 'Criar ficha por cliente no CRM — dados importados', 'md', '15-16/04', false, 17),
    ('2.4', s2_id, 'Catalogação de Conteúdo', 'Catalogar e etiquetar vídeos (tema, duração, qualidade)', 'md', '13-15/04', false, 18),
    ('2.5', s2_id, 'Catalogação de Conteúdo', 'Seleccionar melhores fotos para redes sociais e website', 'md', '13-15/04', false, 19),
    ('2.6', s2_id, 'Catalogação de Conteúdo', 'Transcrever e formatar testemunhos', 'md', '15-17/04', false, 20),
    ('2.7', s2_id, 'Catalogação de Conteúdo', 'Identificar conteúdo reutilizável dos materiais de formação', 'md', '16-18/04', false, 21),
    ('2.8', s2_id, 'CRM — Sprint 2', 'Pipeline de vendas (leads → contacto → proposta → contrato)', 'dev', '13-16/04', false, 22),
    ('2.9', s2_id, 'CRM — Sprint 2', 'Histórico de interacções (chamadas, emails, reuniões)', 'dev', '14-17/04', false, 23),
    ('2.10', s2_id, 'CRM — Sprint 2', 'Importar base de clientes existente no CRM', 'dev', '16-17/04', false, 24),
    ('2.11', s2_id, 'CRM — Sprint 2', 'Integração agente IA — fase 1 (resumos e sugestões)', 'dev', '17-19/04', false, 25)
  ON CONFLICT (codigo) DO NOTHING;

  -- ═══ SEMANA 3: CONSTRUÇÃO + ACTIVAÇÃO ═══
  INSERT INTO desperta_tarefas (codigo, semana_id, seccao, descricao, responsaveis, data_prevista, bloqueador, ordem) VALUES
    ('3.1', s3_id, 'Website — Reescrita Estratégica', 'Reescrever homepage com proposta de valor clara', 'md', '20-21/04', false, 26),
    ('3.2', s3_id, 'Website — Reescrita Estratégica', 'Criar página "Sobre o Fundador" com trajectória + logos', 'md', '21-22/04', false, 27),
    ('3.3', s3_id, 'Website — Reescrita Estratégica', 'Secção de testemunhos com logos de empresas', 'md', '22/04', false, 28),
    ('3.4', s3_id, 'Website — Reescrita Estratégica', 'Reescrever páginas dos 3 programas assinatura', 'md', '22-23/04', false, 29),
    ('3.5', s3_id, 'Website — Reescrita Estratégica', 'Optimizar SEO (títulos, meta descriptions, keywords)', 'md', '23/04', false, 30),
    ('3.6', s3_id, 'Website — Reescrita Estratégica', '"Empresas que confiaram na Desperta" — barra de logos', 'md', '23/04', false, 31),
    ('3.7', s3_id, 'Website — Reescrita Estratégica', 'Formulário de contacto integrado com CRM', 'dev', '23-24/04', false, 32),
    ('3.8', s3_id, 'LinkedIn — Optimização Estratégica', 'Reescrever resumo LinkedIn com narrativa estratégica', 'md', '20-21/04', false, 33),
    ('3.9', s3_id, 'LinkedIn — Optimização Estratégica', 'Artigo inaugural: "25 anos de carreira"', 'md', '21-23/04', false, 34),
    ('3.10', s3_id, 'LinkedIn — Optimização Estratégica', 'Preparar 8 posts para as próximas 4 semanas', 'md', '22-25/04', false, 35),
    ('3.11', s3_id, 'LinkedIn — Optimização Estratégica', 'Optimizar secção de experiência no perfil', 'md', '24/04', false, 36),
    ('3.12', s3_id, 'Instagram + CRM Sprint 3', 'Criar template visual unificado (cores, fontes, layout)', 'md', '20-21/04', false, 37),
    ('3.13', s3_id, 'Instagram + CRM Sprint 3', 'Preparar 12 posts Instagram (3 semanas de conteúdo)', 'md', '21-24/04', false, 38),
    ('3.14', s3_id, 'Instagram + CRM Sprint 3', 'Editar 3-5 reels de vídeos existentes', 'md', '22-25/04', false, 39),
    ('3.15', s3_id, 'Instagram + CRM Sprint 3', 'Definir estratégia de hashtags Angola', 'md', '24/04', false, 40),
    ('3.16', s3_id, 'Instagram + CRM Sprint 3', 'CRM: Dashboard principal funcional', 'dev', '20-23/04', false, 41),
    ('3.17', s3_id, 'Instagram + CRM Sprint 3', 'CRM: Agente IA fase 2 (sugestões + alertas inteligentes)', 'dev', '23-25/04', false, 42),
    ('3.18', s3_id, 'Instagram + CRM Sprint 3', 'CRM: Templates email/WhatsApp prontos', 'dev', '24-25/04', false, 43),
    ('3.19', s3_id, 'Instagram + CRM Sprint 3', 'CRM: Testes internos com dados reais', 'dev', '25-26/04', false, 44)
  ON CONFLICT (codigo) DO NOTHING;

  -- ═══ SEMANA 4: LANÇAMENTO ═══
  INSERT INTO desperta_tarefas (codigo, semana_id, seccao, descricao, responsaveis, data_prevista, bloqueador, ordem) VALUES
    ('4.1', s4_id, 'Campanha de Reactivação de Clientes', 'Tier 1: contacto directo pelo Dr. Camilo (chamada + WhatsApp) — 10-15 contactos', 'md+camilo', '20-26/04', true, 45),
    ('4.2', s4_id, 'Campanha de Reactivação de Clientes', 'Tier 2: email personalizado via CRM para base alargada', 'md', '21-26/04', false, 46),
    ('4.3', s4_id, 'Campanha de Reactivação de Clientes', 'Follow-up Tier 1: mensagem de valor gratuito', 'md', '23-26/04', false, 47),
    ('4.4', s4_id, 'Campanha de Reactivação de Clientes', 'Solicitar testemunhos a clientes que respondem', 'md+camilo', '24-28/04', false, 48),
    ('4.5', s4_id, 'Campanha de Reactivação de Clientes', 'Agendar reuniões com clientes interessados', 'md+camilo', '25-30/04', false, 49),
    ('4.6', s4_id, 'Conteúdo + CRM Sprint 4', 'Publicar 2 posts LinkedIn', 'md', '27-30/04', false, 50),
    ('4.7', s4_id, 'Conteúdo + CRM Sprint 4', 'Publicar 4 posts Instagram @camiloortet', 'md', '27-30/04', false, 51),
    ('4.8', s4_id, 'Conteúdo + CRM Sprint 4', 'Publicar 2 posts Instagram @desperta.co', 'md', '27-30/04', false, 52),
    ('4.9', s4_id, 'Conteúdo + CRM Sprint 4', 'Publicar 1-2 reels', 'md', '27-30/04', false, 53),
    ('4.10', s4_id, 'Conteúdo + CRM Sprint 4', 'Recolher 1-2 testemunhos em vídeo (30-60 seg)', 'camilo', '20-26/04', false, 54),
    ('4.11', s4_id, 'Conteúdo + CRM Sprint 4', 'CRM: Agente IA fase 3 (prospecção + follow-up automático)', 'dev', '27-29/04', false, 55),
    ('4.12', s4_id, 'Conteúdo + CRM Sprint 4', 'Formação do Dr. Camilo no CRM (sessão 1h)', 'md+camilo', '26/04', false, 56),
    ('4.13', s4_id, 'Conteúdo + CRM Sprint 4', 'Registar interacções da campanha no CRM', 'md', '27-30/04', false, 57),
    ('5.1', s4_id, 'Validação e Go-Live', 'Revisão final do website (textos, links, formulários, SEO)', 'md', '27-28/04', false, 58),
    ('5.2', s4_id, 'Validação e Go-Live', 'Revisão final dos perfis de redes sociais', 'md', '28/04', false, 59),
    ('5.3', s4_id, 'Validação e Go-Live', 'Teste end-to-end do CRM', 'dev', '28-29/04', false, 60),
    ('5.4', s4_id, 'Validação e Go-Live', 'Teste do agente de IA', 'dev', '29/04', false, 61),
    ('5.5', s4_id, 'Validação e Go-Live', 'Calendário editorial de Maio (30 dias completos)', 'md', '29-30/04', false, 62),
    ('5.6', s4_id, 'Validação e Go-Live', 'Relatório de resultados da campanha de reactivação', 'md', '30/04', false, 63),
    ('5.7', s4_id, 'Documentação e Preparação', 'Manual de uso do CRM (PDF/vídeo)', 'md', '28-29/04', false, 64),
    ('5.8', s4_id, 'Documentação e Preparação', 'Guia de publicação em redes sociais (brand guide)', 'md', '29/04', false, 65),
    ('5.9', s4_id, 'Documentação e Preparação', 'Kit de prospecção (scripts, templates, sequências)', 'md', '29-30/04', false, 66),
    ('5.10', s4_id, 'Documentação e Preparação', 'Apresentação de resultados ao Dr. Camilo (reunião de encerramento)', 'md', '30/04', false, 67),
    ('5.11', s4_id, 'Documentação e Preparação', 'Metas mensais de prospecção — funil de vendas', 'md', '30/04', false, 68),
    ('5.12', s4_id, 'Documentação e Preparação', 'Calendário de eventos/workshops Q2-Q3', 'md', '30/04', false, 69),
    ('5.13', s4_id, 'Documentação e Preparação', 'Oportunidades mídia tradicional para Maio', 'md', '30/04', false, 70),
    ('5.14', s4_id, 'Documentação e Preparação', 'Roadmap expansão PALOP (Moçambique)', 'md', '30/04', false, 71)
  ON CONFLICT (codigo) DO NOTHING;
END $$;

-- ================================================================
-- SEED DATA: KPIs
-- ================================================================
INSERT INTO desperta_kpis (indicador, meta, periodo, categoria, ordem) VALUES
  ('Website reescrito e optimizado', '100% das páginas prioritárias', 'implementacao', 'digital', 1),
  ('CRM operacional com agente IA', 'Go-live até 30/04', 'implementacao', 'tech', 2),
  ('Base de clientes importada e segmentada', '100% dos contactos', 'implementacao', 'clientes', 3),
  ('Clientes Tier 1 contactados', '100%', 'implementacao', 'clientes', 4),
  ('Clientes com resposta positiva', '≥30%', 'implementacao', 'clientes', 5),
  ('Reuniões agendadas com ex-clientes', '≥10', 'implementacao', 'clientes', 6),
  ('Testemunhos recolhidos', '≥5', 'implementacao', 'conteudo', 7),
  ('Posts LinkedIn publicados', '≥6', 'implementacao', 'conteudo', 8),
  ('Posts Instagram publicados', '≥16', 'implementacao', 'conteudo', 9),
  ('Calendário editorial Maio preparado', '30 dias completos', 'implementacao', 'conteudo', 10),
  ('Seguidores Instagram @camiloortet', '+200/mês → 1.500+ total', 'execucao', 'social', 11),
  ('Conexões LinkedIn', '+100/mês → 800+ total', 'execucao', 'social', 12),
  ('Leads gerados (CRM)', '15-20/mês → 50+', 'execucao', 'vendas', 13),
  ('Propostas enviadas', '5-8/mês → 18+', 'execucao', 'vendas', 14),
  ('Contratos fechados', '2-3/mês → 6-8', 'execucao', 'vendas', 15),
  ('Taxa conversão pipeline', '≥20% → ≥25%', 'execucao', 'vendas', 16),
  ('NPS clientes', '≥8/10 → ≥8.5/10', 'execucao', 'qualidade', 17)
ON CONFLICT DO NOTHING;
