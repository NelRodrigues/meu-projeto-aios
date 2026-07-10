# SIC Global Minds — Product Requirements Document (PRD)

**Sistema de Inteligência Comercial · Marca Digital × Global Minds Consultoria**

> Fonte: [Project Brief v1.2](../brief/PROJECT-BRIEF-SIC-GLOBAL-MINDS.md) (10/07/2026). Este PRD converte o brief em requisitos e épicos executáveis. Confidencial — uso interno MD + Global Minds.

---

## 1. Objectivos e Contexto

### Objectivos

- Responder a 100% dos leads WhatsApp em <60 segundos, 24/7, em PT e EN, com o tom validado da Global Minds.
- Pré-qualificar automaticamente 70–80% dos leads (BANT + temperatura QUENTE/MORNO/FRIO) antes de tocar no Rinaldo.
- Eliminar o Excel: 100% do pipeline de candidaturas (8 fases) centralizado, com ficha de estudante estruturada.
- Recuperar +30–50% de leads via follow-up automático e dar ponto de situação proactivo a clientes em processo.
- Registar honorários e comissões multi-moeda (ISO 4217) com lembretes de facturas.
- Abrir um novo canal de captação activa (campanhas WhatsApp oficiais + email marketing com tracking).
- Cumprir o compliance internacional do cliente: apagamento automático de inactivos aos 2 anos, base privada e exportável.
- Entregar equipa autónoma a 29/07/2026 (formação + manual + 30 dias de suporte).

### Contexto

A Global Minds é uma consultoria de educação internacional (Luanda, desde 2013, certificações PFE e Cambridge, 150+ parceiros em 20+ países) operada por 2 pessoas com atendimento 100% manual e dados em Excel. As conversas reais mostram que **o cliente é quem persegue o consultor** — a dor central é capacidade de resposta e ponto de situação, não falta de procura. O projecto foi contratado (600.000 Kz, pagos) com kick-off a 29/06 e entrega a 29/07/2026; a validação intermédia é a 14/07 às 14h00.

A construção assenta na geração 2 do SIC (base ISILDA — Next.js 16 + Supabase + uazapi), herda o esquema comercial do SIC-MD e os padrões de agente da Salus, e integra o Módulo Marketing & Campanhas (pacote pronto, §7.1 do brief) para email + campanhas. Supabase dedicado por imposição de compliance.

### Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 10/07/2026 | 1.0 | PRD inicial a partir do Project Brief v1.2 | Morgan (@pm) |

---

## 2. Requisitos

### Funcionais

