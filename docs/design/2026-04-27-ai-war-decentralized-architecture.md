---
title: 'AI War decentralized AI — architettura Sistema per-unit autonomous'
date: 2026-04-27
doc_status: active
doc_owner: balance-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - docs/research/2026-04-26-tier-s-extraction-matrix.md#10-ai-war-fleet-command-arcen-2009--p5p6
  - apps/backend/services/ai/utilityBrain.js
  - apps/backend/services/ai/declareSistemaIntents.js
  - docs/design/2026-04-27-ai-war-asymmetric-rules.md
tags: [ai-war, decentralized, architecture, sistema, utility-ai, pillar-5]
---

# AI War decentralized architecture — Sistema per-unit local decisions

> Sprint 1 §IV (autonomous plan 2026-04-27) — reference doc per l'architettura "decentralized AI" già adottata, codifica il pattern AI War.

## Principio canonical

Sistema decision-making è **per-unit autonomous**:

```
Per ogni Sistema unit attivo nel turn:
  context := buildContext(unit, sessionState)
  policy := selectAiPolicy(unit, context)
  action := utilityBrain.choose(unit, context)
  declareSistemaIntent(unit, action)
```

**NO central planner**. Nessun "Sistema mind" globale che coordina tutti i SIS.

## Confronto vs central planner (anti-pattern Evo-Tactics)

### Central planner (NOT used)

```
sessionAI.computeGlobalStrategy(state)
  → assignment[unit_id] = action
  → for each unit: action_assigned(unit_id)
```

**Problemi**:

- Single point of failure
- O(N²) coordination cost
- Emergent behavior locked
- Player non può "leggere" pattern locali (tutto è scripted)

### Decentralized (Evo-Tactics canonical)

```
for unit in sistema_units:
  utilityBrain(unit, localContext) → action
```

**Vantaggi**:

- Emergent threat from sum-of-locals
- Player legge pattern per-unit, anticipa
- O(N) cost
- Behavioral profile per unit (`ai_profiles.yaml`)

## Implementation map

| Component          | Path                                                | Purpose                                                        |
| ------------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| Utility brain      | `apps/backend/services/ai/utilityBrain.js`          | 7 considerations × curves → utility score → action pick        |
| Intent declaration | `apps/backend/services/ai/declareSistemaIntents.js` | per-unit loop, calls utilityBrain                              |
| Policy selector    | `apps/backend/services/ai/policy.js`                | binds unit → behavioral profile (aggressive/balanced/cautious) |
| Profile data       | `data/core/balance/ai_profiles.yaml`                | 3 profile + overrides registry                                 |
| Intent scores      | `data/core/balance/ai_intent_scores.yaml`           | weighted curves per consideration                              |
| Progress meter     | `apps/backend/services/ai/aiProgressMeter.js`       | aggregate Pressure (player visible)                            |

## Why this matches AI War

**AI War: Fleet Command** (Arcen 2009) docs:

> "Each AI ship makes its own decisions based on local information. There is no AI 'general' coordinating attacks. The threat that players feel is **emergent from per-unit autonomy**, not scripted by a central mind."

Same pattern in Evo-Tactics:

- Each SIS unit reads local `unit.position`, `unit.hp`, nearby allies/enemies
- `utilityBrain` evaluates considerations for THIS unit only
- Emergent: 5 SIS spread across map = 5 independent threats

## Behavioral profiles (ai_profiles.yaml)

3 profile canonical:

- **aggressive** — `retreat_hp_pct: 0.15`, low kite_buffer, `use_utility_brain: true`
- **balanced** — default Sistema behavior, `overrides: {}` (intentional empty)
- **cautious** — `retreat_hp_pct: 0.4`, kite_buffer 2, prefers distance

Each unit assigned a profile via encounter spec OR archetype default. Unit reads its profile during `utilityBrain.choose()` call.

## Anti-pattern guard

- ❌ NO Sistema "general"/"commander" entity
- ❌ NO global state read in `utilityBrain.choose()` (only local context)
- ❌ NO scripted multi-unit choreography (es. "tutti attaccano X player turno 3")
- ❌ NO inter-unit communication channel
- ✅ DO local context only (unit, neighbors within range, terrain immediate)
- ✅ DO emergent threat (player legge sum-of-locals)
- ✅ DO behavioral profile per unit (data-driven)

## Cross-card

- [`docs/design/2026-04-27-ai-war-asymmetric-rules.md`](2026-04-27-ai-war-asymmetric-rules.md) — companion: regole asymmetric Sistema vs player
- M-Tier-S #10 AI War — pattern source

## Sources

- [AI War Postmortem GDC 2010](https://gdcvault.com/play/1012632) — Chris Park
- [Arcen Games dev blog](https://www.arcengames.com/) — decentralized AI series
- Tier S extraction matrix: [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../research/2026-04-26-tier-s-extraction-matrix.md) §10
