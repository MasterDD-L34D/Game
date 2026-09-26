---
title: 'AI War asymmetric rules registry — pattern canonical Pillar 5+6'
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
  - data/core/balance/ai_intent_scores.yaml
  - data/core/balance/ai_profiles.yaml
  - apps/backend/services/ai/utilityBrain.js
tags: [ai-war, asymmetric, pillar-5, pillar-6, sistema, design-pattern]
---

# AI War asymmetric rules — Sistema design pattern canonical

> Sprint 1 §III (autonomous plan 2026-04-27) — codify pattern AI War "asymmetric AI rules" come canonical Sistema design philosophy.

## TL;DR

Sistema (AI nemico) **NON gioca con le stesse regole del player**. È intenzionale, non bug:

- Sistema spawn budget cresce con `pressure_tier` (player non ha questo)
- Sistema reinforcement triggered da `total_kills` (asymmetric resource)
- Sistema units skip turn cost on certain conditions (player AP fixed)
- Sistema intent priority weighted da `ai_intent_scores.yaml` (player decisione libera)

Player vince **comprendendo** le regole asymmetric, non eguagliandole.

## Pattern source

**AI War: Fleet Command** (Arcen Games 2009) ha codificato esplicitamente "asymmetric AI rules" come design philosophy:

- AI nemico ha **resource gen gratis** (player paga)
- AI nemico ha **research instant** (player tempo)
- AI nemico ha **info perfetta** (player fog of war)
- Player vince via **strategia + comprensione**, non resource parity

Risultato: AI War è un solo-strategy game con **decade di expansions** + community 10+ anni. Asymmetric = depth, non frustrante.

## Regole asymmetric Evo-Tactics — registry canonical

### Spawn / Reinforcement

| Regola                | Sistema                         | Player                    | Rationale                        |
| --------------------- | ------------------------------- | ------------------------- | -------------------------------- |
| Reinforcement budget  | grows con `pressure_tier` (1-3) | fixed `roster_max`        | Pressure escalation = AI ramping |
| Reinforcement trigger | `total_kills` modulo encounter  | manual recruit only       | AI threat layer dynamic          |
| Initial spawn         | `encounter.units` (data-driven) | character_creation choice | Authoring vs build               |
| Mid-fight spawn       | `reinforcementSpawner.tick()`   | none                      | Wave model                       |

### AI Decision Making

| Regola            | Sistema                                    | Player               | Rationale                                       |
| ----------------- | ------------------------------------------ | -------------------- | ----------------------------------------------- |
| Intent generation | `declareSistemaIntents()` per turn         | manual click         | AI must always act                              |
| Intent priority   | `ai_intent_scores.yaml` weighted           | player tactical free | Pre-tuned curves                                |
| Utility brain     | `utilityBrain.js` opt-in (gradual rollout) | N/A                  | Behavioral profile aggressive/balanced/cautious |
| Retreat threshold | `retreat_hp_pct` profile-dependent         | strategy free        | AI has explicit threshold                       |

### Resource / Economy

| Regola               | Sistema                         | Player               | Rationale                 |
| -------------------- | ------------------------------- | -------------------- | ------------------------- |
| AP per turn          | `ap_max` from encounter (fixed) | `ap_max=2` canonical | Player simpler            |
| SG (Sigma)           | none for SIS                    | `0..3` pool          | Player narrative resource |
| PE / PI              | none earned                     | victory-gated        | Currency player-only      |
| Mutation Points (MP) | none                            | encounter-earned     | Spore S3 player-only      |

### Combat Modifiers

| Regola                   | Sistema                                | Player                           | Rationale                                   |
| ------------------------ | -------------------------------------- | -------------------------------- | ------------------------------------------- |
| **Defender's advantage** | +1 attack_mod when defending vs player | none                             | AI War core mechanic (Sprint 1 §II shipped) |
| Boss enrage              | `shouldEnrageBoss()` HP threshold      | none                             | Hardcore tier escalation                    |
| Time-of-day modifier     | applied to alignment                   | applied to alignment (symmetric) | Wesnoth pattern (Sprint 1 §I shipped)       |

### Information / Visibility

| Regola         | Sistema                                                               | Player                              | Rationale                             |
| -------------- | --------------------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| Threat preview | broadcasted via M8 plan-reveal (player sees SIS intent before commit) | reveal own intents only post-commit | ITB telegraph + player advantage info |
| Pressure tier  | published via `aiProgressMeter` (player can see)                      | own state opaque                    | Visibility = co-op planning           |

## Decentralized AI

Sistema decision = **per-unit local**, NO central planner:

- Each `sistema` unit calls `selectAiPolicy(unit, context)` → `utilityBrain.js`
- `utilityBrain` evaluates 7 considerations × curves → action choice
- **NO global Sistema mind** — each unit autonomous from local context
- Pattern AI War: emergent threat from sum-of-locals, not scripted plan

Ref: `apps/backend/services/ai/utilityBrain.js` + `declareSistemaIntents.js`.

## Anti-pattern guard

- ❌ NON dare al player Sistema's asymmetric advantages (reinforcement budget, perfect info, etc.) — rompe il design
- ❌ NON dare al Sistema player advantages (PE/PI/SG) — rompe il design
- ❌ NON aspirare a "AI fair" — Sistema è ostacolo strategico, non avversario simmetrico
- ❌ NON nascondere asymmetric rules al player — codex/wiki deve spiegare regole

## Cross-card

- M-Tier-S #10 AI War — pattern source canonical
- `apps/backend/services/ai/aiProgressMeter.js` (#1898) — Pressure visibility
- `data/core/balance/ai_profiles.yaml` — 3 profili behavior
- `apps/backend/services/combat/defenderAdvantageModifier.js` (Sprint 1 §II) — defender bonus

## Sources

- [AI War Postmortem GDC 2010](https://gdcvault.com/play/1012632) — Chris Park asymmetric rules
- [AI War 2 Wiki — Asymmetric AI design](https://aiwar.fandom.com/wiki/Asymmetric_AI)
- Tier S extraction matrix: [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../research/2026-04-26-tier-s-extraction-matrix.md) §10