- **FR1:** O agente IA responde a mensagens WhatsApp recebidas em <60s, 24/7, com a saudação oficial da GM e persona formal-calorosa (pt-AO), suportando PT e EN com detecção automática do idioma do lead.
- **FR2:** O agente responde às 12 FAQ validadas (com tabelas de universidades, faixas de investimento e custo de vida) exclusivamente a partir da base de conhecimento — zero invenção; sem resposta na base → escala para humano.
- **FR3:** O agente aplica a regra de faixas de preços: educa com faixas, nunca dá cotação exacta (cotação só na proposta por email, após consulta).
- **FR4:** Escalação determinística executada ANTES do LLM: pedido de humano, urgência/problema grave, pergunta sem resposta na base, e sempre que a conversa envolva custos de serviços, pagamentos ou negociação de valores (regra D5).
- **FR5:** O agente qualifica leads (destino, nível, percurso, idioma, orçamento, prazo, decisor) preenchendo BANT + `sales_score` 0–100 com `score_confidence`; score ≥70 com confiança não-baixa gera alerta de lead quente ao Rinaldo.
- **FR6:** O agente recolhe a ficha de estudante durante a conversa (ou via link de formulário) e cria/actualiza o registo no CRM automaticamente.
- **FR7:** O agente agenda Consultas de Orientação consultando FreeBusy do Google Calendar do Rinaldo, dentro de janelas fixas acordadas, com buffer e fuso explícito; envia confirmação e lembrete 24h antes.
- **FR8:** Opt-out por palavra-chave ("SAIR") processado antes do agente: pausa IA e follow-ups, envia despedida fixa, regista `pause_reason`.
- **FR9:** O CRM apresenta o catálogo parceiros → destinos → programas (tipo, faixa de custo, moeda, % comissão, links/brochuras) navegável e editável.
- **FR10:** O CRM tem pipeline kanban de 8 fases (Lead → Qualificado → Consulta agendada → Proposta enviada → Formalização/Pagamento → Candidatura submetida → Em curso → Concluído) com arrastar-e-soltar, tempos por fase e histórico de mudanças.
- **FR11:** O CRM importa os Excels existentes do cliente (leads, acompanhamento de estudantes, planilha GEA) preservando os dados "como estão".
- **FR12:** O CRM regista financeiro: honorários e comissões com campo `currency` ISO 4217 + contravalor AOA, percentagens por parceiro, facturas com lembrete de vencimento D-5.
- **FR13:** O CRM calcula matriz RFV sobre a carteira e apresenta análise 80/20 de destinos mais rentáveis no dashboard.
- **FR14:** Inbox de conversas WhatsApp no CRM com painel do contacto; resposta humana pausa automaticamente o agente nessa conversa (`auto_pause_after_human_reply`).
- **FR15:** Follow-up automático a leads sem decisão com cadência editável na UI (templates fixos da equipa, não gerados por IA); reactivação de leads a 90 dias. *(Cadência exacta — semanal vs 21d/7 toques — a fixar na validação de 14/07.)*
- **FR16:** Automações visuais arrastar-e-soltar (React Flow): triggers `lead_created`/mudança de fase → nós wait/sendEmail/sendWhatsapp/updateField/addTag/branch, executadas por cron.
- **FR17:** Email marketing: editor visual Maily, campanhas via Resend com tracking sent/delivered/opened/clicked/bounced, lista de supressão, link de descadastro obrigatório e histórico na timeline do lead (com HTML real enviado).
- **FR18:** Campanhas WhatsApp em 2 canais: Meta Cloud API (templates aprovados; criação e sincronização pela UI) e uazapi (texto livre com variações), com wizard (identidade → canal → audiência → mensagem → atribuição → envio → revisão) e dry-run por defeito.
- **FR19:** Anti-block uazapi por instância: delays 45–90s, 40/hora, 500/dia, warm-up 5 dias, cooldown automático (limites únicos — os do módulo Marketing).
- **FR20:** Audiências de campanha por filtros (fase, score, BANT, destino) ou selecção manual de leads, com exclusões; RPC de população respeita `lead_ids[]`.
- **FR21:** Dashboard de métricas: leads por origem/UTM, conversão por fase, tempo de resposta, campanhas (KPIs + log paginado), RFV/80-20. *(Métricas prioritárias do Rinaldo — questão 7 da validação.)*
- **FR22:** Rotina mensal de compliance: leads/clientes inactivos há ≥2 anos e sem processo em curso são anonimizados/apagados (incluindo `email_sends`/`email_events`); clientes com `processo_em_curso` mantêm histórico. *(Definição de "inactivo" — questão 2 da validação.)*
- **FR23:** Exportação integral dos dados da GM (CSV/JSON) accionável pelo cliente — propriedade da base demonstrável.
- **FR24:** Consentimentos registados por contacto (fonte, data); campanhas só a contactos com consentimento.
- **FR25:** Painel de configuração sem redeploy: prompt/modelo/temperatura do agente (com botão "Testar prompt"), chaves de integração, instâncias WhatsApp com QR code, cadências, keyword de opt-out.
- **FR26:** Notificações ao humano (handoff): lead quente, escalação D5, conversa transferida — entregues por WhatsApp ao Rinaldo/Ana e registadas no CRM.

### Não Funcionais

- **NFR1:** Idempotência ponta a ponta: webhook com `whatsapp_message_id` UNIQUE; debounce de 10s para juntar mensagens picadas; fila com FOR UPDATE SKIP LOCKED; locks com auto-destrava >3 min.
- **NFR2:** Humanização anti-detecção: respostas divididas (≤300 chars/parte), typing indicator, delays 1500–4000ms, máx. 1 emoji, sem travessões de IA.
- **NFR3:** Rate limits do agente explícitos e visíveis: 60 msgs/conversa, 50/hora, 60/dia (cadência), horário de funcionamento configurável com mensagem fora de horas.
- **NFR4:** Segurança: RLS activa desde a 1ª migração; rotas com service_role protegidas por guard `requireAdmin`; security headers (CSP, HSTS, X-Frame-Options); tokens redigidos nos logs; validação `x-webhook-token`.
- **NFR5:** Safety do agente testada: detecção de jailbreak, sanitização de contexto, remoção de raciocínio interno, guardrails de frases proibidas ("admissão garantida" nunca prometida).
- **NFR6:** Edge functions de webhook (Resend/Meta) deployadas com `--no-verify-jwt` e autenticadas por assinatura (Svix/hub challenge).
- **NFR7:** Suites de teste obrigatórias antes do go-live: safety, go-live-readiness, production-smoke (node:test), + smoke test de 4 passos do padrão SIC e smoke test do módulo Marketing.
- **NFR8:** Custos de operação dentro do cenário base do brief (§7.2 — ~50k–86k Kz/mês); Meta Cloud API orçamentada por campanha antes do envio.
- **NFR9:** Single-tenant em projecto Supabase dedicado da GM; sem `tenant_id` (regra zero do módulo Marketing); dados exportáveis.
- **NFR10:** Data/hora com timezone injectada no topo do prompt do agente ("ignora datas do histórico") — nunca agendar no passado.
- **NFR11:** Degradação graciosa: falha de classificação mantém perfil anterior; falha de envio grava `failed` e devolve 200; falha de tool não quebra o loop (resposta de continuidade).
- **NFR12:** Toda a comunicação visível ao cliente final em pt-AO com ortografia pré-Acordo; conteúdo EN nativo quando o lead escreve em inglês.

