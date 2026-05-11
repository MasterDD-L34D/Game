---
title: 'Big-items scope tickets bundle — 7 sprint scoped post master-dd verdict batch 2026-05-11'
date: 2026-05-11
type: planning
workstream: cross-cutting
owner: master-dd
status: ready
doc_status: draft
doc_owner: master-dd
last_verified: 2026-05-11
source_of_truth: true
language: it-en
review_cycle_days: 90
related:
  - OPEN_DECISIONS.md
  - BACKLOG.md
  - docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md
  - docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md
  - docs/adr/ADR-2026-05-11-species-expansion-schema-canonical-migration.md
related_verdicts:
  - A2 Triangle Strategy M14-A/B/M15
  - A3 rewind safety valve
  - A4 P2 Brigandine M14 promotion
  - B1 UI TV polish
  - C1 AngularJS Vue 3
  - C4 mutation Phase 6 forbidden path
  - C6 Balance & Economy skill install
tags: [planning, scope-tickets, sprint-m14, sprint-q-plus, forbidden-path]
---

# Big-items scope tickets bundle — 7 sprint post master-dd verdict batch 2026-05-11

## Scope

Master-dd verdict batch 11-decisioni outstanding (2026-05-11) ha promosso 7 big-items a **scoped tickets** per implementation futura session. Questo doc raccoglie i 9 ticket effettivi (A2 split in 3 sub-ticket M14-A/B + M15 = +2 vs verdict count) con effort breakdown + acceptance criteria + risks per ciascuno.

**Implementazione**: NON in questa session. Solo scope doc canonical. Implementation cascade in successor PR per ciascun ticket secondo execution order suggerito a fine doc.

**Cumulative effort scoped per future sessions**: ~70-90h.

---

## 1. TKT-M14-A — Triangle Strategy elevation + terrain (~12h)

**Verdict source**: A2 (sequenza M14-A → M14-B → M15).

### Scope

Implementare elevation Z-axis su mappa tactical + terrain modifiers (high ground +1 attack vs low ground, line-of-sight blocking, terrain accuracy modifier). Pattern reference: Triangle Strategy elevation impatto su tactical depth.

### Files

- `apps/backend/services/combat/elevationModifier.js` (NEW) — funzione `computeElevationBonus(attacker, target, mapData)` ritorna `{ attack_bonus, accuracy_modifier, los_blocked }`.
- `apps/backend/services/combat/terrainModifier.js` (NEW) — terrain effect lookup per tile type (es. forest +cover, water -movement, mud -accuracy).
- `data/core/biomes/*.yaml` (extend) — terrain field tile-level data (per scenario).
- `apps/backend/routes/sessionRoundBridge.js` (extend) — wire `elevationBonus` + `terrainModifier` in `realResolveAction` damage calc.
- `tests/api/elevationCombat.test.js` (NEW) — coverage high ground attack + cover + los block.

### Acceptance criteria

1. High ground attacker (+1 elevation) → `+1 attack` bonus applicato in damage roll.
2. Low ground attacker (-1 elevation) → `-1 attack` penalty + 75% accuracy modifier.
3. Forest tile → cover defense bonus visibile in debrief log.
4. Mud tile → movement cost ×2 (path planning).
5. LOS blocked → ranged attack disabled (UI hint).
6. Test suite copre 5+ scenari (high-vs-low, los-block, cover, mud, neutral).
7. Debrief panel mostra elevation bonus applicato per ciascun attack event.

### Risks + mitigations

- **Risk**: scenario data extension breaks existing scenarios senza tile elevation field. **Mitigation**: default elevation=0 + terrain=neutral per tile mancanti (graceful fallback).
- **Risk**: AI policy non considera elevation → tactical depth gimmick senza emergent behavior. **Mitigation**: extend `policy.js` con `elevation_seek` objective post-MVP.

### Effort breakdown

- 4h elevationModifier + terrainModifier services
- 3h scenario data extension 3-5 biome
- 3h wire in roundOrchestrator + debrief UI
- 2h test suite

**Pillar impact**: P1 Tattica leggibile 🟢 → 🟢++ (elevation = tactical depth FFT-style).

---

## 2. TKT-M14-B — Conviction system (~13h)

**Verdict source**: A2 (sequenza M14-A → M14-B → M15).

### Scope

Conviction system Utility / Liberty / Morality axis influences recruit gating + dialogue branching + combat trigger (es. mercy / execution split). Pattern reference: Triangle Strategy Conviction.

