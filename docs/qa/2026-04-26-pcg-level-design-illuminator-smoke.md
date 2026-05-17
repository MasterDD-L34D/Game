---
title: PCG Level Design Illuminator Agent — Smoke Test (4-gate DoD G2)
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
  - pcg-level-design-illuminator
  - 4-gate-dod
related:
  - .claude/agents/pcg-level-design-illuminator.md
  - .claude/agents/balance-illuminator.md
  - .claude/agents/ui-design-illuminator.md
---

# Smoke Test: `pcg-level-design-illuminator`

**Data**: 2026-04-26
**Target**: dry-run `--mode audit --topic "existing encounter scenarios coverage"`

## Input

- `apps/backend/services/tutorialScenario.js` (5 tutorial encounters)
- `apps/backend/services/hardcoreScenario.js` (3 hardcore encounters)
- `data/encounters/*.yaml` (3 YAML: tutorial_01, standard_01, elite_01)
- `packages/contracts/schemas/encounter.schema.json` (AJV)
- `data/core/balance/damage_curves.yaml` (target bands)
- `data/core/party.yaml` (11 modulations 2-8p)

## Execution trace

### Step 1: Design space analysis

| Axis            | Variation possibile                     | Coverage attuale                         |
| --------------- | --------------------------------------- | ---------------------------------------- |
| Party size      | 2-8p (11 modulations)                   | tutorial 2p, hardcore 4p/8p              |
| Biome           | 5+ biomes defined                       | savana, caverna, foresta, rovine, abisso |
| Enemy archetype | 7 jobs × multiple species               | ~10 species deployed                     |
| Hazard          | 4 types (fumarole, lava, pozza, rovine) | tutorial 03/04 + hardcore 06/07          |
| Objective       | elimination/rescue/timer/extraction     | **elimination only** (gap)               |
| Difficulty tier | 1-7                                     | coperto                                  |
| Elevation       | 0/1 (M14-C)                             | hardcore_06 BOSS + hardcore_07 leader    |
| Facing          | N/S/E/W                                 | tutorial 03/04 partial                   |

### Step 2: Emergence check

- **Swap scenarios**: tutorial 01/02 quasi intercambiabili (solo +1 enemy) → low emergence
- **Hazard + ability interaction**: non wired (hazard damage fixed, no synergy) → low emergence
- **Composition variety**: tutti i player sono `dune_stalker` (una specie) → zero emergence su party diversity

Emergence score: 🔴 LOW (mostly re-skin content, no compositional emergence)

### Step 3: Pattern recommendation (P0)

Applying decision tree dal spec:

1. **"Need infinite content tile-based?"** NO — small map count è OK per MVP
2. **"Need guaranteed playability?"** YES — hardcore iter4 0% win è playability fail
3. **"Quick variety, small content?"** YES — tutorial 2p→8p scalability richiede variety

→ **Recommended**: ITB hand-made + random elements (P0) + Pathfinder XP budget (P1) per difficulty curve automated.

### Step 4: Specific recommendations

| #   | Pattern                      | Scope                                           | Effort |
| --- | ---------------------------- | ----------------------------------------------- | :----: |
| 1   | Enemy pool variety (species) | tutorial/hardcore, +3 species                   |   4h   |
| 2   | XP budget encounter builder  | `data/core/balance/xp_budget.yaml` + builder.js |   6h   |
| 3   | Objective variety            | add rescue/timer/extraction → 4 types           |   8h   |
| 4   | Tracery briefing narrative   | V3+ narrative polish                            |   2h   |

### Step 5: Report output

Dry-run genererebbe `docs/planning/2026-04-26-encounter-coverage-pcg-audit.md` con:

- Frontmatter YAML
- Design space matrix 8-axis
- Emergence score + reasoning
- Pattern recommendation con fonte (ITB, Pathfinder, Tracery, Dormans)
- P0/P1/P2 ranking effort

## Verdict

### 🟢 USABLE

**Strengths**:

- Design space matrix 8-axis genera audit sistematico
- Emergence check identifica "re-skin fake variety" vs "compositional emergence"
- Pattern selection decision tree concreto
- Fonte primary citata (arxiv, GDC, research papers, official docs)
- Anti-pattern blocklist (content farm) esplicito

**Non toccato** (nice-to-have):

- Actual encounter.schema.json AJV verification runtime = P1 backlog
- LLM generation integration (Agentic PCG) = V6+ research mode only

## Gate compliance

- **G1 Research**: ✅ 16 web searches + 0 WebFetch (material sufficient from searches)
- **G2 Smoke**: ✅ dry-run completato verdict USABLE
- **G3 Tuning**: ✅ spec iniziale ben strutturato, no post-fix richiesto
- **G4 Optimization**: ✅ caveman + systems abstract, decision tree numbered, escalation explicit

## Next action

Agent pronto. Commit + PR merge.

## Sources

- Agent spec: `.claude/agents/pcg-level-design-illuminator.md`
- Research primary: [Togelius Search-Based PCG 2011](http://julian.togelius.com/Togelius2011Searchbased.pdf), [Dormans Mission/Space Grammar](https://sander.landofsand.com/publications/Dormans_Bakkes_-_Generating_Missions_and_Spaces_for_Adaptable_Play_Experiences.pdf), [Adam Smith ASP PCG](https://adamsmith.as/papers/tciaig-asp4pcg.pdf), [Pathfinder Encounter Building](https://aonprd.com/Rules.aspx?ID=252), [Dead Cells Level Design Hybrid](https://www.indiedb.com/games/dead-cells/news/the-level-design-of-a-procedurally-generated-metroidvania)