---

## 3. Objectivos de Design de Interface (UI)

### Visão UX

CRM operado por 2 pessoas não-técnicas (Rinaldo e Ana). Prioridade absoluta: **clareza sobre densidade** — cada ecrã responde a uma pergunta do dia-a-dia ("quem preciso de contactar hoje?", "onde está este estudante no processo?"). O agente trata o volume; a UI serve decisão e supervisão.

### Paradigmas de interacção

- Kanban arrastar-e-soltar como vista central do pipeline.
- Inbox estilo WhatsApp Web (lista de conversas + chat + painel do contacto) com botão "assumir conversa" (pausa o agente).
- Wizards passo-a-passo para acções raras e de risco (campanhas).
- Painéis de configuração editáveis sem código (prompt, cadências, instâncias).

### Ecrãs nucleares

1. Dashboard (KPIs + alertas de leads quentes + facturas a vencer)
2. Kanban do pipeline de candidaturas (8 fases)
3. Inbox WhatsApp (conversas + handoff)
4. Ficha de estudante / detalhe do lead (360º: dados, timeline, documentos checklist, financeiro, emails recebidos)
5. Catálogo (parceiros → destinos → programas)
6. Financeiro (comissões, facturas, lembretes)
7. Marketing (dashboard, campanhas email/WhatsApp, templates, automações React Flow)
8. Configurações (agente IA + testar prompt, instâncias WhatsApp/QR, integrações, compliance/exportação)

### Acessibilidade: Nenhuma exigência formal

WCAG não contratado; aplicar boas práticas base (contraste, foco, navegação por teclado) sem auditoria formal.

### Marca

Identidade Global Minds (logótipo e cores fornecidos pelo cliente — item E da ficha). UI limpa tipo SaaS; sem identidade Marca Digital no produto final (o sistema é propriedade da GM).

### Plataformas-alvo: Web Responsive

Desktop-first (trabalho de backoffice da Ana) com responsive completo para o Rinaldo operar do telemóvel em viagem. PWA herdado da base ISILDA.

---

## 4. Assunções Técnicas

*(Decisões fechadas no brief §7 — vinculam o @architect.)*

### Estrutura de repositório: Monorepo

Repo único `SIC-Global-Minds` (clone adaptado da base ISILDA): app Next.js + `supabase/` (migrações + edge functions) + `tests/` + `docs/`.

### Arquitectura de serviços

Monólito Next.js 16 (App Router, React 19, Tailwind v4) na Vercel + Supabase dedicado (Postgres, RLS, Realtime, Storage, pg_cron) com edge functions Deno focadas (`gm-agent`, `uazapi-webhook-receiver`, `uazapi-send-message`, `gm-lead-intelligence`, crons, + 9 edges do módulo Marketing). Sem n8n/Make. Modelos: Claude Haiku 4.5 (classificação) + Claude Sonnet 4.5 (resposta/PT-EN). WhatsApp: uazapi (atendimento + campanhas quentes) e Meta Cloud API (campanhas frias oficiais). Email: Resend com domínio verificado da GM. Alojamento em subdomínio do site da GM.

### Requisitos de testes: Unit + Integration + Smoke

node:test nativo (padrão ISILDA): suites de safety do agente, go-live-readiness, production-smoke, mappers/integração; smoke tests manuais guiados (4 passos SIC + guia 04 do módulo Marketing). Sem pirâmide E2E completa — prazo de 30 dias não comporta.

### Assunções adicionais

- Reutilizar SEM alteração: `normalizeAngolaPhone`, fila com debounce/SKIP LOCKED, `anonimizar_cliente()` (adaptada), settings JSONB de série da ISILDA.
- Enums e FKs definidos por escrito ANTES de criar tabelas (lição da auditoria de 05/07).
- Port do frontend do módulo Marketing: Vite/react-router → App Router como client components; testar preview Maily cedo (React 19).
- Migrações numeradas com rollback e comentários com o porquê; seeds do agente e do catálogo versionados.
- Contas (Supabase, Vercel, Resend, Meta, uazapi) em nome da GM desde o dia 1 (decisão comercial §7.2 do brief — a confirmar a 14/07).

---

