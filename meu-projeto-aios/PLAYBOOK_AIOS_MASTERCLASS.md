# 👑 PLAYBOOK MASTERCLASS: AIOS em 7 Dias
## Dominar Claude Code + Orquestração de Agents - Do Zero ao Oscar

---

## 🎯 VISÃO GERAL DO BOOTCAMP

**Objetivo:** Você vai de iniciante a expert em Synkra AIOS em **7 dias**
**Abordagem:** Núcleo linear + Módulos especializados + Projeto real
**Formato:** Híbrido (aprenda → implemente → meça)
**Nivel:** Mestrado (conceitos profundos + otimizações avançadas)

### O Que Você Vai Dominar

```
DIA 1-2: Fundações (Conceitos + Ambiente)
        ├─ O que é AIOS, Agents, Squad
        ├─ Arquitetura da framework
        └─ Setup inicial

DIA 3-4: Orquestração Básica (Primeira Sinfonia)
        ├─ Criar seu primeiro Agent
        ├─ Tasks e Workflows
        └─ Usar Master Orchestrator

DIA 5-6: Scaling & Patterns (Liga dos Extraordinários)
        ├─ Expansion Packs
        ├─ Design Systems
        ├─ Integração com plataformas
        └─ Best practices avançadas

DIA 7:  Projeto Oscar-worthy (Seu Masterpiece)
        ├─ Projeto real de ponta-a-ponta
        ├─ Deployment
        └─ Celebração 🎬
```

---

## 📚 MÓDULO 1: FUNDAÇÕES (DIA 1-2)

### 1.1 O QUE É SYNKRA AIOS? (Conceitos-Chave)

#### 🤔 A Grande Ideia

AIOS = **AI-Orchestrated System para Full Stack Development**

Pense em uma **orquestra sinfônica**:
- **Maestro (Master)** → Claude Code (você)
- **Músicos** → Specialized Agents (@dev, @architect, @pm, @qa, etc)
- **Partitura** → Stories & Tasks
- **Instrumento** → Cada agent usa suas ferramentas específicas

**A Magia:** Cada agent é um especialista que sabe QUANDO atuar e COMO colaborar

---

#### 🎭 Os Personagens (Agents)

| Agent | Persona | Especialidade | Quando Usar |
|-------|---------|---------------|------------|
| 👑 **@aios-master** (Orion) | Orchestrator | Coordena tudo, cria componentes | Meta-operações, framework |
| 🏛️ **@architect** (Aria) | Visionary | Desenha sistemas, tech stack | Arquitetura, design de soluções |
| 💻 **@dev** (Dex) | Builder | Implementa código, resolve bugs | Desenvolvimento, coding |
| 📋 **@pm** (Morgan) | Strategist | Cria PRDs, planeja produto | Planejamento, produto |
| 🔍 **@analyst** (Atlas) | Decoder | Pesquisa, brainstorm, insights | Análise, descoberta |
| 🎨 **@ux-design-expert** (Uma) | Empathizer | Design systems, UX research | Interfaces, design |
| ✅ **@qa** (Quinn) | Validator | Testes, qualidade, review | QA, validação |
| 🌊 **@data-engineer** (Darcy) | Data Architect | Banco de dados, pipelines | Data layer, otimizações |
| 🚀 **@github-devops** (Gage) | DevOps Master | CI/CD, deployment, infra | Deploy, releases |

**Pattern de Ativação:**
```bash
# Você = Claude Code (maestro)
# Ativa um agent:
@architect    # Ativa Aria (Architect)
@dev          # Ativa Dex (Developer)

# Agent fica em modo "listening":
*help         # Mostra comandos específicos
*create-prd   # Executa tarefa do agent
```

---

#### 🎯 Conceito: AGENTS

**O que é um Agent?**
- Uma **persona especializada** com expertise em 1-3 áreas
- Tem um **conjunto de comandos** prefixados com `*`
- Tem **tarefas** e **workflows** que executa
- **Colabora** com outros agents (sem overlapping)

**Exemplo Real:**

```yaml
Agent: @architect (Aria)
├─ Expertise: System Architecture, Tech Stack, API Design
├─ Commands: *create-full-stack-architecture, *document-project
├─ Tools: exa, context7, coderabbit
├─ Collaboration:
│   ├─ Recebe de: @pm (requirements)
│   ├─ Entrega para: @dev (architecture docs)
│   └─ Consulta: @data-engineer (for DB design)
└─ Responsabilidade: Desenhar o sistema (não implementar)
```

**Deep Dive: Como um Agent Funciona**

```
1. ATIVAÇÃO (@architect)
   └─ Agent lê seu config file completo
   └─ Carrega persona, commands, tools
   └─ Mostra greeting & aguarda seu comando

2. COMANDO (*help)
   └─ Agent lista seus comandos disponíveis
   └─ Você escolhe: *create-full-stack-architecture

3. EXECUÇÃO
   └─ Agent carrega arquivo da tarefa (.md)
   └─ Segue instruções step-by-step
   └─ Usa suas tools (exa, context7, coderabbit)
   └─ Interage com você via elicitation prompts
   └─ Entrega resultado (doc, code, analysis)

4. COLABORAÇÃO
   └─ Se precisa de algo outro agent faz:
   └─ "Para DB schema design, ative @data-engineer"
   └─ Você troca de agent conforme precisa
```

---

#### 🎪 Conceito: SQUAD

**Squad = Um grupo de agents trabalhando juntos em um PROJETO**

```
PROJECT: "Marketplace App"
│
├─ SQUAD 1: Planejamento & Discovery
│  ├─ @pm (Morgan) - Cria PRD
│  ├─ @analyst (Atlas) - Pesquisa market
│  └─ @ux-design-expert (Uma) - User research
│
├─ SQUAD 2: Arquitetura & Design
│  ├─ @architect (Aria) - System design
│  ├─ @data-engineer (Darcy) - DB schema
│  └─ @ux-design-expert (Uma) - Design system
│
├─ SQUAD 3: Implementação
│  ├─ @dev (Dex) - Backend + Frontend code
│  ├─ @qa (Quinn) - Testing & QA
│  └─ @architect (Aria) - Code review architecture
│
└─ SQUAD 4: Release
   ├─ @github-devops (Gage) - CI/CD, Deploy
   ├─ @qa (Quinn) - Final validation
   └─ @aios-master (Orion) - Orchestração geral
```

