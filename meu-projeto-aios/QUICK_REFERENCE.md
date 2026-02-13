# ⚡ QUICK REFERENCE - AIOS Cheat Sheet

**Print this or pin on your wall!**

---

## 🎭 THE 9 AGENTS (Quick Summary)

```
👑 @aios-master (Orion)        🏛️ @architect (Aria)         📋 @pm (Morgan)
├─ Orchestrate everything      ├─ System design              ├─ Create PRD
├─ Create components            ├─ Tech stack                ├─ Plan product
└─ Run workflows               └─ Performance               └─ Strategy

💻 @dev (Dex)                  ✅ @qa (Quinn)               🎨 @ux-design-expert (Uma)
├─ Implement code              ├─ Test & QA                 ├─ User research
├─ Write tests                 ├─ Code review               ├─ Design systems
└─ Fix bugs                    └─ Validation               └─ Components

🔍 @analyst (Atlas)            🌊 @data-engineer (Darcy)    🚀 @github-devops (Gage)
├─ Market research             ├─ Database design           ├─ Git operations
├─ Brainstorm                  ├─ Query optimization        ├─ CI/CD
└─ Competitive analysis        └─ Data pipelines           └─ Deployment
```

---

## 📍 WHEN TO USE EACH AGENT

```
I need to...                                    USE THIS AGENT
────────────────────────────────────────────────────────────────
Create a PRD                                    @pm *create-prd
Design system architecture                      @architect *create-full-stack-architecture
Implement a feature/story                       @dev *develop story-X.Y.Z
Test & review code quality                      @qa *create-suite story-X
User research & design specs                    @ux-design-expert *research
Market research & insights                      @analyst *perform-market-research
Database schema & queries                       @data-engineer (consult @architect)
Push code & create PR                          @github-devops *create-pr
Create new Agent/Task/Workflow                 @aios-master *create agent/task/workflow
Understand AIOS framework                       @aios-master *kb
```

---

## ⌨️ MOST USED COMMANDS (Copy-Paste)

### Master Orchestrator
```bash
@aios-master                    # Activate
*help                           # Show all commands
*kb                             # Learn AIOS method
*status                         # Project status
*create agent {name}            # New agent
*create task {name}             # New task
*create workflow {name}         # New workflow
*list-components                # See everything
*analyze-framework              # Study patterns
*validate-component {name}      # Security check
*document-project               # Auto-docs
```

### Developer (Most Used!)
```bash
@dev                            # Activate
*develop story-1.1.1            # Implement story
*run-tests                      # Test everything
*apply-qa-fixes                 # Fix issues
*create-service                 # New service
*backlog-debt                   # Log tech debt
*session-info                   # Debug info
```

### QA
```bash
@qa                             # Activate
*create-suite story-X           # Test story
*apply-qa-fixes                 # Apply feedback
*execute-checklist              # Run checklist
```

### Product Manager
```bash
@pm                             # Activate
*create-prd                     # Create PRD
*create-epic {name}             # Epic for feature
*create-story                   # Story
*research {topic}               # Market research
```

### Architect
```bash
@architect                      # Activate
*create-full-stack-architecture # System design
*analyze-project-structure      # Project analysis
*document-project               # Generate docs
```

### GitHub DevOps
```bash
@github-devops                  # Activate
*create-pr                      # Create pull request
*merge-pr                       # Merge to main
```

### UX Designer
```bash
@ux-design-expert               # Activate
*research                       # User research
*wireframe                      # Create wireframes
*create-front-end-spec          # Spec document
*audit {path}                   # Pattern audit
*tokenize                       # Extract tokens
*build {component}              # Build component
```

### Analyst
```bash
@analyst                        # Activate
*perform-market-research        # Research market
*brainstorm {topic}             # Ideation
*create-project-brief           # Brief doc
```

---

## 🎯 THE WORKFLOW (Copy This!)

