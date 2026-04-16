---
name: pr-prepare
description: Pre-flight checks and PR body generation before opening a pull request
user_invocable: true
---

# PR Prepare

Run all pre-merge gates from CONTRIBUTING.md, generate PR body with changelog + rollback plan.

## Arguments

Optional: PR title or branch name. If omitted, infer from current branch.

## Steps

### 1. Identify changes

```bash
BRANCH=$(git branch --show-current)
BASE="origin/main"
git log --oneline $BASE..$BRANCH
git diff --stat $BASE..$BRANCH
```

### 2. Format check + fix

```bash
npm run format:check 2>&1
```

If fails: `npm run format`, stage fixed files, report.

### 3. Run tests

```bash
npm run test 2>&1 | tail -20
```

If AI tests exist and session code touched:

```bash
node --test tests/ai/*.test.js 2>&1 | tail -5
```

### 4. Docs governance

Check if any new `.md` files in `docs/` lack frontmatter:

```bash
git diff --name-only $BASE..$BRANCH -- "docs/**/*.md" | while read f; do head -1 "$f" | grep -q "^---" || echo "MISSING FRONTMATTER: $f"; done
```

If new docs found → check `docs/governance/docs_registry.json` has entries for them.

### 5. Contract ripple check

```bash
git diff --name-only $BASE..$BRANCH | grep "packages/contracts/" && echo "CONTRACTS CHANGED — verify mock:generate was run" || true
```

### 6. Generate changelog entry

From commit messages, produce a concise changelog entry:

- feat: → "Aggiunto: ..."
- fix: → "Corretto: ..."
- refactor: → "Ristrutturato: ..."
- test: → "Test: ..."

### 7. Generate rollback plan (03A)

Template:

```
### 03A Rollback Plan
1. `git revert <merge-commit>` on main
2. Affected services: [list from diff]
3. Data migration: [none / describe]
4. Monitoring: check [endpoints/tests] post-revert
```

### 8. Produce PR body

```markdown
## Summary

<bullet points from changelog>

## Checklist

- [x] `npm run format:check` passa
- [x] `npm run test` passa
- [x] Docs governance verificata
- [ ] Master DD approval

## Changelog

<generated entry>

## 03A Rollback Plan

<generated plan>

## Test plan

<inferred from changes>
```

### 9. Open PR

Ask user: "Creo la PR con questo body?" If yes:

```bash
gh pr create --title "<title>" --body "<body>" --base main
```
