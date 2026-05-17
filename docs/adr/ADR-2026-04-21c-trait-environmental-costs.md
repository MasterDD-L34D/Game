---
title: 'ADR 2026-04-21c — Costo ambientale trait (pilot 4 trait × 3 biomi)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-21'
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - data/core/balance/trait_environmental_costs.yaml
  - apps/backend/services/traitEffects.js
  - apps/backend/routes/session.js
  - tests/ai/traitEnvironmentalCosts.test.js
  - packs/evo_tactics_pack/data/balance/trait_mechanics.yaml
  - docs/planning/2026-04-21-triage-exploration-notes.md
---

# ADR-2026-04-21c · Costo ambientale trait — pilot 4×3

**Stato**: 🟢 ACCEPTED (user direction Prompt C 2026-04-21)
**Chiude parziale**: L06 P2 runtime trait contextual + L08 biome runtime Node gap
**Scope**: pilot strict 4 trait × 3 biomi = 12 cell. **NON generalizza** pre-playtest validation.
**Trigger**: exploration-note deck v2 Nota 2 + triage Prompt 3 raccomandazione (a) pilot
**Issue**: [#1674](https://github.com/MasterDD-L34D/Game/issues/1674)

## Contesto

Oggi `trait_mechanics.yaml` definisce solo costi numerici flat (PI, stat baseline). Guida Evo-Tactics Pack v2 + SoT §5 parlano di "adattamento ambientale" ma non lo traducono in penalty/bonus numeriche per-bioma.

Exploration-note deck v2 propone pattern proven (Into the Breach environment penalty, XCOM terrain effect): ogni trait dovrebbe avere costo context-dependent — es. `thermal_armor` premia in bioma freddo, penalizza in bioma caldo.

Rischio scope-creep 🔴 ALTO se generalizzato: 84 species × 10 trait × 7 biomi = ~5880 cell tuning. Kill-60 Flint + §19.3 Freeze guidance → **pilot limitato** + playtest gate prima di generalizzare.

## Decisione

**Ship pilot 4 trait × 3 biomi** runtime wired in session /start:

- **4 trait**: `thermal_armor`, `zampe_a_molla`, `pelle_elastomera`, `denti_seghettati`
- **3 biomi**: `savana` (hot_arid), `caverna_risonante` (cold_humid), `rovine_planari` (neutral)
- **12 cell** con delta `attack_mod` / `defense_mod` / `mobility` in range ±1/±2

**Matrix shipping (rationale audit-trail in YAML)**:

| trait \ biome    | savana         | caverna_risonante | rovine_planari |
| ---------------- | -------------- | ----------------- | -------------- |
| thermal_armor    | def −1, mob −1 | def +2            | —              |
| zampe_a_molla    | mob +1         | mob −1            | —              |
| pelle_elastomera | def −1         | def +1            | —              |
| denti_seghettati | atk +1         | atk −1            | —              |

**Runtime wire**:

1. `data/core/balance/trait_environmental_costs.yaml` — schema v1.0 + 12 cell + rationale
2. `apps/backend/services/traitEffects.js` — `loadTraitEnvironmentalCosts()` + `applyBiomeTraitCosts(unit, biomeId, data?)`. Soft-fail su ENOENT. Cache singleton con reset test.
3. `apps/backend/routes/session.js /start` — legge `req.body.biome_id` (fallback `req.body.encounter.biome_id`), applica delta a ogni unit via `map` post-normalise, persiste `session.biome_id` + `session.biome_costs_log`.
4. Delta target keys: `unit.attack_mod_bonus`, `unit.defense_mod_bonus` (consumati già in `resolveAttack`/`predictCombat` via sessionHelpers), `unit.mobility` (nuovo slot, consumer futuro M12+).

**Idempotency**: marker `unit._biome_costs_applied = true` previene doppio apply. Session-scoped (no Prisma persistence).

## Scope guard STRICT

- **NO generalizzare** oltre 4×3 pilot pre-playtest validation. Aggiungere trait/biome #5 richiede nuova ADR.
- **NO nuovo economy channel**: penalty = stat_delta runtime. PE/PI/Seed/Trust restano 4 sole currency (Freeze §19.3).
- **NO Prisma persistence**: costi ricalcolati a ogni `/start`. Se playtest valida → M12+ considerare persistenza per roster history, non prima.
- **NO UI overlay dedicata M11**: applied log passa via `session.biome_costs_log` per debug console, ma Mission Console non mostra ancora "perché hai perso −1 def" al player.

## Criteria promotion / revert (post-playtest)

Dopo N=10 run batch su tutorial_01..05 + hardcore_06 con biome_id set:

- **Promotion**: feedback Master DM "penalty percettibile ma non frustrante" + win rate non shift >5pp vs baseline pre-wire. → Generalizza altre 3-4 trait shipping, stessa matrice.
- **Kill**: feedback "confuso o invisibile" o win rate shift >10pp senza design intent. → Revert YAML a empty + rimuovi wire con PR cleanup.
- **Tune**: shift 5-10pp o feedback misto → iterate delta magnitude (±1 diventa ±0.5 floor / ±2 diventa ±1).

Harness calibration: `tools/py/batch_calibrate_*.py` legge `session.biome_costs_log` per per-run attribution.

## Conseguenze

**Positive**:

- Chiude L06 P2 runtime parziale (trait economy diventa contextual vs flat).
- Aggancia L08 biome runtime Node (prima lettura effettiva `biome_id` in session engine).
- Pattern proven (ItB, XCOM) applicato a scope safe.

**Negative / Debito**:

- 12 cell tuning manuale — audit balance dipende da playtest qualitativo.
- `unit.mobility` non ancora consumato da movement system → delta applicato ma silent per mobility finché consumer wire. M12+.
- Registry YAML non gated da schema AJV (pilot scope non giustifica schema JSON ora). Aggiungere se promosso.

**Rischio mitigato**:

- Scope-creep bloccato da ADR text + test `validation: delta range [-2, 2]`.
- Revert banale: rimuovi 4 require + 1 block /start + YAML empty. < 30 LOC.

## Test coverage

`tests/ai/traitEnvironmentalCosts.test.js` — 14 test:

- Loader carica YAML reale, 4 trait × 3 biomi verificati
- Soft-fail ENOENT
- 4 scenario canonici trait × biome (inclusi rovine_planari neutral)
- zampe_a_molla simmetrico savana/caverna
- Multi-trait aggregation (thermal_armor + denti_seghettati × savana)
- Idempotency chiamate ripetute
- Unknown trait / biome / null → no-op
- YAML validation delta ∈ [−2, +2] \ {0}

## Playtest follow-up

Post-merge: schedulare batch N=10 su `enc_tutorial_01` (savana) + `enc_tutorial_03` (caverna_risonante) + `enc_tutorial_05` (rovine_planari). Report in `docs/playtest/2026-04-21-trait-env-costs-pilot.md`.

## Riferimenti

- `docs/planning/2026-04-21-triage-exploration-notes.md` §Issue Draft 2
- [Issue #1674](https://github.com/MasterDD-L34D/Game/issues/1674)
- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`
- `docs/planning/2026-04-20-integrated-design-map.md` §4 exploration note 2
- ADR-2026-04-20-damage-scaling-curves (pattern: balance YAML + runtime apply)
