---
title: 'ADR-2026-04-24: M13 P3 — Character progression (XCOM EU/EW perk-pair)'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-24
source_of_truth: false
language: it-en
review_cycle_days: 30
related:
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
  - docs/core/PI-Pacchetti-Forme.md
  - data/core/jobs.yaml
---

# ADR-2026-04-24: M13 P3 — Character progression (XCOM EU/EW perk-pair)

- **Data**: 2026-04-24
- **Stato**: Accepted
- **Owner**: Backend + Design
- **Stakeholder**: Pilastro 3 (Identità Specie × Job), Campaign engine (M10), combat resolver

## Contesto

Pilastro 3 (Identità Specie × Job) 🟡 all'audit 2026-04-20:

- 7 jobs live con abilities R1/R2 (data/core/jobs.yaml)
- Level curves YAML-only, zero runtime progression
- Nessuna differenziazione tra due Skirmisher nello stesso partito post-mission 3

Strategy doc raccomandava pattern **XCOM EU/EW**: 7 livelli promotion × 2 perks binari per livello. Favorisce differentiation role + risposta alla research-passi (multiple playthrough XCOM mostrano perk choice come #1 driver di attachment emotivo).

## Decisione

Implementare `ProgressionEngine` (XP + perk-pair pick) come layer separato:

- **Data YAML**: `data/core/progression/xp_curve.yaml` (7 livelli max, cumulative thresholds 0-275) + `data/core/progression/perks.yaml` (7 jobs × 6 promotion levels × 2 perks = 84 perks)
- **Engine**: `apps/backend/services/progression/progressionEngine.js` (class + 6 pure helpers)
- **Store**: `apps/backend/services/progression/progressionStore.js` (in-memory + Prisma write-through, pattern formSessionStore M12 Phase D)
- **Routes**: `apps/backend/routes/progression.js` (8 endpoint REST /api/v1/progression)
- **Persistence**: `UnitProgression` Prisma model + migration 0004_unit_progression (campaignId × unitId unique)

### Architettura

```
                          ┌────────────────────────────────────┐
                          │ data/core/progression/              │
                          │   xp_curve.yaml (7 level thresholds)│
                          │   perks.yaml (7×6×2 = 84 perks)     │
                          └─────────────┬──────────────────────┘
                                        │
                                        ▼
┌──────────────────┐            ┌──────────────────────────┐
│ ProgressionEngine│            │ progressionStore         │
│ - seed           │ ────uses──▶│ - get/set/list/clear     │
│ - applyXp        │            │ - hydrate(campaignId)    │
│ - pickPerk       │            │ - write-through Prisma   │
│ - effectiveStats │            └─────────────┬────────────┘
│ - listPassives   │                          │
│ - listAbilityMods│                          ▼
└──────┬───────────┘              ┌──────────────────────────┐
       │                          │ Prisma                   │
       │                          │   UnitProgression        │
       ▼                          │   (campaignId × unitId)  │
┌─────────────────────┐           └──────────────────────────┘
│ /api/v1/progression │
│   /registry         │
│   /jobs/:id/perks   │
│   /:unitId          │
│   /:unitId/seed     │
│   /:unitId/xp       │
│   /:unitId/pick     │
│   /:unitId/effective│
│   /campaign/:id     │
└─────────────────────┘
```

### Perk effect schema

Ogni perk ha `effect` con 3 tipi possibili (componibili):

- **stat_bonus** (additive): `{ stat: 'attack_mod'|'defense_mod'|'hp_max'|'ap'|'initiative'|'attack_range', amount: int }` — collected by `effectiveStats()`, applicati load-time.
- **ability_mod** (additive): `{ ability_id: str, field: str, delta: number }` — collected by `listAbilityMods()`, applicati quando resolver valuta `ability_id`.
- **passive** (tag-based): `{ tag: str, payload: obj }` — collected by `listPassives()`, resolver risolve via tag lookup in future Phase B.

Multiple effect entries: prefix `stat_bonus_2`, `stat_bonus_3`, etc. per permettere perk che danno trade-off (es. `+1 AP / -1 HP`).

### XP curve (XCOM EU/EW inspired)

```yaml
level_xp_thresholds: { 1: 0, 2: 10, 3: 25, 4: 50, 5: 100, 6: 175, 7: 275 }
xp_grants: { kill_trash: 3, kill_elite: 8, kill_boss: 25, mission_victory: 12, ... }
```

Target: unità attiva in 5 encounter tutorial arriva Lv4 (50 XP) circa a metà campagna. Lv7 (275 XP) è realistico solo post Act 2 endgame.

### Trade-off e conseguenze

- **Perk power ceiling**: 6 scelte × stat_bonus cumulativi su stessa stat possono creare builds estremi. Mitigato da:
  - Max 1 perk per level (no double-pick)
  - Design review perks divergenti (offense vs defense, specialist vs generalist)
  - Ability_mod delta capped dalle abilities' own validation
- **Content burden**: 84 perks × test coverage richiede balance iteration (M13 Phase B).
- **UI non ancora wired**: endpoint live ma no frontend pick UI (Phase B scope).
- **Campaign integration assente**: XP grant hook post-victory non chiamato dal campaign/advance flow (Phase B scope).

### Rollback

- Plugin removal: rimuovere `progressionPlugin` da `BUILTIN_PLUGINS` in `pluginLoader.js`.
- Revert PR: engine + routes + store + tests + perks YAML rimossi, nessun impatto runtime session/campaign.
- Migration: `DROP TABLE unit_progressions;` — reversibile.

## Scope Phase A (questo PR)

- `data/core/progression/xp_curve.yaml` (33 LOC): thresholds + grants
- `data/core/progression/perks.yaml` (449 LOC): 84 perks canonical
- `apps/backend/services/progression/progressionLoader.js` (45 LOC): YAML loader + cache
- `apps/backend/services/progression/progressionEngine.js` (220 LOC): engine class + 6 pure helpers
- `apps/backend/services/progression/progressionStore.js` (155 LOC): in-memory + Prisma adapter
- `apps/backend/routes/progression.js` (130 LOC): 8 endpoint
- `apps/backend/services/pluginLoader.js`: +`progressionPlugin`
- `apps/backend/prisma/schema.prisma`: +`UnitProgression` model
- `apps/backend/prisma/migrations/0004_unit_progression/migration.sql`
- Tests: `tests/api/progressionEngine.test.js` (13 unit) + `tests/api/progressionRoutes.test.js` (11 integration)

**Totale nuovi test**: **24/24** pass. Baseline preservato (AI 307 + lobby 26 + e2e 11 + M12 63 + campaign 27).

## Fuori scope Phase A (Phase B next sprint, ~8h)

- Campaign integration: hook `/api/campaign/advance` → grant XP a unit sopravvissuti
- Combat resolver wire: `effectiveStats()` applicato in unit load, `listAbilityMods()` applicato in `abilityExecutor`, `listPassives()` consumati da resolver (passive tag lookup)
- Frontend UI: pick perk overlay post-mission (riusa pattern `formsPanel`)
- Balance pass: playtest N=10 simulation per validare non-degenerate build discovery
- Prestige system: deferred post-Lv7 arrivo canonicamente

## Fuori scope Phase C+ (deferred)

- Multi-class / respec / perk reset
- Job mastery (switch job mid-campaign)
- Legendary perks (Lv8+ tier, post-prestige)
- Species-specific perk pool modifier

## Riferimenti

- Strategy M9-M11: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](../planning/2026-04-20-strategy-m9-m11-evidence-based.md)
- Pilastri audit: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](../planning/2026-04-20-pilastri-reality-audit.md)
- Jobs canonical: `data/core/jobs.yaml`
- ADR-2026-04-23 M12 Phase D (pattern Prisma write-through adapter): [`docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md`](ADR-2026-04-23-m12-phase-a-form-evolution.md)

