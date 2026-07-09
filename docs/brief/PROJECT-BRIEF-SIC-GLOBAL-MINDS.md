# Project Brief — SIC Global Minds

**Sistema de Inteligência Comercial · Marca Digital × Global Minds Consultoria**

| Campo | Detalhe |
|---|---|
| **Projecto** | SIC Express Global Minds (4 módulos + transversais) |
| **Cliente** | Global Minds Consultoria / Galipa Consultoria e Gestão (SU) LDA · Belas Business Park, Luanda |
| **Decisor** | Rinaldo Gomes (sócio) · Ana Gomes (backoffice) |
| **Fornecedor** | Marca Digital · Nelson Rodrigues (direcção) · Belmiro (construção) · Inês (operações) |
| **Investimento** | 600.000 Kz (500k base + 100k módulo Prospecção/Campanhas) — **pago** (SIC Express + Módulo Prospecção liquidados a 29/06) |
| **Kick-off** | 29 de Junho de 2026 · acta aprovada |
| **Entrega** | 29 de Julho de 2026 (30 dias) + 30 dias de suporte |
| **Marco imediato** | ★ Sessão de validação — **14 de Julho, 14h00** |
| **Estado à data (09/07)** | Semana 2 (construção interna). Fluxo de atendimento validado pelo cliente com anotações (03/07). NDA prometido pela MD — **pendente**. |
| **Versão do brief** | 1.0 · 09/07/2026 · Confidencial |

---

## 1. Sumário executivo

A Global Minds é uma consultoria de educação internacional com 13 anos de mercado (desde 2013), certificações PFE e Cambridge, e mais de 150 universidades parceiras em 20+ países. Opera com uma equipa de 2 pessoas, atendimento 100% manual concentrado no Rinaldo, leads geridos em Excel/WhatsApp e zero automações. A evidência das conversas reais é inequívoca: **o cliente é quem persegue o consultor** ("Não se esqueça de mim por favor!!!") — a dor central é capacidade de resposta e ponto de situação.

O SIC Global Minds entrega um agente de IA no WhatsApp (24/7, multilingue PT/EN, formal-caloroso), um CRM à medida do negócio de consultoria educacional (parceiros → destinos → cursos, ficha de estudante, pipeline de candidatura em 8 passos, matriz RFV, tracking financeiro com comissões em moeda forte), automação de follow-up e um módulo de prospecção/campanhas em massa — tudo sob regras de compliance internacional (retenção máx. 2 anos para inactivos, base privada propriedade do cliente).

**Decisão técnica deste brief:** construir sobre o **codebase da geração 2 do SIC (base ISILDA — Next.js 16 + Supabase + uazapi)**, herdando o esquema comercial do SIC-MD (BANT/score/pipeline/comissões) e os padrões de agente do CRM-Agêntico da Salus (prompt em camadas, escalação determinística, humanização anti-ban, configuração editável na UI). Projecto Supabase **dedicado** (não o SIC Geral partilhado), por imposição de compliance.

---

## 2. O cliente e o negócio

- **Actividade:** intermediação entre estudantes/profissionais angolanos (e de qualquer nacionalidade) e parceiros no estrangeiro — universidades, escolas de línguas, summer camps, Foundation, licenciaturas, mestrados, voluntariado. Sem exclusividade de parceiros.
- **Parceiros conhecidos (materiais já entregues):** Kaplan, INTO, MPW, Inspired, International House Cape Town, SAMIAD, Universidade Europeia/IADE/IPAM, Global Education Alliance (GEA), Xior Student Housing, EDU4WORD. Faltam parceiros, mas "os destinos repetem-se — basta acrescentar nomes" (Rinaldo, 30/06).
- **Destinos top-6 (Ficha de Descoberta):** África do Sul, Portugal, Reino Unido, EAU, EUA, China. Parceria África do Sul em fecho (previsão fim de Agosto 2026).
- **Perfil de cliente:** estudantes e profissionais 14+; quem paga é frequentemente o encarregado de educação. Ciclo de decisão longo (semanas), processo de candidatura em 8 passos com resposta institucional de 2–12 semanas.
- **Canais:** WhatsApp dominante (pessoal + Business + site/formulário + indicação). Instagram com 2 perfis (académico + Global Business), publicação rara. Email infogeral@globalmindsconsultoria.com.
- **Segundo segmento:** apoio a instituições — escolas e empresas (formações corporativas) — confirmado na apresentação institucional enviada a 03/07.

