# Project Brief — SIC Porcelana Beauty

**Sistema de Inteligência Comercial · CRM Inteligente para Centro de Estética**

| Campo | Detalhe |
|---|---|
| **Cliente** | Porcelana Beauty — Yolenia Balaca (Proprietária) |
| **Sector** | Clínica/Centro de Estética — Luanda, Angola |
| **Fornecedor** | Marca Digital — Nelson Rodrigues (CEO) |
| **Produto** | SIC — Sistema de Inteligência Comercial (CRM Inteligente) |
| **Referência comercial** | MD-PB-2026-001 |
| **Base técnica de reaproveitamento** | ISILDA (CRM Delicias da Isi) |
| **Autor do brief** | Atlas (Analyst Agent) — Marca Digital |
| **Data** | 8 de Junho de 2026 |
| **Estado** | Draft v1.0 — para handoff a @architect → @sm |

---

## 1. Sumário Executivo

A Porcelana Beauty é um centro de estética em Luanda com **serviço técnico de excelência, base de ~398 clientes recorrentes e forte presença em redes sociais** — mas sem estrutura comercial. O negócio "cresce apesar do sistema, não graças a ele": depende da presença física da fundadora, perde leads por demora na resposta, sofre 1-3 no-shows/semana e não tem nenhuma cliente em pacote mensal (zero previsibilidade de receita).

O SIC vai converter este negócio num **activo previsível que funciona na ausência da fundadora**, através de três pilares articulados: **Marketing** (exposição consistente), **Comercial** (agentes IA 24/7 no WhatsApp) e **Gestão/Entrega** (pacotes de recorrência, segmentação, padronização).

**Decisão técnica central:** o CRM inteligente será construído **adaptando a arquitectura madura da ISILDA** (CRM Delicias da Isi) — Next.js 16 + Supabase + Edge Functions + agente IA com WhatsApp/uazapi. A ISILDA já resolveu ~80% dos problemas estruturais (clientes, agente conversacional com debounce/queue/rate-limit, pagamentos, calendário, ocasiões, vision). A adaptação consiste sobretudo em **trocar o domínio "confeitaria→pedidos de bolo" por "estética→agendamentos de tratamento"**.

---

## 2. Contexto de Negócio

### 2.1 Perfil da fundadora

- **Yolenia Balaca** — formação original em Economia; transição para estética por paixão.
- Já **delegou a execução técnica** à equipa (maturidade de gestão real). Concentra-se em consultas iniciais e plano de tratamento.
- **Disponibilidade reduzida** — momento pessoal/emocional exigente; recomendação (de mentor) para preservar saúde emocional e estabilizar antes de crescer agressivamente.
- **Objectivo pessoal explícito:** que o negócio funcione enquanto ela "descansa, estuda e cuida dos filhos".

### 2.2 Estrutura operacional

| Dimensão | Detalhe |
|---|---|
| **Equipa** | ~8 colaboradoras (técnicas de estética) |
| **Base de clientes** | ~398 clientes (repartidos entre software de gestão e de faturação — **carecem de consolidação**) |
| **Serviços principais** | Faciais, corporais/massagens, depilação a laser, depilação a cera, sobrancelhas (microblading), produtos home care |
| **Serviço descontinuado** | Extensão de cílios (decisão 80/20 — muito tempo, baixo retorno) |
| **Modelo de atendimento** | 2 portas: (a) consulta directa com a fundadora; (b) directo para as técnicas. Hoje a maioria entra por (b) |
| **Canais** | WhatsApp Business, Instagram, Facebook, TikTok |
| **Mudança de instalações** | Novo espaço a partir de Junho 2026 — momento de relançamento |

### 2.3 Horário de funcionamento (confirmado no FAQ)

| Dia | Horário |
|---|---|
| Terça a Sexta | 08h00 – 19h30 |
| Sábados e Feriados | 08h00 – 16h00 |
| Domingos | 10h00 – 17h00 |
| Segunda-feira | Encerrado (descanso) |

### 2.4 Catálogo de serviços (extraído do FAQ)