## 5. Lista de Épicos

| # | Épico | Objectivo (1 frase) |
|---|---|---|
| **E1** | Fundação & Infra-estrutura | Projecto Supabase dedicado + app Next.js no ar (auth, RLS, deploy, subdomínio) com health-check e login funcionais. |
| **E2** | CRM Nuclear — Catálogo, Pipeline & Financeiro | Rinaldo acompanha todos os leads sem Excel: catálogo, ficha de estudante, kanban 8 fases, importação, financeiro multi-moeda e RFV. |
| **E3** | Agente IA de Atendimento WhatsApp | Lead real atendido, qualificado e com consulta agendada em <60s, com escalação D5 e inbox de supervisão. |
| **E4** | Follow-up, Compliance & Dashboard | Nenhum lead esquecido e nenhum dado retido ilegalmente: cadências, lembretes, rotina de 2 anos, consentimentos, exportação e dashboard. |
| **E5** | Marketing & Campanhas (M5) | Captação activa operacional: email marketing com tracking, campanhas WhatsApp em 2 canais com anti-block e automações visuais. |
| **E6** | Formação, Go-live & Entrega | Sistema em produção no número real, equipa autónoma, manual entregue e suporte de 30 dias iniciado. |

> Racional de sequência: E1 habilita tudo; E2 antes de E3 porque o agente escreve no CRM; E3 é o coração do valor e alimenta a validação de 14/07; E4 automatiza sobre dados reais; E5 integra o módulo pronto (paralelizável com E4 após E3); E6 fecha. Compliance NÃO é época final — nasce em E1 (RLS) e E2 (consentimentos no modelo) e completa-se em E4 (rotina).

---

## 6. Detalhe dos Épicos

### Épico 1 — Fundação & Infra-estrutura

Estabelecer a infra-estrutura completa do projecto: Supabase dedicado da GM, codebase Next.js 16 derivado da base ISILDA, autenticação, RLS desde a primeira migração, deploy Vercel e subdomínio. Entrega valor imediato: sistema acessível e seguro onde a equipa já pode entrar.

**Story 1.1 — Setup do projecto e deploy base**
Como equipa Marca Digital, quero o repositório criado a partir da base ISILDA com Supabase dedicado e deploy na Vercel, para ter fundação segura onde construir.
1. Projecto Supabase dedicado criado (plano Pro) com pg_cron activo; repo `SIC-Global-Minds` com Next.js 16 a compilar.
2. Página de health-check pública responde 200 no deploy Vercel.
3. Migração 001 aplica `profiles` + RLS activa (nenhuma tabela sem policy).
4. Referências "Isilda/Delicias" removidas do código e configs (package name, envs, seeds).
5. `.env.example` completo; chaves geridas via tabela `integration_keys` com fallback env.

**Story 1.2 — Autenticação e perfis da equipa**
Como Rinaldo/Ana, quero entrar no sistema com a minha conta e papel (admin/operação), para aceder ao CRM com segurança.
1. Login Supabase Auth funcional no subdomínio; sessão persistente (@supabase/ssr).
2. Tabela `team_members` com papéis; rotas de administração protegidas por guard `requireAdmin`.
3. Utilizadores Rinaldo, Ana, Nelson e Belmiro criados; acesso anónimo bloqueado a todas as rotas de negócio.

**Story 1.3 — Subdomínio, security headers e observabilidade mínima**
Como Global Minds, quero o sistema no meu subdomínio com cabeçalhos de segurança, para que seja meu e seguro.
1. Subdomínio da GM aponta para a Vercel com SSL válido (dependência: pendência 3 do brief).
2. `vercel.json` com CSP, HSTS e X-Frame-Options DENY (padrão SIC-MD).
3. Logs estruturados JSON nas edge functions (`{fn, step, leadId}`); tokens nunca logados.

---

### Épico 2 — CRM Nuclear — Catálogo, Pipeline & Financeiro

Construir o CRM à medida do negócio de consultoria educacional e migrar os dados existentes. No fim deste épico, o indicador de conclusão do diagnóstico já é verdade: "o Rinaldo acompanha todos os leads sem Excel manual".

**Story 2.1 — Modelo de dados nuclear e enums por escrito**
Como equipa técnica, quero o modelo de dados do domínio GM definido e migrado, para que tudo o resto assente em fundações estáveis.
1. Documento de enums/FKs aprovado ANTES das migrações (fases do pipeline, tipos de programa, estados de factura, temperaturas).
2. Migrações criam: `parceiros`, `destinos`, `programas`, `leads` (com BANT/score/temperature/fit), `fichas_estudante` (com `processo_em_curso`), `candidaturas`, `mudancas_estagio`, `consentimentos`.
3. RLS por papel em todas as tabelas; rollback SQL por migração.

