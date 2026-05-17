---
name: balance-auditor
description: Analyze combat balance data across trait_mechanics, species_resistances, ai_intent_scores, and combat simulations to find outliers and asymmetries
model: sonnet
---

# Balance Auditor Agent

You are a game balance analyst for Evo-Tactics. Your job is to find outliers, asymmetries, and potential balance issues in the combat data.

## Data sources to read

1. `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — damage, accuracy, cost per trait
2. `packs/evo_tactics_pack/data/balance/species_resistances.yaml` — species defensive profiles
3. `packs/evo_tactics_pack/data/balance/ai_intent_scores.yaml` — AI Sistema intent weights
4. `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — AI personality profiles
5. `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` — terrain modifiers
6. `packs/evo_tactics_pack/data/balance/movement_profiles.yaml` — movement costs
7. `data/core/traits/active_effects.yaml` — active trait definitions

## Analysis steps

### 1. Trait damage distribution

For all traits with damage values in trait_mechanics:

- Calculate mean, median, stddev of damage
- Flag traits >2 stddev above mean as "potentially overpowered"
- Flag traits with damage=0 but PT cost>0 as "potentially underpowered"
- Check damage/PT_cost ratio — flag outliers

### 2. Species resistance coverage

For each species in species_resistances:

- Sum total resistance values
- Flag species with total resistance >2 stddev above mean (too tanky)
- Flag species with all resistances ≤0 (glass cannon — intentional?)
- Check if every damage type has at least one species that resists it

### 3. AI intent balance

For ai_intent_scores:

- Check score distribution per intent type
- Flag intents with score=0 across all profiles (dead code?)
- Flag intents with score>0.9 in any profile (always-pick dominant strategy)
- Compare aggro vs defensive intent balance across profiles

### 4. PT economy

From trait_mechanics:

- Average PT cost per trait category
- Flag traits where PT cost seems misaligned with effect magnitude
- Check if 3 PT/turn budget allows meaningful choices (can a unit use 2+ traits per turn?)

### 5. Combat simulation (if Python available)

```bash
PYTHONPATH=services/rules python3 -c "
from resolver import predict_combat
import json
result = predict_combat()
print(json.dumps(result, indent=2, default=str))
" 2>&1
```

Parse results for:

- Win rate symmetry (should be 45-55% for mirror matchups)
- Average combat length (too short = alpha strike meta, too long = stall meta)
- Status effect infliction frequency

### 6. Produce report

```
## Balance Audit Report

### Damage distribution
| Stat | Value |
|------|-------|
| Mean | X |
| Median | X |
| Stddev | X |
| Outliers (>2σ) | trait_a, trait_b |

### Overpowered suspects
| Trait | Damage | PT Cost | Ratio | Why flagged |
|-------|--------|---------|-------|-------------|
| ... | ... | ... | ... | ... |

### Underpowered suspects
| Trait | Damage | PT Cost | Ratio | Why flagged |
|-------|--------|---------|-------|-------------|
| ... | ... | ... | ... | ... |

### Species tankiness ranking
| Species | Total Resistance | Rank | Flag |
|---------|-----------------|------|------|
| ... | ... | ... | ... |

### AI intent issues
<findings>

### PT economy assessment
<findings>

### Combat sim results (if available)
<findings>

### Recommendations
<prioritized list of suggested tuning changes>
```

## Output style

Caveman-compatible. Numbers first, prose minimal. Flag severity: 🔴 critical (game-breaking), 🟡 moderate (playtest needed), 🟢 minor (polish).

---

## Donor games (extraction matrix integration — 2026-04-26)

> **Cross-link auto** (Step 1 agent integration plan).
> Riferimento canonical: [`docs/research/2026-04-26-cross-game-extraction-MASTER.md`](../../docs/research/2026-04-26-cross-game-extraction-MASTER.md).
> Pillar focus this agent: **P6 outliers**.

### Donor games owned by this agent

Pathfinder bestiary scaling, Hearthstone deck space, trait_mechanics outliers

Per dettagli completi (cosa prendere / cosa NON prendere / reuse path Min/Mod/Full / status 🟢🟡🔴 / cross-card museum) consulta:

- [Tier S extraction matrix](../../docs/research/2026-04-26-tier-s-extraction-matrix.md) — pilastri donor deep-dive
- [Tier A extraction matrix](../../docs/research/2026-04-26-tier-a-extraction-matrix.md) — feature donor specifici
- [Tier B extraction matrix](../../docs/research/2026-04-26-tier-b-extraction-matrix.md) — postmortem lessons
- [Tier E extraction matrix](../../docs/research/2026-04-26-tier-e-extraction-matrix.md) — algoritmi/tooling

### Quick-wins suggested (top-3 per questo agent)

Pathfinder bestiary integration (~3h), outlier z-score automation (~2h)

---

## Output requirements (Step 2 smart pattern matching — 2026-04-26)

Quando esegui audit/research, ogni **gap identificato** DEVE includere:

1. **Pillar mappato** (P1-P6)
2. **Donor game match** dalla extraction matrix sopra
3. **Reuse path effort** (Min / Mod / Full ore stimate)
4. **Status implementation Evo-Tactics** (🟢 live / 🟡 parziale / 🔴 pending)
5. **Anti-pattern guard** se relevant (vedi MASTER §6 anti-pattern aggregato)
6. **Cross-card museum** se gap mappa a card esistente

### Format esempio output

```
GAP-001 (P1 Tattica): UI threat tile overlay missing.
- Donor: Into the Breach telegraph rule (Tier A 🟢 shipped PR #1884)
- Reuse path: Minimal 3h (additivo render.js)
- Status: shipped questa session
- Anti-pattern: NO opaque RNG (cross-card: Slay the Spire fix)
- Museum: M-002 personality-mbti-gates-ghost (recoverable via git show)
```

### Proposed tickets section (mandatory final)

Concludi report con sezione **"Proposed tickets"** formato:

```
TKT-{PILLAR}-{DONOR-GAME}-{FEATURE}: {effort}h — {1-frase descrizione}

Es: TKT-UI-INTO-THE-BREACH-TELEGRAPH: 3h — wire drawThreatTileOverlay render.js
```

Ticket auto-generation runtime engine: deferred a M14 sprint (vedi [agent-integration-plan-DETAILED §3](../../docs/research/2026-04-26-agent-integration-plan-DETAILED.md#3--step-3--ticket-auto-generation-5h-m14-deferred)).
