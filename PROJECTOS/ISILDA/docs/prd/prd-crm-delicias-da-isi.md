# CRM Delicias da Isi — Confeitaria Artesanal Inteligente
## Product Requirements Document (PRD)

**Versao:** 1.0
**Data:** 12 de Abril de 2026
**Autor:** Morgan (PM Agent)
**Estado:** Em revisao
**Documentos-fonte:**
- `docs/analise/project-brief-delicias-da-isi.md` (v1.1)
- `docs/analise/relatorio-pesquisa-crm-confeitaria.md` (v1.1)

---

## Change Log

| Data | Versao | Descricao | Autor |
|------|--------|-----------|-------|
| 2026-04-12 | 1.0 | PRD inicial completo — 7 dominios funcionais | Morgan |

---

## 1. Objectivos

1. **Automatizar o atendimento** de clientes da Delicias da Isi via WhatsApp usando agente IA com Claude, incluindo reconhecimento visual de bolos (multi-modal)
2. **Centralizar a gestao de clientes** num CRM com pipeline Kanban de pedidos e historico completo por cliente
3. **Maximizar recompra** atraves de motor automatico por ocasiao (aniversarios, casamentos, festas)
4. **Organizar a producao** com calendario de entregas e alertas de conflito de capacidade
5. **Reduzir sobrecarga operacional** da Isi de ~60% do dia em atendimento para <15%
6. **Escalar o negocio** de ~20-40 pedidos/mes para 60-100 pedidos/mes em 6 meses

---

## 2. Contexto

A Delicias da Isi e uma confeitaria artesanal em Luanda, Angola, operada pela Isilda. O negocio funciona 100% via WhatsApp — desde o primeiro contacto ate a entrega. A Isi acumula sozinha producao, atendimento, divulgacao e vendas, sem qualquer sistema de gestao.

O modelo de negocio vive de **ocasioes recorrentes** (aniversarios, casamentos, mesas infantis). Cada cliente bem gerido pode gerar 3-8 pedidos/ano, mas sem CRM essa receita recorrente escapa. O catálogo actual tem ~30 produtos com precos de 13.500 Kz (bento cake) a 66.500+ Kz (bolo chantilly 20cm), com bolos de casamento sob consulta. Ticket medio estimado: 35.000-45.000 Kz.

A arquitectura reutiliza **85-90% do codigo** dos CRMs Nelma Dias (agente IA WhatsApp) e Elsa Ferreira (CRM leve + catalogo), com UAZAPI para integracao WhatsApp.

---

## 3. Utilizadores-Alvo

### Persona Primaria — Isilda (operadora)
- Mulher, 40-50 anos, Luanda
- Opera do telemovel Android, nao-tecnica
- Tempo e o recurso mais escasso
- Precisa de UX **brutalmente simples** — autonomia apos 2h de treino

### Persona Secundaria — Operadora de apoio (futuro)
- Perfil similar, mobile-first, nao-tecnica
- Acesso limitado (papel assistente)

### Persona Utilizadora Final — Cliente da Isi
- Mulheres 25-50, Luanda
- Procuram bolos para ocasioes especiais (frequencia 3-8x/ano)
- Comunicam por WhatsApp com preferencia por audios e fotos de referencia
- Esperam resposta imediata e atencao personalizada

---

## 4. Requisitos Funcionais

### 4.1 Dominio: Agente IA WhatsApp (D1)

#### 4.1.1 Recepcao e Processamento de Mensagens

- **FR1:** O sistema deve receber mensagens WhatsApp via webhook UAZAPI (Edge Function `uazapi-webhook-receiver`) e responder 200 OK em < 2 segundos
- **FR2:** O sistema deve validar o webhook com token (`x-webhook-token`) guardado em `integration_keys`
- **FR3:** Cada mensagem recebida deve ser verificada por idempotencia (`webhook_processed_messages.whatsapp_message_id`) para evitar processamento duplicado
- **FR4:** O sistema deve normalizar numeros de telefone angolanos (+244) usando a funcao `normalizeAngolaPhone` reutilizada da Elsa
- **FR5:** O sistema deve enfileirar mensagens no PGMQ com debounce configuravel (default 5 segundos) para agrupar mensagens consecutivas do mesmo cliente
- **FR6:** O sistema deve suportar mensagens de texto, imagem (com caption), audio, video, documento, sticker e localizacao

#### 4.1.2 Classificacao de Intencao

- **FR7:** O sistema deve classificar a intencao de cada mensagem usando Claude Haiku 4.5 numa das seguintes categorias:

