# 📊 DASHBOARD DE PROGRESSO - 7 DIAS PARA EXPERT

**Seu Nome:** Nelson Rodrigues
**Data Início:** _______________
**Data Fim:** _______________
**Objetivo:** Dominar AIOS + Criar Projeto Oscar-worthy

---

## 🎯 OVERVIEW (Big Picture)

```
DIA    TEMA              OBJETIVO              STATUS    TEMPO ESTIMADO
─────────────────────────────────────────────────────────────────────
 1-2   FUNDAÇÕES         Entender AIOS            ⬜      4 horas
 3-4   ORQUESTRAÇÃO      Criar seu 1º Agent      ⬜      4 horas
 5-6   SCALING          Expansion Packs          ⬜      4 horas
 7     MASTERPIECE      Projeto real!            ⬜      8 horas

TOTAL: 20 horas de aprendizado intensivo
```

---

## 📅 DIA 1-2: FUNDAÇÕES

### Objetivos do Dia
- [ ] Entender o que é AIOS (agents, squad, packs)
- [ ] Ler CLAUDE.md (suas instruções globais)
- [ ] Familiarizar com estrutura de diretórios
- [ ] Primeiro contato com agents

### Tarefas Práticas

#### Dia 1 - Manhã (2h)

```
TAREFA 1: Setup & Leitura (45 min)
├─ [ ] Abrir PLAYBOOK_AIOS_MASTERCLASS.md
├─ [ ] Ler Módulo 1: Conceitos-chave (Agents, Squad, Pack)
├─ [ ] Tomar notas sobre diferenças
└─ [ ] Salvar notas em: docs/learning-notes/dia-1.md

TAREFA 2: Primeiro Agent (75 min)
├─ @aios-master
├─ [ ] Rodar: *help (ver lista de comandos)
├─ [ ] Rodar: *kb (aprender método AIOS)
├─ [ ] Rodar: *list-components (ver agents existentes)
└─ [ ] Tomar screenshot do resultado
```

#### Dia 1 - Tarde (2h)

```
TAREFA 3: Estudar Estrutura (60 min)
├─ [ ] Explorar .aios-core/ (ls -la)
├─ [ ] Entender: agents/, tasks/, templates/, workflows/
├─ [ ] Ler: .aios-core/core-config.yaml
└─ [ ] Documentar estrutura em: docs/learning-notes/estrutura.md

TAREFA 4: Deep Dive em 1 Agent (60 min)
├─ [ ] Escolha 1 agent (@architect ou @pm)
├─ [ ] Ler seu arquivo .md completo
├─ [ ] Mapear: persona, commands, dependencies
└─ [ ] Criar diagrama em: docs/learning-notes/agent-map.md
```

#### Dia 2 - Manhã (2h)

```
TAREFA 5: Ativar & Explorar (90 min)
├─ @pm
├─ [ ] Rodar: *help (ver comandos de PM)
├─ [ ] Rodar: *guide (ler guide completo)
├─ [ ] Entender quando usar @pm vs @architect
└─ [ ] Tomar nota das diferenças

TAREFA 6: Criar seu Agent (30 min)
├─ @aios-master
├─ [ ] Rodar: *create agent {seu-nome-agent}
├─ [ ] Escolha: 1 especialidade
├─ [ ] Resultado: novo arquivo em .aios-core/agents/
└─ [ ] Tirar screenshot do sucesso!
```

#### Dia 2 - Tarde (2h)

```
TAREFA 7: Experimentar Workflows (90 min)
├─ [ ] Ler: Módulo 2 (Stories & Tasks)
├─ [ ] Abrir um story existente: docs/stories/
├─ [ ] Entender: Tasks, Subtasks, Acceptance Criteria
├─ [ ] Mapear 1 story inteira em um diagrama
└─ [ ] Salvar em: docs/learning-notes/story-map.md

TAREFA 8: Primeiro Test (30 min)
├─ [ ] Ativar @aios-master
├─ [ ] Rodar: *status
├─ [ ] Ver projeto status
└─ [ ] Escrever reflexão: "O que significa cada status?"
```

### Checklist Dia 1-2

