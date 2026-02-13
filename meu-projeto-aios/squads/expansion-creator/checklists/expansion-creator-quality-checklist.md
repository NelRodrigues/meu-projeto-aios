---
checklist: Expansion Pack Quality Checklist
type: validation
target: expansion-pack
required: true
---

# ✅ Expansion Pack Quality Checklist

Use this checklist when creating and validating expansion packs.

## 📦 Pack Structure

- [ ] `pack.yaml` exists in root directory
- [ ] `README.md` exists in root directory
- [ ] `agents/` directory exists
- [ ] `tasks/` directory exists
- [ ] `templates/` directory exists
- [ ] `workflows/` directory exists
- [ ] `checklists/` directory exists
- [ ] `data/` directory exists
- [ ] No extraneous files or directories

## 📋 pack.yaml Validation

- [ ] Valid YAML syntax
- [ ] `name` field present and kebab-case
- [ ] `version` field follows semver (e.g., 1.0.0)
- [ ] `description` field is concise and clear
- [ ] `author` field present
- [ ] `license` field present (MIT, Apache-2.0, etc.)
- [ ] `slashPrefix` field (for slash commands)
- [ ] `aios.minVersion` specified
- [ ] `aios.type` set to `expansion-pack`
- [ ] All referenced components exist
- [ ] `tags` field populated (at least 2 tags)

## 📝 README.md Quality

- [ ] Clear description of pack purpose
- [ ] Quick start section
- [ ] List of included agents
- [ ] List of included tasks
- [ ] Pack structure diagram
- [ ] Usage examples
- [ ] Installation instructions
- [ ] How to add components
- [ ] How to validate
- [ ] License information
- [ ] Author/contributor info

## 👤 Agents

- [ ] Each agent has `.md` file
- [ ] Agent file has YAML frontmatter
- [ ] Agent has title and description
- [ ] Agent has clear persona definition
- [ ] Agent has command list
- [ ] Agent has quick start examples
- [ ] Agent file is referenced in pack.yaml

## 📋 Tasks

- [ ] Each task has `.md` file
- [ ] Task file has YAML frontmatter
- [ ] Task name matches command name
- [ ] Task has clear description
- [ ] Task has usage examples
- [ ] If `elicit: true`, includes elicitation prompts
- [ ] Task has flow/process section
- [ ] Task has expected output format
- [ ] Task has error handling section
- [ ] Task file is referenced in pack.yaml

## 📄 Templates

- [ ] Each template has `.md` file
- [ ] Template has YAML frontmatter
- [ ] Template has clear purpose description
- [ ] Template has example output
- [ ] Template documents all variables/placeholders
- [ ] Template uses consistent formatting
- [ ] Template is referenced in pack.yaml

## 📖 Documentation

- [ ] All components documented
- [ ] Examples provided for each agent
- [ ] Examples provided for each task
- [ ] Code samples are correct and runnable
- [ ] Terminology is consistent
- [ ] No typos or grammar errors
- [ ] Links are accurate

## 🏗️ Architecture

- [ ] Follows task-first architecture
- [ ] No circular dependencies between tasks
- [ ] Clear agent responsibility boundaries
- [ ] Consistent naming conventions throughout
- [ ] Error handling in all tasks
- [ ] Input/output formats are clear
- [ ] No hardcoded values (use variables/config)

## ✨ Quality Standards

- [ ] Code follows AIOS standards
- [ ] Consistent indentation (2 spaces for YAML)
- [ ] Consistent formatting
- [ ] No dead code or commented-out sections
- [ ] Clear variable/field naming
- [ ] Proper escape characters in examples

## 🔗 Dependencies

- [ ] All required AIOS modules specified
- [ ] No conflicting dependencies
- [ ] Dependency versions appropriate
- [ ] Optional dependencies clearly marked
- [ ] Compatible with specified `minVersion`

## 🧪 Testing

- [ ] Example tasks include test scenarios
- [ ] Edge cases documented
- [ ] Error scenarios handled
- [ ] All agents tested with example
- [ ] All tasks can be executed successfully

## 🚀 Distribution Ready

- [ ] Pack passes validation: `*validate-pack`
- [ ] No warnings or errors
- [ ] All components working
- [ ] Documentation complete
- [ ] Version number appropriate
- [ ] License properly stated
- [ ] Author information correct

## Usage

### During Creation

Use while creating your pack:

```bash
# Create pack
*create-pack my-pack

# Add components
*create-agent --pack my-pack
*create-task --pack my-pack

# Check against checklist as you go
```

### During Validation

```bash
# Validate pack
*validate-pack my-pack

# Check all items on this checklist
```

### Before Distribution

Before sharing or publishing:

```bash
# Strict validation
*validate-pack my-pack --strict

# Ensure all checklist items are complete
```

## Tips

- ✅ Print this checklist and keep handy
- ✅ Check off items as you complete them
- ✅ Use in code review process
- ✅ Share with team members
- ✅ Update as standards evolve

## Score

**Pass Criteria:**
- All `📦 Pack Structure` items: ✅
- All `📋 pack.yaml Validation` items: ✅
- All `📝 README.md Quality` items: ✅
- At least 80% of other items: ✅

If all criteria met: **APPROVED** ✅

---

*Last updated: 2026-02-11*
