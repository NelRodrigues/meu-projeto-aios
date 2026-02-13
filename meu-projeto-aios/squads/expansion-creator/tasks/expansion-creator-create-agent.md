---
task: Create Agent
responsavel: "@expansion-creator"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *create-agent

Create an individual agent for an expansion pack.

## Uso

```bash
*create-agent
# → Interactive mode

*create-agent --pack my-pack --name my-agent
# → Direct mode

*create-agent --pack my-pack --template specialist
# → Use predefined template
```

## Elicitação

```
? Which pack to add agent to?
my-domain-pack

? Agent name (kebab-case):
data-processor

? Agent title:
Data Processor Agent

? Archetype:
- Builder
- Analyst
- Specialist
- Coordinator

? Communication tone:
- systematic
- friendly
- technical
- concise

? Add signature command? (Y/n)
Y

? Example task for agent? (Y/n)
Y
```

## Output

```
./expansion-packs/my-pack/agents/my-agent.md
```

Agent file includes:
- Persona definition
- Commands and workflows
- Communication style
- Example tasks
- Integration points

## Agent Template

```markdown
---
agent: my-agent
title: Agent Title
icon: "🔧"
aliases: ["alias1", "alias2"]
---

# Agent Name

I'm your ... Agent. I help you ...

## Persona

- **Role:**
- **Style:**
- **Expertise:**

## Commands

| # | Command | Description |
|---|---------|-------------|
| 1 | *command-name | Description |

## Quick Start

Your quick start guide here.
```

## Related

- `*create-pack` - Create expansion pack
- `*create-task` - Create task for agent
- `*validate-pack` - Validate pack
