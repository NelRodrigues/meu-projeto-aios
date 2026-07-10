# Análise de Repositório — Twenty CRM (twentyhq/twenty)

**Avaliação de aplicabilidade ao SIC Global Minds e ao ecossistema SIC da Marca Digital**

| Campo | Detalhe |
|---|---|
| **Repositório** | https://github.com/twentyhq/twenty |
| **Posicionamento** | "The open alternative to Salesforce, designed for AI" |
| **Tracção** | 52.7k stars · 7.9k forks · 85 releases · v2.19.0 (Julho 2026) — projecto MUITO activo |
| **Licença** | **AGPL-3.0** (confirmada no package.json raiz) |
| **Analista** | Atlas (@analyst) · 10/07/2026 |
| **Contexto** | Projecto SIC Global Minds em Semana 2 de construção (entrega 29/07); arquitectura v1.0 fechada sobre base ISILDA |

---

## 1. Veredicto executivo

O Twenty é o CRM open-source mais maduro e bem construído do mercado — engenharia de primeira linha. **Mas NÃO deve ser a base do SIC Global Minds.** A razão não é qualidade: é **desalinhamento total de stack, de infra-estrutura, de prazo e de licença** com o nosso contexto. O valor real do Twenty para a Marca Digital está noutro lugar: como **referência de arquitectura para o roadmap SaaS 2027** (metadata engine de objectos customizáveis) e como benchmark de UX de CRM.

**Score de aplicabilidade ao SIC Global Minds: 2/10 · Score de valor estratégico para a MD: 7/10.**

---

## 2. O que é o Twenty — profundidade do stack

### Stack técnico (verificado no repositório)

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend | **NestJS** (Node ^24.5) + **GraphQL** + **BullMQ** (filas) | Servidor persistente + worker separado |
| Base de dados | **PostgreSQL** + **Redis** (cache/filas obrigatório) | Redis é dependência dura |
| Frontend | **React 19** + Jotai (estado) + Linaria (CSS-in-JS) + Lingui (i18n) | SPA própria, não Next.js |
| Monorepo | **Nx 22** + Yarn 4 workspaces — **19 pacotes** | twenty-front, twenty-server, twenty-ui, twenty-sdk, twenty-cli, twenty-claude-skills… |
| Self-hosting | Docker Compose: server + worker + Postgres + Redis · **mín. 2GB RAM** · reverse proxy SSL recomendado | Servidor sempre ligado, não serverless |

### Pontos de engenharia notáveis

1. **Metadata engine** — objectos e campos customizáveis em runtime (o utilizador cria entidades sem código). É a peça mais valiosa do produto: o "CRM que se adapta à medida que a empresa evolui" do enunciado.
2. **Múltiplas views** (tabela/kanban) geradas sobre o metadata engine, workflows visuais, agentes IA nativos (orientados a automação interna do CRM).
3. **Ecossistema developer-first:** SDK, CLI, `create-twenty-app`, Zapier, e um pacote **`twenty-claude-skills`** — sinal claro de aposta em integração com agentes Claude (a acompanhar).
4. Qualidade de processo: 85 releases, e2e testing dedicado, Storybook, i18n de raiz.

---

## 3. Confronto com o SIC Global Minds — matriz de aplicabilidade