**Faciais/estéticos:** Consulta de Avaliação (porta de entrada obrigatória), Porcelana Skin / Porcelana Skin Premium (assinatura facial), BB Glow, tratamento de manchas, tratamento de acne, microagulhamento, microblading (sobrancelhas), Porcelana Lips Glow (lábios), radiofrequência facial, remoção de dermatose/papulosas.

**Corporais/massagens:** redução de medidas, massagem modeladora, drenagem gestante, drenagem pós-parto, tratamento de estrias, clareamento (axilas/virilha), massagem relaxante (óleos/pedras quentes), esfoliação corporal.

**Depilação:** laser (6-8 sessões típicas, por fototipo) e cera (feminina e **masculina** — barba, peito, costas, etc.). Pacotes de laser por zona.

**Home care:** cuidados faciais (limpeza, hidratantes, séruns, protectores solares), kits (anti-acne, anti-manchas, niacinamida, foliculites), corporais (esfoliante, anti-estrias, peeling).

---

## 3. Problema (Dores a Resolver)

| # | Dor | Impacto | Resolvido por |
|---|---|---|---|
| D1 | **Dependência da fundadora** — sem ela o sistema vacila ("mais um emprego que um negócio") | Sem escala, sem descanso | Agentes IA + padronização |
| D2 | **Demora na resposta** multi-canal → perda de clientes | Leads perdidas diariamente | Agente 24/7 (<60s) |
| D3 | **1-3 no-shows/semana** sem lembrete/reagendamento | ~360.000 Kz/mês perdidos | Lembrete 24h + reagendamento automático |
| D4 | **Zero recorrência estruturada** — nenhuma cliente em pacote mensal | Sem previsibilidade de receita | Pacotes mensais + Cartão Black |
| D5 | **Falhas pontuais de atendimento** das técnicas | Inconsistência de experiência | Guião/padronização + alinhamento com o agente |
| D6 | **Conteúdo digital intermitente** (1-2x/semana, sem CTA) | Baixa atracção de leads | Calendário editorial + produção em bloco |
| D7 | **Base de clientes fragmentada** (gestão + faturação) | Impossível segmentar/operar | Consolidação + import no CRM |
| D8 | **Sem pré-pagamento/pré-agendamento** | Caixa imprevisível, no-shows | Pré-pagamento progressivo 50% |

---

## 4. Solução — Os 3 Pilares do SIC

### Pilar 1 — Marketing e Comunicação
Calendário editorial mensal (Instagram/TikTok), sessão de produção em bloco (2h/mês), CTA claro em cada post ("Agenda aqui"), distribuição automatizada, tráfego pago selectivo no relançamento. *(Maioritariamente serviço/processo — pouco software no CRM, exceto eventual rastreio de origem UTM já existente na ISILDA.)*

### Pilar 2 — Comercial: Agentes de IA 24/7 (núcleo do CRM)
Sobre WhatsApp Business (uazapi.dev), **3 agentes** (papéis funcionais, podem ser um agente com modos):

- **Agente 1 — Atendimento e Qualificação:** treinado com todo o conhecimento da clínica; recebe imagens; **nunca abre com preços** (qualifica primeiro); fluxo Recepção → Qualificação → Pré-Avaliação/Agendamento → encaminhamento. Persona **feminina**, tom **formal e caloroso** ("a senhora {Nome}").
- **Agente 2 — Suporte Operacional:** dúvidas pós-agendamento, confirma horários, liberta as técnicas.
- **Agente 3 — Pós-Venda e Fidelização:** cuidados pós-tratamento, venda de home care, mantém a cliente ligada entre visitas, recolha de feedback.

**Funcionalidades:** funil de qualificação (consulta-fundadora vs. directo-técnicas), pré-pagamento progressivo 50%, lembrete 24h + reagendamento, agendamento automático com **disponibilidade real**, intervalos de preparação de sala, tratamentos simultâneos quando há capacidade.

