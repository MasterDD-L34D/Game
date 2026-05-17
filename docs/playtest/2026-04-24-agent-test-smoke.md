---
title: Playtest Analysis — Agent Smoke Test (historical-only mode)
workstream: ops-qa
status: draft
created: 2026-04-24
tags: [playtest, analysis, agent-test]
---

# Playtest Analysis: Agent Smoke Test

> **MODE: NO LIVE DATA — HISTORICAL-ONLY**
>
> `logs/telemetry/*.jsonl` = **0 file**. No live session telemetry collected.
> No `docs/playtest/batch_*.json` harness output present.
> Per agent step 1 normally → STOP. Test override → pivot to historical analysis docs as fallback.
> All numeric findings below come from existing `docs/playtest/2026-04-17..2026-04-20-*.md` reports.
> **Zero numbers fabricated**. Where N is small or unknown, flagged explicitly.

## Summary (30s read)

- **Live runs analyzed: N=0** (no telemetry pipeline output)
- **Historical runs aggregated**: 11 tutorial sweep + 13 hardcore_06 iter0 + 4×N=10 iter2-4 + 30 iter6 + 30 iter7 = ~134 logged runs across 7 docs
- **Win rate vs target — status overall**: 🔴 (multiple scenarios off-band, see table)
- **Top 3 bug patterns** (from historical):
  1. Telemetry persistence missing (`scenario_id`, `pressure_start`, `session_end`, `vc_score` not emitted) → tutorial sweep TKT-01/02/05
  2. `ai_result = None` in priority_queue mode → invalidates any `ai_intent_distribution` tally (= TKT-09 backlog)
  3. Hardcore_06 multiplier knob exhausted — wr plateau 80-90% across 4 iter, structural focus-fire 8v6 asymmetry (= ADR-2026-04-17 + iter5 quartet pivot)
- **Top 3 calibration suggestions** (historical, not new):
  1. Hardcore_06 → switch modulation to `quartet` (4p) or objective `survive_turns` — multiplier exhausted
  2. Hardcore_07 timer + pod activation Long War 2 pattern (M13 P6 Phase A shipped, calibration N=10 pending userland)
  3. Tutorial 04/05 audit `e_apex.dc_attack` + `e_corriere.hp` — wr 100% vs target 30/20% (N=1 each, low confidence)

## Win rate table (historical aggregate)