| Dimensão | Necessidade do projecto | Twenty | Fit |
|---|---|---|---|
| **Prazo** | Entrega a 29/07 (≈19 dias); arquitectura v1.0 já fechada; E1–E2 prontos a arrancar | Adopção agora = reaprender stack + migrar tudo — mata o cronograma | 🔴 |
| **Stack da casa** | Next.js 16 + Supabase serverless + edge functions; skills e padrões testados em 6 SIC | NestJS + GraphQL + Redis + BullMQ + Nx — **zero sobreposição**; curva de aprendizagem para o Belmiro sem retorno no prazo | 🔴 |
| **Agente WhatsApp (coração do produto)** | uazapi + fila com debounce + qualificação BANT + escalação D5 + tom validado | Não existe. Os "AI agents" do Twenty são de workflow interno, não atendimento WhatsApp Angola. Construir isto dentro do Twenty = desenvolver contra o metadata engine dele | 🔴 |
| **Módulo Marketing (M5)** | Pacote pronto (Resend+Maily+2 canais WhatsApp) desenhado para **Supabase** | Incompatível directamente — as 8 migrações e 9 edges assumem Supabase; portar para NestJS/GraphQL = reescrever | 🔴 |
| **Compliance GM** | Apagamento 2 anos via pg_cron + `anonimizar_cliente()`; base privada exportável | Implementável, mas do zero, dentro dum schema que não controlamos totalmente (metadata engine) | 🟡 |
| **Infra-estrutura em Angola** | Vercel + Supabase geridos (zero servidores); cliente sem equipa técnica | Servidor sempre ligado (Docker, 2GB+ RAM, Redis) = VPS a administrar, backups manuais, superfície de falha com energia/conectividade locais | 🔴 |
| **Custos operacionais** | ~$55–95/mês serverless (§7.2 do brief), dentro do orçamento do cliente | VPS 4GB gerido (~$20–40) **+ gestão humana contínua** — o custo real é o tempo de administração, que a MD paga | 🟡 |
| **Licença / IP** | Sistema proprietário da GM; prompts/fluxos/metodologia = IP da Marca Digital | **AGPL-3.0**: modificações num serviço acessível em rede obrigam a disponibilizar o código-fonte modificado aos utilizadores do serviço. O nosso IP (agente, fluxos, integrações) ficaria contaminado ou teria de viver fora do core | 🔴 |
| **Flexibilidade do modelo de dados** | Parceiros→destinos→programas, comissões multi-moeda — específico mas ESTÁVEL | O metadata engine resolve isto bem — mas nós não precisamos de flexibilidade runtime; precisamos de 7 tabelas bem desenhadas (já desenhadas na arquitectura §2) | 🟡 |

**Conclusão da matriz:** 6×🔴 + 3×🟡 + 0×🟢. O Twenty resolve um problema que não temos (flexibilidade genérica de CRM para equipas técnicas) e não resolve nenhum dos que temos (agente WhatsApp em pt-AO, compliance específico, prazo de 19 dias, operação serverless sem DevOps).

---

## 4. A questão da licença (AGPL-3.0) — nota estratégica

- **Usar sem modificar** (self-host puro): viável e legal.
- **Modificar e servir em rede** (o nosso caso, sempre): o artigo 13 da AGPL obriga a oferecer o código-fonte da versão modificada a todos os utilizadores do serviço. Para um estúdio que vende sistemas personalizados como IP proprietário (SIC), isto é incompatível com o modelo de negócio actual da MD — os nossos prompts, integrações uazapi e módulos teriam de ser publicados se construídos como modificações do core.
- Caminho AGPL-seguro seria construir tudo como **apps externas via API/SDK** — possível, mas então o Twenty vira só "a base de dados com UI", e a Supabase já nos dá isso sem restrição de licença e sem servidor.

---

## 5. Onde o Twenty TEM valor para a Marca Digital

1. **Referência de arquitectura para o SaaS 2027** (roadmap CIS): o metadata engine (objectos/campos customizáveis em runtime) é exactamente o que um "SIC produto" multi-cliente precisaria para parar de clonar repositórios por cliente. Estudar `twenty-server` antes de desenhar esse produto.
2. **Benchmark de UX**: views múltiplas, kanban, command palette — inspiração directa para os ecrãs do CRM (secção 3 do PRD).
3. **`twenty-claude-skills`**: o Twenty está a construir integração nativa com skills Claude — vigiar este pacote; pode informar como expor o SIC a agentes.
4. **Concorrente a conhecer**: quando um cliente ICP-B (Petro, FAS…) perguntar "porquê não usamos um CRM open-source?", a resposta está na matriz da secção 3 — o valor do SIC não é o CRM, é o agente + metodologia + compliance local que nenhum CRM genérico traz.

---

## 6. Recomendação

| # | Recomendação | Prazo |
|---|---|---|
| 1 | **Manter a arquitectura v1.0 (base ISILDA)** para o SIC Global Minds — sem alteração de rumo | Imediato |
| 2 | Registar o Twenty na base de conhecimento da MD como referência para o **SaaS 2027** (metadata engine + twenty-claude-skills) | Backlog estratégico |
| 3 | Usar as views do Twenty como inspiração de UX nos ecrãs Kanban/tabela do CRM GM (sem copiar código — AGPL) | E2 (Semana 2–3) |
| 4 | Reavaliar o Twenty a sério **apenas** quando o objectivo for "produto SIC multi-tenant self-service" — e nesse dia, decidir build-vs-fork com análise de licença dedicada | 2027 |

---

*Fontes: github.com/twentyhq/twenty (README, package.json raiz) · docs.twenty.com (self-hosting) · consultadas a 10/07/2026.*
*Marca Digital · Análise Atlas (@analyst) · Confidencial — uso interno*
