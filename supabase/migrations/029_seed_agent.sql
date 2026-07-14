-- ============================================================================
-- Migração 029 — Seed do agente "Assistente Global Minds" (Story 3.2, AC1)
-- ----------------------------------------------------------------------------
-- Porquê: a story 3.1 entregou o canal + fila + as tabelas do agente
-- (`ai_sales_agents`, `ai_agent_tools`, ...) mas deixou-as VAZIAS — o agente
-- está "mudo". Esta migração dá VOZ ao agente: semeia o registo único em
-- `ai_sales_agents` (persona L1 — Voice of Brand, editável na BD) e regista a
-- DECLARAÇÃO das 5 tools em `ai_agent_tools`. A EXECUÇÃO das tools é trabalho
-- das stories 3.4/3.5 — aqui só declaramos a definição/schema.
--
-- NUMERAÇÃO — salto 028 → 029: a série base parou na 028 (`028_crons_fila.sql`,
-- story 3.1). A story 3.2 assumia "015" no rascunho, mas 015 há muito foi
-- ocupada/consolidada. A próxima livre é 029. Documentado aqui por rastreio.
--
-- Fonte vinculativa:
--   - Arquitectura §6 (prompt em camadas L0–L8; L1 = system_prompt na BD).
--   - Arquitectura §4.1 (contrato `gm-agent`, 5 tools).
--   - Schema real: 027_ai_agent_fila_rpcs.sql (coluna é `name`, NÃO `nome`;
--     `settings` JSONB com defaults de série; `ai_agent_tools` com
--     name/description/parameters/action_type/action_config/priority).
--
-- Idempotência: INSERT ... WHERE NOT EXISTS por `name` (agente) e por
-- (agent_id, name) para cada tool. Reaplicar não duplica.
--
-- L1 (system_prompt) — regras validadas do fluxo 03/07 (verificadas uma a uma
-- na story, AC5): saudação oficial · voz feminina formal-calorosa · você/tu ·
-- nunca IA (C3) · nunca "admissão garantida". As camadas dinâmicas L0/L2/L3/L4
-- são montadas em RUNTIME pelo `gm-agent` (não vivem no system_prompt).
-- ============================================================================


-- ── Agente: Assistente Global Minds ─────────────────────────────────────────
INSERT INTO public.ai_sales_agents (
  name,
  description,
  system_prompt,
  personality_traits,
  target_stages,
  settings,
  model,
  temperature,
  max_tokens,
  is_active
)
SELECT
  'Assistente Global Minds',
  'Assistente institucional da Global Minds Consultoria (educação internacional, Luanda, desde 2013). Persona feminina, formal e calorosa. Atende leads no WhatsApp: qualifica, educa com faixas, encaminha para consulta.',
  -- L1 — VOICE OF BRAND (editável na BD). NÃO inclui data/hora (L0), contexto
  -- do lead (L2) nem overlay de fase (L3) — essas montam-se em runtime (§6).
  $prompt$És a Assistente da Global Minds, consultoria de educação internacional em Luanda, activa desde 2013. Ajudas estudantes e encarregados de educação a estudar no estrangeiro (África do Sul, Portugal, Reino Unido, EAU, EUA, China e outros destinos), em programas de summer camp, línguas, foundation, licenciatura, mestrado e voluntariado.

PERSONA
- Voz feminina, institucional, formal e calorosa. Representas a marca, não uma pessoa individual.
- Saudação oficial obrigatória no primeiro contacto: "Global Minds, muito bom dia/boa tarde/boa noite, em que podemos ser-lhe útil?" (escolhe a saudação conforme a hora indicada no topo).
- Tratas por "você" os encarregados de educação e por "tu" o estudante jovem. Se não souberes quem é, usa "você" até perceberes.
- Português de Angola natural. Se o lead escrever em inglês, respondes em inglês nativo (não tradução literal).

COMO CONVERSAS
- Uma pergunta de cada vez. Nunca despejas várias perguntas no mesmo balão.
- Respostas curtas e naturais, em 1 a 3 balões. Nada de parágrafos longos.
- Se já conheces o dado (nome, destino, nível), não voltas a perguntar.
- Educas com informação real do catálogo. Onde não tens fonte oficial, encaminhas para um consultor — nunca inventas.

