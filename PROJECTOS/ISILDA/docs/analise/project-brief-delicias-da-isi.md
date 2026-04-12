# Project Brief — Delícias da Isi
## CRM Inteligente para Confeitaria Artesanal (Angola)

**Versão:** 1.1
**Data:** 12 de Abril de 2026
**Autor:** Atlas (Analyst Agent)
**Destinatário:** @pm (Morgan) — para construção do PRD
**Documento-fonte:** `docs/analise/relatorio-pesquisa-crm-confeitaria.md`

---

## 1. Visão do Projecto

Construir um **CRM inteligente vertical para confeitaria artesanal** com agente IA multi-modal no WhatsApp, que transforma a **Delícias da Isi** — actualmente uma operação 100% manual — num negócio escalável com clientes vitalícios, recompra automatizada e operação de baixa fricção.

**Tagline interna:** "O primeiro CRM com IA visual para confeitarias em Angola."

---

## 2. Problema

A Isilda (empresária da Delícias da Isi) enfrenta cinco dores estruturais que limitam o crescimento:

1. **Perda de memória do cliente** — cada venda parece nova porque não há base de dados; a recompra não é sistemática
2. **Sobrecarga operacional** — acumula produção + atendimento + divulgação + vendas sozinha
3. **Desorganização de pedidos** — sem calendário de produção, risco de falhar entregas
4. **Zero qualificação de leads** — todos recebem o mesmo tempo, curiosos consomem energia
5. **Conteúdo inconsistente** — afecta o fluxo contínuo de aquisição

O mercado vive de **ocasiões recorrentes** (aniversários, casamentos, festas infantis) — cada cliente bem gerido pode gerar 3-8 pedidos/ano, mas actualmente quase toda essa receita está a escapar.

---

## 3. Proposta de Valor

| Para quem | O que | Como |
|---|---|---|
| **Isilda (operação)** | Automação do atendimento e vendas | Agente IA WhatsApp qualifica, orça, agenda e escala para humano só quando necessário |
| **Isilda (crescimento)** | Clientes vitalícios em vez de compradores únicos | Motor de recompra automática por ocasião (aniversários anuais, festas familiares) |
| **Isilda (eficiência)** | Fim do caos de pedidos | Calendário de produção com alertas de conflito |
| **Cliente final** | Experiência premium e instantânea | Envia foto de referência → recebe 3 inspirações do portfólio + preço em segundos |
| **Marca Digital** | Produto escalável e replicável | Arquitectura reutilizável para outras confeitarias angolanas (fase 3) |

---

## 4. Utilizadores-Alvo

### Persona Primária — Isilda (40-50 anos, Luanda)
- Empresária artesanal, mulher, alto comprometimento com qualidade
- Fluente em português de Angola, opera primariamente do telemóvel Android
- Não-técnica — qualquer sistema precisa de ser **brutalmente simples**
- Tempo é o recurso mais escasso

### Persona Secundária — Operadora de apoio (futuro)
- Auxiliar a contratar quando o volume crescer
- Perfil similar (não-técnica, mobile-first)

### Persona Utilizadora Final — Cliente da Isi (mulheres 25-50, Luanda)
- Mães, esposas, profissionais
- Procuram bolos para ocasiões especiais (frequência 3-8× por ano)
- Comunicam por WhatsApp com preferência por áudios e fotos de referência
- Esperam resposta imediata e atenção personalizada

---

## 5. Requisitos Funcionais (Must-Have para MVP)

### 5.1 Agente IA WhatsApp Conversacional (🔴 P0)
- Receber mensagens via **UAZAPI** (API não-oficial WhatsApp, já comprovada nos CRMs Nelma e Elsa)
- Webhook receiver reutilizado do projecto Elsa (Edge Function `uazapi-webhook-receiver`)
- Cliente UAZAPI reutilizado (`uazapi-client.ts` — envio de texto, media, typing indicator)
- Classificar intenção (nova tabela de 14-16 intenções específicas para confeitaria: ORCAMENTO, ENTREGA, URGENTE, RECEITA, PRECO, SABORES, DISPONIBILIDADE, etc.)
- Gerar resposta em português de Angola natural
- Escalar para humano quando confiança < 70% ou cliente pedir
- Três modos: bot / humano / pausado
- Respeitar horário configurável (default 08:00-20:00 Africa/Luanda)
- Guardrails: frases proibidas, consentimento RGPD, opt-out

