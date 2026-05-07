---
title: 'Phase A LIVE handoff next session — monitoring window + Phase B trigger eval'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 7
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/planning/2026-05-07-cutover-handoff-alternative-qa.md
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/playtest/2026-05-07-phone-smoke-bundle-rca.md
  - docs/planning/2026-04-29-master-execution-plan-v3.md
tags: [cutover, godot-v2, phase-a, handoff, monitoring-window, phase-b-trigger]
---

# Phase A LIVE handoff next session

Session 2026-05-07 close — ADR-2026-05-05 ACCEPTED Phase A. Monitoring window 7gg grace started. Handoff per next session = day-by-day check + Phase B trigger eval.

## Stato post-sessione 2026-05-07

**16 PR shipped tutte MERGED** (12 Game/ + 4 Godot v2). Tier 1 layered QA infra completa. Bug bundle B5+B6+B7+B8+B9+B10 tutti fixed cross-repo.

ADR cutover Phase A:

- **Pre**: PROPOSED — hardware iter3 deferred
- **Post**: ✅ **ACCEPTED Phase A 2026-05-07** ([#2088](https://github.com/MasterDD-L34D/Game/pull/2088) `7247656`)

Monitoring window:

- Start: 2026-05-07
- End: 2026-05-14 (+7gg grace per ADR §4.3)
- Phase B trigger: post-end + 1+ playtest pass + soft criteria S1+S2+S5

## Day-by-day check

Eseguire ogni giorno della monitoring window:

```bash
# 1. CI status all PR Game/ + Godot v2 main HEAD
gh run list --repo MasterDD-L34D/Game --branch main --limit 5
gh run list --repo MasterDD-L34D/Game-Godot-v2 --branch main --limit 5

# 2. Tier 1 functional gate verde local (no regressione su main)
LOBBY_WS_SHARED=true PORT=3334 npm run start:api &
PHONE_BASE_URL=http://localhost:3334 npm --prefix tools/ts run test:phone:smoke
# Expect: 12+ pass + 1 skip (item 1 tunnel gated)

# 3. Master-dd phone deploy (opzionale, day 3+ stato bedazzle confidence)
./tools/deploy/deploy-quick.sh
# → URL trycloudflare → master-dd verifica primary frontend Godot HTML5 lava
```

Critical bug regression triggers rollback fast (ADR §4.4).

## Phase B trigger conditions (gates 3/3)

Per ADR §5:

1. ✅ Phase A ACCEPTED + 7gg grace passed (target: 2026-05-14)
2. ⏸ 1+ playtest session pass post-cutover (4 amici + master-dd, full combat scenario)
3. ⏸ 0 critical bug regression Phase A (continuous monitoring)
4. ⏸ Soft criteria S1+S2+S5 selectable subset:
   - **S1** Skiv asset Path 3 portrait + lifecycle (~6-9h userland)
   - **S2** Character creation TV scene Bible §0 (~6-10h Godot)
   - **S5** Sprint I playtest userland 2-3 device (~1-2 sett userland)

Master-dd verdict explicit "Phase B ACCEPTED, archive web v1 formal" post 7gg grace.

## Phase B actions (web v1 archive formal)

Quando trigger 3/3 met, eseguire ADR §6:

### 6.1 Tag preservation

```bash
cd /c/Users/VGit/Desktop/Game
git tag -d web-v1-final 2>/dev/null || true
git tag web-v1-final HEAD
git push origin web-v1-final --force-with-lease
```

### 6.2 Frontend deprecate

```bash
git mv apps/play/src apps/play.archive/src
# Edit apps/play/package.json:
#   "deprecated": true
#   "private": true
# Edit apps/play/README.md → deprecation banner + redirect Godot v2 docs
# Remove root package.json scripts/play:dev
```

### 6.3 Backend preserve

`apps/backend/` cross-stack PERSISTE Fase 3 (plan v3 explicit). Endpoint surface stays LIVE per Godot HTML5 client.

### 6.4 Documentation update

- ADR status: `ACCEPTED Phase A → ACCEPTED Phase B` (full cutover)
- Plan v3: Fase 3 `CHIUSA` + cutover date final
- README.md root: "Primary = Godot v2; web v1 ARCHIVED"
- CLAUDE.md sprint context: post-cutover stato canonical
- Memory file ritual snapshot

## Tier 1 layered QA infra inventory

Per next-session reference + future Sprint M9+ Tier 2/3:

| Spec             | Path                                                    | Coverage                                      |
| ---------------- | ------------------------------------------------------- | --------------------------------------------- |
| REST lobby smoke | `tools/ts/tests/playwright/phone/phone-multi.spec.ts`   | host create + player join + 4-context scaling |
| WS phase-flow    | `tools/ts/tests/playwright/phone/phase-flow-ws.spec.ts` | Full lifecycle lobby → ended + B5-B10 + iter3 |
| Canvas visual    | `tools/ts/tests/playwright/phone/canvas-visual.spec.ts` | NxM pixel sampling baseline (3 test)          |
| Helper lib       | `tools/ts/tests/playwright/phone/lib/canvasGrid.ts`     | sampleCanvasGrid + colorMatchesApprox         |
| Artillery load   | `tests/load/lobby-flood.yml`                            | HTTP throughput stress 1598 req p95<500ms     |
| Native agent     | `.claude/agents/phone-smoke-bot.md`                     | Codified pattern + decision matrix            |
| Workflow doc     | `docs/playtest/AGENT_DRIVEN_WORKFLOW.md`                | Canonical 4-pattern workflow                  |

**Run commands**:

```bash
# Local Tier 1 functional smoke
PHONE_BASE_URL=http://localhost:3334 npm --prefix tools/ts run test:phone:smoke

# Artillery WS load
TARGET_URL=http://localhost:3334 npm run test:load:lobby

# Iter3 tunnel WAN RTT (master-dd opzionale)
PHONE_BASE_URL=https://<random>.trycloudflare.com \
  npm --prefix tools/ts run test:phone:smoke -- --grep Iter3
```

## Tier 2/3 deferred (post Phase A stable)

Per `docs/playtest/AGENT_DRIVEN_WORKFLOW.md` adoption roadmap:

| Tier | Tool                                   | Effort | Trigger                               |
| ---- | -------------------------------------- | :----: | ------------------------------------- |
| 2    | PlayGodot full integration             |  ~5h   | Post Phase A stable (post 2026-05-14) |
| 2    | GodotTestDriver in-engine              |  ~2h   | Post Phase A stable                   |
| 3    | Wesnoth AI vs AI nightly fairness gate |  ~6h   | Sprint M9+                            |

## Bloccante residuo

**NESSUNO** per Phase A LIVE. Cutover live-ready, monitoring window in corso.

## Cascade auto-merge L3 — Day 1 sera 2026-05-07 (post-handoff update)

User formal authorization 2026-05-07 sera grant L3 blanket auto-merge. Codified [`ADR-2026-05-07-auto-merge-authorization-l3`](../adr/ADR-2026-05-07-auto-merge-authorization-l3.md). 4 PR cascade ~17min (~2-3x speedup vs master-dd manual gate baseline):

| #   | PR                                                              | Repo     | SHA        | UTC merge time            |
| --- | --------------------------------------------------------------- | -------- | ---------- | ------------------------- |
| 1   | [#209](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/209) | Godot v2 | `87dd88df` | 19:15 (lint debt cleanup) |
| 2   | [#2101](https://github.com/MasterDD-L34D/Game/pull/2101)        | Game/    | `98dbf058` | 19:16 (plan v3.2 close)   |
| 3   | [#2103](https://github.com/MasterDD-L34D/Game/pull/2103)        | Game/    | `6a3880ef` | 19:21 (ADR L3 codify)     |
| 4   | [#208](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/208) | Godot v2 | `29640c5f` | 19:33 (GAP-10 wire)       |

**Phase A guard verified**:

- ✅ Godot v2 main CI hygiene blocker resolved (#209 unblocked 5 consecutive lint failures post-#205)
- ✅ P5 Co-op 🟢 → 🟢++ (Sistema escalation HUD top-strip live)
- ⚠ Skiv Monitor scheduled fail = pre-existing GH Actions PR-create permission denied (cosmetic, defer Day 2+)

**ADR-2026-05-07-abort-web reincarnate target Sprint M.7 chip post Phase A stable**:

- GAP-5 MissionTimer countdown HUD (~2-3h, P6 — ex-QBN debrief reincarnate)
- GAP-7 PassiveStatusApplier wire `main.gd` (~1-2h, P3 — ex-MUTATION-P6-VISUAL reincarnate, 297 ancestor passive trait unblock)
- GAP-10 AiProgressMeter ✅ already shipped #208 (originally bonus, completed sera 2026-05-07)

## Resume trigger canonical (any PC)

> _"leggi docs/planning/2026-05-07-phase-a-handoff-next-session.md, monitoring window day N + Phase B trigger eval"_

OR (post 7gg grace):

> _"Phase B archive web v1: post 7gg grace + 1+ playtest pass, eseguire ADR §6"_

## Cleanup eseguito 2026-05-07

- Tunnel cloudflared killed
- Backend Node :3334 killed
- Worktree fix-deploy-quick-rebuild + canvas-grid + phone-smoke-bot + playwright-ws + iter3 removed
- 5 worktrees stale residue (dazzling-mirzakhani, interesting-moore, peaceful-chaplygin, practical-gauss, phase-a-live-actions) — left intact (claudia/handoff branches active)
- ADR #2088 ACCEPTED + push
- Memory save canonical (project_phone_smoke_2026_05_07_b8_fix.md)

## Cross-ref

- [ADR-2026-05-05](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) — Phase A ACCEPTED
- [PR #2088](https://github.com/MasterDD-L34D/Game/pull/2088) — ADR ACCEPTED merge
- [docs/planning/2026-05-07-cutover-handoff-alternative-qa.md](2026-05-07-cutover-handoff-alternative-qa.md) — alternative QA philosophy origin
- [docs/playtest/AGENT_DRIVEN_WORKFLOW.md](../playtest/AGENT_DRIVEN_WORKFLOW.md) — Tier 1 canonical workflow
- [docs/playtest/2026-05-07-phone-smoke-bundle-rca.md](../playtest/2026-05-07-phone-smoke-bundle-rca.md) — B6+B7+B8 forensic
- Memory: `~/.claude/projects/.../memory/project_phone_smoke_2026_05_07_b8_fix.md`
- Memory: `~/.claude/projects/.../memory/feedback_agent_browser_playtest_pattern.md`
