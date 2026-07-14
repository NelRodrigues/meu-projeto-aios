-- ============================================================================
-- Migração 026 — RFV + análise 80/20 (Pareto) por destino  (story 2.7)
-- ----------------------------------------------------------------------------
-- Porquê: o Rinaldo precisa de saber que clientes e que destinos rendem mais,
-- para focar comunicação e esforço comercial no que dá resultado. Entrega:
--   • `v_rfv_leads`         — matriz RFV por lead (Recência/Frequência/Valor),
--     scores/quintis por dimensão e um segmento textual defensável.
--   • `v_destinos_receita`  — receita por destino com % acumulada (Pareto 80/20).
-- Ambas são MATERIALIZED VIEWS refrescadas por cron diário (E4) — NUNCA
-- calculadas em tempo real por pedido.
--
-- ── Nota de NUMERAÇÃO (desvio registado) ────────────────────────────────────
-- A Arquitectura §3 (escrita antes do código) mapeava estas views à migração
-- `013_views_rfv.sql`. Mas a série REAL do repositório nunca materializou
-- 011–015: a sequência aplicada é 001–003, 008–010, 016–024 e a 025 (financeiro,
-- criada imediatamente antes desta). A próxima livre é a **026** — este ficheiro.
-- O conteúdo segue §2.5 (RFV = view materializada, sem colunas persistidas em
-- `leads`); só o número muda. Esta migração DEPENDE da 025 (financeiro) para a
-- dimensão Valor: sem `financeiro.contravalor_aoa`/`financeiro.lead_id` não compila.
--
-- ── Alinhamento com o CÓDIGO real (o código ganha sobre a arquitectura) ──────
--  • Acesso só-admin: materialized views NÃO herdam a RLS da tabela-fonte
--    (`financeiro`, só-admin §8.1). §2.5 sugeria "RLS na view OU wrapper". Em
--    Postgres NÃO se pode `ENABLE ROW LEVEL SECURITY` sobre uma MATERIALIZED
--    VIEW (só sobre tabelas). Por isso a escolha ROBUSTA e portável é:
--      1. REVOKE de leitura a `anon`/`authenticated` nas duas MVs;
--      2. funções wrapper `SECURITY DEFINER` (`get_rfv_leads`,
--         `get_destinos_receita`) que verificam `public.current_user_is_admin()`
--         (função da migração 003) e SÓ devolvem linhas se admin, senão RAISE.
--    A UI/hook consomem via RPC a estas funções, NUNCA por SELECT directo à MV.
--    É o mesmo predicado admin que `financeiro` usa (`is_admin(auth.uid())`).
--  • Recência: MAIOR data entre última mensagem/interacao/mudança de estágio/
--    candidatura do lead. É a MESMA régua que o compliance de inactividade deve
--    usar (deixada explícita e comentada abaixo — PENDENTE-1 de 14/07).
--  • Sem CREATE TYPE para segmento (estilo fechado do repo): TEXT + CHECK lógico
--    documentado. Sem ALTER a `leads` (decisão da arquitectura — zero
--    desnormalização de RFV).
--
-- Dependências: 002 (`leads`, `interacoes`, `mudancas_estagio`,
-- `mensagens_whatsapp`), 003 (`current_user_is_admin`/`is_admin`), 008
-- (`destinos`, `programas`), 009 (`candidaturas`), 025 (`financeiro`).
--
-- Fonte vinculativa: Arquitectura §2.5 (RFV/80-20), §4.2 (cron `refresh-rfv`),
-- §8.1 (acesso só-admin a valores monetários agregados).
-- ============================================================================


-- ── Log de refresh (a UI mostra "último refresh") ────────────────────────────
-- Tabela leve: uma linha por execução de `refresh_rfv()`. A UI lê o MAX(refreshed_at).
CREATE TABLE IF NOT EXISTS public.rfv_refresh_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duracao_ms INTEGER,          -- tempo de execução do refresh (observabilidade)
  origem TEXT                  -- 'manual' | 'cron' | 'seed'
);


