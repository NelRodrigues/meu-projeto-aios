# PRD — SIC Porcelana Beauty (Brownfield)

**Product Requirements Document · CRM Inteligente para Centro de Estética**

| Campo | Detalhe |
|---|---|
| **Produto** | SIC — Sistema de Inteligência Comercial (Porcelana Beauty) |
| **Tipo** | Brownfield — evolução/adaptação da base ISILDA |
| **Cliente** | Porcelana Beauty — Yolenia Balaca |
| **Fornecedor** | Marca Digital — Nelson Rodrigues (CEO) |
| **Base técnica** | ISILDA (CRM Delicias da Isi) — `/Users/admin/PROJECTOS/ISILDA` |
| **Autor** | Morgan (PM Agent) — Marca Digital |
| **Versão** | 1.2 (Validado + achados CRM Salus) |
| **Data** | 9 de Junho de 2026 |
| **Brief-fonte** | `docs/analise/project-brief-porcelana-beauty.md` (Atlas) |
| **Estado** | ✅ Validado @po · v1.2 incorpora FR26-28 (escalação/roleplay/opt-out) do CRM Salus · pronto para @sm |

---

## 1. Introdução e Contexto do Projecto Existente

### 1.1 Resumo do projecto existente (ISILDA)

A base técnica deste produto é a **ISILDA** — um CRM inteligente em produção para uma confeitaria artesanal (Delicias da Isi). É um sistema maduro com:

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (PostgreSQL + pgvector + pg_cron + RLS + Storage + Realtime) · Edge Functions (Deno) · Anthropic API · uazapi (WhatsApp) · Vercel.
- **31 migrações** SQL, 9 tabelas dedicadas ao agente IA, múltiplas Edge Functions.
- **Motor conversacional WhatsApp** maduro: debounce, fila (queue), rate-limiting por hora/dia, locks de processamento, follow-ups agendados, cadences de recompra, análise de imagem (vision).
- **Frontend completo:** Inbox, Kanban, Calendário, Clientes, Dashboard, Catálogo, Configurações, Equipa, Consola do Agente IA.
- **Arquitectura single-tenant** (roles `admin`/`assistente`; sem multi-tenancy enforçado).

### 1.2 Decisão estratégica: Fork dedicado

O SIC Porcelana Beauty será uma **instância dedicada** (fork da ISILDA), **não** um inquilino numa plataforma partilhada. Justificação:
- A ISILDA é single-tenant por design (RLS `USING (true)` para authenticated).
- Domínio diferente (estética vs. confeitaria) exige adaptação de schema, não configuração.
- Isolamento de dados (dados de saúde/estética são sensíveis) e de instância WhatsApp.

### 1.3 Âmbito da mudança (brownfield delta)

| Categoria | % esforço | Descrição |
|---|---|---|
| **REUSAR** | ~50% | Motor do agente, clientes, pagamentos, mensagens, ocasiões, frontend-shell |
| **ADAPTAR** | ~30% | pedidos→agendamentos, calendario_producao→calendario_agenda, catálogo→serviços, vision, prompt |
| **NOVO** | ~20% | Pacotes/subscrição, agendamento multi-recurso, funil 2-portas, plano multi-sessão |

> **Nota sobre as percentagens:** o Brief refere "~80% dos problemas estruturais já resolvidos pela ISILDA" (métrica de *capacidade-problema*: que dores já têm solução existente). A tabela acima é a *métrica de esforço-código* (reusar vs. adaptar vs. escrever de novo). São lentes diferentes da mesma realidade: a base existente cobre a maioria das necessidades (≈80%), mas adaptar o domínio + construir os módulos novos representa ≈50% de código intocado + 50% de trabalho.

---

## 2. Objectivos e Contexto de Negócio

### 2.1 Objectivos (Goals)

1. **Eliminar a dependência da fundadora** — o negócio deve operar com qualidade na ausência física da Yolenia.
2. **Nunca perder uma lead** — atendimento WhatsApp 24/7 com resposta <60s.
3. **Eliminar no-shows** — lembrete 24h + reagendamento automático (recuperar ~360.000 Kz/mês).
4. **Criar receita previsível** — pacotes mensais de recorrência + Cartão Black (hoje: zero recorrência estruturada).
5. **Padronizar a experiência** — guião de atendimento alinhado com o agente IA.
6. **Consolidar e activar a base** de ~398 clientes (hoje fragmentada em 2 softwares).

