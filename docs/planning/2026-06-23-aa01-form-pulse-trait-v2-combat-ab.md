---
title: 'Form-Pulse trait v2 -- combat A/B (rounds-to-victory + derived win-rate)'
date: 2026-06-23
sprint: aa01-impronta-reconciliation
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Form-Pulse trait v2 -- combat A/B

> **L-069 posture: this REPORTS; the encounter-offset ratification is a master-dd verdict.**
> Closes the follow-up the N=40/N=200 grant-power probe flagged
> ([`2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`](2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md)
> sec. 6): "a full combat A/B (`ai-driven-sim.js` with the granted traits) is the follow-up if
> master-dd wants a win-rate, not a power estimate." The ratify verdict made this A/B a
> **condition before the `FORM_PULSE_TRAIT_V2_ENABLED` flip**.

## 1. Question

The grant-power proxy estimated the v2 grant (shared branco trait + per-player COMPLEMENT minor)
at **~1.21 effective-power / creature** (N=200, CI95 1.14..1.29). The proxy is a heuristic --
it cannot model encounter terrain / enemy composition. **Does that power translate to a real,
measurable combat advantage in the live engine?** If yes, the encounter-difficulty offset
(ratify recommendation path 1) is justified; the A/B sizes its direction.

## 2. Method

Real-engine end-to-end A/B on `tests/smoke/ai-driven-sim.js` (the same harness the nightly /
sweep CI drive), batched via `tools/sim/batch-ai-runner.js`, against a local backend.

- **Two arms, same seeds (paired).** `batch-ai-runner` uses deterministic seeds (`1000+idx`),
  so both arms run seeds 1001..1040; seed variance cancels. The ONLY between-arm difference is
  the granted trait set.
  - **control**: no grant (`AI_SIM_FORM_PULSE_V2_GRANT` unset).
  - **treatment**: `AI_SIM_FORM_PULSE_V2_GRANT=1` -> every player creature carries the branco
    trait + one per-slot COMPLEMENT minor.
- **Treatment is a KNOWN, fixed ~1.2/creature buff.** IDs derived offline from the REAL engine
  (`emergeBrancoTrait` threshold 0 + `emergePlayerMinorTrait`) for a representative 2-player
  team whose effective-power proxy == **1.20/creature** (canonical N=200 = 1.21):
  - branco (all creatures): `zampe_a_molla` (axis `agile_robust`, proxy 0.15)
  - per-slot minor: `denti_seghettati` (proxy 1.5), `antenne_dustsense` (proxy 0.6)
  - per-creature = (2x0.15 + 1.5 + 0.6) / 2 = **1.20**.
- **Scenario chosen for headroom (anti-ceiling).** The tutorial encounters saturate at ~100%
  player WR (aggressive/balanced sistema) -- a WR A/B there is a null 100%-vs-100%. The "hard"
  reinforcement scenarios saturate the OTHER way (perpetual timeout). `enc_savana_01` (aggressive
  sistema, 2 players, `--load-yaml`) resolves to victory with a **rounds-to-clear spread of
  20-27** -- so the non-saturating signal is **rounds-to-victory**, with a post-hoc
  "cleared within K rounds" win-rate derived from the same data.
- **N=40 / arm, `--max-rounds 40`** (generous budget -> every run reaches victory -> true
  rounds-to-clear is read, never censored by the round cap).

## 3. Results

Paired seeds (both arms): **40** | both-victory pairs: **40/40** (no censoring).

### Outcome distribution

| arm       | victory | victory-rate |
| --------- | ------- | ------------ |
| control   | 40      | 100.0%       |
| treatment | 40      | 100.0%       |

Both arms clear within the 40-round budget on every seed (expected -- the budget is generous on
purpose; the signal is HOW FAST, not WHETHER).

### Rounds-to-victory (paired)

