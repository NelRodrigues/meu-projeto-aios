# Fase 4 — Recompra por Ocasiao
## Stories 9.1 a 9.3

---

## Story 9.1 — Migration: Ocasioes + RPC

**Epic:** E9 — Recompra por Ocasiao
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**PRD refs:** FR49, FR52
**Arq refs:** Seccao 4.6 (RPC get_upcoming_occasions)

### Descricao
Como @dev, quero ter a tabela de ocasioes e o RPC de deteccao de proximas ocasioes criados.

### Criterios de Aceitacao
- [x] Migration 014: `ocasioes_cliente` com todos os campos
- [x] RPC `get_upcoming_occasions(p_dias_min, p_dias_max)` com transicao de ano e filtro de lembretes
- [ ] Testar RPC com dados dummy

### Ficheiros a Criar
- `supabase/migrations/014_ocasioes_cliente.sql`

---

## Story 9.2 — Edge Function: recompra-cron

**Epic:** E9 — Recompra por Ocasiao
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR51-FR53
**Arq refs:** Seccao 4.6, 5 (Cron 4)

### Descricao
Como @dev, quero ter o motor de recompra automatica a enviar mensagens personalizadas 30 dias antes de cada ocasiao.

### Criterios de Aceitacao
- [x] Edge Function `recompra-cron` com fluxo completo:
  - Verificacao de horario (09:00-19:00 WAT)
  - Geracao de mensagem personalizada com Claude Haiku
  - Envio UAZAPI + guardar mensagem + actualizar ultimo_lembrete + notificar Isi
  - Limite de 10 lembretes/dia
- [ ] Cron job `recompra-diaria` a configurar em Supabase

### Ficheiros a Criar
- `supabase/functions/recompra-cron/index.ts`

---

## Story 9.3 — UI Ocasioes + Registo via Bot

**Epic:** E9 — Recompra por Ocasiao
**Prioridade:** P0 | **Estimativa:** 1 dia
**PRD refs:** FR49-FR50

### Descricao
Como Isi, quero ver as ocasioes dos meus clientes e que o bot registe novas ocasioes naturalmente na conversa.

### Criterios de Aceitacao
- [x] `OccasionsSection` na ficha do cliente com lista + form + remocao + indicador dias
- [x] `OccasionForm` com tipo, nome, dia, mes, ano especifico, notas
- [x] Seccao compacta no sidebar do inbox (compact=true)
- [x] Tool `registar_ocasiao` no agente IA
- [ ] Dashboard: widget "Proximas Ocasioes" (a fazer na Fase 5)

### Ficheiros a Criar/Editar
- `src/components/clientes/occasions-section.tsx`
- `src/components/clientes/occasion-form.tsx`
- Editar: `src/components/inbox/client-sidebar.tsx` (adicionar seccao ocasioes)
- Editar: `supabase/functions/ai-sales-agent/` (adicionar tool registar_ocasiao)

---

*-- River, removendo obstaculos 🌊*
