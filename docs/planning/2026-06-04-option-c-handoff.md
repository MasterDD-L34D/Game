---
title: 'Option-C handoff -- meta-network graph-combat (C1 shipped, Phase 2+3 to flip)'
date: 2026-06-04
doc_status: active
doc_owner: master-dd
workstream: worldgen
last_verified: '2026-06-04'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Option-C handoff -- 2026-06-04

## TL;DR

- **C1 SHIPPED** ([Game #2601](https://github.com/MasterDD-L34D/Game/pull/2601) squash `3ab6aca7`): graph-mode combat resolves the REAL telegraphed encounter for all 6 meta-network nodes (was 2/6; terminal climax was degraded). `loadEncounter(id,{graphMode})` unions `encounters-draft/`; static path byte-stable. Flag `META_NETWORK_ROUTING` OFF in prod.
- **Band-verify FIDELITY wired** ([Game #2603](https://github.com/MasterDD-L34D/Game/pull/2603), OPEN owner-gated): the sim now fights the REAL draft rosters in graph mode (`buildScenarioEnemies(...,{graphMode})`). Pre-this the 4 draft nodes fought weak-fixed fallback enemies -> the #2589 ratified bands measured FALLBACK combat, not real difficulty.
- **MEASURED (the reason we paused)**: N=10 greedy graph-mode = **completion 0/10** (band 0.4-0.7). Blocker = terminal climax `enc_tutorial_05` timeout (6/10, after winning the 2 live fights) + occasional `enc_savana_01` timeout (4/10). REAL difficulty (4 chained gating fights), not a bug.
- **FLIP stays gated** on Phase 2 + Phase 3 below + master-dd go. Spec (ratified): `docs/superpowers/specs/2026-06-03-worldgen-gapc-option-c-graph-combat-decouple-design.md`.

## Done this session

| Item                                | Ref              | State              |
| ----------------------------------- | ---------------- | ------------------ |
| C1 mode-aware loadEncounter         | #2601 `3ab6aca7` | MERGED             |
| Sim band-verify fights real rosters | #2603            | OPEN (owner-gated) |
| N=10 greedy graph-mode probe        | this doc         | 0/10 measured      |

## Remaining to the flip (dedicated session)

### Phase 2 -- retry-allowance + soft-ramp (RATIFIED, unbuilt)

Spec section 9.1. Retry-allowance = graph mode permits re-attempt / reroute on a lost node (meta-loop run-structure). Where it lives: the campaign `/advance` defeat path (`apps/backend/routes/campaign.js`) today does "retry same" -- extend for a graph reroute / bounded re-attempt. Soft-ramp = mostly already in the data (`prior_node_cleared` edge gates). Needs its own brainstorm -> spec -> TDD. The measurement shows the terminal climax is the dominant killer -> retry-allowance directly addresses it.

### Phase 3 -- band-verify + re-ratify (mandatory before flip-with-real-fights)

Spec section 6. 1) graph-mode N=40 via `tools/sim/full-loop-batch.js --runs 40` (`META_NETWORK_ROUTING=true`, greedy + MBTI sample). 2) **re-tune `calibrationScaling` graph-mode knobs on the REAL rosters** -- the current `hpAdd4` (#2589) was tuned for the fallback enemies and is now over-hard (even savana times out); sim-only, reversible via `FL_ENEMY_*`. 3) re-ratify the #2589 graph-mode bands with the new substrate (master-dd decision-handoff). 4) static `cave_path` N=40 unchanged regression.

### Disambiguation insight (do this FIRST in the dedicated session)

The 0/10 CONFOUNDS two causes: the terminal-climax gate AND the stale fallback-tuned scaling. **Re-tune the graph-mode `calibrationScaling` on real rosters first** (Phase 3 step 2) until the live fights (savana/caverna) win reliably -> THEN the residual failure isolates the climax-gate -> size Phase 2 (retry-allowance) from clean data. This avoids over/under-building retry.

### Then: the flip + the consumer

- Flip (owner, reversible): FF the lenovo-host worktree to main + `export META_NETWORK_ROUTING=true` in `~/.config/api-keys/keys.env` + restart the `EvoTacticsBackend` scheduled task (self-heal launcher frees ports). Verify `evo-tactics.com/api/campaign/meta-network/next` -> `enabled:true` + a `/start->/advance->/choose` smoke.
- Consumer (Gate-5): the Godot route-choice UI (`#401` single + `#404` coop merged) must send `graph_mode:true` on `/session/start` for routed fights (cross-repo Game-Godot-v2).

## Cross-refs

- Spec (ratified, on main): `docs/superpowers/specs/2026-06-03-worldgen-gapc-option-c-graph-combat-decouple-design.md`.
- C1 plan + evidence: `docs/superpowers/plans/2026-06-04-gapc-optionc-c1-mode-aware-loadencounter.md`, `docs/playtest/2026-06-04-gapc-optionc-c1-real-fight-smoke.md`.
- Memory: `project_meta_network_live_routing.md` (C1 + flip-gate corrected).
- Reproduce the probe: `GIT_COMMIT=$(git rev-parse HEAD) META_NETWORK_ROUTING=true node tools/sim/full-loop-batch.js --runs 10 --policy greedy --out <dir>` (needs #2603 wiring).
