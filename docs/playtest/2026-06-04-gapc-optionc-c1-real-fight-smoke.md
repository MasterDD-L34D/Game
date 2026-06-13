---
title: 'GAP-C option-C C1 -- mode-aware loadEncounter real-fight smoke'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-04'
source_of_truth: false
language: en
review_cycle_days: 30
---

# GAP-C option-C C1 -- real-fight smoke (mode-aware loadEncounter)

Gate-5 evidence for Phase 1 (mechanism C1) of the option-C decouple spec
(`docs/superpowers/specs/2026-06-03-worldgen-gapc-option-c-graph-combat-decouple-design.md`).
Proves graph-mode combat now resolves the REAL telegraphed encounter for every meta-network
node, while the static `cave_path` path stays byte-stable.

## Method

`loadEncounter(id)` (static) vs `loadEncounter(id, { graphMode: true })` for the 6 meta-network
node-served encounters (N=1) plus the terminal hardcore alt `enc_tutorial_06_hardcore`. Static
reads `docs/planning/encounters/` only; graph-mode unions `docs/planning/encounters-draft/`.

## Result (2026-06-04)

| node                          | encounter                         | static   | graph-mode | waves | objective     |
| ----------------------------- | --------------------------------- | -------- | ---------- | ----- | ------------- |
| DESERTO_CALDO                 | enc_savana_01                     | REAL     | REAL       | 2     | elimination   |
| FORESTA_TEMPERATA             | enc_caverna_02                    | REAL     | REAL       | 2     | capture_point |
| BADLANDS                      | enc_tutorial_03                   | degraded | REAL       | 2     | elimination   |
| CRYOSTEPPE                    | enc_tutorial_04                   | degraded | REAL       | 2     | elimination   |
| ROVINE_PLANARI (terminal)     | enc_tutorial_05                   | degraded | REAL       | 2     | elimination   |
| ATOLLO_OBSIDIANA              | enc_tutorial_07_hardcore_pod_rush | degraded | REAL       | 1     | elimination   |
| ROVINE_PLANARI (hardcore-alt) | enc_tutorial_06_hardcore          | degraded | REAL       | 1     | elimination   |

**STATIC real: 2/7 GRAPH real: 7/7.**

Before C1: 2/6 nodes real; 4 (incl the terminal climax) degraded to a fallback elimination.
After C1: every node delivers its real telegraphed encounter in graph mode; the static path is
unchanged (still 2/7), so the ratified static `cave_path` bands are untouched.

## Backing tests

- `tests/services/combat/encounterLoaderGraphMode.test.js` (4): graph unions drafts, static does not, live wins on collision, listEncounters.
- `tests/api/sessionEncounterWiringGraphMode.test.js` (2): `/session/start { graph_mode:true }` loads a draft node-encounter; without it, static path unchanged.
- AI suite 500/500; combat-service + session-encounter-wiring regression 15/15 + 6/6.

## Scope / not-yet (gated)

This closes the combat-DELIVERY gap (the fight matches the telegraph). It does NOT do the
completion BALANCE pass: a graph descent can now chain up to 4 real gating fights, which moves
graph-mode completion. Phase 2 (retry-allowance + soft-ramp) and Phase 3 (graph-mode N=40
band-verify + `calibrationScaling` re-tune + #2589 re-ratify + static N=40 regression) handle
that. **THE FLIP (`META_NETWORK_ROUTING=true` in prod) stays gated on Phase 3 + master-dd go.**
Flag OFF in prod -> this PR has zero live-campaign impact.
