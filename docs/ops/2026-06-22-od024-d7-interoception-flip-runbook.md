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
# flag ON, enemy-side only (single-player full-loop = grant fires on sistema via /start)
SENTIENCE_INTEROCEPTION_GRANT_ENABLED=true node tools/sim/full-loop-batch.js \
  --runs 40 --seed-base 7000 --out reports/sim/intero-n40-on
# flag ON, SYMMETRIC (real co-op = party + enemy both granted)
SENTIENCE_INTEROCEPTION_GRANT_ENABLED=true SIM_GRANT_PARTY_INTEROCEPTION=1 \
  node tools/sim/full-loop-batch.js --runs 40 --seed-base 7000 \
  --out reports/sim/intero-n40-symmetric
```

Compare `summary.json` between arms (completion_rate + the 7 meta bands). Note:
`full-loop-batch` does not emit the `od024_firing_pct` pillar metric, so the signal
is the band deltas below; the metrics differing between arms (paired same-seed) is
itself proof the grant fired.

<!-- EVIDENCE -->

**Run 2026-06-22** (N=40, `--seed-base 7000`, branch cave_path, policy greedy;
in-process). THREE arms, paired same-seed. **All 7 meta-metrics IN-BAND in every
arm.** Key metrics (completion band 0.4-0.7, attrition 0-1, bp_drift 0.5-2):

| arm                        | grant scope               | completion | attrition | bp_drift | all in-band |
| -------------------------- | ------------------------- | ---------- | --------- | -------- | ----------- |
| OFF (baseline)             | none                      | 0.625      | 0.533     | 1.135    | yes         |
| enemy-only                 | sistema via `/start` (D3) | 0.600      | 0.470     | 1.080    | yes         |
| **symmetric (real co-op)** | party + enemy             | **0.525**  | 0.583     | 1.105    | yes         |

The enemy-only arm uses `full-loop-batch` as-is (single-player: grant fires on
`sistema` units via `session.js /start`, NOT the party). The symmetric arm adds
the opt-in `applyPartyInteroceptionGrant` (`SIM_GRANT_PARTY_INTEROCEPTION=1`) so
the party ALSO gets the real producer grant -- the true co-op condition (party via
`coopOrchestrator.submitCharacter` + enemy via `/start`).

**Finding (a prior hypothesis was REFUTED by the measure -- why "measure first"
mattered):** the symmetric case does NOT cancel out. Both sides gaining +1 attack
(propriocezione) makes combats bloodier -> symmetric is the HARDEST arm: completion
0.525 (the largest shift, -0.10 vs the OFF baseline) and the highest attrition
(0.583). It is STILL well inside the 0.4-0.7 band, but the flip makes the game
**meaningfully harder**, not neutral. Reports:
`reports/sim/intero-n40-{off,on,symmetric}/`.

<!-- /EVIDENCE -->

**Verdict:** PENDING master-dd. The batch REPORTS the band placement (L-069); it never
ratifies the flip. **Decision input:** all three arms are in-band, so the flip is
band-SAFE; but the real co-op condition (symmetric) drops completion 0.625 -> 0.525
(a real, noticeable difficulty increase, not a wash). master-dd choices: (a) flip ON
and accept the harder combats as the intended cost of the sentience layer; (b) flip ON
AND soften enemy scaling a notch to re-center completion ~0.6; (c) hold. Re-tune is a
separate calibration knob, not a blocker for band-safety.

## Deploy prerequisite (verify-first, 2026-06-22)

The flag is a **no-op on prod until the code is deployed**. The prod worktree
`/c/dev/_gamewt-lenovo-host` was found at `5927cb7d` (#2783, 2026-06-17) -- **165
commits behind** origin/main: no producer module
(`sentienceInteroceptionGrant.js` absent), no D4 catalog overrides, flag not in
keys.env. Setting the flag there grants nothing because the consumer does not
exist. So "flip ON" requires a prod **deploy** first.

Deploy verified clean (5927cb7d -> origin/main): working tree has only untracked
`*.log` files (detached HEAD -> `git checkout` is clean); **package-lock UNCHANGED
-> no `npm ci`**; **no migrations** changed; prod DB = NeDB (no `DATABASE_URL` in
keys.env -> no `db:migrate`). Caveat: it is a 165-commit jump (all work since
06-17, not just OD-024) -- a broad release; everything else is flag-gated
OFF/band-neutral but it is a real prod version bump.

```bash
# 1. deploy code (clean; no npm ci, no migrate)
git -C /c/dev/_gamewt-lenovo-host fetch origin main
git -C /c/dev/_gamewt-lenovo-host checkout --detach origin/main
```

Rollback the code: `git -C /c/dev/_gamewt-lenovo-host checkout --detach 5927cb7d`.

## Flip steps (OWNER hands -- production)

Prod backend = the `EvoTacticsBackend` scheduled task on the Lenovo host. Its action
is `C:\Users\edusc\start-evo-backend.cmd`, which **sources `~/.config/api-keys/keys.env`**
(so the keys.env flag takes effect on restart) and self-heals: it frees node
listeners on `:3334` + `:3341` before relaunching `npm run start:api` from
`/c/dev/_gamewt-lenovo-host`. So a Stop/Start of the task is the sanctioned restart
(the cmd handles the port cleanup). **NEVER kill 3334/3341 by hand** (see
[[lesson_prod_host_ports_3334_3341]]).

1. **Add the flag to keys.env** (the cmd sources it -> inert until the restart):
   ```bash
   echo 'export SENTIENCE_INTEROCEPTION_GRANT_ENABLED=true' >> ~/.config/api-keys/keys.env
   ```
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
