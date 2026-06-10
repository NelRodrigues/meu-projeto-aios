# Epic 2 — Agente de Atendimento e Qualificação

**SIC Porcelana Beauty · MVP (F1) · Núcleo conversacional**

| Campo | Detalhe |
|---|---|
| **Epic** | E2 — Agente de Atendimento |
| **Objectivo** | Agente WhatsApp a operar com persona/FAQ/objecções, vision, funil 2-portas e escalação determinística |
| **PRD refs** | FR1-7, FR22b, FR26, NFR1, NFR2, NFR4, NFR7, CR4 · Epic 2 |
| **Arq refs** | ADR-005 (tools + funil + escalação + inteligência) |
| **Depende de** | Epic 1 (tenant, schema, WhatsApp) |
| **Prioridade** | P0 |
| **Status** | ✅ **Ready** (validado @po, 9 Jun 2026) |
| **Autor** | River (SM) · 9 Jun 2026 · validado @po (Pax) v1.1 |

> **⚠️ Nota de arquitectura (validação @po contra BD real):**
> O SIC GERAL é **híbrido**: dados de negócio vivem no schema do tenant (`porcelana.contacts`, `porcelana.appointments`...), mas **a config do agente e infra vivem em `public.*` com `tenant_id`** — `ai_sales_agents`, `message_templates`, `whatsapp_instances`, `team_members` (todas têm coluna `tenant_id` + `instance_id`).
> **Idioma das tools/código:** **inglês**, alinhado com o schema (`appointment_conflict`, `qualification_gate`). As tools chamam-se `qualify_lead`, `schedule_appointment`, etc. (não pt-AO). O *conteúdo* das mensagens é pt-AO; os *identificadores* são inglês.

---

## Story 2.1 — Configurar agente + system_prompt (persona/FAQ/objecções)

**Prioridade:** P0 | **Estimativa:** 1.5 dia
**Agente sugerido:** @dev
**Fontes:** `FAQ_Agente_WhatsApp` (11 secções), `Guia_Objecoes`, kick-off (persona)

### Descrição
Como @dev, quero configurar o agente da Porcelana com o system_prompt completo (persona feminina formal, FAQ, gestão de objecções), para que responda no tom certo e nunca abra com preços.

### Critérios de Aceitação
- [ ] Agente registado em **`public.ai_sales_agents`** com `tenant_id` = UUID da Porcelana e `instance_id` = instância WhatsApp da Porcelana (mecânica real confirmada na BD)
- [ ] system_prompt inclui: persona feminina, tom formal e caloroso ("a senhora {Nome}"), **suporta "o senhor {Nome}"** (FR1, depilação masculina)
- [ ] **Regra de ouro:** nunca abrir com preços — qualificar → propor avaliação → só dar valor se insistir
- [ ] Conhecimento das 11 secções do FAQ incorporado (boas-vindas, qualificação, horários, faciais, corporais, laser, cera, home care, preços, agendamento, encerramento)
- [ ] Gestão de objecções: validar → compreender → reposicionar → próximo passo leve (do Guia de Objecções)
- [ ] Nunca se identifica como robô/IA
- [ ] Horário de funcionamento correcto (Ter-Sex 08-19h30, Sáb 08-16h, Dom 10-17h, Seg fechado)

### Critérios de Aceitação — Teste
- [ ] Cliente pergunta preço directo → agente qualifica primeiro (não dá valor)
- [ ] Cliente diz "está muito caro" → agente valida e propõe avaliação (não pressiona)

### Notas Técnicas
- Reusar a estrutura do seed do agente da ISILDA (Soraya) como ponto de partida.
- Templates prontos do FAQ → `message_templates` (scoped tenant).

---

## Story 2.2 — Funil de qualificação 2-portas

**Prioridade:** P0 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**ADR refs:** ADR-005 (funil) · **Pré-requisito:** workshop com cliente (critérios)

### Descrição
Como @dev, quero implementar a tool `qualify_lead` que decide se a cliente vai para consulta com a fundadora ou directo para as técnicas, para rotear correctamente cada lead.

### Critérios de Aceitação
- [ ] Tool `qualify_lead` definida (formato Anthropic) e registada
- [ ] Decide `qualification_gate` = `founder` (1ª vez / plano de tratamento / caso complexo) ou `technician` (serviço directo conhecido)
- [ ] Critérios configuráveis (`action_config`) — não hardcoded
- [ ] **Fonte da verdade:** resultado gravado em `porcelana.leads.qualification_gate` (decisão de qualificação ao nível da lead). Quando se cria um agendamento, `porcelana.appointments.gate` **copia** o valor da lead (snapshot no momento da marcação).
- [ ] Serviços com `requires_evaluation=true` forçam porta `founder`

### Notas Técnicas
- ⚠️ Critérios exactos dependem do **workshop com a cliente** (risco do PRD) — implementar a mecânica, configurar os critérios depois.

---

## Story 2.3 — Tools de atendimento (propor avaliação, encaminhar)

**Prioridade:** P0 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**ADR refs:** ADR-005