```
1️⃣  PLAN
    @pm *create-prd                    → PRD document
    @architect *analyze-project-structure → Impact analysis

2️⃣  DESIGN
    @architect *create-full-stack-architecture → Architecture
    @ux-design-expert *research        → User research
    @ux-design-expert *create-front-end-spec → Design spec

3️⃣  IMPLEMENT
    @dev *develop story-1.1            → Code + Tests
    (CodeRabbit auto-reviews)

4️⃣  QUALITY
    @qa *create-suite story-1.1        → Test suite
    @qa *apply-qa-fixes                → Feedback (if needed)

5️⃣  DEPLOY
    @github-devops *create-pr          → Create PR
    @github-devops *merge-pr           → Merge & deploy

6️⃣  DOCUMENT
    @aios-master *document-project     → Auto-docs

✅ DONE!
```

---

## 📁 DIRECTORY STRUCTURE (Quick Map)

```
meu-projeto-aios/
│
├── .aios-core/                 ← Framework (read-only)
│   ├── agents/                 (definitions: @pm.md, @dev.md, etc)
│   ├── tasks/                  (executables: create-doc.md, etc)
│   ├── templates/              (YAML & code templates)
│   ├── workflows/              (multi-step workflows)
│   └── checklists/             (validation checklists)
│
├── docs/                       ← Your documentation
│   ├── stories/                (user stories: story-1.1.md)
│   ├── prd/                    (product docs)
│   ├── architecture/           (system design)
│   ├── guides/                 (learning guides)
│   └── learning-notes/         (YOUR NOTES!)
│
├── src/                        ← Your code
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── lib/
│   └── types/
│
├── expansion-packs/            ← Reusable packages
│   └── your-pack/
│       ├── agents/
│       ├── tasks/
│       └── templates/
│
├── package.json
├── .env                        (NEVER COMMIT!)
├── PLAYBOOK_AIOS_MASTERCLASS.md  ← Read this!
├── PROGRESS_DASHBOARD_7DAYS.md   ← Track progress
└── QUICK_REFERENCE.md            ← You are here!
```

---

## 🔴 RED FLAGS (Don't Do These!)

```
❌ Activate all agents at once            → Use 1 at a time
❌ Edit stories manually                  → Use @dev *develop
❌ Commit without running tests           → @dev *run-tests first
❌ Push directly to main                  → Use PR workflow
❌ Ignore CodeRabbit warnings             → Fix CRITICAL issues
❌ Create 10 agents without using them   → Only create what you need
❌ Modify .aios-core/ files              → Don't, it's framework
❌ Forget to document                     → @aios-master *document-project
❌ Skip tests "I'll add later"           → NO! Test NOW
❌ Don't update File List in story        → Always update it
```

---

## 🟢 BEST PRACTICES (Do These!)

```
✅ Read PLAYBOOK first                   → Understand before acting
✅ Activate 1 agent, complete task       → Then switch
✅ Run tests before commit               → @dev *run-tests
✅ Use feature branches                  → git checkout -b feature/X
✅ Make atomic commits                   → 1 feature = 1 commit
✅ Update File List after code changes  → In story file
✅ Mark tasks [x] when done             → Checkbox progress
✅ Run CodeRabbit review                → Before PR
✅ Write good PR descriptions           → Explain changes
✅ Document as you go                    → Not at the end
✅ Update README for new features        → Keep docs fresh
✅ Take screenshots of progress          → Show your work!
```

---

## 💾 GIT WORKFLOW (Quick Reference)

```bash
# 1. Create feature branch
git checkout -b feature/user-auth

# 2. Make changes & commit frequently
git add .
git commit -m "feat: implement login form [Story 1.1]"

# 3. Run tests before push
@dev *run-tests

# 4. Push to remote
git push origin feature/user-auth

# 5. Create PR via AIOS
@github-devops *create-pr

# 6. Merge when approved
@github-devops *merge-pr

# 7. Switch to main
git checkout main
git pull origin main

# 8. Delete feature branch
git branch -d feature/user-auth
```

---

## 🧪 TESTING COMMANDS

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/services/auth.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Via @dev
@dev *run-tests
```

---

## 📊 STORY FILE STRUCTURE (Template)

```markdown
# story-1.1.md: "Feature Name"

## Story
As a [user], I want to [action] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Tasks

### Task 1.1.1: Design
- [ ] Subtask 1
- [ ] Subtask 2

### Task 1.1.2: Implement
- [ ] Subtask 1
- [ ] Subtask 2

### Task 1.1.3: Test
- [ ] Unit tests
- [ ] Integration tests