| Scenario                               | Source doc          | N runs | Win       | Loss | Timeout   | Win rate % | Target | Status                         |
| -------------------------------------- | ------------------- | ------ | --------- | ---- | --------- | ---------- | ------ | ------------------------------ |
| tutorial_01 (2 nomad)                  | 2026-04-17 sweep    | 6      | 4         | 0    | 2 partial | 67%        | 80%    | 🟢 (within ±10pp on N=6)       |
| tutorial_02 (hunter+2 nomad)           | 2026-04-17 sweep    | 1      | 1\*       | 0    | 0         | 100%\*     | 80%    | ⚠ N=1 no power                |
| tutorial_03 (2 guard + fumarole)       | 2026-04-17 sweep    | 1      | 0 partial | 0    | 1         | 0%         | 50%    | ⚠ N=1 no power                |
| tutorial_04 (3 misti + acid pool)      | 2026-04-17 sweep    | 1      | 1         | 0    | 0         | 100%       | 30%    | 🔴 +70pp (N=1)                 |
| tutorial_05 (e_apex boss)              | 2026-04-17 sweep    | 1      | 1         | 0    | 0         | 100%       | 20%    | 🔴 +80pp (N=1)                 |
| hardcore_06 iter0 baseline             | 2026-04-18 calib    | 13     | 11        | 0    | 2         | 84.6%      | 15-25% | 🔴 +59pp                       |
| hardcore_06 iter1 (PR #1542 tune)      | 2026-04-18 addendum | 10     | 10        | 0    | 0         | 100%       | 15-25% | 🔴 +75pp                       |
| hardcore_06 iter2 (hp 30/14/8 + range) | 2026-04-18 addendum | 10     | 8         | 0    | 2         | 80%        | 15-25% | 🔴 +55pp                       |
| hardcore_06 iter3 (+ stats/ap)         | 2026-04-18 addendum | 10     | 7         | 0    | 3         | 70%        | 15-25% | 🔴 +45pp                       |
| hardcore_06 iter4 (+ pressure 95)      | 2026-04-18 addendum | 10     | 9         | 0    | 1         | 90%        | 15-25% | 🔴 +65pp                       |
| hardcore_06 iter6 (M7-#2 damage scale) | 2026-04-20 verdict  | 30     | 19        | 0    | 11        | 63.3%      | 15-25% | 🔴 +38pp                       |
| hardcore_06 iter7 (Phase E)            | 2026-04-20 verdict  | 30     | 10        | 0    | 20        | 33.3%      | 15-25% | 🔴 +8pp (timeout 67% deadlock) |
| M6 iter2b channel (fisico hardcoded)   | 2026-04-19 channel  | 10     | 5         | 0    | 5         | 50%        | 30-40% | 🟡 +10pp                       |
| M6 iter3 channel exploit               | 2026-04-19 channel  | 10     | 6         | 0    | 4         | 60%        | 30-40% | 🟡 +20pp (UP not down)         |

\* tutorial_02 outcome inferred (no `session_end` event persisted) — confidence low.

**Trend**: hardcore scenarios cannot be calibrated by tuning alone. iter6→iter7 shows the multiplier knob is exhausted (timeout amplification = deadlock pattern, not difficulty). Confirmed in M7-#2 Phase E parked verdict.

## MBTI distribution

**N/A — no `mbti_projection` events in any historical doc reviewed.**

VC scoring observed (2026-04-17 sweep): 0 `vc_score` events persisted across 11 runs. Per CLAUDE.md "VC calibration iter1": 4/6 archetipi reachable target — but no live distribution data confirms which 2 are unreachable in current runs.

→ Action: TKT-05 (sweep doc) — hook `/turn/end` to call `vcScoring.compute()` and append `{action_type:'vc_score', mbti, ennea, aggregates}`.

## Reward telemetry

**N/A — no `reward_offer` / `reward_accept` / `reward_skip` / `sg_earn` / `pack_roll` events in any historical doc.**

Per CLAUDE.md (Vision Gap V2, V5 — sessione 2026-04-26): tri-sorgente reward + SG earn formula Opzione C wired in `rewardOffer.js` + `sgTracker.js` + 5 dmg taken OR 8 dmg dealt → +1 SG, cap 2/turn, pool max 3. Telemetry endpoint `POST /api/session/telemetry` exists but **not yet exercised by any logged playtest**.

→ Action: run a single browser session to validate event emission shape before claiming runtime parity with V2/V5 spec.

## Bug patterns

### Confirmed historical (cross-referenced from sweep + calibration docs)

| Bug ID             | Source     | Description                                                                                      | Status          |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------ | --------------- |
| TKT-01 (sweep)     | 2026-04-17 | `scenario_id` not persisted in first event — inferred from enemy IDs                             | open            |
| TKT-02 (sweep)     | 2026-04-17 | `session_end` event not emitted on faction wipe                                                  | open            |
| TKT-04 (sweep)     | 2026-04-17 | AI Sistema applies 0 status across 11 runs (no panic/stunned/rage)                               | open            |
| TKT-05 (sweep)     | 2026-04-17 | No `vc_score` events persisted on session end                                                    | open            |
| TKT-06 (CLAUDE.md) | 2026-04-18 | `predict_combat` ignores `unit.mod` → damage 0 patterns                                          | open            |
| TKT-08 (CLAUDE.md) | 2026-04-18 | Backend died at run #14 (EADDRINUSE/crash inspiegato) during hardcore_06 batch                   | open            |
| TKT-09 (CLAUDE.md) | 2026-04-18 | `ai_intent_distribution` not in `/round/execute` response                                        | open            |
| Probe (addendum)   | 2026-04-18 | `ai_result = None` in priority_queue mode — invalidates any tally reading `ai_result.ia_actions` | open (= TKT-09) |
| TKT-11 (CLAUDE.md) | 2026-04-18 | `predict_combat` 8p aggregate sanity (boss vs full party)                                        | open            |

### Greps not run

Per agent step 5 grep recipes (`grep -c '"damage_dealt":0' logs/telemetry/*.jsonl` etc) — **0 jsonl files exist**, all greps return empty. Cannot count occurrences.

## Calibration suggestions

Numbered, with expected Δ where the historical doc gives one. No new tuning proposed by this report — agent role is analyze, not patch.

1. **Hardcore_06 → quartet pivot** (already proposed in 2026-04-18 addendum iter5 + ADR-2026-04-17). Switch from `full` (8p) modulation to `hardcore_quartet` (4p) — eliminates 8v6 focus-fire asymmetry. Expected Δ: from wr 80-90% plateau toward target 15-25% band (no N evidence yet).
2. **Hardcore_07 calibration N=10 batch** (CLAUDE.md M13 P6 Phase B userland). Target 30-50% wr. Harness `tools/py/batch_calibrate_hardcore07.py` exists, **never executed** (no `docs/playtest/batch_*.json` present). Required to verify pod-activation + 10-round timer pattern works.
3. **Tutorial 04/05 audit** (sweep TKT-03). Re-run with N≥10 each before tuning — current data is N=1 each, no power. If wr stays >70% on N=10, audit `e_apex.dc_attack` and `e_corriere.hp`, verify `pressure_start` 75/95 modulates `attack_mod` in `declareSistemaIntents`.
4. **Telemetry plumbing first** (sweep TKT-01/02/05). Without persisted `scenario_id` + `session_end` + `vc_score`, every future analysis is inference-from-fragments. P0 unblocker for all subsequent calibration work.

## Raw data location

- **Live telemetry**: NONE — `logs/telemetry/` directory does not exist (or is empty)
- **Batch harness JSON output**: NONE — `docs/playtest/batch_*.json` glob returns 0
- **Historical analysis docs aggregated**:
  - `docs/playtest/2026-04-17-master-dd-tutorial-sweep.md` (11 runs)
  - `docs/playtest/2026-04-18-hardcore-06-calibration.md` (N=13 iter0)
  - `docs/playtest/2026-04-18-hardcore-06-addendum-iter2-4.md` (4×N=10)
  - `docs/playtest/2026-04-19-m6-iter2b-baseline.md` + `2026-04-19-m6-iter3-channel-exploit.md` (2×N=10)
  - `docs/playtest/2026-04-20-m7-iter6-hardcore-verdict.md` + `2026-04-20-m7-iter7-phase-e-verdict.md` (2×N=30)
  - `docs/playtest/2026-04-19-M4-run2-ux-gaps.md` (UX, no balance N)

## Escalation

Findings critici 🔴 ≥ 2 scenari (hardcore_06 across 6+ iter, plus tutorial_04/05 with low-N caveats) → per agent escalation rule: recommend running `balance-auditor` agent for correlation with `trait_mechanics.yaml` + `species_resistances.yaml`.

**However**: balance-auditor agent file presence not verified in this run. User should confirm `.claude/agents/balance-auditor.md` exists before invoking, or treat escalation as advisory only.
