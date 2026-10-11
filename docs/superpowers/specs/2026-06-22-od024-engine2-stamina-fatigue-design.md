---
title: 'OD-024 engine #2 -- stamina/fatica sprint subsystem (propriocezione hook)'
doc_status: draft
doc_owner: master-dd
workstream: backend
last_verified: '2026-06-22'
source_of_truth: false
language: en
review_cycle_days: 30
---

# OD-024 engine #2 -- stamina/fatica sprint subsystem

> Brainstormed 2026-06-22 (OD-024 D6, second of the 3 hook engines). Design pass
> chosen by master-dd over a straight build because no fatigue mechanic exists --
> this is a from-scratch subsystem, not a magnitude tweak. **v2**: the first design
> was killed by an adversarial review (two P1s -- see §9); this spec is the
> redesign.

## 1. Goal + gap

The `propriocezione` interoception trait (RFC sentience v0.1, gateway T1) currently
fires only its T1 effect: `attack_bonus +1` on attack (in
`data/core/traits/active_effects.yaml`, genuinely live via
`traitEffects.evaluateAttackTraits`). Its richer hook is authored but inert -- the
YAML `description_it` reads: _"Hook: -1 stack fatica sprint (folded in stamina engine
separato)"_. **No fatigue / sprint / stamina mechanic exists** (verify-first: zero
hits for `fatica` / `sprint` / `stamina_pool` across `apps/backend/services`). This
engine builds that substrate so the hook becomes real.

The mechanic is a general combat rule (any unit that over-commits to movement tires);
`propriocezione` is a _modifier_ on it (its bearers tire later).

## 2. Ratified model (master-dd, 2026-06-22)

| Decision              | Verdict                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Sprint trigger        | A unit that ends a round having spent **all** its AP on movement (voluntary moves only) -- see §3 |
| Fatigue shape         | Stack + threshold + decay (per-unit counter)                                                      |
| Penalty at threshold  | **-1 AP** on the next round                                                                       |
| propriocezione effect | **+1 fatigue tolerance** (penalty threshold 2 instead of 1) -- NOT immunity                       |
| Flag                  | New `STAMINA_FATIGUE_ENABLED`, default OFF, band-neutral                                          |
| Flip gate             | post N=40 calibration of the grant + this mechanic                                                |

## 3. The "sprint" definition (fix for P1-reachability)

The naive "moved >= 3 tiles in a round" is **unreachable**: `DEFAULT_AP = 2`
(`apps/backend/routes/sessionConstants.js`) and movement costs 1 AP/tile
(`session.js`: `ap_remaining -= dist`), so a default unit moves at most 2 tiles/round.
A fixed tile constant is inert by construction.

**Sprint = the unit ended the round with `ap_remaining == 0` AND moved >= 2 tiles via
voluntary move actions this round.** This ties "sprint" to _over-committing the whole
turn to repositioning_ -- reachable at AP=2 (move 2, 0 left), and it auto-scales (a
3-AP unit must move 3 to "sprint"). Forced displacement (knockback / `spinta` /
reaction-induced moves) does **not** count -- only player/AI-issued `move` actions are
tallied.

## 4. Architecture

A single pure module + one persisted integer field + two boundary hooks.

### 4.1 State

`unit.fatica` : integer >= 0, default 0. **Must be added to the `normaliseUnit`
allowlist** (`apps/backend/services/sessionHelpers.js`) -- that function rebuilds the
unit from an explicit field list and silently drops unknown keys (the documented
"Engine LIVE Surface DEAD" trap). Without this, `fatica` never survives `/start` or a
save-load. Plus a transient per-round accumulator `unit._tiles_voluntary_round`
(non-persisted; reset each round) to sum split moves.

### 4.2 Module `apps/backend/services/combat/staminaFatigue.js` (pure)

Constants (RATIFIED-PROVISIONAL knobs, documented in the header; YAML-promotion path
noted in §8):

```
SPRINT_MIN_TILES        = 2   // with ap_remaining==0 -> "all-AP-on-move" sprint
FATIGUE_PENALTY_THRESHOLD = 1 // fatica >= 1 -> penalty (proprio: 2)
PROPRIOCEZIONE_TOLERANCE  = 1 // +1 to the threshold for propriocezione bearers
FATIGUE_DECAY           = 1   // -1 fatica per non-sprint round
AP_PENALTY              = 1   // -1 AP next round when over threshold
```

Functions:

- `isFatigueEnabled(env = process.env)` -> flag gate.
- `isSprintRound(unit)` -> `ap_remaining == 0 && _tiles_voluntary_round >= SPRINT_MIN_TILES`.
- `accrueOrDecay(unit)` -> if `isSprintRound`: `fatica += 1`; else `fatica = max(0, fatica - FATIGUE_DECAY)`. Clamp `>= 0`. Resets `_tiles_voluntary_round = 0`.
- `penaltyThreshold(unit)` -> `FATIGUE_PENALTY_THRESHOLD + (hasPropriocezione(unit) ? PROPRIOCEZIONE_TOLERANCE : 0)`.
- `fatiguePenalty(unit)` -> `fatica >= penaltyThreshold(unit) ? AP_PENALTY : 0`.

All no-op when the flag is OFF (callers guard on `isFatigueEnabled`).

### 4.3 Hooks (verified integration points)

- **Voluntary-move tally**: increment `unit._tiles_voluntary_round` where a `move`
  action's `dist` is charged (`session.js` per-action path ~`:3059`; the round-model
  path threads `ap_cost` via `sessionRoundBridge.js`). Only count actor-issued moves.