### 5.2 Visão Multi-Modal (🔴 P0 — o diferencial)
- Receber imagem do cliente via WhatsApp
- Analisar com Claude Sonnet Vision: estilo, tema, complexidade (1-5), tamanho estimado, elementos-chave
- Busca por similaridade em portfólio próprio (pgvector)
- Devolver 3 referências visuais do catálogo + orçamento estimado
- Permitir iteração conversacional ("mais pequeno", "sem flores", "com cores da Frozen")

### 5.3 Catálogo Visual + Portfólio (🔴 P0)
- Cadastro de bolos/doces com: nome, descrição, tags, fotos, preço base, tempo de produção, complexidade
- Geração automática de embeddings (pgvector) no upload
- Vista galeria mobile-first

### 5.4 Gestão de Pedidos + Calendário de Produção (🔴 P0)
- Estados: novo → orçamento → confirmado → pago → em_producao → pronto → entregue
- Calendário mensal de entregas com capacidade máxima por dia
- Alerta de conflito: "Já tens 3 bolos nesse sábado, este é o 4º — queres aceitar?"
- Vista Kanban para operação visual

### 5.5 Base de Clientes com Histórico (🔴 P0)
- Ficha do cliente: contactos, histórico de pedidos, ocasiões importantes, LTV, notas
- Criação automática via WhatsApp (por telefone)
- Importação manual de contactos existentes (CSV)

### 5.6 Motor de Recompra por Ocasião (🔴 P0 — o diferencial)
- Registar ocasiões do cliente (aniversários próprios + familiares + datas comemorativas)
- Bot pergunta naturalmente: "É para aniversário de quem? Quer que eu guarde para lembrar?"
- Cron diário (pg_cron) detecta ocasiões a 25-35 dias
- Envio automático de mensagem personalizada com referência ao pedido anterior
- Criação automática de lead quente no pipeline

### 5.7 Inbox em Tempo Real (🔴 P0)
- Lista de conversas com filtros (todas, bot, humano, pendentes)
- Chat com histórico (bolhas por remetente)
- Takeover manual e automático
- Templates rápidos
- Supabase Realtime para actualização instantânea

### 5.8 Pagamentos (🟡 P1)
- Upload de comprovativo (foto) via WhatsApp
- Botão "confirmar pagamento" no inbox (fluxo manual no MVP)
- Registo em tabela `pagamentos`
- **Fase 2:** integração IZI Pay para referências Multicaixa automáticas

### 5.9 Dashboard Operacional (🟡 P1)
- KPIs: pedidos do dia/semana/mês, receita, ticket médio, taxa de conversão
- Acções urgentes: pagamentos pendentes, entregas de hoje, follow-ups
- Gráficos de tendência (Recharts)

### 5.10 Checklist Diária (🟡 P1)
- Tarefas diárias pré-configuradas (verificar mensagens, confirmar entregas, actualizar pipeline)
- Estado persiste por dia

---

## 6. Requisitos Não-Funcionais

