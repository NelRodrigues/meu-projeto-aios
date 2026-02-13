# 🎯 Marketing Operations Squad (marketing-opes)

**Setor de Marketing Digital Completo com IA**

---

## 📋 Visão Geral

Squad especializado em automizar o pipeline completo de marketing digital para **one-person enterprise** (R$30k-200k/mês).

Orquestra **7 agentes de IA** que trabalham em sequência coordenada:
1. **CMO** - Valida ideias, filtra qualidade
2. **Ideacao IG** - Gera hooks visuais para Instagram
3. **Ideacao LI** - Gera hooks textuais para LinkedIn
4. **Producao** - Escreve conteúdo com sua voz
5. **Designer** - Cria assets visuais consistentes
6. **Distribuicao** - Adapta para cada plataforma
7. **Metricas** - Mede e informa próximas estratégias

---

## 🚀 Início Rápido

### 1. Activar o Squad
```bash
# Começar pipeline de marketing
@dev *activate-squad marketing-opes

# Ou com modo específico
@dev *activate-squad marketing-opes --mode incremental
```

### 2. Submeter Ideia de Conteúdo
```bash
# O CMO vai validar
@cmo *validate-idea --topic "Como crescer em redes sociais"
```

### 3. Gerar Ideias
```bash
# Instagram vai criar hooks visuais
@ideacao-ig *generate-idea

# LinkedIn vai criar hooks textuais
@ideacao-li *generate-idea
```

### 4. Produzir Conteúdo
```bash
# Escrever com sua voz
@producao *produce-content
```

### 5. Design Visual
```bash
# Criar assets
@designer *create-visuals
```

### 6. Publicar
```bash
# Adaptar e agendar em todas plataformas
@distribuicao *publish
```

### 7. Medir Resultados
```bash
# Análise de performance
@metricas *analyze-performance
```

---

## 📊 Pipeline de Marketing

```
IDEIA
  ↓
[CMO] Valida → Aprova/Rejeita
  ↓
[Ideacao IG] Gera hooks visuais
  ↓  ↓
[Ideacao LI] Gera hooks textuais
  ↓
[Producao] Escreve conteúdo final
  ↓
[Designer] Cria visuals
  ↓
[Distribuicao] Adapta + Publica
  ↓
[Metricas] Mede + Reporta
  ↓
INSIGHTS → Próxima Iteração
```

---

## 🎯 7 Agentes em Detalhe

### 1️⃣ CMO (Chief Marketing Officer)
**Persona:** Seth Godin
**Role:** Estrategista e Validador

- Valida cada ideia de conteúdo
- Filtra pela qualidade
- Alinha com estratégia de marca
- Aprova antes de entrar em produção

**Entra em ação quando:** Uma ideia chega para validação

---

### 2️⃣ Ideacao IG (Instagram Strategist)
**Persona:** Stan Kee
**Role:** Criativo Visual

- Gera ideias específicas para Instagram
- Cria hooks visuais que capturam atenção
- Pensa em circulação e viralidade
- Estrutura carosséis, reels, stories

**Entra em ação quando:** CMO aprova a ideia

---

### 3️⃣ Ideacao LI (LinkedIn Strategist)
**Persona:** Dan Kennedy
**Role:** Copywriter Persuasivo

- Gera ideias específicas para LinkedIn
- Cria hooks textuais que convertem
- Estabelece autoridade
- Estrutura narrativas convincentes

**Entra em ação quando:** CMO aprova a ideia

---

### 4️⃣ Producao (Content Producer)
**Persona:** Seu DNA de Escrita
**Role:** Produtor de Conteúdo

- Escreve o conteúdo final
- Mantém sua voz única
- Adapta para diferentes formatos
- Garante consistência de tom

**Entra em ação quando:** Ideias estão prontas para produção

---

### 5️⃣ Designer (Visual Designer)
**Persona:** Brand Guide
**Role:** Designer Visual

- Cria designs para posts
- Mantém consistência de marca
- Produz assets para cada plataforma
- Garante identidade visual

**Entra em ação quando:** Conteúdo está pronto para design

---

### 6️⃣ Distribuicao (Distribution Manager)
**Persona:** Especialista em Plataformas
**Role:** Distribuidor Multiplataforma

- Adapta conteúdo para cada plataforma
- Otimiza hashtags e CTAs
- Agenda publicações
- Coordena calendário

**Entra em ação quando:** Conteúdo e visuals estão prontos

---

### 7️⃣ Metricas (Analytics Manager)
**Persona:** Data-Driven Decision Maker
**Role:** Analista de Dados

- Colecta dados de todas plataformas
- Gera relatórios de performance
- Identifica padrões e tendências
- Informa próxima iteração

