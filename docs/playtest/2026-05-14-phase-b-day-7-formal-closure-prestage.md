---
title: 'Phase B Day 7 formal closure pre-stage — 2026-05-14 cascade actions plan'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-11
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/playtest/2026-05-11-phase-b-day-4-monitor.md
tags: [playtest, phase-b, day-7, formal-closure, prestage, cascade]
---

# Phase B Day 7 formal closure pre-stage — 2026-05-14

Pre-stage plan ADR §13.4 cascade actions execution. Date target Day 7 = 2026-05-14. Oggi 2026-05-11 = Day 4. Pre-stage doc shipped autonomous + ready execution single-click 2026-05-14.

## 1. Pre-conditions verification (Day 7 trigger)

Conditions ADR §13.1 must verify 4/4 at 2026-05-14:

| #   | Condition                                   |           Day 4 status            |     Day 7 target      |
| --- | ------------------------------------------- | :-------------------------------: | :-------------------: |
| 1   | Phase A 7gg grace window completed          |            ⏳ Day 4/8             |   ✅ Day 8 reached    |
| 2   | Zero critical regression Tier 1 Day 1+3+5+7 |          ✅ iter1-4 PASS          | ✅ + iter5 Day 7 PASS |
| 3   | Master-dd verdict explicit α/β/γ            | ✅ γ default pre-stage 2026-05-10 |      ✅ ratified      |
| 4   | Auto-merge L3 cascade pipeline operational  |         ✅ ~30 PR Day 1-5         |     ✅ confermato     |

## 2. ADR §13.4 cascade actions (execute 2026-05-14)

### 2.1 Tag preservation `web-v1-final` refresh

**Goal**: refresh tag `web-v1-final` to HEAD commit pre-cutover archive. Preserve rollback path.

```bash
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/youthful-boyd-f617b9
git fetch origin main
git tag -f web-v1-final origin/main
git push origin web-v1-final --force-with-lease
```

**Rationale**: tag = snapshot ultima versione web v1 funzionale, recovery point in case Phase B archive emerge regression.

### 2.2 Frontend `apps/play/src/` → `apps/play.archive/`

**Goal**: archive web v1 source code. Preserve under archive path, NOT delete.

```bash
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/youthful-boyd-f617b9
git checkout -b chore/phase-b-archive-web-v1
mkdir -p apps/play.archive
git mv apps/play/src apps/play.archive/src
git mv apps/play/public apps/play.archive/public 2>/dev/null || true
git mv apps/play/index.html apps/play.archive/index.html 2>/dev/null || true
git mv apps/play/lobby.html apps/play.archive/lobby.html 2>/dev/null || true
# package.json + vite.config.js mantenuti in apps/play/ root per build legacy preserve
```

**NB**: apps/play/dist resta come last-known-good build artifact. Backend `app.js` mount `/play` da `apps/play/dist` continua funzionante (fallback web v1).

### 2.3 Deprecate banner

**Goal**: visual banner web v1 deprecated, point users to Godot v2 phone HTML5.

Edit `apps/play.archive/index.html` head section:

```html
<style>
  .deprecate-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ffd700;
    color: #333;
    padding: 10px;
    text-align: center;
    z-index: 9999;
    font-family: sans-serif;
    font-size: 14px;
  }
</style>
<div class="deprecate-banner">
  ⚠️ Web v1 deprecated 2026-05-14. Use
  <a href="https://godot-v2-deploy.example/phone/">Godot v2 phone HTML5</a> for active development.
</div>
```

### 2.4 README.md root update

**Goal**: documenta Phase B FORMAL ratificato + primary frontend = Godot v2.

Edit `README.md` § "Stack" + " Frontend primary":

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

Edit `CLAUDE.md` sprint context section: aggiungi Phase B Day 7 formal closure note.

### 2.7 ADR-2026-05-05 §13.1 fill complete

Edit `docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md` §13.1:

| #   | Condition                                            |                Status                 |
| --- | ---------------------------------------------------- | :-----------------------------------: |
| 1   | Phase A 7gg grace window completed (2026-05-14)      |           ✅ Day 8 reached            |
| 2   | Zero critical regression Tier 1 sintetic Day 1+3+5+7 | ✅ iter1+iter2+iter3+iter4+iter5 PASS |
| 3   | Master-dd verdict explicit α/β/γ                     |        ✅ γ default ratificato        |
| 4   | Auto-merge L3 cascade pipeline operational           |           ✅ ~30 PR Day 1-7           |

## 3. iter5 Day 7 (2026-05-14) synthetic monitor execution

Esegui iter5 prima cascade actions §13.4:

```bash
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/youthful-boyd-f617b9
LOBBY_WS_SHARED=true PORT=3334 npm run start:api > /tmp/backend.log 2>&1 &
PID=$!
sleep 12
curl -s -m 3 http://localhost:3334/api/health
PHONE_BASE_URL=http://localhost:3334 npm --prefix tools/ts run test:phone:smoke 2>&1 | tail -30
taskkill //F //PID <pid>
```

Capture result in new doc `docs/playtest/2026-05-14-phase-b-day-7-monitor-iter5.md` con tabella result + verdict.

**Expected**: backend tier 13/13 PASS preservato (zero regression vs iter1-4). Frontend phone HTML5 env-blocked same root cause (NON regression).

## 4. Single-PR cascade plan

**PR struttura**:

- Branch: `chore/phase-b-day-7-formal-closure`
- Commit 1: §2.1 tag refresh + §2.2 apps/play archive move
- Commit 2: §2.3 deprecate banner + §2.4 README + §2.5 plan v3 + §2.6 CLAUDE.md
- Commit 3: §2.7 ADR §13.1 fill complete + §3 iter5 doc
- PR title: `chore(phase-b): Day 7 formal closure cascade actions — 2026-05-14`

**Validate pre-merge**:

- `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict` → errors=0
- `node --test tests/ai/*.test.js` → 417/417 verde
- `node --test tests/api/*.test.js` → 1069/1069 verde
- iter5 backend tier 13/13 PASS

**Rollback path**: tag `web-v1-final` preserve restore via `git reset --hard web-v1-final`.

## 5. Resume trigger phrase canonical 2026-05-14

> _"Phase B Day 7 formal closure execute — esegui §13.4 cascade actions per pre-stage doc docs/playtest/2026-05-14-phase-b-day-7-formal-closure-prestage.md"_

OR (manual single-step):

> _"refresh web-v1-final tag + archive apps/play/src → apps/play.archive + banner + README + plan v3 + CLAUDE.md + ADR §13.1 + iter5 monitor"_

## 6. Expected output post-execution

- Web v1 source archived (apps/play.archive/) — preserved, NOT deleted
- Tag `web-v1-final` refreshed HEAD pre-archive (rollback path)
- Godot v2 phone HTML5 = primary frontend ratificato
- ADR-2026-05-05 §13.1 fill 4/4 ✅
- iter5 Day 7 monitor doc shipped
- Pillar P5 Co-op 🟢++ → 🟢ⁿ candidate post-cutover ratification

## 7. Rollback (if Day 7 iter5 RED)

- `git reset --hard web-v1-final` restore web v1 primary
- ADR-2026-05-05 status → `ROLLBACK Phase B` + amendment §13.4 abort
- Master-dd notification
