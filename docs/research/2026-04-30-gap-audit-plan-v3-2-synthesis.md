---
title: 'Gap audit plan v3 → v3.2 — synthesis 3 agent paralleli (plan precedenti + design docs + repo files)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-30
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
  - docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md
---

# Gap audit plan v3 → v3.2 — synthesis 2026-04-30

## Trigger

User request 2026-04-29 sera post pivot Godot ADR + plan v3.1: _"prima di procedere è bene controllare se ci sono altri gap nel piano visto che i piani precedenti non sono stati completati: dobbiamo verificare cosa va inserito e dove nel piano attuale. Verifichiamo inoltre se ci sono altri gap di progettazione rispetto a quello che c'è nei nostri doc e file."_

## Methodology

3 agent paralleli single-message, scope disjoint:

- **Agent A** — plan precedenti (Sprint M3-Fase 1, idee parked, IDEAS_INDEX, BACKLOG, OPEN_DECISIONS)
- **Agent B** — design docs (`docs/core/`, `docs/planning/EVO_FINAL_DESIGN_*`, ADR canonical)
- **Agent C** — repo files reali (services backend/, routes/, data/core/, packs/)

Convergence point: ~30 gap identified, classified P0/P1/P2/P3 below.

---

## P0 — Bloccanti pre-Sprint M.1 spawn

### P0.1 Plan v3 line 305 contraddizione ADR-2026-04-19 [FIXED in v3.2]

**Problem**: line 305 referenced `services/rules/resolver.py` come source canonical port → ADR-2026-04-19 ha killed Python rules engine.

**Source canonical**: Node `apps/backend/services/combat/resistanceEngine.js` + `apps/backend/routes/session.js` (action handler d20) + `apps/backend/services/roundOrchestrator.js`.

**Fix v3.2**: §N.3 updated. Ref ADR-2026-04-19 esplicito.

### P0.2 Counts inflated [FIXED in v3.2]

**Problem**:

- Plan v3 dice "60+ encounter" → reali **14** (4 `data/encounters/` + 10 `docs/planning/encounters/`)
- Plan v3 dice "100+ species" → reali **15** (`data/core/species/*_lifecycle.yaml`)
- Plan v3 dice "458 trait" → CORRETTO (verified `grep -c '^  [a-z_]' data/core/traits/active_effects.yaml` = 458)

**Fix v3.2**: §FASE 1 test baseline + §Sprint Q updated.

### P0.3 Sprint N gate exit ZERO P3 + P5 row [FIXED in v3.2]

**Problem**: gate exit table elenca P1, P2, P4, P6 + GATE 0. P3 (Specie×Job) + P5 (Co-op) MANCANTI. Cutover possibile con P3/P5 silenti regressi.

**Fix v3.2**: 2 row aggiunte. Verdict ratio aggiornato 6/6 → 10/10.

### P0.4 Pillar promotion criteria informal [FIXED via NEW ADR]

**Problem**: status 🟢++/🟢/🟢 candidato/🟡++/🟡 usato senza criterio formale. Sprint N rubric non reproducibile.

**Fix**: NEW [`ADR-2026-04-30-pillar-promotion-criteria.md`](../adr/ADR-2026-04-30-pillar-promotion-criteria.md) tier ladder + demotion trigger + Gate 5 cross-ref.

---

## P1 — Sprint M.1 +/- minor scope insertions

### P1.1 16+ combat services Node orfani — port matrix

Agent C identifies questi services Node TUTTI da portare GDScript (NESSUNO citato plan v3 §Sprint O):