| Intencao | Descricao | Accao do Bot |
|----------|-----------|--------------|
| SAUDACAO | Cliente cumprimenta | Boas-vindas + apresentacao breve |
| ORCAMENTO | Pede preco ou orcamento | Perguntar detalhes (tamanho, tema, data) + estimar |
| PEDIDO_NOVO | Quer fazer encomenda | Iniciar fluxo de pedido |
| ENTREGA | Pergunta sobre data/modo de entrega | Informar opcoes (retirada/entrega) |
| URGENTE | Precisa para hoje/amanha | Verificar calendario + informar se possivel |
| SABORES | Pergunta sobre sabores/massas/recheios | Listar opcoes disponiveis |
| DISPONIBILIDADE | Pergunta se tem vaga para data X | Consultar `calendario_producao` |
| CATALOGO | Quer ver opcoes/portfolio | Enviar 3 sugestoes do catalogo por categoria |
| REFERENCIA_VISUAL | Envia foto de bolo de referencia | **Activar fluxo multi-modal (Vision)** |
| PAGAMENTO | Envia comprovativo ou pergunta dados | Confirmar ou enviar dados bancarios |
| ESTADO_PEDIDO | Pergunta estado da encomenda | Consultar `pedidos` e informar |
| FALAR_COM_ISI | Quer falar com humano | **ESCALAR -> modo humano** |
| RECLAMACAO | Tom negativo, queixa | **ESCALAR -> modo humano** |
| ELOGIO | Agradecimento, feedback positivo | Agradecer + pedir testemunho/indicacao |
| FORA_CONTEXTO | Assunto nao relacionado | Redirigir para confeitaria |
| PARAR | Opt-out | Respeitar, encerrar conversa |

- **FR8:** Apos classificacao, se a confianca for >= 70% (configuravel), o bot gera e envia resposta automaticamente; caso contrario, escala para humano
- **FR9:** O sistema deve registar metricas de cada processamento: modelo LLM, tokens input/output, latencia em ms, score de confianca, intencao classificada

#### 4.1.3 Geracao de Resposta

- **FR10:** O sistema deve gerar respostas usando Claude Sonnet 4.5 para conversas complexas (orcamentos, objecoes, negociacao) e Claude Haiku 4.5 para respostas simples (saudacoes, confirmacoes, FAQ)
- **FR11:** O system prompt do agente deve incluir:
  - Personalidade: calorosa, profissional, orgulhosa do trabalho artesanal
  - Lingua: portugues de Angola natural
  - Catalogo completo com precos por categoria/tamanho (ver Anexo A do Brief)
  - Regras de negocio: precos base sao para massas e recheios simples; personalizacoes influenciam o valor final
  - Fluxo de pedido: briefing (tema, tamanho, sabores, data, decoracao) -> orcamento -> confirmacao -> pagamento -> producao -> entrega
- **FR12:** As respostas nunca devem conter frases proibidas configuraveis (ex: "barato", "desconto", prometer datas sem verificar calendario)
- **FR13:** O bot so deve responder dentro do horario configurado (default 08:00-20:00 Africa/Luanda); fora do horario, envia mensagem automatica
- **FR14:** O sistema deve enviar typing indicator ("a escrever...") via UAZAPI `/chat/presence` antes de enviar a resposta

#### 4.1.4 Envio de Mensagens

- **FR15:** O sistema deve enviar mensagens de texto via UAZAPI `/send/text` com body `{ number, text }`
- **FR16:** O sistema deve enviar imagens (fotos do portfolio) via UAZAPI `/send/media` com body `{ number, type: "image", file: url, text: caption }`
- **FR17:** O sistema deve autenticar com UAZAPI via header `token` usando chave da `integration_keys`
- **FR18:** O sistema deve receber e processar status de entrega (sent/delivered/read) via webhook `message.ack`

#### 4.1.5 Modos de Conversa

- **FR19:** Cada conversa deve ter um dos tres modos: **bot** (automatico), **humano** (takeover manual), **pausado** (aguarda decisao)
- **FR20:** O sistema deve escalar automaticamente para modo humano quando:
  - Confianca da resposta < 70% (configuravel)
  - Cliente pede para falar com a Isi (intencao FALAR_COM_ISI)
  - Reclamacao ou tom agressivo (intencao RECLAMACAO)
  - 3+ mensagens sem resolver a duvida
  - Negociacao de preco complexa (bolos sob consulta)
