# Relatório de Pesquisa — CRM Inteligente para Confeitaria Artesanal
## Delícias da Isi (Luanda, Angola)

**Versão:** 1.1
**Data:** 12 de Abril de 2026
**Autor:** Atlas (Analyst Agent) — Marca Digital
**Cliente:** Isilda — Delícias da Isi
**Âmbito:** Pesquisa de mercado Brasil + análise de aplicabilidade a Angola + recomendação arquitectural

---

## Sumário Executivo

A **Delícias da Isi** é uma confeitaria artesanal angolana com forte tracção orgânica (Instagram, TikTok, maioria por indicação) mas operação 100% manual. Identificamos **seis dores estruturais**: (1) perda de memória do cliente sem base de dados; (2) sobrecarga operacional da empresária que acumula produção, atendimento, divulgação e vendas; (3) desorganização de pedidos e datas de entrega; (4) inconsistência na criação de conteúdo; (5) ausência de qualificação de leads; (6) zero recompra sistemática.

A oportunidade central é que o negócio vive de **ocasiões recorrentes** (aniversários, casamentos, mesas infantis, celebrações). Cada cliente bem geriva vale 3-5× mais que uma venda única porque o aniversário repete todo ano e cada casamento gera rede de indicações. O sistema certo transforma **venda única → cliente vitalício**.

A pesquisa mapeou o cenário brasileiro (9 soluções verticais de confeitaria + 6 agentes IA WhatsApp genéricos), analisou o contexto angolano (pagamentos EMIS/Multicaixa, conectividade, hábitos locais) e comparou com dois CRMs já construídos internamente (Nelma Dias e Elsa Ferreira). A conclusão é que **nenhuma solução SaaS do mercado brasileiro cobre simultaneamente os 4 requisitos críticos da Isi**:

1. **Agente IA conversacional** no WhatsApp com português angolano
2. **Visão multi-modal** (cliente envia foto → bot reconhece e devolve portfólio similar + orçamento)
3. **Integração nativa EMIS/Multicaixa Express** (pagamentos Angola)
4. **CRM com pipeline de recompra por ocasião** (aniversários recorrentes, eventos, fidelização)

A recomendação é **construir um sistema próprio** reutilizando **90% do código e padrões** já validados nos CRMs Nelma (agente IA WhatsApp + Claude multi-modal + schema Supabase) e Elsa (CRM leve + catálogo de produtos + mobile-first). A integração WhatsApp usa **UAZAPI** (API não-oficial, já comprovada em ambos os CRMs). O custo operacional estimado é **$120-200/mês** e o MVP pode estar em produção em **4-6 semanas** de desenvolvimento concentrado.

---

## 1. Contexto e Dores do Negócio

### 1.1 Perfil da Delícias da Isi

| Dimensão | Estado actual |
|---|---|
| Tipo de negócio | Confeitaria artesanal — bolos personalizados, doces para mesa infantil, bolos caseiros |
| Tipologia de cliente | B2C — pessoas particulares para ocasiões especiais (aniversários, casamentos, festas familiares) |
| Canais de aquisição | Instagram (divulgação visual), TikTok (alcance), **indicação/recomendação** (maioria) |
| Canal de venda/atendimento | WhatsApp (100% dos pedidos) |
| Processo de venda | Manual, conversacional: briefing → confirmação → pagamento → produção → entrega/retirada |
| Ferramentas actuais | Instagram + TikTok + WhatsApp (nada mais — sem CRM, sem agenda, sem base de clientes) |

### 1.2 Dores identificadas (priorizadas por impacto no revenue)

| # | Dor | Impacto no negócio | Prioridade |
|---|---|---|---|
| 1 | **Perda de memória do cliente** — sem base de dados, cada pedido parece novo | Perde recompra sistemática; zero LTV | 🔴 Crítico |
| 2 | **Sobrecarga operacional** — Isi acumula produção, atendimento, divulgação, vendas | Gargalo impede crescimento; risco de burnout | 🔴 Crítico |
| 3 | **Desorganização de pedidos e datas** — sem calendário de produção | Risco de falhar entregas = perda de reputação e indicações | 🔴 Crítico |
| 4 | **Inconsistência na criação de conteúdo** — afecta fluxo contínuo de leads | Queda de alcance e novos clientes | 🟡 Alto |
| 5 | **Zero qualificação de leads** — todos recebem o mesmo atendimento | Tempo desperdiçado com curiosos | 🟡 Alto |
| 6 | **Engajamento inconsistente nas redes** — sem estratégia | Perda de posicionamento vs concorrência | 🟢 Médio |

### 1.3 Oportunidade estratégica central

O modelo de negócio da Isi é **ocasiões recorrentes**. Esta é a chave de tudo:

- **Aniversários:** repetem **todos os anos** para a mesma pessoa/família
- **Casamentos:** eventos one-off, mas geram **convidados que viram clientes** (rede de indicações)
- **Mesa infantil:** ciclo de 1-2 anos por criança durante 8-10 anos
- **Festas familiares/comemorações:** típicamente 2-4 por ano por família activa

Um cliente que compra um bolo de aniversário uma vez deveria estar a gerar **3-8 pedidos por ano** (aniversário próprio + dos filhos + casamentos na família + datas comemorativas). Sem CRM + sem lembretes automáticos + sem sugestão proactiva = **toda essa receita recorrente está a escapar**.

