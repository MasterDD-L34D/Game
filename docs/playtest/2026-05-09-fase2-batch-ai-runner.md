---
title: FASE 2 batch AI-vs-AI runner — T2.1 baseline + N=30 signal
workstream: ops-qa
doc_status: active
doc_owner: master-dd
last_verified: 2026-05-09
source_of_truth: true
language: it
review_cycle_days: 30
status: active
owner: master-dd
last_review: 2026-05-09
tags:
  - playtest
  - ai
  - sim
  - batch
  - balance
  - sprt
  - fase2
  - utility-brain
---

# FASE 2 batch AI-vs-AI runner — 2026-05-09

Sprint Q+ FASE 2 baseline: parallel runner sopra `tests/smoke/ai-driven-sim.js` con archetype × scenario × seed Cartesian product. N=30 N seed × 3 profile × 1 scenario completato 100% in 125s + outcome breakdown rivela balance signal forte aggressive < cautious < balanced.

## Files

- [`tools/sim/batch-ai-runner.js`](../../tools/sim/batch-ai-runner.js) — parallel batch runner Node, no extra deps
- [`tests/smoke/ai-driven-sim.js`](../../tests/smoke/ai-driven-sim.js) — refactored harness FASE 2 env hooks (AI_SIM_SISTEMA_PROFILE, AI_SIM_SEED, AI_SIM_RUN_LABEL)

## CLI

```bash
TUNNEL=https://<host>.trycloudflare.com node tools/sim/batch-ai-runner.js \
  --seed-count 100 \
  --concurrency 4 \
  --profiles aggressive,balanced,cautious \
  --scenarios enc_tutorial_01 \
  --max-rounds 40
```

| Flag            | Default                      | Note                                    |
| --------------- | ---------------------------- | --------------------------------------- |
| `--seed-count`  | 10                           | seed N per profile×scenario combo       |
| `--concurrency` | 4                            | parallel workers (clamp 1..16)          |
| `--profiles`    | balanced                     | comma-separated `ai_profiles.yaml` keys |
| `--scenarios`   | enc_tutorial_01              | comma-separated scenario IDs            |
| `--max-rounds`  | 15                           | combat round cap                        |
| `--players`     | 1                            | extra players beyond host               |
| `--worker`      | tests/smoke/ai-driven-sim.js | override harness path                   |

## Output

```
/tmp/ai-sim-runs/batch-<ISO>/
  ├── runs/run-N-<seed>-<profile>-<scenario>.jsonl
  ├── summary.json    (aggregate stats)
  ├── summary.csv     (one row per run)
  └── report.md       (Markdown table)
```

Per-worker log isolato in `workers/w-N-<label>/` durante esecuzione → renamed canonical `runs/run-N-<label>.jsonl` post worker close. Race-free concurrency.

## Live baseline N=30 (2026-05-09 post B-NEW-14 + FASE 1 merged)