| Service Node                                                    | Sprint port target | Note                                   |
| --------------------------------------------------------------- | :----------------: | -------------------------------------- |
| `archetypePassives.js`                                          |     Sprint O.1     | Per archetype passive trigger          |
| `beastBondReaction.js`                                          |     Sprint O.2     | P3 reactive trigger (gate exit P3 row) |
| `bondReactionTrigger.js`                                        |     Sprint O.2     | Generic bond trigger                   |
| `bravado.js`                                                    |     Sprint O.3     | Status modifier                        |
| `defyEngine.js`                                                 |     Sprint O.3     | Defy roll                              |
| `interruptFire.js`                                              |     Sprint O.3     | Reactive intercept                     |
| `missionTimer.js`                                               |     Sprint O.4     | Long War 2 mission timer M13.P6.A      |
| `morale.js`                                                     |     Sprint O.4     | Morale system                          |
| `pinDown.js`                                                    |     Sprint O.5     | Tactical pin                           |
| `sgTracker.js`                                                  |     Sprint O.5     | Survival gear tracker                  |
| `synergyDetector.js`                                            |     Sprint O.5     | Combo detection                        |
| `telepathicReveal.js`                                           |     Sprint O.6     | Skiv echolocation analog               |
| `terrainReactions.js`                                           |     Sprint O.6     | Hazard/terrain effects                 |
| `timeOfDayModifier.js`                                          |     Sprint O.6     | Cyclical day/night modifier            |
| `defenderAdvantageModifier.js`                                  |     Sprint O.7     | DC advantage                           |
| `pseudoRng.js`                                                  |     Sprint O.7     | Deterministic RNG seed                 |
| `fairnessCap.js`                                                |     Sprint O.7     | P6 hardcore cap                        |
| `biomeSpawnBias.js` + `biomeResonance.js` + `biomeModifiers.js` |     Sprint O.8     | Biome influence                        |

**Action**: aggiungere matrice ufficiale a §Sprint O. Effort delta: +1 sett (cumulative 14→15 sett).

### P1.2 26 routes HTTP backend whitelist Godot client

Agent C: Godot client HTML5 dovrà consume backend Express via HTTP. Routes attualmente live (≈26 endpoint):

- `/api/v1/generation/species/*`
- `/api/v1/atlas/*`
- `/api/v1/lineage/legacy-ritual` + `/lineage/*` (lineage)
- `/api/v1/session/*` (createSessionRouter — start/action/turn/end/end/state/:id/vc)
- `/api/v1/round/*` (4 round endpoint)
- `/api/v1/thoughts/candidates`
- `/api/v1/progression/*` (M13.P3.A 8 endpoint)
- `/api/v1/campaign/*` (M12.D campaign trigger)
- `/api/v1/meta/*` (6 meta route)
- `/api/v1/lobby/*` + WS `/ws/lobby`
- `/api/mock/*` legacy fixtures
- `/api/ideas/*` Idea Engine

**Action**: §Sprint R add whitelist routes + Godot HTTPClient adapter spec. Effort delta: included in Sprint R 2-3 sett.

### P1.3 8 AI services Node port matrix

| Service                    | Sprint port |                           |
| -------------------------- | :---------: | ------------------------- |
| `aiProgressMeter.js`       | Sprint O.4  | AI War Pilastro 5 pattern |
| `aiPersonalityLoader.js`   | Sprint O.4  | YAML persona load         |
| `aiProfilesLoader.js`      | Sprint O.4  | Archetype profile load    |
| `threatAssessment.js`      | Sprint O.4  | predict_combat scoring    |
| `threatPreview.js`         | Sprint O.4  | UI hover preview          |
| `sistemaActor.js`          | Sprint O.4  | Sistema NPC actor         |
| `sistemaTurnRunner.js`     | Sprint O.4  | Round turn runner         |
| `declareSistemaIntents.js` | Sprint O.4  | Pure intent declaration   |

**Action**: §Sprint O.4 explicit list. No effort delta.

### P1.4 Sprint L HermeticOrmus dropped silent — ✅ CLOSED 2026-05-06

Agent A: Sprint L (HermeticOrmus alchemy mini-system) presente in IDEAS_INDEX rev pre-pivot, dropped silent in plan v2 → v3.

**Action**: scrivere ADR formal "drop HermeticOrmus" o decision "incorporate Sprint M.1b decision later". Default raccomanda **DROP formal** (out-of-scope vertical slice MVP). Effort: 30 min ADR scrivere.

**Resolution**: ADR formal DROP shipped — [`ADR-2026-05-06-drop-hermeticormus-sprint-l.md`](../adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md). Cherry-pick on-demand mantiene optionality, plan v3.3 effort -2g.

### P1.5 Mission Console deprecation explicit checklist — ✅ CLOSED 2026-05-06

Agent A: `docs/mission-console/` Vue bundle pre-built (legacy). Sprint S cutover NON specifica deprecation Mission Console step.

