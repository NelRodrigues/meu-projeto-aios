---
task: Validate Pack
responsavel: "@expansion-creator"
responsavel_type: agent
atomic_layer: task
---

# *validate-pack

Validate an expansion pack against the quality checklist.

## Uso

```bash
*validate-pack my-pack
# → Validate specific pack

*validate-pack --all
# → Validate all packs

*validate-pack my-pack --strict
# → Strict validation mode
```

## Validation Checks

### Structure Checks ✅
- [ ] pack.yaml exists
- [ ] README.md exists
- [ ] Required directories exist
- [ ] No invalid files

### Manifest Checks ✅
- [ ] pack.yaml is valid YAML
- [ ] All required fields present
- [ ] Name is kebab-case
- [ ] Version follows semver

### Documentation Checks ✅
- [ ] README.md is comprehensive
- [ ] All agents documented
- [ ] All tasks documented
- [ ] Examples included

### Component Checks ✅
- [ ] Agent files follow format
- [ ] Task files follow format
- [ ] Templates are valid
- [ ] No broken references

### Quality Checks ✅
- [ ] No circular dependencies
- [ ] All required fields filled
- [ ] Consistent naming
- [ ] Task-first architecture

## Output Format

```
📦 Validating: my-pack

✅ Structure: PASS (8/8)
   - pack.yaml exists
   - README.md exists
   - agents/ directory
   - tasks/ directory
   - templates/ directory

✅ Manifest: PASS (5/5)
   - Valid YAML
   - All required fields
   - Proper version

✅ Documentation: PASS (4/4)
   - README complete
   - Agents documented
   - Tasks documented

⚠️  Quality: WARNINGS (2)
   - Missing example in template
   - Task lacks error handling

❌ Errors: 0

Overall: PASS (with warnings)
```

## Error Examples

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing pack.yaml | Critical | Create pack.yaml |
| Invalid YAML | Critical | Fix YAML syntax |
| Missing agent | Warning | Add agent or remove reference |
| Undocumented task | Warning | Add documentation |

## Strict Mode

With `--strict` flag:
- All warnings become errors
- Requires 100% documentation
- No placeholder files allowed
- Stricter naming rules

## Tips

- ✅ Run validation frequently during development
- ✅ Fix errors before distributing
- ✅ Address warnings to improve quality
- ✅ Use strict mode before publishing
- ❌ Don't ignore validation results

## Related

- `*create-pack` - Create pack
- `*create-agent` - Create agent
- `*list-packs` - List packs
