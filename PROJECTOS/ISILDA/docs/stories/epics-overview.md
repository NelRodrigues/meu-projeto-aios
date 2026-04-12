# Epics & Stories — CRM Delicias da Isi

**Data:** 12 de Abril de 2026
**Autor:** River (SM Agent)
**PRD:** docs/prd/prd-crm-delicias-da-isi.md (v1.0)
**Arquitectura:** docs/architecture/architecture-crm-delicias-da-isi.md (v1.0)

---

## Mapa de Epics por Fase

| Epic | Fase | Duracao | Stories | Dominios PRD |
|------|------|---------|---------|--------------|
| **E1 — Fundacao e Schema** | 1 | 3 dias | 1.1-1.3 | -- |
| **E2 — Webhook + Bot Base** | 1 | 4 dias | 2.1-2.4 | D1 |
| **E3 — Inbox WhatsApp** | 1 | 3 dias | 3.1-3.3 | D6 |
| **E4 — Clientes + Pipeline** | 1 | 2 dias | 4.1-4.2 | D5.1 |
| **E5 — Catalogo + Produtos** | 2 | 3 dias | 5.1-5.2 | D3 |
| **E6 — Pedidos + Kanban** | 2 | 3 dias | 6.1-6.3 | D4.1 |
| **E7 — Calendario Producao** | 2 | 2 dias | 7.1-7.2 | D4.2 |
| **E8 — Visao Multi-Modal** | 3 | 4 dias | 8.1-8.3 | D2 |
| **E9 — Recompra por Ocasiao** | 4 | 3 dias | 9.1-9.3 | D5.2 |
| **E10 — Pagamentos + Dashboard + Polish** | 5 | 3-5 dias | 10.1-10.5 | D7, D8, D9 |

**Total: 10 epics, 32 stories**

---

## Sequencia de Implementacao

```
FASE 1 (2 semanas)
  E1 → E2 → E3 → E4
  [Schema] → [Bot] → [Inbox] → [Clientes]

FASE 2 (1-2 semanas)
  E5 → E6 → E7
  [Catalogo] → [Pedidos] → [Calendario]

FASE 3 (1 semana)
  E8
  [Vision Multi-Modal]

FASE 4 (1 semana)
  E9
  [Motor Recompra]

FASE 5 (3-5 dias)
  E10
  [Pagamentos + Dashboard + Polish + Go-Live]
```

---

## Indice de Stories

### Fase 1 — Fundacao CRM + Bot Base

| Story | Titulo | Prioridade | Estimativa |
|-------|--------|------------|------------|
| 1.1 | Setup projecto Next.js + Supabase + estrutura base | P0 | 0.5d |
| 1.2 | Migrations 001-009: schema core (profiles, clientes, mensagens, agente IA) | P0 | 1d |
| 1.3 | Migrations 018-021: templates, notificacoes, consentimentos, storage | P0 | 0.5d |
| 2.1 | Shared modules + UAZAPI client (copiar/adaptar Elsa) | P0 | 0.5d |
| 2.2 | Edge Function: uazapi-webhook-receiver (adaptar Elsa) | P0 | 1d |
| 2.3 | Edge Function: ai-sales-agent core (adaptar Elsa para Claude + confeitaria) | P0 | 2d |
| 2.4 | Proxy webhook Next.js + integration_keys seed | P0 | 0.5d |
| 3.1 | Inbox: lista de conversas com filtros + Realtime | P0 | 1d |
| 3.2 | Inbox: area de chat com bolhas + envio manual + templates | P0 | 1d |
| 3.3 | Inbox: sidebar cliente + takeover bot/humano | P0 | 1d |
| 4.1 | Lista de clientes + ficha detalhada + historico | P0 | 1d |
| 4.2 | Auto-criacao de clientes via bot + importacao CSV | P0 | 1d |

### Fase 2 — Catalogo + Pedidos + Calendario

| Story | Titulo | Prioridade | Estimativa |
|-------|--------|------------|------------|
| 5.1 | Migrations 010-011: produtos_catalogo + referencias_visuais (pgvector) | P0 | 0.5d |
| 5.2 | UI catalogo: galeria mobile-first + CRUD + seed 30 produtos | P0 | 1.5d |
| 6.1 | Migration 012: pedidos + timestamps tracking | P0 | 0.5d |
| 6.2 | Pipeline Kanban de pedidos (drag-and-drop) | P0 | 1.5d |
| 6.3 | Criacao de pedido (manual + via bot) | P0 | 1d |
| 7.1 | Migrations 013 + cron: calendario_producao + view + seed slots | P0 | 0.5d |
| 7.2 | UI calendario mensal + alertas de conflito | P0 | 1.5d |

### Fase 3 — Visao Multi-Modal

| Story | Titulo | Prioridade | Estimativa |
|-------|--------|------------|------------|
| 8.1 | llm-client.ts: adaptar para Claude Vision (multimodal) | P0 | 0.5d |
| 8.2 | Edge Function: process-vision (download, resize, Vision, embedding, similarity) | P0 | 2d |
| 8.3 | Integracao Vision com ai-sales-agent + resposta com fotos | P0 | 1.5d |

### Fase 4 — Recompra por Ocasiao

| Story | Titulo | Prioridade | Estimativa |
|-------|--------|------------|------------|
| 9.1 | Migration 014: ocasioes_cliente + RPC get_upcoming_occasions | P0 | 0.5d |
| 9.2 | Edge Function: recompra-cron + cron job diario | P0 | 1d |
| 9.3 | UI ocasioes na ficha do cliente + registo via bot | P0 | 1d |

### Fase 5 — Pagamentos + Dashboard + Polish

| Story | Titulo | Prioridade | Estimativa |
|-------|--------|------------|------------|
| 10.1 | Migration 015: pagamentos + UI confirmacao no inbox | P1 | 1d |
| 10.2 | Dashboard operacional com KPIs + graficos | P1 | 1.5d |
| 10.3 | Checklist diaria (migration 017 + UI) | P1 | 0.5d |
| 10.4 | RGPD: consentimento no primeiro contacto + opt-out | P1 | 0.5d |
| 10.5 | Polish: PWA config, testes E2E, go-live checklist | P1 | 1d |

---

*-- River, removendo obstaculos 🌊*