| # | Requisito | Target |
|---|---|---|
| NFR1 | **Mobile-first** — Isi opera do telemóvel | 100% das funcionalidades críticas acessíveis no ecrã Android |
| NFR2 | **UX para não-técnicos** — curva de aprendizagem | Autonomia após 2h de treino presencial |
| NFR3 | **Performance em 4G angolano instável** | Tempo de carregamento < 3s em 4G médio; PWA com service worker |
| NFR4 | **Tolerância a latência de rede** | Fila PGMQ absorve picos; UI optimista |
| NFR5 | **Português de Angola natural** em todas as respostas do bot | Validação humana de 50 respostas antes do go-live |
| NFR6 | **Moeda Kz** (AOA) formatada `pt-AO` em todos os valores | — |
| NFR7 | **Fuso horário Africa/Luanda** (WAT, UTC+1) | — |
| NFR8 | **Custo operacional mensal** | < $200/mês (~$100-150 esperado: Supabase $25 + UAZAPI ~$25 + LLM ~$50-80 + Vercel $20) |
| NFR9 | **Tempo de resposta do bot** | < 30 segundos da mensagem recebida à resposta enviada |
| NFR10 | **Taxa de automação** | > 70% das conversas resolvidas pelo bot sem humano |
| NFR11 | **Row-Level Security** em todas as tabelas Supabase | Isolamento por perfil |
| NFR12 | **Optimização de imagens** antes do envio para Claude Vision | Resize para max 1024px, compressão |
| NFR13 | **Compliance RGPD/LGPD** | Consentimento no primeiro contacto + opt-out + retenção de dados definida |

---

## 7. Constraints

| # | Constraint | Impacto |
|---|---|---|
| CON1 | **Orçamento técnico limitado** — reutilizar 85% do código Nelma/Elsa | Não construir features from scratch onde já existe algo comprovado |
| CON2 | **Cliente não-técnico** — Isi precisa operar sem suporte constante | UX extremamente simples, documentação visual |
| CON3 | **Conectividade Angola instável** | Optimizar para 4G médio, cache agressivo |
| CON4 | **MVP sem integração de pagamento online** | Registo manual no MVP; IZI Pay em Fase 2 |
| CON5 | **Volume inicial baixo** (~20-40 pedidos/mês) | Custos de Claude devem ser proporcionais — usar Haiku para classificação |
| CON6 | **UAZAPI (API não-oficial)** — risco de bloqueio pela Meta se detectado uso abusivo | Uso responsável, volume moderado (~20-40 pedidos/mês), sem spam; mesmo risco aceite nos CRMs Nelma e Elsa |
| CON7 | **LGPD/RGPD** para dados pessoais | Registar consentimentos, permitir opt-out, anonimização a pedido |
| CON8 | **Portfólio visual inicial** — catálogo já disponível com ~30 produtos e preços | Catálogo WhatsApp Business da Isi já digitalizado (7 capturas); dados prontos para importação |

---

## 8. Fora do Âmbito (Fase 1 / MVP)

- Integração de pagamento online (EMIS/GPO) — usar confirmação manual
- App nativa iOS/Android — usar PWA
- E-commerce com carrinho público — o catálogo é interno (bot mostra via WhatsApp)
- Email marketing automatizado
- Landing pages de venda
- Sistema de booking público com calendário aberto ao cliente
- Gestão de estoque de ingredientes + precificação por ficha técnica (fase 2)
- Multi-tenant (SaaS para outras confeitarias) — fase 3
- Integração com iFood ou Glovo — não existe em Angola
- Gestão de funcionários e folha de pagamento
- OCR automático de comprovativos de pagamento

---

## 9. Métricas de Sucesso

| Métrica | Baseline | Target 90 dias | Target 180 dias |
|---|---|---|---|
| Pedidos/mês | ~20-40 (estimado) | 60 | 100 |
| Taxa de resposta < 5 min | ~30% | 95% | 98% |
| Lead → pedido | Desconhecida | 25% | 35% |
| **Recompra por ocasião** | ~10% | **30%** | **50%** |
| Ticket médio | Medir baseline | +15% | +25% |
| Taxa de automação bot | 0% | 70% | 80% |
| Tempo Isi em atendimento | ~60% do dia | 20% | <15% |
| **Indicações rastreadas** | 0 | 5/mês | 15/mês |
| Satisfação (reclamações) | — | <5%/mês | <3%/mês |

---

## 10. Arquitectura Proposta (de alto nível)