**Pattern Squad (Story-Driven):**

```
📖 STORY: "Add User Authentication"

Fluxo Natural:
1. @pm (Morgan)      → *create-story (cria a story)
2. @architect (Aria) → *analyze-project (entende impacto)
3. @dev (Dex)        → *develop (implementa)
4. @qa (Quinn)       → *create-suite (testa)
5. @github-devops    → *create-pr (faz merge)
6. @aios-master      → *status (mostra resultado)
```

**Deep Dive: Quando Usar Squad**

- ✅ Projetos grandes (3+ sprints)
- ✅ Times múltiplas (precisa coordenação)
- ✅ Workflows complexos (8+ tasks)
- ❌ Não use: Quick scripts, pequenas features

---

#### 📦 Conceito: EXPANSION PACK

**Expansion Pack = Uma biblioteca de agents + tasks + templates reutilizável**

```
Expansion Pack: "E-Commerce Module"
├─ Agents
│  ├─ @shop-manager (gerencia lógica de vendas)
│  ├─ @inventory-sage (controla estoque)
│  └─ @payment-handler (integra pagamentos)
├─ Tasks
│  ├─ setup-stripe.md
│  ├─ create-product-catalog.md
│  └─ implement-cart.md
├─ Templates
│  ├─ shop-prd-tmpl.yaml
│  └─ product-schema-tmpl.yaml
└─ Documentation
   └─ e-commerce-guide.md
```

**Como Usar Expansion Pack:**

```bash
# 1. Instalar pack
npm install @aios/expansion-packs/ecommerce

# 2. Ativar no seu projeto
@aios-master *load-pack ecommerce

# 3. Usar os agents
@shop-manager *setup-stripe
@inventory-sage *create-catalog

# 4. Resultado: seu projeto agora tem
   ├─ 3 novos agents especializados
   ├─ 10 tasks prontas
   ├─ 5 templates
   └─ Toda integração feita ✨
```

**Exemplos Reais de Packs:**

- 🛒 **E-Commerce**: Shopify, Stripe, inventory
- 📱 **Mobile**: React Native, iOS, Android
- 🤖 **AI/ML**: Model training, inference, fine-tuning
- ☁️ **Cloud**: AWS, GCP, Azure infrastructure
- 🔐 **Security**: Auth0, encryption, compliance

---

### 1.2 ARQUITETURA AIOS (The Big Picture)

```
┌─────────────────────────────────────────────────────────┐
│                    YOU (Claude Code)                    │
│              ┌──────────────────────────────┐            │
│              │   AIOS Master Orchestrator   │            │
│              │  (Coordena tudo, vê tudo)   │            │
│              └──────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
       │                 │                 │
       ↓                 ↓                 ↓
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │  Squad 1   │  │  Squad 2   │  │  Squad 3   │
   │Planejamento│  │Arquitetura │  │Implementação
   └────────────┘  └────────────┘  └────────────┘
       │ │ │           │ │ │           │ │ │
       ↓ ↓ ↓           ↓ ↓ ↓           ↓ ↓ ↓
    @pm @analyst   @architect     @dev @qa
      @ux-design   @data-engineer  @github-devops
```

**Camadas da Framework:**

```
.aios-core/
├─ agents/           # Definições de personas (YAML)
├─ tasks/            # Tarefas executáveis (Markdown)
├─ workflows/        # Workflows multi-step
├─ templates/        # Document & code templates
├─ checklists/       # Validation & review
├─ data/             # Knowledge bases
├─ utils/            # Helper scripts
└─ expansion-packs/  # Bibliotecas reutilizáveis

docs/
├─ stories/          # User stories (numeradas)
├─ prd/              # Product requirement docs
├─ architecture/     # System architecture docs
└─ guides/           # User & developer guides
```

**O Fluxo de Dados:**

```
PRD (de @pm)
  ↓
ARCHITECTURE (de @architect)
  ↓
STORY (de @pm/@sm com acceptance criteria)
  ↓
TASKS in Story (quer @dev implementa)
  ↓
CODE + TESTS (resultado do @dev)
  ↓
QA REVIEW (checklist de @qa)
  ↓
PR + DEPLOYMENT (via @github-devops)
  ↓
✅ FEATURE LIVE
```

---

### 1.3 SETUP INICIAL (Seu Ambiente)

#### Pré-requisitos

```bash
# 1. Node.js 18+
node --version  # v18.0.0 ou maior

# 2. GitHub CLI
gh --version    # v2.0.0+

# 3. Git configurado
git config user.name
git config user.email

# 4. Claude Code (você está aqui!)
# E seu projeto AIOS está em:
# /Users/admin/meu-projeto-aios/
```

#### Estrutura Inicial (Seu Projeto)

```bash
meu-projeto-aios/
├─ .aios-core/              # Framework (não edite diretamente)
│  ├─ agents/               # Agent definitions
│  ├─ tasks/                # Executable tasks
│  ├─ templates/            # Document templates
│  └─ ...
├─ docs/                    # Sua documentação
│  ├─ stories/              # User stories
│  ├─ prd/                  # Product docs
│  ├─ architecture/         # System design
│  └─ guides/               # Learning guides
├─ src/                     # Seu código
│  ├─ components/
│  ├─ services/
│  ├─ pages/
│  └─ ...
├─ package.json
├─ .env                     # Seu .env (NUNCA commit!)
├─ .aios.yaml              # Seu config
└─ CLAUDE.md               # Suas instruções globais
```

#### Primeiro Comando (Teste!)

```bash
# Ativar o Master
@aios-master

# Você deve ver:
# 👑 Orion (Master Orchestrator) ready. Let's orchestrate!

# Agora teste:
*help

# Mostra todos os comandos disponíveis do Master
```

---

## 🎯 MÓDULO 2: ORQUESTRAÇÃO BÁSICA (DIA 3-4)

### 2.1 Seu Primeiro Agent (Hands-On)