### Pilar 3 — Gestão e Entrega
Padronização do atendimento (guião), **3 pacotes de recorrência**, segmentação em ≥3 categorias, análise 80/20, formação da equipa.

**Pacotes de recorrência (valores sugeridos):**
| Pacote | Conteúdo | Valor/mês |
|---|---|---|
| Essencial | 2 sessões laser + 1 facial | 80.000 Kz |
| Porcelana | 4 sessões laser + 2 faciais | 150.000 Kz |
| Cartão Black | VIP, prioridade máxima, benefícios exclusivos | 250.000 Kz |

---

## 5. Auditoria da ISILDA — O Que Reaproveitar

A ISILDA (`/Users/admin/PROJECTOS/ISILDA`) é um CRM inteligente em produção. Stack e maturidade:

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (PostgreSQL + pgvector + pg_cron + RLS + Storage + Realtime) · Edge Functions (Deno) · Anthropic API (Haiku classificação / Sonnet conversa) · uazapi (WhatsApp) · Vercel · recharts · dnd-kit.

**Migrações (31):** extensions, profiles, clientes, interacoes, mudancas_estagio, mensagens_whatsapp, integration_keys, **ai_agent_schema** (9 tabelas), webhook_idempotency, produtos_catalogo, referencias_visuais, **pedidos**, **calendario_producao**, **ocasioes_cliente**, **pagamentos**, checklist, templates_whatsapp, notificacoes, consentimentos, storage_buckets, view_conversas_activas, cron_jobs, seeds, rpcs_triggers, cron_recompra, whatsapp_instances, rgpd_anonymize.

**Edge Functions:** `isilda-agent` (agente produção), `ai-sales-agent` (queue-processor, context-gatherer, tools, communication), `process-vision` (análise de imagem + pricing), `recompra-cron`, `uazapi-webhook-receiver`, `uazapi-send-message`, `isilda-lead-intelligence`.

### Matriz de Adaptação — Reusar / Adaptar / Novo

| Módulo ISILDA | Veredicto | Adaptação para Porcelana Beauty |
|---|---|---|
| **`clientes`** (estágios, origem, UTM, etiquetas, ticket médio, total gasto) | ✅ **REUSAR** quase 1:1 | Estágios `novo→...→vip→inactivo` servem. Importar os ~398 clientes consolidados. |
| **`ai_sales_agents` + 9 tabelas do agente** (conversations, queue, logs, send_counts, followups, cadence_enrollments, tools, user_availability) | ✅ **REUSAR** — núcleo conversacional maduro | Reescrever `system_prompt` com a persona feminina/formal + FAQ + Guia de Objecções. Manter debounce, queue, rate-limit, locks, followups. |
| **Edge `ai-sales-agent` / `isilda-agent`** (queue-processor, context-gatherer, tools) | ✅ **REUSAR** o motor | Trocar tools de "criar pedido de bolo" por "agendar tratamento / propor avaliação / qualificar". |
| **`process-vision`** (recebe imagem, classifica) | ✅ **REUSAR/ADAPTAR** | Cliente envia foto da pele/zona → agente indica procedimento provável (requisito explícito da proposta). |
| **`mensagens_whatsapp` + `whatsapp_instances` + uazapi** | ✅ **REUSAR** 1:1 | Mesmo canal (uazapi.dev). |
| **`pedidos`** (estados: novo→orcamento→pago→producao→entregue) | 🔄 **ADAPTAR → `agendamentos`** | Trocar "bolo (tema, sabor, recheio, entrega)" por "tratamento (serviço, técnica, sala, duração)". Estados: novo→avaliacao→agendado→confirmado→pago→realizado→concluido. |
| **`calendario_producao`** (capacidade/dia, bloqueio) | 🔄 **ADAPTAR → `calendario_agenda`** | Slots por **técnica/sala** com intervalos de preparação; permitir 2 tratamentos simultâneos se houver capacidade (requisito do kick-off). |
| **`pagamentos`** (multicaixa, comprovativo, estados) | ✅ **REUSAR** | Suporta o **pré-pagamento progressivo 50%**. Já tem comprovativo + confirmação manual. |
| **`ocasioes_cliente`** (aniversários, lembretes recorrentes) | ✅ **REUSAR** | Excelente para fidelização/pós-venda do Agente 3 (campanhas de aniversário). |
| **`produtos_catalogo`** (categorias, fotos, preços, tags) | 🔄 **ADAPTAR → `servicos_catalogo`** | Categorias estética (facial, corporal, laser, cera, sobrancelhas, home_care); preços por zona/protocolo; **`sob_consulta=true`** alinha com "nunca abrir com preço". |
| **`recompra-cron` / cadence** | ✅ **REUSAR** | Motor de nurturing/recorrência → empurra pacotes mensais e re-agendamento de sessões de laser (6-8 sessões). |
| **`templates_whatsapp`** | ✅ **REUSAR** | Carregar as mensagens prontas do FAQ + lembretes + confirmações. |
| **`consentimentos` + `rgpd_anonymize`** | ✅ **REUSAR** | Conformidade de dados pessoais (dados de saúde/estética são sensíveis). |
| **`checklist`** | 🔄 **ADAPTAR** | De "checklist de produção de bolo" → "checklist de preparação de sala / protocolo de tratamento". |
| **Frontend: Inbox, Kanban, Calendário, Clientes, Dashboard, Catálogo, Configurações, Equipa, AI-Agent console** | ✅ **REUSAR** estrutura | Renomear "Pedidos"→"Agendamentos", "Catálogo de bolos"→"Serviços". Dashboard com KPIs de estética. |
| **`referencias_visuais`** (pgvector) | 🟡 **AVALIAR** | Na ISILDA serve referências de bolo. Na estética pode servir antes/depois ou referência de zona. Baixa prioridade v1. |

