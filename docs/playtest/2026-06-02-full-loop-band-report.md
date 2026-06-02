---
title: 'Full-loop meta band-metrics - N=40 baseline + calibration (fase-2c)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-03'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Full-loop meta band-metrics — N=40 baseline (fase-2c)

> **PROVISIONAL — pending master-dd ratify.** The band ranges below are Claude-derived
> from the cited sources (goal doc / spec §7). They are **NOT** canon: master-dd ratifies
> the exact band numbers post-N=40, exactly like the combat bands (L-069). This report
> produces the PROCESS + the placement + the asks; it does not assert the bands as ratified.

Closes the buildable arc of fase-2 of the full-loop AI-playtest runner: the AI now plays the
whole meta-loop (campaign → real combat → Nido recruit → economy + breeding), and this is the
N=40 measurement of that loop against the 5 provisional band-metrics.

- Goal: [`docs/planning/2026-06-02-full-loop-fase2-goal.md`](../planning/2026-06-02-full-loop-fase2-goal.md) §2c
- Spec: [`docs/superpowers/specs/2026-06-02-full-loop-ai-playtest-runner-design.md`](../superpowers/specs/2026-06-02-full-loop-ai-playtest-runner-design.md) §7
- Shipped: band aggregator + batch ([#2568](https://github.com/MasterDD-L34D/Game/pull/2568)), pluggable policy + mbtiPolicy ([#2569](https://github.com/MasterDD-L34D/Game/pull/2569))

---

## CALIBRATION UPDATE (2026-06-03) — completion_rate brought into band + PI sink exercised

> This section supersedes the **placements** of the baseline below (kept as the historical
> record). The provisional band RANGES are unchanged and remain master-dd's to ratify (L-069).

The baseline found `completion_rate = 1.00` with zero variance (Finding 1). Calibrating it into
band turned out to need more than "tune the enemy stats" — three structural facts about the
full-loop combat were in the way, each now addressed (all **band-safe**: `tools/sim/` +
`tests/sim/` + this doc only, zero engine change):

1. **The 30-HP starter party is effectively un-wipeable by the scaled enemies.** Per-hit damage
   is ~1-3 and the authored enemies spawn far from the party (clamped grid), so they spend most
   of a fight walking into range while the range-2 starters shoot them down. Raising enemy HP
   just produced 40-round **timeouts** (a stalemate), never a defeat. → the only completion-
   failure mode available is "mission not cleared in time", not "party wiped".
2. **Infinite mission-retry made `completion_rate` degenerate.** The old runner re-fought a
   non-cleared chapter every step (up to `maxChapters`), so a timeout never failed the campaign
   — every run eventually completed → 1.00. **Fix:** one attempt per mission — a chapter the
   party fails to clear (timeout/defeat) ends the campaign run (`full-loop-runner.js`). This is
   what makes `completion_rate` a meaningful, tunable metric (P(clear the gating missions)).
3. **The completion curve is steep** (combat variance ≈ ±7 HP of total enemy HP), so difficulty
   is dialed with a **count + per-unit-HP** knob (`scenario-enemies.js` `scaling` param,
   injected by the batch's `calibrationScaling()`), calibrated N=10 probe → N=40 ratify
   (L-069/L-072/L-073).

**Calibration (baked into `calibrationScaling()`):** `countMult 5 + hpAdd 3` → the two gating
elimination missions (`enc_tutorial_01` ch1, `enc_savana_01` ch6) spawn **10 sistema units at
~10 HP (100 total HP)**. The 30-HP party clears ~100 HP inside the 40-round limit ~60% of the
time; the one-attempt cap turns the rest into campaign failures.

**Windows reproducibility (`--isolate`):** at the calibrated difficulty (10-13 units/fight) the
in-process batch trips the same native crash the baseline hit (`0xC0000409`, ISTJ 3×); `--isolate`
runs each seed in its own process (fresh memory) and retries on a crash, so the N=40 batch
reproduces reliably. Crashed-after-retries seeds are excluded from N and logged (never silently
counted).

### Results (N=40 per policy, calibrated, `--isolate`)

`greedy` ran a full N=40; `mbti:ESFP` ran N=39 (1 seed hit the native crash on all 3 retries →
excluded from N + logged, never counted as a non-completion).

| Metric                           | greedy (N=40)                                   | mbti:ESFP (N=39)                                | Provisional band | greedy |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ---------------- | :----: |
| `completion_rate`                | **0.675** (27/40)                               | 0.795 (31/39)                                   | 0.40 – 0.70      |   ✅   |
| `roster_attrition`               | 0.371                                           | 0.415                                           | (0, 1) excl.     |   ✅   |
| `economy_flow` (build-pow drift) | 1.044, PI exercised (416 att.)                  | 1.16, PI exercised                              | 0.5 – 2.0        |   ✅   |
| `relationship_progress`          | recruit 5.98 / aff 1.0 / mate 5.05 (reached 37) | recruit 5.95 / aff 1.0 / mate 5.08 (reached 34) | composite        |   ✅   |
| `offspring_viability`            | 5.05                                            | 5.08                                            | ≥ 1              |   ✅   |
| `roster_composition`             | **[APEX, HAZARD]** 5 roles                      | **[HAZARD, PREY]** 5 roles                      | ≥ 3 roles        |   ✅   |

**greedy (the batch default) places ALL SIX metrics in band**, with `completion_rate = 0.675`
inside the provisional [0.40, 0.70] (Finding 1 resolved). `roster_composition` diverges by
temperament — greedy dominates `[APEX, HAZARD]`, ESFP `[HAZARD, PREY]` (P4 measurable, the
headline of fase-2c, now under a calibrated difficulty).

**New finding — `completion_rate` is mildly POLICY-SENSITIVE at calibrated difficulty.** The
baseline (completion 1.0) reported the quantity metrics as policy-insensitive; under a real
difficulty that is no longer fully true for completion. The ch1 gate (`enc_tutorial_01`, 2
starters, no recruits yet) is identical across policies, but the ch6 sub-gate (`enc_savana_01`)
is fought by the **recruited** party, whose composition differs by temperament — ESFP's recruits
clear it slightly better, so ESFP completes more often (0.795, just above the band) than greedy
(0.675). Calibrating greedy to the band centre (~0.55) is a razor's edge (combat variance ≈ ±7
HP of total enemy HP; 100 HP → 0.675, 104 HP → ~0.3) and risks an L-070 overshoot, so the
difficulty is left at the greedy-in-band point and the per-policy spread is surfaced for the
master-dd ratify (it may prefer to widen the band, accept the spread, or set a per-policy band).

### What changed beyond difficulty

- **PI sink now SPENDS** (closes Finding 3, and **corrects its diagnosis**). The baseline blamed
  the `stalker` job (not a perk-job → assumed 409). The real cause is a **store mismatch**: the
  progression router (`createProgressionRouter()` in the plugin loader) owns its own store, while
  campaign `/advance`'s XP auto-seed writes the `progressionApply` singleton — so the pick route
  **404'd** the campaign-seeded unit regardless of job. **Fix (band-safe, faithful):** the
  DEFAULT*ROSTER job is now `skirmisher` (a real perk-job in both `perks.yaml` and `jobs.yaml`)
  **and** the runner seeds the unit via the route API before picking (exactly as a frontend does),
  with the unit's real accumulated XP. With `peEarned` raised to a rate that affords the 5-PI
  hybrid pick at the SoT 5:1 rate, `piSpentTotal > 0` and `pi_sink_exercised = true`. *(Unifying
  the two progression stores is an engine follow-up, out of scope for this band-safe slice.)\_
- **`affinity_proven_rate` decoupled from completion.** At a calibrated completion (< 0.9 by
  design) ~40% of runs fail the gate mission before any recruit, so they never exercise the
  earned-affinity gate. Counting them as "not proven" conflated this metric with
  `completion_rate` and made the two bands un-satisfiable together. The metric now measures
  affinity-proof **among runs that reached the Nido step** (≥1 recruit) — testing whether the
  gate FIRES, not how often the campaign completes.

### Reproduce (calibrated)

```bash
# calibration is baked into calibrationScaling(); --isolate is required on Windows
node tools/sim/full-loop-batch.js --runs 40 --policy greedy   --isolate --commit $(git rev-parse --short HEAD)
node tools/sim/full-loop-batch.js --runs 40 --policy mbti:ESFP --isolate --commit $(git rev-parse --short HEAD)
# re-calibrate via env, e.g.: FL_ENEMY_COUNT_MULT=6 FL_ENEMY_HP_ADD=1 node ... --isolate
```

---

## Method (baseline, historical)

- `node tools/sim/full-loop-batch.js --runs 40 --policy <p> --commit 4a711aba` per policy.
- In-process: a fresh `createApp({databasePath:null})` + supertest per run (hermetic: stub
  orchestrator + status-refresh disabled so N=40 spins reliably). Seeds 1000–1039, branch
  `cave_path`, the canonical dune_stalker + velox starter party. Deterministic, no RNG in the
  aggregator.
- Policies: `greedy` (baseline) + `mbti:{INTJ,ENFP,ESFP}` (NT / NF / SP temperaments). `ISTJ`
  (SJ) is identical by construction (the mbtiPolicy ordering is unit-tested) but its N=40 run
  hit a transient Windows `node` spawn crash (`0xC0000409`, 3×) and is omitted here, not
  re-run — it does not change any finding (see Finding 2).

## Results (N=40 per policy)

| Policy         | completion_rate | roster_attrition | economy_flow (drift)    | relationship (recruit / aff / mate) | offspring_viability |
| -------------- | --------------- | ---------------- | ----------------------- | ----------------------------------- | ------------------- |
| greedy         | 1.00 ❌         | 0.333 ✅         | 1.25 ✅ (pe 24, bp 216) | 7 / 1.0 / 6 ✅                      | 6 ✅                |
| mbti:INTJ (NT) | 1.00 ❌         | 0.333 ✅         | 1.25 ✅                 | 7 / 1.0 / 6 ✅                      | 6 ✅                |
| mbti:ENFP (NF) | 1.00 ❌         | 0.333 ✅         | 1.25 ✅                 | 7 / 1.0 / 6 ✅                      | 6 ✅                |
| mbti:ESFP (SP) | 1.00 ❌         | 0.333 ✅         | 1.25 ✅                 | 7 / 1.0 / 6 ✅                      | 6 ✅                |

| Metric                             | Provisional band                            | Placement                |
| ---------------------------------- | ------------------------------------------- | ------------------------ |
| `completion_rate`                  | 0.40 – 0.70                                 | **OUT (1.00, too easy)** |
| `roster_attrition`                 | (0, 1) exclusive                            | IN (0.333)               |
| `economy_flow` (build-power drift) | 0.5 – 2.0                                   | IN (1.25)                |
| `relationship_progress`            | recruit + earned-affinity + mating all fire | IN                       |
| `offspring_viability`              | offspring_avg ≥ 1                           | IN (6)                   |

## Findings

**1. `completion_rate` is OUT of band (1.00) with zero variance.** Every one of the 160 runs
completed; the band correctly flags "too easy". Even with fase-2a scaled enemies, the 30-HP
starter party crushes the cave_path chain deterministically. → **calibration target**: tune
enemy scaling until completion lands in 0.40–0.70. This is the point of the band.

**2. The 5 band-metrics are policy-INSENSITIVE — every policy places identically.** mbtiPolicy
_does_ diverge on which species it recruits/courts (verified in `mbtiPolicy.test.js`: INTJ→APEX
first, ESFP→HAZARD first), but the metrics measure **quantity/rate** (win rate, survivor ratio,
recruit/mating COUNT, offspring COUNT), not **composition**. Different species, same counts →
identical placement. **P4 (temperament) cannot be detected by these metrics as defined.**
→ detecting P4 needs a **composition/diversity metric** (roster role_class diversity +
offspring lineage diversity — the `lineage_diversity` field is currently `null`/deferred).

> **UPDATE (since this baseline):** addressed by the `roster_composition` metric — it maps
> the recruited species to their role_class profile + dominant roles, which **do** diverge by
> policy (greedy `[APEX, HAZARD]` vs mbti:ESFP `[HAZARD, PREY]`), so P4 is now measurable. The
> quantity metrics above remain policy-insensitive by design. (offspring `lineage_diversity`
> still deferred.)

**3. `economy_flow` measures earn + build-power drift only — the PI sink is unexercised.**
`piSpentTotal = 0` across all runs: the loop has no shop/PI-spend seam wired, so the
sink side of the economy is never tested (surfaced honestly, not invented). build-power
(XP+MP) accrues flat (drift 1.25, in band). `mpEarnedTotal` is 0 because the runner does not
send `encounter_meta` tier on advance — MP grants stay at the floor; XP carries the build power.

> **UPDATE (since this baseline):** the PI sink is now **wired** — the runner attempts a hybrid
> perk pick (`POST /api/progression/:unitId/pick`) for each leveled survivor with a PE-derived
> PI budget (5:1). It still spends 0 in the canonical sim, but that is now **measured**, not
> assumed: `pi_pick_attempts > 0` with `pi_insufficient = 0` → the picks are **blocked**, not
> unaffordable. Verify-first found the cause: the sim roster's job (`stalker`) is not a perk-job
> (perks.yaml covers skirmisher/vanguard/warden/artificer/invoker/ranger/harvester), so picks
> 409; and at PE→PI 5:1 the budget would 402 anyway. → to actually exercise the sink, future
> work needs a perk-job sim roster + a PE rate that affords the 5-PI pick.

**4. `META_NETWORK_ROUTING` coverage is a no-op for the current runner.** The runner chooses
paths via `driver.choose(branchKey)` → `/api/campaign/choose`, NOT the meta-network diagnostic
endpoint that the `META_NETWORK_ROUTING` flag gates (`campaign.js:215`). Setting the flag does
not change the runner. Routing-graph (`selectNextNodes`) coverage needs the runner wired to it
— a separate slice, not a flag flip.

> **UPDATE (since this baseline):** addressed by `tools/sim/meta-network-driver.js` — a
> traversal harness walks the routing graph via the flag-gated endpoint, so with
> `META_NETWORK_ROUTING=true` the batch report gains a routing-coverage section (the flag is no
> longer a no-op in test-context). The live act/chapter campaign is unchanged; the PROD-enable
> verdict stays master-dd's.

## For master-dd (ratify gate — L-069)

1. **Ratify or adjust** the 5 provisional band ranges (the exact numbers are a human verdict).
2. **Prioritise the next slices** the findings expose:
   - difficulty calibration so `completion_rate` enters band (Finding 1);
   - a composition/diversity metric so P4 is measurable (Finding 2);
   - a PI-sink seam so `economy_flow` tests the sink (Finding 3);
   - runner → `selectNextNodes` wiring for routing coverage / a PROD-enable verdict (Finding 4).

The exact band numbers are **not** ratified here. Nothing downstream consumes these ranges yet;
they are inputs to the human verdict.

## Reproduce

```bash
node tools/sim/full-loop-batch.js --runs 40 --policy greedy --commit $(git rev-parse --short HEAD)
node tools/sim/full-loop-batch.js --runs 40 --policy mbti:ESFP --commit $(git rev-parse --short HEAD)
# -> /tmp/full-loop-band/batch-<ts>/{runs.jsonl, summary.json, report.md}
```

Provenance: commit `4a711aba`, branch `cave_path`, seeds 1000–1039, hermetic
(`IDEA_ENGINE_STUB_ORCHESTRATOR=1` + `IDEA_ENGINE_DISABLE_STATUS_REFRESH=1`).
