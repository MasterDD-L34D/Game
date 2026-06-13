---
title: 'Phase B canonical execution checklist — 2026-05-14 cascade actions step-by-step'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-12
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/playtest/2026-05-14-phase-b-day-7-formal-closure-prestage.md
  - docs/playtest/2026-05-11-phase-b-day-5-monitor-anticipated.md
tags: [playtest, phase-b, day-7, cutover, canonical, execution-checklist, handoff]
---

# Phase B canonical execution checklist 2026-05-14

Handoff cross-PC step-by-step Day 8 canonical execution. Master-dd OR Claude eseguibile single-PR cascade ~30-40min.

## 0. Pre-conditions verify (gate)

Esegui PRIMA cascade actions. **ABORT** se non 4/4 ✅:

```bash
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/<active>
TODAY=$(date +%Y-%m-%d)
[ "$TODAY" = "2026-05-14" ] || echo "ABORT: today=$TODAY ≠ 2026-05-14"

# Cond 1: Phase A grace 7gg
GRACE_DAYS=$(( ($(date -d 2026-05-14 +%s) - $(date -d 2026-05-07 +%s)) / 86400 ))
[ "$GRACE_DAYS" -ge 7 ] || echo "ABORT: grace=$GRACE_DAYS"

# Cond 2: regression check Day 1-7
git fetch origin
REGRESSION=$(git log --since=2026-05-07 origin/main --extended-regexp --grep="^revert\!|hotfix.*phase-b|rollback.*phase-b" --oneline | wc -l)
[ "$REGRESSION" -eq 0 ] || echo "ABORT: regression=$REGRESSION"

# Cond 3: iter5 doc exists
[ -f docs/playtest/2026-05-14-phase-b-day-7-monitor-iter5.md ] || echo "ABORT: iter5 doc missing"

# Cond 4: master-dd γ default still ratified (default automatic, NO veto)
grep -q "Path γ default" docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md || echo "ABORT: γ verdict missing"
```

## 1. iter5 monitor execution (PRIMA cascade)

```bash
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/<active>
LOBBY_WS_SHARED=true PORT=3334 npm run start:api > /tmp/backend.log 2>&1 &
PID=$!
sleep 12
curl -s -m 3 http://localhost:3334/api/health  # → {"status":"ok"}
PHONE_BASE_URL=http://localhost:3334 npm --prefix tools/ts run test:phone:smoke 2>&1 | tail -40
kill $PID  # OR: taskkill //F //PID $PID (Windows)
```

**Expected**: backend tier 13/13 PASS (zero regression vs iter1-4). Frontend env-blocked = NON regression.

**Capture** in `docs/playtest/2026-05-14-phase-b-day-7-monitor-iter5.md` (table 13 test + verdict).

## 2. Cascade §13.4 actions (PR `chore/phase-b-day-7-formal-closure`)

### 2.1 Branch + tag preserve

```bash
git checkout -b chore/phase-b-day-7-formal-closure origin/main
git fetch origin main
git tag -f web-v1-final origin/main
git push origin web-v1-final --force-with-lease
```

### 2.2 Archive `apps/play/src/`

```bash
mkdir -p apps/play.archive
git mv apps/play/src apps/play.archive/src
git mv apps/play/public apps/play.archive/public 2>/dev/null || true
git mv apps/play/index.html apps/play.archive/index.html 2>/dev/null || true
git mv apps/play/lobby.html apps/play.archive/lobby.html 2>/dev/null || true
# package.json + vite.config.js + dist/ resta in apps/play/ (last-known-good build)
```

### 2.3 Deprecate banner

Edit `apps/play.archive/index.html` head — banner yellow + link a Godot v2 phone HTML5 (vedi pre-stage doc §2.3 source).

### 2.4 README.md root section "Frontend primary"

```markdown
## Frontend primary (post Phase B 2026-05-14)

✅ **Godot v2 phone HTML5** — `MasterDD-L34D/Game-Godot-v2/dist/web/` (cross-stack Phase B ratificato 2026-05-14 per ADR-2026-05-05 §13.4)

Legacy web v1 archived at `apps/play.archive/` (build artifact preserved `apps/play/dist/`).
```

### 2.5 Plan v3 update

Edit `docs/planning/2026-04-29-master-execution-plan-v3.md` § "Fase 3 Phase B Status":

```markdown
**Phase B Status**: ✅ ACCEPTED Path γ ratificato formale 2026-05-14 (Day 8 grace window 7gg completed, zero critical regression iter1-5 backend tier baseline preserved).
```

### 2.6 CLAUDE.md sprint context

Add nuova sezione "Sprint context 2026-05-14 Phase B Day 7 formal closure" con bullet:

- ADR-2026-05-05 status ACCEPTED Phase B Path γ formal
- apps/play/ archived → apps/play.archive/
- Godot v2 phone HTML5 = primary frontend ratified
- Tag `web-v1-final` preserved (rollback path)
- Sprint Q+ kickoff auto-trigger unblocked

### 2.7 ADR-2026-05-05 §13.1 fill final

Edit `docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md` §13.1 → 4/4 ✅ table.

## 3. Validate pre-merge

```bash
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
node --test tests/ai/*.test.js  # ≥417/417
node --test tests/api/*.test.js  # ≥1069/1069
npm run format:check
```

## 4. Commit + PR

```bash
git add -A
git commit -m "chore(phase-b): Day 7 formal closure cascade actions — 2026-05-14"
git push -u origin chore/phase-b-day-7-formal-closure
gh pr create --title "chore(phase-b): Day 7 formal closure cascade actions — 2026-05-14" \
  --body "$(cat docs/playtest/2026-05-14-phase-b-day-7-formal-closure-prestage.md | head -60)"
```

## 5. Auto-merge L3 (safety gate 7-check)

Verifica gate L3 (CLAUDE.md "Auto-merge L3"):

1. CI 100% green
2. Codex review clean
3. Format + governance green
4. AI baseline ≥417 + API ≥1069
5. ZERO forbidden paths (`.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`)
6. NO 50-line rule violation fuori `apps/backend/`
7. NO nuove dipendenze

Se 7/7 verde:

```bash
gh pr merge <num> --squash --auto --delete-branch
```

## 6. Rollback path (Day 7+8 emerge regression)

```bash
git checkout main
git reset --hard web-v1-final
git push --force-with-lease origin main  # AUTHORIZE ONLY se master-dd explicit grant
# Edit ADR-2026-05-05 status → ROLLBACK Phase B + amendment §13.4 abort
```

Notification: master-dd + memory save rollback rationale.

## 7. Post-merge cascade (Sprint Q+ auto-trigger)

- ADR-0024 ai-station amendment proposal (sub-events timeline Game `apps/play/` archive 2026-05-14 = early sub-event Vue3 repo-wide 2026-09-30) — Sprint Q+ scope.
- Sprint Q+ kickoff (Q-1 → Q-12 12 ticket pipeline preserve) — vedi `docs/planning/2026-05-10-sprint-q-plus-pipeline.md`.
- Pillar P5 Co-op 🟢++ → 🟢ⁿ candidate post-cutover.

## 8. Cross-PC resume trigger phrase

Per Claude future session (any PC, 2026-05-14):

> _"Phase B Day 7 formal closure execute — esegui canonical execution checklist docs/planning/2026-05-14-phase-b-cutover-canonical-execution.md, verifica §0 pre-conditions 4/4 ✅ + run iter5 + cascade §13.4"_