- **FR21:** Ao escalar, o bot deve enviar: "Vou pedir a Isi para falar consigo directamente. Um momento!"
- **FR22:** O utilizador deve poder "assumir" uma conversa (bot -> humano) e "devolver ao bot" (humano -> bot)
- **FR23:** Quando a Isi envia mensagem manual, o modo deve mudar automaticamente para humano (`auto_pause_after_human_reply`)

---

### 4.2 Dominio: Visao Multi-Modal (D2)

- **FR24:** Quando o cliente envia imagem no WhatsApp, o sistema deve:
  1. Descarregar a imagem via `media_url` do payload UAZAPI
  2. Guardar em Supabase Storage + optimizar (resize max 1024px, compressao)
  3. Chamar Claude Sonnet 4.5 Vision para analise: estilo, tema, complexidade (1-5), tamanho estimado, elementos-chave, cores dominantes
  4. Gerar embedding da descricao textual (pgvector)
  5. Fazer similarity search em `referencias_visuais`: `ORDER BY embedding <=> $query LIMIT 3`
  6. Calcular orcamento dinamico baseado em: complexidade detectada, tamanho, data de entrega, disponibilidade
  7. Responder ao cliente com 3 referencias do portfolio + orcamento estimado
- **FR25:** O sistema deve permitir iteracao conversacional apos analise visual ("mais pequeno", "sem flores", "com cores da Frozen")
- **FR26:** Se nao houver referencias similares no portfolio, o bot deve informar que e um design personalizado e pedir mais detalhes
- **FR27:** Fotos de baixa qualidade devem gerar fallback textual: "Nao consegui ver bem a foto. Pode descrever o bolo que imagina?"

---

### 4.3 Dominio: Catalogo Visual + Portfolio (D3)

- **FR28:** O sistema deve manter um catalogo de produtos com campos: nome, descricao, tags[], categoria, fotos (urls), preco_base por tamanho, tempo_producao_horas, complexidade (1-5), activo (bool)
- **FR29:** Cada produto deve poder ter multiplos tamanhos com precos diferentes (ex: chantilly 14cm=42.000, 16cm=49.500, 18cm=58.500, 20cm=66.500)
- **FR30:** O upload de foto deve gerar automaticamente embedding via pgvector para busca por similaridade
- **FR31:** O catalogo deve ter vista galeria mobile-first com filtros por categoria: Chantilly, Bento Cake, Especiais, Naked/Vintage, Doces, Casamento
- **FR32:** O sistema deve importar o catalogo inicial a partir dos dados do Anexo A do Project Brief (30 produtos com precos)

#### Catalogo Inicial (dados reais)

As categorias sao:
1. **Bolos Chantilly** — 4 tamanhos (10-20cm), 13.500-66.500 Kz
2. **Bento Cakes** — 7 variantes, 15.500-31.500 Kz
3. **Bolos Especiais** — Red Velvet, Cenoura, Nordico, Chocolate, 24.000-42.000 Kz
4. **Naked/Vintage** — a partir de 37.500-42.000 Kz
5. **Doces** — Cupcakes (3.000/un), Donuts (18.500/duzia), Bolachas (15.000/6un)
6. **Casamento/Eventos** — sob consulta

---

### 4.4 Dominio: Gestao de Pedidos + Calendario de Producao (D4)

#### 4.4.1 Pedidos

- **FR33:** Cada pedido deve conter: cliente_id, produto(s), tema/descricao, tamanho, sabores (massa + recheio), decoracao, data_entrega, hora_entrega, modo_entrega (retirada/entrega), endereco_entrega, valor_total, estado, notas, imagem_referencia
- **FR34:** Os estados do pedido devem ser: `novo` -> `orcamento` -> `confirmado` -> `pago` -> `em_producao` -> `pronto` -> `entregue` -> `cancelado`
- **FR35:** Cada mudanca de estado deve ser registada com timestamp e autor (bot/humano)
- **FR36:** O pipeline Kanban de pedidos deve ter colunas por estado com cards arrastaveis (drag-and-drop com @dnd-kit)
- **FR37:** Cada card deve mostrar: nome do cliente, produto resumido, data de entrega, valor, e badge de urgencia (se entrega < 48h)
- **FR38:** O bot deve poder criar pedidos automaticamente a partir da conversa WhatsApp quando o cliente confirma

#### 4.4.2 Calendario de Producao