**Story 2.2 — Catálogo parceiros → destinos → programas**
Como Ana, quero gerir parceiros, destinos e programas com custos e comissões, para o agente e a equipa citarem informação correcta.
1. CRUD completo dos 3 níveis com faixas de custo + moeda ISO 4217 + % comissão + links de brochuras.
2. Catálogo semeado com os parceiros já enviados (Kaplan, INTO, MPW, Inspired, IH Cape Town, SAMIAD, U. Europeia/IADE/IPAM, GEA, Xior, EDU4WORD).
3. Pesquisa e filtro por destino/tipo de programa.

**Story 2.3 — Pipeline kanban de candidaturas (8 fases)**
Como Rinaldo, quero ver todas as candidaturas num kanban com as minhas 8 fases reais, para saber onde está cada estudante sem perguntar à Ana.
1. Kanban com as 8 fases do processo real, drag-and-drop persistido e Realtime.
2. Tempo em fase visível; candidaturas paradas além do prazo da fase ficam sinalizadas (prazos da Ficha C2).
3. Mudanças de fase registadas em `mudancas_estagio` (timeline auditável).

**Story 2.4 — Ficha de estudante 360º**
Como Ana, quero a ficha completa do estudante num só ecrã, para tratar documentos e processos sem procurar em conversas.
1. Ficha com dados pessoais, encarregado, percurso académico, destino/programa pretendido, orçamento.
2. Checklist documental (passaporte, certificados, comprovativos…) com estado por documento.
3. Timeline unificada: interacções, mudanças de fase, mensagens WhatsApp, (emails em E5).
4. Formulário público (link) que alimenta a ficha directamente.

**Story 2.5 — Importação dos Excels do cliente**
Como Global Minds, quero os meus dados históricos importados, para não começar do zero.
1. Importação dos 3 ficheiros (leads, acompanhamento de estudantes, planilha GEA) com mapeamento documentado e telefones normalizados (`normalizeAngolaPhone`).
2. Registos sem telefone/email válido importados com flag de revisão, nunca descartados silenciosamente.
3. Relatório de importação: total, importados, duplicados unificados, para revisão.

**Story 2.6 — Financeiro: honorários, comissões e facturas**
Como Rinaldo, quero registar honorários e comissões em moeda forte com lembretes de facturas, para controlar o dinheiro do negócio.
1. Registos financeiros por candidatura: honorários + comissões com `currency` ISO 4217 e contravalor AOA à taxa do dia (editável).
2. Facturas com data de vencimento; lembrete automático D-5 (notificação interna; aviso ao cliente via agente em E4).
3. Vista de comissões por parceiro com totais por moeda.

**Story 2.7 — RFV e análise 80/20**
Como Rinaldo, quero ver que clientes e destinos valem mais, para focar a comunicação no que rende.
1. Matriz RFV calculada sobre a carteira importada (recência, frequência, valor).
2. Análise 80/20 de destinos por receita no dashboard.

---

### Épico 3 — Agente IA de Atendimento WhatsApp

O coração do projecto: agente "Assistente Global Minds" no WhatsApp, com o fluxo validado pelo cliente (incl. anotações de 03/07), qualificação, agendamento e supervisão humana. Alimenta a sessão de validação de 14/07.

**Story 3.1 — Canal WhatsApp: instância, webhook e fila robusta**
Como sistema, quero receber e enviar mensagens WhatsApp com idempotência e debounce, para nunca perder nem duplicar conversas.
1. Instância uazapi `SIC-GlobalMinds` ligada (QR na UI) ao número da GM.
2. Webhook valida `x-webhook-token`; `webhook_processed_messages` garante idempotência; mensagens gravadas em `mensagens_whatsapp`.
3. Fila com debounce 10s + claim FOR UPDATE SKIP LOCKED + auto-destrava de locks >3 min.
4. Envio com typing indicator, split ≤300 chars e delays humanizados.

**Story 3.2 — Persona, FAQ e regra de faixas (base de conhecimento)**
Como lead da Global Minds, quero respostas imediatas, correctas e no tom da marca, para confiar no atendimento.
1. Prompt em camadas: identidade GM + contexto do lead + overlay por fase + guards (humanização, brevidade, compliance); data/hora+timezone no topo.
2. As 12 FAQ com respostas oficiais (PT e EN) respondidas a partir da base; pergunta fora da base → escala (nunca inventa).
3. Regra de faixas aplicada: faixas de investimento/custo de vida sim, cotação exacta nunca.
4. Saudação oficial; "você" para encarregados, "tu" para estudante jovem; máx. 1 emoji; nunca se identifica como IA; nunca promete admissão garantida.
5. Anotações do Rinaldo ao fluxo (doc de 03/07) incorporadas e verificadas uma a uma.