### O que é genuinamente NOVO (não existe na ISILDA)

1. **Modelo de pacotes de recorrência / subscrição mensal** (Essencial / Porcelana / Cartão Black) com cobrança recorrente e controlo de sessões consumidas. *A ISILDA é transaccional (pedido único), não tem subscrição.*
2. **Agendamento com recurso multi-dimensional** (técnica × sala × tempo de preparação × simultaneidade) — mais complexo que a `calendario_producao` de capacidade simples.
3. **Funil de qualificação com 2 portas** (fundadora vs. técnicas) como lógica de roteamento do agente.
4. **Plano de tratamento multi-sessão** (ex.: laser 6-8 sessões) com tracking de progresso por cliente.

---

## 6. Persona e Tom do Agente (definição aprovada — kick-off)

- **Persona:** feminina; apresenta-se como **assistente da Porcelana Beauty**, nunca como robô/IA.
- **Tom:** formal, respeitoso, educado e **com carinho** — mais formal que informal. "a senhora {Nome}" / "o senhor {Nome}" no 1º contacto; suaviza com recorrentes.
- **Regra de ouro #1:** **nunca abrir com preços** — qualificar primeiro, propor Consulta de Avaliação, só dar valor se insistirem (contextualizando).
- **Gestão de objecções:** validar → compreender → reposicionar com empatia → próximo passo leve. Nunca pressionar; encaminhar para humano se persistente.
- **Fontes de conhecimento já prontas:** `FAQ_Agente_WhatsApp` (11 secções) + `Guia_Objecoes` (preço/tempo/confiança) — carregar directo no `system_prompt` + `templates_whatsapp`.

---

## 7. Riscos e Pré-requisitos