**Stack:** Next.js 16 + Tailwind v4 + Supabase (PostgreSQL + pgvector + Auth + RLS + Realtime + Edge Functions + PGMQ) + **UAZAPI** (API WhatsApp não-oficial, comprovada em produção) + Claude Sonnet 4.5 (respostas + vision) + Claude Haiku 4.5 (classificação) + Vercel.

**WhatsApp API:** UAZAPI (uazapi.dev) — API premium não-oficial já integrada nos CRMs Nelma e Elsa. Vantagens sobre Meta Cloud API: setup instantâneo (QR code), sem necessidade de Meta Business Account verificada, custo fixo por instância, suporte a todas as funcionalidades (texto, media, áudio, typing indicator, status de entrega). Código reutilizável: `uazapi-client.ts`, `uazapi-webhook-receiver`, proxy webhook Next.js.

**Schema:** 14 tabelas reutilizadas do CRM Nelma/Elsa + 8 tabelas novas específicas da Isi (ver secção 5.2 do relatório-fonte).

**Tabelas-chave novas:**
- `referencias_visuais` (pgvector) — portfólio com embeddings
- `pedidos` — encomendas com estado, data entrega, valor
- `ocasioes_cliente` — datas importantes para recompra automática
- `calendario_producao` — capacidade diária

---

## 11. Riscos Principais

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Qualidade de reconhecimento visual em fotos baixa qualidade | Média | Alto | UX guia cliente + fallback textual |
| Volume excede capacidade real de produção | Alta | Alto | Calendário com capacidade máxima |
| Isi não adopta por complexidade | Média | Crítico | UX extremamente simples + treino + checklist |
| Custo Claude Vision escala rápido | Média | Médio | Cache embeddings, uso pontual de Sonnet |
| Internet instável | Alta | Baixo | Fila PGMQ absorve |
| UAZAPI instância desconecta | Média | Alto | Monitorização de conexão + reconexão automática + alerta |

---

## 12. Roadmap (5 Fases, ~4-6 Semanas)

| Fase | Duração | Entregáveis |
|---|---|---|
| **1. Fundação CRM + Bot Base** | 2 sem | Schema + Edge Functions + inbox básico + agente IA core |
| **2. Catálogo + Pedidos + Calendário** | 1-2 sem | Produtos, pedidos, calendário de produção, Kanban |
| **3. Visão Multi-Modal + Orçamento** 🔥 | 1 sem | Claude Vision + pgvector + orçamento dinâmico |
| **4. Recompra por Ocasião** 🔥 | 1 sem | pg_cron + motor de recompra automática |
| **5. Pagamentos + Polish + Go-Live** | 3-5 dias | Comprovativos, RGPD, testes, produção |

**Total:** **4-6 semanas** de desenvolvimento concentrado.

---

## 13. Decisões Pendentes (para discutir com a Isi e com a Marca Digital)

1. **Modelo comercial:** consultoria fixa / revenue share / SaaS com mensalidade?
2. **Preço da consultoria/projecto:** em linha com Elsa (350k Kz) ou Nelma (500k Kz)?
3. **Número WhatsApp:** Isi usa o número actual (928 98 47 54 Unitel) ou adquire dedicado? UAZAPI conecta via QR code ao número existente
4. ~~**Sessão de digitalização do portfólio:**~~ **RESOLVIDO** — catálogo completo já disponível (ver Anexo A)
5. ~~**Estrutura de preços do catálogo:**~~ **RESOLVIDO** — tabela de preços extraída do catálogo WhatsApp Business (ver Anexo A)
6. **Volume real actual:** validar baseline com 1-2h de conversa + análise dos últimos 3 meses de WhatsApp
7. **Quem opera o inbox além da Isi:** ela sozinha ou já há operadora?
8. **Propriedade intelectual do portfólio:** consentimento dos clientes para usar fotos dos bolos anteriores?

---

## 14. Handoff

