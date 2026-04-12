# Fase 1 — Fundacao CRM + Bot Base
## Stories 1.1 a 4.2

---

## Story 1.1 — Setup Projecto Next.js + Supabase

**Epic:** E1 — Fundacao e Schema
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**PRD refs:** Seccao 7.1 (Stack)
**Arq refs:** Seccao 1.1 (Diagrama)

### Descricao
Como @dev, quero ter o projecto base configurado com Next.js 16, Tailwind v4, Supabase client e estrutura de pastas, para que toda a equipa possa comecar a desenvolver.

### Criterios de Aceitacao
- [x] Projecto Next.js 16 (App Router) criado com `create-next-app`
- [x] Tailwind CSS v4 configurado com `@import` syntax
- [x] Supabase client configurado (`@supabase/supabase-js` + `@supabase/ssr`)
- [x] `.env.local` com variaveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] Estrutura de pastas:
  ```
  src/app/(auth)/          — login
  src/app/(dashboard)/     — inbox, clientes, pedidos, calendario, catalogo, dashboard
  src/app/api/webhooks/    — proxy UAZAPI
  src/lib/                 — supabase client, utils
  src/components/          — UI compartilhados
  supabase/functions/      — Edge Functions
  supabase/migrations/     — SQL migrations
  ```
- [x] Layout base com sidebar (mobile: bottom nav) + header
- [x] PWA manifest.json + service worker basico
- [x] `supabase init` executado + `supabase link` para projecto

### Ficheiros a Criar
- `package.json`, `next.config.ts`, `tailwind.config.ts`
- `src/app/layout.tsx` (root layout)
- `src/app/(dashboard)/layout.tsx` (dashboard layout com sidebar)
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- `supabase/config.toml`

### Notas Tecnicas
- Copiar padroes de estrutura do projecto Elsa (`/Users/admin/PROJECTOS/elsa`)
- Paleta: tons quentes (rosa/dourado) para confeitaria — definir CSS variables

---

## Story 1.2 — Migrations Core (001-009)

**Epic:** E1 — Fundacao e Schema
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** Seccao 7.2 (Schema)
**Arq refs:** Seccao 2 (Validacao Schema), Seccao 10 (Mapa Migrations)

### Descricao
Como @dev, quero ter o schema core da base de dados criado com todas as tabelas fundamentais, para que o webhook e o agente IA possam funcionar.

### Criterios de Aceitacao
- [x] Migration 001: extensoes (pgvector, pg_cron, pg_net, uuid-ossp)
- [x] Migration 002: `profiles` (reutilizar Nelma 001 — role admin/assistente, trigger handle_new_user)
- [x] Migration 003: `clientes` (schema da Arq seccao 2.2.1 — com estagios confeitaria, LTV, UNIQUE telefone)
- [x] Migration 004: `interacoes` (reutilizar Nelma 003, adaptar FK para clientes)
- [x] Migration 005: `mudancas_estagio` (reutilizar Nelma 004, adaptar FK)
- [x] Migration 006: `mensagens_whatsapp` (schema combinado da Arq seccao 2.2.2 — sender_type cliente/bot/humano/sistema, media, LLM metrics)
- [x] Migration 007: `integration_keys` (reutilizar Elsa 002)
- [x] Migration 008: `ai_sales_agents`, `ai_agent_conversations`, `ai_agent_message_queue`, `ai_agent_logs`, `ai_agent_send_counts`, `ai_agent_scheduled_followups`, `ai_agent_cadence_enrollments`, `ai_agent_tools`, `user_availability` + RPCs (lock, enqueue, claim, recovery) + triggers (reutilizar Nelma 026, adaptar lead_id -> cliente_id)
- [x] Migration 009: `webhook_processed_messages` (reutilizar Elsa 011)
- [x] RLS activo em todas as tabelas
- [x] Realtime activo em `mensagens_whatsapp`, `ai_agent_conversations`
- [ ] Todas as migrations aplicam com `supabase db push` sem erros

### Ficheiros a Criar
- `supabase/migrations/001_extensions.sql` a `009_webhook_idempotency.sql`