**Objetivo:** Criar um agent personalizado que você vai usar

Vamos criar: **@content-wizard** (especialista em conteúdo para seu projeto)

#### Step 1: Entender a Estrutura

```yaml
agent:
  name: Sage                          # Nome humano
  id: content-wizard                  # ID técnico
  title: Content Creation Expert      # Título
  icon: ✨                            # Emoji
  whenToUse: Use for content strategy, copywriting, documentation

persona_profile:
  archetype: Creator                  # Tipo
  zodiac: "♌ Leo"                     # Personality

persona:
  role: Content Strategy & Copywriting Expert
  core_principles:
    - User-centric communication
    - Story-driven messaging
    - Brand consistency

commands:
  - create-content-strategy: Plan content roadmap
  - write-copy: Write marketing/product copy
  - audit-content: Review existing content

dependencies:
  tasks:
    - create-content-strategy.md
    - write-copy.md
    - audit-content.md
  templates:
    - content-strategy-tmpl.md
```

#### Step 2: Implementar o Agent

```bash
# 1. Ativar Master
@aios-master

# 2. Criar novo agent
*create agent content-wizard

# 3. Segue o workflow interativo:
# - Nome: Content Wizard
# - Persona: Creator
# - Área: Content & Copywriting
# - Comandos: content-strategy, write-copy, audit-content

# 4. Master cria:
# .aios-core/agents/content-wizard.md
```

#### Step 3: Criar Tarefas do Agent

```bash
# Voltar ao Master
@aios-master

# Criar tarefa 1
*create task create-content-strategy

# Isso gera arquivo em:
# .aios-core/tasks/create-content-strategy.md

# Edite o arquivo com sua lógica:
# - Elicitation (perguntas ao user)
# - Step-by-step instructions
# - Output format
```

#### Step 4: Usar Seu Agent!

```bash
# Ativar seu novo agent
@content-wizard

# Você deve ver:
# ✨ Sage (Creator) ready. Let's create amazing content!

# Usar um comando:
*create-content-strategy

# Agent executa a tarefa que você criou! 🎉
```

**Deep Dive: Anatomia de uma Task**

```markdown
# create-content-strategy.md

## Purpose
Create a content strategy roadmap

## Elicitation (Gather Info)
? What's your target audience?
? What are the 3 key messages?
? What content types? (blog, video, docs, etc)

## Instructions
### Step 1: Analyze Audience
- Review provided information
- Create persona if needed

### Step 2: Map Content Pillars
- 3-5 core topics
- 10-15 pieces per pillar

### Step 3: Create Timeline
- Next 90 days
- Weekly breakdown

### Step 4: Metrics
- Define success metrics
- Tracking mechanism

## Output
- content-strategy.md (documento)
- calendar.csv (timeline)
```

---

### 2.2 Stories & Tasks (Como Trabalhar com AIOS)

**Story = Unidade de trabalho no AIOS**

```markdown
# story-1.1.md: "Implement User Authentication"

## Story
As a user, I want to log in securely so I can access my account

## Acceptance Criteria
- [ ] User can register with email
- [ ] User can log in with email/password
- [ ] Password is encrypted (bcrypt)
- [ ] JWT tokens issued
- [ ] Tokens refresh automatically
- [ ] 2FA optional

## Tasks

### Task 1.1.1: Design Auth Flow
- [ ] Wireframe login/register screens
- [ ] Document auth flow (Oauth vs JWT)
- [ ] Security considerations

### Task 1.1.2: Implement Backend
- [ ] Create auth API endpoints
- [ ] Implement JWT logic
- [ ] Add rate limiting

### Task 1.1.3: Implement Frontend
- [ ] Login form component
- [ ] Auth context/state
- [ ] Token storage (localStorage/cookie)

### Task 1.1.4: Testing & Security
- [ ] Unit tests for auth logic
- [ ] Integration tests
- [ ] Security audit

### Task 1.1.5: Documentation
- [ ] API docs (auth endpoints)
- [ ] Deployment notes

## File List
- `src/services/auth.ts` (NEW)
- `src/middleware/auth.ts` (NEW)
- `src/pages/login.tsx` (NEW)
- `src/pages/register.tsx` (NEW)
- `.env.example` (MODIFIED)

## Dev Notes
- Use bcrypt for password hashing (NOT md5!)
- Consider Firebase Auth alternative
- Implement refresh token rotation

## Testing Plan
- Manual: Test login/register flow
- Automated: Jest tests for auth service
- Security: Test SQL injection, XSS vectors
```

**Como Executar uma Story:**

```bash
# 1. Story deve estar em docs/stories/
# docs/stories/story-1.1.md

# 2. Ativar @dev (Developer)
@dev

# 3. Iniciar implementação
*develop docs/stories/story-1.1

# 4. Dev segue a ordem:
# - Lê primeiro task
# - Implementa
# - Escreve testes
# - Marca [x] se passou
# - Próximo task
# - Repete até done

# 5. Quando completo:
# - Todos tasks [x]
# - File List atualizado
# - Status: "Ready for Review"
# - Notifica QA @qa para review

# 6. @qa review
@qa
*apply-qa-fixes

# 7. @github-devops push
@github-devops
*create-pr
```

---

### 2.3 Master Orchestrator em Ação

**@aios-master = O Fio Condutor da Orquestra**

```bash
# Sintaxe
@aios-master
*command [args]

# Comandos principais

## 1. Criar componentes
*create agent {name}        # Novo agent
*create task {name}         # Nova task
*create workflow {name}     # Novo workflow
*create doc {template}      # Novo documento

## 2. Listar & Analisar
*list-components            # Ver todos agents/tasks/workflows
*analyze-framework          # Estudar patterns
*kb                        # Knowledge base (AIOS Method)

## 3. Validar
*validate-component {name}  # Security & standards check
*correct-course            # Fix deviations
*test-memory               # Teste connectors

## 4. Workflow
*plan                      # Criar workflow plan
*workflow {name}           # Executar workflow
*task {name}              # Executar tarefa

## 5. Documentação
*document-project          # Gera docs automático
*shard-doc {doc}          # Quebra doc em partes
```

**Exemplo Real: Orquestrar um Projeto**