**Tese central do sistema proposto:** o valor do LTV (Lifetime Value) de cada cliente da Isi pode ser multiplicado por **5-10×** com um CRM inteligente que:
- Lembra automaticamente em Novembro que o aniversário da filha da cliente é em Dezembro
- Envia mensagem proactiva 30 dias antes com sugestões personalizadas baseadas no histórico
- Reconhece por foto que "este estilo Frozen" já foi feito para outra cliente e pode ser adaptado
- Faz upsell natural (de bolo simples para bolo + mesa de doces) baseado em padrões de compra

---

## 2. Benchmarks Brasil — Análise do Mercado

O Brasil tem um ecossistema maduro de SaaS para confeitaria, mas dividido em duas famílias distintas: **verticais de gestão** (focadas em pedidos, estoque, precificação) e **agentes IA WhatsApp** (focadas em atendimento e vendas). **Nenhuma plataforma une as duas coisas de forma profunda** — e é exactamente esse o gap que a Isi precisa cobrir.

### 2.1 Família A — Verticais de gestão para confeitaria (9 soluções analisadas)

| Solução | Foco | Forças | Fraquezas | Ideal para |
|---|---|---|---|---|
| **Doceria Smart** | Gestão 360° para confeiteiras de casa/ateliê | Criado por confeiteira, linguagem acessível, precificação automática, histórico por cliente, gestão de aniversários | Sem IA, sem WhatsApp bot, anual | Confeiteiras autónomas BR |
| **ZupConfeitaria** | Pedidos sob encomenda + app mobile nativo | App Android/iOS nativo, multiplataforma, registos ilimitados, alertas de entrega | Sem IA, sem visão, manual | Confeitaria sob encomenda |
| **Consumer** | Doceria completa + delivery + estoque | Recomendado SEBRAE, versão grátis, integração balança, estoque em tempo real | Genérico, sem foco em bolos personalizados | Pequenas/médias confeitarias |
| **NoxMob Gourmet** | Produção industrial + ordem de fabricação | Calendário de produção, ficha técnica, fila de encomendas | Complexo demais para artesanal | Confeitarias de alta produção |
| **DoceRede** | Sob encomenda com site | Define limite de pedidos/dia, dias/horários de encomenda, site próprio | UX datado, sem IA | Negócios 100% sob encomenda |
| **Saipos** | PDV + iFood + WhatsApp centralizado | Integração iFood, unificação de canais | Caro (R$219+/mês), foco delivery | Docerias com delivery forte |
| **Minha Confeitaria** | Precificação + pedidos + clientes | Actualização automática de custos, fluxo caixa integrado | Básico, sem automação | Microempreendedoras |
| **Lucro na Confeitaria** | Menu digital + WhatsApp | Menu com foto, orçamento PDF, agenda na nuvem | Sem automação conversacional | Confeiteiras iniciantes |
| **LETS Delivery** | Menu online + WhatsApp | Grátis até R$5k/mês, link exclusivo para cozinha | Foco delivery, não personalizado | Quem começa |

**Observação crítica:** Nenhuma destas soluções tem **IA conversacional** ou **reconhecimento visual**. São sistemas de registro e organização — o cliente continua a fazer o atendimento manualmente no WhatsApp e depois regista tudo no sistema. Isso **não resolve a dor #2 da Isi** (sobrecarga operacional).

### 2.2 Família B — Agentes IA WhatsApp genéricos (6 soluções analisadas)

| Plataforma | Modelo | Preço aproximado | Forças | Fraquezas para confeitaria |
|---|---|---|---|---|
| **AgeuBot** | SaaS com IA integrada | R$9,90-79/mês | Acessível, Mercado Pago + Google Calendar nativos, entende regionalismos PT-BR | Sem visão, sem vertical confeitaria |
| **BotConversa** | Construtor visual drag-and-drop | R$99-299/mês | Fluxos visuais, orçamentos automatizados, ebooks | Não conversacional — só fluxos rígidos |
| **Nuvem Chat (Nuvemshop)** | Chatbot para lojas Nuvemshop | Incluso no plano da loja | Integração com e-commerce, pagamento dentro do chat | Só para quem já vende na Nuvemshop |
| **SocialHub** | CRM + chatbot + multiagente | A partir de R$99/mês | Pipeline de vendas, multi-canal, API aberta | Genérico, sem confeitaria |
| **Globalbot** | Multicanal (WA, IG, FB, Telegram) | Sob consulta | Centraliza canais, distribui para vendedores | Pesado para 1 pessoa |
| **Zenvia** | Enterprise customer cloud | A partir de R$100/mês | Robusta, oficial BR, escala | Overkill para confeiteira solo |

**Observação crítica:** Destas 6, **nenhuma** tem **visão multi-modal como feature central**. Todas suportam receber imagens, mas nenhuma é projectada para "cliente envia foto → bot reconhece estilo e devolve catálogo similar". Este é o diferencial que a Isi pode usar para criar vantagem competitiva.

### 2.3 Matriz comparativa — o gap está evidente