**Story 3.3 — Escalação determinística e handoff (regra D5)**
Como Rinaldo, quero que o agente me passe a conversa nos momentos críticos, para nunca deixar a IA falar de dinheiro ou casos graves.
1. Verificação pré-LLM: pedido de humano, urgência, pergunta sem resposta, custos/pagamentos/negociação → transfere.
2. Handoff notifica Rinaldo/Ana por WhatsApp com resumo da conversa e link para o CRM.
3. Conversa transferida fica `transferred`; resposta humana no número pausa o agente (`paused_by_human`).
4. Jailbreak/injecção detectados e neutralizados (suite de safety a passar).

**Story 3.4 — Qualificação BANT e ficha em conversa**
Como Rinaldo, quero leads qualificados com ficha criada automaticamente, para decidir rápido quem merece consulta.
1. Tools de anotação preenchem BANT, destino, nível, orçamento e prazo sem interrogatório (1 pergunta de cada vez).
2. `sales_score` 0–100 + confiança; ≥70 não-baixa → alerta de lead quente; lead movido de fase automaticamente.
3. Ficha de estudante criada/actualizada a partir da conversa (FR6); lead sem objectivos E sem capacidade → porta aberta honesta, não avança.
4. Resposta de continuidade pós-tool (nunca fallback técnico).

**Story 3.5 — Agendamento da Consulta de Orientação**
Como lead qualificado, quero marcar a consulta com o Rinaldo directamente na conversa, para avançar sem esperar.
1. `check_availability` consulta FreeBusy do Google Calendar dentro de janelas fixas acordadas (questão 4 de 14/07) com buffer e fuso explícito.
2. `schedule_consultation` cria o evento, confirma na conversa e regista em `consultations`.
3. Lembrete automático 24h antes via cron; reagendamento pelo mesmo fluxo.

**Story 3.6 — Inbox de supervisão no CRM**
Como Ana, quero ver e assumir qualquer conversa do agente, para garantir qualidade sem sair do CRM.
1. Inbox com lista de conversas (estado do agente visível), chat com histórico completo e painel do contacto.
2. Botão "assumir/devolver ao agente"; envio manual pela mesma instância.
3. Realtime nas mensagens; filtros por estado (activas, transferidas, pausadas).

**Story 3.7 — Rate limits, horário e multilingue**
Como Global Minds, quero o agente com limites explícitos e a falar EN quando preciso, para operar com segurança e servir leads internacionais.
1. Settings de série aplicados e visíveis: 60 msgs/conversa, 50/h, 60/dia, horário 08:00–20:00 com mensagem fora de horas.
2. Lead escreve em inglês → agente responde em inglês nativo (FAQ EN); alternância testada.
3. Suite go-live-readiness a passar; relatório de rate limits no setup.

---

### Épico 4 — Follow-up, Compliance & Dashboard

Automatizar o seguimento (a dor nº1 vista nos chats reais) e cumprir o requisito legal que distingue este cliente. Fecha com o dashboard de gestão.

**Story 4.1 — Cadência de follow-up a leads sem decisão**
Como Rinaldo, quero que nenhum lead fique esquecido, para recuperar 30–50% do que hoje se perde.
1. Cadência editável na UI com templates fixos; cadência inicial conforme decisão de 14/07 (semanal vs 21d/7 toques), com `followup_count` e paragens (resposta, opt-out, fase terminal).
2. Cron diário elegível apenas: fase não-terminal, IA activa, sem outbound nas últimas 24h, sem opt-out.
3. Reactivação automática de leads frios a 90 dias com abordagem de porta aberta.

**Story 4.2 — Ponto de situação proactivo a clientes em processo**
Como encarregado de educação, quero saber o estado do processo sem ter de perseguir o consultor, para ter tranquilidade.
1. Mudança de fase da candidatura dispara mensagem de ponto de situação (template da equipa) via agente.
2. Pedidos pendentes de documentos geram lembrete semanal até resolução.
3. Notificação de risco: candidatura parada além do prazo da fase alerta Rinaldo/Ana.

**Story 4.3 — Lembretes de facturas ao cliente**
Como Rinaldo, quero lembretes automáticos de vencimento aos clientes, para receber a tempo sem cobranças manuais.
1. Factura a vencer em 5 dias → mensagem WhatsApp discreta (tom validado; template fixo).
2. Falta de pagamento à data → notificação interna (não cobra o cliente automaticamente sem aprovação).

