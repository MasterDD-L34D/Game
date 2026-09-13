---
title: 'ADR-2026-05-04: Ennea taxonomy canonical — 9 full enneagram vs 6 archetypes simplified'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-04
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
---

# ADR-2026-05-04: Ennea taxonomy canonical decision

- **Data**: 2026-05-04
- **Stato**: **Accepted — master-dd verdict 2026-05-05 = Opzione A + T1 + D1**
- **Implementation**: Game-Godot-v2 PR #167 ([feat(ennea): port 9 full enneagram canon](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/167))
- **Owner**: Master DD
- **Stakeholder**: gameplay-programmer Game/ + Godot v2 + dataset-pack curator

## 1. Contesto

Drift sync 2026-05-04 ([plan-v3-drift-sync](../planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md)) ha rivelato **schema mismatch cross-stack** Pillar P4 MBTI/Ennea:

**Game/ web v1** (`apps/play/src/debriefPanel.js` + `characterPanel.js`, PR #2041):

- 9 ENNEA_META full enneagram canon: Riformatore(1)/Coordinatore(2)/Conquistatore(3)/Individualista(4)/Architetto(5)/Lealista(6)/Esploratore(7)/Cacciatore(8)/Stoico(9)
- Backend dataset `data/external/psychometrics/enneagramma/enneagramma_master.yaml` 100+ entries (core_emotion + basic_fear + basic_desire + passion + fixation + virtue + stress_to + growth_to + wings)
- `apps/backend/services/enneaEffects.js` 214 LOC mechanical buff: 9 archetype × stat modifier (attack/defense/move/evasion/stress reduction)

**Godot v2** (`scripts/ai/vc_scoring.gd`, Sprint O.5):

- 6 ENNEA_ARCHETYPES winner-take-all simplified: warrior + 5 altri (clustering)
- Sprint O.5 design intent: "Sprint O.5 winner-take-all simplified" da plan v3

**Conseguenza**: `vcSnapshot.per_actor[uid].ennea_archetypes` payload Godot side produces 6-archetype array, Game side payload aspetta 9-type strings. Cross-stack incompatibility = blocker formal cutover Fase 3.

## 2. Decision points

Master-dd verdict richiesto su 3 dimensioni:

### 2.1 Canonical taxonomy

**Opzione A — 9 full enneagram canonical**:

- Pro: pillar P4 design canon enneagramma riconosciuto + dataset 100+ entry curato + thought cabinet 9-type richness narrative + matching backend `enneaEffects.js` mechanical wire
- Contro: complessità balance combat tactical (9 × wing × tritype...)
- Effort port: ~3-5h Godot side rewrite `vc_scoring.gd::compute_ennea_archetypes()` + `ENNEA_ARCHETYPES` const 6→9 + GUT test update
- Reuse: web v1 PR #2041 wire diretto in Godot debrief view (architecture pattern transferable)

**Opzione B — 6 archetypes simplified canonical**:

- Pro: snello combat tactical + winner-take-all clean + Sprint O.5 already shipped Godot
- Contro: perdi richness narrative thought cabinet 9-type + dataset enneagramma_master.yaml diventa orphan reference
- Effort migrate: ~3-5h Game side dataset rework + apps/backend/services/enneaEffects.js refactor 9→6 + characterPanel.js + debriefPanel.js (PR #2041 wire) reduce ENNEA_META 9→6

**Opzione C — Hybrid 6+3 cluster**:

- Sub-set 6 archetype tactical (combat) + 3 narrative wing/tritype overlay (debrief diegetic only)
- Pro: best-of-both — clean tactical + richness narrative
- Contro: complessità schema dual-track + maintenance overhead
- Effort: ~6-10h cross-repo design + impl

### 2.2 Migration timing

**Opzione T1 — Pre-cutover (mandatory)**:

- Fix taxonomy now, Game side migrate o Godot side port
- Pro: cutover Fase 3 schema canonical da day-1
- Contro: blocca cutover gate fino completion (~3-10h)

**Opzione T2 — Post-cutover (deferred)**:

- Cutover con schema mismatch tollerato, fix post
- Pro: cutover non gated
- Contro: web v1 stays 9-type alive durante cutover transition + Godot 6-type production data — incompatible state per N giorni

### 2.3 Dataset preservation

**Opzione D1 — Preserve enneagramma_master.yaml**:

- Dataset 100+ entry full curato resta canonical reference. Anche se Opzione B vince, dataset NOT deleted — re-purpose come narrative seed library.

**Opzione D2 — Archive dataset**:

- Move `data/external/psychometrics/enneagramma/` → `docs/museum/excavations/` se Opzione B vince. Cleanup repo.

## 3. Mia raccomandazione tecnica

**Opzione A + T1 + D1** = full enneagram + pre-cutover fix + preserve dataset.

**Reasoning**:

1. **P4 pillar canon**: enneagramma 9-type è IP-defining feature del progetto. Plan v3 §P4 stato "🟡++ MBTI/Ennea + thought cabinet UI + tactical AI templates" implica richness 9-type.
2. **Effort similar**: 3-5h Godot port (Opzione A) ≈ 3-5h Game migrate (Opzione B). Cost-equal ma Opzione A preserva richness.
3. **6 derivable da 9**: clustering 9→6 è view-layer optimization (es. winner-take-all su top-3 archetype score). Fixed schema 9 con clustering helper = best-of-both.
4. **Dataset asset**: 100+ entry psychometric = effort accumulato 3+ mesi. Discard via Opzione B = sunk cost loss.

**Anti-pattern noted**: Opzione B "Sprint O.5 simplified" decisione era contestuale Sprint O.5 (Godot port speed), NON canonical product decision. Riconsiderare ora pre-cutover.

## 4. Action plan se Opzione A approvata

### Fase 1 — Godot side port (~3-5h)

1. `scripts/ai/vc_scoring.gd::ENNEA_ARCHETYPES` const: 6 → 9 (Riformatore/Coordinatore/Conquistatore/Individualista/Architetto/Lealista/Esploratore/Cacciatore/Stoico)
2. `compute_ennea_archetypes(aggregate, raw, config)`: rewrite trigger logic 9-archetype thresholds (mirror `apps/backend/services/vcScoring.js` Game side)
3. GUT `tests/unit/test_vc_scoring_full.gd::test_ennea_archetypes_constant_count`: assert_eq 9 (not 6)
4. Godot debrief view wire (mirror Game/ PR #2041 `debriefPanel.js` pattern): `ennea_archetypes` array render in ritual screen post-encounter

### Fase 2 — Cross-stack verification (~1h)

1. Smoke test: stesso input event payload → Game backend produces 9-type array == Godot vc_scoring produces 9-type array
2. Schema lock: aggiorna `packages/contracts/schemas/` con ennea_archetypes 9-type enum (se applicable)
3. Regression test cross-repo: Godot HTML5 build + Game/ Express dev → run encounter → debrief verify 9-archetype rendered

### Fase 3 — Decision documented

1. ADR aggiornato `Stato: Accepted` post master-dd verdict
2. Plan v3 drift sync §"Item Ennea" stato "RESOLVED Opzione A"
3. Memory file aggiornato

## 5. Decision matrix sintetico

| Opzione              |      Effort       | Richness P4 | Cutover gating | Dataset reuse |   Canonical   |
| -------------------- | :---------------: | :---------: | :------------: | :-----------: | :-----------: |
| A — 9 full enneagram |    3-5h Godot     |    ✅✅     |  T1 mandatory  |  ✅ preserve  |   ✅ canon    |
| B — 6 simplified     | 3-5h Game migrate | 🟡 reduced  |  T1 mandatory  |  ❌ archive   |   🟡 ad-hoc   |
| C — Hybrid 6+3       | 6-10h cross-repo  |    ✅✅     |  T1 mandatory  |  ✅ preserve  | 🟡 dual-track |

## 6. Master-dd verdict 2026-05-05

✅ **Opzione A + T1 + D1 ACCEPTED**:

1. **Taxonomy**: A — 9 full enneagram canonical
2. **Timing**: T1 — pre-cutover mandatory
3. **Dataset**: D1 — preserve `enneagramma_master.yaml`
4. **Authorize impl**: ✅ proceed Fase 1-3

## 7. Implementation status

- ✅ Fase 1 — Godot side port: PR #167 (Game-Godot-v2)
  - `scripts/ai/vc_scoring.gd::ENNEA_ARCHETYPES` const 6 → 9 (canonical Italian names)
  - `compute_ennea_archetypes()` rewrite multi-trigger + 9 hardcoded conditions mirror `telemetry.yaml`
  - GUT 19 vc_scoring tests pass + 1501/1501 baseline zero regression
- ✅ Fase 2 — Cross-stack verification: 0 schema drift cross-stack post merge (Game backend `vcScoring.js` 9-type + Game frontend `debriefPanel.js` PR #2041 + Godot `vc_scoring.gd` PR #167 + telemetry.yaml ennea_themes)
- 🟡 Fase 3 — Godot debrief view UI wire: deferred Sprint M.x post merge (Engine LIVE Surface DEAD anti-pattern follow-up ticket, ~2-3h, mirror Game/ PR #2041 pattern)
