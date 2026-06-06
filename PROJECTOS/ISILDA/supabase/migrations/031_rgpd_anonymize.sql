-- Migration 018: RGPD — Funcao de Anonimizacao

-- ============================================================
-- FUNCAO: anonimizar_cliente
-- Remove dados pessoais, mantem agregados para metricas
-- ============================================================

CREATE OR REPLACE FUNCTION anonimizar_cliente(p_cliente_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count_mensagens INTEGER;
BEGIN
  -- Verificar que o cliente existe
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = p_cliente_id) THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'Cliente nao encontrado');
  END IF;

  -- Contar mensagens antes
  SELECT COUNT(*) INTO v_count_mensagens
  FROM public.mensagens_whatsapp
  WHERE cliente_id = p_cliente_id;

  -- 1. Anonimizar dados do cliente
  UPDATE public.clientes SET
    nome = 'Cliente Anonimizado',
    telefone = NULL,
    whatsapp_id = NULL,
    email = NULL,
    notas = NULL,
    origem = NULL
  WHERE id = p_cliente_id;

  -- 2. Anonimizar conteudo das mensagens (manter metadata)
  UPDATE public.mensagens_whatsapp SET
    conteudo = '[Mensagem removida — RGPD]',
    media_url = NULL
  WHERE cliente_id = p_cliente_id;

  -- 3. Remover ocasioes (dados pessoais)
  DELETE FROM public.ocasioes_cliente WHERE cliente_id = p_cliente_id;

  -- 4. Registar auditoria no log
  INSERT INTO public.ai_agent_logs (
    cliente_id,
    log_type,
    data
  ) VALUES (
    p_cliente_id,
    'gdpr_anonymization',
    jsonb_build_object(
      'anonimizado_em', NOW(),
      'mensagens_afectadas', v_count_mensagens
    )
  );

  RETURN jsonb_build_object(
    'sucesso', TRUE,
    'cliente_id', p_cliente_id,
    'mensagens_anonimizadas', v_count_mensagens
  );
END;
$$;