**Story 4.4 — Rotina de compliance: retenção de 2 anos**
Como Global Minds, quero que dados de inactivos sejam apagados aos 2 anos automaticamente, para manter a certificação internacional.
1. Rotina pg_cron mensal identifica contactos sem actividade ≥24 meses e sem `processo_em_curso` (definição fixada com o cliente — questão 2) e executa `anonimizar_cliente()` adaptada (inclui `email_sends`/`email_events`/mensagens).
2. Registo auditável de cada execução (quantos anonimizados, quando); simulação (dry-run) demonstrável ao cliente.
3. Clientes em curso intocados até conclusão; teste em staging com dataset sintético.

**Story 4.5 — Consentimentos e exportação de dados**
Como Global Minds, quero consentimentos registados e a base exportável, para provar propriedade e conformidade.
1. `consentimentos` por contacto (fonte, data); campanhas bloqueadas para contactos sem consentimento.
2. Exportação integral CSV/JSON accionável no painel de configurações por admin.
3. Ecrã de compliance: estado da rotina de 2 anos, últimos ciclos, exportações feitas.

**Story 4.6 — Dashboard de gestão**
Como Rinaldo, quero um dashboard com o pulso do negócio, para decidir sem abrir tabelas.
1. KPIs: leads novos/semana, por origem, conversão por fase, tempo médio de resposta, consultas agendadas, leads quentes activos.
2. RFV + 80/20 de destinos (E2.7) integrados; facturas a vencer.
3. Métricas prioritárias do Rinaldo (questão 7 de 14/07) incluídas ou registadas para iteração.

---

### Épico 5 — Marketing & Campanhas (M5)

Integrar o Módulo Marketing & Campanhas (pacote pronto) seguindo o `INSTRUCTIONS_FOR_CLAUDE.md`: backend directo, frontend portado para Next.js. Abre o novo canal de captação activa contratado (+100k Kz).

**Story 5.1 — Backend do módulo: migrações, edges e crons**
Como sistema, quero a infra-estrutura de marketing instalada, para suportar email e campanhas.
1. Auditoria pré-instalação do pacote executada (checklist: single-tenant, `leads`, `team_members`, `whatsapp_instances`; mapeamento de nomes documentado).
2. 8 migrações aplicadas em ordem; 9 edge functions deployadas com `--no-verify-jwt`; crons `email-automation-tick` (1 min) e `campaign-scheduler` (2 min) activos.
3. Singleton `email_config` configurado; RLS endurecida com `requireAdmin` nas rotas service_role.

**Story 5.2 — Email marketing: Resend + editor Maily + tracking**
Como Ana, quero criar e enviar emails bonitos com tracking, para campanhas e sequências profissionais.
1. Domínio da GM verificado no Resend (SPF/DKIM — pendência 8); webhook Svix validado.
2. Editor Maily funcional no Next.js (preview testado cedo — risco React 19); galeria de templates.
3. Campanha de email: audiência por filtros/selecção, envio, tracking completo visível (aberturas/cliques/bounces) no detalhe e na timeline do lead (com HTML real).
4. Link de descadastro em todos os emails; lista de supressão respeitada em qualquer envio futuro.

**Story 5.3 — Campanhas WhatsApp multi-canal com anti-block**
Como Rinaldo, quero campanhas WhatsApp seguras nos dois canais, para captar encarregados e empresas sem arriscar o número.
1. Wizard de 7 passos funcional; dry-run por defeito; confirmação explícita para envio real.
2. Canal uazapi: variações de mensagem, anti-block (45–90s, 40/h, 500/dia, warm-up, cooldown) com health por instância visível.
3. Canal Meta Cloud API: template aprovado obrigatório (bloqueado se PENDING), custo estimado da campanha mostrado antes do envio (NFR8).
4. Respostas a campanhas entram no fluxo do agente (E3) com atribuição configurada.

**Story 5.4 — Templates Meta pela UI**
Como Ana, quero criar templates Meta e acompanhar a aprovação pela UI, para não depender de ninguém técnico.
1. Formulário de criação (categoria, idioma, corpo com variáveis e exemplos) com preview estilo WhatsApp; submissão à Meta pela UI.
2. Sincronização de estado (PENDING/APPROVED/REJECTED) manual e por cron; motivo de rejeição visível.
3. Primeiros templates da GM (apresentação problema→solução para encarregados e empresas) submetidos na Semana 2–3.

**Story 5.5 — Automações visuais (React Flow)**
Como Rinaldo, quero desenhar automações arrastando blocos, para criar sequências sem programador.
1. Editor React Flow portado e funcional; triggers `lead_created`/mudança de fase com filtros.
2. Nós wait/sendEmail/sendWhatsapp/updateField/addTag/branch executados correctamente pelo tick; runs visíveis com estado.
3. 1 automação real da GM activa ponta a ponta como prova (ex.: lead novo do formulário → boas-vindas → wait 2 dias → follow-up).

---

### Épico 6 — Formação, Go-live & Entrega

