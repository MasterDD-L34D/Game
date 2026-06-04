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

### Phase 2 -- retry-allowance + soft-ramp -- ❌ DROPPED (2026-06-04)

The N=10 0/10 that "motivated" retry-allowance was a **CALIBRATION ARTIFACT, not a climax gate**: at
the AUTHORED overlay completion = 10/10 (the climax is winnable). See the band-verify
`docs/playtest/2026-06-04-optionc-phase3-retune-band-verify.md`. **No retry mechanic is needed.**

### Phase 3 -- re-tune ✅ DONE (2026-06-04, `77021ca8`); re-ratify = the only gate left

Re-tuned the graph-mode `calibrationScaling` overlay `countMult 5 + hpAdd 4 -> 3 + 2` (the stale
default was tuned for the weak fallback enemies; `5x` an authored hardcore roster gave the 0/10).
N=40: greedy 0.75 / ESFP 0.775 / INTJ 0.775, all inside the #2589-ratified wider band (0.4-0.85).
Static `cave_path` default (cm5/hp3) unchanged -> no static re-ratify. **Owner re-ratify
(master-dd):** ratify the ~0.77 centre (within 0.4-0.85), OR ask for a tighter ~0.6 (a harder
overlay e.g. `cm3 + hpAdd 3` lowers it); also update the aggregator `PROVISIONAL_BANDS`. Then: the flip.

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
