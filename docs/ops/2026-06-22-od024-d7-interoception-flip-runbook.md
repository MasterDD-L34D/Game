---
title: 'OD-024 D7 -- interoception grant flip runbook + N=40 gate'
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-22'
source_of_truth: false
language: en
review_cycle_days: 90
---

# OD-024 D7 -- interoception grant flip runbook

> Owner-gated. This documents the gate evidence (N=40 band-validation) + the exact
> hand steps to flip `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` ON in production.
> Claude cannot flip it (host env + restart = owner hands; never touches prod from
> a session). The D2 tier map values + D4 override rule are RATIFIED; **N=40 gates
> the flip, not the values** (#2947).

## What D7 is

D7 = the **incremental** flip of the sentience runtime flags, one piece at a time,
each gated by its own N=40 band-validation:

1. `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` -- the interoception grant
   (D1-D4: producer, D2 tier map, D3 enemy-wire, D4 per-species overrides). THIS runbook.
2. `STAMINA_FATIGUE_ENABLED` -- engine #2 (sprint stamina/fatigue). Separate N=40 +
   flip (own runbook when its gate is run).

Incremental = flip #1, observe in real play, then consider #2. Do NOT flip both at once.

## Why a gate is needed

The flag is band-neutral while OFF (the producer never grants). Flipping it ON grants
+1-attack / -1-damage-while-Ferito interoception traits to qualifying species (the
party AND, via D3, the `sistema`/enemy units at `/start`). That shifts combat
outcomes. The N=40 batch measures whether the meta bands (esp. `completion_rate`,
ratified 0.4-0.7) stay in-band with the flag ON.

## N=40 evidence

Harness: `tools/sim/full-loop-batch.js` (in-process `createApp` + supertest -- NO
external/prod backend, NO prod-port risk). Paired A/B via a shared `--seed-base`:
the only difference between arms is the flag, so the band delta is the flag's effect.

Run (on a worktree off origin/main, catalog with the #2955 overrides):

```bash
# baseline (flag OFF)
node tools/sim/full-loop-batch.js --runs 40 --seed-base 7000 \
  --out reports/sim/intero-n40-off
# flag ON
SENTIENCE_INTEROCEPTION_GRANT_ENABLED=true node tools/sim/full-loop-batch.js \
  --runs 40 --seed-base 7000 --out reports/sim/intero-n40-on
```

Compare `summary.json` between arms (completion_rate + the meta bands +
`od024_firing_pct` should be 0 in the OFF arm and >0 in the ON arm).

<!-- EVIDENCE -->

**Run 2026-06-22** (commit `7ddbe3d3`, N=40, `--seed-base 7000`, branch cave_path,
policy greedy; in-process). All 7 meta-metrics IN-BAND in BOTH arms:

| metric                            | band            | OFF   | ON    | in-band   |
| --------------------------------- | --------------- | ----- | ----- | --------- |
| completion_rate                   | 0.4-0.7         | 0.625 | 0.600 | yes / yes |
| roster_attrition                  | 0-1             | 0.533 | 0.470 | yes / yes |
| economy build_power_drift         | 0.5-2           | 1.135 | 1.08  | yes / yes |
| relationship recruit_rate         | (no hard range) | 5.175 | 5.575 | yes / yes |
| offspring_avg                     | >=1             | 4.375 | 4.70  | yes / yes |
| lineage_diversity                 | >=3             | 5     | 5     | yes / yes |
| roster_composition distinct_roles | >=3             | 5     | 5     | yes / yes |

Delta is small and directionally sensible: flag ON makes encounters marginally
harder (completion -0.025, attrition -0.063 = a few more real losses), consistent
with enemies gaining pain/proprioception awareness. No band breaks. Reports:
`reports/sim/intero-n40-{off,on}/` (summary.json + report.md).

**Scope caveat (honest):** the metrics DIFFER between arms (paired same-seed) only
because the grant FIRED -- proof the flag had a real effect. BUT `full-loop-batch`
is a SINGLE-PLAYER AI sim: it exercises the grant on `sistema`/enemy units via
`session.js` `/start` (D3 enemy-wire), NOT the co-op party-submit path
(`coopOrchestrator.submitCharacter`, which only runs in real co-op). So this N=40
validates the ENEMY-side of the flip is band-safe. The party-side (co-op) gives
both sides the grant symmetrically, so the net win-rate shift should be no larger;
a co-op-path measure can confirm before/with the flip if master-dd wants it.

<!-- /EVIDENCE -->

**Verdict:** PENDING master-dd. The batch REPORTS the band placement (L-069); it never
ratifies the flip. master-dd reads the table + decides ON vs re-tune.

## Flip steps (OWNER hands -- production)

Prod backend = the `EvoTacticsBackend` scheduled task on the Lenovo host (git-bash
`npm run start:api`), serving HTTP `:3334` + WS `:3341` (always-on; see
[[lesson_prod_host_ports_3334_3341]]). **NEVER kill 3334/3341** -- restart via the
scheduled task only.

1. **Add the flag to prod env.** The producer reads `process.env.SENTIENCE_INTEROCEPTION_GRANT_ENABLED`.
   Put it where the `EvoTacticsBackend` task's process sees it:
   - If the `start:api` wrapper sources `~/.config/api-keys/keys.env`, add the line there:
     ```
     export SENTIENCE_INTEROCEPTION_GRANT_ENABLED=true
     ```
   - Else set it in the scheduled-task environment directly.
     (Verify which applies on the host: check whether the task's start command sources
     keys.env. If unsure, set BOTH and reconcile.)
2. **Restart the task** (NOT kill-by-port):
   ```powershell
   Stop-ScheduledTask  -TaskName EvoTacticsBackend ; Start-ScheduledTask -TaskName EvoTacticsBackend
   ```
3. **Verify live** (3 steps -- config-change discipline):
   - re-read the env the process got (flag = true);
   - `curl http://localhost:3334/health` -> 200 (prod up);
   - probe a character-submit / check the `od024_firing_pct` pillar metric > 0 (the
     grant is now firing in real play).
4. **Rollback** if win-rates regress in real play: set the flag back to `false` (or
   remove the line), restart the task. The override data in the catalog is inert again.

## After this flip

- `STAMINA_FATIGUE_ENABLED` = next incremental piece (own N=40 + flip).
- D6 engine #3 (encumbrance) = PARKED (needs an absent inventory/weight system).

Refs: producer `apps/backend/services/sentience/sentienceInteroceptionGrant.js`;
D4 spec `docs/superpowers/specs/2026-06-22-od024-d4-interoception-overrides-rule-design.md`;
D2 ratify #2947; D4 pipeline #2950; D4 populate #2955.