Run target: tunnel `given-jan-convention-cowboy.trycloudflare.com` (live B-NEW-14 + B-NEW-7 v2 + FASE 1 #2141).

| Metric           | Value                                 |
| ---------------- | ------------------------------------- |
| Total runs       | 30 (10 seed × 3 profile × 1 scenario) |
| Concurrency      | 4                                     |
| Wall total       | 125.6s                                |
| Completion       | **30/30 (100%)**                      |
| Avg rounds       | 26.77                                 |
| Avg wall per run | 15.69s                                |

### Outcome distribution

| Outcome | Count |     % |
| ------- | ----: | ----: |
| victory |    25 | 83.3% |
| timeout |     4 | 13.3% |
| defeat  |     1 |  3.3% |

### Profile breakdown — **balance signal**

| Profile        | Runs | Victory | Defeat | Timeout | Win rate | Avg rounds |
| -------------- | ---: | ------: | -----: | ------: | -------: | ---------: |
| **balanced**   |   10 |      10 |      0 |       0 | **100%** |       25.5 |
| **cautious**   |   10 |       9 |      1 |       0 |  **90%** |       24.5 |
| **aggressive** |   10 |       6 |      0 |       4 |  **60%** |       30.3 |

**Counterintuitive finding**: profile `aggressive` (`use_utility_brain: true`, `retreat_hp_pct: 0.15`, `kite_buffer: 0`, `default_attack_range: 2`, `threat_passivity_threshold: 2`) UNDERPERFORMS rispetto a `balanced` (no overrides, no utility brain) e `cautious` (utility off, `retreat 0.4`, `kite 2`).

Possibili cause (non analizzate, signal raw):

1. **Utility brain regression**: `aggressive` è l'unico profile con `use_utility_brain: true`. UtilityBrain magari sceglie azioni sub-ottimali in tutorial_01 setup vs legacy rule-based di balanced/cautious.
2. **Retreat threshold troppo basso**: 0.15 = retreat solo a 15% HP → enemy fa damage massimo prima di evadere → 4/10 timeout.
3. **Kite buffer 0**: aggressive non mantiene distanza → player AI minimal lo accerchia + ammazza più lentamente (round count alto 30.3 vs 25 balanced).
4. **threat_passivity_threshold=2** troppo reattivo → attacks player che retreating vs focus closer enemy.

Master-dd / balance-illuminator agent può:

- N=100 SPRT 95% bound: confermare statisticamente aggressive vs balanced winrate gap (60% vs 100%)
- Bayesian knob tuning: `retreat_hp_pct` 0.15 → 0.25/0.30 + measure
- Disable `use_utility_brain` su aggressive + measure isolato

## Player AI scope

Minimal closest-enemy attack policy embedded `selectPlayerAction`. Player wins at 100% balanced/90% cautious dimostra player policy NOT a bottleneck su quei profili. aggressive timeout 40% è il signal di interesse.

Future T2.x: replace minimal con `policy.selectAiPolicy` reuse via shim adapter (FASE 1 follow-up). Player archetype variation (aggressive vs balanced vs cautious player AI) → 9 cell matrix profile×profile.

## Telemetry capture

JSONL per-run cattura:

- `config` — env injection (sistema_profile, run_seed, run_label)
- `rest` — every REST round-trip
- `ws` — every WS msg (filtered phase_change for aggregate)
- `round` — combat round snapshot (players, enemies, active_unit)
- `player_action` — AI intent emit
- `combat_outcome` — victory/defeat/timeout
- `vc_capture` — MBTI + Ennea distribution post-combat
- `final_phase` — terminal coop phase

Aggregate JSON + CSV ingestable da `playtest-analyzer` agent.

## What this unblocks

1. **N=100+ SPRT calibration** via `balance-illuminator` agent (Stockfish pattern). Run already shipped.
2. **MAP-Elites Quality-Diversity grid** (aggression × range × group_cohesion) — extend `--profiles` con custom YAML overrides.
3. **CI nightly regression**: cron 02:00 UTC, alert on completion rate < 95% OR profile winrate shift > ±10%.
4. **Pre-merge guard** for balance/AI changes: drop-in `npm run smoke:batch -- --seed-count 30`.

## Known limitations

- Single tunnel = serial backend bottleneck (4 concurrent workers ~15s/run = upper bound). N=100 ~30-40min wall.
- Sistema profile injection works but **player AI not yet profile-aware** (closest-enemy minimal).
- Run seed forwarded to `world_confirm` but coopOrchestrator may not use it for unit positioning RNG → seed reproducibility partial.
- `vc_capture` returns 200 ma harness non printa (handler in coopOrchestrator endCombat path; TODO check VC pull endpoint shape).

## Cross-ref

- FASE 1 baseline: PR [#2141](https://github.com/MasterDD-L34D/Game/pull/2141)
- FASE 4 P0 unblock combat: PR [#2140](https://github.com/MasterDD-L34D/Game/pull/2140) + Godot v2 main `7b92724`
- ai_profiles.yaml: `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` v0.2.0
- declareSistemaIntents per-actor profile: `apps/backend/services/ai/declareSistemaIntents.js:94`
- balance-illuminator agent: `.claude/agents/balance-illuminator.md`

## Resume triggers

> _"esegui FASE 2 N=100 SPRT confirm aggressive < balanced winrate gap"_

> _"esegui FASE 2 MAP-Elites grid — aggression × range × cohesion behavior cells"_

> _"esegui balance-illuminator calibration mode su batch-N=30 result + propose retreat_hp_pct knob tuning"_
