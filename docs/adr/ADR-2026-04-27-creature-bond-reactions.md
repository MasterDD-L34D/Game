---
title: 'ADR-2026-04-27: Beast Bond — creature reaction trigger system'
doc_status: active
doc_owner: combat-design
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - data/core/companion/creature_bonds.yaml
  - schemas/evo/creature_bond.schema.json
  - apps/backend/services/combat/bondReactionTrigger.js
  - apps/backend/services/reactionEngine.js
  - docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md
  - docs/balance/2026-04-27-numeric-reference-canonical.md
---

# ADR-2026-04-27: Beast Bond reaction trigger system

- **Data**: 2026-04-27
- **Stato**: Accepted
- **Owner**: Combat Design / Master DD
- **Pattern source**: AncientBeast Tier S #6 — bonded creature pairs trigger automatic
  reactions when one of the pair is hit (extraction matrix Sprint 1-5).

## 1. Contesto

Il sistema reaction esistente (`apps/backend/services/reactionEngine.js`,
M2 ability executor) supporta due trigger:

- `intercept` (warden) — alleato adiacente armato consuma reaction per reroute danno
- `overwatch_shot` (ranger) — enemy entra IN range, fires automatic shot (-1 dmg step)

Entrambi sono **per-actor armed reactions**: l'ability executor le installa in
`actor.reactions[]`, vengono **consumate** al primo trigger, ricaricate via slot
turno successivo. Funziona bene per ability di job giocabili (warden + ranger).

Mancante: **passive species-pair reactions** — bonded creatures che reagiscono
automaticamente quando il partner di legame subisce danno, senza bisogno di
arming esplicito. È il pattern AncientBeast "Beast Bond" rimasto residuo Tier S
#6 dopo Sprint 6 channel resistance (vedi handoff 2026-04-27).

## 2. Decisione

Aggiungere un **secondo livello reaction system, parallelo e non sovrapposto**:

- **Engine**: `apps/backend/services/combat/bondReactionTrigger.js`
- **Data**: `data/core/companion/creature_bonds.yaml` (canonical 6 bond pairs)
- **Schema**: `schemas/evo/creature_bond.schema.json` (AJV draft 2020-12)
- **Hook**: `performAttack` post damage step, **dopo** `reactionEngine.triggerOnDamage`
  (intercept). Skip silente se intercept ha già rerouted il danno.

### Differenze chiave vs reactionEngine

| Aspetto        | reactionEngine (M2)             | bondReactionTrigger (Sprint 7)              |
| -------------- | ------------------------------- | ------------------------------------------- |
| Source         | `actor.reactions[]` armed       | YAML `creature_bonds.yaml` data-driven      |
| Trigger lookup | per-actor scan + trigger string | per-pair `(target.species, ally.species)`   |
| Lifecycle      | consume-on-use, re-arm via slot | cooldown_turns regen, no consume            |
| Cap            | 1 reaction/actor (consume gate) | 1 reaction/round/actor (`_bond_round_used`) |
| Compat         | richiede ability slot           | no-op silent quando dati mancanti           |

### Reaction types

- `counter_attack`: bonded ally fires reactive strike a attacker, damage_step_mod=-1
  (mirror overwatch). Refund `min(1, dmg)` previene 1-shot kill (pulled punch).
  Range gate: ally → attacker entro `ally.attack_range`.
- `shield_ally`: bonded ally absorbs `floor(damageDealt / 2)`. target.hp restored,
  ally takes the same. Math identica a intercept reroute, ma half-only e
  passiva (no consume).

### Schema bond entry

```yaml
- bond_id: pack_alpha
  species_pair: [dune_stalker, dune_stalker] # order-insensitive, [X,X] = twin
  reaction_type: counter_attack | shield_ally
  trigger_range: 1 # Manhattan, ally→target
  cooldown_turns: 2 # per-actor expiry
  description: '...'
```

## 3. Conseguenze

### Positive

- **P1 Tattica leggibile** sale: surface reactivity creature-side (prima solo
  ability-armed). Unlock encounter design "boss + lieutenant bonded".
- **P3 Specie × Job** sale: legami emergenti dalle 45 specie canonical (no
  hardcoded archetype). 6 bond canonical coprono 5 archetype pair.
- **Zero breaking change**: missing YAML → empty bonds[] → no-op silent. Zero
  encounter esistenti rotti.
- **Test coverage**: 19 unit test bondReactionTrigger.test.js (loader, eligibility, cooldown, counter/shield fire, back-compat).

### Negative / mitigations

- **Refund dilution**: counter_attack con damage_step_mod=-1 + refund mai uccide
  attaccante (cap floor 1 hp). Mitigation: design intent ("pulled punch"), kill
  via follow-up regular attack. Documentato nel test esplicito.
- **Cooldown cross-bond**: actor con bond X fired turn 1 cooldown 2 → può ancora
  fire bond Y stesso turn? **No** — cap `_bond_round_used` blocca tutto per il
  resto del turno regardless of bond.
- **Damage_taken accounting**: shield_ally trasferisce danno via target↓ + ally↑.
  Mirror intercept logic — damage_taken[target] decremented, damage_taken[ally]
  incremented. VC scoring stateless ricalcola dagli eventi.

### Pillar delta

- **P1 Tattica**: 🟢++ → 🟢ⁿ (creature reactivity surface live)
- **P3 Specie × Job**: 🟢c+ → 🟢c++ (species_pair semantics emerge)

## 4. Backlog Tier S #6 residuo

Post Sprint 7 chiude **3/4** AncientBeast Tier S #6 ticket:

- ✅ channel resistance earth/wind/dark (Sprint 6, PR #1964)
- ✅ Beast Bond reaction trigger (Sprint 7, this ADR)
- ⏳ Ability r3/r4 tier progressive (~10h, separate sprint)

## 5. Riferimenti

- Sprint 6 handoff: `docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md`
- Reaction engine intercept: `apps/backend/services/reactionEngine.js:50` (triggerOnDamage)
- AncientBeast extraction matrix: `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` §B.1.5
- VC scoring stateless: `apps/backend/services/vcScoring.js`