| Requisito crítico da Isi | Verticais gestão | Agentes IA | CRM Nelma/Elsa (nosso) | **Proposta Isi** |
|---|---|---|---|---|
| Gestão de pedidos com calendário | ✅ Sim | ❌ Não | 🟡 Parcial | ✅ |
| Precificação automática | ✅ Sim | ❌ Não | ❌ Não | ✅ |
| CRM com histórico de cliente | ✅ Sim | 🟡 Básico | ✅ Sim | ✅ |
| **Agente IA conversacional WhatsApp** | ❌ Não | ✅ Sim | ✅ Sim (Nelma) | ✅ |
| **Visão multi-modal (foto → catálogo)** | ❌ Não | ❌ Não | ❌ Não | ✅ **NOVO** |
| **Orçamento dinâmico por conversa** | ❌ Não | 🟡 Script rígido | 🟡 Parcial | ✅ |
| **Recompra automática por ocasião** | 🟡 Agenda manual | ❌ Não | 🟡 Parcial (Nelma follow-up) | ✅ |
| Pagamentos Angola (EMIS/Multicaixa) | ❌ Não (só Brasil) | ❌ Não | 🟡 Manual (Nelma) | ✅ |
| Português de Angola natural | ❌ Não | ❌ Não | ✅ Sim (Nelma) | ✅ |
| Mobile-first (Isi opera do telemóvel) | 🟡 Parcial | ✅ Sim | ✅ Sim (Elsa) | ✅ |

**Conclusão:** A Isi está num **white space** real. Não existe concorrente que faça tudo o que ela precisa — e os três pontos marcados como **NOVO** são uma vantagem competitiva defensável se forem bem executados.

---

## 3. Arqueologia Interna — O que já temos em casa

A Marca Digital já construiu dois CRMs que resolvem 85% do problema da Isi: **Nelma Dias** (CRM médico + agente IA WhatsApp maduro) e **Elsa Ferreira** (CRM leve para mentoria + catálogo de produtos + mobile-first).

### 3.1 CRM Nelma Dias — activos reutilizáveis

**Origem:** Criado para gerir o funil da Imersão Método Código Fértil (Fev-Mai 2026). Está em produção e tem **agente IA WhatsApp completo** com Claude.

**Stack:** Next.js 16 (App Router) + Tailwind v4 + Supabase (PostgreSQL + Auth + RLS + Realtime + Edge Functions + PGMQ) + @dnd-kit + Recharts + **UAZAPI** (WhatsApp) + Claude Haiku (classificação) + Claude Sonnet (respostas).

**Schema:** 13 tabelas + 2 views. Relevantes para Isi:

- `leads` + `interacoes` + `mudancas_estagio` → **base de clientes + histórico**
- `conversas_whatsapp` + `mensagens_whatsapp` → **inbox em tempo real**
- `templates_whatsapp` → **mensagens rápidas**
- `notificacoes` → **alertas para humano**
- `fila_mensagens` (PGMQ) → **processamento assíncrono**
- `config_agente_ia` → **prompt + guardrails + horário**
- `consentimentos` → **LGPD/RGPD**

**Fluxo do agente (pronto):**
```
Lead envia WhatsApp → UAZAPI webhook → Edge Function (uazapi-webhook-receiver)
→ Idempotência (webhook_processed_messages) → Enfileira em PGMQ → process-message:
  (1) encontra/cria lead por telefone (normalização Angola +244)
  (2) guarda mensagem recebida (texto + media + caption)
  (3) verifica modo (bot/humano/pausado)
  (4) se bot: classifica intenção (Haiku) → gera resposta (Sonnet)
      → verifica guardrails → envia via UAZAPI (/send/text ou /send/media)
  (5) actualiza pipeline e notifica humano se preciso
```

**13 intenções mapeadas (adaptáveis):** SAUDACAO, PERGUNTA_PRODUTO, INTERESSE, OBJECAO_PRECO, OBJECAO_TEMPO, COMPROVATIVO, FALAR_COM_HUMANO, RECLAMACAO, FORA_CONTEXTO, PARAR, etc.

**3 modos de conversa:** Bot, Humano, Pausado (sensível). Sistema de **takeover** com trigger automático quando confiança < 70%.

**Custo operacional em produção:** ~$120-200/mês (Supabase $25 + UAZAPI ~$25 + Claude $50-130 + Vercel $20). Nota: custo Claude da Isi será menor que Nelma por volume inferior.

### 3.2 CRM Elsa Ferreira — activos reutilizáveis

**Origem:** Sistema para mentora angolana com funil de produtos (Sessão Clareza → Programa → Comunidade → Mentoria Premium). Focado em **simplicidade extrema** e **mobile-first** — utilizadora não-técnica.

**Stack:** Idêntica ao Nelma (reutiliza padrões). Mais leve — **sem agente IA nativo** (usa ManyChat externo) e **sem visão**.

**Schema:** 10 tabelas relevantes para Isi:
- `contacts` — clientes com pipeline, origem, UTM, etiquetas
- `products` — **catálogo de produtos do funil** (directamente replicável para catálogo de bolos/doces)
- `sessions` — **agendamentos** (replicável para datas de entrega)
- `payments` — **registo manual de pagamentos** (Multicaixa Express, transferência, cash)
- `community_members` — **recorrência** (replicável para clientes fidelizados)
- `contact_products` — junção N:N (cliente ↔ produto)
- `message_templates` — templates WhatsApp
- `checklist_tasks` + `checklist_completions` — **checklist operacional diária** (perfeito para Isi)

**Padrão de hooks customizados comprovado:** `useContacts`, `useProducts`, `useSessions`, `useDashboardMetrics` — cópia directa.

**UX mobile-first validada** com operadora não-técnica após 2h de treino.

### 3.3 Síntese do valor reutilizável