### Dores diagnosticadas (com evidência)

1. **Capacidade:** 2 pessoas vs. volume; "estou em reunião, retorno assim que possível" é o padrão dominante nas conversas reais; missed calls frequentes.
2. **Sem CRM:** Excel + email + WhatsApp; "esquecimento de novas leads por falta de tempo/organização documental" (C3 da Ficha).
3. **Sem follow-up sistemático:** contacto só quando há tempo; leads perdem-se; clientes em processo ficam sem ponto de situação.
4. **Captação subaproveitada:** website não capta; redes com presença mínima; carteira de 13 anos por reactivar.

---

## 3. Objectivos e métricas de sucesso

| Objectivo | Métrica | Alvo |
|---|---|---|
| Resposta imediata a leads | Tempo até 1ª resposta | **< 60 segundos, 24/7** |
| Qualificação automática | % de leads pré-qualificados antes de tocar no Rinaldo | 70–80% |
| Recuperação por follow-up | Leads reactivados por sequências | +30–50% |
| Capacidade | Leads geridos sem contratar | 2× |
| Visibilidade | Pipeline centralizado em tempo real | 100% (adeus Excel) |
| Captação activa (M5) | Novo fluxo de leads (encarregados + empresas) | Novo canal operacional |
| **Indicador de conclusão** | "O Rinaldo acompanha todos os leads sem Excel manual" | ✔ no go-live |

ROI declarado ao cliente: o sistema recupera-se com a conversão de 1–2 alunos adicionais/mês.

---

## 4. Âmbito — 5 módulos

> A acta fala em "4 módulos" porque a Formação passou a transversal; o plano de trabalho v2 detalha 5. Este brief segue o plano v2.

### M1 — Agente IA de Atendimento (WhatsApp)
Assistente "Global Minds" 24/7: responde à FAQ (12 perguntas validadas com respostas oficiais), qualifica, recolhe a ficha de estudante em conversa, agenda a Consulta de Orientação com o Rinaldo. Persona institucional, formal e calorosa, pt-AO, **multilingue (PT/EN)**, voz feminina. Telegram como canal opcional futuro.

**Regras de comportamento validadas pelo cliente (fluxo v1.0 + anotações de 03/07):**
- Saudação oficial: *"Global Minds, muito bom dia / boa tarde / boa noite, em que podemos ser-lhe útil?"*
- "Você" para encarregados, "tu" para estudante jovem; máx. 1 emoji; 1 pergunta de cada vez; nunca se identifica como IA; nunca promete admissão garantida.
- **Regra de faixas de preços:** educa com faixas de investimento e custo de vida (tabelas da Ficha A3); cotação exacta só na proposta por email, após a consulta. Nunca inventa valores.
- **Escalação determinística (corre ANTES do LLM):** pedido explícito de humano · urgência/problema grave · pergunta sem resposta · **sempre que se fale de custos de serviços ou pagamentos (D5)** · negociação de valores.

### M2 — CRM à medida
- **Catálogo:** parceiros → destinos (países) → cursos/programas (verão, línguas, Foundation, licenciatura, mestrado, voluntariado) com custos (faixas).
- **Pipeline de candidatura** decalcado do processo real em 8 passos: Lead → Qualificado → Consulta agendada → Proposta enviada → Formalização/Pagamento → Candidatura submetida → Em curso → Concluído. Tempos por fase (1º contacto 1–3 dias; ficha 5–10 dias; consulta até 15 dias; proposta 2–7 dias; resposta institucional 2–12 semanas).
- **Ficha de estudante** estruturada (preenchida em conversa ou formulário/link) + checklist documental (passaporte, certificados, comprovativos financeiros, etc.).
- **Matriz RFV** (Recência, Frequência, Valor) sobre a carteira de 13 anos.
- **Tracking financeiro:** honorários + comissões de parceiros em **moeda forte (EUR/USD/GBP)** com contravalor AOA, percentagens por parceiro, lembretes de vencimento de facturas (ex.: 5 dias antes).
- Importação dos Excels existentes (leads + acompanhamento de estudantes + planilha GEA).