| Risco / Pré-requisito | Severidade | Mitigação |
|---|---|---|
| **Consolidação dos ~398 clientes** (2 softwares) ainda por fazer | 🔴 Alta | Bloqueia import. Definir mapeamento de campos cedo (tarefa do cliente — kick-off acção #3). |
| **Critérios de qualificação de leads** (fundadora vs. técnicas) ainda por definir | 🟠 Média | Workshop com cliente antes da construção do agente (acção #4 kick-off). |
| **Tabela de preços por zona/protocolo** não totalmente estruturada | 🟠 Média | Necessária para o catálogo; muita coisa é "sob consulta" (ok com a regra de não abrir preço). |
| **Pré-pagamento é cultural** ("aplica em Angola?") | 🟡 Baixa | Introdução **gradual**; educação da base é parte da implementação (resposta do Nelson na acta). |
| **Agendamento multi-recurso** é o ponto técnico mais novo/complexo | 🟠 Média | Faseável — v1 pode usar capacidade simples (estilo ISILDA) e evoluir para multi-recurso. |
| **Modelo de subscrição** não existe na ISILDA | 🟠 Média | Desenho de schema novo (`pacotes`, `subscricoes`, `sessoes_consumidas`). |
| Mudança de instalações sobrepõe-se ao arranque | 🟡 Baixa | Plano faseado "um passo de cada vez" (já alinhado). |

---

## 8. Roadmap de Alto Nível (proposto)

Alinhado com o plano comercial (Fase 0→3) e com a abordagem faseada da ISILDA.

| Fase | Foco | Reaproveitamento ISILDA |
|---|---|---|
| **F0 — Fundação** | Fork da base ISILDA, schema-core (clientes, agente, mensagens, whatsapp_instances), import dos 398 clientes | ~90% reuso |
| **F1 — Agente de Atendimento** | system_prompt (persona/FAQ/objecções), tools de qualificação+agendamento, vision (foto da pele), templates | Reuso do motor; novo prompt/tools |
| **F2 — Agendamento e Calendário** | `agendamentos` + `calendario_agenda` (técnica/sala), lembrete 24h, reagendamento | Adaptar pedidos+calendario |
| **F3 — Pagamentos e Pré-pagamento** | `pagamentos` + pré-pagamento 50% progressivo | Reuso quase 1:1 |
| **F4 — Pacotes e Recorrência** | **NOVO** schema de subscrição + Cartão Black + cadences de recompra | recompra-cron como base |
| **F5 — Fidelização e Pós-venda** | Agente 3, ocasioes_cliente, cuidados pós-tratamento, feedback | Reuso forte |
| **F6 — Dashboard e Segmentação** | KPIs estética, segmentação ≥3 categorias, análise 80/20 | Adaptar dashboard |

---

## 9. KPIs / Métricas de Sucesso

Da proposta e garantias contratuais:
- **Resposta <60s** no WhatsApp 24/7 (vs. demora actual que perde clientes).
- **No-shows:** eliminar ~2/semana → recuperar ~360.000 Kz/mês.
- **+20% leads qualificadas** no pipeline em 30 dias (Garantia de Resultados — senão devolve 50% do setup).
- **Adopção:** equipa a usar o sistema activamente em 30 dias (Garantia de Adopção).
- **Recorrência:** primeiras clientes em pacote mensal (hoje = zero).

---

## 10. Handoff

**Próximo passo recomendado:** @architect — validar a estratégia de fork/adaptação da ISILDA, desenhar o schema dos módulos NOVOS (subscrição/pacotes, agendamento multi-recurso) e produzir o documento de arquitectura. Depois @pm/@sm para epics e stories por fase.

**Documentos-fonte deste brief:**
- `proposta-porcelana-beauty.pdf` — 3 pilares, investimento (750k setup + 250k/mês), garantias
- `Acta_Reuniao_Yolenia_Balaca_2026-05-07.pdf` — diagnóstico, estrutura operacional, decisões
- `Acta da Reunião Kick-off PorcelanaBeauty_2026.docx` — persona, tom, calendário, ~398 clientes
- `FAQ_Agente_WhatsApp_Porcelana_Beauty.md.docx` — 11 secções de scripts de atendimento
- `Guia_Objecoes_Agente_WhatsApp_Porcelana_Beauty.md.docx` — objecções preço/tempo/confiança
- Auditoria de código: `/Users/admin/PROJECTOS/ISILDA` (31 migrações, Edge Functions, frontend)

---

*Brief elaborado por Atlas (Analyst Agent) — Marca Digital · 8 de Junho de 2026*