### 2.2 Contexto (Background)

A Porcelana Beauty tem excelência técnica, base fiel e presença social — mas cresce "apesar do sistema, não graças a ele". A mudança para novo espaço em Junho 2026 é o momento de relançamento (físico + digital + operacional). O SIC estrutura e escala o que já funciona, sem reinventar o negócio.

### 2.3 Métricas de Sucesso (alinhadas com garantias contratuais)

| Métrica | Alvo | Garantia associada |
|---|---|---|
| Tempo de resposta WhatsApp | <60s, 24/7 | — |
| No-shows | −2/semana (~360k Kz/mês recuperados) | — |
| Leads qualificadas no pipeline | +20% em 30 dias | Garantia de Resultados (senão −50% setup) |
| Adopção pela equipa | Uso activo em 30 dias | Garantia de Adopção (senão refaz formação) |
| Clientes em pacote mensal | >0 (de zero) | — |

### 2.4 Changelog

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-06-08 | 1.0 | Draft inicial brownfield a partir do brief do Atlas | Morgan (PM) |
| 2026-06-08 | 1.1 | Validação PO: 7/7 achados resolvidos (FR25 marketing, FR1 masculino, NFR9 adopção, Agente 2 no Epic 6, tabelas-base no Epic 1, diagrama de dependências, nota de %) | Pax (PO) |
| 2026-06-09 | 1.2 | Auditoria do CRM-Agêntico Salus: +FR26 (escalação determinística), +FR27 (roleplay/treino), +FR28 (opt-out), +FR22b (inteligência estruturada). Novo Epic 8 (Treino e Conformidade). Padrões P3/P6 como melhorias incrementais | Aria (Architect) |

---

## 3. Requisitos

### 3.1 Requisitos Funcionais (FR)

**Pilar 2 — Comercial / Agente IA (núcleo)**

- **FR1:** O sistema deve receber e responder mensagens WhatsApp 24/7 via uazapi, com persona feminina, tom formal e caloroso. Tratamento por defeito no feminino ("a senhora {Nome}"), mas **deve suportar o tratamento masculino ("o senhor {Nome}")** quando o contexto o indica (ex.: depilação masculina, cliente do sexo masculino).
- **FR2:** O agente nunca abre com preços; qualifica primeiro (Recepção → Qualificação → Pré-Avaliação/Agendamento → encaminhamento).
- **FR3:** O agente deve receber imagens da cliente (foto da pele/zona) e indicar procedimento provável (vision).
- **FR4:** O sistema deve aplicar um **funil de qualificação de 2 portas**: rotear a cliente para (a) consulta com a fundadora ou (b) directo para as técnicas, segundo critérios configuráveis.
- **FR5:** O agente deve gerir objecções (preço/tempo/confiança) com a estratégia validar→compreender→reposicionar→próximo passo leve, e encaminhar para humano quando persistente.
- **FR6:** O sistema deve suportar 3 papéis funcionais de agente: Atendimento/Qualificação, Suporte Operacional, Pós-Venda/Fidelização.
- **FR7:** O conhecimento do agente (FAQ 11 secções + Guia de Objecções) deve ser carregável via system_prompt e templates_whatsapp.

**Agendamento e No-shows**

- **FR8:** O sistema deve permitir agendamento de tratamentos com base na disponibilidade real (técnica × sala × tempo de preparação).
- **FR9:** O sistema deve impedir sobreposições e marcações demasiado próximas, com intervalos de preparação de sala configuráveis.
- **FR10:** O sistema deve permitir tratamentos simultâneos quando há capacidade operacional.
- **FR11:** O sistema deve enviar lembrete automático 24h antes da sessão, com opção de reagendamento.
- **FR12:** O sistema deve registar e gerir cancelamentos e reagendamentos.

**Pagamentos**

- **FR13:** O sistema deve suportar pré-pagamento progressivo (modelo 50% no acto da marcação / 50% após), com registo de comprovativo e confirmação manual.
- **FR14:** O sistema deve registar pagamentos por multicaixa, transferência ou dinheiro.