### M3 — Automação de Follow-up
- Lead sem decisão: **sequência de 21 dias com 7 abordagens distintas**; reactivação a 90 dias; cadência editável na UI (templates fixos da equipa, não gerados por IA).
- Cliente em processo: **ponto de situação proactivo** (o maior valor identificado nas conversas reais) — lembretes de documentos, confirmações de pagamento, avanços de fase.
- Agendamento automático (calendário + email do cliente), lembretes de consulta 24h antes + no dia, alertas de "cliente esquecido" e risco de perda.
- Dashboard de métricas: origem de leads/UTM, conversão por fase, tempo de resposta, análise 80/20 de destinos mais rentáveis.

### M4 — Formação e Transferência
Formação do Rinaldo e da Ana, manual de operações personalizado, sessão de alinhamento 30 dias depois, 30 dias de suporte (<24h via WhatsApp).

### M5 — Prospecção + Campanhas em Massa (+100.000 Kz) ⭐
Captação activa de encarregados de educação e empresas por WhatsApp/email; gestão de campanhas em massa; ligação aos 2 perfis de Instagram e Google Meu Negócio; abordagem "problema → solução". **Disparo = workflow determinístico com templates fixos (sem IA na mensagem), anti-ban, lotes e dry-run por defeito** (padrão Salus).

### Fora de âmbito (Fase 2 / SIC Completo — registar, não construir)
Acompanhamento automático da candidatura (etapa 10 do fluxo) · recuperação de no-show · pós-partida (review Google + indicações) · gestão de redes sociais (proposta separada Proposta_GestaRedes) · assistente no website · relatórios com ideias de melhoria gerados por IA. O cliente já sinalizou apetite — é o caminho de recorrência.

---

## 5. Compliance e protecção de dados ⚠️ (requisito crítico e diferenciador)

A Global Minds tem certificação internacional (única em Angola com credenciamento do Reino Unido) e compliance com parceiros em 5 continentes. O Rinaldo formalizou por email (02/07) a exigência de confidencialidade e identificou a entidade jurídica (Galipa Consultoria e Gestão (SU) LDA).

| Regra | Implementação técnica |
|---|---|
| Inactivos apagados aos **2 anos** | Rotina **pg_cron mensal** + função `anonimizar_cliente()` (padrão RGPD já em produção na ISILDA, migração 031) — anonimiza/apaga leads sem actividade há 24 meses e sem processo em curso |
| Retenção justificada | Clientes com processo em curso mantêm histórico até concluir o curso/universidade (flag `processo_em_curso` bloqueia a rotina) |
| **Propriedade dos dados** | **Projecto Supabase dedicado e privado da Global Minds** (não o backend partilhado "SIC Geral") + capacidade de exportação/migração integral |
| Confidencialidade | **NDA a formalizar pela MD — pendente desde 02/07 (acção prioritária)** |
| Standards internacionais | Aplicar o acordo de compliance do cliente a todas as integrações |
| Segurança operacional | Não contactar números desactualizados (lição de caso real da reunião); consentimentos registados (padrão `consentimentos`, ISILDA 020); opt-out "SAIR" processado antes do agente |

---

## 6. Sistemas de referência — o que herdamos de cada um

Foram analisados os três sistemas em produção da Marca Digital. Síntese comparativa:

| Dimensão | SIC-MD (interno MD) | CRM-Agêntico Salus | ISILDA (geração 2 SIC) |
|---|---|---|---|
| Framework | Vite 5 + React 18 + Tailwind 3 | Next.js 15 + React 18 + Tailwind 4 | **Next.js 16 + React 19 + Tailwind 4** |
| Backend | Supabase (132 tabelas, 79 edge functions) | Supabase + Vercel Workflows (duráveis) | Supabase (8 edge functions focadas + pg_cron) |
| IA | Claude API directa | Vercel AI SDK + Haiku 4.5 | Haiku 4.5 (classificação) + Sonnet 4.5 (resposta) |
| WhatsApp | uazapi + Cloud API | uazapi + fallback Cloud API | uazapi (webhook + fila) |
| Fila/robustez | filas + cadências maduras | webhook sync/durável comutável | **idempotência + debounce 10s + SKIP LOCKED + destrava locks presos** |
| Segurança | RLS multi-tenant (corrigida tarde, 440 policies) | RLS fraca ("authenticated full access") | **RLS desde o dia 1 + RGPD + auditoria C→A-** |
| Testes | esparsos | nenhum | **8 suites node:test (safety, go-live, smoke)** |
| Automações | pg_cron + edge functions | crons Vercel | pg_cron + edge functions |

