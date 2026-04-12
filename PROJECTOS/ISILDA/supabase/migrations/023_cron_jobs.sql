-- Migration 023: Cron Jobs para processar fila do agente IA
-- Requer: pg_cron e pg_net (habilitados em 001_extensions.sql)

-- Cron 1: Processar fila do agente IA a cada 10 segundos
-- (pg_cron minimo e 1 minuto, mas usamos pg_net para chamar a edge function)
SELECT cron.schedule(
  'process-ai-agent-queue',
  '* * * * *',  -- cada minuto (pg_cron nao suporta segundos)
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-sales-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"action": "process_queue"}'::jsonb
  );
  $$
);

-- Cron 2: Recovery de mensagens presas (a cada 3 minutos)
SELECT cron.schedule(
  'recover-stuck-queue-messages',
  '*/3 * * * *',
  $$
  SELECT process_ai_agent_queue();
  $$
);

-- Nota: O debounce de 10s e gerido pela logica interna da edge function
-- que verifica scheduled_for antes de processar mensagens