**Action**: Sprint S checklist add row `- [ ] Mission Console deprecation: tag + archive docs/mission-console/ in branch web-v1-final, add deprecated note in README`.

**Resolution**: Sprint S checklist updated — `docs/planning/2026-04-29-master-execution-plan-v3.md §Sprint S` riga aggiunta + nota inline deprecation rationale.

### P1.6 Path drift dataset — 🟡 PARTIAL 2026-05-06 (audit findings)

Agent C: cross-ref CLAUDE.md path con repo reale rivela (revisited via grep audit 2026-05-06):

- ❌ **`data/skiv/` not exist** → real paths `docs/skiv/CANONICAL.md` + `data/derived/skiv_saga.json` + `data/derived/unit_diaries/skiv.jsonl` + `data/core/narrative/ennea_voices/skiv_*` (multiple). **CONFIRMED drift**.
- ✅ **`data/core/narrative/ennea_voices/` EXISTS** at canonical path (grep 2026-05-06). False-alarm originale, NO drift.
- ✅ **`balance/terrain_defense` EXISTS** at `packs/evo_tactics_pack/data/balance/terrain_defense.yaml`. False-alarm.
- ✅ **`balance/ai_profiles` EXISTS** at `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` + `data/core/ai/ai_profiles_extended.yaml` (extended overlay). False-alarm.

**Resolution 2026-05-06**: solo `data/skiv/` reference è drift reale. Altri 3 path sono canonical correct. Audit grep 2026-05-06 trova 2 reference attivi → fixati questa sessione:

- `docs/planning/2026-04-28-godot-migration-strategy.md:145` — `data/skiv/CANONICAL.md` → `docs/skiv/CANONICAL.md`
- `data/core/narrative/beats/skiv_pulverator_alliance.yaml:4` — comment ref idem

**Action**: ✅ CLOSED — 2 path drift fixati this session. BACKLOG.md `Path drift correction table` ticket → closed.

### P1.7 7 silhouette job-to-shape spec mancante — ✅ CLOSED 2026-05-06

Agent B: design doc `docs/core/22-IDENTITA-VISIVA.md` definisce 7 job (vanguard, skirmisher, healer, ranger, mage, ...) ma nessuna spec silhouette/shape per Godot AnimatedSprite2D import.

**Action**: Sprint M.3 asset import pre Sprint N add 30 min "draft 7 silhouette spec doc → docs/core/22-IDENTITA-VISIVA.md addendum".

**Resolution**: addendum scritto in `docs/core/41-ART-DIRECTION.md §Job-to-shape silhouette spec` (path `22-IDENTITA-VISIVA.md` not exist, real canonical doc è `41-ART-DIRECTION.md`). 7 job × archetype base (skirmisher+ranger=scout, vanguard, warden+invoker=controller, artificer+harvester=support) + key marker visual + frame budget extra (+2/+3) + override scene path `.tres`. Composition logic Godot Sprint M.3 pronto per import.

### P1.8 Pre-Sprint M.1 quick wins

Agent A flag: residual web stack quick wins ~1h ciascuno NON urgenti ma low-cost archive prima freeze:

- TKT-MUTATION-P6-VISUAL ~1h P0 — visual mutation tag in HUD (helps P2 Spore wire)
- Sprint 6 Thought Cabinet 8-slot orfano (P1) — 4 slot wired, 4 ZERO surface
- Sprint 10 QBN debrief orfano — 17 events backend, debrief beat field shipped #1979 ma surface limited

**Action**: §"Pre-Sprint M.1 quick wins ~3h cumulative" sezione opt-in. NON bloccante.

---

## P2 — Sprint M+ minor docs/spec additions

### P2.1 Bond reactions + Skiv crossbreeding ZERO mention plan v3

Agent B: `docs/core/Mating-Reclutamento-Nido.md` define Skiv crossbreeding paths + bond reactions. Plan v3 Sprint P (mating port) NON list these.

**Action**: §Sprint P expand bullet list. Effort delta: 0 (already covered by `propagateLineage`).

### P2.2 Ennea archetypes UI surface gap (9 ZERO surface)

Agent A + CLAUDE.md handoff §1 already flag: 9 Ennea archetypes ZERO surface in any UI.

**Action**: defer Sprint O.4 vcScoring port + Sprint N.5 HUD theme (Ennea badge optional). NO new sprint, scope consolidato.