### Files

- `apps/backend/services/vcScoring.js` (extend) — conviction tracker per player + per axis (util/lib/mor), aggregate from raw event log.
- `apps/backend/services/convictionEngine.js` (NEW) — `evaluateConviction(events) → { util, lib, mor }` + recruit gating.
- `data/core/dialogue/conviction_branches/*.yaml` (NEW) — dialogue branches gated by conviction threshold.
- `apps/backend/routes/session.js` (extend) — `/api/v1/conviction/:sessionId` GET endpoint.
- `tests/api/conviction.test.js` (NEW) — coverage 3 axis + recruit gate + dialogue branch.

### Acceptance criteria

1. Conviction tracker aggrega correttamente 3 axis da raw event log (kill mercy ↑ util, refuse order ↑ lib, execute ↑ mor).
2. Recruit gate: NPC con utility ≥80% rifiuta player liberty-aligned (threshold testabile).
3. Dialogue branch: 3+ scenari mostrano conviction-gated choice diversa.
4. Debrief: snapshot conviction visibile end-of-encounter.
5. Test suite 8+ coverage.

### Pillar impact

P4 MBTI/Ennea 🟡 → 🟢 candidato unlock (Conviction = third psychological axis canonical).

### Effort breakdown

- 5h convictionEngine + vcScoring extension
- 3h dialogue branches 3-5 scenari
- 3h API endpoint + debrief UI
- 2h test suite

---

## 3. TKT-M15 — CT bar + promotion (~10h)

**Verdict source**: A2 (sequenza M14-A → M14-B → M15).

### Scope

