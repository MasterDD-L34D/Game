---
name: evo-tactics-monitor
description: Monitor Evo-Tactics design direction, guardrails, and sprint health
user_invocable: true
trigger: "come sto mettendo?", "cosa lavoro adesso?", "sono sulla strada giusta?", "monitor", "design check", "health check progetto", "stato progetto", "dove siamo?"
---

# Evo-Tactics Design Monitor

You are a design-direction monitor for the Evo-Tactics project. Your job is to assess project health against the frozen design pillars, guardrails, and Definition of Done.

## Steps

### 1. Gather current state

Read these files (use offset/limit to avoid loading too much):

- `CLAUDE.md` — search for "Pilastri di design" section and "Sprint context" section (around line 200+)
- `docs/core/90-FINAL-DESIGN-FREEZE.md` — first 100 lines for freeze status and scope
- Run: `git log --oneline -20` for recent activity
- Run: `git diff --stat HEAD~5..HEAD` for recent change scope
- Run: `git status --short` for uncommitted work
- Run: `node --test tests/ai/*.test.js 2>&1 | tail -5` for AI test status
- Run: `npm run format:check 2>&1 | tail -3` for format status

### 2. Check guardrail violations

Grep recent commits for changes to protected areas:

```bash
git log --oneline --name-only -10 | grep -E "(\.github/workflows/|packages/contracts/|services/generation/|migrations/)"
```

If any hits: flag as guardrail touch — verify it was signaled/approved.

### 3. Check hardcoded traits

```bash
git diff HEAD~5..HEAD -- services/rules/ apps/backend/routes/session*.js | grep -E "(artigli|coda_frusta|scheletro|criostasi)" | head -10
```

Trait logic must live in `data/core/traits/active_effects.yaml`, never hardcoded in resolver/session code.

### 4. Check schema parity

```bash
git log --oneline --name-only -10 | grep "packages/contracts/"
```

If contracts changed: verify `npm run mock:generate` was run (check if `apps/dashboard/public/data/` has matching timestamps).

### 5. Produce scorecard

Output this table with live status from the checks above:

```
## Evo-Tactics Health Scorecard

| Area | Status | Note |
|------|--------|------|
| Pilastro 1: Tattica leggibile | 🟢/🟡/🔴 | ... |
| Pilastro 2: Evoluzione emergente | 🟢/🟡/🔴 | ... |
| Pilastro 3: Identita Specie×Job | 🟢/🟡/🔴 | ... |
| Pilastro 4: Temperamenti MBTI/Ennea | 🟢/🟡/🔴 | ... |
| Pilastro 5: Co-op vs Sistema | 🟢/🟡/🔴 | ... |
| Pilastro 6: Fairness | 🟢/🟡/🔴 | ... |
| Test AI | 🟢/🔴 | X/45 pass |
| Format check | 🟢/🔴 | ... |
| Working tree | 🟢/🟡 | clean / N uncommitted |
| Guardrail violations | 🟢/🔴 | ... |
| Hardcoded traits | 🟢/🔴 | ... |
| Schema parity | 🟢/🟡 | ... |
| Game-Database sync | 🟢/🟡 | last evo:import date |
```

### 6. Suggest next steps

Based on the scorecard:

- If all green: suggest next sprint focus from `docs/core/90-FINAL-DESIGN-FREEZE.md` roadmap section
- If any yellow/red: prioritize fixes before new features
- Always check: are there open PRs that need review? (`gh pr list --state open`)

### 7. Authority reminder

If any finding contradicts the design freeze, cite the source authority:

- A1 (ADR/hubs) > A3 (freeze) for boundary definitions
- A2 (data/contracts) > A3 for mechanical truth
- A3 > A5 for shipping scope decisions

## Output format

Caveman-compatible: terse, fragments OK, no filler. Table-first, prose only for actionable items.
