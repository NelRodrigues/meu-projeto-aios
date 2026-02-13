---
template: expansion-pack-template
format: markdown
version: 1.0.0
description: Template for creating new expansion packs
---

# Expansion Pack Template

Use this template as a starting point for creating new expansion packs.

## pack.yaml Template

```yaml
name: {pack-name}
version: {version}
description: "{pack-description}"
author: "{your-name}"
license: MIT
slashPrefix: {slashPrefix}

aios:
  minVersion: "2.1.0"
  type: expansion-pack

components:
  agents:
    # List agent files here
    - example-agent.md
  tasks:
    # List task files here
    - example-task.md
  templates:
    # List template files here
    - example-template.md
  workflows: []
  checklists: []
  scripts: []

tags:
  - {tag1}
  - {tag2}

dependencies:
  node: []
  python: []
  squads: []
```

## README.md Template

```markdown
# {Pack Name}

{One-line description}

## What It Does

- {Feature 1}
- {Feature 2}
- {Feature 3}

## Quick Start

### Installation

\`\`\`bash
# Clone or copy to ./expansion-packs/{pack-name}
\`\`\`

### Activation

\`\`\`bash
@{agent-name}
\`\`\`

### First Command

\`\`\`bash
*{command-name}
\`\`\`

## Components

### Agents

| Agent | Purpose |
|-------|---------|
| {agent-name} | {description} |

### Tasks

| Task | Agent | Purpose |
|------|-------|---------|
| {task-name} | {agent-name} | {description} |

### Templates

| Template | Format | Purpose |
|----------|--------|---------|
| {template-name} | markdown | {description} |

## Usage Examples

### Example 1: {Use Case 1}

\`\`\`bash
@{agent-name}
*{command-1}
→ Follow prompts
\`\`\`

### Example 2: {Use Case 2}

\`\`\`bash
@{agent-name}
*{command-2}
\`\`\`

## Configuration

Configure in {agent-name} or pack.yaml:

| Setting | Default | Description |
|---------|---------|-------------|
| {setting1} | {value1} | {description} |
| {setting2} | {value2} | {description} |

## Architecture

Pack follows task-first architecture:

\`\`\`
{agent-name}
  ├── {task-1}
  ├── {task-2}
  └── {task-3}
\`\`\`

## Requirements

- AIOS 2.1.0+
- Node.js 18+
- {Any other requirements}

## Installation

1. Copy to \`./expansion-packs/{pack-name}\`
2. Add to \`.aios/config.yaml\`
3. Run \`*validate-pack {pack-name}\`
4. Activate: \`@{agent-name}\`

## Testing

Test each component:

\`\`\`bash
@{agent-name}
*{command-name}
→ Verify output
\`\`\`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| {Issue 1} | {Solution} |
| {Issue 2} | {Solution} |

## Contributing

To contribute improvements:

1. Fork pack locally
2. Make changes
3. Test thoroughly
4. Submit feedback

## License

MIT License - See pack.yaml

## Support

- 📧 Email: {email}
- 🐛 Issues: {issue-tracker}
- 💬 Discussions: {discussion-link}

---

**Created with Expansion Creator** 📦
```

## Agent Template

```markdown
---
agent: {agent-name}
title: {Agent Title}
icon: "{emoji}"
aliases: ["{alias1}", "{alias2}"]
whenToUse: "{When to use this agent}"
type: specialized
---

# {Agent Title}

I'm your {Agent Title}. I help you {primary purpose}.

## Persona

- **Role:** {Role description}
- **Style:** {Communication style}
- **Expertise:** {Areas of expertise}
- **Focus:** {Main focus areas}

## Commands

| # | Command | Description |
|---|---------|-------------|
| 1 | *{command-1} | {Description} |
| 2 | *{command-2} | {Description} |
| 3 | *{command-3} | {Description} |

## Quick Start

### First Task

\`\`\`bash
*{command-1}
\`\`\`

## Examples

### Example 1: {Scenario}

\`\`\`bash
*{command} --option value
→ Expected output
\`\`\`

## Configuration

Configure via:
- pack.yaml settings
- Environment variables
- Interactive prompts

## Requirements

- {Requirement 1}
- {Requirement 2}

---

*{Agent Name} Agent*
```

## Task Template

```markdown
---
task: {Task Name}
responsavel: "@{agent-name}"
responsavel_type: agent
atomic_layer: task
elicit: {true/false}
---

# *{task-name}

{Brief description of task}

## Uso

\`\`\`bash
*{task-name}
# → {What this does}

*{task-name} --option value
# → {Variant}
\`\`\`

## Elicitação (if elicit: true)

\`\`\`
? {Question 1}
{Example answer}

? {Question 2}
{Example answer}
\`\`\`

## Flow

\`\`\`
1. {Step 1}
   → {Sub-step}
2. {Step 2}
   → {Sub-step}
3. {Step 3}
\`\`\`

## Output

Expected output format:

\`\`\`
{Output example}
\`\`\`

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| {Error 1} | {Cause} | {Fix} |

## Examples

### Example 1: {Scenario}

\`\`\`bash
*{task-name}
→ {Output}
\`\`\`

## Related

- \`*{related-command}\` - {Description}
- \`*{related-command}\` - {Description}
```

## Variables

### Pack Variables

- `{pack-name}` - Kebab-case name (e.g., ecommerce-automation)
- `{version}` - Semantic version (e.g., 1.0.0)
- `{pack-description}` - One-line description
- `{your-name}` - Author name
- `{slashPrefix}` - Slash command prefix
- `{tag1}, {tag2}` - Tags for organization

### Agent Variables

- `{agent-name}` - Kebab-case agent name
- `{Agent Title}` - Proper case title
- `{emoji}` - Relevant emoji
- `{Role}` - Agent's role
- `{Style}` - Communication style

### Task Variables

- `{task-name}` - Kebab-case task name
- `{Task Name}` - Proper case name
- `{elicit}` - true or false

## Tips

- ✅ Replace all `{variables}` with actual values
- ✅ Keep descriptions concise
- ✅ Include realistic examples
- ✅ Add error handling
- ✅ Document all options
- ❌ Don't leave placeholder text
- ❌ Don't omit sections

## Next Steps

1. Copy appropriate template
2. Replace all variables
3. Fill in missing sections
4. Test thoroughly
5. Validate with `*validate-pack`

---

*Expansion Pack Template v1.0.0*