**Pacotes e Recorrência (NOVO)**

- **FR15:** O sistema deve permitir definir pacotes de recorrência mensais (Essencial 80k, Porcelana 150k, Cartão Black 250k Kz/mês).
- **FR16:** O sistema deve associar clientes a pacotes/subscrições e controlar sessões consumidas vs. disponíveis.
- **FR17:** O Cartão Black deve conferir prioridade e benefícios diferenciados configuráveis.
- **FR18:** O sistema deve suportar planos de tratamento multi-sessão (ex.: laser 6-8 sessões) com tracking de progresso por cliente.

**Gestão, Segmentação e Fidelização**

- **FR19:** O sistema deve segmentar clientes em ≥3 categorias com comunicação diferenciada.
- **FR20:** O sistema deve gerir ocasiões da cliente (aniversários, datas) para campanhas de fidelização.
- **FR21:** O agente Pós-Venda deve enviar cuidados pós-tratamento, recolher feedback e potenciar venda de home care.
- **FR22:** O sistema deve fornecer um dashboard com KPIs de estética (leads, conversão, no-shows, recorrência, análise 80/20).
- **FR22b:** O sistema deve gerar, por conversa e **numa única chamada de IA por mensagem**, inteligência estruturada de perfil: sentimento, score de probabilidade de marcação (0-100), arquétipo de cliente (estética), sinais BANT e resumo vivo. *(Padrão P4 Salus — `generateObject`+Zod; alimenta dashboard e funil.)*

**Dados e Catálogo**

- **FR23:** O sistema deve importar e consolidar a base de ~398 clientes (origem: software de gestão + faturação).
- **FR24:** O sistema deve manter um catálogo de serviços (facial, corporal, laser, cera, sobrancelhas, home care) com preços por zona/protocolo e flag "sob consulta".

**Pilar 1 — Marketing (componente de software)**

- **FR25:** O sistema deve registar a origem da lead (UTM source/medium/campaign + canal: Instagram/TikTok/Facebook/WhatsApp/indicação) para que a fundadora veja que conteúdo/CTA gera contactos. *(Pilar 1 é maioritariamente serviço/processo — calendário editorial e produção em bloco ficam fora do CRM; apenas o rastreio de origem é software, e já existe na ISILDA via campos `utm_*` e `origem` da tabela `clientes`.)*

**Treino, Inteligência e Conformidade (incorporados do CRM-Agêntico Salus)**

> Origem: `docs/architecture/analise-crm-salus-aproveitamento.md` — padrões superiores não existentes na ISILDA.

- **FR26:** O sistema deve aplicar **escalação determinística para humano ANTES de o agente responder**, por regras configuráveis (palavra-chave, pedido explícito de humano, sentimento negativo). Não depende do LLM "decidir bem" — é guard de negócio. *(Padrão P1 Salus; reforça o Guia de Objecções "encaminhar sem hesitar".)*
- **FR27:** O sistema deve fornecer um **módulo de roleplay/treino**: a equipa treina conversas contra personas-IA de cliente de estética (ex.: cética do preço, grávida, pós-parto, cliente que viu mais barato), com **avaliação automática** do desempenho (cumprimento do tom formal, regra de não-abrir-preço, gestão de objecções). *(Padrão P2 Salus; operacionaliza a "formação da equipa" e a Garantia de Adopção.)*
- **FR28:** O sistema deve suportar **opt-out de conformidade**: se a cliente responde a palavra exacta de saída, o agente para de responder, as campanhas/follow-ups são suspensos e regista-se `opted_out_at`. *(Padrão P5 Salus; conformidade RGPD ao contactar a base importada de ~398.)*

### 3.2 Requisitos Não-Funcionais (NFR)

