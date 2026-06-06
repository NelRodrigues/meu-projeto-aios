# Fase 2 — Catalogo + Pedidos + Calendario
## Stories 5.1 a 7.2

---

## Story 5.1 — Migrations: Catalogo + Referencias Visuais

**Epic:** E5 — Catalogo + Produtos
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**PRD refs:** FR28-FR30
**Arq refs:** Seccao 3.3 (pgvector), Seccao 10 (migrations 010-011)

### Descricao
Como @dev, quero ter as tabelas de catalogo e referencias visuais com pgvector criadas.

### Criterios de Aceitacao
- [x] Migration 010: `produtos_catalogo` (nome, descricao, categoria, tags[], fotos[], preco_base, precos_por_tamanho JSONB, tempo_producao_horas, complexidade 1-5, activo)
- [x] Migration 011: `referencias_visuais` (produto_id FK, titulo, descricao_visual, tags[], categoria, url_imagem, thumbnail_url, embedding vector(384), complexidade, metadata JSONB)
  - Index IVFFlat com lists=10 para similarity search
  - RPC `match_referencias_visuais(query_embedding, match_threshold, match_count)` com JOIN a `produtos_catalogo`
- [x] RLS activo em ambas as tabelas
- [ ] Testar RPC com embedding dummy (SELECT match_referencias_visuais(array_fill(0, ARRAY[384])::vector, 0.1, 3))

### Ficheiros a Criar
- `supabase/migrations/010_produtos_catalogo.sql`
- `supabase/migrations/011_referencias_visuais.sql`

---

## Story 5.2 — UI Catalogo + Seed 30 Produtos

**Epic:** E5 — Catalogo + Produtos
**Prioridade:** P0 | **Estimativa:** 1.5 dias
**PRD refs:** FR28-FR32

### Descricao
Como Isi, quero ver o meu catalogo de bolos numa galeria visual e poder adicionar/editar produtos, para manter o meu portfolio actualizado.

### Criterios de Aceitacao
- [x] Migration 024: seed com 30 produtos do Anexo A do Project Brief:
  - 4 tamanhos chantilly (10-20cm) com precos
  - 7 bento cakes com precos
  - 5 bolos especiais (Red Velvet, Cenoura, Nordico, Chocolate)
  - Naked cake, Vintage
  - 4 doces (cupcakes, donuts, bolachas, churros)
  - 6 categorias sob consulta (casamento, 2 andares, etc.)
- [x] Pagina `/catalogo` com galeria mobile-first:
  - Cards com foto, nome, preco (ou "Sob consulta")
  - Filtro por categoria: Chantilly, Bento Cake, Especiais, Naked/Vintage, Doces, Casamento
  - Pesquisa por nome
- [x] Modal/pagina de detalhe do produto (via form com toda a info)
- [x] Formulario de criacao/edicao:
  - Upload de fotos para Supabase Storage (bucket `portfolio`)
  - Campos: nome, descricao, categoria (select), tags (input), preco_base, precos_por_tamanho (form dinamico), complexidade, tempo_producao
- [x] Botao activar/desactivar produto

### Ficheiros a Criar
- `supabase/migrations/024_seed_catalogo.sql`
- `src/app/(dashboard)/catalogo/page.tsx`
- `src/components/catalogo/product-gallery.tsx`
- `src/components/catalogo/product-card.tsx`
- `src/components/catalogo/product-form.tsx`

---

## Story 6.1 — Migration: Pedidos

**Epic:** E6 — Pedidos + Kanban
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**PRD refs:** FR33-FR35
**Arq refs:** Seccao 2.2.3

### Descricao
Como @dev, quero ter a tabela de pedidos criada com todos os campos e timestamps de tracking.

### Criterios de Aceitacao
- [x] Migration 012: `pedidos` com campos:
  - cliente_id, produto_id (FK), descricao, tema, tamanho, sabor_massa, sabor_recheio, decoracao
  - imagem_referencia (URL), data_entrega, hora_entrega, modo_entrega (retirada/entrega), endereco_entrega
  - valor_orcamento, valor_final, estado (novo/orcamento/confirmado/pago/em_producao/pronto/entregue/cancelado)
  - notas, conversa_id (FK)
  - Timestamps: confirmado_at, pago_at, producao_inicio_at, pronto_at, entregue_at
- [x] Trigger: registar mudanca de estado (timestamps automaticos)
- [x] Trigger: actualizar metricas do cliente ao marcar entregue
- [x] RLS activo
- [x] Realtime activo em `pedidos`
- [x] Index em `(cliente_id)`, `(data_entrega)`, `(estado)`

### Ficheiros a Criar
- `supabase/migrations/012_pedidos.sql`

---

## Story 6.2 — Pipeline Kanban de Pedidos

**Epic:** E6 — Pedidos + Kanban
**Prioridade:** P0 | **Estimativa:** 1.5 dias
**PRD refs:** FR36-FR37

### Descricao
Como Isi, quero ver os meus pedidos num board Kanban visual com colunas por estado e poder arrastar pedidos entre estados, para gerir a producao facilmente.

