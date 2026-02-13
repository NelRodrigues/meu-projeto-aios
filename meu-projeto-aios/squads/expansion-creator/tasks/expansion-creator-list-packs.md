---
task: List Packs
responsavel: "@expansion-creator"
responsavel_type: agent
atomic_layer: task
---

# *list-packs

List all created expansion packs.

## Uso

```bash
*list-packs
# → List all packs with basic info

*list-packs --detailed
# → Show detailed information

*list-packs --filter domain:ecommerce
# → Filter by tag

*list-packs --sort created
# → Sort by creation date
```

## Output Format

```
📦 Expansion Packs (3)

1. ecommerce-automation
   📊 Status: ✅ Valid
   📝 Version: 1.2.0
   👤 Author: Your Name
   🏷️  Tags: ecommerce, automation
   📍 Location: ./expansion-packs/ecommerce-automation
   ℹ️  Components: 3 agents, 5 tasks, 2 templates

2. devops-deployment
   📊 Status: ⚠️  Has warnings
   📝 Version: 0.9.0
   👤 Author: Your Name
   🏷️  Tags: devops, ci-cd
   📍 Location: ./expansion-packs/devops-deployment
   ℹ️  Components: 2 agents, 4 tasks, 1 template

3. content-creation
   📊 Status: ❌ Has errors
   📝 Version: 1.0.0
   👤 Author: Your Name
   🏷️  Tags: content, ai
   📍 Location: ./expansion-packs/content-creation
   ℹ️  Components: 2 agents, 3 tasks, 0 templates
```

## Detailed Output

With `--detailed` flag:

```
📦 ecommerce-automation

Version: 1.2.0
Description: Pack for e-commerce automation workflows
Author: Your Name
License: MIT
Status: ✅ Valid
Location: ./expansion-packs/ecommerce-automation

Agents:
  ✅ ecommerce-processor
  ✅ order-handler
  ✅ inventory-manager

Tasks:
  ✅ process-order
  ✅ update-inventory
  ✅ handle-returns
  ✅ send-notifications
  ✅ generate-reports

Templates:
  ✅ order-confirmation
  ✅ shipment-notification

Last Updated: 2026-02-11
```

## Filtering

Available filters:
- `status:valid` - Only valid packs
- `status:warnings` - Packs with warnings
- `status:errors` - Packs with errors
- `tag:tagname` - By tag
- `author:name` - By author
- `version:1.0.0` - Specific version

## Sorting Options

- `created` - By creation date (newest first)
- `updated` - By last update (newest first)
- `name` - Alphabetically
- `version` - By version number (highest first)
- `status` - By validation status

## Tips

- ✅ Use `*list-packs` to see all packs
- ✅ Use `--detailed` to deep dive into a pack
- ✅ Use `--filter` to find specific packs
- ✅ Check status before using packs
- ❌ Don't use invalid packs in production

## Related

- `*create-pack` - Create pack
- `*validate-pack` - Validate pack
- `*create-agent` - Create agent
