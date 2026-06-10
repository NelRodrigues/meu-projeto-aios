-- ============================================================
-- Migration 004: Instância WhatsApp da Porcelana Beauty
-- SIC Porcelana Beauty · projecto SIC GERAL (achtvzbcczmcbvjkdjry)
-- ============================================================
-- Regista a instância WhatsApp da Porcelana em public.whatsapp_instances,
-- scoped ao tenant porcelana (tenant_id d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1).
-- O roteamento de mensagens é por tenant_id (backend/service_role) — não
-- depende de Auth/JWT (Story 1.6).
--
-- IDEMPOTENTE: whatsapp_instances NÃO tem UNIQUE natural (só PK em id),
-- por isso usa-se guard WHERE NOT EXISTS por (tenant_id, name). [F3]
--
-- FORA DE ÂMBITO [F2]: o código do router/webhook-handler do SIC GERAL (que
-- mapeia instância→tenant_id→schema) NÃO é alterado aqui — esta migração só
-- regista a linha. Confirmar (não implementar) que o router já roteia por
-- tenant_id como faz para isilda/natacha.
--
-- ORDEM OPERACIONAL [F5]: esta linha (tenant_id) deve existir ANTES de o número
-- ser conectado na uazapi, para o 1º webhook já ter destino de roteamento.
--
-- CREDENCIAIS [cliente]: api_key e phone_number reais dependem da instância
-- WhatsApp Business da Porcelana. Enquanto ausentes, nasce 'disconnected' com
-- os campos preenchíveis a NULL — não bloqueia o registo.
--
-- ROLLBACK: DELETE FROM public.whatsapp_instances
--           WHERE tenant_id='d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1' AND name='Porcelana Beauty';
-- ============================================================

DO $$
DECLARE
  v_tenant_id uuid := 'd7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1'::uuid;  -- tenant porcelana (Story 1.1)
BEGIN
  -- guard: tenant tem de existir
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant_id AND db_schema = 'porcelana') THEN
    RAISE EXCEPTION '[004] tenant porcelana (%) não encontrado — registar Story 1.1 primeiro', v_tenant_id;
  END IF;

  -- INSERT idempotente por (tenant_id, name) [F3]
  INSERT INTO public.whatsapp_instances (
    tenant_id, name, teams, purpose, status,
    api_url, bypass_disconnect, metadata
  )
  SELECT
    v_tenant_id,
    'Porcelana Beauty',
    ARRAY['comercial']::text[],         -- paridade isilda/natacha [F6]
    'inbox',                            -- atendimento (como isilda); muda para 'sales' se preferido
    'disconnected',                     -- nasce desconectada até número/credenciais do cliente
    'https://profuturo.uazapi.com',     -- mesmo gateway uazapi dos outros tenants [F6]
    false,                              -- paridade [F6]
    jsonb_build_object('provider','uazapi','instance_name','SIC_Porcelana')  -- paridade [F6]
  WHERE NOT EXISTS (
    SELECT 1 FROM public.whatsapp_instances
    WHERE tenant_id = v_tenant_id AND name = 'Porcelana Beauty'
  );

  RAISE NOTICE '[004] instância WhatsApp da Porcelana registada (tenant %)', v_tenant_id;
END $$;