- **FR39:** O sistema deve apresentar calendario mensal de entregas com vista por dia
- **FR40:** Cada dia deve mostrar os pedidos agendados e a capacidade restante
- **FR41:** Capacidade maxima por dia deve ser configuravel (default: 3 bolos/dia para a Isi)
- **FR42:** Quando um pedido e agendado para um dia que ja esta em capacidade maxima, o sistema deve alertar: "Ja tens {N} bolos para {data}. Este seria o {N+1}o — queres aceitar?"
- **FR43:** O bot deve consultar o calendario antes de confirmar datas ao cliente: "Para {data} tenho disponibilidade" ou "Para {data} ja estou completa. O proximo dia disponivel e {data+1}"

---

### 4.5 Dominio: Base de Clientes + Motor de Recompra (D5)

#### 4.5.1 Base de Clientes

- **FR44:** Cada cliente deve ter: nome, telefone (unico), whatsapp_id, email, endereco, bairro, historico_pedidos, total_gasto (LTV), ultima_compra, ocasioes[], notas, etiquetas[], origem (instagram/tiktok/indicacao/whatsapp), data_criacao
- **FR45:** Clientes devem ser criados automaticamente via webhook UAZAPI quando contactam pela primeira vez (reutilizar logica da Elsa)
- **FR46:** O sistema deve detectar o nome do perfil WhatsApp (`senderName`) e preencher automaticamente
- **FR47:** O sistema deve permitir importacao manual de contactos existentes via CSV
- **FR48:** A ficha do cliente deve mostrar: dados pessoais, historico de pedidos (timeline), ocasioes registadas, LTV, conversas WhatsApp, e notas

#### 4.5.2 Motor de Recompra por Ocasiao

- **FR49:** O sistema deve permitir registar ocasioes do cliente: tipo (aniversario_proprio, aniversario_filho, aniversario_familiar, casamento, batizado, formatura, natal, outro), data_evento (MM-DD), nome_pessoa, notas
- **FR50:** O bot deve perguntar naturalmente durante a conversa: "E para aniversario de quem? Quer que eu guarde para lembrar no proximo ano?"
- **FR51:** Um cron diario (pg_cron) deve detectar ocasioes a 25-35 dias e criar accoes automaticas:
  1. Gerar mensagem personalizada com Claude Sonnet referenciando o pedido anterior
  2. Enviar via UAZAPI
  3. Criar lead quente no pipeline
  4. Marcar `ultimo_lembrete_enviado`
- **FR52:** O sistema nao deve enviar lembrete se ja enviou nos ultimos 300 dias para a mesma ocasiao
- **FR53:** O motor deve respeitar o horario configurado e limites de envio diario

---

### 4.6 Dominio: Inbox em Tempo Real (D6)

- **FR54:** O inbox deve ter 3 paineis: lista de conversas (esquerda), area de chat (centro), dados do cliente (direita)
- **FR55:** A lista de conversas deve mostrar: nome do cliente, ultima mensagem (truncada), timestamp, badge de modo (bot/humano/pausado), indicador de pedido activo
- **FR56:** O utilizador deve poder filtrar conversas por: Todas, Modo Bot, Modo Humano, Pendentes, Com Pedido Activo
- **FR57:** A area de chat deve mostrar mensagens em bolhas com cor diferente por remetente: cliente (cinza), bot (cor primaria), humano (azul)
- **FR58:** Imagens recebidas devem aparecer como thumbnails clicaveis na conversa
- **FR59:** O utilizador deve poder enviar mensagens manuais, imagens e seleccionar templates rapidos
- **FR60:** O chat deve actualizar em tempo real via Supabase Realtime (< 1 segundo de latencia)
- **FR61:** O sidebar direito deve mostrar: ficha resumida do cliente, pedido activo (se existir), ocasioes registadas, LTV, e botoes de accao (criar pedido, registar ocasiao)
- **FR62:** Botoes de accao no chat: "Assumir Conversa", "Devolver ao Bot", "Criar Pedido", "Ver Calendario"

---

### 4.7 Dominio: Pagamentos (D7)

- **FR63:** O bot deve enviar dados bancarios quando o cliente confirma interesse: numero de conta, titular, banco, referencia Multicaixa Express
- **FR64:** O sistema deve aceitar upload de comprovativo via WhatsApp (imagem)
- **FR65:** O inbox deve ter botao "Confirmar Pagamento" que: muda o estado do pedido para `pago`, regista na tabela `pagamentos` (valor, metodo, comprovativo_url, confirmado_por), e envia mensagem de confirmacao ao cliente
- **FR66:** A tabela `pagamentos` deve registar: pedido_id, cliente_id, valor, metodo (transferencia/multicaixa_express/numerario), comprovativo_url, estado (pendente/confirmado/rejeitado), confirmado_por, data

