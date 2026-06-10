# Epic 3 — Agendamento e Anti No-shows

**SIC Porcelana Beauty · MVP (F2) · Marcação real + eliminação de faltas**

| Campo | Detalhe |
|---|---|
| **Epic** | E3 — Agendamento e Anti No-shows |
| **Objectivo** | Marcação real (técnica×sala×tempo), lembrete 24h, reagendamento — eliminar no-shows |
| **PRD refs** | FR8-12, CR3 · Epic 3 |
| **Arq refs** | ADR-003 (Fase 3a) |
| **Schema** | `appointments`, `rooms`, `services` + `appointment_conflict()` (já criados/validados) |
| **Depende de** | Epic 1 (schema) + Epic 2 (agente/tools) |
| **Prioridade** | P0 |
| **Status** | ✅ **Ready** (validado @po, 9 Jun 2026) |
| **Autor** | River (SM) · 9 Jun 2026 · validado @po (Pax) |

---

## Story 3.1 — Catálogo de serviços (seed + gestão)

**Prioridade:** P0 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**PRD refs:** FR24 · `services` (já criada)

### Descrição
Como @dev, quero popular e gerir o catálogo de serviços de estética, para que o agente e o calendário conheçam duração, preparação e preços.

### Critérios de Aceitação
- [ ] Seed dos serviços do FAQ em `porcelana.services` (Consulta de Avaliação, Porcelana Skin/Premium, BB Glow, microagulhamento, microblading, Porcelana Lips Glow, radiofrequência, depilação laser por zona, cera, massagens, drenagens, esfoliação, home care)
- [ ] Categorias correctas (`facial`/`body`/`laser`/`wax`/`eyebrows`/`home_care`/`evaluation`)
- [ ] `duration_minutes` e `room_prep_minutes` por serviço
- [ ] `price_on_request=true` onde aplicável (alinhado com não-abrir-preço)
- [ ] `requires_evaluation=true` nos serviços que exigem avaliação prévia
- [ ] `recommended_sessions` (ex.: laser 6-8)
- [ ] Página `/servicos` lista/edita o catálogo (reuso do shell de catálogo)

### Notas Técnicas
- Preços por zona em `prices_by_zone` (JSONB). Muitos serviços = `price_on_request`.

---

## Story 3.2 — Salas e disponibilidade das técnicas

**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Agente sugerido:** @dev
**Arq refs:** ADR-003 · `rooms`

### Descrição
Como @dev, quero registar as salas e a disponibilidade-base das técnicas, para o motor de agendamento calcular slots reais.

### Critérios de Aceitação
- [ ] Salas registadas em `porcelana.rooms` com `supported_categories`
- [ ] Disponibilidade-base das técnicas configurada (dia da semana + horário)
- [ ] Técnicas referenciadas a `public.team_members` (cross-schema, sem FK rígida)
- [ ] Página de equipa permite gerir disponibilidade

### Notas Técnicas
- `appointments.technician_id` aponta para `public.team_members` (gerido no public do SIC GERAL).

---

## Story 3.3 — Tools de agendamento (consultar disponibilidade + agendar)

**Prioridade:** P0 | **Estimativa:** 1.5 dia
**Agente sugerido:** @dev
**ADR refs:** ADR-003, ADR-005 · `appointment_conflict()`

### Descrição
Como @dev, quero as tools `check_availability` e `schedule_appointment`, para o agente marcar tratamentos respeitando técnica, sala e preparação.

> **Idioma:** tools/identificadores em **inglês** (alinhado com o schema `appointments`/`appointment_conflict`). Conteúdo das mensagens em pt-AO.

### Critérios de Aceitação
- [ ] `check_availability(date, service)` → slots livres (considera duração + buffer + salas compatíveis + disponibilidade da técnica)
- [ ] **Extracção de data/hora em linguagem natural** ("pode ser quinta de tarde?" → data concreta) — padrão CRM Salus
- [ ] `schedule_appointment` cria `porcelana.appointments` (estado `scheduled`)
- [ ] Usa `porcelana.appointment_conflict()` — impede sobreposição por técnica E sala
- [ ] Respeita `buffer_minutes` (preparação de sala)
- [ ] Permite simultaneidade quando há salas livres
- [ ] `appointments.gate` copiado de `leads.qualification_gate` (snapshot — ver E2.2)

