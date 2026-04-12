# Relatorio de Validacao PO — Stories Delicias da Isi

**Data:** 12 de Abril de 2026
**Autor:** Pax (PO Agent)
**Status:** APROVADO COM OBSERVACOES

---

## 1. Analise de Cobertura FR → Story

| FR | Descricao | Story | Status |
|----|-----------|-------|--------|
| FR1 | Webhook UAZAPI receber + 200 OK < 2s | 2.2 | OK |
| FR2 | Validar webhook token | 2.2 | OK |
| FR3 | Idempotencia webhook | 2.2 | OK |
| FR4 | Normalizar telefone Angola | 2.1, 2.2 | OK |
| FR5 | PGMQ debounce | 2.2, 2.4 | OK |
| FR6 | Suportar texto, imagem, audio, video, doc | 2.2 | OK |
| FR7 | Classificar 16 intencoes | 2.3 | OK |
| FR8 | Confianca >= 70% auto-resposta | 2.3 | OK |
| FR9 | Registar metricas LLM | 2.3 | OK |
| FR10 | Sonnet complexo, Haiku simples | 2.3 | OK |
| FR11 | System prompt confeitaria | 2.3, 2.4 | OK |
| FR12 | Frases proibidas | 2.3 | OK |
| FR13 | Horario 08:00-20:00 WAT | 2.3 | OK |
| FR14 | Typing indicator | 2.3 | OK |
| FR15 | Enviar texto UAZAPI | 2.1, 2.3 | OK |
| FR16 | Enviar imagem UAZAPI | 2.1, 8.3 | OK |
| FR17 | Auth header token | 2.1 | OK |
| FR18 | Status entrega (ack) | 2.2 | OK |
| FR19 | 3 modos: bot/humano/pausado | 2.3, 3.3 | OK |
| FR20 | Escalacao automatica | 2.3 | OK |
| FR21 | Mensagem de escalacao | 2.3 | OK |
| FR22 | Assumir/devolver conversa | 3.3 | OK |
| FR23 | Auto-pause quando humano envia | 3.3 | OK |
| FR24 | Pipeline Vision 7 passos | 8.2 | OK |
| FR25 | Iteracao conversacional visual | 8.3 | OK |
| FR26 | Fallback design personalizado | 8.2 | OK |
| FR27 | Fallback foto baixa qualidade | 8.2 | OK |
| FR28 | Catalogo com campos completos | 5.1 | OK |
| FR29 | Multiplos tamanhos/precos | 5.1, 5.2 | OK |
| FR30 | Embedding auto no upload | 5.1 | OK |
| FR31 | Galeria mobile-first + filtros | 5.2 | OK |
| FR32 | Importar catalogo Anexo A | 5.2 | OK |
| FR33 | Campos do pedido | 6.1 | OK |
| FR34 | Estados do pedido (8) | 6.1 | OK |
| FR35 | Audit trail mudancas estado | 6.1 | OK |
| FR36 | Kanban drag-and-drop | 6.2 | OK |
| FR37 | Card com dados resumidos | 6.2 | OK |
| FR38 | Bot cria pedido via conversa | 6.3 | OK |
| FR39 | Calendario mensal | 7.2 | OK |
| FR40 | Pedidos + capacidade por dia | 7.2 | OK |
| FR41 | Capacidade configuravel | 7.2 | OK |
| FR42 | Alerta conflito dia lotado | 7.2 | OK |
| FR43 | Bot consulta calendario | 7.1 | OK |
| FR44 | Campos do cliente | 4.1 | OK |
| FR45 | Auto-criacao via webhook | 2.2, 4.2 | OK |
| FR46 | Nome perfil WhatsApp | 2.2 | OK |
| FR47 | Importacao CSV | 4.2 | OK |
| FR48 | Ficha detalhada cliente | 4.1 | OK |
| FR49 | Registar ocasioes | 9.1, 9.3 | OK |
| FR50 | Bot pergunta naturalmente | 9.3 | OK |
| FR51 | Cron diario recompra | 9.2 | OK |
| FR52 | Guard 300 dias | 9.1, 9.2 | OK |
| FR53 | Respeitar horario + limites | 9.2 | OK |
| FR54 | Inbox 3 paineis | 3.1 | OK |
| FR55 | Lista conversas campos | 3.1 | OK |
| FR56 | Filtros conversas | 3.1 | OK |
| FR57 | Bolhas coloridas por remetente | 3.2 | OK |
| FR58 | Thumbnails clicaveis | 3.2 | OK |
| FR59 | Envio manual + templates | 3.2 | OK |
| FR60 | Realtime < 1s | 3.1, 3.2 | OK |
| FR61 | Sidebar cliente | 3.3 | OK |
| FR62 | Botoes accao | 3.3 | OK |
| FR63 | Bot envia dados bancarios | 10.1 | OK |
| FR64 | Upload comprovativo | 10.1 | OK |
| FR65 | Botao confirmar pagamento | 10.1 | OK |
| FR66 | Tabela pagamentos | 10.1 | OK |
| FR67 | Dashboard KPIs | 10.2 | OK |
| FR68 | Dashboard graficos | 10.2 | OK |
| FR69 | Accoes urgentes | 10.2 | OK |
| FR70 | Checklist diaria | 10.3 | OK |
| FR71 | Estado persiste por dia | 10.3 | OK |
| FR72 | Checklist acessivel | 10.3 | OK |

