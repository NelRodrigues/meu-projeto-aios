---
task: Create Task
responsavel: "@expansion-creator"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *create-task

Create a task workflow for an expansion pack.

## Uso

```bash
*create-task
# → Interactive mode

*create-task --pack my-pack --name my-task --agent my-agent
# → Direct mode

*create-task --pack my-pack --from-template etl
# → Use template
```

## Elicitação

```
? Which pack to add task to?
my-domain-pack

? Task name (kebab-case):
process-data

? Agent responsible (optional):
data-processor

? Task description:
Process incoming data from source

? Input requirements:
- data format (JSON, CSV, etc.)

? Output expectations:
- processed data format

? Include error handling? (Y/n)
Y

? Include unit test? (Y/n)
Y
```

## Task Structure

All tasks follow task-first architecture:

```markdown
---
task: Task Name
responsavel: @agent-name
atomic_layer: task
elicit: true/false
---

# *task-name

Task description.

## Uso

Usage examples

## Elicitação (if elicit: true)

Interactive prompts

## Flow

Step-by-step flow

## Output

Expected output format
```

## Best Practices

- ✅ Keep tasks focused and atomic
- ✅ Use task-first architecture
- ✅ Include clear input/output specs
- ✅ Document error handling
- ✅ Add examples
- ❌ Don't create large multi-step tasks (use workflows instead)
- ❌ Don't skip error handling

## Related

- `*create-pack` - Create expansion pack
- `*create-agent` - Create agent
- `*validate-pack` - Validate pack