### Criterios de Aceitacao
- [x] Pagina `/pedidos` com board Kanban:
  - 8 colunas: Novo, Orcamento, Confirmado, Pago, Em Producao, Pronto, Entregue, Cancelado
  - Cards arrastaveis com @dnd-kit
  - Cada card mostra: nome cliente, produto (resumido), data entrega, valor, badge urgencia (< 48h)
  - Cores por coluna (semaforo: verde para pronto, amarelo para em producao, etc.)
  - Contadores por coluna
- [x] Drag-and-drop com @dnd-kit (DragOverlay + optimistic update + revert on error)
- [x] Clicar no card abre detalhe do pedido (modal)
- [x] Realtime: novos pedidos aparecem automaticamente via subscription
- [x] Mobile: scroll horizontal entre colunas

### Ficheiros a Criar
- `src/app/(dashboard)/pedidos/page.tsx`
- `src/components/pedidos/kanban-board.tsx`
- `src/components/pedidos/kanban-column.tsx`
- `src/components/pedidos/order-card.tsx`
- `src/hooks/use-pedidos.ts`

### Fonte de Codigo
- Nelma: componentes Kanban do pipeline de leads (adaptar)

---

## Story 6.3 — Criacao de Pedido (Manual + Bot)

**Epic:** E6 — Pedidos + Kanban
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR33, FR38

### Descricao
Como Isi, quero poder criar pedidos manualmente e que o bot crie pedidos automaticamente a partir da conversa, para nunca perder uma encomenda.

### Criterios de Aceitacao
- [x] Formulario de criacao de pedido:
  - Seleccionar cliente (autocomplete por nome/telefone)
  - Seleccionar produto do catalogo (ou descricao livre)
  - Campos: tema, tamanho, sabores (massa + recheio), decoracao, data entrega, hora, modo entrega, endereco (se entrega), valor orcamento, notas
  - Botao "Criar Pedido" → estado = 'novo'
- [x] Acessivel via pagina `/pedidos/novo` e botao "+" no Kanban
- [x] Integracao com bot (ai-sales-agent):
  - Tool `criar_pedido` no agente — cria pedido e notifica Isi
  - Tool `verificar_disponibilidade` — consulta v_calendario_producao
  - Tool `consultar_catalogo` — responde sobre precos/produtos
  - Loop agentico (até 3 iteracoes) para tool use
- [x] Validacao: data entrega nao pode ser no passado

### Ficheiros a Criar/Editar
- `src/app/(dashboard)/pedidos/novo/page.tsx`
- `src/components/pedidos/order-form.tsx`
- Editar: `supabase/functions/ai-sales-agent/` (adicionar tool criar_pedido)

---

## Story 7.1 — Migrations: Calendario + Cron

**Epic:** E7 — Calendario Producao
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**PRD refs:** FR39-FR43
**Arq refs:** Seccao 2.2.4, Seccao 5

### Descricao
Como @dev, quero ter a tabela de calendario, a view calculada e o cron de geracao de slots criados.

### Criterios de Aceitacao
- [x] Migration 013: `calendario_producao` (data UNIQUE, capacidade_maxima default 3, notas, bloqueado)
- [x] View `v_calendario_producao`: calcula pedidos_agendados, vagas_disponiveis, status via JOIN com `pedidos`
- [x] Cron semanal domingo 00:00: gerar slots para proximos 60 dias, bloquear domingos
- [x] Seed: gerar slots para os proximos 60 dias
- [x] Integracao com bot: tool `verificar_disponibilidade(data)` via RPC + loop agentico

### Ficheiros a Criar
- `supabase/migrations/013_calendario_producao.sql` (inclui view + seed + cron)
- Editar: `supabase/functions/ai-sales-agent/` (adicionar tool verificar_disponibilidade)

---

## Story 7.2 — UI Calendario Mensal

**Epic:** E7 — Calendario Producao
**Prioridade:** P0 | **Estimativa:** 1.5 dias
**PRD refs:** FR39-FR43

### Descricao
Como Isi, quero ver um calendario mensal com as entregas agendadas e alertas quando um dia esta quase lotado, para planear a producao.

### Criterios de Aceitacao
- [x] Pagina `/calendario` com vista mensal:
  - Grid de dias do mes com DayCell components
  - Cada dia mostra: pedidos/capacidade + mini barra de progresso
  - Cores: verde (disponivel), amarelo (quase lotado), vermelho (lotado), cinza (bloqueado/passado)
  - Clicar num dia mostra modal com lista de pedidos desse dia
- [x] Navegacao mes anterior/proximo
- [x] Botao "Bloquear dia" (marcar como folga/feriado) via modal
- [x] Botao "Alterar capacidade" (mudar maximo de bolos por dia) via modal
- [x] Mobile: calendario compacto com grid responsivo

### Ficheiros a Criar
- `src/app/(dashboard)/calendario/page.tsx`
- `src/components/calendario/month-view.tsx`
- `src/components/calendario/day-cell.tsx`
- `src/components/calendario/day-detail-modal.tsx`

---

*-- River, removendo obstaculos 🌊*