### Para @pm (Morgan) — Próximos passos
1. Ler este Brief + o Relatório de Pesquisa completo em `docs/analise/relatorio-pesquisa-crm-confeitaria.md`
2. Agendar sessão de calibragem com a Isi (1-2h) para validar volume, ticket médio, portfólio
3. Construir PRD detalhado por domínio (seguir padrão do PRD Nelma como template)
4. Passar para @architect validar arquitectura técnica e schema SQL final
5. Passar para @po para gerar stories executáveis pelo @dev

### Para @architect (Aria) — Preparar
1. Validar a reutilização do schema Nelma/Elsa
2. Desenhar as 8 tabelas novas (especialmente `referencias_visuais` com pgvector)
3. Definir a estratégia de embeddings (quando gerar, onde cachear, como invalidar)
4. Planear o pipeline de processamento de imagens (download UAZAPI media_url → resize → Claude Vision → embedding → armazenamento)
5. Definir a arquitectura de cron jobs para o motor de recompra

### Para o @analyst (Atlas) — Continuação
Se necessário, posso fazer:
- Pesquisa adicional em casos de uso de Claude Vision para catálogos visuais
- Análise comparativa de custo exacto entre GPT-4V, Claude Sonnet e Gemini para este caso
- Pesquisa sobre programas de referral para pequenos negócios angolanos
- Análise de preços médios de confeitarias em Luanda (via análise de Instagram/TikTok de concorrentes)

---

## 15. Integração WhatsApp — UAZAPI

### Porquê UAZAPI e não Meta Cloud API

| Critério | Meta Cloud API | UAZAPI |
|---|---|---|
| **Setup** | Requer Meta Business Account verificada (semanas) | QR code scan (minutos) |
| **Custo** | $0.0225/msg marketing + $0.004/msg utility | Custo fixo por instância (~$20-30/mês) |
| **Aprovação de templates** | Obrigatório (dias de espera) | Desnecessário |
| **Experiência no stack** | Nenhuma em produção | Comprovada em Nelma + Elsa |
| **Código reutilizável** | 0% | ~95% (client, webhook, schema) |
| **Suporte a media** | Sim | Sim (imagem, áudio, vídeo, documento) |
| **Typing indicator** | Limitado | Sim |
| **Risco** | Baixo (oficial) | Médio (não-oficial, pode ser bloqueado) |

### Endpoints UAZAPI utilizados

| Endpoint | Método | Uso |
|---|---|---|
| `/send/text` | POST | Enviar mensagem de texto |
| `/send/media` | POST | Enviar imagem/áudio/vídeo/documento |
| `/chat/presence` | POST | Typing indicator ("a escrever...") |
| Webhook `messages.upsert` | Inbound | Receber mensagens do cliente |
| Webhook `message.ack` | Inbound | Status de entrega (sent/delivered/read) |

### Autenticação

- Header `token` com API key da instância UAZAPI
- Chaves guardadas na tabela `integration_keys` (service=uazapi, key_name=base_url|token|webhook_token)
- Webhook protegido com `x-webhook-token`

### Código reutilizável dos CRMs Nelma/Elsa

| Componente | Origem | Ficheiro |
|---|---|---|
| Cliente UAZAPI (envio) | Nelma | `supabase/functions/_shared/uazapi-client.ts` |
| Webhook receiver | Elsa | `supabase/functions/uazapi-webhook-receiver/index.ts` |
| Send message (com media) | Elsa | `supabase/functions/uazapi-send-message/index.ts` |
| Proxy webhook Next.js | Nelma | `src/app/api/webhooks/uazapi/route.ts` |
| Schema agente IA | Nelma | `supabase/migrations/026_ai_agent_uazapi.sql` |
| Normalização telefone Angola | Elsa | `supabase/functions/_shared/get-integration-key.ts` |

---

## Anexo A — Catalogo Delicias da Isi (Precos Reais)

**Fonte:** Catalogo WhatsApp Business da Isi (capturado 11/04/2026)
**Contacto:** 928 98 47 54 (Unitel, so para chamadas)

