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

### P1.4 Sprint L HermeticOrmus dropped silent

Agent A: Sprint L (HermeticOrmus alchemy mini-system) presente in IDEAS_INDEX rev pre-pivot, dropped silent in plan v2 → v3.

**Action**: scrivere ADR formal "drop HermeticOrmus" o decision "incorporate Sprint M.1b decision later". Default raccomanda **DROP formal** (out-of-scope vertical slice MVP). Effort: 30 min ADR scrivere.

### P1.5 Mission Console deprecation explicit checklist

Agent A: `docs/mission-console/` Vue bundle pre-built (legacy). Sprint S cutover NON specifica deprecation Mission Console step.

**Action**: Sprint S checklist add row `- [ ] Mission Console deprecation: tag + archive docs/mission-console/ in branch web-v1-final, add deprecated note in README`.

### P1.6 Path drift dataset

Agent C: cross-ref CLAUDE.md path con repo reale rivela:

- ❌ `data/skiv/` not exist → real path `docs/skiv/CANONICAL.md` + `data/derived/skiv_saga.json`
- ❌ `data/core/narrative/ennea_voices/` not exist → real source TBD (grep needed)
- ⚠️ `balance/terrain_defense` / `balance/ai_profiles` non al path documentato

**Action**: §Asset pipeline + §Sprint Q add path drift correction table. Audit needed: 1h grep.

### P1.7 7 silhouette job-to-shape spec mancante

Agent B: design doc `docs/core/22-IDENTITA-VISIVA.md` definisce 7 job (vanguard, skirmisher, healer, ranger, mage, ...) ma nessuna spec silhouette/shape per Godot AnimatedSprite2D import.

**Action**: Sprint M.3 asset import pre Sprint N add 30 min "draft 7 silhouette spec doc → docs/core/22-IDENTITA-VISIVA.md addendum".

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
- [ ] Add §Sprint O combat services 16+ port matrix (P1.1) — TODO plan v3.3 (defer to Sprint M.1 chip pre-port)
- [ ] Add §Sprint R 26 routes whitelist (P1.2) — TODO plan v3.3
- [ ] Add §Sprint O.4 8 AI services list (P1.3) — TODO plan v3.3
- [ ] ADR drop HermeticOrmus formal (P1.4) — TODO Sprint M.1b
- [ ] Sprint S Mission Console deprecation row (P1.5) — TODO plan v3.3
- [ ] Path drift correction table (P1.6) — TODO post 1h grep audit
- [ ] 7 silhouette spec addendum (P1.7) — TODO Sprint M.3 chip
- [ ] Pre-Sprint M.1 quick wins ~3h opt-in (P1.8) — TODO master-dd decision
- [ ] §Sprint P bond reactions + Skiv crossbreeding bullet (P2.1) — TODO Sprint P chip
- [ ] §Sprint N.5 accessibility parity bullet (P2.4) — TODO plan v3.3

**Tactical decision**: ship plan v3.2 con P0 fix complete + ADR pillar criteria. P1 items defer plan v3.3 (post Sprint M.1 spawn — non bloccante Godot bootstrap).

## References

- Plan v3.1: `docs/planning/2026-04-29-master-execution-plan-v3.md`
- ADR pivot: `docs/adr/ADR-2026-04-29-pivot-godot-immediate.md`
- ADR pillar: `docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md`
- ADR kill Python: `docs/adr/ADR-2026-04-19-kill-python-rules-engine.md`
- CLAUDE.md Gate 5 anti-pattern Engine LIVE Surface DEAD
- Pilastri reality audit: `docs/planning/2026-04-20-pilastri-reality-audit.md`
