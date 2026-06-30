---
title: 'STAMINA_FATIGUE paired N=40 band-safety evidence (OD-024 engine #2)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
tags: [playtest, calibration, od-024, stamina, fatigue, n40, ai-driven]
---

# STAMINA_FATIGUE paired N=40 -- band-safety evidence (Tier-3 N=40 lane)

Tier-3 N=40 lane item N4 (OD-024 engine #2, sprint stamina/fatica). The mechanic
is BUILT + wired flag-gated OFF (`STAMINA_FATIGUE_ENABLED`, PR #2937); this is the
paired band-safety N=40 the flip is gated on. The flag is NOT flipped here -- the
flip + the 4 provisional-knob ratifications are master-dd's call (below).

## Mechanic (verified vs code)

`apps/backend/services/combat/staminaFatigue.js`, carrier-INDEPENDENT (fires on any
unit, player or sistema -- not gated on a trait carrier). A unit that ENDS a round
with `ap_remaining==0` AND moved `>=2` voluntary tiles = "sprint" -> `+1 fatica`;
`fatica >= threshold` (1, or 2 for `propriocezione` bearers) -> `-1 AP` next round,
floored at 1; `-1 fatica` decay per non-sprint round. AP floor 1 = a sprint never
costs a whole turn.

## Method

Paired A/B, same `--seed-base 7000`, `tools/sim/full-loop-batch.js` (in-process
`createApp` + supertest, NO prod-port, node 22, `--isolate` child-per-seed). The
ONLY difference between arms is `STAMINA_FATIGUE_ENABLED`. The `--isolate` child
inherits `env: process.env` (full-loop-batch.js:383), so the flag reaches each
child's in-process backend (verified -- not the silent-skip trap that needs the
party-grant SIM hook).

- ARM OFF: `node tools/sim/full-loop-batch.js --runs 40 --branch cave_path --policy greedy --seed-base 7000 --isolate --out reports/sim/stamina-n40-off`
- ARM ON: `STAMINA_FATIGUE_ENABLED=true node tools/sim/full-loop-batch.js --runs 40 --branch cave_path --policy greedy --seed-base 7000 --isolate --out reports/sim/stamina-n40-on`

Firing-proof (the mechanic actually activates with the flag on): the e2e tests
`tests/api/staminaFatigueE2eAccrual.test.js` + `staminaFatigueRefill.test.js` +
`tests/services/staminaFatigue.test.js` = 17/17 green; AND the paired arms differ
on 5 metrics (below) -> fatigue fired (not a silent no-op).

## Results (N=40, summary.json)

| metric                      | OFF         | ON           | in_band (OFF/ON) |
| --------------------------- | ----------- | ------------ | ---------------- |
| completion_rate             | 0.475       | 0.575        | true / true      |
| roster_attrition            | 0.575       | 0.502        | true / true      |
| economy_flow drift          | 1.055       | 1.080        | true / true      |
| relationship (recruit/mate) | 4.45 / 3.75 | 5.275 / 4.45 | true / true      |
| offspring_viability         | 3.75        | 4.45         | true / true      |
| lineage_diversity           | 5           | 5            | true / true      |
| roster_composition          | 5 roles     | 5 roles      | true / true      |

completion: OFF 19/40, ON 23/40. Bands PROVISIONAL (Claude-derived, L-069); the
exact band numbers are master-dd's to ratify.

## Read

- **Band-SAFE**: every one of the 7 meta-metrics is in-band in BOTH arms. No OOB
  cratering, no metric pushed out of range by fatigue.
- **Mechanic FIRED**: the arms diverge on 5 metrics (same seeds) -> fatigue is
  active in the ON arm, not silently skipped.
- **Counter-intuitive but explainable**: fatigue ON nudged the player slightly
  BETTER (completion 0.475 -> 0.575, attrition 0.575 -> 0.502). Because fatigue is
  carrier-INDEPENDENT it also penalizes SISTEMA units (enemies sprint to close on
  the party), so the net effect on the party is neutral-to-slightly-positive. This
  is a DESIGN observation for master-dd (see owner-gate Q3), not a band failure --
  the magnitude is modest (+4 completed campaigns / 40) and everything stays
  in-band.

## Owner-gate (master-dd; NOT done in this session)

The N=40 measurement is the only autonomous step. The remaining steps are owner:

1. **Flip** (reversible): set `STAMINA_FATIGUE_ENABLED=true` in keys.env + restart
   (I8 prod-flips bundle). Band-safe per above.
2. **Ratify the 4 RATIFIED-PROVISIONAL knobs** (module header): sprint = 2 voluntary
   tiles / threshold 1 (propriocezione 2) / -1 AP penalty / -1 decay per round.
3. **Design call on symmetry**: keep fatigue carrier-independent (penalizes enemies
   too -> net eases the player slightly, ecological realism) OR make it player-only
   (pure tactical cost). Current = carrier-independent.

Raw runs reproducible from the seeded commands above (`reports/sim/stamina-n40-{off,on}/`
summary.json + report.md committed; runs.jsonl reproducible, not committed).

See [[project_sentience_interoception_producer]],
`docs/planning/2026-06-29-closeout-master-plan.md` (N4).
