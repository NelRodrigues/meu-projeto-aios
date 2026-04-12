-- Migration 027: Triggers updated_at e trigger de enqueue para agente IA

-- ============================================================
-- TRIGGER: updated_at para tabelas que nao tem ainda
-- ============================================================

-- Garantir que a funcao handle_updated_at existe (criada em 002, mas por seguranca)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger updated_at a tabelas sem ele
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'ai_sales_agents',
    'ai_agent_conversations',
    'ai_agent_scheduled_followups',
    'ai_agent_cadence_enrollments',
    'ai_agent_tools',
    'templates_whatsapp'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Verificar se a tabela existe e se ja tem o trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_' || tbl || '_updated'
        AND tgrelid = ('public.' || tbl)::regclass
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER on_%s_updated BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION handle_updated_at()',
          tbl, tbl
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- FUNCAO: enqueue_message_for_ai_agent
-- Chamada pelo trigger quando chega mensagem do cliente
-- ============================================================

CREATE OR REPLACE FUNCTION enqueue_message_for_ai_agent()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_agent_id UUID;
  v_debounce_seconds INTEGER := 3;
  v_scheduled_for TIMESTAMPTZ;
BEGIN
  -- Apenas processar mensagens incoming do cliente
  IF NEW.direction != 'incoming' OR NEW.sender_type NOT IN ('cliente') THEN
    RETURN NEW;
  END IF;

  -- Obter agente activo
  SELECT id INTO v_agent_id
  FROM ai_sales_agents
  WHERE is_active = true
  LIMIT 1;

  IF v_agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obter ou criar conversa activa
  SELECT id INTO v_conversation_id
  FROM ai_agent_conversations
  WHERE cliente_id = NEW.cliente_id
    AND agent_id = v_agent_id
    AND status = 'active'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcular tempo com debounce (agrupar mensagens rapidas)
  v_scheduled_for := NOW() + (v_debounce_seconds || ' seconds')::INTERVAL;

  -- Upsert na fila: se ja existe entrada pendente para este cliente, actualizar scheduled_for
  INSERT INTO ai_agent_message_queue (
    cliente_id,
    conversation_id,
    agent_id,
    status,
    scheduled_for,
    attempts,
    max_attempts
  )
  VALUES (
    NEW.cliente_id,
    v_conversation_id,
    v_agent_id,
    'pending',
    v_scheduled_for,
    0,
    3
  )
  ON CONFLICT (cliente_id)
  WHERE status IN ('pending', 'processing')
  DO UPDATE SET
    scheduled_for = EXCLUDED.scheduled_for,
    conversation_id = EXCLUDED.conversation_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nao falhar o insert da mensagem se o enqueue falhar
  RAISE WARNING '[enqueue_message_for_ai_agent] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: enqueue ao receber mensagem do cliente
-- ============================================================

DROP TRIGGER IF EXISTS on_mensagem_received_enqueue ON public.mensagens_whatsapp;

CREATE TRIGGER on_mensagem_received_enqueue
  AFTER INSERT ON public.mensagens_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_message_for_ai_agent();

-- ============================================================
-- INDICE para o ON CONFLICT do upsert de fila
-- ============================================================

-- O constraint unico para o ON CONFLICT acima
-- (pode ja existir se a migration 008 o criou)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_agent_message_queue_cliente_pending_unique'
  ) THEN
    -- Indice parcial para upsert de fila
    CREATE UNIQUE INDEX ai_agent_message_queue_cliente_pending_unique
      ON ai_agent_message_queue(cliente_id)
      WHERE status IN ('pending', 'processing');
  END IF;
END;
$$;