### Herança do SIC-MD (esquema comercial e operação)
- Modelo BANT: `bant_budget/authority/need/timeline` + `sales_score` 0–100 com `score_confidence` (score ≥70 e confidence não-low → alerta de lead quente; confidence low mantém score conservador).
- Domínios `deals`, `sales_pipelines`, `sales_pipeline_stages`, `deal_payments`, `commissions` — base do tracking financeiro/comissões da GM.
- Cadência MORNO 12 touchpoints/21 dias (adaptar para as 7 abordagens da GM).
- `rate_limits` em BD (sem Redis) e security headers Vercel (CSP, HSTS, X-Frame-Options).
- Regra de ouro do prompt: data/hora com timezone no TOPO + "ignora datas do histórico" (evita agendar no passado).

### Herança da Salus (padrões de agente e disparo)
- **System prompt em camadas:** Voice of Brand (editável na BD) + contexto do lead + overlay por etapa do funil + HUMANIZATION_GUARD + BREVITY_GUARD + COMPLIANCE_GUARD.
- **Escalação determinística antes do LLM** (hard: keyword/pedido de humano/valores; soft: N mensagens sem progresso de fase — contadas desde o último avanço, não o total).
- **Humanização anti-ban:** resposta em 1–3 balões ≤160 chars, delay de digitação proporcional (typing indicator uazapi), remoção de travessões (assinatura de IA).
- **Disparo em massa = workflow determinístico:** 40s entre mensagens, lotes de 5, dry-run por defeito, bloqueio se a lista violar compliance — é exactamente o M5.
- **Tudo configurável na UI sem redeploy:** chaves API, prompt, janela de contexto, cadência de follow-up, keyword de opt-out, instâncias WhatsApp com QR.
- Compliance com regeneração (retry a indicar termos violados) em vez de bloqueio seco; fallback "tool sem texto → regenera sem tools".
- Lição negativa a NÃO repetir: RLS "authenticated full access" e ausência de testes.

### Herança da ISILDA (codebase base — geração 2)
- Pipeline de mensagens robusto: `uazapi-webhook-receiver` (validação de token + redact de logs) → `mensagens_whatsapp` → `enqueue_message_for_ai_agent` com **debounce 10s** (junta mensagens picadas) → `ai_agent_message_queue` com **FOR UPDATE SKIP LOCKED** → agente → envio com typing.
- Idempotência de webhook (`webhook_processed_messages` UNIQUE em `whatsapp_message_id`) — elimina respostas duplicadas.
- Locks com auto-destrava (>3 min em processing) — fix do sintoma "agente pára a meio".
- `normalizeAngolaPhone` (trata `@s.whatsapp.net`, `@c.us`, `@lid`, prefixo 244) — reutilizar sem alterações.
- Settings JSONB de série: working_hours, debounce 10s, response_delay 1500–4000ms, split 300 chars, contexto 250 msgs, máx. 60 msgs/conversa, auto-pausa após resposta humana, cadência 50/h e 60/dia.
- Safety testada: `detectJailbreakAttempt`, `sanitizeForContext`, `stripInternalThinking` + suites go-live e smoke.
- Resposta de continuidade pós-tool (nunca fallback técnico genérico).
- RGPD: `consentimentos` + `anonimizar_cliente()` — **peça central do compliance GM**.
- Painel do agente no CRM: prompt/modelo/temperatura editáveis + botão "Testar prompt".

---

## 7. Stack tecnológico decidido

> Correcção ao plano de trabalho: o plano v2 menciona "Supabase + n8n". **Nenhum SIC em produção usa n8n/Make** — toda a automação é pg_cron + edge functions + RPCs. Este brief normaliza o stack ao padrão real de produção.