```
CONCEITUAL:
[ ] Entendo o que é um Agent
[ ] Entendo a diferença: Agent vs Task vs Story
[ ] Entendo Squad (múltiplos agents juntos)
[ ] Entendo Expansion Pack (reutilização)

PRÁTICO:
[ ] Rodei @aios-master *help
[ ] Rodei @aios-master *kb
[ ] Ativei @pm
[ ] Ativei @architect
[ ] Criei meu agent personalizado
[ ] Explorei .aios-core/ completo

DOCUMENTAÇÃO:
[ ] Criei: docs/learning-notes/dia-1.md
[ ] Criei: docs/learning-notes/estrutura.md
[ ] Criei: docs/learning-notes/agent-map.md
[ ] Criei: docs/learning-notes/story-map.md

NOTA PESSOAL (escrever sua compreensão):
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 📅 DIA 3-4: ORQUESTRAÇÃO BÁSICA

### Objetivos do Dia
- [ ] Criar uma Task para seu Agent
- [ ] Implementar seu primeiro Story
- [ ] Entender fluxo Story → Task → Code
- [ ] Rodar testes com sucesso

### Tarefas Práticas

#### Dia 3 - Manhã (2h)

```
TAREFA 1: Criar sua First Task (90 min)
├─ @aios-master
├─ [ ] Rodar: *create task minha-tarefa-1
├─ [ ] Arquivo criado em: .aios-core/tasks/minha-tarefa-1.md
├─ [ ] Estrutura:
│   ├─ Purpose (o que faz?)
│   ├─ Elicitation (perguntas ao user)
│   ├─ Instructions (step-by-step)
│   └─ Output (resultado)
└─ [ ] Salvar versão inicial em Git

TAREFA 2: Testar sua Task (30 min)
├─ [ ] Ativar seu agent
├─ [ ] Rodar seu comando customizado
├─ [ ] Verificar se funciona
└─ [ ] Fazer ajustes se necessário
```

#### Dia 3 - Tarde (2h)

```
TAREFA 3: Escolher & Estudar Story (60 min)
├─ [ ] Abrir: docs/stories/story-X.X.md (escolha 1 simples)
├─ [ ] Ler completamente
├─ [ ] Entender:
│   ├─ Story (o que é)
│   ├─ Acceptance Criteria (checklist)
│   ├─ Tasks (o que implementar)
│   └─ File List (arquivos envolvidos)
└─ [ ] Documentar em: docs/learning-notes/story-chosen.md

TAREFA 4: Preparar para Implementação (60 min)
├─ @architect (se story envolve design)
├─ [ ] Rodar: *analyze-project-structure
├─ [ ] Entender impacto da story
├─ [ ] Ver arquitetura relevante
└─ [ ] Tomar nota dos arquivos que vai mexer
```

#### Dia 4 - Manhã (2h)

```
TAREFA 5: Implementar com @dev (120 min)
├─ @dev
├─ [ ] Rodar: *develop story-X.X.X
├─ [ ] Seguir instruções de Dex
├─ [ ] Para CADA task:
│   ├─ Entender a tarefa
│   ├─ Implementar código
│   ├─ Rodar *run-tests
│   ├─ Se PASSOU: marcar [x]
│   └─ Se FALHOU: fixar e re-testar
├─ [ ] Todos tasks [x]?
└─ [ ] Story completa!

NOTA IMPORTANTE:
- CodeRabbit executa automaticamente
- Se aviso CRITICAL: @dev corrige
- Não pule tests! Rodar: npm test
```

#### Dia 4 - Tarde (2h)

```
TAREFA 6: QA Review (60 min)
├─ @qa
├─ [ ] Rodar: *create-suite story-X (testes)
├─ [ ] Revisar código quality
├─ [ ] Rodar: *apply-qa-fixes (se necessário)
└─ [ ] Aprovar story

TAREFA 7: Publicar & Documentar (60 min)
├─ @github-devops
├─ [ ] Rodar: *create-pr
├─ [ ] Verificar PR no GitHub
├─ [ ] Rodar: *merge-pr (merge!)
├─ @aios-master
├─ [ ] Rodar: *document-project
└─ [ ] Ver documentação atualizada
```

### Checklist Dia 3-4

```
IMPLEMENTAÇÃO:
[ ] Criei 1 Task para meu Agent
[ ] Testei minha Task
[ ] Escolhi uma Story simples
[ ] Li a Story completamente
[ ] Implementei todos tasks da Story
[ ] Rodar *run-tests (passou!)
[ ] CodeRabbit review feito
[ ] @qa aprovou a story

CÓDIGO & PROCESSO:
[ ] Fiz commits atômicos (git commit)
[ ] Criei PR via @github-devops
[ ] Código passou em todos checks
[ ] Story marcada como "Ready for Review"
[ ] Projeto documentado