---

### 4.8 Dominio: Dashboard Operacional (D8)

- **FR67:** O dashboard deve mostrar KPIs em tempo real:
  - Pedidos do dia / semana / mes
  - Receita do mes (valor total de pedidos pagos)
  - Ticket medio
  - Taxa de conversao (orcamento -> pago)
  - Taxa de automacao do bot (%)
  - Pedidos pendentes de pagamento
  - Entregas de hoje/amanha
- **FR68:** O dashboard deve mostrar graficos: pedidos por semana (barras), receita mensal (linha), distribuicao por categoria (pie)
- **FR69:** Seccao "Accoes Urgentes": pagamentos pendentes > 48h, entregas de hoje sem confirmacao, conversas pendentes de humano

---

### 4.9 Dominio: Checklist Diaria (D9)

- **FR70:** O sistema deve apresentar checklist diaria com tarefas pre-configuradas:
  - Verificar mensagens pendentes no inbox
  - Confirmar entregas de hoje
  - Verificar pagamentos pendentes
  - Actualizar estados dos pedidos em producao
  - Publicar conteudo nas redes (lembrete)
- **FR71:** O estado da checklist deve persistir por dia e resetar automaticamente ao dia seguinte
- **FR72:** A checklist deve ser acessivel no ecra principal (dashboard ou sidebar)

---

## 5. Requisitos Nao-Funcionais

| # | Requisito | Target |
|---|---|---|
| NFR1 | **Mobile-first** — Isi opera do telemovel Android | 100% das funcionalidades criticas acessiveis em ecra mobile; PWA com service worker |
| NFR2 | **UX para nao-tecnicos** — curva de aprendizagem | Autonomia apos 2h de treino presencial |
| NFR3 | **Performance em 4G angolano instavel** | Tempo de carregamento < 3s em 4G medio; cache agressivo; loading progressivo |
| NFR4 | **Tolerancia a latencia de rede** | Fila PGMQ absorve picos; UI optimista |
| NFR5 | **Portugues de Angola natural** | Validacao humana de 50 respostas antes do go-live |
| NFR6 | **Moeda Kz** (AOA) formatada `pt-AO` | Em todos os valores do sistema |
| NFR7 | **Fuso horario Africa/Luanda** (WAT, UTC+1) | Em todos os timestamps e logica de horario |
| NFR8 | **Custo operacional mensal** | < $200/mes (~$120-170 esperado) |
| NFR9 | **Tempo de resposta do bot** | < 30 segundos da mensagem recebida a resposta enviada |
| NFR10 | **Taxa de automacao** | > 70% das conversas resolvidas pelo bot sem humano |
| NFR11 | **Row-Level Security** | RLS em todas as tabelas Supabase |
| NFR12 | **Optimizacao de imagens** | Resize max 1024px antes de enviar para Claude Vision |
| NFR13 | **Compliance RGPD** | Consentimento no primeiro contacto + opt-out + retencao definida |
| NFR14 | **Realtime** | Chat e notificacoes via Supabase Realtime (< 1s latencia) |
| NFR15 | **Webhook UAZAPI** | Resposta 200 OK em < 2 segundos |

---

## 6. Design de Interface

### 6.1 Visao UX

Interface profissional, limpa e acolhedora. Paleta quente (tons de rosa/dourado que remetem a confeitaria artesanal) com acentos de cor primaria. Mobile-first — todo o design parte do ecra Android da Isi.

### 6.2 Ecras Principais

| # | Ecra | Descricao | Prioridade |
|---|------|-----------|------------|
| E1 | Inbox WhatsApp | Hub central — conversas + chat + dados cliente + accoes | P0 |
| E2 | Pipeline Kanban | Board de pedidos (novo -> entregue) com drag-and-drop | P0 |
| E3 | Calendario Producao | Vista mensal de entregas + capacidade + alertas | P0 |
| E4 | Clientes | Lista com historico, ocasioes, LTV | P0 |
| E5 | Catalogo/Portfolio | Galeria visual com precos e gestao | P1 |
| E6 | Dashboard | KPIs, graficos, accoes urgentes | P1 |
| E7 | Checklist Diaria | Tarefas operacionais da Isi | P1 |
| E8 | Configuracoes Agente | System prompt, guardrails, horario | P1 |
| E9 | Analytics IA | Metricas do bot, tokens, latencia | P2 |
| E10 | Templates WhatsApp | Biblioteca de mensagens rapidas | P2 |

