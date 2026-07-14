-- ============================================================================
-- Migração 025 — Financeiro: honorários, comissões multi-moeda + facturas + D-5
-- ----------------------------------------------------------------------------
-- Porquê: o SIC Global Minds precisa de controlar o dinheiro do negócio sem
-- folhas paralelas — honorários (o que a GM cobra ao cliente) e comissões (o que
-- os parceiros pagam à GM), ambos em MOEDA FORTE (EUR, USD, GBP, ZAR, AED, CAD,
-- AUD…) com contravalor AOA à taxa do dia. As facturas herdam a moeda e trazem
-- data de vencimento com lembrete interno D-5.
--
-- ── Nota de NUMERAÇÃO (desvio registado) ────────────────────────────────────
-- A Arquitectura §3 (escrita antes do código) mapeava esta tabela à migração
-- `011_financeiro.sql`. Mas o repositório real NUNCA materializou 011–015 como
-- ficheiros: a série consolidou-se noutra sequência e a última migração real é a
-- 024 (`024_leads_telefone_opcional_notificacoes.sql`). Para não colidir com o
-- histórico aplicado, esta migração é a **025** — a próxima livre. O conteúdo
-- (schema, CHECKs, índices, RLS) segue à letra o DDL de §2.5; só o número muda.
--
-- ── Alinhamento com o CÓDIGO real (o código ganha sobre a arquitectura) ──────
--  • RLS admin: usa `public.is_admin(auth.uid())` (função SECURITY DEFINER da
--    migração 003), NÃO a subquery inline `EXISTS(... team_members ...)` que
--    §8.1 sugeria. É o padrão de todas as policies do repo (008, 024).
--  • Trigger updated_at: reutiliza `public.handle_updated_at()` (migração 002),
--    tal como 003/008.
--  • Moeda: CHAR(3) regex `^[A-Z]{3}$` (ISO 4217 livre), NUNCA enum — o cliente
--    usa várias moedas e as futuras não podem bloquear (§2.1).
--  • Notificações D-5: insere em `public.notificacoes` (migração 024) com
--    `tipo='pagamento'` (valor já presente no CHECK do enum de tipo).
--
-- Dependências: 002 (base + `handle_updated_at`), 003 (`is_admin`), 008
-- (`parceiros`), 009 (`candidaturas`), 024 (`notificacoes`).
--
-- Fonte vinculativa: Arquitectura §2.5 (DDL), §2.1 (moeda/estados), §8.1 (RLS).
-- ============================================================================


-- ── financeiro ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES public.parceiros(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('honorario', 'comissao')),
  valor NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),   -- ISO 4217 livre
  taxa_cambio_aoa NUMERIC(14,4),        -- taxa do dia (editável, input manual)
  contravalor_aoa NUMERIC(16,2),        -- valor × taxa (pré-calculado, ajustável)
  percentagem NUMERIC(5,2),             -- % da comissão (quando tipo='comissao')
  estado TEXT NOT NULL DEFAULT 'previsto'
     CHECK (estado IN ('previsto', 'facturado', 'recebido', 'anulado')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_candidatura ON public.financeiro(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_parceiro ON public.financeiro(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_currency ON public.financeiro(currency);


-- ── facturas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_id UUID REFERENCES public.financeiro(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  numero TEXT,
  valor NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  vencimento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendente'
     CHECK (estado IN ('pendente', 'enviada', 'paga', 'vencida', 'cancelada')),
  lembrete_d5_enviado BOOLEAN DEFAULT false,   -- controlo do lembrete D-5 (idempotência)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice PARCIAL: só facturas "vivas" (pendente/enviada) entram — é sobre estas
-- que corre a query de vencimentos e o lembrete D-5.
CREATE INDEX IF NOT EXISTS idx_facturas_vencimento ON public.facturas(vencimento)
  WHERE estado IN ('pendente', 'enviada');


-- ── Triggers updated_at (reutiliza handle_updated_at() da migração 002) ──────
CREATE TRIGGER financeiro_updated_at
  BEFORE UPDATE ON public.financeiro
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── RLS — SÓ ADMIN (dado sensível, Arquitectura §8.1) ────────────────────────
-- financeiro/facturas são dinheiro do negócio: NENHUMA operação de leitura ou
-- escrita para o role `operacao`. Só admin activo (via is_admin) e service_role.
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- financeiro
CREATE POLICY "financeiro_admin_all" ON public.financeiro
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "financeiro_service" ON public.financeiro
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- facturas
CREATE POLICY "facturas_admin_all" ON public.facturas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "facturas_service" ON public.facturas
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── Função D-5: lembretes internos de facturas a vencer ──────────────────────
-- AC4: 5 dias (ou menos) antes do vencimento, para cada factura ainda "viva"
-- (pendente/enviada) que ainda NÃO recebeu lembrete, cria UMA notificação interna
-- (`tipo='pagamento'`) e marca `lembrete_d5_enviado=true`.
--
-- Idempotência: a flag garante que a 2ª execução no mesmo dia (ou dias seguintes)
-- NÃO duplica notificações. Facturas `paga`/`cancelada`/`vencida` são ignoradas
-- (não constam do filtro de estado).
--
-- SECURITY DEFINER: pode ser invocada por um route service_role ou pelo cron
-- definitivo (`lembretes-tick`, story 4.3) sem depender do RLS do chamador.
-- Devolve o nº de lembretes criados (útil para o teste e para o relatório).
--
-- NOTA de fronteira (E4): o aviso ao CLIENTE final (via agente WhatsApp) e o cron
-- agendado pertencem à story 4.3. Aqui fica só a lógica interna testável.
CREATE OR REPLACE FUNCTION public.financeiro_lembretes_d5()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factura RECORD;
  v_criados INTEGER := 0;
BEGIN
  FOR v_factura IN
    SELECT id, numero, lead_id, valor, currency, vencimento
    FROM public.facturas
    WHERE vencimento - INTERVAL '5 days' <= CURRENT_DATE
      AND estado IN ('pendente', 'enviada')
      AND NOT lembrete_d5_enviado
  LOOP
    INSERT INTO public.notificacoes (tipo, titulo, mensagem, prioridade, lead_id, accao_url, metadata)
    VALUES (
      'pagamento',
      'Factura a vencer (D-5)',
      'A factura ' || COALESCE(v_factura.numero, '(sem número)')
        || ' de ' || TRIM(TO_CHAR(v_factura.valor, 'FM999999999990D00')) || ' ' || v_factura.currency
        || ' vence a ' || TO_CHAR(v_factura.vencimento, 'DD/MM/YYYY') || '.',
      'alta',
      v_factura.lead_id,
      '/financeiro',
      jsonb_build_object('factura_id', v_factura.id, 'origem', 'financeiro_lembretes_d5')
    );

    UPDATE public.facturas SET lembrete_d5_enviado = true WHERE id = v_factura.id;
    v_criados := v_criados + 1;
  END LOOP;

  RETURN v_criados;
END;
$$;


-- ============================================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.financeiro_lembretes_d5();
--   DROP TRIGGER IF EXISTS facturas_updated_at ON public.facturas;
--   DROP TRIGGER IF EXISTS financeiro_updated_at ON public.financeiro;
--   DROP TABLE IF EXISTS public.facturas CASCADE;
--   DROP TABLE IF EXISTS public.financeiro CASCADE;
-- ============================================================================
