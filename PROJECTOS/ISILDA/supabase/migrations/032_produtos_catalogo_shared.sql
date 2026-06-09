-- Migration 032: produtos_catalogo para modo SHARED (SIC GERAL)
--
-- Contexto: a migracao 010_produtos_catalogo.sql cria a tabela para o modo
-- STANDALONE (projecto Isilda proprio, sem tenant_id). A Isilda corre em modo
-- SHARED no projecto SIC GERAL (achtvzbcczmcbvjkdjry), onde as tabelas
-- single-tenant nao existem e o isolamento e feito por tenant_id + get_tenant_id().
--
-- Esta migracao adapta a 010 ao padrao multi-tenant do SIC GERAL:
--   - coluna tenant_id UUID DEFAULT get_tenant_id()
--   - RLS crm_auth_* (authenticated, scoped por tenant) + crm_svc_* (service_role, full)
--   - trigger de updated_at inline (handle_updated_at nao existe no SIC GERAL)
--
-- Aplicada em producao via Supabase MCP em 2026-06-09. Sem isto, a tool
-- consultar_catalogo do agente Soraya e a pagina de Catalogo do CRM falham
-- com "relation produtos_catalogo does not exist" no modo shared.

CREATE TABLE IF NOT EXISTS public.produtos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  tenant_id UUID DEFAULT get_tenant_id(),

  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('chantilly', 'bento_cake', 'especiais', 'naked_vintage', 'doces', 'casamento', 'outro')),
  tags TEXT[] DEFAULT '{}',

  fotos TEXT[] DEFAULT '{}',
  foto_principal TEXT,

  preco_base NUMERIC(10, 2),
  precos_por_tamanho JSONB DEFAULT '{}',
  sob_consulta BOOLEAN DEFAULT FALSE,

  tempo_producao_horas INTEGER DEFAULT 48,
  complexidade SMALLINT DEFAULT 3 CHECK (complexidade BETWEEN 1 AND 5),

  activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- Trigger de updated_at (search_path fixo — boa pratica, evita function_search_path_mutable)
CREATE OR REPLACE FUNCTION public.tg_produtos_catalogo_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_produtos_catalogo_updated ON public.produtos_catalogo;
CREATE TRIGGER on_produtos_catalogo_updated
  BEFORE UPDATE ON public.produtos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.tg_produtos_catalogo_updated_at();

CREATE INDEX IF NOT EXISTS idx_produtos_catalogo_tenant ON public.produtos_catalogo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_catalogo_categoria ON public.produtos_catalogo(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_catalogo_activo ON public.produtos_catalogo(activo);

ALTER TABLE public.produtos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_auth_produtos_catalogo ON public.produtos_catalogo;
CREATE POLICY crm_auth_produtos_catalogo ON public.produtos_catalogo
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS crm_svc_produtos_catalogo ON public.produtos_catalogo;
CREATE POLICY crm_svc_produtos_catalogo ON public.produtos_catalogo
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