NOTA PESSOAL (reflexão):
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 📅 DIA 5-6: SCALING & PATTERNS

### Objetivos do Dia
- [ ] Criar um Expansion Pack (reutilizável)
- [ ] Entender Design Systems & Padrões
- [ ] Integrar com múltiplas ferramentas
- [ ] Implementar 2-3 stories com padrões

### Tarefas Práticas

#### Dia 5 - Manhã (2h)

```
TAREFA 1: Estudar Padrões de Código (60 min)
├─ [ ] Ler: Módulo 3 (Design Systems & Padrões)
├─ [ ] Estudar:
│   ├─ Component Structure (Atomic Design)
│   ├─ Service Layer Pattern
│   ├─ Type Safety (TypeScript)
│   └─ Error Handling
├─ [ ] Criar exemplo em: docs/learning-notes/patterns.md
└─ [ ] Aplicar em seu projeto

TAREFA 2: Identificar Expansion Pack (60 min)
├─ [ ] Pense: "Qual padrão vou reutilizar?"
├─ [ ] Exemplos:
│   ├─ Auth System (reutiliza em 3 projetos)
│   ├─ API CRUD pattern (reutiliza)
│   ├─ Form validation (reutiliza)
│   └─ Design components (reutiliza)
├─ [ ] Escolha seu Pack
└─ [ ] Documente em: docs/learning-notes/pack-chosen.md
```

#### Dia 5 - Tarde (2h)

```
TAREFA 3: Criar seu Expansion Pack (90 min)
├─ @aios-master
├─ [ ] Rodar: *create-pack {seu-pack-name}
├─ [ ] Estrutura criada:
│   ├─ agents/
│   ├─ tasks/
│   ├─ templates/
│   └─ docs/
├─ [ ] Adicionar 2-3 agents
├─ [ ] Adicionar 3-5 tasks
└─ [ ] Documentar em: expansion-packs/{seu-pack}/README.md

TAREFA 4: Testar seu Pack (30 min)
├─ [ ] Em um novo branch/projeto
├─ [ ] Rodar: @aios-master *load-pack seu-pack-name
├─ [ ] Verificar se carrega corretamente
├─ [ ] Executar 1 tarefa do pack
└─ [ ] Confirmar que funciona!
```

#### Dia 6 - Manhã (2h)

```
TAREFA 5: Implementar com Padrões (120 min)
├─ [ ] Escolha 2 stories diferentes
├─ @dev
├─ [ ] Story 1: Use Atomic Design components
├─ [ ] Story 2: Use Service Layer pattern
├─ [ ] Ambas com:
│   ├─ Type Safety (TypeScript)
│   ├─ Error Handling correto
│   ├─ Tests completos
│   └─ CodeRabbit aprovado
├─ [ ] Ambo prontas para merge
└─ [ ] Documentar padrões usados
```

#### Dia 6 - Tarde (2h)

```
TAREFA 6: Integração com Ferramentas (60 min)
├─ [ ] Setup GitHub Actions
│   ├─ npm test roda on push
│   ├─ Lint check
│   └─ TypeScript check
├─ [ ] Setup Vercel deployment
│   ├─ Auto-deploy on merge
│   └─ Preview environments
├─ [ ] Verificar integração CodeRabbit
└─ [ ] Tudo funcionando?

TAREFA 7: Documentação & Cleanup (60 min)
├─ [ ] @aios-master *document-project
├─ [ ] Revisar todos arquivos criados
├─ [ ] Atualizar expansion-pack README
├─ [ ] Commit: "docs: consolidate learnings [Days 5-6]"
└─ [ ] Push & Merge
```

### Checklist Dia 5-6

```
PADRÕES & DESIGN:
[ ] Li Módulo 3 (Padrões)
[ ] Entendo Atomic Design
[ ] Entendo Service Layer
[ ] Entendo Type Safety
[ ] Entendo Error Handling

EXPANSION PACK:
[ ] Criei um Expansion Pack
[ ] Adicionei 2+ agents
[ ] Adicionei 3+ tasks
[ ] Testei meu pack
[ ] Documentei completamente

IMPLEMENTAÇÃO:
[ ] Implementei 2 stories com padrões
[ ] Todas com testes
[ ] Todas com CodeRabbit OK
[ ] Todas com PR merged

INTEGRAÇÕES:
[ ] GitHub Actions setup
[ ] Vercel deployment working
[ ] CodeRabbit integrado
[ ] Database migrated (se needed)

NOTA PESSOAL:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 📅 DIA 7: PROJETO OSCAR-WORTHY

### O Grande Dia!

```
OPÇÕES (escolha 1):

