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
- [ ] Migration 014: `ocasioes_cliente`:
  - cliente_id FK, tipo (aniversario_proprio/aniversario_filho/aniversario_familiar/casamento/batizado/formatura/natal/outro)
  - nome_pessoa, data_evento (formato "MM-DD"), ano_especifico (NULL se recorrente)
  - notas, ultimo_lembrete_enviado (DATE), activo (bool)
  - Index em `(cliente_id)`, `(data_evento)`
  - RLS activo
- [ ] RPC `get_upcoming_occasions()`:
  - Retorna ocasioes a 25-35 dias de distancia
  - Exclui se `ultimo_lembrete_enviado` < 300 dias atras
  - Junta dados do cliente (nome, telefone)
  - Calcula `dias_falta`
  - Trata correctamente a transicao de ano (ex: ocasiao em Janeiro consultada em Dezembro)
- [ ] Testar RPC com dados dummy (inserir ocasiao para daqui a 30 dias, verificar que aparece)

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
- [ ] Edge Function `recompra-cron` criada:
  1. Chamar RPC `get_upcoming_occasions()`
  2. Para cada ocasiao:
     a. Buscar ultimo pedido do cliente (para referencia)
     b. Gerar mensagem personalizada com Claude Sonnet:
        - Se tem pedido anterior: "Ola {nome}! Ja esta a pensar no aniversario da {pessoa}? No ano passado fizemos {produto} que adorou. Quer que comece a pensar em ideias?"
        - Se nao tem pedido: "Ola {nome}! O aniversario da {pessoa} esta a chegar. Gostaria de ver algumas opcoes de bolo?"
     c. Enviar via UAZAPI `/send/text`
     d. Guardar mensagem em `mensagens_whatsapp` (sender_type='bot', direction='outgoing')
     e. Actualizar `ultimo_lembrete_enviado` na ocasiao
     f. Criar notificacao para Isi (tipo='recompra')
  3. Respeitar horario (so enviar entre 09:00-19:00 WAT)
  4. Respeitar limite diario (max 10 lembretes/dia para nao parecer spam)
- [ ] Cron job configurado (diario as 09:00 WAT) — ja criado na Story 2.4 (migration 023)
- [ ] Log de execucao: quantas ocasioes processadas, quantas mensagens enviadas

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
- [ ] Seccao de ocasioes na ficha do cliente (`/clientes/[id]`):
  - Lista de ocasioes registadas: tipo, nome pessoa, data (formatada), ultimo lembrete
  - Botao "Adicionar Ocasiao":
    - Formulario: tipo (select), nome pessoa, dia (1-31), mes (1-12), ano especifico (opcional), notas
  - Botao editar/remover em cada ocasiao
  - Indicador: "Proximo lembrete em X dias" ou "Lembrete enviado ha Y dias"
- [ ] Seccao de ocasioes no sidebar do inbox (Story 3.3):
  - Lista compacta das ocasioes do cliente seleccionado
  - Botao rapido "Registar Ocasiao" (modal)
- [ ] Integracao com bot (ai-sales-agent):
  - Adicionar tool `registar_ocasiao(cliente_id, tipo, nome_pessoa, mes, dia)`
  - Bot pergunta naturalmente: "E para aniversario de quem? Quer que eu guarde para lembrar no proximo ano?"
  - Se cliente responde afirmativamente, bot chama tool
  - Bot confirma: "Pronto! Vou lembrar-me do aniversario da {pessoa} em {mes}."
- [ ] Dashboard: widget "Proximas Ocasioes" (top 5 dos proximos 30 dias)

### Ficheiros a Criar/Editar
- `src/components/clientes/occasions-section.tsx`
- `src/components/clientes/occasion-form.tsx`
- Editar: `src/components/inbox/client-sidebar.tsx` (adicionar seccao ocasioes)
- Editar: `supabase/functions/ai-sales-agent/` (adicionar tool registar_ocasiao)

---

*-- River, removendo obstaculos 🌊*
