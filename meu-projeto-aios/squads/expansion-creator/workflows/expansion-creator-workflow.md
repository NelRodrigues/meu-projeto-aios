---
workflow: Complete Pack Creation
orchestrator: "@expansion-creator"
orchestrator_type: agent
steps: 6
elicit: true
---

# Complete Pack Creation Workflow

End-to-end workflow for creating a complete expansion pack from scratch.

## Workflow Steps

### Step 1: Design Phase
```
*create-pack
→ Answer questions about domain
→ Get recommendations for structure
→ Review and confirm design
```

**Output:** Pack directory structure created

### Step 2: Create Agents
```
*create-agent --pack my-pack
→ Define agent persona
→ Specify commands
→ Review and confirm

Repeat for each agent needed
```

**Output:** Agent definitions in `agents/` folder

### Step 3: Create Tasks
```
*create-task --pack my-pack --agent my-agent
→ Define task name and description
→ Specify inputs and outputs
→ Add error handling
→ Review and confirm

Repeat for each task needed
```

**Output:** Task definitions in `tasks/` folder

### Step 4: Create Templates
```
*create-template --pack my-pack
→ Choose template format
→ Define variables
→ Create example output
→ Review and confirm

Repeat for each template needed
```

**Output:** Templates in `templates/` folder

### Step 5: Validate Pack
```
*validate-pack my-pack
→ Run automated checks
→ Review any warnings
→ Fix issues if needed
→ Confirm validation passed
```

**Output:** Validation report

### Step 6: Review & Document
```
*list-packs --detailed
→ Review complete pack
→ Update README if needed
→ Add final touches
→ Confirm ready to use
```

**Output:** Finalized expansion pack

## Estimated Time

| Phase | Time | Steps |
|-------|------|-------|
| Design | 5-10 min | 1 |
| Agents | 10-20 min | 2 agents |
| Tasks | 15-30 min | 3-5 tasks |
| Templates | 5-15 min | 1-2 templates |
| Validation | 2-5 min | 1 |
| Documentation | 5-10 min | 1 |
| **Total** | **45-90 min** | **All** |

## Full Workflow Example

```bash
# Step 1: Create pack
@expansion-creator
*create-pack ecommerce-automation
→ Domain: E-commerce
→ Version: 1.0.0
→ Include examples: Yes

# Step 2: Add agents
*create-agent --pack ecommerce-automation --name order-processor
*create-agent --pack ecommerce-automation --name inventory-manager

# Step 3: Add tasks
*create-task --pack ecommerce-automation --agent order-processor
*create-task --pack ecommerce-automation --agent inventory-manager

# Step 4: Add templates
*create-template --pack ecommerce-automation --format markdown

# Step 5: Validate
*validate-pack ecommerce-automation

# Step 6: Review
*list-packs --detailed
```

## Workflow Diagram

```
Start
  ↓
[1] Design Pack
  ↓
[2] Create Agents ←─┐
  ↓                  │ (repeat)
[3] Create Tasks ←──┤
  ↓                  │ (repeat)
[4] Create Templates←┘
  ↓                  (repeat)
[5] Validate Pack
  ↓
[6] Review & Document
  ↓
Done ✓
```

## Decision Points

### Add More Agents?
- **Yes**: Go back to Step 2
- **No**: Continue to Step 3

### Add More Tasks?
- **Yes**: Go back to Step 3
- **No**: Continue to Step 4

### Add More Templates?
- **Yes**: Go back to Step 4
- **No**: Continue to Step 5

### Validation Failed?
- **Fix Issues**: Repeat Step 5
- **All Good**: Continue to Step 6

## Parallel Paths

You can parallelize some steps:
- Multiple agents can be created concurrently
- Multiple tasks can be created concurrently
- Multiple templates can be created concurrently

However, all must be completed before validation.

## Tips

- ✅ Start with Step 1 for guidance
- ✅ Take notes during design
- ✅ Create agents first, then tasks
- ✅ Validate before considering complete
- ✅ Review thoroughly before using
- ❌ Don't skip validation
- ❌ Don't rush documentation

## Related Commands

- `*create-pack` - Start workflow
- `*create-agent` - Step 2
- `*create-task` - Step 3
- `*create-template` - Step 4
- `*validate-pack` - Step 5
- `*list-packs` - Step 6

---

*Workflow created for expansion-creator squad*