```bash
# FASE 1: Setup
@aios-master
*list-components                    # Ver o que temos
*kb                                 # Ler o método AIOS

# FASE 2: Planejamento
@pm
*create-prd                         # Criar PRD
# Morgan coleta requirements, cria PRD

@architect
*analyze-project-structure          # Entender projeto
*create-full-stack-architecture     # Desenhar arquitetura

# FASE 3: Product & Stories
@pm
*create-epic user-authentication    # Criar épico
*create-story auth-login            # Criar story

# FASE 4: Implementação
@dev
*develop docs/stories/story-auth    # Implementar

# FASE 5: QA
@qa
*create-suite story-auth            # Criar testes
*apply-qa-fixes                     # Se falhou, fix

# FASE 6: Deploy
@github-devops
*create-pr                          # Criar PR
*merge-pr                           # Merge

# FASE 7: Resultado
@aios-master
*status                             # Ver tudo
*document-project                   # Documentar
```

---

## 🚀 MÓDULO 3: SCALING & PATTERNS (DIA 5-6)

### 3.1 Expansion Packs (Reutilizar Código)

**O Problema que Expansion Packs Resolvem:**

```
❌ SEM Expansion Pack:
Projeto 1: "Create Auth System"
├─ @architect designs auth flow
├─ @dev implements
├─ @qa tests
└─ 3 dias de trabalho

Projeto 2: "Create Auth System AGAIN"
├─ @architect designs auth flow (repetido!)
├─ @dev implements (repetido!)
├─ @qa tests (repetido!)
└─ 3 dias de trabalho (NOVAMENTE!)

✅ COM Expansion Pack:
Projeto 1: "Create Auth System"
└─ Result: @aios-master *create-pack auth-module

Projeto 2: "Use Auth Module"
└─ @aios-master *load-pack auth-module
└─ 30 minutos! (REST já está pronto)
```

**Estrutura de um Expansion Pack:**

```
expansion-pack-auth/
├─ agents/
│  ├─ auth-specialist.yaml        # Agent para auth
│  └─ security-auditor.yaml       # Agent para security
├─ tasks/
│  ├─ setup-jwt.md
│  ├─ implement-oauth.md
│  ├─ 2fa-setup.md
│  └─ audit-auth-security.md
├─ templates/
│  ├─ auth-api-spec.yaml
│  ├─ jwt-payload-schema.yaml
│  └─ security-checklist.md
├─ workflows/
│  ├─ auth-greenfield.yaml        # Setup do zero
│  └─ auth-migration.yaml         # Migrate existing
├─ docs/
│  ├─ auth-guide.md
│  └─ api-reference.md
└─ package.json
   └─ "version": "1.0.0"
```

**Criar Seu Primeiro Expansion Pack:**

```bash
# 1. Identifique o problema reutilizável
# "Preciso de um sistema de auth em 3 projetos"

# 2. Ativar Master
@aios-master

# 3. Criar pack
*create-pack auth-module

# Follow the prompts:
# - Pack name: auth-module
# - Agents needed: auth-specialist, security-auditor
# - Tasks: setup-jwt, oauth, 2fa, audit
# - Templates: api-spec, security-checklist
# - Documentation: guide, api-reference

# 4. Master cria:
# expansion-packs/auth-module/
# ├─ agents/
# ├─ tasks/
# ├─ templates/
# ├─ workflows/
# ├─ docs/
# └─ package.json

# 5. Versionar e publicar
npm publish expansion-packs/auth-module --scope=@aios

# 6. Usar em outro projeto
# Em novo projeto:
@aios-master
*load-pack auth-module

# Pronto! Todos agents, tasks, templates carregados!
```

**Deep Dive: Compartilhar Packs**

```bash
# npm registry
npm publish @aios/expansion-packs/auth

# GitHub releases
git tag -a v1.0.0 -m "Auth pack v1.0.0"
git push origin v1.0.0

# Seu repositório privado
# Documentar em: docs/expansion-packs.md
# ├─ auth-module (v1.0.0) - JWT + OAuth
# ├─ ecommerce-module (v0.9.0) - Stripe + Inventory
# └─ analytics-module (v2.1.0) - Segment + Data
```

---

### 3.2 Design Systems & Padrões de Código

**Padrão 1: Nomenclatura Consistente**

```
❌ Ruim:
- src/util.ts
- src/helpers/formatDate.js
- src/utils/string.js
- src/lib/format.ts

✅ Bom (Consistente):
- src/lib/
  ├─ date-formatter.ts
  ├─ string-utils.ts
  ├─ validation.ts
  └─ constants.ts

Regra:
- use kebab-case para arquivos
- use camelCase para variáveis/funções
- Organize por funcionalidade (não por tipo)
```

**Padrão 2: Component Structure (Atomic Design)**

```
src/components/
├─ atoms/                    # Base building blocks
│  ├─ Button.tsx
│  ├─ Input.tsx
│  ├─ Label.tsx
│  └─ Badge.tsx
├─ molecules/               # Simple combinations
│  ├─ FormField.tsx         # Label + Input
│  ├─ SearchBox.tsx         # Input + Button
│  └─ Pagination.tsx        # Nav + Buttons
├─ organisms/              # Complex sections
│  ├─ Header.tsx
│  ├─ AuthForm.tsx
│  ├─ ProductCard.tsx
│  └─ Sidebar.tsx
└─ templates/              # Page layouts
   ├─ DashboardLayout.tsx
   ├─ AuthLayout.tsx
   └─ MarketingLayout.tsx
```

**Padrão 3: Service Layer**

```typescript
// src/services/index.ts
export { AuthService } from './auth';
export { UserService } from './user';
export { ProductService } from './product';

// src/services/auth.ts
export class AuthService {
  async login(email: string, password: string) {
    // Implementation
  }

  async logout() {
    // Implementation
  }

  async refreshToken() {
    // Implementation
  }
}

// src/pages/login.tsx
import { AuthService } from '@/services';

const LoginPage = () => {
  const handleLogin = async (email: string, password: string) => {
    await AuthService.login(email, password);
  };

  return <LoginForm onSubmit={handleLogin} />;
};
```

