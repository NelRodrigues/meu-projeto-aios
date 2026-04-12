# Fase 5 — Pagamentos + Dashboard + Polish
## Stories 10.1 a 10.5

---

## Story 10.1 — Pagamentos

**Epic:** E10 — Pagamentos + Dashboard + Polish
**Prioridade:** P1 | **Estimativa:** 1 dia
**PRD refs:** FR63-FR66

### Descricao
Como Isi, quero registar pagamentos dos clientes e confirmar comprovativos recebidos via WhatsApp.

### Criterios de Aceitacao
- [ ] Migration 015: `pagamentos` (pedido_id FK, cliente_id FK, valor, metodo, comprovativo_url, estado pendente/confirmado/rejeitado, confirmado_por FK, confirmado_at, notas)
- [ ] Dados bancarios configuraveis em `integration_keys` (service='pagamento', key_name='dados_bancarios')
- [ ] Bot envia dados bancarios quando cliente confirma interesse:
  - Tool `enviar_dados_pagamento(cliente_id)` no ai-sales-agent
  - Mensagem formatada com banco, titular, numero conta, Multicaixa Express
- [ ] Bot detecta comprovativo (media_type='image' + intencao PAGAMENTO):
  - Guarda imagem em Storage (bucket `comprovativos`)
  - Cria registo em `pagamentos` com estado='pendente'
  - Notifica Isi (tipo='pagamento')
  - Responde ao cliente: "Obrigada! Recebi o comprovativo. Vou confirmar e ja lhe digo."
- [ ] No inbox, quando conversa tem pagamento pendente:
  - Banner "Pagamento pendente — Confirmar?"
  - Botao "Confirmar Pagamento":
    - Muda estado pagamento para 'confirmado'
    - Muda estado pedido para 'pago'
    - Preenche `pago_at`
    - Envia mensagem ao cliente: "Pagamento confirmado! Vou comecar a preparar o seu {produto}."
  - Botao "Rejeitar" com motivo
- [ ] Lista de pagamentos pendentes em `/dashboard` (accoes urgentes)

### Ficheiros a Criar
- `supabase/migrations/015_pagamentos.sql`
- `src/components/inbox/payment-banner.tsx`
- Editar: `supabase/functions/ai-sales-agent/` (tools enviar_dados_pagamento, detectar_comprovativo)

---

## Story 10.2 — Dashboard Operacional

**Epic:** E10 — Pagamentos + Dashboard + Polish
**Prioridade:** P1 | **Estimativa:** 1.5 dias
**PRD refs:** FR67-FR69

### Descricao
Como Isi, quero ver um dashboard com os KPIs do meu negocio e as accoes urgentes do dia.

### Criterios de Aceitacao
- [ ] Pagina `/dashboard` (pagina principal apos login):
  - **KPIs em cards:**
    - Pedidos hoje / esta semana / este mes
    - Receita do mes (soma valor_final de pedidos pagos+entregues)
    - Ticket medio do mes
    - Taxa de conversao (orcamento -> pago) do mes
    - Taxa de automacao bot (mensagens bot / total mensagens) do mes
    - Clientes novos este mes
  - **Graficos (Recharts):**
    - Pedidos por semana (barras, ultimas 8 semanas)
    - Receita mensal (linha, ultimos 6 meses)
    - Distribuicao por categoria (pie chart)
  - **Accoes Urgentes:**
    - Pagamentos pendentes > 48h (lista com botao "Ver no Inbox")
    - Entregas de hoje/amanha sem confirmacao
    - Conversas pendentes de humano (com link para inbox)
    - Proximas ocasioes (top 5 dos proximos 30 dias)
- [ ] Filtro de periodo: 7 dias, 30 dias, 90 dias
- [ ] Mobile: cards empilhados, graficos scrollaveis
- [ ] Cron 5 (actualizar metricas clientes) ja criado — validar que LTV esta correcto

