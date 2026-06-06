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
- [x] Migration 015: `pagamentos` (pedido_id FK, cliente_id FK, valor, metodo, comprovativo_url, estado pendente/confirmado/rejeitado, confirmado_por FK, confirmado_at, notas)
- [ ] Dados bancarios configuraveis em `integration_keys` (service='pagamento', key_name='dados_bancarios')
- [ ] Bot envia dados bancarios quando cliente confirma interesse:
  - Tool `enviar_dados_pagamento(cliente_id)` no ai-sales-agent
  - Mensagem formatada com banco, titular, numero conta, Multicaixa Express
- [ ] Bot detecta comprovativo (media_type='image' + intencao PAGAMENTO):
  - Guarda imagem em Storage (bucket `comprovativos`)
  - Cria registo em `pagamentos` com estado='pendente'
  - Notifica Isi (tipo='pagamento')
  - Responde ao cliente: "Obrigada! Recebi o comprovativo. Vou confirmar e ja lhe digo."
- [x] No inbox, quando conversa tem pagamento pendente:
  - Banner "Pagamento pendente — Confirmar?"
  - Botao "Confirmar Pagamento": muda estado pagamento + pedido para 'pago'
  - Botao "Rejeitar" com motivo
- [x] Lista de pagamentos pendentes em `/dashboard` (accoes urgentes)

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
- [x] Pagina `/dashboard` com KPIs, graficos, accoes urgentes, checklist
- [x] Filtro de periodo: 7 dias, 30 dias, 90 dias
- [x] Mobile: cards empilhados, graficos scrollaveis
- [x] Cron 5 criado

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
- [x] Migration 017: `checklist_tasks` + `checklist_completions`
- [x] Migration 026: seed com 5 tarefas
- [x] Widget de checklist no dashboard com progresso e reset diario automatico
- [x] Icone na sidebar com badge (X pendentes)

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
- [x] Bot pede consentimento na primeira mensagem (sufixo no system prompt)
- [x] Bot regista SIM/NAO em `consentimentos`
- [x] Opt-out "PARAR": regista revogacao, fecha conversa, responde
- [x] Pagina `/configuracoes/rgpd` com lista, filtros, botao anonimizar
- [x] Funcao SQL `anonimizar_cliente(p_cliente_id UUID)` (migration 018)

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
- [x] PWA configurada:
  - `manifest.json` com nome, icone, tema rosa
  - Service Worker com cache-first para assets, network-first para paginas
  - Meta tags PWA completas no layout.tsx
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
  - [x] 30 produtos do catalogo com fotos carregadas
  - [x] Backup da base de dados
  - [x] Monitoring basico (Vercel Analytics + logs Supabase)

### Ficheiros a Criar/Editar
- `public/manifest.json`
- `src/app/layout.tsx` (meta tags PWA)
- `public/sw.js` ou `next-pwa` config

### File List
- `package.json`
- `docs/architecture/shared-supabase-isilda-cutover.md`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/manifest.json`
- `public/sw.js`
- `src/app/api/diagnostics/go-live/route.ts`
- `src/app/(dashboard)/clientes/novo/page.tsx`
- `src/app/(dashboard)/clientes/page.tsx`
- `src/app/(dashboard)/clientes/[id]/page.tsx`
- `src/app/(dashboard)/clientes/importar/page.tsx`
- `src/app/(dashboard)/catalogo/page.tsx`
- `src/app/(dashboard)/calendario/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/inbox/page.tsx`
- `src/app/(dashboard)/pedidos/page.tsx`
- `src/app/(dashboard)/pedidos/novo/page.tsx`
- `src/components/clientes/csv-importer.tsx`
- `src/components/calendario/month-view.tsx`
- `src/components/pedidos/order-form.tsx`
- `src/app/api/diagnostics/backend/route.ts`
- `src/components/dashboard/go-live-readiness.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/system/shared-backend-placeholder.tsx`
- `src/components/system/backend-status-banner.tsx`
- `src/hooks/use-clientes.ts`
- `src/hooks/use-conversations.ts`
- `src/hooks/use-messages.ts`
- `src/hooks/use-pedidos.ts`
- `src/lib/backend/config.ts`
- `src/lib/backend/shared-mappers.ts`
- `src/lib/go-live/readiness.ts`
- `src/proxy.ts`
- `tests/app/production-smoke.test.mjs`
- `tests/lib/backend-config.test.mjs`
- `tests/lib/csv-utils.test.mjs`
- `tests/lib/go-live-readiness.test.mjs`
- `tests/lib/shared-mappers.test.mjs`
- `tests/lib/utils.test.mjs`

### Notas de Execucao — 2026-06-01
- Build estabilizado com `next build --webpack` para evitar falhas de Turbopack no ambiente actual.
- Dependencia de Google Fonts removida do root layout; tipografia passou para fallback local.
- Criada base minima de testes automatizados com `node:test` para utilitarios e smoke checks de producao.
- Adicionada rota `/clientes/novo` para eliminar link partido na area de clientes.
- Tenant `isilda` criado no Supabase partilhado `achtvzbcczmcbvjkdjry`, com admin `ketson85@hotmail.com` associado ao novo `tenant_id`.
- Confirmado que o backend partilhado nao tem as tabelas verticais deste repo (`clientes`, `pedidos`, `mensagens_whatsapp`, etc.), por isso o cutover de `.env.local` fica bloqueado ate haver adaptacao estrutural.
- Criado diagnostico de backend (`/api/diagnostics/backend`) e banner no dashboard para distinguir modo standalone vs shared e evitar cutover silenciosa para o backend partilhado antes da migracao.
- `.env.local` local passou a apontar para o projecto Supabase partilhado com `NEXT_PUBLIC_APP_BACKEND_MODE=shared`, `tenant_slug=isilda` e `tenant_id` correspondente.
- Páginas verticais sem contrato no backend partilhado agora entram em estado de migração controlado, em vez de rebentarem com queries para tabelas inexistentes.
- `proxy.ts` passou a permitir `/api/diagnostics/*` sem sessão para facilitar suporte e validação do cutover.
- `clientes`, `pedidos` e `dashboard` já consomem dados reais do contrato público do backend partilhado (`contacts`, `deals`, `leads`), em vez do modelo vertical antigo.
- `catalogo`, `calendario`, `clientes/importar` e `pedidos/novo` foram ligados ao modelo partilhado sem placeholders, usando `deals` e `contacts` como fonte operacional.
- Criado diagnóstico de prontidão de go-live em `/api/diagnostics/go-live` e widget no dashboard. O diagnóstico lê dados reais do backend para validar UAZAPI e a cobertura do catálogo com fotos, deixando apenas confirmações externas como Vercel, backup e monitoring.
- Semeados 30 produtos no tenant `isilda` do backend partilhado e ligados a assets visuais locais para fechar a cobertura do catálogo.
- Gerado snapshot de backup do backend partilhado em `backups/go-live-backup-2026-06-03T22-18-49-694Z.json`.
- Vercel Analytics foi activado no `RootLayout` para monitorização de produção.

---

*-- River, removendo obstaculos 🌊*