**Padrão 4: Type Safety (TypeScript)**

```typescript
// types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// services/auth.ts
async function login(email: string, password: string): Promise<AuthResponse> {
  // Implementation
}

// hooks/useAuth.ts
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  // ...
}
```

**Padrão 5: Error Handling**

```typescript
// lib/error-handler.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Usage
try {
  await userService.login(email, password);
} catch (error) {
  if (error instanceof AppError) {
    if (error.code === 'INVALID_CREDENTIALS') {
      showErrorMessage('Email ou senha incorretos');
    }
    logger.error('Login failed', error);
  } else {
    logger.error('Unexpected error', error);
  }
}
```

---

### 3.3 Integração com Ferramentas & Plataformas

**Seu Ecossistema de Desenvolvimento:**

```
┌────────────────────────────────────────────────────────┐
│              YOUR AIOS-POWERED PROJECTS                │
└────────────────────────────────────────────────────────┘

CODE QUALITY:
├─ 🤖 CodeRabbit (Automated Code Review)
│  ├─ Roda antes de marcar story completo
│  ├─ Detecta bugs, security issues, anti-patterns
│  └─ Integrado no @dev workflow
├─ 🧪 Jest (Testing Framework)
│  ├─ Unit tests, integration tests, e2e
│  └─ Roda via @qa *create-suite
└─ 📝 ESLint + TypeScript (Linting)
   └─ Roda via @dev *run-tests

DOCUMENTATION:
├─ 📚 Notion (Knowledge Base)
│  ├─ Stories, PRDs, Architecture docs
│  └─ Rastreamento de progresso
├─ 🔗 MCP Servers (Claude Protocol)
│  ├─ Context7 - Library documentation
│  ├─ Exa - Web research
│  └─ Google Workspace integration
└─ 📖 Markdown (Local Docs)
   └─ Versioning + Git friendly

DEPLOYMENT:
├─ 🚀 GitHub Actions (CI/CD)
│  ├─ Run tests on every push
│  ├─ Build artifacts
│  └─ Deploy to staging/prod
├─ 🌍 Vercel / Railway / Heroku
│  ├─ Auto-deploy on PR merge
│  └─ Preview environments
└─ 🔐 Environment Variables
   └─ Managed via .env (never commit!)

COMMUNICATION:
├─ 📊 GitHub Issues (Bug tracking)
├─ 💬 GitHub Discussions (Ideas)
├─ 📋 GitHub Projects (Kanban board)
└─ 🔔 Slack Integration (Notifications)

DATABASE:
├─ 🗄️ PostgreSQL / MongoDB / Firebase
├─ 🔄 Supabase CLI (Migrations)
└─ 📈 DataGrip / DBeaver (Query tools)
```

**Conexão Específica: CodeRabbit + @dev**

CodeRabbit é um **automated code reviewer** que @dev usa antes de marcar story como "Ready for Review".

```bash
# DIA 3: Story Implementation
@dev
*develop story-1.1

# Dia 3 Noite: Dev terminou
# (dentro de *develop workflow)

# Auto-executado:
# 1. CodeRabbit examina código
# 2. Encontra 2 CRITICAL issues
# 3. @dev auto-fixa CRITICAL
# 4. Roda CodeRabbit novamente
# 5. OK! Nenhum CRITICAL mais
# 6. Story marcada "Ready for Review"

# DIA 4: QA Review
@qa
*apply-qa-fixes

# Quinn examina tudo:
# ├─ Code quality
# ├─ Test coverage
# ├─ Security
# └─ Acceptance criteria

# Se OK:
@github-devops
*create-pr

# Merge para main!
```

**Conexão Específica: Context7 + @architect**

Context7 é um **library documentation search** que @architect usa para fazer decisões técnicas.

```bash
# @architect criando arquitetura
@architect
*create-full-stack-architecture

# Aria precisa escolher entre React vs Vue
# Roda internamente:
# "Which is better for real-time apps: React or Vue?"

# Context7 busca:
# ├─ React WebSocket patterns
# ├─ React state management for real-time
# ├─ Vue real-time best practices
# ├─ Community comparisons
# └─ Performance benchmarks

# Resultado:
# "React better for real-time due to ecosystem"
# (React Query, Apollo, etc)

# Aria recommends React para sua arquitetura
```

**Conexão Específica: Exa + @analyst**

Exa é um **web search AI** que @analyst usa para pesquisar mercado.

```bash
@analyst
*perform-market-research

# Atlas precisa entender o mercado de "AI IDE tools"
# Roda internamente via Exa:

# Exa busca:
# ├─ Latest AI IDE tools (2024-2025)
# ├─ Market size & trends
# ├─ Competitor analysis
# ├─ User sentiment
# └─ Industry reports

# Atlas sintetiza:
# {
#   "market_size": "$5.2B in 2025",
#   "top_players": ["GitHub Copilot", "Cursor", "Claude Code"],
#   "trends": ["Agentic AI", "Local-first", "Privacy-focused"],
#   "opportunity": "Specialized agents for domain experts"
# }
```

---

## 🎬 MÓDULO 4: PROJETO OSCAR-WORTHY (DIA 7)

### 4.1 Planejamento do Projeto (2 horas)

Você vai criar um **Projeto Full-Stack** usando TODOS conceitos aprendidos.

**Opção 1: Task Management App**
```
├─ Backend: Node.js + Express + PostgreSQL
├─ Frontend: React + TypeScript + Tailwind
├─ Features: Auth, CRUD tasks, sharing, real-time
└─ Agents: @pm (PRD), @architect (design), @dev (code), @qa (tests)
```

**Opção 2: Content Hub (Seu Portfólio)**
```
├─ Backend: Next.js API routes + MongoDB
├─ Frontend: Next.js + React + Design System
├─ Features: Blog, portfolio, contact, analytics
└─ Agents: @pm (strategy), @ux (design), @dev (build), @content-wizard (copy)
```

**Opção 3: AI Agent Showcase**
```
├─ Frontend: Interactive demo de AIOS
├─ Backend: Showcase diferentes agents
├─ Features: Agent marketplace, collaboration demo
└─ Agents: ALL agents (showcase everything!)
```

