---
title: Codex Audit Report — session 2026-05-20 cross-PR sweep
date: 2026-05-21
type: audit-report
sprint: post-v44.3-balance-fix-loop
last_verified: 2026-05-21
---

# Codex Audit Report — session 2026-05-20+ cross-PR sweep

## TL;DR (30s)

Cross-PR audit di 16 merged + 1 open PR (#2334-#2354) sessione 2026-05-20.
Found **8 Codex comments** total (4 P1 + 4 P2). All addressed:

| PR    | Priority | Issue                                        | Resolution                                   |
| ----- | -------- | -------------------------------------------- | -------------------------------------------- |
| #2354 | P1       | calibrate_parallel.py shard fail-fast        | ✅ FIXED commit `49b364ab` PR #2354          |
| #2354 | P1       | calibrate_sprt.py batch error abort          | ✅ FIXED commit `49b364ab` PR #2354          |
| #2351 | P1       | ionico traits missing in active_effects.yaml | ✅ FIXED this PR (mirror added)              |
| #2343 | P1       | hello snapshot connected_total ==2 nondet    | ✅ RESOLVED retroactively (typeof checks)    |
| #2334 | P2       | innerHTML XSS escape labels                  | ✅ FIXED this PR (DOM textContent)           |
| #2341 | P2       | BACKLOG.md disconnect-race status            | ✅ RESOLVED retroactively (test added #2336) |
| #2348 | P2       | VC_AXES_ITER default doc incorrect           | ✅ FIXED this PR (doc accurate)              |
| #2348 | P2       | MBTI_REVEAL_THRESHOLD dynamic doc            | ✅ FIXED this PR (doc accurate)              |

**Net**: 4 fixes #2354 + 4 fixes this audit PR + 2 retroactive resolutions = 0 outstanding Codex issues cross session.

## Critical findings

### P1 #2351 — Engine LIVE Surface DEAD anti-pattern manifestation

`scarica_ionica` + `arco_voltaico` shipped solo in `trait_mechanics.yaml`, NOT
in `data/core/traits/active_effects.yaml`. Runtime resolution
(`traitEffects.js loadActiveTraitRegistry` + `routes/session.js:255,716-719`)
reads SOLO da `active_effects.yaml` → traits SILENTLY no-op'd production.

Esattamente anti-pattern Gate 5 (Engine wired DoD CLAUDE.md). **Future check**:
ANY new trait must include mirror entry in BOTH yaml files. Suggest pre-commit
hook OR validator script.

### P1 #2354 — Calibration tool error handling

Calibration tools (`calibrate_parallel.py`, `calibrate_sprt.py`) avevano weak
error surface — subprocess failures silently continued report. Codex caught
PRIMA dell'uso production. Fix:

- `calibrate_parallel.py`: collect shard_failures, abort merge, exit 5
- `calibrate_sprt.py`: track subprocess_failed, decision="BATCH_SUBPROCESS_ERROR", exit 6

## P2 fixes

### #2334 DOM XSS escape

`characterCreation.js:228-235` usava `innerHTML` interpolation con `biome_label_it` /
`trait_label_it` (free-form API labels). Glossary update con HTML chars =
script injection. Fix: build DOM nodes via `textContent`.

### #2348 deploy-min-checklist doc corrections

Due env var defaults documented incorrectly:

- `VC_AXES_ITER` default doc "`1 (auto)`" — runtime sceglie `iter2` quando `events_count >= 10`
- `MBTI_REVEAL_THRESHOLD` default doc "`0.7`" fisso — runtime dynamic `0.6` per short sessions <30 events

Both fixed con accurate description + Codex attribution comment.

## Retroactively resolved

### P1 #2343 — Test assertion racy

Codex flagged strict `connected_total == 2` linea 511 (commit `50332975`).
Successivi commits sostituirono con `typeof === 'number'` checks. Linee
503-507 ora contengono comment acknowledging Codex race concern. No action.

### P2 #2341 — BACKLOG.md premature closure

Codex flagged PR #2341 markava "disconnect-race coverage" closed senza file.
**PR #2336** subsequently added test file (21KB, 548 LOC). Status accurato.

## Verification

- API tests 1267/1267 PASS post-fix
- Format check PASS (prettier --write applied)
- Schema lint PASS
- No regressions

## Files changed (this audit PR)

| File                                   | LOC    | Codex ref         |
| -------------------------------------- | ------ | ----------------- |
| `data/core/traits/active_effects.yaml` | +43    | #2351 P1          |
| `apps/play/src/characterCreation.js`   | +17/-4 | #2334 P2          |
| `docs/ops/deploy-min-checklist.md`     | +2/-2  | #2348 P2 (2 rows) |

## Lessons

### Codex audit cadence canonical

Session 2026-05-20 shipped 21 PR. Mid-session audit trovò 8 unresolved
comments (4 critical). **Adopt practice**: end-of-session OR weekly sweep
via `gh api`/`gh pr view`. Pattern codified for future automation.

### Engine LIVE Surface DEAD persists despite Gate 5

P1 #2351 represents Gate 5 violation despite explicit CLAUDE.md anti-pattern
guard. New trait shipped solo at `trait_mechanics.yaml` level. **Recommendation**:
add validator `tools/check_trait_mirror_consistency.py` per assert ogni entry
in `trait_mechanics.yaml` ha corresponding entry in `active_effects.yaml`.
Future PR candidate.

## Outstanding next session

- iter5 hardcore_06 path B/A
- 3A iter2 hardcore_07 Path B
- Method A Optuna wrap (pip dep gated)
- Backend trait_id exposure (close F-gap)
- Trait mirror validator (P1 #2351 prevention future)

## Bundle resume trigger

> _"trait_id exposure FASE B + Optuna FASE C gated approve OR ship audit PR + iter5"_