### P2.3 Sentience tier 4 species candidate exploration (T4=0)

OD-008: T4 sentience species 0 candidate. Gap noted handoff.

**Action**: defer post-cutover Fase 3 + Sprint M.3 asset import (ricco di species art ready) → identify candidate. NO blocking.

### P2.4 Accessibility parity section

Agent C: web stack v1 ha colorblind shape + aria-label + prefers-reduced-motion (Sprint G v3). Plan v3 Sprint M-N NON menziona accessibility port Godot.

**Action**: §Sprint N.5 HUD theme add bullet "accessibility parity (colorblind shape SVG → Godot AtlasTexture variant + aria-label → screen reader hint Godot AccessibleControl + prefers-reduced-motion → Tween skip flag)".

---

## P3 — Backlog post-cutover

### P3.1 ERMES E7-E8 future runtime candidate

Plan v3.1 §ERMES ROADMAP already covers. Status: deferred post-cutover Fase 3. NO action.

### P3.2 Phone composer V2 hybrid path

Plan v3 §Sprint M.7 + R cover. NO action.

### P3.3 Skiv state.json recompute live playthrough

Deferred Phase 4 — non backfillable senza run reale. NO action.

---

## Action items v3.2 (this branch)

- [x] Fix line 305 ADR-19 contraddizione (P0.1)
- [x] Counts corrections 60+ → 14 enc, 100+ → 15 species (P0.2)
- [x] Add P3 + P5 row Sprint N gate exit (P0.3)
- [x] NEW ADR pillar promotion criteria (P0.4)
- [x] Add §Sprint O combat services 16+ port matrix (P1.1) — ✅ CLOSED 2026-05-06 PR [#2076](https://github.com/MasterDD-L34D/Game/pull/2076) `b8a666f5`. 28 combat services classificati Tier A/B/C.
- [x] Add §Sprint R 26 routes whitelist (P1.2) — ✅ CLOSED 2026-05-06 PR #2076. 27 routes Tier A/B/C + HTTPClient adapter spec.
- [x] Add §Sprint O.4 8 AI services list (P1.3) — ✅ CLOSED 2026-05-06 PR #2076.
- [x] ADR drop HermeticOrmus formal (P1.4) — ✅ CLOSED 2026-05-06 [`ADR-2026-05-06-drop-hermeticormus-sprint-l.md`](../adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md). Plan v3.3 effort -2g.
- [x] Sprint S Mission Console deprecation row (P1.5) — ✅ CLOSED 2026-05-06 plan v3 §Sprint S checklist + nota inline.
- [x] Path drift correction table (P1.6) — ✅ CLOSED 2026-05-06 audit grep: solo `data/skiv/` drift reale, 2 ref attivi fixati. Altri 3 path canonical correct.
- [x] 7 silhouette spec addendum (P1.7) — ✅ CLOSED 2026-05-06 addendum in [`docs/core/41-ART-DIRECTION.md`](../core/41-ART-DIRECTION.md) §Job-to-shape silhouette spec.
- [x] Pre-Sprint M.1 quick wins ~3h opt-in (P1.8) — ✅ CLOSED ABORT 2026-05-07 [`ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md`](../adr/ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md). Re-incarnate Godot v2 GAP-5 + GAP-7 + GAP-10 audit.
- [x] §Sprint P bond reactions + Skiv crossbreeding bullet (P2.1) — ✅ CLOSED 2026-05-07 (verified). Sprint P closure W7.x bundle ([`docs/planning/2026-05-07-plan-v3-3-drift-sync-pq-formalization.md §2`](../planning/2026-05-07-plan-v3-3-drift-sync-pq-formalization.md)) shipped BeastBondReaction wire pre-#37 `1172819` + propagateLineage runtime #63 `c8473cd` + caller wire W7.x #127 `2d929c7`. Zero gap residual.
- [x] §Sprint N.5 accessibility parity bullet (P2.4) — ✅ CLOSED 2026-05-06 PR #2076. Spec colorblind shape + aria-label + prefers-reduced-motion.
- [x] §P2.2 Ennea archetypes UI surface — ✅ CLOSED 2026-05-07 Godot v2 PR [#203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203) `5d098e7b` (GAP-2 debrief view top archetype) + PR [#204](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204) `194a68da` (D3 expand toggle full 9 list).

**Status final 2026-05-07**: 100% P0+P1 closed (8/8). 100% P2 actionable closed (P2.1 + P2.2 + P2.4). P2.3 sentience T4 audit completed below — propose 2 candidate, ADR trigger condition deferred post-cutover Phase B.

**Tactical decision**: synthesis doc → archive status post 2026-05-14 (end monitoring window).

---

## P2.3 sentience T4 candidate audit — completed 2026-05-07

**Distribution sentience tier post-audit (46 species across `data/core/species.yaml` + `data/core/species_expansion.yaml`)**:

|         Tier         | Count | Slug examples                                                                                        |
| :------------------: | :---: | ---------------------------------------------------------------------------------------------------- |
|   T0 sub-sentient    |   2   | sciame_larve_neurali, ...                                                                            |
|       T1 basic       |  23   | anguis_magnetica, perfusuas_pedes, sp_ferriscroba_detrita, sp_lithoraptor_acutornis, ...             |
|    T2 instinctive    |  15   | dune_stalker, chemnotela_toxica, elastovaranus_hydrus, gulogluteus_scutiger, soniptera_resonans, ... |
|   **T3 cognitive**   | **3** | simbionte_corallino_riflesso (Support), terracetus_ambulator (Keystone), umbra_alaris (Playable)     |
| **T4 proto-sapient** | **0** | ⚠ GAP confirmed                                                                                     |
|   T5 full sapient    |   3   | polpo_araldo_sinaptico (Keystone), leviatano_risonante (Apex), rupicapra_sensoria (Keystone)         |

T4 = 0 = bridge gap T3 → T5 vuoto. Risk: tier ladder discontinua, advancement Spore (P2 Pilastro) salta T4 → fastlane T3→T5 senza rituale intermedio.

### Candidate proposals

**Candidate A — `umbra_alaris` (Ala d'Ombra / Shadow Wing) → T4**

- **Clade**: Playable (already player-companion candidate)
- **Sentience markers**: silens epithet (silent communicator), wing-based subsonic communication infrastructure
- **Promotion path**: T3 → T4 trigger via Skiv-bond ritual (proto-sapient via cross-species mating beat). Aligns Skiv-Pulverator alleanza ambition arc PR [#2004](https://github.com/MasterDD-L34D/Game/pull/2004).
- **Effort**: ~2h YAML edit + lifecycle stage spec + 1 GUT test.

**Candidate B — `terracetus_ambulator` (Cetaceo Terrestre / Walking Cetacean) → T4**

- **Clade**: Keystone
- **Sentience markers**: ambulator epithet (mobility apex), large social structure (real-world cetacean parity), vocal communication infrastructure
- **Promotion path**: T3 → T4 trigger via legacy ritual gate (Wildermyth-style cross-encounter persistent change). Mirror Polpo Araldo synaptic path.
- **Effort**: ~2h YAML edit + cognitive stage spec + 1 GUT test.

### Decision deferral

ADR formal T4 promotion deferred **post-cutover Phase B** (target window ≥ 2026-05-14 + 1+ playtest pass). Rationale:

- Phase A monitoring window in progress (day 1/7).
- Sentience tier promotion ripple su `vcScoring`/MBTI snapshot — non-zero blast radius.
- Playtest userland feedback prefer su tier ladder gap detection vs blind promote.

**Trigger ADR draft**: Phase B archive web v1 + 1+ playtest session post-cutover + master-dd verdict candidate A vs B vs both.

**Default fallback if NO playtest signal entro 2026-06-01**: promote candidate A (`umbra_alaris`) only — Playable clade priority + Skiv-bond ritual canonical, lower risk vs Keystone cetacean.

## References

- Plan v3.1: `docs/planning/2026-04-29-master-execution-plan-v3.md`
- ADR pivot: `docs/adr/ADR-2026-04-29-pivot-godot-immediate.md`
- ADR pillar: `docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md`
- ADR kill Python: `docs/adr/ADR-2026-04-19-kill-python-rules-engine.md`
- CLAUDE.md Gate 5 anti-pattern Engine LIVE Surface DEAD
- Pilastri reality audit: `docs/planning/2026-04-20-pilastri-reality-audit.md`