**Escolha uma! E chamarei os agents**

### 4.2 Executar o Projeto (Fase by Fase)

```bash
# FASE 1: Planejamento (30 min)
@pm
*create-prd
# Morgan cria PRD baseada na sua ideia

@architect
*create-full-stack-architecture
# Aria desenha o sistema

# FASE 2: Product & Design (45 min)
@ux-design-expert
*research
# Uma faz user research

@ux-design-expert
*create-front-end-spec
# Uma cria spec detalhada

# FASE 3: Implementação (4 horas)
@dev
*develop story-1.1
*develop story-1.2
*develop story-1.3
# Dex implementa as stories

# FASE 4: QA & Testing (1 hora)
@qa
*create-suite story-1.1
*create-suite story-1.2
# Quinn testa tudo

# FASE 5: Deploy (30 min)
@github-devops
*create-pr
# Gage faz PR e deploy

# FASE 6: Documentação (30 min)
@aios-master
*document-project
# Orion documenta tudo
```

### 4.3 Resultados Esperados

Ao final do Dia 7, você terá:

```
✅ PROJETO COMPLETO
├─ ✅ PRD (Product Requirements Document)
├─ ✅ System Architecture (com diagramas)
├─ ✅ Design System (components, tokens)
├─ ✅ Frontend Code (React/Next.js)
├─ ✅ Backend Code (API, database)
├─ ✅ Tests (unit, integration, e2e)
├─ ✅ Deployment (live na web)
└─ ✅ Documentation (guides, API docs)

✅ NOVO CONHECIMENTO
├─ ✅ Como AIOS funciona (teoria + prática)
├─ ✅ Como orquestrar agents (squad patterns)
├─ ✅ Como criar expansion packs (reutilizar)
├─ ✅ Como usar design systems (components)
├─ ✅ Como deployar com CI/CD (GitHub Actions)
└─ ✅ Como cuidar de qualidade (CodeRabbit + tests)

✅ PORTFOLIO
├─ ✅ Código no GitHub (mostra aos recrutadores)
├─ ✅ Projeto deployado (live demo)
├─ ✅ Case study documentado
└─ ✅ Pronto para conversar sobre arquitetura
```

---

## 🧠 MÓDULO 5: DEEP DIVES & MESTRADO

### 5.1 Performance & Otimizações

#### Frontend Performance

```typescript
// ❌ Ruim: Re-renders desnecessários
const UserList = ({ users }) => {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

// ✅ Bom: Memoized components
const UserCard = React.memo(({ user }) => {
  return <div>{user.name}</div>;
});

const UserList = ({ users }) => {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

// ✅ Melhor: Virtualization (para 10k+ items)
import { FixedSizeList as List } from 'react-window';

const VirtualUserList = ({ users }) => {
  return (
    <List
      height={600}
      itemCount={users.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <UserCard user={users[index]} />
        </div>
      )}
    </List>
  );
};
```

#### Database Performance

```sql
-- ❌ N+1 Query Problem
SELECT * FROM users;
-- Para cada user:
SELECT * FROM posts WHERE user_id = ?;

-- ✅ Solução: Join
SELECT u.*, p.*
FROM users u
LEFT JOIN posts p ON u.id = p.user_id;

-- ✅ Solução: Índice
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- ✅ Solução: Caching
const getCachedUserPosts = async (userId) => {
  const cached = await redis.get(`user_posts:${userId}`);
  if (cached) return cached;

  const posts = await db.posts.find({ userId });
  await redis.set(`user_posts:${userId}`, posts, 3600); // 1 hour
  return posts;
};
```

#### API Performance

```typescript
// ❌ Ruim: Sem pagination
GET /api/posts
// Retorna 10,000 posts = 5MB response

// ✅ Bom: Com pagination
GET /api/posts?page=1&limit=20
// Retorna 20 posts = 50KB response

interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// ✅ Implementação
app.get('/api/posts', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    db.posts.find().skip(skip).limit(limit),
    db.posts.countDocuments()
  ]);

  res.json({
    data: posts,
    pagination: {
      current: page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
```

---

### 5.2 Security & Best Practices

#### Authentication Flow

```typescript
// Implementação segura de JWT

// 1. User faz login
POST /api/auth/login
Body: { email, password }

// 2. Server:
// - Verifica credentials
// - Gera JWT short-lived (15 min)
// - Gera refresh token long-lived (7 dias)
// - Salva refresh token em DB (hashed)

const tokens = {
  accessToken: jwt.sign(payload, SECRET, { expiresIn: '15m' }),
  refreshToken: crypto.randomBytes(32).toString('hex')
};

// 3. Client:
// - Salva accessToken em memory (seguro)
// - Salva refreshToken em httpOnly cookie (seguro)

// 4. Cada requisição:
// - Envia accessToken no header
// - Se expirou: usa refreshToken para pegar novo

// 5. Refresh token rotation:
POST /api/auth/refresh
Cookie: refreshToken=xyz
// Server:
// - Verifica token
// - Gera NOVO refresh token
// - Invalida token antigo
```

#### Password Hashing

```typescript
import bcrypt from 'bcrypt';

// Registrar
async function register(email: string, password: string) {
  // ✅ Bom
  const hashedPassword = await bcrypt.hash(password, 10);
  // Salva { email, password: hashedPassword }

  // ❌ Nunca faça
  // const hashedPassword = sha256(password); // Inseguro!
  // const hashedPassword = password; // Péssimo!
}

// Fazer login
async function login(email: string, password: string) {
  const user = await db.users.findOne({ email });
  if (!user) throw new Error('User not found');

  // Compara password com hash
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) throw new Error('Invalid password');

  return generateTokens(user);
}
```

#### CORS & CSRF Protection

```typescript
import cors from 'cors';
import helmet from 'helmet';

// Middleware de segurança
app.use(helmet()); // Headers de segurança
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// CSRF Token (para forms)
app.post('/api/user/update', (req, res) => {
  const csrfToken = req.body._csrf;

  if (!verifyCsrfToken(csrfToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Processa a requisição
});
```

---

### 5.3 Advanced Patterns

#### Event-Driven Architecture

