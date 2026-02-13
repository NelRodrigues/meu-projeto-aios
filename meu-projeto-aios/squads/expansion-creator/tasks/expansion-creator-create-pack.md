---
task: Create Expansion Pack
responsavel: "@expansion-creator"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *create-pack

Create a complete expansion pack through guided workflow.

## Uso

```bash
*create-pack
# → Interactive mode, creates new pack

*create-pack --name my-pack --description "My description"
# → Direct mode with options

*create-pack --from-template etl
# → Create from predefined template
```

## Elicitação Interativa

```
? Pack name (kebab-case):
my-domain-pack

? Description:
Pack for automating my domain workflows

? What's the primary domain?
- E-commerce
- DevOps
- Data Processing
- Content Creation
- Other

? Include example agent? (Y/n)
Y

? Include example task? (Y/n)
Y

? Include workflow example? (Y/n)
Y

? Target AIOS version: (2.1.0)
2.1.0
```

## Flow

```
1. Validate pack name (kebab-case)
2. Check if pack already exists
3. Collect pack metadata via elicitation
4. Create directory structure
5. Generate pack.yaml manifest
6. Generate README.md
7. Generate example components (if selected)
8. Create quality checklist
9. Validate pack structure
10. Display next steps
```

## Output Structure

```
./expansion-packs/my-domain-pack/
├── pack.yaml                              # Manifest
├── README.md                              # Main documentation
├── agents/
│   └── example-agent.md                  # Example agent (optional)
├── tasks/
│   └── example-agent-task.md             # Example task (optional)
├── templates/
│   └── example-output.md                 # Example template
├── workflows/
│   └── .gitkeep
├── checklists/
│   ├── quality-checklist.md
│   └── .gitkeep
└── data/
    └── .gitkeep
```

## pack.yaml Template

```yaml
name: my-domain-pack
version: 1.0.0
description: Pack for my domain workflows
author: Your Name
license: MIT
slashPrefix: myDomain

aios:
  minVersion: "2.1.0"
  type: expansion-pack

components:
  agents: []
  tasks: []
  templates: []
  workflows: []

tags:
  - domain
  - custom
```

## Next Steps After Creation

1. Add agents to `agents/` folder
2. Add tasks to `tasks/` folder (task-first!)
3. Add templates to `templates/` folder
4. Create workflows in `workflows/` folder
5. Update README.md with documentation
6. Run `*validate-pack` to check quality
7. Test pack with @expansion-creator

## Validation Checks

- ✅ Pack name is kebab-case
- ✅ pack.yaml exists and is valid
- ✅ README.md exists
- ✅ Required directories exist
- ✅ No circular dependencies
- ✅ All components are properly documented

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `INVALID_NAME` | Name not kebab-case | Use lowercase with hyphens |
| `PACK_EXISTS` | Pack already exists | Choose different name |
| `INVALID_YAML` | pack.yaml has syntax errors | Check YAML format |
| `VALIDATION_FAILED` | Pack doesn't meet standards | Check validation output |

## Tips

- ✅ Use descriptive names (e.g., `ecommerce-automation`, `devops-deployment`)
- ✅ Keep packs focused on a specific domain
- ✅ Document your pack thoroughly in README.md
- ✅ Use task-first architecture for all tasks
- ✅ Start with examples and expand
- ❌ Don't mix unrelated domains in one pack

## Related Commands

- `*create-agent` - Add new agent to pack
- `*create-task` - Add new task to pack
- `*validate-pack` - Check pack quality
- `*list-packs` - See all your packs
