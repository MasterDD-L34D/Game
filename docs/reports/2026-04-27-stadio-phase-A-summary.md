---
title: 'Stadio Phase A — Summary (10 stadi I-X applied per Skiv canonical)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Stadio Phase A — Summary (10 stadi I-X applied per Skiv canonical)

Implementation summary del Phase A naming spec [`docs/planning/2026-04-27-forme-10-stadi-naming-spec.md`](../planning/2026-04-27-forme-10-stadi-naming-spec.md). User correction 2026-04-27 sera (master-dd): **I-X (10 stadi)**, NON I-IX. Corretta intermediate revision erronea.

## TL;DR (5 bullet)

1. **10 stadi I-X canonical applied** as 2:1 sub-divisione dei 5 macro-fasi Skiv canonical (`hatchling I-II · juvenile III-IV · mature V-VI · apex VII-VIII · legacy IX-X`). Schema additive, zero breaking change su skill `/skiv` o `seed_skiv_saga.py`.
2. **Naming Dimension 2 = `Stadio` (NON `Forma`)** codified in style guide section nuova `§Stadio / Stage / stage`. Distinguished from `Forma` (16 MBTI temperament).
3. **Dual-layer label**: tier generico cross-specie (`stadio_label_it/en`) + override specie-specifico (`dune_stalker_specific_label_it/en`). Cascade rule: missing species-specific → fallback tier generic.
4. **16 MBTI Forms `display_name_en` gap fixed**: 0 → 16 entries con EN traduzione letterale. `mbti_forms.yaml` ora rispetta dual IT/EN style guide line 18-25.
5. **Render scaling refined**: `getStadioStyle(stadio 1..10)` linear interp 0.55→1.20, badge Roman I-X. `resolveUnitVisualStyle(unit)` backward-compat fallback chain (stadio → lifecycle_phase → default safe).

---

## Mapping 10 stadi → 5 macro-fasi (2:1)

| Macro-fase  | Stadi  | Tier label IT (canonical) | Skiv-specific label IT  |
| ----------- | ------ | ------------------------- | ----------------------- |
| `hatchling` | I-II   | Schiuso, Cucciolo         | Cucciolo Sabbioso, Esploratore di Tana |
| `juvenile`  | III-IV | Giovane, Adolescente      | Predatore Giovane, Predatore Adolescente |
| `mature`    | V-VI   | Adulto, Maturo            | Predatore Adulto, Predatore Maturo |
| `apex`      | VII-VIII | Veterano, Apice         | Cacciatore d'Alto Rango, Apex delle Dune |
| `legacy`    | IX-X   | Antico, Lascito           | Apex Anziano, Memoria del Branco |

**Skiv current state (saga 2026-04-25)**: Lv 4 + 1 mut + 2 thoughts internalized + polarity stable → `current_phase: mature` + `current_stadio: 5` (V — `Predatore Adulto`).

**Tier label EN canonical**: Hatched, Cub, Juvenile, Adolescent, Adult, Mature, Veteran, Apex, Ancient, Legacy.

---

## File touched

| File | Change | Effort |
| ---- | ------ | ------ |
| `docs/core/00E-NAMING_STYLEGUIDE.md` | + section `§Stadio / Stage / stage` con tabella 10 tier + cascade rule + ASCII-only canonical | 30 min |
| `data/core/species/dune_stalker_lifecycle.yaml` | + `stadi[]` array per ogni 5 macro-phase (10 entries totali) + `current_stadio` in `skiv_saga_anchor` | 1h |
| `data/core/forms/mbti_forms.yaml` | + `display_name_en` per 16/16 form entries (gap fix) | 30 min |
| `data/derived/skiv_saga.json` | + `current_stadio: 5` + `current_stadio_roman: V` + tier+specific label IT/EN in `aspect.*` | 15 min |
| `apps/play/src/render.js` | + `getStadioStyle(stadio 1..10)` + `resolveUnitVisualStyle(unit)` + drawUnit wired via resolveUnitVisualStyle | 1h |
| `tests/services/stadioMapping.test.js` | NEW — 10 test mapping bidirezionale + YAML schema invarianti + edge cases + backward-compat | 45 min |
| `tests/play/renderLifecycle.test.js` | + 10 test stadio scaling (range 1-10 size + roman + edge case) + 4 test resolveUnitVisualStyle fallback chain | 30 min |
| `docs/planning/2026-04-27-forme-10-stadi-naming-spec.md` | + note user correction I-X canonical | 5 min |
| `docs/reports/2026-04-27-stadio-phase-A-summary.md` | NEW — questo file | 30 min |

