---
title: Balance Illuminator Agent — Smoke Test (4-gate DoD G2)
workstream: ops-qa
category: qa
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  - agent
  - smoke-test
  - balance-illuminator
  - 4-gate-dod
related:
  - .claude/agents/balance-illuminator.md
  - docs/process/2026-04-26-calibration-harness-policy.md
---

# Smoke Test: `balance-illuminator`

**Data**: 2026-04-26
**Target**: dry-run `--mode calibration --scenario enc_tutorial_06_hardcore`
**Stato input**: post-M14-C iter4 (BOSS mod 5→3, elite elev 1→0, WR 10% greedy)

## Input

- Calibration JSON: `docs/playtest/2026-04-26-M14-C-iter4-hardcore06.json`
- Target band: hardcore encounter_class 15-25% (per `data/core/balance/damage_curves.yaml`)

## Execution trace

### Step 1: Identify problem scope

Letto da `iter4-hardcore06.json`:

- `win_rate: 0.10`
- `defeat_rate: 0.90`
- `turns_avg: 25` (= MAX_ROUNDS hardcode)
- `boss_hp_remaining_avg_on_loss: 20.1/40` (party lima 50%)
- `dmg_dealt_avg: 51.9`, `dmg_taken_avg: 24.7`
- `kd_avg: 2.64`

### Step 2: Diagnosis metric-first

Rule applicata (nuova in spec v2):

- `defeat_rate=100%` + `boss_hp_remaining 20/40 = 50%` + `turns_avg = max` → **timer issue** (non survivability pura, non DPR pura).

Root cause: Apex tier 4 intents/round × 25 round cumulative pressure supera soglia wipe prima che party finisca boss.

### Step 3: Pattern selection

Via decision tree spec:

- "Is scenario in target band for HUMAN?" → **Restricted Play triangulation** (P0)
- "What knob combination optimal?" → **Bayesian Opt** (P1) su `(turn_limit_defeat, BOSS.hp, BOSS.mod)`

### Step 4: Experiment proposal

**EXP-A (Restricted Play)**: N=10 × 4 policies (random, greedy, mcts-100, utility) = 40 runs. ~40 min.

**EXP-B (Bayesian Opt)**: search space 3×4×3 = 36 combos, Ax GP budget 10 evaluations. ~2h post-setup.

### Step 5: SPRT budget

Applicando formula spec v2:

- α=β=0.05, elo_0=0, elo_1=30
- N ≈ **200-300 games** per PASS vs iter4

### Step 6: 3 knob suggestions

| #   | Knob                | Change  | Δ WR atteso | Rationale                                      |
| --- | ------------------- | :-----: | :---------: | ---------------------------------------------- |
| 1   | `turn_limit_defeat` | 25 → 30 |   +8-12pp   | Timer issue diagnosis; 5 extra round finish HP |
| 2   | `BOSS.hp`           | 40 → 32 |    +8pp     | HP -20% mantenendo threat                      |
| 3   | Drop BOSS elevation |  1 → 0  |    +15pp    | Elimina +30% BOSS dmg, dual-swing              |

## Verdict

### 🟢 USABLE (post-fix v2)

**Strengths**:

- Diagnosis metric-first prima del pattern selection → evita tune cieco
- Decision tree pattern-picker → scelta deterministica
- SPRT formula esplicita → budget stimabile
- Output format YAML template → consistency playtest docs
- Anti-pattern blocklist siti esplicito

**NEEDS-FIX identificati in dry-run + applicati (G2 → G3 transition)**:

1. ✅ `Data source priority` section aggiunta (mirror playtest-analyzer)
2. ✅ Diagnosis metric-first rule table (survivability/DPR/timer/swing)
3. ✅ Pattern selection decision tree concreto
4. ✅ SPRT budget formula esplicita con defaults
5. ✅ Output markdown template con frontmatter
6. ✅ Anti-pattern blocklist siti esplicito (emergentmind, grokipedia, medium, towardsdatascience)

## Gate compliance

- **G1 Research**: ✅ 16 web searches + 4 deep-dive WebFetch, fonti arxiv/github/wiki citate
- **G2 Smoke**: ✅ dry-run completato, verdict USABLE post 6 fix
- **G3 Tuning**: ✅ spec rivisto, format:check verde
- **G4 Optimization**: ✅ caveman voice, decision tree numbered, escalation path esplicita

## Next action

Agent pronto. PR commit questo smoke + agent + registry entry.

## Sources

- Agent spec: `.claude/agents/balance-illuminator.md`
- Policy doc: `docs/process/2026-04-26-calibration-harness-policy.md`
- Calibration JSON input: `docs/playtest/2026-04-26-M14-C-iter4-hardcore06.json`
- Research primary: [Jaffe AIIDE 2012](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf), [Fishtest Math](https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html), [TITAN arxiv 2509.22170](https://arxiv.org/html/2509.22170v1)