### Critérios de Aceitação — Teste
- [ ] 2 marcações na mesma sala dentro do buffer → 2ª rejeitada
- [ ] 2 marcações em salas diferentes à mesma hora → ambas aceites

### Notas Técnicas
- A função `appointment_conflict()` já existe e está testada (@db-sage).

---

## Story 3.4 — Lembrete 24h + reagendamento (anti no-show)

**Prioridade:** P0 | **Estimativa:** 1.5 dia
**Agente sugerido:** @dev
**PRD refs:** FR11, FR12 · ADR-003

### Descrição
Como @dev, quero lembrete automático 24h antes com opção de reagendamento, para eliminar os no-shows.

### Critérios de Aceitação
- [ ] Cron `lembrete-cron` corre diariamente, encontra agendamentos a ~24h (índice `idx_appointments_reminder`)
- [ ] Envia mensagem de lembrete (template do FAQ) via WhatsApp
- [ ] Marca `reminder_24h_sent=true` (não duplica)
- [ ] Tool `reschedule` — actualiza slot, revalida conflito (`appointment_conflict`), mantém histórico
- [ ] Cancelamento → estado `cancelled` + `cancelled_at`
- [ ] No-show → estado `no_show` + `no_show_at`

### Notas Técnicas
- Cron via `net.http_post` (padrão `recompra-cron` da ISILDA).
- Template de lembrete já existe no FAQ ("Só uma lembrança carinhosa...").

---

## Story 3.5 — Kanban/Agenda de agendamentos (UI)

**Prioridade:** P1 | **Estimativa:** 1.5 dia
**Agente sugerido:** @dev / @ux-design-expert
**PRD refs:** FR22 (parcial) · P6 Salus (badge agente)

### Descrição
Como gestora, quero ver os agendamentos num Kanban/calendário por estado e técnica, para acompanhar a operação de relance.

### Critérios de Aceitação
- [ ] Página `/agenda` — Kanban por estado (`new`→`scheduled`→`confirmed`→`done`→`completed`)
- [ ] Vista de calendário por técnica/sala (reuso do shell de calendário)
- [ ] Badge "agente por coluna" (workflow/IA/humano) — clareza operacional (P6 Salus)
- [ ] Realtime (agendamentos novos aparecem ao vivo)
- [ ] Drag-and-drop entre estados (dnd-kit, reuso)

### Notas Técnicas
- ⚠️ **Confirmar Realtime:** a publicação `supabase_realtime` do SIC GERAL pode não incluir o schema `porcelana` automaticamente. AC: verificar/adicionar `porcelana.appointments` à publicação (`ALTER PUBLICATION supabase_realtime ADD TABLE porcelana.appointments`) — pode exigir migração própria.
- Reusar o shell de Kanban/calendário da ISILDA.

---

## Story 3.6 — Pré-pagamento básico (50%)

**Prioridade:** P1 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**PRD refs:** FR13 (parcial — MVP) · Epic 4

### Descrição
Como @dev, quero registar pré-pagamento de 50% no acto da marcação, para começar a reduzir no-shows e criar previsibilidade.

### Critérios de Aceitação
- [ ] `appointments.prepay_pct` aceita 0/50/100
- [ ] Fluxo de pré-pagamento 50% no agendamento (introdução gradual)
- [ ] Comprovativo registado (`deals` ou pagamento equivalente, com confirmação manual)
- [ ] Agente comunica o pré-pagamento de forma educada (educação da base)

### Notas Técnicas
- MVP = básico; fluxo completo de pagamentos fica no Epic 4 (Fase 2).
- Confirmação manual de comprovativo (padrão ISILDA/SIC GERAL).

---

## Resumo do Epic 3

| Story | Título | Prio | Estimativa |
|---|---|---|---|
| 3.1 | Catálogo de serviços | P0 | 1d |
| 3.2 | Salas + disponibilidade | P0 | 0.5d |
| 3.3 | Tools agendamento + anti-conflito | P0 | 1.5d |
| 3.4 | Lembrete 24h + reagendamento | P0 | 1.5d |
| 3.5 | Kanban/Agenda (UI) | P1 | 1.5d |
| 3.6 | Pré-pagamento básico 50% | P1 | 1d |

**Sequência:** 3.1 → 3.2 → 3.3 → 3.4 → (3.5 ∥ 3.6)
**Total:** ~7 dias