### 6.3 Plataforma

PWA (Progressive Web App) optimizada para Android. Desktop como secundario (quando a Isi estiver num computador).

---

## 7. Arquitectura Tecnica

### 7.1 Stack

| Camada | Tecnologia | Justificacao |
|--------|-----------|--------------|
| Frontend | Next.js 16 (App Router) | SSR, React ecosystem, reutilizacao Nelma/Elsa |
| Styling | Tailwind CSS v4 | Utility-first, v4 com @import syntax |
| UI Components | Manuais (shadcn-style) | Controlo total |
| Drag-and-Drop | @dnd-kit | Leve, acessivel |
| Graficos | Recharts | React-based |
| Base de Dados | Supabase (PostgreSQL + pgvector) | Auth + Realtime + RLS + Edge Functions + vectors |
| Realtime | Supabase Realtime (WebSocket) | Push updates para inbox e notificacoes |
| Fila | PGMQ (Supabase) | Processamento assincrono com debounce |
| LLM Classificacao | Claude Haiku 4.5 | Rapido e barato (~200 tokens/classificacao) |
| LLM Respostas | Claude Sonnet 4.5 | Qualidade alta para respostas + Vision |
| WhatsApp | **UAZAPI** (uazapi.dev) | API nao-oficial comprovada em Nelma + Elsa |
| Hosting | Vercel | Deploy automatico |

### 7.2 Schema de Base de Dados

#### Tabelas reutilizadas do Nelma/Elsa (14)

1. `profiles` — utilizadores do sistema
2. `clientes` (adaptado de `leads`/`contacts`) — base de clientes
3. `interacoes` — historico por cliente
4. `mudancas_estagio` — audit trail
5. `conversas_whatsapp` — estado de cada conversa
6. `mensagens_whatsapp` — historico de mensagens
7. `notificacoes` — alertas para Isi
8. `templates_whatsapp` — respostas rapidas
9. `consentimentos` — RGPD
10. `integration_keys` — chaves UAZAPI, Anthropic, etc.
11. `ai_sales_agents` — configuracao do agente IA
12. `ai_agent_conversations` — conversas do agente por cliente
13. `ai_agent_message_queue` — fila com debounce
14. `webhook_processed_messages` — idempotencia

#### Tabelas NOVAS especificas da Isi (8)

15. **`produtos_catalogo`** — catalogo de bolos/doces

```sql
CREATE TABLE produtos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL, -- chantilly, bento_cake, especial, naked_vintage, doces, casamento
  tags TEXT[] DEFAULT '{}',
  fotos TEXT[] DEFAULT '{}', -- URLs Supabase Storage
  preco_base NUMERIC, -- preco minimo (pode ser NULL se sob consulta)
  precos_por_tamanho JSONB DEFAULT '{}', -- {"10cm": 13500, "14cm": 42000, ...}
  tempo_producao_horas INTEGER,
  complexidade INTEGER DEFAULT 3 CHECK (complexidade BETWEEN 1 AND 5),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

16. **`referencias_visuais`** — portfolio com embeddings (pgvector)

```sql
CREATE TABLE referencias_visuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos_catalogo(id),
  titulo TEXT,
  descricao_visual TEXT, -- descricao gerada pelo Claude Vision
  tags TEXT[] DEFAULT '{}',
  categoria TEXT,
  url_imagem TEXT NOT NULL,
  embedding vector(1024), -- pgvector para similarity search
  complexidade INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

17. **`pedidos`** — encomendas

```sql
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos_catalogo(id),
  descricao TEXT, -- descricao livre do pedido
  tema TEXT,
  tamanho TEXT, -- "14cm", "16cm", etc.
  sabor_massa TEXT,
  sabor_recheio TEXT,
  decoracao TEXT,
  imagem_referencia TEXT, -- URL da foto enviada pelo cliente
  data_entrega DATE NOT NULL,
  hora_entrega TIME,
  modo_entrega TEXT DEFAULT 'retirada' CHECK (modo_entrega IN ('retirada', 'entrega')),
  endereco_entrega TEXT,
  valor_orcamento NUMERIC,
  valor_final NUMERIC,
  estado TEXT DEFAULT 'novo' CHECK (estado IN ('novo', 'orcamento', 'confirmado', 'pago', 'em_producao', 'pronto', 'entregue', 'cancelado')),
  notas TEXT,
  conversa_id UUID REFERENCES conversas_whatsapp(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

18. **`ocasioes_cliente`** — motor de recompra

```sql
CREATE TABLE ocasioes_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- aniversario_proprio, aniversario_filho, casamento, batizado, formatura, natal, outro
  nome_pessoa TEXT, -- "Maria", "Joao Jr.", etc.
  data_evento TEXT NOT NULL, -- formato "MM-DD" (repete anualmente)
  ano_especifico INTEGER, -- NULL se recorrente, ano se one-off
  notas TEXT,
  ultimo_lembrete_enviado DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