-- ============================================================================
-- v_rfv_leads — matriz RFV por lead
-- ----------------------------------------------------------------------------
-- Recência (R): MAIOR (mais recente) data entre —
--     última `mensagens_whatsapp.created_at` do lead,
--     última `interacoes.created_at` do lead,
--     última `mudancas_estagio.created_at` do lead,
--     última das candidaturas do lead (MAX de `fase_desde`/`created_at`).
--   Guardamos `ultima_actividade` (timestamptz) e `recencia_dias` (dias desde
--   essa data até agora). Menos dias = mais recente = MELHOR recência.
--   ⚠ MESMA régua do compliance de inactividade: um lead é "inactivo" quando
--   `recencia_dias` ultrapassa o limite de retenção. Reutilizar ESTA definição
--   evita duas medidas divergentes de "último contacto".
--
-- Frequência (F): nº de `candidaturas` do lead. Mais candidaturas = MELHOR.
--
-- Valor (V): SOMA de `financeiro.contravalor_aoa` dos registos ligados ao lead
--   via `financeiro.lead_id` (coluna real da migração 025). Registos com
--   `contravalor_aoa` NULL NÃO contam (regra no-fallbacks — nunca inventar AOA;
--   nunca misturar moedas: só o contravalor AOA agrega). Mais AOA = MELHOR.
--
-- Scores/quintis (1..5) por `ntile(5)` sobre cada dimensão. Nota de convenção:
--   • r_score: quintil por recência com 5 = MAIS recente (ordenado por
--     `recencia_dias` ASC → o quintil mais baixo de dias recebe 5).
--   • f_score / v_score: 5 = mais alto (ordenado DESC).
--   Leads sem qualquer sinal de valor entram na mesma; o ntile distribui em
--   grupos aproximadamente iguais sobre a carteira presente.
--
-- Segmento (régua simples e defensável, avaliada por ordem):
--   'novo'      → sem candidaturas E sem valor (F=0 e V=0): ainda não há relação.
--   'campeao'   → r_score>=4 E f_score>=4 E v_score>=4: recente, frequente, rende.
--   'em_risco'  → v_score>=4 (rende) MAS r_score<=2 (há muito sem contacto).
--   'inactivo'  → r_score<=2 E NÃO 'em_risco' (frio, sem valor alto em jogo).
--   'regular'   → tudo o resto (relação viva sem se destacar).
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_rfv_leads AS
WITH recencia AS (
  SELECT l.id AS lead_id,
         GREATEST(
           COALESCE((SELECT MAX(m.created_at) FROM public.mensagens_whatsapp m WHERE m.lead_id = l.id), 'epoch'::timestamptz),
           COALESCE((SELECT MAX(i.created_at) FROM public.interacoes i WHERE i.lead_id = l.id), 'epoch'::timestamptz),
           COALESCE((SELECT MAX(me.created_at) FROM public.mudancas_estagio me WHERE me.lead_id = l.id), 'epoch'::timestamptz),
           COALESCE((SELECT MAX(GREATEST(c.fase_desde, c.created_at)) FROM public.candidaturas c WHERE c.lead_id = l.id), 'epoch'::timestamptz),
           COALESCE(l.created_at, 'epoch'::timestamptz)
         ) AS ultima_actividade
  FROM public.leads l
),
frequencia AS (
  SELECT l.id AS lead_id,
         (SELECT COUNT(*) FROM public.candidaturas c WHERE c.lead_id = l.id) AS n_candidaturas
  FROM public.leads l
),
valor AS (
  -- Só contravalor_aoa NÃO-NULL agrega (nunca inventa AOA; só AOA soma).
  SELECT l.id AS lead_id,
         COALESCE((
           SELECT SUM(f.contravalor_aoa)
           FROM public.financeiro f
           WHERE f.lead_id = l.id AND f.contravalor_aoa IS NOT NULL
         ), 0)::numeric(16,2) AS valor_aoa
  FROM public.leads l
),
base AS (
  SELECT l.id AS lead_id,
         l.nome AS lead_nome,
         l.estagio,
         r.ultima_actividade,
         GREATEST(0, (CURRENT_DATE - r.ultima_actividade::date))::integer AS recencia_dias,
         fr.n_candidaturas,
         v.valor_aoa
  FROM public.leads l
  JOIN recencia r  ON r.lead_id  = l.id
  JOIN frequencia fr ON fr.lead_id = l.id
  JOIN valor v     ON v.lead_id  = l.id
),
scored AS (
  SELECT b.*,
         -- 5 = MAIS recente (menor recencia_dias). ntile ASC sobre dias → invertemos.
         (6 - ntile(5) OVER (ORDER BY b.recencia_dias ASC))::smallint AS r_score,
         ntile(5) OVER (ORDER BY b.n_candidaturas ASC)::smallint      AS f_score,
         ntile(5) OVER (ORDER BY b.valor_aoa ASC)::smallint           AS v_score
  FROM base b
)
SELECT s.lead_id,
       s.lead_nome,
       s.estagio,
       s.ultima_actividade,
       s.recencia_dias,
       s.n_candidaturas,
       s.valor_aoa,
       s.r_score,
       s.f_score,
       s.v_score,
       CASE
         WHEN s.n_candidaturas = 0 AND s.valor_aoa = 0            THEN 'novo'
         WHEN s.r_score >= 4 AND s.f_score >= 4 AND s.v_score >= 4 THEN 'campeao'
         WHEN s.v_score >= 4 AND s.r_score <= 2                    THEN 'em_risco'
         WHEN s.r_score <= 2                                       THEN 'inactivo'
         ELSE 'regular'
       END AS segmento