- **Accrue/decay at round boundary**: call `accrueOrDecay` from the established
  end-of-round write-through `applyEndOfRoundSideEffects`
  (`sessionRoundBridge.js:~1242`, the same hook `cumulativeStateTracker` uses) -- the
  canonical per-round side-effect point. This is the home for round-scoped state; we
  do NOT invent a new accumulator path.
- **Apply -1 AP**: in `applyApRefill` (`sessionHelpers.js:~832-853`), which sets
  `ap_remaining = cap` BEFORE the budget check (precedent: the wound `apMalus` and the
  `chilled`/`slowed` maluses there). Use `ap_remaining = Math.max(1, cap - fatiguePenalty(unit))`
  -- floor at **1**, never 0, so fatigue never costs a whole turn (death-spiral guard).

## 5. The loop (worked example)

Default 2-AP unit, flag ON, no propriocezione (threshold 1):

1. Round A: moves 2 tiles (0 AP left) -> sprint -> `fatica = 1`.
2. Round B start: `fatiguePenalty = 1` (1 >= 1) -> AP refills to `max(1, 2-1) = 1`.
   Unit has 1 AP this round. If it does NOT sprint -> `fatica` decays to 0.
3. Round C: back to 2 AP, no penalty.

So one all-out reposition costs you the next round's tempo, then you recover. A
propriocezione unit (threshold 2) shrugs off a single sprint (fatica 1 < 2) and is
only penalized after two sprint-rounds without recovery -- hardier, not immune.

## 6. Band-neutrality (fix for P2-serialization)

Flag OFF must be a **true** no-op, including output. `publicSessionView`
(`sessionHelpers.js:~421`) spreads the whole unit, and `rewindBuffer` deep-clones
`session.units`; once `fatica` is in the `normaliseUnit` allowlist it would otherwise
surface in every state response / WS frame / snapshot. Therefore:

- `normaliseUnit` sets `fatica` only when the flag is ON (else the key is absent).
- `publicSessionView` emits `fatica` only when the flag is ON.

=> with the flag OFF the serialized payload is byte-identical to today. The combat
band is also unchanged (no accrual, no penalty). Both senses of "neutral" hold.

## 7. Edge cases

- **Split moves**: summed via `_tiles_voluntary_round` across all move actions in the
  round; the sprint test reads the per-round total, not a single move.
- **Forced movement**: excluded -- only actor-issued `move` actions increment the tally.
- **bravado +1 AP on kill** (`bravado.js`): a mid-turn AP refill can let a unit take a
  3rd tile; that simply means a higher AP budget was available, and "all AP on move"
  still requires ending at 0 -- consistent, no special-case.
- **Both engines on one unit** (engine #1 nocicezione -1 init + engine #2 -1 AP): a
  wounded+fatigued unit is slower and has fewer AP. Bounded (engine #1 is a capped
  binary trigger; engine #2 floors AP at 1). Accepted as intended "pressure stacks".

## 8. Canon compliance

The trait's PRIMARY magnitude stays in YAML (`propriocezione.effect = attack_bonus 1`,
live). The hook is externalized by canon itself (the YAML `description_it` says
"folded in stamina engine separato"), mirroring engine #1 (nocicezione's "ritardi"
hook is a boolean trigger in `statusModifiers.js`, no JS magnitude). **Caveat owned**:
engine #2 introduces four genuinely new tunable constants in JS (vs engine #1's zero).
They live in the module header as RATIFIED-PROVISIONAL knobs; `active_effects.yaml` is
only loosely gated (`tests/lint/test_trait_schema_gate.py` checks the `schema_version`

- `design` block, not `effect` shape), so these CAN be promoted into a structured YAML
  block later if master-dd wants them data-driven. Not done now (YAGNI; flag-gated).

## 9. What the v1 review killed (for the record)

Adversarial review 2026-06-22 verdict = NEEDS-REDESIGN. P1s: (1) sprint >=3 tiles
unreachable at `DEFAULT_AP=2` -> inert mechanic; (2) the per-round movement tally did
not exist (no accumulator, two incompatible AP/round flows, `turn` increments
per-unit-activation in the legacy path). P2s: false band-neutrality (field serialized
via `publicSessionView`/rewind once persisted); accrual+decay self-cancel so the
penalty never fired; propriocezione net-0 = immunity that trivialized the mechanic for
its own bearers; missing `normaliseUnit` allowlist entry. v2 (this spec) fixes all.

## 10. Testing

- `staminaFatigue` unit tests: `isSprintRound` (all-AP-on-move yes / partial no /
  forced-move excluded), `accrueOrDecay` (accrue, decay, clamp >=0, reset accumulator),
  `penaltyThreshold` (1 default / 2 propriocezione), `fatiguePenalty` (fires at
  threshold), `isFatigueEnabled` (flag).
- Integration: a sprinting unit gets AP refilled to `max(1, cap-1)` next round; a
  propriocezione unit survives one sprint un-penalized; flag OFF -> `fatica` absent
  from `publicSessionView` + zero band effect.
- Regression: full `test:api` + the combat/round suites green; snapshot
  (`generationSnapshot.spec.js`) unchanged with flag OFF.

## 11. Out of scope / sequenced after

- N=40 calibration of the mechanic (+ the grant) before the flag flip (D7).
- Engine #3 (encumbrance, `equilibrio_vestibolare`) -- needs an inventory/weight system
  that is also absent; separate sub-project.
- Promoting the four knobs into `active_effects.yaml` as a structured block (optional,
  if master-dd wants them data-driven).