### A.1 Bolos em Chantilly (preco base por tamanho)

| Tamanho | Preco |
|---|---|
| 10cm | 13.500 Kz |
| 14cm | 42.000 Kz |
| 16cm | 49.500 Kz |
| 18cm | 58.500 Kz |
| 20cm | 66.500 Kz |

*Nota: Precos iniciais com massas e recheios simples. Preco final depende da massa, recheio e imagem de referencia. Personalizacoes influenciam o valor final.*

### A.2 Bolos Especiais

| Produto | Tamanho/Detalhe | Preco |
|---|---|---|
| Red Velvet tamanho medio | — | 32.000 Kz |
| Red Velvet tamanho medio (premium) | — | 33.500 Kz |
| Bolo Cenoura tamanho medio | — | 42.000 Kz |
| Bolo Chocolate/Red Velvet tamanho medio | — | 39.500 Kz |
| Bolo chocolate tamanho medio c/ morangos | — | 33.500 Kz |
| Bolo nordico chocolate (P) | — | 29.500 Kz |
| Naked cake | A partir de | 37.500 Kz |
| Bolo Vintage | A partir de | 42.000 Kz |
| Bolos caseiros (chocolate, red velvet) (P) | — | 24.000 Kz |

### A.3 Bento Cakes

| Produto | Tamanho/Detalhe | Preco |
|---|---|---|
| Bento cake 14cm simples | 14cm diametro, 8cm altura | 15.500 Kz |
| Bento cake personalizado em papel | 14cm diametro, 8cm altura | 17.000 Kz |
| Bento cake ganache com pintura | Serve 4-6 fatias | 20.500 Kz |
| Bento cake mesversarios personalizados | Cobertura chantilly | 16.000 Kz |
| Bento cake com modelagem 3D | 14cm diametro | 31.500 Kz |
| Mini vintage cake (Bento) | 14cm diametro, 8cm altura | 17.500 Kz |
| Mini cake vintage | 14cm diametro, 8cm altura | 18.500 Kz |

### A.4 Doces e Outros

| Produto | Detalhe | Preco |
|---|---|---|
| Churros | Duzia c/ doce de leite | (consultar) |
| Cupcakes personalizados | Unidade | 3.000 Kz |
| Mini Donuts personalizados | Duzia | 18.500 Kz |
| Bolachas personalizadas e cup cakes | 6 unidades bolachas | 15.000 Kz |

### A.5 Produtos sob Consulta (preco variavel)

- Bolos dois andares
- Bolos de casamento
- Bolos de noivado (Chantilly e Ganache)
- Bolos em ganache (varios estilos)
- Bolos em Ganache Feminino
- Bolo 3 andares chantilly
- Bolos com papel Hostia
- Bolos de andar em ganache
- Bolos caseiros (variados)
- Doces finos
- Doces personalizados (4 cup cakes cobertura chantilly)
- Sobremesas em miniatura

### A.6 Faixas de Preco (resumo para o agente IA)

| Categoria | Faixa de Preco (Kz) | Ticket Medio Estimado |
|---|---|---|
| Bento cakes | 13.500 - 31.500 | ~18.000 Kz |
| Bolos chantilly (simples) | 42.000 - 66.500 | ~54.000 Kz |
| Bolos especiais | 24.000 - 42.000 | ~33.000 Kz |
| Naked/Vintage | 37.500 - 42.000+ | ~40.000 Kz |
| Doces/unidade | 3.000 - 18.500 | ~12.000 Kz |
| Bolos casamento/2+ andares | Sob consulta | 80.000-150.000 Kz (estimado) |

**Ticket medio global estimado:** ~35.000-45.000 Kz

---

*— Atlas, entregando o terreno mapeado 🔎*
*Project Brief v1.1 — Delicias da Isi CRM Inteligente*
*Marca Digital · Abril 2026*
*Alteracao v1.1: UAZAPI substitui Meta Cloud API + Catalogo completo com precos reais*