- **NFR1:** Resposta do agente em <60s (percebido pela cliente), respeitando debounce e delays humanizados já existentes na ISILDA.
- **NFR2:** Disponibilidade 24/7 do canal de atendimento; fora de horário, mensagem de cortesia automática.
- **NFR3:** Idempotência de webhooks WhatsApp (já presente na ISILDA — `webhook_idempotency`).
- **NFR4:** Rate-limiting por conversa (hora/dia) para evitar spam e estouro de custos de API.
- **NFR5:** Conformidade de dados pessoais — consentimentos + anonimização RGPD (reusar `consentimentos`, `rgpd_anonymize`). Dados de estética são sensíveis.
- **NFR6:** Isolamento da instância (fork dedicado, instância WhatsApp própria, projecto Supabase próprio).
- **NFR7:** Custos de LLM controlados (Haiku para classificação, Sonnet para conversa, como na ISILDA).
- **NFR8:** Pt-AO em toda a comunicação e interface.
- **NFR9:** A "adopção pela equipa" (garantia contratual) deve ser **mensurável**: o sistema regista, por colaboradora, agendamentos criados/geridos e acessos nos últimos 30 dias. Critério de "uso activo" = ≥1 acção operacional/dia útil por ≥80% da equipa. *(Reusa logs/auditoria existentes; expõe no dashboard — Epic 7.)*

### 3.3 Requisitos de Compatibilidade (Brownfield)

- **CR1:** Manter a stack da ISILDA (Next.js 16 / Supabase / Edge Functions / uazapi) sem reescritas desnecessárias.
- **CR2:** Reusar o schema de `clientes`, `ai_agent_*`, `mensagens_whatsapp`, `pagamentos`, `ocasioes_cliente` com o mínimo de alterações destrutivas.
- **CR3:** Adaptações de domínio (pedidos→agendamentos, catálogo→serviços) devem preservar os padrões de RLS, triggers `updated_at` e convenções de nomes da ISILDA.
- **CR4:** Novos módulos (subscrição, agendamento multi-recurso) devem integrar-se com o motor de agente existente via o padrão de `ai_agent_tools`.

---

## 4. Restrições e Premissas

| Tipo | Descrição |
|---|---|
| **Restrição temporal** | Arranque coincide com mudança de instalações (Junho 2026); abordagem "um passo de cada vez". |
| **Restrição comercial** | Setup 750.000 Kz (pagamento único) + SIC Pro 250.000 Kz/mês. |
| **Premissa** | Cliente fornece base de ~398 clientes consolidada e critérios de qualificação antes da construção do agente. |
| **Premissa** | uazapi.dev como gateway WhatsApp (mesmo da ISILDA/Marca Digital). |
| **Premissa cultural** | Pré-pagamento introduzido gradualmente (educação da base faz parte da implementação). |

---

## 5. Riscos