### Resultado: **72/72 FRs cobertos (100%)**

---

## 2. Validacao de Priorizacao

| Aspecto | Avaliacao |
|---------|-----------|
| **Sequencia de dependencias** | Correcta — schema antes de funcoes, funcoes antes de UI |
| **P0 vs P1** | Adequado — core (bot, inbox, pedidos) e P0; auxiliar (dashboard, checklist) e P1 |
| **Fase 1 como MVP funcional** | Sim — ao fim da Fase 1 o bot responde e o inbox funciona |
| **Fase 2 viabiliza operacao** | Sim — catalogo + pedidos + calendario = operacao real |
| **Fase 3 como diferenciador** | Correcto — Vision e o "uau" mas nao bloqueia operacao |
| **Fase 4 como crescimento** | Correcto — recompra e crescimento, nao necessidade imediata |
| **Fase 5 como polish** | Adequado — pagamentos e dashboard podem vir depois |

**Priorizacao aprovada.**

---

## 3. Gaps Identificados

### 3.1 Gaps Menores (nao bloqueiam aprovacao)

| # | Gap | Impacto | Recomendacao |
|---|-----|---------|--------------|
| G1 | **Configuracoes do agente IA (ecra E8 do PRD)** — nao tem story dedicada para UI de configuracao do system prompt, guardrails, horario | Baixo — admin pode configurar via BD no MVP | Adicionar como story P2 na Fase 5 ou pos-MVP |
| G2 | **Analytics IA (ecra E9 do PRD)** — nao tem story dedicada para dashboard de metricas do bot | Baixo — dados existem nos logs, UI pode vir depois | Adicionar como story P2 pos-MVP |
| G3 | **Migration 016 (indicacoes)** — mencionada na Arq mas sem story | Baixo — programa referral e nice-to-have | Pos-MVP |
| G4 | **Exportacao CSV de clientes** — mencionado na Story 4.2 mas sem detalhe nos criterios | Baixo | Ja esta no criterio, manter |
| G5 | **Notificacoes UI** — tabela criada em 1.3 mas sem story para UI de notificacoes (badge + lista) | Medio — Isi precisa ver alertas | Incluir na Story 3.1 ou 3.3 |

### 3.2 Recomendacao para G5 (Notificacoes)

O gap mais relevante e **G5**. A Story 3.1 menciona "badge com contagem de conversas pendentes" mas nao cobre a lista completa de notificacoes (takeover, pagamento, conflito calendario, recompra). Recomendo adicionar ao criterio da Story 3.3 (sidebar) ou criar Story 3.4 especifica.

**Accao:** Adicionar ao criterio de aceitacao da Story 3.3:
```
- [ ] Icone de sino na sidebar/header com badge de contagem
- [ ] Dropdown/painel de notificacoes com lista (tipo, mensagem, timestamp, lida/nao-lida)
- [ ] Marcar como lida ao clicar
- [ ] Supabase Realtime para novas notificacoes
```

---

## 4. Validacao de Qualidade das Stories

| Criterio | Resultado |
|----------|-----------|
| Cada story tem descricao clara | OK |
| Cada story tem criterios de aceitacao testáveis | OK |
| Cada story referencia PRD (FR) e Arq | OK |
| Cada story lista ficheiros a criar/editar | OK |
| Cada story indica fonte de codigo (reutilizacao) | OK |
| Estimativas sao realistas | OK — total ~25-30 dias = 5-6 semanas |
| Dependencias entre stories sao claras | OK — sequencia respeitada |

---

## 5. Decisao Final

### APROVADO para handoff ao @dev

**Condicoes:**
1. Adicionar criterios de notificacoes a Story 3.3 (Gap G5)
2. Gaps G1, G2, G3 ficam como backlog pos-MVP

### Ordem de execucao recomendada:

```
SPRINT 1 (Semana 1-2): Stories 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 2.4
  Entregavel: Bot WhatsApp a funcionar end-to-end

SPRINT 2 (Semana 2-3): Stories 3.1 → 3.2 → 3.3 → 4.1 → 4.2
  Entregavel: Inbox + Clientes funcionais

SPRINT 3 (Semana 3-4): Stories 5.1 → 5.2 → 6.1 → 6.2 → 6.3 → 7.1 → 7.2
  Entregavel: Catalogo + Pedidos + Calendario

SPRINT 4 (Semana 4-5): Stories 8.1 → 8.2 → 8.3 → 9.1 → 9.2 → 9.3
  Entregavel: Vision Multi-Modal + Motor Recompra

SPRINT 5 (Semana 5-6): Stories 10.1 → 10.2 → 10.3 → 10.4 → 10.5
  Entregavel: Pagamentos + Dashboard + Go-Live
```

---

*-- Pax, equilibrando prioridades*
*Validacao PO v1.0 — Delicias da Isi CRM Inteligente*
*Marca Digital · Abril 2026*