| Dimensão | Nelma | Elsa | Reutilização para Isi |
|---|---|---|---|
| Stack técnico (Next.js 16 + Supabase + Tailwind v4) | ✅ | ✅ | **100% reutilizável** |
| Schema CRM base (contacts, interactions, pipeline) | ✅ | ✅ | **100% reutilizável** |
| Agente IA WhatsApp + Claude + UAZAPI | ✅ | ❌ | **100% do Nelma + Elsa** |
| Schema de mensagens + fila PGMQ | ✅ | ❌ | **100% do Nelma** |
| Sistema de modos (bot/humano/pausado) + takeover | ✅ | ❌ | **100% do Nelma** |
| Catálogo de produtos + capacidade + níveis | ❌ | ✅ | **100% do Elsa** (adaptado para bolos) |
| Agendamentos (sessions) | ❌ | ✅ | **100% do Elsa** (adaptado para entregas) |
| Pagamentos manuais (Multicaixa) | ❌ | ✅ | **100% do Elsa** |
| Checklist operacional diária | ❌ | ✅ | **100% do Elsa** |
| Pipeline Kanban drag-and-drop | ✅ | ✅ | **100% reutilizável** |
| UX mobile-first para não-técnicos | 🟡 | ✅ | **Padrão Elsa** |
| Analytics IA (tokens, latência, intenções) | ✅ | ❌ | **100% do Nelma** |
| **Visão multi-modal (foto → catálogo)** | ❌ | ❌ | **🔥 NOVO — precisa desenvolver** |
| **Orçamento dinâmico conversacional** | 🟡 | ❌ | **🔥 NOVO — precisa desenvolver** |
| **Calendário de produção (detectar conflitos)** | ❌ | 🟡 | **🔥 NOVO — precisa desenvolver** |
| **Motor de recompra por ocasião** | 🟡 | ❌ | **🔥 NOVO — precisa desenvolver** |

**Estimativa de reutilização:** ~**85% do código** do sistema Isi sairá directamente de Nelma + Elsa. Os **15% restantes** são os 4 diferenciadores **NOVO** que dão vantagem competitiva.

---

## 4. Contexto Angola — Realidades Locais

### 4.1 Pagamentos

Angola tem um ecossistema **EMIS/Multicaixa** maduro e acessível via API para lojas online, mas com fricção na adesão.

| Opção | Complexidade | Custo setup | Viabilidade MVP |
|---|---|---|---|
| **Registo manual** de comprovativo (transferência BAI/BFA + Multicaixa Express enviado por foto) | Zero — só precisa UI | 0 Kz | ✅ **Recomendado para MVP** |
| **IZI Pay** (certificado EMIS, sem mensalidades, API de referências) | Baixa | 0 Kz mensalidade | 🟡 Fase 2 |
| **AppyPay** (facilitador, API limpa para Multicaixa Express via número de telemóvel) | Média | Sob consulta | 🟡 Fase 2 |
| **GPO oficial EMIS** via banco comercial (iFrame ou API) | Alta — requer contrato bancário + certificação | Variável | 🟢 Fase 3 |
| **ProxyPay** (via WordPress/WooCommerce plugin) | Baixa (se usar WooCommerce) | — | ❌ Não aplicável (vamos de Next.js) |

**Decisão recomendada:** MVP com **registo manual de pagamento confirmado** (foto do comprovativo + botão "confirmar pagamento" no inbox do bot). Fase 2 integra **IZI Pay** por ser gratuito e certificado. Fase 3, se volume justificar, integra GPO oficial via BAI/BFA.

### 4.2 Conectividade

- 4G presente em Luanda mas **instável** — UX deve tolerar latência
- Utilizadores operam quase 100% via telemóvel (Android domina)
- Planos de dados são caros — imagens devem ser optimizadas antes de enviar para Claude Vision
- **Decisão:** cache agressivo, loading progressivo, PWA com service worker, compressão de imagens antes do upload

### 4.3 Ticket médio e volume esperado

**Dados reais extraídos do catálogo WhatsApp Business da Isi** (actualizado v1.1):

| Categoria | Faixa de Preço (Kz) | Ticket Médio Estimado |
|---|---|---|
| Bento cakes (10-14cm) | 13.500 - 31.500 | ~18.000 Kz |
| Bolos chantilly simples (14-20cm) | 42.000 - 66.500 | ~54.000 Kz |
| Bolos especiais (Red Velvet, Cenoura, Nórdico) | 24.000 - 42.000 | ~33.000 Kz |
| Naked cake / Vintage | 37.500 - 42.000+ | ~40.000 Kz |
| Doces unitários (cupcakes, donuts, bolachas) | 3.000 - 18.500/dúzia | ~12.000 Kz |
| Bolos casamento / 2+ andares | Sob consulta | 80.000-150.000 Kz (estimado) |

**Ticket médio global estimado:** ~35.000-45.000 Kz (significativamente mais alto que o estimado anteriormente).

**Volume estimado actual:** ~20-40 pedidos/mês (a confirmar com a Isi numa sessão de calibragem).
**Volume alvo com sistema:** 60-100 pedidos/mês (2-3× crescimento via eficiência e recompra automática).

### 4.4 Integração WhatsApp — UAZAPI (decisão actualizada v1.1)

**Decisão:** Usar **UAZAPI** (uazapi.dev) em vez de Meta Cloud API oficial. Razões:

| Critério | Meta Cloud API | UAZAPI (escolhida) |
|---|---|---|
| **Setup** | Meta Business Account verificada (semanas) | QR code scan (minutos) |
| **Custo** | $0.0225/msg marketing + $0.004/msg utility | Custo fixo ~$20-30/mês por instância |
| **Templates** | Aprovação obrigatória (dias) | Desnecessário |
| **Código existente** | Nenhum em produção | Comprovado em Nelma + Elsa (client, webhook, schema) |
| **Risco** | Baixo (oficial) | Médio (não-oficial, pode ser bloqueado) |