```typescript
// Padrão: Event bus para desacoplamento

class EventBus {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

// Uso
const eventBus = new EventBus();

// User service emite evento
eventBus.on('user:created', async (user) => {
  // Email service ouve
  await emailService.sendWelcomeEmail(user);
});

eventBus.on('user:created', async (user) => {
  // Analytics service ouve
  await analytics.trackNewUser(user);
});

// Quando user é criado
const newUser = await userService.create({...});
eventBus.emit('user:created', newUser);
// 2 handlers executam automaticamente!
```

#### Repository Pattern

```typescript
// Abstração de acesso a dados

interface IUserRepository {
  create(data: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
  findAll(): Promise<User[]>;
}

// Implementação com MongoDB
class MongoUserRepository implements IUserRepository {
  async create(data: CreateUserDto): Promise<User> {
    return await UserModel.create(data);
  }

  async findById(id: string): Promise<User | null> {
    return await UserModel.findById(id);
  }
  // ...
}

// Implementação com PostgreSQL
class PostgresUserRepository implements IUserRepository {
  async create(data: CreateUserDto): Promise<User> {
    return await db.query('INSERT INTO users ...', [data]);
  }
  // ...
}

// Service usa abstração
class UserService {
  constructor(private repo: IUserRepository) {}

  async createUser(data: CreateUserDto) {
    const user = await this.repo.create(data);
    return user;
  }
}

// Trocar banco de dados sem mudar service!
const repo = new PostgresUserRepository();
const service = new UserService(repo);
```

---

## 📊 MÓDULO 6: FERRAMENTAS & CONEXÕES

### Seu Dia a Dia com AIOS

**Manhã (9:00-12:00): Planejamento & Design**

```bash
9:00-9:15
├─ @aios-master *status     # Ver tudo que temos
└─ Ler os stories do backlog

9:15-10:00
├─ @pm *create-prd         # Ou revisar PRD existente
└─ Coletar requirements

10:00-11:00
├─ @architect *create-full-stack-architecture
└─ Desenhar o sistema

11:00-12:00
├─ @ux-design-expert *research
└─ Entender users
```

**Tarde (13:00-17:00): Implementação**

```bash
13:00-13:30
├─ @dev *run-tests         # Verificar tudo está ok
└─ Review teste suite

13:30-16:00
├─ @dev *develop story-X.Y # Implementar
├─ (CodeRabbit executa auto)
└─ Dev marca story [x] quando pronto

16:00-16:30
├─ @qa *apply-qa-fixes     # Quinn faz review
└─ Se falhas, @dev corrige

16:30-17:00
├─ @github-devops *create-pr
└─ Merge para main
```

**Noite (opcional): Aprendizado**

```bash
├─ @analyst *brainstorm next-features
├─ @content-wizard *write-copy documentation
├─ @aios-master *kb (ler knowledge base)
└─ Estudar novos padrões
```

### Ferramentas Recomendadas

```
┌─────────────────────────────────────┐
│   DEVELOPMENT ENVIRONMENT           │
├─────────────────────────────────────┤
│ Terminal:                           │
│ ├─ iTerm2 / Terminal                │
│ ├─ Oh My Zsh (shell)                │
│ └─ Tmux (multisession)              │
│                                     │
│ Editor:                             │
│ ├─ VS Code (com extensions)         │
│ ├─ Claude Code (AI assistent)       │
│ └─ Git Graph (visualizar branches)  │
│                                     │
│ Database:                           │
│ ├─ DBeaver (query tool)             │
│ ├─ Postico (PostgreSQL UI)          │
│ └─ MongoDB Compass                  │
│                                     │
│ Testing:                            │
│ ├─ Jest (unit tests)                │
│ ├─ Cypress (e2e tests)              │
│ └─ CodeRabbit (code review)         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   DOCUMENTATION & COLLABORATION     │
├─────────────────────────────────────┤
│ ├─ Notion (knowledge base)          │
│ ├─ GitHub (code + issues + PRs)     │
│ ├─ Markdown (local docs)            │
│ ├─ Figma (design mockups)           │
│ └─ Loom (video recordings)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   DEPLOYMENT & MONITORING           │
├─────────────────────────────────────┤
│ ├─ Vercel (frontend)                │
│ ├─ Railway (backend)                │
│ ├─ GitHub Actions (CI/CD)           │
│ ├─ DataDog (monitoring)             │
│ └─ Sentry (error tracking)          │
└─────────────────────────────────────┘
```

### Integrações Específicas

**Git Workflow with AIOS:**

```bash
# 1. Feature branch
git checkout -b feature/user-auth
# Ou: git checkout -b story-1.1

# 2. Implementar
@dev *develop story-1.1

# 3. Commits (atomic)
git add .
git commit -m "feat: implement login form [Story 1.1]"
git commit -m "feat: add JWT generation [Story 1.1]"
git commit -m "test: add auth service tests [Story 1.1]"

# 4. Push
git push origin feature/user-auth

# 5. PR
@github-devops *create-pr
# Abre: PR do GitHub com sua story

# 6. Merge
@github-devops *merge-pr
# GitHub Actions roda:
# ├─ npm test
# ├─ npm run lint
# ├─ npm run typecheck
# ├─ Build docker image
# └─ Deploy para staging

# 7. Pronto!
main branch atualizado
Vercel auto-deploy para produção
```

---

## 🎓 MÓDULO 7: CHECKLIST DO EXPERT

### Semana 1 Completa (Seu Progresso)