| Risco | Sev. | Mitigação |
|---|---|---|
| Consolidação dos 398 clientes em atraso bloqueia import | 🔴 Alta | Definir mapeamento de campos cedo; é acção do cliente (kick-off #3) |
| Critérios de qualificação (fundadora vs. técnicas) indefinidos | 🟠 Média | Workshop com cliente antes de F1 |
| Agendamento multi-recurso é o ponto técnico mais novo | 🟠 Média | Faseável: v1 com capacidade simples (estilo ISILDA), evoluir depois |
| Modelo de subscrição não existe na ISILDA | 🟠 Média | Schema novo dedicado (F4); desenho validado pelo @architect |
| Tabela de preços por zona incompleta | 🟡 Baixa | Flag "sob consulta" alinha com a regra de não abrir preço |
| Sobreposição com mudança de instalações | 🟡 Baixa | Roadmap faseado já alinhado |

---

## 6. Estrutura de Epics

> **Sequência lógica:** fundação → agente → agendamento → pagamentos → pacotes → fidelização → dashboard. Cada epic entrega valor incremental e mantém o sistema operável.

### Epic 1 — Fundação e Migração da Base (F0)
**Objectivo:** Fork da ISILDA, schema-core operacional e base de clientes importada.
- Provisionar instância dedicada (Supabase + Vercel + instância WhatsApp uazapi).
- Migrar schema-core reusável: `profiles`, `clientes`, `interacoes`, `mudancas_estagio`, `notificacoes`, `ai_agent_*`, `mensagens_whatsapp`, `whatsapp_instances`, `integration_keys`, `webhook_idempotency`, `consentimentos`, `rgpd_anonymize`, `storage_buckets`, `view_conversas_activas`.
- Importar e consolidar ~398 clientes (mapeamento gestão + faturação).
- *Cobre: FR23, FR25, NFR3, NFR5, NFR6, CR1, CR2.*

### Epic 2 — Agente de Atendimento e Qualificação (F1)
**Objectivo:** Agente 1 a operar no WhatsApp com persona/FAQ/objecções e vision.
- Configurar `ai_sales_agents` com system_prompt (persona feminina/formal, FAQ 11 secções, Guia de Objecções).
- Carregar `templates_whatsapp` (boas-vindas, qualificação, horários, encerramento).
- Implementar funil de qualificação de 2 portas (tool de roteamento fundadora/técnicas).
- Adaptar `process-vision` para foto da pele → procedimento provável.
- *Cobre: FR1, FR2, FR3, FR4, FR5, FR6, FR7, NFR1, NFR2, NFR4, NFR7, CR4.*

### Epic 3 — Agendamento e Anti No-shows (F2)
**Objectivo:** Marcação real e eliminação de faltas.
- Adaptar `pedidos`→`agendamentos` (serviço, técnica, sala, duração, estados estética).
- Adaptar `calendario_producao`→`calendario_agenda` (técnica × sala × intervalo de preparação × simultaneidade).
- Lembrete 24h + reagendamento + cancelamento (tools do agente + cron).
- *Cobre: FR8, FR9, FR10, FR11, FR12, CR3.*

### Epic 4 — Pagamentos e Pré-pagamento (F3)
**Objectivo:** Caixa previsível via pré-pagamento progressivo.
- Reusar `pagamentos`; implementar fluxo 50%/50% progressivo.
- Registo de comprovativo + confirmação manual.
- *Cobre: FR13, FR14.*

### Epic 5 — Pacotes, Recorrência e Cartão Black (F4) — NOVO
**Objectivo:** Receita recorrente estruturada.
- Schema novo: `pacotes`, `subscricoes`, `sessoes_consumidas`.
- Pacotes Essencial/Porcelana/Cartão Black + benefícios diferenciados.
- Planos de tratamento multi-sessão (laser 6-8) com tracking.
- Cadences de recompra/upsell (base: `recompra-cron`).
- *Cobre: FR15, FR16, FR17, FR18.*

### Epic 6 — Pós-Venda, Fidelização e Segmentação (F5)
**Objectivo:** Manter a cliente ligada entre visitas e construir comunidade.
- **Agente 2 — Suporte Operacional:** dúvidas pós-agendamento, confirmação de horários, libertar as técnicas (modo do agente, reusa o motor conversacional).
- Agente 3 (cuidados pós-tratamento, feedback, home care).
- Reusar `ocasioes_cliente` para campanhas de aniversário.
- Segmentação em ≥3 categorias com comunicação diferenciada.
- *Cobre: FR6 (Agente 2), FR19, FR20, FR21.*

### Epic 7 — Dashboard e Inteligência (F6)
**Objectivo:** Visibilidade para a fundadora-gestora.
- Adaptar dashboard com KPIs de estética (leads, conversão, no-shows, recorrência).
- Análise 80/20 (serviços que geram 80% da facturação).
- Catálogo de serviços com preços por zona / "sob consulta".
- Inteligência de perfil estruturada (sentiment/score/arquétipo/BANT/resumo) via `generateObject`+Zod.
- Kanban com badge "agente por coluna" (workflow/IA/humano) — clareza operacional (P6 Salus, opcional).
- *Cobre: FR22, FR22b, FR24.*

### Epic 8 — Treino e Conformidade do Agente (incorporado do CRM Salus)
**Objectivo:** Operacionalizar a formação da equipa e blindar a conformidade.
- **Escalação determinística** antes da resposta do agente (palavra-chave/pedido/sentimento), configurável (FR26).
- **Módulo de roleplay/treino:** personas-IA de estética + avaliação automática (tom formal, regra de não-preço, objecções) (FR27).
- **Opt-out de conformidade** + kill-switch de campanhas (FR28).
- *Cobre: FR26, FR27, FR28.*
- *Dependências: FR26 e parte do roleplay encaixam no Epic 2 (agente). FR28 reforça Epic 6 (campanhas). Epic 8 agrupa-os como bloco de qualidade/conformidade.*

---

## 7. Sequenciamento e Dependências

```
Epic 1 (Fundação)
   └─→ Epic 2 (Agente)
          └─→ Epic 3 (Agendamento)
                 ├─→ Epic 4 (Pagamentos)
                 └─→ Epic 5 (Pacotes) ──→ Epic 6 (Fidelização)
                                              └─→ Epic 7 (Dashboard)
```

- **Epic 1** é pré-requisito de tudo.
- **Epic 2 → Epic 3** sequencial: o agente (2) precisa de existir antes de o agendamento (3) ter tools.
- **Epic 3** é o ponto de ramificação: Epic 4 (pagamentos) e Epic 5 (pacotes) dependem ambos dele — pacotes precisa de agendamento para contar sessões consumidas.
- **Epic 2 + Epic 3** = MVP operacional (atendimento + agendamento). **Marco de go-live mínimo.**
- **Epic 7** consome dados de todos os anteriores (vem por último).

---

## 8. MVP vs. Pós-MVP

| Inclusão | Epics | Racional |
|---|---|---|
| **MVP (go-live Junho)** | 1, 2, 3 + pré-pagamento básico (4 parcial) + **FR26 (escalação) e FR28 (opt-out) do Epic 8** | Resolve as dores mais agudas; escalação e opt-out são conformidade/qualidade essenciais ao arrancar com a base importada |
| **Fase 2 (Julho+)** | 4 completo, 5 (pacotes), 6 (fidelização), **FR27 roleplay (Epic 8)** | Receita recorrente, retenção e treino formal da equipa |
| **Fase 3** | 7 (dashboard avançado + inteligência estruturada), refinamentos | Inteligência depois de haver dados reais |

---

## 9. Handoff para o Architect

**Decisões técnicas que requerem o @architect:**
1. Validar a estratégia de **fork dedicado** vs. eventual multi-tenancy futuro.
2. Desenhar o schema dos **módulos NOVOS** (pacotes/subscrição, agendamento multi-recurso).
3. Definir a estratégia de **migração/import** dos 398 clientes.
4. Mapear as **tools do agente** novas (qualificar, agendar, propor avaliação, consultar disponibilidade).
5. Decidir a abordagem de **agendamento multi-recurso** (v1 simples vs. completo).

**Após arquitectura:** @sm para criar as stories de cada epic; @po para validação.

---

*PRD elaborado por Morgan (PM Agent) — Marca Digital · 8 de Junho de 2026*
*Brownfield enhancement sobre a base ISILDA · Brief-fonte: Atlas*

---

## 10. Resolution Tracking (Validação PO)

| Achado | Severidade | Estado | Acção aplicada |
|---|---|---|---|
| F01 — Pilar 1 (Marketing) sem FR/epic | SHOULD-FIX | ✅ FIXED | FR25 (rastreio UTM/origem) + nota de âmbito; coberto no Epic 1/7 |
| F02 — Discrepância %reuso (80% vs 50%) | SHOULD-FIX | ✅ FIXED | Nota clarificadora na secção 1.3 (capacidade-problema vs. esforço-código) |
| F03 — Agente 2 sem tarefas próprias | NICE | ✅ FIXED | Adicionado ao Epic 6 (modo Suporte Operacional), mapeado a FR6 |
| F04 — Tabelas-base ISILDA não listadas | NICE | ✅ FIXED | `interacoes`, `mudancas_estagio`, `notificacoes`, `storage_buckets`, `view_conversas_activas` no Epic 1 |
| F05 — Diagrama de dependências ambíguo | INFO | ✅ FIXED | Diagrama redesenhado; Epic 3 como ponto de ramificação |
| F06 — Tratamento masculino em falta | INFO | ✅ FIXED | FR1 ajustado para suportar "o senhor {Nome}" |
| F07 — Adopção sem critério mensurável | INFO | ✅ FIXED | NFR9 com critério objectivo (≥80% equipa, ≥1 acção/dia útil/30d) |

**Total: 7/7 resolvidos (100%)** · Veredicto: **GO** · Pontuação pós-correcção: **9.5/10**

*Validação por Pax (PO Agent) — Marca Digital · 8 de Junho de 2026*