| Camada | Escolha | Justificação |
|---|---|---|
| Frontend/CRM | **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4** | Codebase ISILDA — geração 2 já clonada com sucesso para La-Femme; padrão actual da casa |
| Base de dados | **Supabase dedicado** (Postgres + RLS + Realtime + Storage + pg_cron + pgvector) | Compliance exige base privada propriedade da GM, exportável; RLS desde a migração 002 |
| Agente IA | **Edge functions Deno** (`gm-agent`, `uazapi-webhook-receiver`, `uazapi-send-message`, `gm-lead-intelligence`, crons) + `_shared/` (llm-client, backend-mode) | 8 funções focadas em vez de monólito; padrão ISILDA |
| Modelos | **Claude Haiku 4.5** (classificação de intenção/score) + **Claude Sonnet 4.5** (resposta ao cliente, PT/EN) | Combinação em produção na ISILDA; custo/qualidade equilibrado; multilingue nativo |
| WhatsApp | **uazapi** — instância dedicada `SIC-GlobalMinds` | Padrão de todos os SIC; QR code gerido na UI; typing indicator |
| Email | Email institucional GM (infogeral@) via integração SMTP/API para sequências M3/M5 | Requisito do plano (follow-up email) |
| Agendamento | Google Calendar (FreeBusy + criação de evento) | Padrão Salus/SIC-MD; consulta de orientação com o Rinaldo |
| Hosting | **Vercel** em subdomínio da GM (ex.: `sic.globalmindsconsultoria.com`) | Decisão da acta (alojamento em subdomínio); security headers do SIC-MD |
| Testes | node:test nativo — suites safety + go-live-readiness + production-smoke | Padrão ISILDA; smoke test de 4 passos obrigatório antes da entrega |
| Automação | pg_cron (follow-up 21 dias, reactivação 90 dias, lembretes de factura, **rotina de apagamento 2 anos**) | Sem n8n — menos peças, menos falhas |

**Decisão de tenancy:** projecto Supabase **dedicado e single-tenant** (não o "SIC Geral" partilhado). Fundamentos: (1) a acta garante base privada e propriedade da GM com migração futura; (2) o acordo de compliance internacional aplica-se a toda a infra-estrutura; (3) lição Ketson/Natacha — tenants sobrescritos em backend partilhado são um risco que aqui é inaceitável.

---

## 8. Arquitectura de alto nível

```
WhatsApp (nº GM) ⇄ uazapi (instância SIC-GlobalMinds)
                       │ webhook (x-webhook-token)
                       ▼
   uazapi-webhook-receiver ──► mensagens_whatsapp ──► fila (debounce 10s, SKIP LOCKED)
                       │                                      │
              opt-out "SAIR" (antes do agente)                ▼
                       │                              gm-agent (edge function)
                       │        ┌─ escalação determinística (D5: valores/pagamentos → humano)
                       │        ├─ prompt em camadas (marca + lead + etapa + guards)
                       │        ├─ tools: qualify_lead · check_availability · schedule_consultation
                       │        │         · criar_ficha_estudante · notificar_humano
                       │        └─ Haiku 4.5 (classificar/score) + Sonnet 4.5 (responder PT/EN)
                       ▼                                      │
              CRM Next.js 16 (Vercel, subdomínio GM) ◄────────┘ Realtime
              Kanban pipeline · Inbox · Catálogo parceiros→destinos→cursos
              Ficha de estudante · RFV · Financeiro/comissões · Dashboard · Configurações
                       │
              pg_cron: follow-up 21d/7 abordagens · reactivação 90d · lembretes factura/consulta
                       · compliance: apagamento de inactivos > 2 anos
              M5 Disparo: workflow determinístico (templates fixos, 40s/msg, lotes 5, dry-run)
```

### Modelo de dados nuclear (específico GM sobre a base ISILDA + comercial SIC-MD)