Transformar sistema pronto em equipa autónoma e projecto entregue, com todas as garantias do brief verificadas.

**Story 6.1 — Testes finais e validação ponta a ponta**
Como equipa MD, quero todas as suites e fluxos E2E verificados, para entregar sem surpresas.
1. Suites safety + go-live-readiness + production-smoke a passar; smoke SIC (4 passos) e smoke do módulo Marketing (guia 04) executados e documentados.
2. Fluxo E2E validado: lead novo → qualificado → ficha → consulta agendada → lembrete → (simulação) proposta → fase avançada.
3. Testes de conversas PT/EN com utilizadores externos (feedback da "pulsação" — tarefa 3.3 do plano) incorporados.

**Story 6.2 — Manual de operações e formação hands-on**
Como Rinaldo/Ana, queremos saber operar tudo sozinhos, para não depender da Marca Digital no dia-a-dia.
1. Manual de operações personalizado GM (CRM, inbox, campanhas, automações, compliance, diagnóstico básico "agente não responde").
2. Sessão de formação onde a Ana constrói 1 campanha real e 1 automação COM o formador (mitigação do risco de adopção — não demonstração passiva).
3. Checklist de autonomia assinada pela equipa.

**Story 6.3 — Go-live em produção**
Como Global Minds, quero o sistema activo no meu número e subdomínio reais, para começar a receber leads de verdade.
1. Agente activo no número real; primeiras conversas reais acompanhadas por Belmiro/Ana (tarefa 4.5 do plano).
2. Rotina de compliance activa e demonstrada; exportação de dados demonstrada.
3. NDA assinado ANTES de dados reais em produção (pendência 1 — bloqueante deste go-live).

**Story 6.4 — Entrega formal e arranque do suporte**
Como Nelson, quero a entrega formalizada com critérios verificados, para iniciar os 30 dias de suporte com âmbito fechado.
1. Os 8 critérios de aceitação do brief (§12) verificados um a um em acta de entrega.
2. Decisão comercial de custos/titularidade (§7.2) formalizada; sessão "30 dias depois" agendada.
3. Backlog de Fase 2 (SIC Completo) registado e entregue ao cliente como proposta de continuidade.

---

## 7. Relatório de Checklist (pm-checklist — auto-avaliação)

| Dimensão | Estado | Nota |
|---|---|---|
| Problema e objectivos fundamentados | ✅ | Evidência primária (chats reais, ficha, acta) via brief v1.2 |
| Âmbito MVP disciplinado | ✅ | Fase 2 explícita e fora dos épicos; scope creep mapeado como risco |
| Requisitos testáveis | ✅ | 26 FR + 12 NFR, cada um verificável |
| Sequência de épicos ágil | ✅ | E1 fundação c/ valor; verticais; compliance transversal (E1→E4), não final |
| Dimensão das stories p/ agente IA | ✅ | 26 stories, cada uma sessão única focada |
| Dependências externas sinalizadas | ✅ | NDA (bloqueia 6.3), subdomínio (1.3), WABA/Resend (5.x), janelas de agenda (3.5) |
| Riscos de qualidade embutidos | ✅ | Suites de teste como NFR7 + story 6.1; preview Maily testado cedo (5.2) |
| **Pendências de decisão do utilizador** | ⚠️ | 8 questões de 14/07 (brief §9) afectam FR15, FR21, FR22, story 3.5 e §7.2 — PRD marca-as inline; actualizar após a sessão |

---

## 8. Próximos Passos

### Prompt para o UX Expert

> Usa `docs/prd/PRD-SIC-GLOBAL-MINDS.md` (secção 3) e a identidade visual da Global Minds (logótipo/cores do cliente) para especificar os 8 ecrãs nucleares do CRM, desktop-first com responsive completo, priorizando o Kanban, a Inbox e a Ficha 360º. A base de componentes é a do codebase ISILDA (Next.js 16 + Tailwind v4); o módulo Marketing traz ecrãs próprios a harmonizar.

### Prompt para o Architect

> Usa `docs/prd/PRD-SIC-GLOBAL-MINDS.md` (secções 2 e 4) + Project Brief §6–8 para produzir a arquitectura: modelo de dados definitivo (enums/FKs por escrito — gate da story 2.1), contratos das edge functions, integração do módulo Marketing (port Vite→Next.js) e plano de migrações com rollback. Restrições fechadas: base ISILDA, Supabase dedicado single-tenant, uazapi + Meta Cloud API, Resend, Haiku 4.5 + Sonnet 4.5, sem n8n. Validar contra as lições codificadas na skill `novo-cliente-sic`.

---

*Marca Digital · Consultoria AI First · Luanda, Angola*
*PRD v1.0 — 10/07/2026 · gerado a partir do Project Brief v1.2 · Confidencial*