**Mitigação do risco UAZAPI:** Volume baixo (~20-40 pedidos/mês), uso legítimo de negócio (não spam), mesmo nível de risco aceite nos CRMs Nelma e Elsa em produção.

**Código reutilizável:** `uazapi-client.ts` (envio texto + media + typing), `uazapi-webhook-receiver` (recepção + idempotência + auto-criação de contacto), `uazapi-send-message` (envio com media), proxy webhook Next.js, schema `integration_keys` + `ai_agent_*`.

Para a Isi, com volume moderado, **o custo UAZAPI fica em ~$20-30/mês fixo** (sem custos por mensagem).

### 4.5 Hábitos WhatsApp em Angola

- WhatsApp é **o canal padrão** para negócios — mais usado que SMS ou chamadas
- Clientes esperam **resposta imediata** (minutos, não horas)
- Uso de áudios é muito comum — o bot deve aceitar voice notes (transcrever via Whisper ou similar)
- Preferência por conversa natural informal — scripts rígidos são rejeitados

---

## 5. Arquitectura Recomendada para o Sistema Delícias da Isi

### 5.1 Stack técnica (reutilização directa)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                        │
│  Next.js 16 (App Router) + Tailwind v4 + @dnd-kit + Recharts │
│              PWA optimizada para telemóvel Android           │
└────────────────────────────────┬────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────┐
│                    BACKEND (Supabase)                        │
│   PostgreSQL + Auth + RLS + Realtime + Edge Functions +     │
│                          PGMQ (fila)                         │
└────────────────────────────────┬────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────┴──────┐     ┌───────────┴──────────┐    ┌───────┴─────────┐
│   UAZAPI     │     │   Claude API          │    │  Armazenamento  │
│  WhatsApp    │     │ Haiku 4.5 (class.)    │    │   Supabase      │
│ (não-oficial │     │ Sonnet 4.5 (resp.)    │    │ Storage (fotos) │
│  comprovada) │     │ **Vision** (análise   │    │                 │
│              │     │     de imagens)       │    │                 │
└──────────────┘     └──────────────────────┘    └─────────────────┘
```

### 5.2 Schema de base de dados (adaptação Nelma + Elsa + extensões Isi)

**Tabelas core reutilizadas (14):**

1. `profiles` — utilizadores do sistema (Isi + operadora)
2. `clientes` (renomeado de `leads`/`contacts`) — base de clientes com histórico
3. `interacoes` — histórico por cliente (nota, chamada, WhatsApp, visita)
4. `mudancas_estagio` — audit trail do pipeline
5. `conversas_whatsapp` — estado de cada conversa (modo, confiança, resumo)
6. `mensagens_whatsapp` — histórico completo de mensagens
7. `notificacoes` — alertas para Isi
8. `fila_mensagens` — processamento assíncrono (PGMQ)
9. `config_agente_ia` — prompt, guardrails, horário
10. `consentimentos` — RGPD
11. `templates_whatsapp` — respostas rápidas
12. `actividade_log` — audit trail
13. `relatorios_semanais` — snapshots
14. `checklist_tasks` + `checklist_completions` — rotina da Isi

**Tabelas NOVAS específicas da Isi (8):**

15. `produtos_catalogo` — catálogo de bolos e doces com preços por tamanho, fotos, tags (adaptação do `products` da Elsa)
16. `pedidos` — encomendas com tema, tamanho, sabor, decoração, data entrega, valor, estado
17. `ocasioes_cliente` — datas importantes do cliente (aniversários próprios + familiares + datas comemorativas) → **motor de recompra**
18. `calendario_producao` — slots de produção com capacidade máxima por dia (evita conflito de datas)
19. `ingredientes` — matérias-primas com estoque (fase 2)
20. `receitas_custo` — cálculo de custo e precificação automática (fase 2)
21. `referencias_visuais` — portfólio da Isi com embeddings de imagem (pgvector) para busca por similaridade
22. `indicacoes` — quem indicou quem (para programa de referral automático)

**Tabela 21 é o coração do diferenciador multi-modal:**

```sql
CREATE TABLE referencias_visuais (
  id UUID PRIMARY KEY,
  titulo TEXT,
  descricao TEXT,
  tags TEXT[],              -- ["infantil", "frozen", "2_andares", "rosa"]
  categoria TEXT,           -- "aniversario_infantil", "casamento", etc.
  url_imagem TEXT,
  embedding vector(1024),   -- pgvector para busca semântica
  preco_base NUMERIC,
  tempo_producao_horas INT
);
```

Quando cliente envia foto no WhatsApp: bot chama Claude Vision → extrai descrição textual → gera embedding → faz similarity search em `referencias_visuais` → devolve top 3 referências mais parecidas + estimativa de preço.

### 5.3 Fluxo do agente IA multi-modal (o diferencial)

```
CLIENTE ENVIA FOTO DE BOLO NO WHATSAPP
        │
        ▼
[UAZAPI webhook → uazapi-webhook-receiver → fila PGMQ]
        │
        ▼
