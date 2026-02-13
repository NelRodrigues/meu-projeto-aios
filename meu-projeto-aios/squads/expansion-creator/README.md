# 📦 Expansion Creator

**Create custom AIOS expansion packs for any domain.**

The Expansion Creator is an AIOS squad that helps you build, validate, and manage expansion packs—custom extensions that add domain-specific agents, tasks, templates, and workflows to your AIOS projects.

## 🎯 What It Does

| Feature | Description |
|---------|-------------|
| 📦 **Create Packs** | Build complete expansion packs from scratch |
| 👤 **Create Agents** | Add domain-specific AI agents to your pack |
| 📋 **Create Tasks** | Define executable workflows using task-first architecture |
| 📄 **Create Templates** | Build output templates for consistent formatting |
| ✅ **Validate Packs** | Automatic quality checks and validation |
| 📚 **List & Organize** | Manage and explore your expansion packs |

## 🚀 Quick Start

### 1. Activate the Agent

```bash
@expansion-creator
```

This activates the Expansion Pack Architect and shows available commands.

### 2. Create Your First Pack

```bash
*create-pack
```

Follow the interactive prompts to:
- Name your pack (e.g., `ecommerce-automation`)
- Describe its purpose
- Select your domain
- Choose initial components

### 3. Add Components

```bash
*create-agent --pack my-pack          # Add an agent
*create-task --pack my-pack           # Add a task
*create-template --pack my-pack       # Add a template
```

### 4. Validate Quality

```bash
*validate-pack my-pack
```

This checks your pack against AIOS standards.

### 5. See What You've Built

```bash
*list-packs
```

## 📋 Available Commands

All commands use the `*` prefix when agent is active:

| Command | Purpose |
|---------|---------|
| `*create-pack` | Create a complete expansion pack |
| `*create-agent` | Create an individual agent |
| `*create-task` | Create a task workflow |
| `*create-template` | Create output template |
| `*validate-pack` | Validate pack quality |
| `*list-packs` | List all your packs |
| `*chat-mode` | Conversational guidance |
| `*exit` | Exit expansion-creator |

## 📁 Pack Structure

Each expansion pack has this structure:

```
./expansion-packs/my-pack/
├── pack.yaml                    # Pack manifest
├── README.md                    # Documentation
├── agents/                      # Agent definitions
│   ├── agent1.md
│   └── agent2.md
├── tasks/                       # Task workflows
│   ├── task1.md
│   └── task2.md
├── templates/                   # Output templates
│   ├── template1.md
│   └── template2.md
├── workflows/                   # Multi-step workflows
├── checklists/                  # Quality checklists
└── data/                        # Static data
```

### pack.yaml Example

```yaml
name: ecommerce-automation
version: 1.0.0
description: Pack for e-commerce automation
author: Your Name
license: MIT
slashPrefix: ecommerce

aios:
  minVersion: "2.1.0"
  type: expansion-pack

components:
  agents:
    - order-processor.md
    - inventory-manager.md
  tasks:
    - process-order.md
    - update-inventory.md
  templates:
    - order-confirmation.md

tags:
  - ecommerce
  - automation
```

## 🏗️ Core Concepts

### 1. **Task-First Architecture**
All tasks are self-contained workflows with:
- Clear inputs and outputs
- Error handling
- Validation logic
- Unit test examples

### 2. **Domain-Focused Design**
Packs are focused on specific domains:
- ✅ Good: `ecommerce-automation`, `devops-ci-cd`
- ❌ Bad: Mixing unrelated domains

### 3. **Quality Assurance**
Built-in validation checks:
- ✅ Structure validation
- ✅ Manifest verification
- ✅ Documentation completeness
- ✅ Dependency checking

## 📚 Common Use Cases

### E-Commerce Automation
```bash
*create-pack ecommerce-automation
# Creates agents for order processing, inventory management, shipping
```

### DevOps CI/CD
```bash
*create-pack devops-ci-cd
# Creates agents for deployment, monitoring, alerting
```

### Content Creation
```bash
*create-pack content-creator
# Creates agents for writing, editing, publishing
```

### Data Processing
```bash
*create-pack data-pipeline
# Creates agents for ETL, validation, transformation
```

## ✅ Quality Standards

All packs must meet these standards:

- **Naming**: Kebab-case, descriptive
- **Documentation**: Comprehensive README, documented components
- **Structure**: All required directories present
- **Manifest**: Valid pack.yaml with all required fields
- **Components**: Tasks use task-first architecture
- **Testing**: Example tasks and error handling included

## 🔍 Validation

Run validation to check quality:

```bash
# Basic validation
*validate-pack my-pack

# Detailed validation
*validate-pack my-pack --detailed

# Strict validation (before publishing)
*validate-pack my-pack --strict
```

## 💡 Best Practices

### ✅ DO

- ✅ Start with `*create-pack` for guided creation
- ✅ Keep packs focused on one domain
- ✅ Document everything thoroughly
- ✅ Use task-first architecture
- ✅ Include examples and tests
- ✅ Validate before using
- ✅ Version your packs (semantic versioning)

### ❌ DON'T

- ❌ Mix multiple unrelated domains
- ❌ Skip documentation
- ❌ Use vague names
- ❌ Ignore validation errors
- ❌ Create circular dependencies
- ❌ Skip error handling in tasks
- ❌ Modify AIOS core files

## 🔗 Integration with AIOS

Expansion packs integrate seamlessly with:

- **@squad-creator**: For creating squads
- **@dev**: For implementing components
- **@qa**: For testing components
- **@devops**: For deploying packs
- **@architect**: For design review

## 📖 Documentation

- **AIOS User Guide**: `.aios-core/user-guide.md`
- **Squad Creator**: `.aios-core/development/agents/squad-creator.md`
- **Task Format**: `.aios-core/docs/standards/TASK-FORMAT-SPECIFICATION-V1.md`

## 🤝 Getting Help

| Need | Command |
|------|---------|
| See all commands | `*help` |
| Command help | `*help create-pack` |
| Guided creation | `*create-pack` |
| Chat guidance | `*chat-mode` |
| Examples | `*list-packs --detailed` |

## 📦 What's Included

This squad includes:

- 🎯 **6 Main Commands**: Create, validate, list, and manage packs
- 📋 **Task Definitions**: Executable workflows for each command
- 👤 **Agent Definition**: Expansion Pack Architect persona
- ✅ **Quality Checklist**: Standards for pack validation
- 📚 **Templates**: Pack and component templates
- 📖 **Documentation**: Comprehensive guides and examples

## 🚀 Next Steps

1. **Activate**: `@expansion-creator`
2. **Create**: `*create-pack`
3. **Build**: `*create-agent`, `*create-task`
4. **Validate**: `*validate-pack`
5. **List**: `*list-packs`
6. **Share**: Distribute your pack (coming soon!)

## 📄 License

MIT License - See pack.yaml for details

---

**Expansion Creator** — Custom AIOS packs made easy 📦