### Descrição
Como @dev, quero as tools `propor_avaliacao` e `encaminhar_humano`, para o agente conduzir o fluxo de atendimento e transferir quando necessário.

### Critérios de Aceitação
- [ ] `propose_evaluation` — sugere Consulta de Avaliação quando 1ª vez ou serviço requer avaliação
- [ ] `handoff_human` — marca conversa como transferida, notifica equipa, regista evento
- [ ] Fluxo Recepção → Qualificação → Pré-Avaliação/Agendamento → encaminhamento respeitado
- [ ] Eventos registados em `porcelana.events`

### Notas Técnicas
- `agendar_tratamento` / `consultar_disponibilidade` ficam no Epic 3 (dependem do schema de agendamento já existir).

---

## Story 2.4 — Vision: foto da pele → procedimento provável

**Prioridade:** P1 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**PRD refs:** FR3 · ADR-005

### Descrição
Como @dev, quero adaptar o process-vision para que, ao receber foto da pele/zona, o agente indique o procedimento provável, para enriquecer a qualificação.

### Critérios de Aceitação
- [ ] Edge Function de vision recebe imagem da cliente
- [ ] Prompt adaptado: pele/zona → **procedimento provável** (NÃO preço)
- [ ] Resultado guardado (`appointments.reference_image` / metadata) e alimenta `qualificar_lead`
- [ ] Imagem guardada no Storage (scoped tenant)

### Notas Técnicas
- Reusar `process-vision` da ISILDA; só muda o prompt.

---

## Story 2.5 — Escalação determinística para humano (FR26)

**Prioridade:** P0 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**ADR refs:** ADR-005 (incorporação CRM Salus P1)

### Descrição
Como @dev, quero um guard determinístico que escala para humano ANTES do agente responder, para garantir transferência fiável independente do LLM.

### Critérios de Aceitação
- [ ] Função `shouldEscalate` corre como step ANTES de gerar resposta
- [ ] Escala por: palavra-chave configurável, pedido explícito ("falar com uma pessoa"), sentimento negativo
- [ ] Regras configuráveis (não hardcoded)
- [ ] Quando escala → `handoff_human` sem passar pelo LLM
- [ ] `leads.requires_human_handoff=true` + `handoff_reason` registados

### Critérios de Aceitação — Teste
- [ ] Mensagem "quero falar com uma pessoa" → escala imediatamente
- [ ] Objecção persistente → escala (não insiste)

### Notas Técnicas
- Padrão `lib/ai/escalation.ts` do CRM Salus.

---

## Story 2.6 — Inteligência de perfil estruturada (FR22b)

**Prioridade:** P1 | **Estimativa:** 1 dia
**Agente sugerido:** @dev
**ADR refs:** ADR-005 (incorporação CRM Salus P4)

### Descrição
Como @dev, quero classificação estruturada por mensagem (1 chamada IA), para alimentar dashboard e funil com sentiment/score/arquétipo/resumo.

### Critérios de Aceitação
- [ ] Por mensagem, **uma única chamada** (Haiku) via `generateObject` + schema Zod
- [ ] Devolve: sentiment, score (0-100), arquétipo-estética (noiva/gravida/pos_parto/cuidado_rotina/primeira_vez), resumo vivo, próxima acção
- [ ] Resultado guardado em `leads` (fit_score, hotness_score, metadata)
- [ ] Não faz 2ª chamada (custo controlado — NFR7)

### Notas Técnicas
- Padrão `classify.ts`/`intelligence.ts` do CRM Salus.

---

## Story 2.7 — Testes internos do agente (antes de clientes reais)

**Prioridade:** P0 | **Estimativa:** 0.5 dia
**Agente sugerido:** @qa
**Fontes:** kick-off (testes internos obrigatórios)

### Descrição
Como @qa, quero testar o agente internamente antes de o activar para clientes reais, para validar tom, processo e fluxo de marcação.

### Critérios de Aceitação
- [ ] Avaliada qualidade das respostas (10+ cenários do FAQ)
- [ ] Cumprimento do tom formal validado
- [ ] Respeito pela regra de não-abrir-preço validado
- [ ] Gestão do fluxo de marcação validada
- [ ] Relatório de progresso para a cliente com plano de ajustes

### Notas Técnicas
- O kick-off exige testes internos + relatório antes da activação.
- Antecipa o módulo de roleplay (Epic 8, Fase 2).

---

## Resumo do Epic 2

| Story | Título | Prio | Estimativa |
|---|---|---|---|
| 2.1 | system_prompt persona/FAQ/objecções | P0 | 1.5d |
| 2.2 | Funil 2-portas | P0 | 1d |
| 2.3 | Tools atendimento | P0 | 1d |
| 2.4 | Vision pele→procedimento | P1 | 1d |
| 2.5 | Escalação determinística (FR26) | P0 | 1d |
| 2.6 | Inteligência estruturada (FR22b) | P1 | 1d |
| 2.7 | Testes internos | P0 | 0.5d |

**Sequência:** 2.1 → 2.2 → 2.3 → 2.5 → (2.4 ∥ 2.6) → 2.7
**Total:** ~7 dias