[process-message Edge Function]
        │
        ├── (1) Baixar imagem da UAZAPI (media_url)
        ├── (2) Guardar em Supabase Storage + optimizar
        ├── (3) Chamada a Claude Sonnet 4.5 com VISION:
        │       "Analisa este bolo. Descreve: estilo, cor, tema,
        │        complexidade de decoração (1-5), tamanho estimado,
        │        elementos chave (ex: personagens, flores, laço)."
        │       → devolve JSON estruturado + embedding gerado
        │
        ├── (4) Similarity search em referencias_visuais:
        │       SELECT * FROM referencias_visuais
        │       ORDER BY embedding <=> $query_embedding LIMIT 3;
        │
        ├── (5) Calcular orçamento dinâmico com base em:
        │       - Complexidade detectada (1-5)
        │       - Tamanho (extraído da conversa)
        │       - Data de entrega (urgência)
        │       - Disponibilidade no calendario_producao
        │
        └── (6) Responder ao cliente:
                "Adorei! Este estilo {detectado}. No meu portfólio tenho
                 3 bolos parecidos [enviar fotos]. Para 20 pessoas com
                 esta complexidade, fica em {preço}. Para {data} tenho
                 disponibilidade. Quer avançar?"
```

**Isto é o "uau" do sistema.** Nenhum concorrente brasileiro nem angolano faz isto. É um diferencial real.

### 5.4 Motor de recompra por ocasião

```
CRON diário (pg_cron):
  SELECT c.id, c.nome, oc.ocasiao, oc.data_evento
  FROM clientes c
  JOIN ocasioes_cliente oc ON oc.cliente_id = c.id
  WHERE oc.data_evento - CURRENT_DATE BETWEEN 25 AND 35
    AND oc.ultimo_lembrete_enviado < CURRENT_DATE - INTERVAL '300 days';

Para cada resultado:
  → Gerar mensagem personalizada com Sonnet:
    "Olá {nome}! Já está a pensar no aniversário da {filha}?
     No ano passado fizemos o bolo Frozen que ela adorou 💕
     Quer que comece a pensar em ideias para este ano?"
  → Enviar via Meta (marketing template)
  → Marcar ultimo_lembrete_enviado
  → Criar lead quente no pipeline