- **Herdadas da base:** `profiles`, `clientes/leads`, `interacoes`, `mensagens_whatsapp`, `mudancas_estagio`, `ai_sales_agents`, `ai_agent_conversations`, `ai_agent_message_queue`, `ai_agent_logs`, `webhook_processed_messages`, `whatsapp_instances`, `integration_keys`, `templates_whatsapp`, `notificacoes`, `consentimentos`, `rate_limits`.
- **Novas (domínio GM):**
  - `parceiros` (instituição, país, tipo, % comissão, links, brochuras) → `destinos` → `programas` (tipo: summer/línguas/foundation/licenciatura/mestrado/voluntariado · faixa de custo · moeda)
  - `fichas_estudante` (dados pessoais, encarregado, percurso académico, nível linguístico, orçamento, destino pretendido, documentos checklist, `processo_em_curso`)
  - `candidaturas` (pipeline 8 fases, tempos por fase, instituição, programa, estado documental)
  - `financeiro`: `honorarios`/`deals`, `comissoes` (moeda EUR/USD/GBP + contravalor AOA + % + estado), `facturas` (vencimento + lembrete D-5)
  - `campanhas` + `campanha_envios` (M5 — estado por destinatário, anti-ban, opt-out)
  - Qualificação no lead: `stage`, `temperature` (QUENTE ≥9 / MORNO 5–8 / FRIO ≤4), `bant_*`, `sales_score`, `score_confidence`, `fit_score`, `destino`, `nivel`, `orcamento`, `followup_count`
- **Regra de disciplina (auditoria 2026-07-05):** enums e FKs definidos por escrito ANTES de criar tabelas — erros repetidos por `novo≠new` e FK ausente custaram retrabalho.

---

## 9. Cronograma e estado actual

| Semana | Fase | Período | Estado a 09/07 |
|---|---|---|---|
| 1 | Kick-off & Levantamento | 29/06–03/07 | ✅ Concluída — acta aprovada, ficha de descoberta preenchida, materiais de parceiros recebidos (30/06), tom calibrado (3 chats + 3 emails), fluxo de atendimento desenhado e **validado pelo cliente com anotações (03/07)** |
| 2 | Construção interna | 06/07–13/07 | 🔨 **Em curso (hoje)** — cliente regressou de férias a 09/07; incorporar anotações do Rinaldo no fluxo; construir agente + CRM + automações |
| 3 | Testes & Validação | 14/07–21/07 | ★ Sessão de validação **14/07 às 14h00** (link a enviar) · testes PT/EN · links de teste a terceiros |
| 4 | Formação & Entrega | 22/07–29/07 | Manual de operações · formação Rinaldo+Ana · go-live no subdomínio + número real · acta de entrega |

**Pendências críticas à data (donos e urgência):**

| # | Pendência | Dono | Urgência |
|---|---|---|---|
| 1 | **NDA/contrato de confidencialidade** (prometido a 02/07; cliente formalizou exigência) | Marca Digital (Inês) | 🔴 Antes da validação de 14/07 |
| 2 | Incorporar as anotações do Rinaldo no fluxo do agente (documento devolvido 03/07) | Belmiro/Nelson | 🔴 Esta semana |
| 3 | Subdomínio + acesso ao domínio | Global Minds | 🔴 Semana em curso |
| 4 | Tipo de conta WhatsApp ("não sei o que é isso" na ficha) — confirmar e definir caminho uazapi | Belmiro (@devops) | 🔴 Antes da ligação do número |
| 5 | Acordo de compliance internacional do cliente (base para as políticas de dados) | Global Minds | 🟡 Semana 3 |
| 6 | Frases obrigatórias da marca (D3 da ficha — "a fazer com a Ana") | Ana → MD | 🟡 Antes do go-live |
| 7 | Link da sessão de validação de 14/07 | Marca Digital | 🔴 Imediato |

---

## 10. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Complexidade do catálogo (parceiros × destinos × programas × moedas) | Alto — maior esforço do projecto | Aceitar Excels "como estão"; catálogo mínimo viável com os parceiros já enviados; entregas incrementais (modo de trabalho acordado na acta) |
| Compliance mal aplicado | Alto — risco legal para cliente certificado | Secção 5 deste brief; rotina de apagamento testada em staging; NDA assinado antes de dados reais em produção |
| Agente falar de valores/pagamentos | Alto — quebra de confiança (D5) | Escalação determinística pré-LLM + regra de faixas + guard de compliance pós-geração com regeneração |
| Comissões em moeda forte mal modeladas | Médio | Validar regras com o Rinaldo na sessão de 14/07; testar na Semana 3 (tarefa 3.5) |
| Banimento do número WhatsApp (M5) | Alto — canal único do negócio | Padrão anti-ban Salus (40s/msg, lotes 5, dry-run por defeito, opt-out obrigatório); campanhas só a contactos com consentimento |
| Multilingue (EN) com qualidade inferior ao PT | Médio | FAQ já existe em PT+EN; suite de testes de conversas EN na Semana 3 |
| Scope creep (redes sociais, site, relatórios IA) | Médio | Registado como Fase 2/SIC Completo — fora dos 30 dias; é o funil de recorrência |
| Atraso em acessos (subdomínio, conta WA) | Alto — empurra go-live | Pendências 3–4 com dono e prazo; regra da acta: cada semana de atraso empurra a entrega na mesma medida |