O QUE NUNCA FAZES
- Nunca te identificas como IA, bot, robô ou assistente virtual automático. És a Assistente da Global Minds.
- Nunca prometes "admissão garantida" nem "garantimos a entrada". A admissão depende sempre da universidade/escola.
- Nunca dás uma cotação exacta de preço. Educas com FAIXAS (de investimento e de custo de vida). A cotação exacta só sai na proposta por email, depois da consulta.
- Nunca inventas prazos, valores, universidades ou requisitos que não conheças.$prompt$,
  -- Traços de personalidade (informativo; a voz vinculativa é o system_prompt).
  '["institucional","formal","caloroso","feminino","consultivo"]'::jsonb,
  -- Fases em que o agente actua (overlay L3 é derivado destas em runtime).
  ARRAY['lead','qualificado','consulta_agendada','em_curso'],
  -- Settings de série (§6 / brief): debounce 10, split 300, delays 1500–4000,
  -- context 250, auto_pause. Mantém o resto dos defaults da coluna.
  '{
    "working_hours_start": "08:00",
    "working_hours_end": "20:00",
    "working_days": [1,2,3,4,5,6],
    "debounce_seconds": 10,
    "response_delay_min_ms": 1500,
    "response_delay_max_ms": 4000,
    "typing_speed_cpm": 280,
    "message_split_max_length": 300,
    "delay_between_messages_min_ms": 500,
    "delay_between_messages_max_ms": 1500,
    "context_messages_limit": 250,
    "max_messages_per_conversation": 60,
    "auto_pause_after_human_reply": true,
    "lock_duration_seconds": 30,
    "max_retry_attempts": 3,
    "queue_batch_size": 5,
    "session_duration_minutes": 60,
    "cadence_silence_timeout_minutes": 720,
    "cadence_reactivation_map": {},
    "cadence_max_messages_per_hour": 50,
    "cadence_max_messages_per_day": 60,
    "max_tool_iterations": 4,
    "fallback_message": "Peço desculpa, tive um problema técnico. Um consultor da Global Minds vai responder-lhe em breve."
  }'::jsonb,
  'claude-sonnet-4-5',
  0.7,
  1024,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_sales_agents WHERE name = 'Assistente Global Minds'
);

-- ── Reconciliação (idempotência robusta) ────────────────────────────────────
-- O INSERT ... WHERE NOT EXISTS acima protege contra DUPLICADOS, mas se já
-- existir um registo com este `name` criado antes (ex.: seed parcial que deixou
-- o `system_prompt` VAZIO — foi o que aconteceu em produção a 13/07), o INSERT é
-- saltado e o registo defeituoso permanece. Este UPDATE corre SEMPRE e reconcilia
-- os campos vinculativos (persona L1, settings, description) com o valor canónico
-- desta migração. Assim reaplicar a 029 conserta um registo incompleto em vez de
-- o ignorar. Só toca no que é seguro sobrescrever (não mexe em `is_active` manual
-- nem em `id`).
UPDATE public.ai_sales_agents SET
  description = 'Assistente institucional da Global Minds Consultoria (educação internacional, Luanda, desde 2013). Persona feminina, formal e calorosa. Atende leads no WhatsApp: qualifica, educa com faixas, encaminha para consulta.',
  system_prompt = $prompt$És a Assistente da Global Minds, consultoria de educação internacional em Luanda, activa desde 2013. Ajudas estudantes e encarregados de educação a estudar no estrangeiro (África do Sul, Portugal, Reino Unido, EAU, EUA, China e outros destinos), em programas de summer camp, línguas, foundation, licenciatura, mestrado e voluntariado.

PERSONA
- Voz feminina, institucional, formal e calorosa. Representas a marca, não uma pessoa individual.
- Saudação oficial obrigatória no primeiro contacto: "Global Minds, muito bom dia/boa tarde/boa noite, em que podemos ser-lhe útil?" (escolhe a saudação conforme a hora indicada no topo).
- Tratas por "você" os encarregados de educação e por "tu" o estudante jovem. Se não souberes quem é, usa "você" até perceberes.
- Português de Angola natural. Se o lead escrever em inglês, respondes em inglês nativo (não tradução literal).

COMO CONVERSAS
- Uma pergunta de cada vez. Nunca despejas várias perguntas no mesmo balão.
- Respostas curtas e naturais, em 1 a 3 balões. Nada de parágrafos longos.
- Se já conheces o dado (nome, destino, nível), não voltas a perguntar.
- Educas com informação real do catálogo. Onde não tens fonte oficial, encaminhas para um consultor — nunca inventas.

O QUE NUNCA FAZES
- Nunca te identificas como IA, bot, robô ou assistente virtual automático. És a Assistente da Global Minds.
- Nunca prometes "admissão garantida" nem "garantimos a entrada". A admissão depende sempre da universidade/escola.
- Nunca dás uma cotação exacta de preço. Educas com FAIXAS (de investimento e de custo de vida). A cotação exacta só sai na proposta por email, depois da consulta.
- Nunca inventas prazos, valores, universidades ou requisitos que não conheças.$prompt$
WHERE name = 'Assistente Global Minds'
  AND (system_prompt IS NULL OR system_prompt = '' OR system_prompt NOT LIKE '%muito bom dia/boa tarde/boa noite%');


-- ── Declaração das 5 tools (só definição/schema; execução em 3.4/3.5) ────────
-- `parameters` = JSON Schema no formato Anthropic tool-use (input_schema).
-- `action_type` marca o handler futuro. `action_config` fica vazio até 3.4/3.5.
DO $$
DECLARE
  v_agent_id UUID;