OPÇÃO A: Task Management App
├─ Frontend: React + TypeScript + Tailwind
├─ Backend: Node + PostgreSQL
├─ Features: Auth, CRUD, sharing, real-time
└─ Agents: @pm, @architect, @dev, @qa

OPÇÃO B: Content Hub (Seu Portfólio)
├─ Frontend: Next.js + Design System
├─ Backend: Next.js API + MongoDB
├─ Features: Blog, portfolio, contact, analytics
└─ Agents: @pm, @ux-design-expert, @dev, @qa

OPÇÃO C: AI Agent Showcase
├─ Demo interativa de AIOS
├─ Showcase de diferentes agents
├─ Features: Agent marketplace, live demo
└─ Agents: TUDO (mostra seu domínio!)
```

### Cronograma do Dia 7

```
8:00-9:00    PLANEJAMENTO (1h)
├─ @pm *create-prd
├─ Escolha seu projeto
└─ Define requirements

9:00-10:00   DESIGN & ARQUITETURA (1h)
├─ @architect *create-full-stack-architecture
├─ @ux-design-expert *research (user research)
└─ Wireframes & specs

10:00-11:00  UX & DESIGN SYSTEM (1h)
├─ @ux-design-expert *create-front-end-spec
├─ Setup design tokens
└─ Component library started

11:00-15:00  IMPLEMENTAÇÃO (4h)
├─ @dev *develop story-1.1
├─ @dev *develop story-1.2
├─ @dev *develop story-1.3
└─ CodeRabbit checks auto

15:00-16:00  QA & TESTING (1h)
├─ @qa *create-suite story-1.1/1.2/1.3
├─ @qa *apply-qa-fixes (se needed)
└─ Todos testes passando

16:00-17:00  DEPLOYMENT & DOCS (1h)
├─ @github-devops *create-pr
├─ @github-devops *merge-pr
├─ @aios-master *document-project
└─ GitHub Actions deploya

17:00-18:00  CELEBRAÇÃO (1h)
├─ Verificar projeto live
├─ Tirar screenshots
├─ Escrever case study
└─ 🎉 VOCÊ FEZ! 🎉
```

### Tasks do Dia 7

```
FASE 1: PLANEJAMENTO (9h-9:30a)
────────────────────────────────
[ ] Decidir qual projeto
[ ] Escrever PRD (com @pm)
[ ] Listar acceptance criteria
[ ] Estimar effort

FASE 2: DESIGN (9:30a-10:30a)
────────────────────────────────
[ ] Desenhar arquitetura (com @architect)
[ ] Fazer user research (com @ux)
[ ] Criar wireframes
[ ] Definir design system

FASE 3: IMPLEMENTAÇÃO (10:30a-3p)
────────────────────────────────
Task 1: Authentication
├─ [ ] Create backend auth endpoints
├─ [ ] Frontend login/register forms
├─ [ ] JWT implementation
└─ [ ] Tests passing ✅

Task 2: Core Feature
├─ [ ] API endpoints
├─ [ ] Database schema
├─ [ ] Frontend components
└─ [ ] Tests passing ✅

Task 3: Polish & Integration
├─ [ ] Error handling
├─ [ ] Loading states
├─ [ ] Edge cases
└─ [ ] Tests passing ✅

FASE 4: QA (3p-4p)
────────────────────────────────
[ ] Run full test suite
[ ] CodeRabbit review
[ ] @qa approval
[ ] Security audit

FASE 5: DEPLOYMENT (4p-5p)
────────────────────────────────
[ ] Create PR
[ ] GitHub Actions pass
[ ] Merge to main
[ ] Vercel auto-deploy ✅
[ ] Site live! 🎉

FASE 6: DOCUMENTAÇÃO (5p-6p)
────────────────────────────────
[ ] Auto-generate with @aios-master
[ ] Write case study
[ ] Create demo video (optional)
[ ] Share on GitHub
```

### Deliverables Dia 7

Ao final, você terá:

```
✅ CÓDIGO
├─ GitHub repository (público)
├─ Full-stack application
├─ ~500+ lines of production code
├─ 100% test coverage
└─ CodeRabbit approved

✅ DEPLOYMENT
├─ Live website (Vercel/Railway)
├─ CI/CD pipeline (GitHub Actions)
├─ Automated tests running
└─ Performance optimized

