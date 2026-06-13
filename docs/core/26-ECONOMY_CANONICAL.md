---
title: Economia Canonical — PE/PT/PP/SG/PI/Seed
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-20
source_of_truth: true
language: it
review_cycle_days: 14
related:
  - docs/core/PI-Pacchetti-Forme.md
  - docs/core/25-REGOLE_SBLOCCO_PE.md
  - docs/core/90-FINAL-DESIGN-FREEZE.md
  - docs/core/Mating-Reclutamento-Nido.md
  - docs/hubs/combat.md
  - docs/planning/2026-04-20-p0-batched-decisions.md
---

# Economia Canonical — glossario + flussi

> Rev 2026-04-20: consolida 5 doc frammentati (4-agent audit #1663 rivela overloading PI/PE + contraddizioni PP=3 vs ≥10). Single source of truth per economia token game.

## Token overview

| Token    | Nome                                   | Scope    | Range                   | Reset                    | Earning                                            | Spending                                |
| -------- | -------------------------------------- | -------- | ----------------------- | ------------------------ | -------------------------------------------------- | --------------------------------------- |
| **PE**   | Punti Esperienza                       | Campaign | 0-cap (Q17 pending)     | Mai (campaign-wide)      | Encounter outcome + VC bonus                       | Checkpoint conversion → PI              |
| **PI**   | Pacchetto Invocazione (build currency) | Campaign | 0..N                    | Mai                      | 5 PE = 1 PI                                        | PI shop packs/trait/abilities           |
| **PT**   | Punti Tecnica                          | Combat   | 0..12 (PT_POOL_CAP)     | **Per-round** (P0 Q51 B) | Crit nat 15-19 +1, nat 20 +2, ogni +5 MoS +1       | Perforazione, spinte, condizioni, combo |
| **PP**   | Power Pool                             | Combat   | **0..3 max** (P0 Q54 A) | Per-encounter            | +1 crit, +1 kill                                   | Ultimate = 3 PP consume all             |
| **SG**   | Surge Gauge                            | Combat   | 0..3                    | Per-encounter            | Accumulata durante combat (Q52 P2 pending formula) | Surge Burst ability                     |
| **Seed** | Seed gene                              | Campaign | 0..cap                  | Mai                      | Mating success + harvester ability                 | Breeding + respec future                |

## Earning rates (P1 Q16 default confirmed)

**PE per encounter**:

- Tutorial (tier 1): 3 PE base
- Standard (tier 2): 5 PE base
- Elite (tier 3): 8 PE base
- Boss (tier 4): 12 PE base

**VC bonus PE** (on top of base):

- VC score ≥0.7: +3 PE
- VC score ≥0.5: +2 PE
- VC score ≥0.3: +1 PE

**Style bonus PE** (M10 phase): +1 per ennea trigger, max +2. Stackable.

## PE→PI conversion

**Rate canonical**: **5 PE → 1 PI** (Freeze §19.2)

**Checkpoint trigger** (P1 Q19 default TBD — proposed: ogni encounter end con outcome=victory). Opzioni pending user review:

- A: ogni mission victory (frequent, piccole conversion)
- B: ogni bioma clear (rare, grandi batch)
- C: ogni tier advancement (rarissimo, snapshot big)

Attuale impl `rewardEconomy.js`: conversion on session end automatic.

## PI shop costs (PI-Pacchetti-Forme.md canonical)

| Item           | Costo PI | Note                    |
| -------------- | -------: | ----------------------- |
| trait_T1       |        3 | Base trait              |
| trait_T2       |        6 | Elite trait             |
| trait_T3       |       10 | Mythic trait (post-MVP) |
| job_ability    |        4 | Rank 1 ability          |
| ultimate_slot  |        6 | Unlock Ultimate slot    |
| modulo_tattico |        3 | Party module            |

**Budget baseline PI accumulabile**: 7 base / 9 veteran / 11 elite (dalla progressione tier).

## Tier advancement (P0 Q56 default A)

**Costo canonical**: **PE amount linear** (non kill count, non mission count).

| Tier    | Costo cumulative PE | Sblocca                                                |
| ------- | ------------------: | ------------------------------------------------------ |
| base    |                   0 | Starter                                                |
| veteran |                  20 | +1 trait slot, +2 HP baseline                          |
| elite   |          60 (20+40) | +1 ability slot, +2 mod baseline, Ultimate unlock      |
| mythic  |         140 (60+80) | **POST-MVP** (P0 Q58 default B: level cap = elite MVP) |

## PP mechanics (P0 Q54 default A)

**Max pool**: **3 PP** (non 10, era errore combat.md:117).

**Earning** (per-encounter):

- Crit nat 20: +1 PP
- Kill enemy: +1 PP

**Spending**:

- **Ultimate ability**: costa 3 PP (consume all pool)

**Reset**: per-encounter (non per-round come PT). Cross-combat persistence = NO.

## PT mechanics (P0 Q51 default B)

**Pool cap**: 12 PT (PT_POOL_CAP).

**Reset**: **per-round** (non per-turn). Round-model ADR-04-15 canonical.

**Earning**:

- Nat 15-19: +1 PT
- Nat 20: +2 PT
- Ogni +5 MoS: +1 PT

**Spending**:

- Perforazione (bypass armor): costo variabile
- Spinte (push target cell): 1 PT
- Condizioni (apply status): 2-4 PT
- Combo (enhance attack): 1-3 PT

## SG mechanics (Q52 RESOLVED 2026-04-26 — Opzione C mixed)

**Pool**: 0..3. Reset per encounter.

**Earning formula (ADR-2026-04-26-sg-earn-mixed)**:

- +1 SG ogni **5 damage taken** (difesa reward, encourage eating hits)
- +1 SG ogni **8 damage dealt** (offesa reward, encourage aggression)
- **Accumulator** per-unit persistent until threshold, rollover carry
- **Cap** per turn: +2 SG max (anti-snowball su AoE burst)

**Razionale scelta C**:

- A-only = tank-biased (evita tempo defensive turtle)
- B-only = dps-biased (mirror PP mechanics, redundant)
- C bilancia: 1 SG full = ~25 dmg taken + ~40 dealt = ~1/round tactical engagement

**Spending**: Surge Burst ability (damage step +2, ignores fracture reduction).

## Seed mechanics

**Earning**:

- Mating success: +1 seed (M10 pending full wire)
- Harvester ability: +X seed (Q53 P2 rate TBD)

**Spending** (future M12+):

- Breeding (new PG from parents): consume N seed
- Respec (rebuild PG): consume seed + PE penalty

## Cross-references runtime

- `apps/backend/services/rewardEconomy.js` — PE earning logic
- `apps/backend/services/fairnessCap.js` — CAP_PT enforcement
- `apps/backend/services/metaProgression.js` — Seed hook (rollMating)
- `data/packs.yaml` — PI shop catalog
- `data/core/balance/damage_curves.yaml` — player_classes baselines (post-level-up)

## Deprecati / superseded

- `25-REGOLE_SBLOCCO_PE.md` (4 LOC stub) → vedi §PE→PI conversion sopra.
- Precedente PI-Pacchetti-Forme.md usava "PE come build currency" → corretto: PI è build, PE è progression.

## Open questions pending

- Q17 PE cap (soft 18 telemetry.yaml o hard?) — P1
- Q19 PE→PI checkpoint trigger — P1
- ~~Q52 SG formula accumulation — P2~~ **RESOLVED 2026-04-26** — Opzione C mixed (ADR-2026-04-26-sg-earn-mixed)
- Q53 Seed rate per harvester ability — P2
- Q55 PE style bonus stackable cap — P1