## File List
- `src/new-file.ts` (NEW)
- `src/modified-file.ts` (MODIFIED)

## Dev Notes
- Important considerations
- Design decisions

## Status
- [ ] Draft
- [x] Ready for Dev
- [ ] In Progress
- [ ] Ready for Review
```

---

## 🎯 EXPAND PACK STRUCTURE (Template)

```
expansion-pack-{name}/
│
├── agents/
│   ├── {agent1}.md
│   └── {agent2}.md
│
├── tasks/
│   ├── setup.md
│   ├── feature1.md
│   └── feature2.md
│
├── templates/
│   ├── api-spec.yaml
│   └── schema.yaml
│
├── docs/
│   └── README.md (how to use)
│
└── package.json
    {
      "name": "@aios/expansion-pack-{name}",
      "version": "1.0.0",
      "description": "...",
      "author": "Nelson Rodrigues"
    }
```

---

## 🔐 ENVIRONMENT VARIABLES (Example)

```bash
# .env (NEVER COMMIT THIS!)

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key-here
REFRESH_TOKEN_SECRET=another-secret

# APIs
STRIPE_KEY=sk_test_...
OPENAI_API_KEY=sk-...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=YourApp

# Deployment
VERCEL_TOKEN=vercel_...
```

---

## 📈 COMMON TERMINAL COMMANDS

```bash
# Navigation
cd meu-projeto-aios              # Go to project
ls -la                           # List files
pwd                              # Current directory

# Git
git status                       # Check changes
git log                          # See commits
git diff                         # See changes
git branch -a                    # List branches

# Node/npm
npm install                      # Install deps
npm run dev                      # Start dev server
npm test                         # Run tests
npm run build                    # Build project
npm run typecheck                # Check TypeScript
npm run lint                     # Lint code

# VS Code
code .                           # Open in VS Code
cmd + p                          # Quick file search
cmd + /                          # Toggle comment
cmd + b                          # Toggle sidebar
```

---

## 🆘 TROUBLESHOOTING (Quick Fixes)

```
Problem                          Solution
────────────────────────────────────────────────────────────
Agent not responding             @aios-master *status
                                 Check if agent is activated

Tests failing                    @dev *run-tests
                                 Read error message carefully
                                 Check recent changes

CodeRabbit warning              Read the issue
                                 @dev auto-fixes CRITICAL
                                 Manual fix for others

PR won't merge                  Check GitHub Actions status
                                 All checks must pass
                                 Get @qa approval

TypeScript errors               npm run typecheck
                                 Fix type mismatches
                                 Add proper types

Build fails                      npm run build
                                 Check for syntax errors
                                 Clear node_modules & reinstall

Deployment stuck                Check Vercel/Railway logs
                                 @github-devops *status

Can't find file                 Use Glob or grep
                                 Don't use find/grep directly

Git merge conflict              Resolve manually
                                 @dev can help
                                 Don't force push!
```

---

## 📞 WHEN YOU'RE STUCK

```
STEP 1: BREATHE
       You got this! 🎯

STEP 2: READ ERROR MESSAGE
       95% of solutions are in the error

STEP 3: CHECK PLAYBOOK
       Likely covered in Module 1-7
       Use Ctrl+F to search

STEP 4: ASK YOUR AGENTS
       @aios-master *kb
       @{agent} *guide
       @{agent} *explain

STEP 5: TRY AGAIN
       Usually works 2nd time

STEP 6: DOCUMENT IT
       Add to docs/learning-notes/
       Help future-you!
```

---

## 🏆 REMEMBER

```
✨ Your 7-Day Journey ✨

DIA 1-2  →  Entender AIOS
DIA 3-4  →  Criar seu Agent
DIA 5-6  →  Expansion Pack
DIA 7    →  Masterpiece! 🎬

RESULTADO: Expert em orquestração de Agents
PORTFOLIO: Projetos incríveis em GitHub
PRÓXIMO: Ensinar outros! 📚

You got this, Nelson! 🚀
```

---

**Keep this open while learning!**

Imprima, cole na parede, coloque como wallpaper - use sempre que precisar!

🎭 **KEEP BUILDING! LET'S GO!** 🎭