✅ DOCUMENTAÇÃO
├─ Project README
├─ API documentation
├─ Component library docs
├─ Case study (como você fez)
└─ Architecture diagram

✅ PORTFOLIO
├─ GitHub profile updated
├─ Live demo link
├─ Case study on your site
└─ Ready to share with world!
```

### Checklist Final Dia 7

```
PLANEJAMENTO:
[ ] PRD criado
[ ] Arquitetura desenhada
[ ] Design spec definida
[ ] Stories criadas

IMPLEMENTAÇÃO:
[ ] 3+ stories implementadas
[ ] 100% acceptance criteria met
[ ] Todos testes passando
[ ] CodeRabbit approved

QA:
[ ] Full test suite running
[ ] @qa approval
[ ] Security audit clean
[ ] Performance metrics good

DEPLOYMENT:
[ ] PR criado e mergedo
[ ] GitHub Actions passing
[ ] Site deployado & live
[ ] Tudo funcionando

DOCUMENTAÇÃO:
[ ] README completo
[ ] API docs
[ ] Architecture docs
[ ] Case study escrito

REFLEXÃO FINAL:
Escreva 3-5 parágrafos sobre sua experiência:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 🏆 CERTIFICADO DE CONCLUSÃO

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🎓 AIOS EXPERT BOOTCAMP - COMPLETION CERTIFICATE 🎓    ║
║                                                               ║
║     This certifies that                                       ║
║                                                               ║
║            NELSON RODRIGUES                                   ║
║                                                               ║
║     has successfully completed the 7-Day Intensive Bootcamp   ║
║     in Synkra AIOS Orchestration & Full-Stack Development    ║
║                                                               ║
║     SKILLS ACQUIRED:                                          ║
║     ✅ Agent Orchestration & Squad Management                 ║
║     ✅ Story-Driven Development Methodology                   ║
║     ✅ Multi-Agent Collaboration Patterns                     ║
║     ✅ Expansion Pack Creation & Reusability                  ║
║     ✅ Design Systems & Atomic Design                         ║
║     ✅ Full-Stack Implementation (Frontend + Backend)         ║
║     ✅ Quality Assurance & Code Review                        ║
║     ✅ CI/CD Deployment & DevOps                              ║
║     ✅ Performance Optimization & Security                    ║
║     ✅ Production-Ready Development Standards                 ║
║                                                               ║
║     PROJECTS COMPLETED:                                       ║
║     • Personal Agent: ___________________________              ║
║     • Expansion Pack: ___________________________              ║
║     • Final Project: ___________________________               ║
║                                                               ║
║     Issued: _______________                                   ║
║     Signed: Claude Code                                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📞 SUPORTE DURANTE OS 7 DIAS

**Se ficar preso:**

```
Problem                         Solution
─────────────────────────────────────────────────────────────
Agent não responde              @aios-master *status
❌ Tests falhando              @dev *run-tests (debug)
❌ CodeRabbit complaining      @dev (auto-fix) ou consulte issue
❌ PR não merge                @github-devops *status
❌ Não entendo conceito         Re-leia Módulo X, pedir *explain
❌ Story muito complexa         Break into smaller stories
❌ Integração não funciona      Verificar .env, credentials
❌ Deployar falhou              Check GitHub Actions logs
```

**Recursos:**
- PLAYBOOK (sua bíblia): `/Users/admin/meu-projeto-aios/PLAYBOOK_AIOS_MASTERCLASS.md`
- CLAUDE.md (instruções): `.claude/CLAUDE.md`
- Agent Guides: Rode `*guide` em cada agent
- Knowledge Base: `@aios-master *kb`

---

## 🚀 VÃO! VAMOS COMEÇAR

```
DIA 1 AGORA:

$ @aios-master
👑 Orion (Master Orchestrator) ready. Let's orchestrate!

$ *kb
[loads AIOS knowledge base]

$ *list-components
[mostra todos agents, tasks, templates]

$ *status
[mostra projeto status]

PRÓXIMO: Ler PLAYBOOK Módulo 1
DEPOIS: Dia 1 tarefas práticas acima
```

**Boa sorte, Nelson! Você vai dominar AIOS em 7 dias! 🚀**

---

**Remember:**
- 📖 Sempre leia antes de agir
- 🤖 Respeite cada agent e sua especialidade
- ✅ Roda testes, não pula!
- 💾 Commit frequente, mensagens claras
- 📚 Documenta enquanto aprende
- 🎯 Foco em completar (não perfeição)

**LET'S GOOOOO! 🎬✨**