BEGIN
  SELECT id INTO v_agent_id
  FROM public.ai_sales_agents
  WHERE name = 'Assistente Global Minds'
  LIMIT 1;

  IF v_agent_id IS NULL THEN
    RAISE NOTICE '029: agente não encontrado — seed de tools ignorado.';
    RETURN;
  END IF;

  -- qualify_lead — extrai BANT e pontua o lead (→ gm-lead-intelligence, 3.4).
  INSERT INTO public.ai_agent_tools (agent_id, name, description, parameters, action_type, priority)
  SELECT v_agent_id,
    'qualify_lead',
    'Regista o que se percebeu sobre o lead (orçamento indicado por faixa, quem decide, necessidade, prazo, destino e nível pretendidos) para pontuar e avançar a qualificação. Usa quando o lead partilha informação nova sobre o seu projecto de estudo.',
    '{"type":"object","properties":{"bant_budget":{"type":"string","description":"Faixa de orçamento indicada pelo lead (nunca valor exacto pedido por nós)."},"bant_authority":{"type":"string","description":"Quem decide: encarregado ou estudante."},"bant_need":{"type":"string","description":"Necessidade/objectivo do lead."},"bant_timeline":{"type":"string","description":"Prazo/quando pretende iniciar."},"destino":{"type":"string","description":"País/destino pretendido."},"nivel":{"type":"string","description":"summer, linguas, foundation, licenciatura, mestrado ou voluntariado."}},"required":[]}'::jsonb,
    'edge_function',
    10
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_agent_tools WHERE agent_id = v_agent_id AND name = 'qualify_lead'
  );

  -- check_availability — janelas de consulta (FreeBusy, 3.5).
  INSERT INTO public.ai_agent_tools (agent_id, name, description, parameters, action_type, priority)
  SELECT v_agent_id,
    'check_availability',
    'Consulta as janelas disponíveis para uma consulta com um consultor da Global Minds. Usa quando o lead qualificado quer agendar e precisas de sugerir horários.',
    '{"type":"object","properties":{"preferencia":{"type":"string","description":"Preferência de dia/período indicada pelo lead, se houver."}},"required":[]}'::jsonb,
    'edge_function',
    9
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_agent_tools WHERE agent_id = v_agent_id AND name = 'check_availability'
  );

  -- schedule_consultation — marca a consulta (3.5).
  INSERT INTO public.ai_agent_tools (agent_id, name, description, parameters, action_type, priority)
  SELECT v_agent_id,
    'schedule_consultation',
    'Agenda a consulta do lead num horário confirmado. Usa só depois de o lead escolher uma janela oferecida por check_availability.',
    '{"type":"object","properties":{"slot_iso":{"type":"string","description":"Data/hora escolhida em ISO 8601 (Africa/Luanda)."},"nome_lead":{"type":"string","description":"Nome pelo qual tratar o lead na consulta."}},"required":["slot_iso"]}'::jsonb,
    'edge_function',
    8
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_agent_tools WHERE agent_id = v_agent_id AND name = 'schedule_consultation'
  );

  -- criar_ficha_estudante — abre a ficha de candidatura (3.4/3.5).
  INSERT INTO public.ai_agent_tools (agent_id, name, description, parameters, action_type, priority)
  SELECT v_agent_id,
    'criar_ficha_estudante',
    'Abre a ficha de candidatura do estudante quando o lead está qualificado e pronto a avançar. Usa quando reúnes os dados mínimos e o lead concorda em iniciar o processo.',
    '{"type":"object","properties":{"nome":{"type":"string"},"destino":{"type":"string"},"nivel":{"type":"string"}},"required":["nome"]}'::jsonb,
    'edge_function',
    7
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_agent_tools WHERE agent_id = v_agent_id AND name = 'criar_ficha_estudante'
  );

  -- notificar_humano — escala para um consultor (3.3 faz a mecânica pré-LLM).
  INSERT INTO public.ai_agent_tools (agent_id, name, description, parameters, action_type, priority)
  SELECT v_agent_id,
    'notificar_humano',
    'Encaminha a conversa para um consultor humano da Global Minds. Usa quando o lead pede falar com uma pessoa, quando a conversa entra em custos/pagamentos/negociação, ou quando não tens resposta na base de conhecimento.',
    '{"type":"object","properties":{"motivo":{"type":"string","description":"Motivo do encaminhamento: human_request, escalation_d5, no_answer ou urgent."},"resumo":{"type":"string","description":"Resumo curto do contexto para o consultor."}},"required":["motivo"]}'::jsonb,
    'edge_function',
    11
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_agent_tools WHERE agent_id = v_agent_id AND name = 'notificar_humano'
  );
END $$;


-- ============================================================================
-- ROLLBACK:
--   DELETE FROM public.ai_agent_tools
--    WHERE agent_id = (SELECT id FROM public.ai_sales_agents WHERE name = 'Assistente Global Minds')
--      AND name IN ('qualify_lead','check_availability','schedule_consultation',
--                   'criar_ficha_estudante','notificar_humano');
--   DELETE FROM public.ai_sales_agents WHERE name = 'Assistente Global Minds';
-- ============================================================================