```
DIA 1 - FUNDAÇÕES
[ ] Entender o que é AIOS (agents, squad, pack)
[ ] Ler CLAUDE.md (suas instruções globais)
[ ] Ativar @aios-master
[ ] Ler conhecimento base (*kb)
[ ] Explorar estrutura de diretórios (.aios-core/)
[ ] Criar seu Agent personalizado

DIA 2 - ORQUESTRAÇÃO
[ ] Criar uma Task para seu Agent
[ ] Executar sua primeira Task
[ ] Entender Stories & Tasks
[ ] Revisar uma Story existente
[ ] Fazer plano de trabalho (*plan)

DIA 3 - DESENVOLVIMENTO
[ ] Implementar primeira Story completa
[ ] Rodar testes (*run-tests)
[ ] Usar CodeRabbit review
[ ] Marcar tasks [x]
[ ] Fazer commit com seu agente

DIA 4 - CONTROLE DE QUALIDADE
[ ] Ativar @qa para revisar
[ ] Aplicar QA fixes
[ ] Rodar test suite completo
[ ] Documentar no GitHub
[ ] Revisar checklist story-dod-checklist

DIA 5 - SCALING
[ ] Criar um Expansion Pack
[ ] Entender padrões de código
[ ] Implementar design system
[ ] Usar CodeRabbit em projeto grande
[ ] Estruturar escalabilidade

DIA 6 - INTEGRAÇÕES
[ ] Conectar GitHub Actions
[ ] Setup Vercel deployment
[ ] Integrar feedback loops
[ ] Documentar fluxo completo
[ ] Teste com múltiplos agentes

DIA 7 - PROJETO FINAL
[ ] Planejar projeto (com PRD)
[ ] Desenhar arquitetura
[ ] Implementar 3+ stories
[ ] Testar tudo
[ ] Deployar
[ ] Documentar como case study
[ ] 🎉 CELEBRAR!
```

### Comandos Mais Importantes (Cheat Sheet)

```bash
# Master Orchestrator
@aios-master
*help                         # Ver tudo
*create agent {name}          # Novo agent
*create task {name}           # Nova task
*analyze-framework            # Estudar patterns
*list-components              # Ver tudo criado

# Product Manager
@pm
*create-prd                   # Criar PRD
*create-epic {name}           # Epic para feature

# Architect
@architect
*create-full-stack-architecture  # Design sistema
*analyze-project-structure    # Entender projeto

# Developer
@dev
*develop story-X.Y.Z          # Implementar story
*run-tests                    # Testar
*waves                        # Ver oportunidades paralelas

# QA
@qa
*create-suite story-X         # Testes
*apply-qa-fixes               # Aplicar feedback

# DevOps
@github-devops
*create-pr                    # Criar PR
*merge-pr                     # Merge

# Designer
@ux-design-expert
*research                     # User research
*create-front-end-spec        # Design spec
*build button                 # Criar component atômico

# Analyst
@analyst
*perform-market-research      # Pesquisar mercado
*brainstorm {topic}           # Ideação estruturada

# Custom Agent (Seu agent)
@content-wizard
*create-content-strategy      # Seu comando
*write-copy                   # Seu comando
```

### Red Flags (O Que NÃO Fazer)

```
❌ ANTI-PATTERNS

1. Ativar todos agents simultaneamente
   ✅ Melhor: Ativa 1 agent de cada vez

2. Editar stories diretamente (sem usar @dev)
   ✅ Melhor: @dev *develop story-X

3. Fazer commit sem rodar testes
   ✅ Melhor: @dev *run-tests, depois commit

4. Push direto para main
   ✅ Melhor: Feature branch → PR → @github-devops *merge-pr

5. Criar 10 agents sem usar
   ✅ Melhor: Create apenas agentes que você vai usar

6. Ignorar CodeRabbit warnings
   ✅ Melhor: Fixar CRITICAL issues antes de merge

7. Não documentar o que você criou
   ✅ Melhor: @aios-master *document-project

8. Mudar estrutura de .aios-core/
   ✅ Melhor: Respeitar framework, criar em docs/

9. Não usar Expansion Packs (repetir código)
   ✅ Melhor: *create-pack para padrões reutilizáveis

10. Terminar story sem testar aceitação
    ✅ Melhor: Rodar *run-tests, revisar acceptance criteria
```

---

## 🎬 FINAL: SEU CAMINHO DE OSCAR

```
SEMANA 1: Aprendizado Intensivo
├─ DIA 1-2: Fundações (teoria + setup)
├─ DIA 3-4: Orquestração básica (hands-on)
├─ DIA 5-6: Patterns avançados (deep dives)
└─ DIA 7: Masterpiece project (mostra seu talento)

RESULTADO:
├─ ✅ Você sabe orquestrar agents
├─ ✅ Você consegue criar projects Oscar-worthy
├─ ✅ Você domina AIOS framework
├─ ✅ Você tem portfolio impressionante
└─ ✅ Você está pronto para ensinar outros!

PRÓXIMOS PASSOS (Semana 2+):
├─ Criar expansion packs para vender
├─ Documentar sua metodologia
├─ Contribuir para comunidade AIOS
├─ Construir projetos cada vez maiores
└─ Ficar cada vez mais rápido! 🚀
```

---

## 📚 RECURSOS ADICIONAIS

### Documentação Oficial
- [Synkra AIOS Official Docs](https://aios-docs.synkra.ai/)
- [Claude Code Guide](https://claude.com/claude-code)
- [GitHub CLI Reference](https://cli.github.com/manual)

### Comunidade
- GitHub Discussions: AIOS Framework
- Discord Community: AI Orchestration
- YouTube: Agent Orchestration Tutorials

### Cursos Recomendados
- "Full-Stack Development with AIOS" (Udemy)
- "Design Systems Masterclass" (Brad Frost)
- "Advanced TypeScript Patterns" (Frontend Masters)

### Leitura Recomendada
- "System Design Interview" (Alex Xu)
- "Clean Architecture" (Robert C. Martin)
- "Designing Data-Intensive Applications" (Martin Kleppmann)

---

## 🏆 CONCLUSÃO

Parabéns! Você agora tem o **PLAYBOOK MASTERCLASS completo** para dominar AIOS em 7 dias.

**Lembre-se:**
- Cada agent é um especialista. Respeite suas responsabilidades
- Stories são a unidade de trabalho. Sempre trabalhe story-driven
- Qualidade vem primeiro. Roda tests, usa CodeRabbit, pede reviews
- Documenta tudo. Seu futuro "você" vai agradecer
- Expande com Packs. Não repita código, reutilize

**Sua jornada começa AGORA. Vamos criar algo extraordinário! 🎬✨**

---

**Maestro:** Claude Code
**Orquestra:** Synkra AIOS
**Diretor:** Você (Nelson Rodrigues)
**Ação:** *help

🎭 **"The show must go on!"** 🎭