FROM scored s;

-- Índice ÚNICO sobre lead_id → habilita `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
CREATE UNIQUE INDEX IF NOT EXISTS uq_v_rfv_leads_lead ON public.v_rfv_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_v_rfv_leads_segmento ON public.v_rfv_leads(segmento);


-- ============================================================================
-- v_destinos_receita — receita por destino + % acumulada (Pareto 80/20)
-- ----------------------------------------------------------------------------
-- Cadeia: financeiro → candidaturas → programas → destinos.
--   financeiro.candidatura_id → candidaturas.id
--   candidaturas.programa_id  → programas.id
--   programas.destino_id      → destinos.id
-- Receita = SUM(financeiro.contravalor_aoa) por destino (só NÃO-NULL agrega).
-- `pct_acumulada` (0..100) ordenada por receita desc: o primeiro destino cujo
-- `pct_acumulada` >= 80 fecha o "core 80%" (marca do corte de Pareto na UI).
-- Registos sem destino resolúvel (sem candidatura/programa/destino) ficam de
-- fora — não há a quem imputar a receita.
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_destinos_receita AS
WITH receita_destino AS (
  SELECT d.id AS destino_id,
         d.pais,
         d.cidade,
         SUM(f.contravalor_aoa)::numeric(16,2) AS receita_aoa,
         COUNT(f.id) AS n_registos
  FROM public.financeiro f
  JOIN public.candidaturas c ON c.id = f.candidatura_id
  JOIN public.programas p    ON p.id = c.programa_id
  JOIN public.destinos d     ON d.id = p.destino_id
  WHERE f.contravalor_aoa IS NOT NULL
  GROUP BY d.id, d.pais, d.cidade
),
total AS (
  SELECT COALESCE(SUM(receita_aoa), 0)::numeric(16,2) AS receita_total FROM receita_destino
)
SELECT rd.destino_id,
       rd.pais,
       rd.cidade,
       rd.receita_aoa,
       rd.n_registos,
       CASE WHEN t.receita_total > 0
            THEN ROUND((rd.receita_aoa / t.receita_total) * 100, 2)
            ELSE 0 END AS pct_receita,
       CASE WHEN t.receita_total > 0
            THEN ROUND(
                   (SUM(rd.receita_aoa) OVER (ORDER BY rd.receita_aoa DESC
                                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                    / t.receita_total) * 100, 2)
            ELSE 0 END AS pct_acumulada
FROM receita_destino rd
CROSS JOIN total t
ORDER BY rd.receita_aoa DESC;

-- Índice ÚNICO sobre destino_id → habilita REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS uq_v_destinos_receita_destino ON public.v_destinos_receita(destino_id);


-- ============================================================================
-- ACESSO SÓ-ADMIN — REVOKE + wrappers SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- Materialized views não têm RLS. Fechamos a leitura directa e expomos os dados
-- SÓ via funções que verificam admin (mesmo predicado que `financeiro`, §8.1).
-- ============================================================================
REVOKE ALL ON public.v_rfv_leads FROM anon, authenticated;
REVOKE ALL ON public.v_destinos_receita FROM anon, authenticated;
-- `rfv_refresh_log`: só o wrapper/serviço lê; nada de leitura directa por role de app.
ALTER TABLE public.rfv_refresh_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfv_refresh_log_admin_read" ON public.rfv_refresh_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "rfv_refresh_log_service" ON public.rfv_refresh_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- get_rfv_leads() — devolve a matriz RFV só a admin; senão RAISE (não vaza dados).
CREATE OR REPLACE FUNCTION public.get_rfv_leads()
RETURNS SETOF public.v_rfv_leads
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: RFV é visível apenas a administradores'
      USING ERRCODE = '42501';   -- insufficient_privilege
  END IF;
  RETURN QUERY SELECT * FROM public.v_rfv_leads;
END;
$$;

-- get_destinos_receita() — idem para o Pareto 80/20 de destinos.
CREATE OR REPLACE FUNCTION public.get_destinos_receita()
RETURNS SETOF public.v_destinos_receita
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: a receita por destino é visível apenas a administradores'
      USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_destinos_receita ORDER BY receita_aoa DESC;
END;
$$;

-- get_rfv_last_refresh() — data do último refresh (a UI mostra-a). Só admin.
CREATE OR REPLACE FUNCTION public.get_rfv_last_refresh()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT MAX(refreshed_at) FROM public.rfv_refresh_log);
END;
$$;

-- Só `authenticated` (a sessão do browser) pode INVOCAR os wrappers; o check de
-- admin acontece DENTRO da função. anon fica de fora.
REVOKE ALL ON FUNCTION public.get_rfv_leads()        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_destinos_receita() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_rfv_last_refresh()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rfv_leads()        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_destinos_receita() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_rfv_last_refresh()  TO authenticated, service_role;


-- ============================================================================
-- refresh_rfv(origem) — refresca as duas MVs e regista no log
-- ----------------------------------------------------------------------------
-- Usa CONCURRENTLY (índices únicos existem) para não bloquear leituras. A 1ª
-- execução após criar as MVs pode ter de ser NÃO-concurrent se a MV nunca foi
-- populada; tratamos essa condição com fallback para refresh normal.
-- Assinatura compatível com o cron `refresh-rfv` do E4 (chama sem argumentos ou
-- com 'cron'). SECURITY DEFINER: corre com privilégios de owner (dono das MVs).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_rfv(p_origem TEXT DEFAULT 'manual')
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ := clock_timestamp();
  v_now    TIMESTAMPTZ;
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_rfv_leads;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_destinos_receita;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: MV ainda não populada (CONCURRENTLY exige população prévia).
    REFRESH MATERIALIZED VIEW public.v_rfv_leads;
    REFRESH MATERIALIZED VIEW public.v_destinos_receita;
  END;

  v_now := now();
  INSERT INTO public.rfv_refresh_log (refreshed_at, duracao_ms, origem)
  VALUES (v_now,
          (EXTRACT(EPOCH FROM (clock_timestamp() - v_inicio)) * 1000)::integer,  -- duração em ms
          COALESCE(p_origem, 'manual'));
  RETURN v_now;
END;
$$;

-- Só service_role (a rota admin usa a service key) invoca o refresh. A rota já
-- faz `requireAuth(..., {requireAdmin:true})` como defesa em profundidade.
REVOKE ALL ON FUNCTION public.refresh_rfv(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_rfv(TEXT) TO service_role;

-- Popular à cabeça (as MVs foram criadas com WITH NO DATA implícito só se vazias;
-- aqui garantimos uma 1ª população + 1ª linha de log com origem 'seed').
SELECT public.refresh_rfv('seed');


-- ============================================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.refresh_rfv(TEXT);
--   DROP FUNCTION IF EXISTS public.get_rfv_last_refresh();
--   DROP FUNCTION IF EXISTS public.get_destinos_receita();
--   DROP FUNCTION IF EXISTS public.get_rfv_leads();
--   DROP MATERIALIZED VIEW IF EXISTS public.v_destinos_receita;
--   DROP MATERIALIZED VIEW IF EXISTS public.v_rfv_leads;
--   DROP TABLE IF EXISTS public.rfv_refresh_log;
-- ============================================================================