**Entra em ação quando:** Conteúdo está publicado

---

## 📁 Estrutura de Ficheiros

```
squads/marketing-opes/
├── squad.yaml                      # Manifesto principal
├── README.md                       # Este ficheiro
├── agents/                         # Definições de agentes
│   ├── cmo.yaml
│   ├── ideacao-ig.yaml
│   ├── ideacao-li.yaml
│   ├── producao.yaml
│   ├── designer.yaml
│   ├── distribuicao.yaml
│   └── metricas.yaml
├── tasks/                          # Tarefas executáveis
│   ├── validate-idea.md
│   ├── generate-idea.md
│   ├── produce-content.md
│   ├── create-visuals.md
│   ├── adapt-platform.md
│   ├── publish-content.md
│   └── analyze-performance.md
├── workflows/                      # Fluxos multipasso
│   ├── content-pipeline.yaml
│   └── weekly-review.yaml
├── templates/                      # Templates de conteúdo
│   ├── social-post.md
│   ├── carousel-brief.md
│   ├── newsletter.md
│   └── brief-template.md
├── checklists/                     # Checklists de validação
│   ├── content-quality.md
│   ├── design-checklist.md
│   └── publication-checklist.md
├── config/                         # Configurações
│   ├── platforms.yaml
│   ├── posting-schedule.yaml
│   └── kpis.yaml
└── data/                          # Dados estáticos
    ├── content-calendar.json
    └── brand-guidelines.md
```

---

## 🔄 Modos de Funcionamento

### Modo Incremental (Padrão)
Processar uma ideia por vez:
- ✅ Mais focado e detalhado
- ✅ Melhor qualidade de conteúdo
- ✅ Ideal para começar

```bash
@dev *activate-squad marketing-opes --mode incremental
```

### Modo Batch
Processar múltiplas ideias em paralelo:
- ✅ Mais eficiente em volume
- ✅ Aproveita bem escalabilidade
- ✅ Ideal quando tem muitas ideias

```bash
@dev *activate-squad marketing-opes --mode batch
```

### Modo Scheduled
Executar conforme calendário:
- ✅ Automático e previsível
- ✅ Ideal para contrato de conteúdo
- ✅ Requer configuração inicial

```bash
@dev *activate-squad marketing-opes --mode scheduled
```

---

## 📊 Plataformas Suportadas

- **Instagram** - 3x por semana
- **LinkedIn** - 5x por semana
- **TikTok** - 2x por semana
- **YouTube** - 1x por semana

---

## 🎯 KPIs Monitorados

- **Impressões** - Alcance total
- **Engagement Rate** - Taxa de interação
- **Reach** - Pessoas alcançadas
- **Conversions** - Ações tomadas
- **Followers Growth** - Crescimento de audiência

---

## 🔧 Configuração Inicial

### 1. Definir Brand Guidelines
```
Edite: config/brand-guidelines.md
- Logo e cores
- Ton de voz
- Audiência alvo
```

### 2. Configurar Plataformas
```
Edite: config/platforms.yaml
- Links de API
- Credenciais
- Preferences
```

### 3. Definir Calendário
```
Edite: config/posting-schedule.yaml
- Horários por plataforma
- Frequência
- Zonas horárias
```

### 4. Definir KPIs
```
Edite: config/kpis.yaml
- Metas de alcance
- Metas de engagement
- ROI esperado
```

---

## 💡 Casos de Uso

### Para Criadores de Conteúdo
- Automizar produção de posts
- Manter consistência em múltiplas plataformas
- Poupar tempo em adaptar conteúdo

### Para Empreendedores
- Fazer marketing sem agência
- Medir o que funciona
- Escalar sem aumentar custo

### Para Equipas Pequenas
- Coordenar trabalho entre pessoas
- Ter um processo repeatable
- Crescer com qualidade

---

## 🚨 Troubleshooting

### "CMO rejeitou minha ideia"
→ Revise a ideia com mais profundidade e tente novamente

### "Designer não conseguiu criar visual"
→ Forneça mais detalhes sobre estilo desejado

### "Métricas não aparecem"
→ Aguarde 24h para APIs de plataformas sincronizarem

---

## 📚 Documentação Adicional

- `docs/pipeline.md` - Fluxo completo explicado
- `docs/agent-roles.md` - Descrição detalhada de cada agente
- `docs/content-types.md` - Tipos de conteúdo suportados
- `docs/troubleshooting.md` - Soluções a problemas comuns

---

## 🤝 Contacto & Suporte

- **Squad Creator:** @craft
- **Líder Técnico:** @dev
- **QA Lead:** @qa

---

**Última Actualização:** 2026-02-13
**Versão:** 1.0.0
**Status:** ✅ Pronto para Usar