19. **`calendario_producao`** — capacidade diaria

```sql
CREATE TABLE calendario_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  capacidade_maxima INTEGER DEFAULT 3,
  pedidos_agendados INTEGER DEFAULT 0,
  notas TEXT,
  bloqueado BOOLEAN DEFAULT false, -- dia de folga ou feriado
  created_at TIMESTAMPTZ DEFAULT now()
);
```

20. **`pagamentos`** — registo de pagamentos

```sql
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  valor NUMERIC NOT NULL,
  metodo TEXT DEFAULT 'transferencia' CHECK (metodo IN ('transferencia', 'multicaixa_express', 'numerario')),
  comprovativo_url TEXT,
  estado TEXT DEFAULT 'pendente' CHECK (estado IN ('pendente', 'confirmado', 'rejeitado')),
  confirmado_por UUID REFERENCES profiles(id),
  confirmado_at TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

21. **`indicacoes`** — programa de referral

```sql
CREATE TABLE indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_origem_id UUID REFERENCES clientes(id),
  cliente_indicado_id UUID REFERENCES clientes(id),
  pedido_resultante_id UUID REFERENCES pedidos(id),
  estado TEXT DEFAULT 'pendente' CHECK (estado IN ('pendente', 'convertido', 'expirado')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

22. **`checklist_tasks`** + **`checklist_completions`** — rotina diaria

```sql
CREATE TABLE checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true
);

CREATE TABLE checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES checklist_tasks(id),
  data DATE NOT NULL,
  completado BOOLEAN DEFAULT false,
  completado_at TIMESTAMPTZ,
  UNIQUE(task_id, data)
);
```

### 7.3 Edge Functions (Supabase)

| Funcao | Reutilizada de | Adaptacao |
|--------|---------------|-----------|
| `uazapi-webhook-receiver` | Elsa | Adaptar para `clientes` em vez de `contacts`; adicionar deteccao de imagem para fluxo Vision |
| `uazapi-send-message` | Elsa | Reutilizar directamente |
| `ai-sales-agent` | Nelma | Adaptar system prompt, intencoes, e fluxo de pedido |
| `process-vision` | **NOVO** | Pipeline: download imagem -> resize -> Claude Vision -> embedding -> similarity search -> resposta |
| `recompra-cron` | **NOVO** | Cron diario: detectar ocasioes -> gerar mensagem -> enviar -> registar |

### 7.4 Fluxo de Dados

```
CLIENTE ENVIA WHATSAPP
        |
        v
UAZAPI -> webhook -> Next.js proxy (/api/webhooks/uazapi)
        |
        v
Edge Function: uazapi-webhook-receiver
  - Valida token
  - Idempotencia check
  - Normaliza telefone (+244)
  - Encontra/cria cliente
  - Cria/reactiva conversa IA
  - Guarda mensagem (texto + media)
  - Trigger: enfileira no PGMQ (debounce 5s)
        |
        v
Edge Function: ai-sales-agent (process_queue)
  - Claim mensagens pendentes
  - Verificar modo (bot/humano/pausado)
  - Se imagem: chamar process-vision
  - Classificar intencao (Haiku)
  - Gerar resposta (Sonnet/Haiku)
  - Verificar guardrails
  - Enviar via uazapi-send-message
  - Actualizar conversa + pipeline
        |
        v
CRM ACTUALIZADO EM TEMPO REAL (Supabase Realtime)
```

---

## 8. Metricas de Sucesso

| Metrica | Baseline | Target 90 dias | Target 180 dias |
|---|---|---|---|
| Pedidos/mes | ~20-40 (estimado) | 60 | 100 |
| Taxa de resposta < 5 min | ~30% | 95% | 98% |
| Lead -> pedido | Desconhecida | 25% | 35% |
| Recompra por ocasiao | ~10% | 30% | 50% |
| Ticket medio | ~35.000-45.000 Kz | +15% | +25% |
| Taxa de automacao bot | 0% | 70% | 80% |
| Tempo Isi em atendimento | ~60% do dia | 20% | <15% |
| Indicacoes rastreadas | 0 | 5/mes | 15/mes |
| Satisfacao (reclamacoes) | -- | <5%/mes | <3%/mes |

---

## 9. Fora do Ambito (MVP)

- Integracao de pagamento online (EMIS/GPO) — usar confirmacao manual
- App nativa iOS/Android — usar PWA
- E-commerce com carrinho publico
- Email marketing automatizado
- Landing pages de venda
- Booking publico com calendario aberto ao cliente
- Gestao de estoque de ingredientes + precificacao por ficha tecnica (fase 2)
- Multi-tenant SaaS para outras confeitarias (fase 3)
- Gestao de funcionarios e folha de pagamento
- OCR automatico de comprovativos de pagamento
- Transcricao de audios via Whisper (fase 2)

---

## 10. Roadmap de Implementacao

| Fase | Duracao | Dominios | Entregaveis |
|------|---------|----------|-------------|
| **1. Fundacao CRM + Bot Base** | 2 sem | D1, D5.1, D6 | Schema + UAZAPI + webhook + agente IA core + inbox basico + clientes auto-criados |
| **2. Catalogo + Pedidos + Calendario** | 1-2 sem | D3, D4 | Catalogo com 30 produtos, pipeline Kanban de pedidos, calendario producao, alertas conflito |
| **3. Visao Multi-Modal + Orcamento** | 1 sem | D2 | Claude Vision + pgvector + similarity search + orcamento dinamico |
| **4. Recompra por Ocasiao** | 1 sem | D5.2 | pg_cron + motor recompra + mensagens personalizadas |
| **5. Pagamentos + Dashboard + Polish** | 3-5 dias | D7, D8, D9 | Comprovativos, dashboard KPIs, checklist, RGPD, testes, go-live |

**Total:** 4-6 semanas de desenvolvimento concentrado.

---

## 11. Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Qualidade de reconhecimento visual em fotos de baixa qualidade | Media | Alto | UX guia cliente + fallback textual |
| Volume excede capacidade de producao | Alta | Alto | Calendario com capacidade maxima + alertas |
| Isi nao adopta por complexidade | Media | Critico | UX extremamente simples + treino 2h + checklist |
| Custo Claude Vision escala | Media | Medio | Cache embeddings, usar Vision apenas quando imagem recebida |
| UAZAPI desconecta | Media | Alto | Monitorizacao de conexao + reconexao + alerta |
| Internet angolana instavel | Alta | Baixo | Fila PGMQ + cache + PWA service worker |

---

## 12. Compliance RGPD

- **Consentimento:** Bot pede consentimento no primeiro contacto antes de processar dados
- **Opt-out:** Responder "PARAR" encerra a conversa e bloqueia envios futuros
- **Retencao:** Mensagens 2 anos (depois anonimizadas); dados cliente ate pedido de eliminacao; logs 5 anos
- **Anonimizacao:** Funcao SQL `anonimizar_cliente(cliente_id)` que remove dados pessoais mantendo metricas agregadas
- **Consentimentos:** Tabela `consentimentos` com tipo, estado, metodo, prova, timestamp

---

## 13. Custos Operacionais Estimados

| Componente | Custo/mes | Notas |
|---|---|---|
| Supabase Pro | $25 | DB + Auth + Realtime + Edge Functions + pgvector |
| Vercel Pro | $20 | Frontend + deploys |
| UAZAPI | $20-30 | Instancia WhatsApp (custo fixo) |
| Claude Haiku 4.5 | $15-30 | Classificacao (~20K chamadas/mes) |
| Claude Sonnet 4.5 + Vision | $40-80 | Respostas + analise visual |
| Supabase Storage | $5 | Fotos do portfolio |
| **TOTAL** | **$125-190/mes** | **~115.000-175.000 Kz/mes** |

**ROI:** Com ticket medio de ~40.000 Kz, o sistema paga-se com **3-5 pedidos extra por mes**.

---

## 14. Handoff

### Para @architect (Aria)
1. Validar schema SQL (22 tabelas) e estrategia pgvector
2. Definir pipeline de processamento de imagens (Vision)
3. Planear Edge Functions e cron jobs

### Para @po (Pax) / @sm (River)
1. Criar epics e stories por dominio (D1-D9)
2. Priorizar por fase do roadmap

### Para @dev
1. Fork/adaptar codigo Nelma + Elsa
2. Seguir stories do @sm

---

*-- Morgan, planejando o futuro*
*PRD v1.0 — Delicias da Isi CRM Inteligente*
*Marca Digital · Abril 2026*