### Ficheiros a Criar
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard/kpi-cards.tsx`
- `src/components/dashboard/charts.tsx`
- `src/components/dashboard/urgent-actions.tsx`

---

## Story 10.3 — Checklist Diaria

**Epic:** E10 — Pagamentos + Dashboard + Polish
**Prioridade:** P1 | **Estimativa:** 0.5 dia
**PRD refs:** FR70-FR72

### Descricao
Como Isi, quero ter uma checklist diaria com as tarefas operacionais para nao me esquecer de nada.

### Criterios de Aceitacao
- [ ] Migration 017: `checklist_tasks` + `checklist_completions`
- [ ] Migration 026: seed com 5 tarefas:
  1. "Verificar mensagens pendentes no inbox"
  2. "Confirmar entregas de hoje"
  3. "Verificar pagamentos pendentes"
  4. "Actualizar estados dos pedidos em producao"
  5. "Publicar conteudo nas redes"
- [ ] Widget de checklist no dashboard (ou sidebar):
  - Lista de tarefas com checkbox
  - Marcar como completa regista em `checklist_completions` com timestamp
  - Progresso: "3 de 5 completas"
  - Reset automatico a meia-noite (consulta por data do dia)
- [ ] Icone na sidebar com badge (X pendentes)

### Ficheiros a Criar
- `supabase/migrations/017_checklist.sql`
- `supabase/migrations/026_seed_checklist.sql`
- `src/components/dashboard/daily-checklist.tsx`

---

## Story 10.4 — RGPD: Consentimento + Opt-out

**Epic:** E10 — Pagamentos + Dashboard + Polish
**Prioridade:** P1 | **Estimativa:** 0.5 dia
**PRD refs:** NFR13, Seccao 12 (Compliance)

### Descricao
Como operadora, quero que o bot peca consentimento no primeiro contacto e respeite opt-out, para estar em conformidade com RGPD.

### Criterios de Aceitacao
- [ ] Bot pede consentimento na primeira mensagem apos saudacao:
  - "Posso guardar o seu contacto para lhe enviar novidades e lembretes de ocasioes? Responda SIM ou NAO."
  - Se SIM: registar consentimento (tipo='comunicacao_whatsapp', consentido=true, metodo='whatsapp_resposta')
  - Se NAO: registar consentimento (consentido=false), nao enviar marketing
- [ ] Opt-out: responder "PARAR" a qualquer momento:
  - Bot: "Entendido! Nao vou enviar mais mensagens. Se mudar de ideias, e so escrever."
  - Registar consentimento revogado
  - Marcar conversa como encerrada
  - Excluir de lembretes de recompra
- [ ] Pagina `/configuracoes/rgpd`:
  - Lista de consentimentos por cliente
  - Filtros: activos, revogados
  - Botao "Anonimizar Cliente" (confirma 2x → executa funcao SQL que remove dados pessoais)
- [ ] Funcao SQL `anonimizar_cliente(p_cliente_id UUID)`:
  - Remove nome, telefone, email, endereco
  - Anonimiza mensagens (remove conteudo, mantem metadata)
  - Mantem dados agregados (total pedidos, valor) para metricas
  - Registar auditoria

### Ficheiros a Criar/Editar
- `src/app/(dashboard)/configuracoes/rgpd/page.tsx`
- Editar: `supabase/functions/ai-sales-agent/` (logica consentimento no primeiro contacto)
- Adicionar funcao SQL em migration existente ou nova

---

## Story 10.5 — PWA + Testes + Go-Live

**Epic:** E10 — Pagamentos + Dashboard + Polish
**Prioridade:** P1 | **Estimativa:** 1 dia
**PRD refs:** NFR1-NFR15

### Descricao
Como @dev, quero finalizar a PWA, correr testes de integracao e preparar o go-live.

### Criterios de Aceitacao
- [ ] PWA configurada:
  - `manifest.json` com nome "Delicias da Isi", icone, tema rosa/dourado
  - Service Worker para cache de assets + API responses
  - Meta tags para mobile (viewport, theme-color, apple-mobile-web-app)
  - Splash screen
  - "Add to Home Screen" funcional no Android
- [ ] Testes de integracao:
  - [ ] Enviar mensagem de teste via UAZAPI → webhook recebe → agente responde
  - [ ] Enviar foto → vision analisa → similares retornados → resposta com fotos
  - [ ] Criar pedido manual → aparece no Kanban → arrastar para "Pago"
  - [ ] Calendario mostra pedidos → alerta de conflito funciona
  - [ ] Recompra: inserir ocasiao para daqui a 30 dias → executar cron manualmente → mensagem enviada
  - [ ] Takeover: assumir conversa → modo humano → enviar mensagem manual → devolver ao bot
  - [ ] RGPD: primeiro contacto pede consentimento → "PARAR" encerra
- [ ] Performance:
  - [ ] Lighthouse score > 80 (mobile)
  - [ ] Tempo de carregamento < 3s em 4G throttled
  - [ ] Imagens optimizadas (catalogo < 200KB cada)
- [ ] Go-live checklist:
  - [ ] Dominio/URL configurado no Vercel
  - [ ] Variaveis de producao no Supabase
  - [ ] UAZAPI conectada ao numero da Isi (928 98 47 54)
  - [ ] Webhook URL configurado na UAZAPI
  - [ ] Agente IA activo e testado
  - [ ] 30 produtos do catalogo com fotos carregadas
  - [ ] Backup da base de dados
  - [ ] Monitoring basico (Vercel Analytics + logs Supabase)

### Ficheiros a Criar/Editar
- `public/manifest.json`
- `src/app/layout.tsx` (meta tags PWA)
- `public/sw.js` ou `next-pwa` config

---

*-- River, removendo obstaculos 🌊*
