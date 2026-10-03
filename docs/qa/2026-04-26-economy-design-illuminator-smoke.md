---
title: Economy Design Illuminator Agent — Smoke Test (4-gate DoD G2)
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
  - economy-design-illuminator
  - 4-gate-dod
related:
  - .claude/agents/economy-design-illuminator.md
  - .claude/agents/balance-illuminator.md
---

# Smoke Test: `economy-design-illuminator`

**Data**: 2026-04-26
**Target**: dry-run `--mode audit --surface "PE + SG + tri-sorgente reward flow"`

## Input

- `apps/backend/services/metaProgression.js`
- `apps/backend/services/rewardEconomy.js`
- `apps/backend/services/packRoller.js`
- `apps/backend/services/formEvolution.js`
- `apps/backend/services/combat/sgTracker.js`
- `apps/backend/routes/rewards.js`
- `data/packs.yaml`, `data/core/balance/damage_curves.yaml`

## Execution trace

### Step 1: Source → Sink matrix

| Currency     | Sources (emit)                                          | Sinks (consume)                  | Pool cap | Flow ratio |
| ------------ | ------------------------------------------------------- | -------------------------------- | -------- | :--------: |
| PE           | victory reward + VC aggregate                           | Form evolution + PI pack acquire | ?        |    S/S     |
| SG           | 5 dmg taken OR 8 dmg dealt → +1 SG (cap 2/turn, pool 3) | Surge ability trigger            | max 3    |    S/S     |
| PI pack      | PE spend                                                | trait unlock + ability roll      | ?        |    S/S     |
| Reward R/A/P | scenario completion (softmax T=0.7)                     | Accept vs skip                   | 15 cards |    S/S     |

### Step 2: Feedback loop check

| Loop                                              |        Type         |                    Counter?                     |                  Verdict                   |
| ------------------------------------------------- | :-----------------: | :---------------------------------------------: | :----------------------------------------: |
| Victory → PE → Form evo → stronger → more victory | Positive (snowball) | **Hardcore pressure tier** + elevation penalty  | 🟡 partial (pressure = negative but tuned) |
| Loss → SG accumulates → surge ability → recovery  | Negative (catch-up) |                        —                        |                     🟢                     |
| Accepted reward → build stronger → easier victory |      Positive       | Softmax temperature T=0.7 + skip fragment store |            🟡 (skip can reset)             |

### Step 3: Pinch point detection

- **PE scarcity**: non quantificata senza playtest data. Formula victory → PE con VC aggregate modulator.
- **PI pack cost**: data/packs.yaml ha `cap_pt_max=1` (fairness), 3 pack per session default.
- **SG cap 3**: hard pool cap, clear design constraint.
- **Reward R/A/P pool 15-card seed**: limit per saturazione.

### Step 4: Pattern recommendation (P0)

1. **Machinations visual sim**: diagramma formale macro-economy PE+PI+SG+Reward. Monte Carlo 33 sessions per detect inflation/deflation. Oggi manca.
2. **Feedback loop balance**: verify positive snowball counter (pressure tier + elevation penalty) is SUFFICIENT post-playtest.
3. **StS gold+relic+potion analog**:
   - PE = gold (run-scoped)
   - Perks M13 = relic (per-run permanent)
   - SG Surge = potion (single-use emergency)
   - Consider pricing curve (Form evolution cost progression)

### Step 5: Report output

Dry-run genererebbe `docs/planning/2026-04-26-pe-sg-reward-economy-audit.md` con:

- Source→Sink matrix 4-currency
- Feedback loop analysis positive/negative
- Pinch point detection (data-driven post-playtest)
- P0/P1/P2 recommendations
- Fonte primary citata

## Verdict

### 🟢 USABLE

**Strengths**:

- Source → Sink matrix genera analisi sistemica (non anecdotal)
- Feedback loop positive/negative check forza design discipline
- Pinch point detection warns su scarcity designed vs accidental
- Anti-pattern F2P gacha blocklist esplicito (paid game ethical)
- Decision tree pattern-picker concreto
- MBTI ENTJ-A (Commander) + ENTP (Inventor) — strategic + contrarian

**Non toccato** (nice-to-have):

- LLM economy simulation (sperimentale, ROI non chiaro)
- Actual Machinations diagram (tool esterno, design artifact separato)

## Gate compliance

- **G1 Research**: ✅ 8 web searches, primary sources: Machinations.io (multiple), SlayTheSpire guides, Hades academic DMS 462, Monster Train Wiki, Into the Breach Wiki, XCOM LW2 Steam Guide, Roguelike Deckbuilder design
- **G2 Smoke**: ✅ dry-run completato verdict USABLE
- **G3 Tuning**: ✅ Anti-pattern F2P gacha blocklist + Hades-heavy warning (MVP light meta)
- **G4 Optimization**: ✅ caveman + numerico, source/sink/pool terminology, escalation path esplicita

## Next action

Agent pronto. Commit + PR merge. **6° agent completato**.

## Sources

- Agent spec: `.claude/agents/economy-design-illuminator.md`
- Research primary: [Machinations Balancing Solved](https://machinations.io/articles/balancing-solved), [Machinations Feedback Loops](https://machinations.io/articles/game-systems-feedback-loops-and-how-they-help-craft-player-experiences), [StS Gold Economy](https://sts2front.com/tips/gold-economy-guide/), [Hades Meta-Progression DMS 462](https://dms462fall2020.wordpress.com/2020/12/06/meta-is-etymologically-greek-right-meta-progression-in-hades/), [MT Upgrades Wiki](https://monster-train.fandom.com/wiki/Upgrades), [ITB Resources](https://intothebreach.fandom.com/wiki/Resources)