---

## 11. Equipa e responsabilidades (RACI)

| Papel | Pessoa | Responsabilidade |
|---|---|---|
| Sponsor/Decisor (cliente) | Rinaldo Gomes | Decisões, validações, conteúdo de negócio, testes |
| Operação (cliente) | Ana Gomes | Dados, FAQ, fichas, backoffice, frases da marca (D3) |
| Direcção do projecto | Nelson Rodrigues | Plano, formação, entrega, relação, NDA |
| Construção técnica | Belmiro | Agente IA, CRM, integrações, M5, dashboard |
| Operações/manual | Inês | Manual, documentação, comunicação, NDA |

---

## 12. Critérios de aceitação (go-live 29/07)

1. Agente responde em <60s no número real, PT e EN, com o tom validado (saudação oficial, "você"/"tu", regra de faixas) e **escala sempre que se fala de valores/pagamentos**.
2. Fluxo ponta a ponta testado: lead novo → qualificado (BANT/temperatura) → ficha de estudante criada → consulta agendada no calendário do Rinaldo → lembrete 24h.
3. CRM com catálogo (parceiros enviados a 30/06 carregados), pipeline de 8 fases, Excels importados, RFV e financeiro (comissões em moeda forte) operacionais.
4. Follow-up 21 dias/7 abordagens e reactivação 90 dias activos; lembretes de factura D-5.
5. M5: campanha de teste executada em dry-run + campanha real pequena com anti-ban e opt-out.
6. Compliance: rotina de apagamento 2 anos activa e demonstrada; consentimentos registados; NDA assinado; export de dados demonstrado ao cliente.
7. Suites de teste (safety + go-live-readiness + smoke) a passar; smoke test de 4 passos executado.
8. Manual entregue, equipa formada, sistema no subdomínio da GM, acta de entrega assinada — arranque dos 30 dias de suporte.

---

## 13. Referências

**Documentação do projecto (fontes deste brief):**
- `docs/kickoff/05-ACTA-KICKOFF.md` · `03-PLANO-TRABALHO-4-SEMANAS.md` · `02-LISTA-ACESSOS-REQUISITOS.md` · `00-RESUMO-SESSAO.md`
- `docs/analise/fluxo-atendimento-agente-global-minds.md` (v1.0, validado 03/07 com anotações do cliente)
- `Proposta_SIC_Express_Global_Minds_Jun2026.pdf` · `AnáliseDigital_GlobalMinds_Junho2026.pdf` · `Relatorio_Diagnostico_GlobalMinds.docx` · CSV de levantamento (18/06)
- `RE_ Envio do Fluxo de Atendimento... .pdf` (thread de 12 emails, 29/06–03/07) · Ficha de Descoberta + 3 chats WhatsApp (pasta `RE_ Global Minds - Exemplar de conversas...`)

**Sistemas de referência (código a estudar antes de construir):**
- ISILDA (base do codebase): `/Users/admin/PROJECTOS/ISILDA` — `supabase/functions/isilda-agent/index.ts`, `_shared/llm-client.ts`, migrações 008/009/020/031, `tests/`
- Salus: `/Users/admin/PROJECTOS/Salus/CRM-Agentico/crm` — `BRIEFING.md`, `lib/ai/{prompt,reply,escalation,humanize-send}.ts`, `workflows/`, `supabase/migrations/`
- SIC-MD (esquema comercial): `/Users/admin/MD/SIC-MD` — `docs/database/SCHEMA.md`, `supabase/functions/ai-sales-agent`, `calculate-lead-score`
- Skills operacionais: `novo-cliente-sic` (setup padronizado — seguir as Fases 1–6) · `sic-doctor` · `diagnose-whatsapp-bot`

---

*Marca Digital · Consultoria AI First · Luanda, Angola · comercial@marcadigital.ao*
*"A liberdade que precisa." · Project Brief v1.0 — 09/07/2026 · Confidencial — uso interno MD + Global Minds*