---

## Test count

- **`tests/services/stadioMapping.test.js`**: 10 test (mapping bidirezionale, YAML schema, edge cases, backward-compat).
- **`tests/play/renderLifecycle.test.js`** extended: +14 test (was 23, ora 33). 10 nuovi `getStadioStyle` + 4 `resolveUnitVisualStyle`.
- **Net**: +24 test totali Phase A. **24/24 verde**.

AI baseline `tests/ai/*.test.js` = 311/311 invariato (nessuna modifica runtime AI).

---

## Future flags (Phase B + future call)

### Phase B — Universalize 44 specie senza lifecycle YAML (deferred)

Phase A copre solo **Skiv** (`dune_stalker`). Le altre 44 specie in `data/core/species.yaml` non hanno `lifecycle.yaml` proprio. Big design call:

- Schema templates per `clade_tag` (`Apex`, `Threat`, `Keystone`, `Bridge`, `Support`, `Playable`).
- Per `Threat` short-lived: forse max stadio VI (no apex/legacy)?
- Per `Keystone` stabili: lifecycle compresso, no IX-X?
- Effort estimate: 6-9h schema + 4-6h migration. **Triggera quando V3 Mating/Nido apre saga propagation per altre specie**.

Cascade default: specie senza lifecycle YAML mostra solo `stadio_label_*` generic, nessun `<species>_specific_label`. Footnote "lifecycle non definito" su debug.

### Future flag — Ancestors triggers → Stadio integration (user 2026-04-27)

User flag 2026-04-27: ancestors trait reaction triggers (267 entries wire PR #1817) potrebbero gateare per `stadio` minimo invece che `lifecycle_phase` legacy. Esempio: `requires_stadio: 5` (mature early) per trigger di trait con MoS≥3 condition. Effort stimato ~3-5h post-Phase A consolidamento + decisione design call.

### Cross-dimension UI (Phase C)

Generalizzare `/api/skiv/card` → `/api/creature/:unit_id/card` con aggregator 6-dim (Stadio · Forma MBTI · Sentience T0-T6 · Lineage · Bioma · Mutations). Display priority ladder TV/phone/debug. Effort ~5h post-Phase B.

---

## Validation

- ✅ YAML 10 stadi parseable + invarianti (10 totali, 2:1 mapping, roman match integer)
- ✅ JSON skiv_saga additive (current_stadio coerente con current_phase)
- ✅ MBTI forms 16/16 con `display_name_en`
- ✅ Tests 24/24 verde
- ✅ AI baseline 311/311 invariato (no AI runtime touched)
- ✅ Backward-compat: `phases[]` legacy schema preserved + `lifecycle_phase` fallback chain
- ✅ Style guide §Stadio additive (no break to existing §Forma)

## Riferimenti

- Spec: [`docs/planning/2026-04-27-forme-10-stadi-naming-spec.md`](../planning/2026-04-27-forme-10-stadi-naming-spec.md)
- Style guide: [`docs/core/00E-NAMING_STYLEGUIDE.md §Stadio`](../core/00E-NAMING_STYLEGUIDE.md)
- Lifecycle YAML: `data/core/species/dune_stalker_lifecycle.yaml`
- MBTI Forms: `data/core/forms/mbti_forms.yaml`
- Skiv saga state: `data/derived/skiv_saga.json`
- Render module: `apps/play/src/render.js`
- Tests: `tests/services/stadioMapping.test.js`, `tests/play/renderLifecycle.test.js`