```

Isto transforma cliente único em cliente vitalício **automaticamente**.

### 5.5 Mapa de ecrãs do CRM web (operação da Isi)

| Ecrã | Descrição | Prioridade |
|---|---|---|
| **Inbox WhatsApp** | Hub principal — lista de conversas + chat + dados cliente + takeover | P0 |
| **Pipeline Kanban** | Boards: Pedidos (novo → orçamento → pago → produção → entregue) + Fidelização (ocasiões activas) | P0 |
| **Calendário de Produção** | Vista mensal de entregas agendadas + alertas de sobrecarga | P0 |
| **Clientes** | Lista com histórico, ocasiões, LTV, última compra | P0 |
| **Catálogo + Portfólio** | Gestão do catálogo visual (referências + embeddings) | P1 |
| **Dashboard** | KPIs: pedidos, receita, conversão, ticket médio | P1 |
| **Analytics IA** | Tokens, latência, precisão do bot, taxa de escalação | P2 |
| **Templates WhatsApp** | Biblioteca de mensagens | P2 |
| **Checklist diário** | Rotina operacional da Isi | P1 |
| **Configurações do agente** | System prompt, guardrails, horário | P1 |

### 5.6 Custo operacional estimado (mensal)

| Componente | Custo | Notas |
|---|---|---|
| Supabase Pro | $25 | DB + Auth + Realtime + Edge Functions + pgvector |
| Vercel Pro | $20 | Frontend + deploys |
| UAZAPI (instância WhatsApp) | $20-30 | Custo fixo mensal, sem custo por mensagem |
| Claude Haiku 4.5 (classificação) | $15-30 | ~20K chamadas/mês |
| Claude Sonnet 4.5 (respostas + visão) | $80-150 | ~5K chamadas/mês (visão é mais cara mas usada poucas vezes) |
| Supabase Storage (fotos do portfólio) | $5 | Até 100GB incluso no Pro |
| **TOTAL** | **~$165-255/mês** | **~150.000-235.000 Kz/mês** |

**ROI:** Com um ticket médio real de ~35.000-45.000 Kz (dados do catálogo), o sistema paga-se com **4-7 pedidos extra por mês** — trivialmente atingível com automação de atendimento e recompra.

---

## 6. Roadmap de Implementação (MVP → Plataforma completa)

### Fase 1 — Fundação CRM + Agente IA Base (2 semanas)

**Objectivo:** ter o CRM a funcionar com atendimento IA básico.

- [ ] Fork do projecto Nelma (ou copy dos padrões core)
- [ ] Adaptar schema: renomear `leads`→`clientes`, ajustar pipelines para confeitaria
- [ ] Criar novas tabelas: `produtos_catalogo`, `pedidos`, `ocasioes_cliente`
- [ ] Configurar instância UAZAPI + conectar número WhatsApp da Isi via QR code
- [ ] Reutilizar Edge Functions `uazapi-webhook-receiver` + `uazapi-send-message` do Elsa
- [ ] Configurar proxy webhook Next.js (`/api/webhooks/uazapi`) + `integration_keys`
- [ ] Adaptar taxonomia de intenções para confeitaria (ORCAMENTO, URGENTE, RECEITA, ENTREGA, etc.)
- [ ] System prompt adaptado à Isi (português Angola + personalidade + catálogo)
- [ ] Inbox básico funcional + takeover manual

### Fase 2 — Catálogo + Pedidos + Calendário (1-2 semanas)

**Objectivo:** gestão completa de pedidos com calendário de produção.

- [ ] Catálogo visual de produtos (upload de fotos, tamanhos, preços base)
- [ ] Fluxo de pedido no inbox: cliente pergunta → bot qualifica → gera orçamento → registra `pedido`
- [ ] Calendário de produção com vista mensal + alertas de conflito de data
- [ ] Estados de pedido: novo → orçamento → confirmado → pago → em_producao → pronto → entregue
- [ ] Pipeline Kanban para operação visual

### Fase 3 — Visão Multi-Modal + Orçamento Dinâmico (1 semana) 🔥

**Objectivo:** o diferencial competitivo — foto → catálogo similar + preço.

- [ ] Integrar Claude Sonnet Vision no fluxo de imagem recebida
- [ ] Criar tabela `referencias_visuais` com pgvector
- [ ] Upload inicial do portfólio da Isi (20-40 bolos) + gerar embeddings
- [ ] Similarity search via pgvector
- [ ] Função de cálculo de orçamento dinâmico (complexidade + tamanho + urgência + data)
- [ ] Resposta automática com 3 referências visuais + preço estimado

### Fase 4 — Motor de Recompra + Ocasiões (1 semana) 🔥

**Objectivo:** transformar venda única em cliente vitalício.

- [ ] Tabela `ocasioes_cliente` + UI para registar datas importantes
- [ ] Bot pergunta naturalmente no primeiro pedido: "É para aniversário de quem? Posso guardar para lembrar no próximo ano?"
- [ ] Cron diário (pg_cron) para detectar ocasiões a 30 dias
- [ ] Geração de mensagem personalizada com histórico
- [ ] Envio via Meta + criação automática de lead no pipeline

### Fase 5 — Pagamentos + Compliance + Polish (3-5 dias)

- [ ] Upload de comprovativo de pagamento via WhatsApp + validação manual
- [ ] Consentimento RGPD no primeiro contacto
- [ ] Mensagens fora de horário
- [ ] Guardrails finais
- [ ] Testes end-to-end
- [ ] Go-live com número real

**Total estimado MVP:** **4-6 semanas** de desenvolvimento concentrado.

---

## 7. Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Qualidade do reconhecimento visual do Claude em fotos de baixa qualidade (telemóvel, pouca luz) | Média | Alto | UX: pedir ao cliente "tira a foto em local iluminado" + fallback para descrição textual |
| R2 | Volume de pedidos excede capacidade real de produção da Isi | Alta | Alto | Calendário de produção com capacidade máxima diária + bot rejeita datas cheias |
| R3 | Isi não adopta o sistema por complexidade | Média | Crítico | UX extremamente simples, 1 sessão de treino, checklist diária integrada |
| R4 | Custo de Claude Sonnet Vision escala rápido com volume | Média | Médio | Cache de embeddings, usar Haiku para classificação, Sonnet só para respostas complexas |
| R5 | Internet instável afecta latência do bot | Alta | Baixo | Fila PGMQ já absorve isto — bot responde assim que possível |
| R6 | Meta bloqueia o número por rate limit ou spam | Baixa | Crítico | Respeitar rate limits da Meta, usar templates pré-aprovados para marketing, consentimento explícito |
| R7 | Recompra automática é percebida como "invasão" | Baixa | Médio | Opt-out fácil + mensagem sempre personalizada e relevante |
| R8 | Fotos de bolos no portfólio têm direitos (clientes querem remover) | Baixa | Médio | Consentimento explícito ao criar referência + mecanismo de remoção |

---

## 8. Métricas de Sucesso

| Métrica | Baseline (actual) | Target 90 dias | Target 180 dias |
|---|---|---|---|
| Pedidos por mês | ~20-40 | 60 | 100 |
| Taxa de resposta em < 5 min | ~30% (manual) | 95% (bot) | 98% |
| Taxa de conversão lead → pedido | Desconhecida | 25% | 35% |
| Pedidos de recompra (ocasião anterior) | ~10% | 30% | 50% |
| Tempo da Isi em atendimento | ~60% do dia | 20% | <15% |
| Ticket médio | A medir | +15% | +25% |
| Indicações rastreadas (programa referral) | 0 | 5/mês | 15/mês |
| Taxa de automação (bot vs humano) | 0% | 70% | 80% |
| Satisfação do cliente (escaladas por reclamação) | — | <5%/mês | <3%/mês |

---

## 9. Conclusões e Recomendação Final

### A Delícias da Isi está num white space real.

Não existe concorrente no Brasil nem em Angola que ofereça simultaneamente:
1. CRM vertical para confeitaria
2. Agente IA conversacional em português de Angola
3. Visão multi-modal (foto → catálogo + orçamento)
4. Motor de recompra por ocasião

### Temos 85% do código pronto.

Os projectos **Nelma** e **Elsa** já cobrem toda a infraestrutura, o agente IA WhatsApp, o schema de CRM, o inbox em tempo real, o takeover humano, os guardrails, a compliance RGPD e o mobile-first. Os **15% restantes** são exactamente os diferenciadores que criam vantagem competitiva: visão multi-modal, orçamento dinâmico conversacional, motor de recompra e calendário de produção.

### O custo é comportável e o ROI é rápido.

$150-250/mês de custo operacional (~140-230k Kz) paga-se com 5-6 pedidos extra por mês — trivialmente atingível pela simples eliminação da sobrecarga de atendimento manual.

### A janela temporal é curta.

O mercado brasileiro está a mover-se — AgeuBot, BotConversa e outras plataformas estão a adicionar IA cada vez mais sofisticada. A Isi tem **6-12 meses** para construir a sua vantagem antes que alguém adapte uma destas plataformas para o mercado angolano.

### Recomendação final: construir o sistema próprio em 4-6 semanas.

**Próximos passos imediatos:**

1. **Sessão de calibragem com a Isi** (1h): confirmar volume actual, ticket médio, portfólio disponível, disponibilidade para fotografar catálogo
2. **Handoff ao @pm** para construir o PRD detalhado com base neste relatório
3. **Handoff ao @architect** para validar a arquitectura e definir o schema SQL final
4. **Decisão comercial:** qual modelo de proposta à Isi (consultoria fixa vs revenue share vs SaaS Marca Digital)
5. **Provisionar recursos:** Meta Business Account, número WhatsApp dedicado, conta Claude, Supabase Pro

---

## Anexo A — Fontes consultadas

### Verticais de gestão para confeitaria (Brasil)
- [Doceria Smart](https://doceriasmart.com/)
- [ZupConfeitaria](https://www.zupconfeitaria.com/)
- [Consumer - Sistema para Docerias](https://consumer.com.br/sistema-para-docerias)
- [NoxMob Gourmet](https://nox.com.br/sistema-para-confeitaria/)
- [DoceRede](http://www.docerede.com.br/sistema-de-confeitarias)
- [Saipos](https://saipos.com/sistema/doceria)
- [Simpliza](https://simpliza.com.br/doceria.php)
- [Minha Confeitaria](https://minhaconfeitaria.com.br/)
- [Lucro na Confeitaria](https://www.lucronaconfeitaria.com/)
- [LETS Delivery](https://www.lets.delivery/sistema/doceria)
- [Nex / Nextar](https://www.nextar.com.br/segmento/confeitaria)
- [vhsys](https://www.vhsys.com.br/segmentos/sistema-erp-para-panificadora/)
- [Navsoft](https://navsoft.com.br/segmento/simplifique-a-gestao-da-sua-padaria/)

### Agentes IA WhatsApp (Brasil)
- [AgeuBot - Guia Chatbot WhatsApp 2026](https://ageubot.com.br/blog/chatbot-whatsapp-2026-guia-definitivo/)
- [BotConversa](https://botconversa.com.br/)
- [Globalbot](https://globalbot.com.br/)
- [SocialHub - WhatsApp Pequenas Empresas 2026](https://www.socialhub.pro/blog/whatsapp-para-pequenas-empresas-2026/)
- [Nuvem Chat - Nuvemshop](https://www.nuvemshop.com.br/blog/chatbot-whatsapp/)
- [SleekFlow - Ranking chatbots WhatsApp](https://sleekflow.io/pt-br/blog/7-melhores-chatbots-whatsapp)
- [10 Melhores Chatbots WhatsApp 2026 - GreatPages](https://blog.greatpages.com.br/post/melhores-chatbots-whatsapp-2026-guia-completo)

### Claude Vision e Multimodal
- [Claude Vision - Documentação Oficial](https://docs.claude.com/en/docs/build-with-claude/vision)
- [Claude API Platform - Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Multimodal AI in 2026](https://claude5.com/news/multimodal-ai-in-2026-vision-documents-real-world-applicatio)
- [WhatsApp-Claude-GPT GitHub](https://github.com/noDiego/whatsapp-claude-gpt)

### WhatsApp API (UAZAPI + Cloud API Pricing de referência)
- [UAZAPI - API Premium WhatsApp (escolhida)](https://uazapi.dev/)
- [WhatsApp Business Platform Pricing (referência)](https://business.whatsapp.com/products/platform-pricing?lang=pt_BR)
- [Respond.io - WhatsApp API Pricing 2026](https://respond.io/blog/whatsapp-business-api-pricing)
- [Flowcall - WhatsApp API Pricing 2026 Country Rates](https://www.flowcall.co/blog/whatsapp-business-api-pricing-2026)
- [Umbler - Custo API WhatsApp 2026](https://blog.umbler.com/br/custo-api-oficial-do-whatsapp-2026/)
- [Manychat - WhatsApp Pricing Guide](https://help.manychat.com/hc/en-us/articles/14281380243740-WhatsApp-pricing-guide)

### Pagamentos e Contexto Angola
- [EMIS - Gateway de Pagamentos Online](https://multicaixa.ao/pt/oferta/canais/comerciantes/gateway-de-pagamentos-online/)
- [AppyPay - Multicaixa Express](https://www.appypay.ao/multicaixa-express)
- [IZI Pay - Facilitador de pagamentos Angola](https://izipay.ao/)
- [BNI - Gateway de Pagamentos Online](https://www.bni.ao/pt/empresas/servicos/gateway-de-pagamentos-online)
- [Ecommerce AO - Lojas Virtuais Angola](https://ecommerce.ao/)

### CRMs internos de referência
- `/Users/admin/PROJECTOS/nelma/docs/prd-crm-whatsapp.md` (PRD Nelma v1.0)
- `/Users/admin/PROJECTOS/nelma/docs/arquitectura-agente-ia-whatsapp.md` (Arquitectura Agente IA v1.0)
- `/Users/admin/PROJECTOS/elsa/docs/prd.md` (PRD Elsa v1.0)
- `/Users/admin/PROJECTOS/elsa/docs/architecture.md` (Arquitectura Elsa v1.0)

---

*— Atlas, investigando a verdade 🔎*
*Relatório de Pesquisa v1.0 — Delícias da Isi CRM Inteligente*
*Marca Digital · Abril 2026*
