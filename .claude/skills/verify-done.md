---
name: verify-done
description: Pre-claim-done verification gate — runs applicable tests + lint + governance + diff sanity check on current uncommitted work. Surface PASS/FAIL with evidence BEFORE declaring task complete. Targets the 25-buggy_code top friction from /insights 2026-04-25. Distinct from /verify-delegation (post-Aider/subagent) — this is for post-Claude-self-work.
---

# /verify-done

**Quando invocare**: PRIMA di dichiarare "ok l'ho fatto" o "task complete" o committare un cambiamento non triviale.

**Quando NON invocare**: edit cosmetic puri (typo / formatting), single-file doc ≤30 LOC, read-only Glob/Grep sequences. Vedi CLAUDE.md "Verify Before Claim Done" skip rules.

## Flow (esegui in ordine)

### Step 1 — Sanity diff

```bash
git status --short
git diff --stat HEAD
```

Domande mentali:

- File toccati matcha lo scope dichiarato?
- Numero LOC consistent con effort dichiarato? (es. "fix 3 LOC" reality 200 LOC = scope creep)
- File guardrail (`.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`) toccati? Se sì → STOP, segnala.

Output: lista file changed + 1 frase sanity.

### Step 2 — Tests applicable

Mappa change → test suite:

| Area modificata                      | Comando                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `apps/backend/services/` o `routes/` | `node --test tests/api/*.test.js` (rapido) o `npm run test:api` (full)                |
| `apps/backend/services/ai/`          | `node --test tests/ai/*.test.js` (~120ms baseline 307/307)                            |
| `tools/py/`                          | `PYTHONPATH=tools/py pytest tests/test_<area>.py`                                     |
| `data/core/` (YAML datasets)         | `python3 tools/py/game_cli.py validate-datasets`                                      |
| `packs/evo_tactics_pack/data/`       | `python3 tools/py/game_cli.py validate-ecosystem-pack`                                |
| `packages/contracts/schemas/`        | `npm run schema:lint`                                                                 |
| `docs/`                              | `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json` |
| Trait edits                          | `npm run style:check` + `python tools/py/game_cli.py validate-datasets`               |

Esegui SOLO i comandi che matchano i file modificati. Skip altri.

Output: tabella test → status (PASS/FAIL), failure summary se applicable.

### Step 3 — Lint / format

Se ≥3 file edit O `*.{js,ts,md,yaml,json}` modificati:

```bash
npm run format:check 2>&1 | tail -5
npm run lint:stack 2>&1 | tail -5
```

Output: PASS / FAIL + first 3 errori.

### Step 4 — Governance (solo se docs touched)

```bash
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json 2>&1 | tail -3
```

Atteso: `errors=0 warnings=0`. Altrimenti STOP, fix frontmatter prima di committare.

### Step 5 — Smoke probe (solo se backend touched)

Se modifica `apps/backend/`:

```bash
# Se hai backend running:
curl -sf http://0.0.0.0:3334/api/health 2>&1 | head -3

# Altrimenti syntax check:
node --check apps/backend/services/<modified>.js
node --check apps/backend/routes/<modified>.js
```

Output: PASS / FAIL.

### Step 6 — Verdict

Format report (under 150 words):

```
## /verify-done report — <slug>

### Diff sanity
- Files changed: N (in scope ✓ / out-of-scope ⚠️)
- LOC delta: +X -Y

### Tests
| Suite | Status | Note |
| node:ai | ✅ PASS 307/307 | baseline preserved |
| docs:governance | ✅ 0/0 | |

### Format / Lint
- format:check ✅
- lint:stack ✅

### Smoke probe (if applicable)
- node --check ✅

### Verdict: [PASS | FAIL | NEEDS-FIX]

### Action
- PASS → procedi a commit
- NEEDS-FIX → lista N edit specifici + rerun /verify-done
- FAIL → STOP, escalate al user con error log
```

## Anti-pattern (NON fare)

- ❌ **Skip step "non rilevante"** without thinking → if you touched backend, AI tests ARE relevant even se non hai toccato AI direct (regression cascade)
- ❌ **Run tests in background** poi committare prima del result → race condition, falso PASS
- ❌ **Claim PASS** se anche 1 step ha warning ignorato → warnings spesso = silent corruption
- ❌ **Skip se "edit piccolo"** > 30 LOC → 25 buggy_code dimostra che "piccolo edit" è diagnosi optimistic

## Escalation

Se NEEDS-FIX dopo 2 iter `/verify-done` consecutivi:

- STOP autonomous
- Surface al user: "Fix attempt 1 + 2 failed, root cause unclear, escalate"
- Considera handoff a `session-debugger` agent se backend regression

## Esempio uso

```
user: ho appena committato 5 card museum + update OPEN_DECISIONS

claude: invoco /verify-done prima di declare done

[runs Steps 1-6]

claude: ✅ PASS — 11 file changed in scope, governance 0/0, no tests broken
       (no backend change, smoke skipped)
       Procedi commit-push.
```

## Provenance

Ispirato da `/insights` 2026-04-25 friction analysis (25 buggy_code top, 15 wrong_approach, 5+ subagent timeout). Pattern validato precedentemente da PR #1771 (P0 ops stack workflow) — vedi memory [feedback_insights_p0_stack_workflow.md](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_insights_p0_stack_workflow.md).

Distinto da `/verify-delegation` (post-Aider/subagent rescue pattern, ADR-0008): questo è per **post-Claude-self-work** prima di claim done.
