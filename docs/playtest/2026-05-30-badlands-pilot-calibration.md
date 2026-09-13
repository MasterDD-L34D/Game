# Badlands adapter pilot -- phase 2b calibration (N=40)

- Date: 2026-05-30
- Scenario: `enc_badlands_pilot_01` (ecology->combat adapter pilot, spec #2457)
- Ticket: TKT-ADAPTER-ECO-COMBAT phase 2b
- Verdict: **GREEN -- ratified** (win_rate ~0.51 over 3 independent N=40 passes)

## Goal

Phase 2a shipped the badlands pilot: a fresh encounter whose 5 enemies are derived by
`ecologyCombatAdapter.deriveCombatStats()` from real badlands species ecology
(threat_tier x role_class). The enemy stats were the untuned adapter baseline and the
encounter sat at a provisional `standard` class with `calibration_status: pending`.

Phase 2b = calibrate the pilot to a target band via `calibrate_parallel.py`, then ratify.

## Band decision

Added a NEW, SEPARATE `badlands` encounter_class to `data/core/balance/damage_curves.yaml`
(it never touches the ratified hardcore_06 [0.15,0.25] / hardcore_07 [0.30,0.50] bands --
census anti-pattern 5). Tone: first-contact badlands biome pilot, difficulty 5/10 quartet,
"engaging but winnable" -> ~50% win.

- `win_rate: [0.40, 0.60]` (PRIMARY pillar, per handoff)
- `defeat_rate: [0.30, 0.60]` (see consistency note below)
- `timeout_rate: [0.00, 0.15]`
- `enemy_damage_multiplier: 1.0` (NEUTRAL on purpose -- so the adapter is the sole stat
  lever and calibration mirrors real play; see "calibration == real play" below)

## Method

`tools/py/calibrate_parallel.py --scenario badlands_pilot_01` (Method C parallel shards,
LOBBY_WS_ENABLED=false per L-071). New files:

- `tools/py/batch_calibrate_badlands_pilot_01.py` (copy of hardcore06 retargeted)
- SCENARIO_MAP entry `badlands_pilot_01` + `encounter_class` key (also fixed
  `aggregate_merged` which previously hardcoded `encounter_class="hardcore"`).

### calibration == real play

`getEncounterClass(req.body)` reads `req.body.encounter_class`. The hardcore06 batch never
sent it, so its backend silently ran at the `standard` 1.2x multiplier while the
`--encounter-class` flag only changed client-side band/turn-limit. The badlands batch's
`run_one` sends `encounter_class: 'badlands'` in the `/session/start` body, so the backend
applies the badlands class multiplier (1.0). With mult 1.0 the enemy stats in calibration
equal the stats real play resolves (scenario.encounter_class = 'badlands'). No mismatch.

## Iterations (discipline: L-069 N=40 ratify, L-070 1-knob/iter, L-072 N=10 probe)

| iter     | change                               | N   | seed | WR    | DR    | TR   | verdict    | note                                 |
| -------- | ------------------------------------ | --- | ---- | ----- | ----- | ---- | ---------- | ------------------------------------ |
| baseline | adapter baseline, no turn limit      | 10  | 42   | 0.70  | 0.00  | 0.30 | RED        | enemies not lethal; fights drag      |
| iter1    | MOD_BASE +4 (staging override)       | 10  | 42   | 0.30  | 0.10  | 0.60 | RED        | REJECTED: raised timeout, not defeat |
| iter2    | revert adapter; turn_limit_defeat=34 | 40  | 1000 | 0.45  | 0.55  | 0.00 | RED        | DR +5pp over (old [0.30,0.50] band)  |
| iter3    | turn_limit_defeat=37                 | 40  | 1000 | 0.525 | 0.475 | 0.00 | GREEN      | in band                              |
| confirm  | turn_limit_defeat=37                 | 40  | 2000 | 0.475 | 0.525 | 0.00 | (band fix) | pooled N=80: WR 0.500                |
| final    | turn_limit_defeat=37, band corrected | 40  | 3000 | 0.525 | 0.475 | 0.00 | GREEN      | ratify artifact                      |

## Key findings

1. **The adapter baseline stats are correct as-is.** No HP/MOD knob override was needed.
   The handoff anticipated "raise HP since baseline too weak", but the empirical signal was
   different: baseline DR=0.00 (enemies never kill a player) + TR=0.30 (fights stall). The
   weakness was not durability -- it was that the quartet-vs-5 elimination naturally runs
   ~30 rounds and ~30% of games stalled to MAX_ROUNDS (round 41) as timeouts.

2. **MOD+4 was the wrong lever** (iter1). Raising enemy to-hit/damage killed _some_ players
   -> party DPS dropped -> the survivors could not clear the enemies in time -> timeout rose
   to 0.60 (not defeat). Reverted.

3. **The calibration lever was the class `turn_limit_defeat`** (Flint Long War pattern,
   same structural fix standard/hardcore use). It converts genuine stalls to tactical
   defeats, collapsing the timeout band to ~0. Tuned 34 -> 37: at 34 the cut was slightly
   too early (WR 0.45 / DR 0.55); 37 lets the slow-but-winnable fights (turns 32-37) resolve
   as wins, centering WR at ~0.51.

4. **Band consistency fix.** Initial defeat_rate band [0.30,0.50] was set before knowing the
   scenario resolves decisively (TR ~ 0 with the turn limit). With TR ~ 0, DR = 1 - WR, so a
   DR ceiling of 0.50 is inconsistent with a WR band whose floor is 0.40 (=> DR up to 0.60).
   Corrected to [0.30,0.60] (consistent with the primary WR band + minor timeout slack).

## Ratification

- Three independent N=40 passes (seeds 1000/2000/3000): WR 0.525 / 0.475 / 0.525.
  Pooled effective WR ~0.51 (N=120), centered in the primary band [0.40,0.60]. TR=0 every run.
- Locked config (committed, no staging override):
  - `data/core/balance/damage_curves.yaml`: `badlands` class (bands + mult 1.0 + turn_limit_defeat 37).
  - `apps/backend/services/worldgen/badlandsPilotScenario.js`: `encounter_class: 'badlands'`,
    `calibration_status: 'ratified-2026-05-30'`.
  - `ecologyCombatAdapter.js` DEFAULT_KNOBS: UNCHANGED (baseline ratified).

## Reproduce

```
# from a clean worktree off origin/main, with isolated node_modules (npm ci)
python tools/py/calibrate_parallel.py --scenario badlands_pilot_01 --n 40 \
    --shards 4 --base-port 3341 --seed 3000 --label repro
# -> docs/playtest/parallel-badlands_pilot_01-repro-merged.json  (verdict GREEN)
```