### Fontes de Codigo
- Nelma: `supabase/migrations/001_profiles.sql`, `002_leads.sql`, `003_interacoes.sql`, `004_mudancas_estagio.sql`, `026_ai_agent_uazapi.sql`
- Elsa: `supabase/migrations/001_initial_schema.sql`, `002_ai_agent_schema.sql`

---

## Story 1.3 — Migrations Suporte (018-021)

**Epic:** E1 — Fundacao e Schema
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Arq refs:** Seccao 10 (Mapa Migrations)

### Descricao
Como @dev, quero ter as tabelas de suporte (templates, notificacoes, consentimentos, storage) criadas.

### Criterios de Aceitacao
- [x] Migration 018: `templates_whatsapp` (reutilizar Nelma 005 — adaptar categorias para confeitaria: boas_vindas, orcamento, confirmacao_pedido, lembrete_entrega, pos_entrega, reactivacao)
- [x] Migration 019: `notificacoes` (reutilizar Nelma 011, adaptar FK para clientes — tipos: takeover, pagamento, urgente, conflito_calendario, recompra)
- [x] Migration 020: `consentimentos` (reutilizar Nelma 012)
- [x] Migration 021: Storage buckets (`portfolio` publico, `comprovativos` privado, `vision` privado, `media` privado) + RLS policies
- [x] RLS activo em todas as tabelas
- [x] Realtime activo em `notificacoes`

### Ficheiros a Criar
- `supabase/migrations/018_templates_whatsapp.sql` a `021_storage_buckets.sql`

---

## Story 2.1 — Shared Modules + UAZAPI Client

**Epic:** E2 — Webhook + Bot Base
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Arq refs:** Seccao 4.2 (Shared Modules)

### Descricao
Como @dev, quero ter os modulos partilhados das Edge Functions prontos (CORS, integracao keys, cliente LLM, cliente Supabase), para que as funcoes possam ser desenvolvidas.

### Criterios de Aceitacao
- [x] `supabase/functions/_shared/cors.ts` — copiar da Elsa directamente
- [x] `supabase/functions/_shared/get-integration-key.ts` — copiar da Elsa (inclui `getIntegrationKey`, `getIntegrationKeyWithClient`, `normalizeUazapiUrl`, `normalizeAngolaPhone`)
- [x] `supabase/functions/_shared/supabase-client.ts` — copiar da Elsa
- [x] `supabase/functions/_shared/llm-client.ts` — ADAPTAR da Elsa: mudar de OpenAI para Anthropic Claude SDK. Suportar:
  - `callClassification(messages, model="claude-haiku-4-5")` — classificacao de intencao
  - `callResponse(messages, model="claude-sonnet-4-5")` — geracao de resposta
  - Retornar `{ content, model, tokens_input, tokens_output, latency_ms }`
- [x] Testar `normalizeAngolaPhone` com: "244923456789", "923456789", "+244923456789", "923456789@s.whatsapp.net"