| metric                                    | value                               |
| ----------------------------------------- | ----------------------------------- |
| control mean rounds                       | 22.10 (CI95 21.48 .. 22.72)         |
| treatment mean rounds                     | 20.48 (CI95 19.96 .. 20.99)         |
| **paired delta rounds (treat - control)** | **-1.63** (CI95 **-2.45 .. -0.80**) |

### Derived win-rate -- cleared within K rounds

| K rounds | control | treatment | delta pp |
| -------: | ------: | --------: | -------: |
|     <=18 |    0.0% |     10.0% |    +10.0 |
|     <=20 |   27.5% |     62.5% |    +35.0 |
|     <=22 |   60.0% |     85.0% |    +25.0 |
|     <=24 |   85.0% |     97.5% |    +12.5 |

## 4. Reading

- **The ~1.2/creature buff is REAL and significant in the live engine.** Treatment clears
  **~1.6 rounds faster** (paired delta -1.63, CI95 -2.45..-0.80 -- does **not** cross 0). On a
  20-27-round encounter that is a ~7% reduction in fight length per the buff.
- **Win-rate framing (the requested deliverable):** at a fixed round budget the buff is a large
  WR lever -- **+35 pp** at a <=20-round budget, **+25 pp** at <=22. A team carrying the v2 grant
  wins a budgeted fight far more often.
- **This confirms the proxy direction.** The grant-power estimate was not an artifact: granting
  ~1.2 power/creature buys a measurable, repeatable combat advantage. The encounter-difficulty
  offset (ratify recommendation path 1) is therefore **justified**, and its direction is set:
  an offset that costs the team roughly the equivalent of ~1.6 rounds (savana_01 scale) keeps net
  difficulty near baseline.

## 5. Caveats

- **One scenario, one sistema profile, one fixed grant.** This A/B sizes the DIRECTION on a
  single representative encounter (`enc_savana_01` / aggressive) with a single ~1.2/creature grant.
  The exact offset NUMBER per encounter family (savana vs caverna vs frattura) and the per-axis
  grant spread (a `cervello_predittivo` T3 branco team would buff harder than this `zampe_a_molla`
  one) are NOT measured here -- they are the residual calibration if master-dd fixes a precise
  offset rather than a tier cap.
- **Player AI policy = closest-enemy + attack.** The on-hit minors (`denti_seghettati`) realize
  their power under this policy; a more passive policy might realize less. The signal is a lower
  bound for an attack-leaning team.
- **Scale, not floor.** rounds-to-victory is an interval metric on this encounter; do not read
  "-1.6 rounds" as a universal constant -- read it as "the buff is real and worth offsetting".

## 6. Disposition

**Evidence delivered; the offset ratification + exact number stay a master-dd verdict.** No flag
is flipped on this report. The combat-A/B verdict-condition is now **met** (the buff is
confirmed real); on ratify, set the encounter offset / minor-tier cap before
`FORM_PULSE_TRAIT_V2_ENABLED` is ever turned ON.

**Reproduce** (local backend on `PORT=3335` HTTP + `LOBBY_WS_PORT=3342` WS):

```sh
# control
AI_SIM_WS_URL=ws://127.0.0.1:3342/ws AI_SIM_LOAD_YAML=1 \
  node tools/sim/batch-ai-runner.js --tunnel http://127.0.0.1:3335 \
    --seed-count 40 --concurrency 4 --profiles aggressive \
    --scenarios enc_savana_01 --max-rounds 40 --players 1 --load-yaml
# treatment (same, + grant)
AI_SIM_FORM_PULSE_V2_GRANT=1 AI_SIM_WS_URL=ws://127.0.0.1:3342/ws AI_SIM_LOAD_YAML=1 \
  node tools/sim/batch-ai-runner.js --tunnel http://127.0.0.1:3335 \
    --seed-count 40 --concurrency 4 --profiles aggressive \
    --scenarios enc_savana_01 --max-rounds 40 --players 1 --load-yaml
# pair + analyze
node tools/sim/fp-trait-ab-analyze.js <control_batch_dir> <treatment_batch_dir> --out report.md
```
