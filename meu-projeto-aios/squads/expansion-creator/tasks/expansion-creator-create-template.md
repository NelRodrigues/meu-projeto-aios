---
task: Create Template
responsavel: "@expansion-creator"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *create-template

Create an output template for an expansion pack.

## Uso

```bash
*create-template
# → Interactive mode

*create-template --pack my-pack --name my-template
# → Direct mode

*create-template --pack my-pack --format markdown
# → Specify format
```

## Elicitação

```
? Which pack to add template to?
my-domain-pack

? Template name (kebab-case):
report-output

? Template format:
- markdown
- json
- html
- yaml
- custom

? Template purpose:
Describe what this template is for

? Include example output? (Y/n)
Y

? Version: (1.0.0)
1.0.0
```

## Template Types

### 1. Markdown Templates
For documentation, reports, guides

### 2. JSON Templates
For data structures, API responses

### 3. HTML Templates
For web output, formatted reports

### 4. YAML Templates
For configuration, structured data

### 5. Custom Templates
For domain-specific formats

## Output Location

```
./expansion-packs/my-pack/templates/my-template.md
```

## Template Structure

```markdown
---
template: my-template
format: markdown
version: 1.0.0
description: Template description
---

# Template Name

Template content with:
- Variable placeholders: {variable_name}
- Instructions for use
- Example output

## Variables

- {variable_name} - Description

## Usage

How to use this template

## Example

Example output
```

## Best Practices

- ✅ Use clear variable names
- ✅ Include examples
- ✅ Document all variables
- ✅ Keep format consistent
- ✅ Version your templates
- ❌ Don't hardcode values
- ❌ Don't create overly complex templates

## Related

- `*create-pack` - Create expansion pack
- `*create-agent` - Create agent
- `*validate-pack` - Validate pack