### Ficheiros a Criar
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/get-integration-key.ts`
- `supabase/functions/_shared/supabase-client.ts`
- `supabase/functions/_shared/llm-client.ts`

### Fontes de Codigo
- Elsa: `supabase/functions/_shared/` (todos os ficheiros)
- Elsa: `supabase/functions/ai-sales-agent/openai-client.ts` (adaptar para Claude)

---

## Story 2.2 — Edge Function: uazapi-webhook-receiver

**Epic:** E2 — Webhook + Bot Base
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR1-FR6
**Arq refs:** Seccao 4.3

### Descricao
Como @dev, quero ter o webhook receiver a funcionar para receber mensagens do WhatsApp via UAZAPI, criar clientes automaticamente, guardar mensagens e triggerar o agente IA.

### Criterios de Aceitacao
- [x] Edge Function `uazapi-webhook-receiver` criada
- [x] Validacao de webhook token (`x-webhook-token` ou `payload.webhook_token`)
- [x] Handle de evento `messages.upsert`:
  - Ignorar mensagens outgoing (fromMe=true)
  - Extrair remoteJid e normalizar telefone (+244)
  - Idempotencia via `webhook_processed_messages`
  - Lookup de cliente por telefone (com candidates set)
  - Auto-criacao de cliente se nao existir (nome do perfil WhatsApp)
  - Deteccao de media type (image, audio, video, document, sticker, location)
  - Extraccao de conteudo (texto, caption, label de media)
  - Insert em `mensagens_whatsapp` (sender_type='cliente', direction='incoming')
  - Criar/reactivar `ai_agent_conversations` automaticamente
  - Fire-and-forget: trigger `ai-sales-agent` (process_queue)
- [x] Handle de evento `message.ack`:
  - Actualizar `message_status` (sent -> delivered -> read)
- [x] Resposta 200 OK em todos os casos (webhook nao pode falhar)
- [x] Logs sanitizados (redact tokens)

### Ficheiros a Criar
- `supabase/functions/uazapi-webhook-receiver/index.ts`

### Fonte de Codigo
- Elsa: `supabase/functions/uazapi-webhook-receiver/index.ts` (adaptar `contacts` -> `clientes`, `contact_id` -> `cliente_id`)

---

## Story 2.3 — Edge Function: ai-sales-agent Core

**Epic:** E2 — Webhook + Bot Base
**Prioridade:** P0 | **Estimativa:** 2 dias
**PRD refs:** FR7-FR23
**Arq refs:** Seccao 4.5

### Descricao
Como @dev, quero ter o agente IA de vendas a funcionar com classificacao de intencao, geracao de resposta e envio via UAZAPI, adaptado para o contexto de confeitaria.

### Criterios de Aceitacao
- [x] Edge Function `ai-sales-agent` criada com accoes:
  - `process_queue` — claim + processar mensagens pendentes
  - `process_cadence` — processar cadencias/followups
  - `toggle_conversation` — pause/resume/transfer
- [x] Queue processor:
  - Check horario (08:00-20:00 WAT)
  - Check conversa activa
  - Check max mensagens
  - Classificar intencao com Haiku (16 intencoes confeitaria)
  - Gerar resposta com Sonnet (para orcamentos, objecoes) ou Haiku (para FAQ simples)
  - Verificar guardrails (frases proibidas, confianca minima)
  - Escalar para humano se confianca < 70% ou intencao FALAR_COM_ISI/RECLAMACAO
  - Enviar via UAZAPI (`/send/text`)
  - Enviar typing indicator antes da resposta
  - Registar em `ai_agent_logs` (tokens, latencia, intencao)
  - Actualizar `ai_agent_conversations` (total_messages, last_processed)
- [x] System prompt do agente configurado para confeitaria com:
  - Personalidade da Isi (calorosa, orgulhosa do artesanal)
  - Catalogo resumido com precos por categoria
  - Regras de negocio (preco base = massa + recheio simples, personalizacoes alteram)
  - Fluxo de pedido (briefing -> orcamento -> confirmacao -> pagamento)
  - Horario e contacto
- [x] Communication module: humanized response (delay, split, typing)
- [x] Rate limiting via `ai_agent_send_counts`

### Ficheiros a Criar
- `supabase/functions/ai-sales-agent/index.ts`
- `supabase/functions/ai-sales-agent/queue-processor.ts`
- `supabase/functions/ai-sales-agent/communication.ts`
- `supabase/functions/ai-sales-agent/context-gatherer.ts`
- `supabase/functions/ai-sales-agent/helpers.ts`
- `supabase/functions/ai-sales-agent/types.ts`

### Fonte de Codigo
- Elsa: `supabase/functions/ai-sales-agent/` (adaptar tudo para Claude + confeitaria)

---

## Story 2.4 — Proxy Webhook + Seeds

**Epic:** E2 — Webhook + Bot Base
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Arq refs:** Seccao 4.3, 5

### Descricao
Como @dev, quero ter o proxy webhook no Next.js e os dados iniciais (agente, templates, cron) configurados.

### Criterios de Aceitacao
- [x] `src/app/api/webhooks/uazapi/route.ts` — proxy que forward para Edge Function + trigger agente IA (copiar da Nelma)
- [x] Migration 025: seed agente IA (nome, system_prompt confeitaria, settings, model=claude-sonnet-4-5)
- [x] Migration 023: cron jobs (fila 10s, cadencia 5min, recovery 3min)
- [x] Migration 027: triggers updated_at + trigger enqueue_for_ai_agent em `mensagens_whatsapp`
- [x] Endpoint GET `/api/webhooks/uazapi` retorna `{ status: 'ok' }` (health check)
- [x] `supabase/functions/uazapi-send-message/index.ts` copiado da Elsa (adaptar `contacts` -> `clientes`)

### Ficheiros a Criar
- `src/app/api/webhooks/uazapi/route.ts`
- `supabase/functions/uazapi-send-message/index.ts`
- `supabase/migrations/023_cron_jobs.sql`
- `supabase/migrations/025_seed_agent.sql`
- `supabase/migrations/027_rpcs_triggers.sql`

---

## Story 3.1 — Inbox: Lista de Conversas

**Epic:** E3 — Inbox WhatsApp
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR54-FR56

### Descricao
Como Isi, quero ver a lista de conversas WhatsApp no inbox com filtros e actualizacao em tempo real, para gerir o atendimento facilmente.

### Criterios de Aceitacao
- [x] Pagina `/inbox` com layout 3 paineis (desktop) / 1 painel (mobile)
- [x] Lista de conversas mostrando: nome do cliente, ultima mensagem (truncada 50 chars), timestamp relativo ("ha 5 min"), badge de modo (bot verde, humano azul, pausado amarelo)
- [x] Filtros: Todas, Bot, Humano, Pendentes
- [x] Pesquisa por nome ou telefone
- [x] Ordenacao por ultima mensagem (mais recente primeiro)
- [x] Supabase Realtime: nova mensagem actualiza lista automaticamente
- [x] Clicar numa conversa selecciona-a e mostra o chat (Story 3.2)
- [x] Badge com contagem de conversas pendentes de humano
- [x] Mobile: lista ocupa ecra inteiro, clicar abre chat fullscreen

### Ficheiros a Criar
- `src/app/(dashboard)/inbox/page.tsx`
- `src/components/inbox/conversation-list.tsx`
- `src/components/inbox/conversation-item.tsx`
- `src/hooks/use-conversations.ts` (Realtime subscription)

### Fonte de Codigo
- Elsa: `src/app/(dashboard)/whatsapp/page.tsx`
- Nelma: componentes de inbox

---

## Story 3.2 — Inbox: Area de Chat

**Epic:** E3 — Inbox WhatsApp
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR57-FR60

### Descricao
Como Isi, quero ver o historico de mensagens com bolhas coloridas e poder enviar mensagens manuais e templates, para comunicar com clientes.

### Criterios de Aceitacao
- [x] Area de chat com bolhas por remetente:
  - Cliente: cinza, alinhado a esquerda
  - Bot: cor primaria (rosa), alinhado a direita, badge "IA"
  - Humano: azul, alinhado a direita, badge "Isi"
  - Sistema: centrado, texto pequeno
- [x] Cada bolha mostra: conteudo, timestamp, status de entrega (icone: sent/delivered/read)
- [x] Imagens recebidas como thumbnails clicaveis (expandir em modal)
- [x] Input de texto com botao enviar
- [ ] Selector de templates rapidos (dropdown com categorias)
- [x] Envio chama Edge Function `uazapi-send-message` e insere em `mensagens_whatsapp`
- [x] Scroll automatico para nova mensagem
- [x] Supabase Realtime: nova mensagem aparece instantaneamente
- [ ] Indicador "a escrever..." quando bot esta a processar

### Ficheiros a Criar
- `src/components/inbox/chat-area.tsx`
- `src/components/inbox/message-bubble.tsx`
- `src/components/inbox/chat-input.tsx`
- `src/components/inbox/template-selector.tsx`
- `src/hooks/use-messages.ts` (Realtime subscription)

---

## Story 3.3 — Inbox: Sidebar Cliente + Takeover

**Epic:** E3 — Inbox WhatsApp
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR19-FR23, FR61-FR62

### Descricao
Como Isi, quero ver os dados do cliente no sidebar e poder assumir/devolver conversas ao bot, para ter controlo total do atendimento.

### Criterios de Aceitacao
- [x] Sidebar direito (colapsavel em mobile) com:
  - Nome, telefone, origem, estagio do cliente
  - Pedido activo (se existir): produto, data entrega, estado
  - Ocasioes registadas (lista com datas)
  - LTV (total gasto)
  - Botoes de accao rapida
- [x] Botao "Assumir Conversa" (bot -> humano):
  - Muda `ai_agent_conversations.status` para `paused_by_human`
  - Badge muda de verde para azul
  - Bot para de responder
- [x] Botao "Devolver ao Bot" (humano -> bot):
  - Muda status para `active`
  - Badge muda de azul para verde
- [ ] Botao "Criar Pedido" (abre modal/pagina de criacao)
- [ ] Botao "Registar Ocasiao" (abre modal simples)
- [x] Quando Isi envia mensagem manual, modo muda automaticamente para humano
- [ ] Notificacao criada quando bot escala para humano (tipo takeover)
- [x] Sistema de notificacoes:
  - Icone de sino no header/sidebar com badge de contagem (nao lidas)
  - Dropdown/painel de notificacoes com lista (tipo, mensagem, timestamp, lida/nao-lida)
  - Tipos: takeover, pagamento, conflito_calendario, recompra, urgente
  - Marcar como lida ao clicar
  - Supabase Realtime para novas notificacoes (aparece instantaneamente)

### Ficheiros a Criar
- `src/components/inbox/client-sidebar.tsx`
- `src/components/inbox/takeover-controls.tsx`
- `src/components/notifications/notification-bell.tsx`
- `src/components/notifications/notification-list.tsx`
- `src/hooks/use-notifications.ts` (Realtime subscription)
- `src/app/(dashboard)/inbox/actions.ts` (Server Actions)

---

## Story 4.1 — Lista de Clientes + Ficha

**Epic:** E4 — Clientes + Pipeline
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR44, FR48

### Descricao
Como Isi, quero ver todos os meus clientes numa lista com pesquisa e poder abrir a ficha detalhada de cada um, para conhecer o historico de cada cliente.

### Criterios de Aceitacao
- [x] Pagina `/clientes` com tabela/lista:
  - Colunas: nome, telefone, estagio, total gasto, ultima compra, total pedidos
  - Pesquisa por nome ou telefone
  - Filtro por estagio (novo, contactado, orcamento, activo, vip, inactivo)
  - Ordenacao por nome, ultima compra, total gasto
  - Paginacao (20 por pagina)
- [x] Pagina `/clientes/[id]` com ficha detalhada:
  - Dados pessoais (editaveis)
  - Timeline de pedidos (lista cronologica)
  - Ocasioes registadas
  - LTV e metricas
  - Historico de conversas WhatsApp (link para inbox)
  - Notas (editavel)
- [x] Mobile: lista com cards, ficha em pagina separada

### Ficheiros a Criar
- `src/app/(dashboard)/clientes/page.tsx`
- `src/app/(dashboard)/clientes/[id]/page.tsx`
- `src/components/clientes/client-table.tsx`
- `src/components/clientes/client-detail.tsx`

---

## Story 4.2 — Auto-criacao + Importacao CSV

**Epic:** E4 — Clientes + Pipeline
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR45-FR47

### Descricao
Como Isi, quero que clientes sejam criados automaticamente quando contactam via WhatsApp e poder importar os meus contactos existentes via CSV.

### Criterios de Aceitacao
- [x] Auto-criacao ja funciona via webhook (Story 2.2) — validar que:
  - Nome do perfil WhatsApp e capturado
  - Telefone normalizado (+244)
  - Estagio = 'novo', origem = 'whatsapp'
  - `criado_por_bot = true`
  - Se contacto ja existe (telefone duplicado), actualiza ultimo_contacto sem criar novo
- [x] Importacao CSV:
  - Pagina `/clientes/importar` com upload de ficheiro
  - Formato: nome, telefone, email (opcional), notas (opcional)
  - Preview dos dados antes de importar
  - Validacao de duplicados por telefone
  - Feedback: X importados, Y duplicados ignorados, Z erros
- [x] Botao "Exportar CSV" na lista de clientes

### Ficheiros a Criar
- `src/app/(dashboard)/clientes/importar/page.tsx`
- `src/components/clientes/csv-importer.tsx`
- `src/lib/csv-utils.ts`

---

*-- River, removendo obstaculos 🌊*