Charge Time bar visible lookahead 3 turni FFT-style HUD + class promotion gating (es. soldier → veteran → captain). **Già parzialmente shipped** per Sprint G/M3 (CT bar visual lookahead 2026-04-29 PR #1998) — verify state + complete promotion side.

### Files

- `apps/play/src/ctBarOverlay.js` (extend o NEW se rebuilt) — visual 3-turn lookahead canvas overlay.
- `apps/backend/services/promotionEngine.js` (NEW) — `evaluatePromotion(unit, eventLog) → promotion_eligible[]`.
- `data/core/promotions/*.yaml` (NEW) — promotion threshold + stat reward per class.
- `apps/backend/routes/session.js` (extend) — `/api/v1/promote` POST endpoint.
- `tests/api/promotion.test.js` (NEW) — coverage promotion eligibility + reward.

### Acceptance criteria

1. CT bar mostra prossimi 3 turni unit order (visible HUD pre-action).
2. Promotion eligibility computed at end-of-mission (kill count + assist count + objective complete).
3. Player può accept/defer promotion (UI button).
4. Reward applicato: +stats + new ability tier.
5. Test suite 6+.

### Pillar impact

P3 Identità Specie × Job 🟢ⁿ rinforzato (promotion = canonical FFT progression depth).

### Effort breakdown

- 2h CT bar verify state (PR #1998 audit) + complete gaps
- 4h promotionEngine + data
- 2h API + UI button
- 2h test suite

---

## 4. TKT-P6-REWIND-SAFETY-VALVE — rewind ammortizer (~5-7h)

**Verdict source**: A3 IMPLEMENT ORA (override OD-014 deferred verdict).

### Scope

Rewind action `N` times per battle, snapshot state pre-action (turn-level granularity). Pattern reference: Tactics Ogre Reborn WORLD/Chariot rewind system. Anti-frustration safety valve player.

### Files

- `apps/backend/services/combat/rewindBuffer.js` (NEW) — `snapshotState(session) → snapshotId`, `restoreSnapshot(session, snapshotId) → session`.
- `apps/backend/routes/session.js` (extend) — `/api/v1/session/:id/rewind` POST endpoint, `rewinds_used` counter per session.
- `apps/play/src/rewindButton.js` (NEW) — UI button + confirm modal.
- `tests/api/rewind.test.js` (NEW) — coverage snapshot + restore + counter limit.

### Acceptance criteria

1. Player può rewind ultimo turno (state restored pre-action).
2. Counter `rewinds_used` ≤ `rewinds_max` (default 3 per battle, configurable).
3. Snapshot taken automaticamente pre-action (no manual trigger).
4. Restore non duplica raw event log entries (idempotent).
5. UI mostra rewinds disponibili (es. "Rewind 2/3").
6. Test suite 6+ coverage (snapshot, restore, limit, multi-rewind sequence, state integrity).

### Risks + mitigations

- **Risk**: snapshot memory cost per long battle. **Mitigation**: ring buffer 3 snapshot max + GC oldest.
- **Risk**: rewind interaction con AI policy state (vcScoring snapshot). **Mitigation**: snapshot include vcScoring metrics + ai_state.

### Effort breakdown

- 2h rewindBuffer service
- 1h API endpoint + counter
- 1h UI button + modal
- 1-3h test suite (state integrity edge cases)

### Pillar impact

P6 Fairness 🟢 candidato → 🟢++ (anti-frustration safety valve concrete).

---

## 5. TKT-P2-BRIGANDINE-SEASONAL — campaign macro-loop (~20h)

**Verdict source**: A4 PROMUOVI priorità M12+ → M14 (override OD-015 deferred verdict).

### Scope

Seasonal Organization Phase + Battle Phase, 5-10 stagioni meta-loop. Pattern reference: Brigandine. Macro-loop campaign-wide.

### Files

- `apps/backend/services/campaign/seasonalEngine.js` (NEW) — `advanceSeason(campaign) → campaign`, organization phase logic, battle phase trigger.
- `apps/backend/services/campaign/organizationPhase.js` (NEW) — recruit, train, equip, deploy.
- `data/core/campaign/seasons/*.yaml` (NEW) — 5-10 seasonal events + objective.
- `apps/backend/routes/campaign.js` (NEW) — `/api/v1/campaign/*` endpoints (start, advance, organization, battle).
- `apps/backend/prisma/schema.prisma` (extend) — `Season` + `Campaign` model.
- `apps/backend/prisma/migrations/00XX_campaign_seasonal.sql` (NEW, **forbidden path: require explicit grant**).
- `tests/api/campaign.test.js` (NEW) — coverage seasonal flow + organization + battle.

### Acceptance criteria

1. Campaign start → 10 seasons available.
2. Organization phase: 4 actions (recruit, train, equip, deploy).
3. Battle phase: trigger encounter scenario from data.
4. End of season: outcome aggregated + campaign metrics updated.
5. Campaign state persisted Prisma.
6. Test suite 10+ coverage.

### Risks + mitigations

- **Risk**: forbidden path `migrations/` blocked autonomous. **Mitigation**: master-dd manual grant included in C4 batch (questa session). Bundle migration con prisma generate gated.
- **Risk**: scope creep (long campaign 5-10 stagioni). **Mitigation**: MVP 5 seasons + extend post-playtest.

### Effort breakdown

- 6h seasonalEngine + organizationPhase
- 4h Prisma + migration (forbidden path master-dd review)
- 4h data 5 seasons
- 3h API + routes
- 3h test suite

### Pillar impact

P2 Evoluzione emergente 🟢ⁿ → 🟢++ (macro-loop campaign-wide unlock).

---

## 6. TKT-B1-UI-TV-POLISH — V6 dashboard polish proattivo (~3-5h)

**Verdict source**: B1 PROATTIVO ora (override OD-002 deferred post-playtest verdict).

### Scope

Layout refinement TV co-op view (V6 gap). Polish iterativo + screenshot before/after.

### Files

- `apps/play/src/*.css` (extend) — layout components TV-mode.
- `apps/play/src/lobbyBridge.js` (extend) — TV-specific HUD render hint.
- `docs/frontend/2026-05-XX-v6-polish-before-after.md` (NEW) — screenshot + delta doc.

### Acceptance criteria

1. TV-mode layout test su 1080p + 4K (no overflow).
2. Font size readable a 3m distance (≥24px body, ≥40px headers).
3. Color contrast WCAG AA ≥5:1.
4. Action bar persistent + status icon visible from sofa POV.
5. Screenshot before/after committed.
6. invoke skill `design-critique` o `accessibility-review` per validation.

### Effort breakdown

- 1h audit current TV-mode state
- 1-2h CSS layout fix
- 1h font + contrast polish
- 0.5-1h screenshot + doc

### Pillar impact

Cross-pillar UX polish — non sblocca pillar specifico, ma migliora playtest feedback quality.

---

## 7. TKT-C1-ANGULARJS-VUE-3 — trait-editor rebuild (~8-12h)

**Verdict source**: C1 Path C Vue 3 green-field rebuild (ADR-2026-05-10-trait-editor-angularjs-migration ACCEPTED).

### Scope

Green-field rebuild `apps/trait-editor/` Path C Vue 3. AngularJS 1.x EOL dal 2022 → migrate completo. Reference ADR-2026-05-10 11-item acceptance criteria.

### Files

- `apps/trait-editor/package.json` — deps AngularJS → Vue 3 + Pinia + Vue Router.
- `apps/trait-editor/src/main.ts` — Vue 3 bootstrap.
- `apps/trait-editor/src/App.vue` (NEW) — root component.
- `apps/trait-editor/src/components/*.vue` (NEW) — TraitEditor, TraitList, TraitForm.
- `apps/trait-editor/src/stores/traitStore.ts` (NEW) — Pinia state.
- `apps/trait-editor/vite.config.ts` (extend) — Vue plugin.
- `apps/trait-editor/tsconfig.json` (extend) — Vue support.
- `apps/trait-editor/tests/*.spec.ts` (NEW) — Vitest unit.

### Acceptance criteria (ADR 11-item)

1. Vue 3 + TypeScript + Vite stack.
2. State management Pinia.
3. Router Vue Router 4.x.
4. UI parity con AngularJS version (trait list, edit form, save/cancel).
5. API integration backend `/api/v1/traits/*` unchanged.
6. Test suite Vitest ≥80% coverage.
7. Build production bundle ≤500KB gzipped.
8. Accessibility WCAG AA.
9. AngularJS deps removed (`@angular/*` zero in package.json).
10. Documentation README.md + ADR §implementation section update.
11. Smoke test E2E browser (Playwright o Cypress).

### Reference

- `docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md` ACCEPTED Path C.
- `docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md` precedente migration pattern.

### Effort breakdown

- 1h scaffolding Vue 3 + Vite
- 3h components rebuild
- 2h Pinia store + Vue Router
- 2h API integration
- 2-3h test suite + E2E smoke
- 1h README + ADR update

---

## 8. TKT-C4-MUTATION-PHASE-6 — forbidden path bundle (~3-5h)

**Verdict source**: C4 GRANT forbidden path bundle (master-dd verdict batch 2026-05-11 explicit grant per `migrations/` + `packages/contracts/`).

### Scope

Mutation Phase 6 residue: 2 trigger kinds (`ally_adjacent_turns` + `trait_active_cumulative`) + Prisma migration 0009+ per cumulative state per-trait per-encounter.

### Files (forbidden path bundle)

- `apps/backend/prisma/migrations/0009_mutation_phase_6_cumulative.sql` (NEW, **forbidden path: `migrations/`**) — schema `TraitActiveCumulative` model.
- `apps/backend/prisma/schema.prisma` (extend) — model `TraitActiveCumulative { id, unit_id, trait_id, encounter_count, turns_cumulative, last_session_id }`.
- `packages/contracts/schemas/mutation.schema.json` (extend, **forbidden path: `packages/contracts/`**) — trigger_kind enum + 2 new entries.
- `apps/backend/services/combat/mutationTriggerEvaluator.js` (extend) — `evalAllyAdjacentTurns` + `evalTraitActiveCumulative` handlers.
- `apps/backend/services/combat/cumulativeStateTracker.js` (NEW) — write-through adapter Prisma + in-memory fallback (pattern canonical).
- `tests/api/mutationPhase6.test.js` (NEW) — coverage 2 trigger kinds + cumulative state.

### Acceptance criteria

1. Master-dd manual approve Prisma migration 0009 (forbidden path review).
2. Master-dd manual approve packages/contracts schema update (forbidden path review).
3. 2 trigger kinds (`ally_adjacent_turns` + `trait_active_cumulative`) evaluated correctly.
4. Cumulative state persisted Prisma (cross-session aggregate).
5. Test suite 8+ coverage.
6. Backwards compat: mutation_catalog.yaml entries con prose `trigger_examples` non rotti.

### Forbidden path grant trace

Master-dd verdict batch 2026-05-11 explicit:

- **C4 verdict**: "mutation Phase 6 GRANT forbidden path bundle (~3-5h, scoped ticket)".
- Grant scope: per questo singolo PR successor che implementa Phase 6. Future Phase 7+ require renewed grant.

### Effort breakdown

- 1h Prisma migration + schema extend
- 1h packages/contracts schema extend (master-dd review gate)
- 1.5h mutationTriggerEvaluator extend + cumulativeStateTracker
- 1h test suite

### Pillar impact

P2 Evoluzione emergente 🟢ⁿ → 🟢++ (auto-trigger evaluator 12/12 kinds complete).

---

## 9. TKT-C6-BALANCE-SKILL-INSTALL — mcpmarket skill (~30min)

**Verdict source**: C6 install ora ACCEPT (override OD-005 deferred verdict).

### Scope

Install `Game Balance & Economy Tuning` skill via mcpmarket. Test-driven adoption su dataset balance esistenti + `docs/playtest/*-calibration.md` raccolti.

### Files

- `.claude/settings.json` (extend) — skill registration entry.

### Action steps

1. Master-dd PC: invoke mcpmarket UI o CLI (skill name: `Game Balance & Economy Tuning`).
2. Confirm skill install (`.claude/settings.json` auto-update).
3. Smoke test invoke skill su sample data `docs/playtest/2026-04-19-hardcore-iter*.md`.
4. Acceptance: skill produce balance suggestion (es. damage curve adjustment).

### Risks

- **Risk**: Claude lacks mcpmarket access from agent (this session). **Mitigation**: master-dd manual install richiesto. Scope doc canonical preservato.

### Pillar impact

Workflow efficiency cross-pillar — non sblocca pillar, ma automatizza calibration iter 1-7 hardcore.

---

## Summary table

| #   | Ticket                        | Effort | Pillar impact          |
| --- | ----------------------------- | ------ | ---------------------- |
| 1   | TKT-M14-A elevation + terrain | ~12h   | P1 🟢 → 🟢++           |
| 2   | TKT-M14-B Conviction system   | ~13h   | P4 🟡 → 🟢 candidato   |
| 3   | TKT-M15 CT bar + promotion    | ~10h   | P3 🟢ⁿ rinforzato      |
| 4   | TKT-P6-REWIND-SAFETY-VALVE    | ~5-7h  | P6 🟢 candidato → 🟢++ |
| 5   | TKT-P2-BRIGANDINE-SEASONAL    | ~20h   | P2 🟢ⁿ → 🟢++          |
| 6   | TKT-B1-UI-TV-POLISH           | ~3-5h  | UX polish cross-pillar |
| 7   | TKT-C1-ANGULARJS-VUE-3        | ~8-12h | Trait Editor migration |
| 8   | TKT-C4-MUTATION-PHASE-6       | ~3-5h  | P2 🟢ⁿ → 🟢++          |
| 9   | TKT-C6-BALANCE-SKILL-INSTALL  | ~30min | Workflow efficiency    |

**Cumulative total**: ~70-90h.

## Execution order suggestion

Priority sequence balancing quick-wins, dependencies, and forbidden path approvals:

1. **TKT-C6 install skill (~30min)** — fastest unlock, async master-dd manual.
2. **TKT-C4 mutation Phase 6 (~3-5h)** — forbidden path bundle SHIPPED grant already granted, complete Phase 4 chain.
3. **TKT-B1 UI TV polish (~3-5h)** — quick win, no blockers.
4. **TKT-P6-REWIND-SAFETY-VALVE (~5-7h)** — P6 safety valve, isolated scope.
5. **TKT-M14-A elevation + terrain (~12h)** — Triangle Strategy sequence start.
6. **TKT-M14-B Conviction system (~13h)** — Triangle Strategy sequence continue.
7. **TKT-M15 CT bar + promotion (~10h)** — Triangle Strategy sequence close.
8. **TKT-C1-ANGULARJS-VUE-3 (~8-12h)** — independent, master-dd availability for review.
9. **TKT-P2-BRIGANDINE-SEASONAL (~20h)** — largest scope, Sprint M14 macro-loop close.

**Cumulative session count** (assumed ~3-5h autonomous per session): ~14-20 future sessions.

---

## References

- `OPEN_DECISIONS.md` — OD-002/003/004/005/014/015 status flip ACCEPTED 2026-05-11.
- `BACKLOG.md` — verdict batch summary table.
- `docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md` ACCEPTED Path C Vue 3.
- `docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md` ACCEPTED.
- `docs/adr/ADR-2026-05-11-species-expansion-schema-canonical-migration.md` ACCEPTED Path B variant.
- `docs/adr/ADR-2026-04-28-deep-research-actions.md` Tactics Ogre + Brigandine citations.
- `docs/research/triangle-strategy-transfer-plan.md` Triangle Strategy reference.

---

**Master-dd verdict gate**: questo doc è scope canonical. Implementation PR per ciascun ticket richiede:

1. Master-dd ack ticket selection.
2. Branch creation per ticket dedicato.
3. Forbidden path bundle (TKT-C4 + TKT-P2) require renewed master-dd review per PR.
