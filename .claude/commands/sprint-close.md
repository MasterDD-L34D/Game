---
name: sprint-close
description: Run full Definition of Done checklist, generate sprint summary, update CLAUDE.md
user_invocable: true
---

# Sprint Close

Automated DoD verification + sprint summary generation.

## Steps

### 1. Run test suites

```bash
node --test tests/ai/*.test.js 2>&1
```

Report: X/45 pass. If any fail → STOP, flag, do not proceed.

### 2. Format check

```bash
npm run format:check 2>&1
```

If fail → run `npm run format` to fix, then re-check.

### 3. Working tree check

```bash
git status --short
```

If uncommitted changes → list them, warn user.

### 4. Forbidden directory scan

Check if recent commits added files to forbidden areas:

```bash
git diff --name-only HEAD~10..HEAD | grep -E "^(\.github/workflows/|packages/contracts/|services/generation/|migrations/)" || echo "No guardrail touches"
```

If hits found → list them with commit hash and author. Verify signaling happened.

### 5. Doc update verification

```bash
git diff --name-only HEAD~10..HEAD | grep -E "(vcScoring|policy\.js)" && echo "CHECK: docs/architecture/ai-policy-engine.md updated?" || true
git diff --name-only HEAD~10..HEAD | grep -E "services/rules/" && echo "CHECK: docs/hubs/combat.md updated?" || true
```

### 6. Generate sprint summary

Collect:

```bash
git log --oneline --since="7 days ago" | head -30
git diff --stat HEAD~20..HEAD | tail -5
gh pr list --state merged --limit 20 --json number,title,mergedAt
```

### 7. Produce DoD scorecard

```
## Sprint Close Report

| Check | Status | Detail |
|-------|--------|--------|
| AI tests | 🟢/🔴 | X/45 pass |
| Format | 🟢/🔴 | ... |
| Working tree | 🟢/🟡 | clean / N files |
| Guardrail touches | 🟢/🔴 | ... |
| Doc updates | 🟢/🟡 | ... |
| PR merged | — | N PRs |
| LOC delta | — | +X / -Y |
```

### 8. Update CLAUDE.md sprint context

Read current CLAUDE.md "Sprint context" section. Update:

- Sprint number
- PR count + range
- Test counts
- Ultimo commit hash
- Milestone completate (from PR titles)
- Pillar status (only change if evidence from this sprint)

Ask user to confirm before writing.

## Output

Caveman-compatible. Table-first. Only flag actionable items.