---

## Addendum Phase B (2026-04-24/25) — resolver wire + UI + balance

Phase B chiude P3 runtime (🟡+ → 🟢 candidato). 4 wire sopra Phase A.

### 1. Campaign advance XP grant

`POST /api/campaign/advance` body accetta:

```json
{ "survivors": [{ "id": "u1", "job": "skirmisher" }], "xp_per_unit": 12 }
```

Response additive: `{ "xp_grants": [{ unit_id, amount, level_before, level_after, leveled_up }] }`.

Default `xp_per_unit` da `xp_curve.yaml:xp_grants.mission_victory` (12). Solo victory grants.

Helper puro `grantXpToSurvivors(units, amount, { engine, store, campaignId })` in `progressionApply.js`. Auto-seed se unit sconosciuto (richiede `unit.job`).

### 2. Session /start apply perks

`applyProgressionToUnits(units, { campaignId })` chiamato post biome costs. Mutate player units:

- Stat bonuses additivi su: hp_max, ap, attack_mod→unit.mod, defense_mod→unit.dc, initiative, attack_range
- `unit._perk_passives` + `unit._perk_ability_mods` attached
- Guard `_progression_applied` idempotente
- Graceful no-op se unit non in store

### 3. Combat resolver passive damage

`computePerkDamageBonus(actor, target, ctx)` in `session.js` attack flow (post parryDelta).

**5 passive tags runtime-wired**:

| Tag                     | Condition                         |
| ----------------------- | --------------------------------- |
| `flank_bonus`           | Ally adjacent to target           |
| `first_strike_bonus`    | Actor's first attack in session   |
| `execution_bonus`       | Target HP/HP_max < threshold      |
| `isolated_target_bonus` | No ally adjacent to target        |
| `long_range_bonus`      | Manhattan distance ≥ min_distance |

### 4. Frontend progressionPanel

- `apps/play/src/progressionPanel.js` overlay pattern formsPanel (XP bar + per-level perk pair cards + effective stats chips)
- Header btn `📈 Lv` in `apps/play/index.html`
- `api.js` +8 metodi client
- Auto-open in `advanceCampaignWithEvolvePrompt`: se `xp_grants[].leveled_up` true, select unit + open panel

### 5. Balance pass

`tests/api/progressionBalance.test.js` itera 64 combinazioni × 7 jobs = **448 builds**. Stat caps:

| Stat         | Cap |
| ------------ | --: |
| hp_max       |  10 |
| ap           |   3 |
| attack_mod   |   3 |
| defense_mod  |   4 |
| initiative   |   4 |
| attack_range |   2 |

Aggregate |sum| ≤ 20. Schema + passive tag coverage verified.

### Test delta Phase B

- `progressionApply.test.js` NEW — 16 test
- `progressionBalance.test.js` NEW — 4 test
- `campaignRoutes.test.js` +4 XP grant tests

**Baseline post-Phase B**: AI 307 + progression 44 + campaign 31 + altri = **462+**.

### Pilastro 3 post-Phase B

- Pre-A: 🟡 → Post-A: 🟡+ → **Post-B: 🟢 candidato** (residuo: playtest live validation)

### Fuori scope Phase C

- Ability_mod runtime apply in abilityExecutor (YAML field delta)
- Passive tags residui (~15 non wired): retaliate*on_hit, aura*\*, survive_death_once, ecc.
- Respec / perk reset / Prestige system
