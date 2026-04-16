---
name: docs-govern
description: Run docs governance check locally (frontmatter, registry, stale docs)
user_invocable: true
---

# Docs Governance

Local pre-CI governance check. Faster than waiting for GitHub Actions.

## Steps

### 1. Run governance validator

```bash
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict 2>&1
```

### 2. Parse output

If errors:

- **Missing frontmatter** → list files, suggest adding with schema from `docs/governance/docs_metadata.schema.json`
- **Registry drift** → list paths not in registry, suggest running `tools/docs_governance_migrator.py`
- **Stale entries** → registry points to files that don't exist

### 3. Quick stale check

Find docs not updated in 90+ days (review_cycle_days default):

```bash
find docs/ -name "*.md" -not -path "docs/archive/*" -not -path "docs/generated/*" -mtime +90 2>/dev/null | head -20
```

### 4. Workstream coverage

Check each hub has recent activity:

```bash
for hub in combat flow atlas backend dataset-pack ops-qa incoming cross-cutting; do
  echo -n "$hub: "
  find "docs/" -path "*$hub*" -name "*.md" -mtime -30 2>/dev/null | wc -l
done
```

### 5. Produce report

```
## Docs Governance Report

| Check | Status | Detail |
|-------|--------|--------|
| Frontmatter | 🟢/🔴 | N files missing |
| Registry sync | 🟢/🔴 | N orphan entries |
| Stale docs (>90d) | 🟢/🟡 | N files |
| Workstream coverage | 🟢/🟡 | ... |

### Files needing attention
<list>
```

### 6. Auto-fix option

If user asks to fix:

- Run `python tools/docs_governance_migrator.py` for bulk frontmatter generation
- Update registry entries for new files
- Ask user to confirm before committing
