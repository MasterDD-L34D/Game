---
title: 'ADR-2026-04-26 — SG (Surge Gauge) earn formula — Opzione C mixed'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-26'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - docs/core/26-ECONOMY_CANONICAL.md
  - apps/backend/services/combat/sgTracker.js
---

# ADR-2026-04-26 — SG (Surge Gauge) earn formula

## Status

**ACCEPTED** — 2026-04-26

Chiude debito **Q52 P2** aperto in `26-ECONOMY_CANONICAL.md §SG mechanics`.

## Context

SG (Surge Gauge) resource definita in economia canonical:

- Pool 0..3 per-unit per-encounter
- Spend wired: Surge Burst ability (damage step +2, ignores fracture)
- **Earn formula mai codificata** — 3 opzioni aperte (A/B/C)

Audit vision gap (2026-04-26) rileva SG come resource "morta": mai
accumulata in runtime, Surge Burst inaccessibile.

## Decision

**Opzione C — Mixed** (combina damage taken + damage dealt).

### Formula canonical

Per ogni unit, tracking 2 accumulator:

- `sg_taken_accumulator` += damage_taken
- `sg_dealt_accumulator` += damage_dealt

Threshold trigger:

- `sg_taken_accumulator >= 5` → +1 SG, reset accumulator (rollover residuo)
- `sg_dealt_accumulator >= 8` → +1 SG, reset accumulator (rollover residuo)

Cap:

- **SG pool max = 3** (per spec economy)
- **SG earn per turn max = +2** (anti-snowball su AoE multi-hit)

Reset:

- SG pool reset a 0 a `encounter_start`
- Accumulator reset a 0 a `encounter_start`

## Rationale

### Perché NON opzione A (damage taken only)

- Biased tank: scoraggia dmg evasion strategie
- Redundant con HP-low trigger di altri sistemi (panic/bleeding status)
- Tempo defensive turtle (aspetta di essere colpito per caricare)

### Perché NON opzione B (damage dealt only)

- Mirror troppo diretto di PP earning (power pool combo meter)
- Non differenzia: SG = burst momentum, PP = tactical combo
- Biased dps: tank senza surge useful

### Perché C mixed

- **Bilancia tank+dps**: entrambi ruoli accedono a burst
- **Asymmetric rates** (5 taken vs 8 dealt): taken cheaper perché riflette
  cost subito (dolore), dealt richiede più engagement
- **Cap per turn**: previene AoE spam che genera +3 SG in un colpo solo
- **Empirical target**: 1 SG/round a full engagement (~25 dmg taken OR
  ~40 dmg dealt su party 4-unit)

## Consequences

### Positive

- Closes Q52 → unblocks V5 vision gap
- Resource cadence completa: PT/PP/SG tutte attive in combat loop
- Differentiation clear: PT (baseline cost), PP (combo), SG (burst)

### Negative

- Requires new module `sgTracker.js` + wire in damage resolution
- Adds 2 accumulator fields per-unit in session state
- Playtest may reveal rates too generous/stingy → iter pending

### Neutral

- Telemetry capture: `sg_earned_events[]` con source (taken|dealt)
  per future balance

## Implementation

- `apps/backend/services/combat/sgTracker.js` — pure module
  - `accumulate(unit, { damage_taken?, damage_dealt? })` → {earned: 0..2}
  - `reset(unit)` → clear accumulator + pool a 0
- Wire in session.js damage step (post-resolveAttack)
- Test: `tests/api/sgTracker.test.js`

## Open

- Playtest calibration: se rate troppo alto → bump threshold (10/15)
- Retroactive: encounter corrente accumulators reset a start

## References

- `docs/core/26-ECONOMY_CANONICAL.md §SG mechanics`
- Q52 open question chiusura
