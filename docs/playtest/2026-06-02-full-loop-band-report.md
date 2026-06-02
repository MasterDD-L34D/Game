---
title: 'Full-loop meta band-metrics - N=40 baseline (fase-2c)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-02'
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

## Method

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
