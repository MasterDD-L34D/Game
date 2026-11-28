---
title: ERMES runtime bridge pilot 4x4 (FASE 2 shipped 2026-05-29)
museum_id: M-2026-05-29-001
type: architecture
domain: ermes_bridge
provenance:
  found_at: vault Spaces/Dev/Evo-Tactics/adr/ADR-2026-05-29-ermes-runtime-bridge.md
  git_sha_first: 664f0c91
  git_sha_last: 4f1a9800
  last_modified: 2026-05-29
  last_author: claude (FASE 2 via PR Game)
  buried_reason: deferred (originally E7 plan ERMES 2026-04-29 + Sprint 3 Roadmap Biodiversita Connessa 2026-04-19)
relevance_score: 5
reuse_path: 'Estensione ADR-21c pattern -> ermesRunner reverse-index + applyErmesBiomeTraitCosts bucketed DISCRETO + suggestions JSON-Patch + REST /api/traits/suggestions. Pilot 4 trait x 4 biomi (savana / caverna_risonante / rovine_planari / cryosteppe_convergence). Promotion N=40 calibration (TKT-BR-12 deferred).'
related_pillars: [P2, P5, P6]
status: curated
excavated_by: repo-archaeologist (via Claude Code Ryzen session 2026-05-29)
excavated_on: 2026-05-29
last_verified: 2026-05-29
---

# ERMES runtime bridge pilot 4x4

## Summary (30s)

- **What**: il bridge `trait-editor <-> canon <-> ERMES <-> debrief <-> bias` shipped 2026-05-29 come FASE 2 di ADR-2026-05-29-ermes-runtime-bridge. Mirror struttura ADR-2026-04-21c pilot 4x3 trait_environmental_costs.
- **Where**: `apps/backend/services/ermes/ermesRunner.js` (NEW) + `apps/backend/services/coop/ermesExporter.js` (updated schema v1.0.0 + getErmesBucketed) + `apps/backend/services/traitEffects.js` (applyErmesBiomeTraitCosts extension) + `apps/backend/routes/traits.js` (GET /api/traits/suggestions) + `prototypes/ermes_lab/ermes_sim.py` (run_multi_biome) + `prototypes/ermes_lab/suggestions.py` (NEW) + `data/core/balance/ermes_bucket_thresholds.yaml` (NEW).
- **Why counts**: chiude pattern "Engine LIVE Surface DEAD" identificato in V2 inspect Vision Spec Gap. Trait edit ora propaga ERMES bias agli stati runtime e suggestion al trait-editor in modo DISCRETO leggibile (anti-ref Creatures).

## What was buried

Plan E7 ERMES (2026-04-29) deferred post Sprint I + ADR + test regression. Sprint I deprecated post-pivot Godot (DC-08 verdict 2026-05-29). ADR + test regression preparate FASE 1 + FASE 2 via ADR-2026-05-29-trait-schema-canonization (PR #2427) + ADR-2026-05-29-ermes-runtime-bridge (vault PR #212 merged 2026-05-29).

Roadmap Biodiversita Connessa Drive (2026-04-19 v1.0) Sprint 3 "Connessioni attive" + Sprint 4 "Progressione/UI/telemetria" mappa esattamente sul ciclo bridge ERMES.

## Why it might still matter

### Pillar match

- **P2 Evoluzione emergente**: ERMES bias drive runtime trait modifier discrete (anti-ref Creatures stat-drift continuo). Spore Niche Mendel-style espressione DISCRETA leggibile.
- **P5 Co-op vs Sistema**: bioma reagisce alle scelte trait squadra = sistema-pressione narrative + tactical layer.
- **P6 Fairness**: bucket cap +/-2 + max 3 buckets active per unit = leggibilita anti-overload. Calibration N=40 gate (TKT-BR-12 deferred).

### Cross-card ecosystem

- [M-2026-04-25-011 BiomeMemory + trait cost](architecture-biome-memory-trait-cost.md) -- Path Full ora shipped (era Moderate ADR-21c shipped 2026-04-21).
- [M-2026-04-26-001 Voidling Bound 6 patterns](evolution_genetics-voidling-bound-patterns.md) -- P1/P3 ability class unlock + Apex terminal endpoint allineato con bucket DISCRETO output.
- [M-2026-04-25-007 mating-engine-orphan](mating_nido-engine-orphan.md) -- M-007 FULL CLOSURE 2026-05-13 prerequisite per bridge step ortogonalita D-HEIR.
- [M-2026-05-10-001 ancestors-rename-proposals](ancestors-297-orphan-2026-05-10.md) -- Tier-Ancestor policy chiusa nello stesso ship FASE 1.

## Concrete reuse paths

### 1. Minimal -- verifica end-to-end pipeline (~30 min)

```bash
# Genera report multi-biome
python prototypes/ermes_lab/ermes_sim.py --multi-biome \
  --config prototypes/ermes_lab/configs/multi_biome.json \
  --output prototypes/ermes_lab/outputs/latest_eco_pressure_report.json

# Genera suggestions
python prototypes/ermes_lab/suggestions.py

# Consumer backend
curl http://localhost:3334/api/traits/suggestions
```

### 2. Moderate -- TKT-BR-09 Vue 3 view (~3h)

`apps/trait-editor/src/views/TraitSuggestionsView.vue`: tabella suggestions + accept/reject buttons mapping a TraitValidationAutoFix.operations. ItB telegraph pattern (tutto visibile pre-accept).

### 3. Full -- TKT-BR-12 calibration batch N=40 (~half-day)

`tools/py/calibrate_drift_verify.py --n-per-trial 40` su 4 biomi pilot. WR shift threshold <5pp promotion / 5-10pp tune / >10pp kill (mirror ADR-21c criteria). Workflow L-2026-05-055 reuse.

## Sources / provenance trail

- ADR vault (vault sovereign): [`ADR-2026-05-29-ermes-runtime-bridge.md`](../../../../vault Spaces/Dev/Evo-Tactics/adr/ADR-2026-05-29-ermes-runtime-bridge.md) -- merged vault PR #212.
- Plan formale superpowers writing-plans: [`vault plans/2026-05-29-traits-editor-ermes-bridge.md`](../../../../vault Spaces/Dev/Evo-Tactics/plans/2026-05-29-traits-editor-ermes-bridge.md).
- Audit master vault: [`vault 2026-05-29-traits-editor-ermes-integration-audit-and-design.md`](../../../../vault Spaces/Dev/Evo-Tactics/2026-05-29-traits-editor-ermes-integration-audit-and-design.md).
- ADR canon parallela FASE 1: vault `Spaces/Dev/Evo-Tactics/adr/ADR-2026-05-29-trait-schema-canonization.md` -- merged Game PR #2427 2026-05-29.
- Pattern reuse ADR-21c: [`docs/adr/ADR-2026-04-21c-trait-environmental-costs.md`](../../adr/ADR-2026-04-21c-trait-environmental-costs.md).
- Plan ERMES E0-E8: [`docs/planning/2026-04-29-ermes-integration-plan.md`](../../planning/2026-04-29-ermes-integration-plan.md).
- Cleanup-handoff: [`docs/planning/2026-04-29-ermes-cleanup-handoff.md`](../../planning/2026-04-29-ermes-cleanup-handoff.md).
- sot-drift-verifier preliminary verdict: vault `docs/research/2026-05-29-sot-drift-verifier-preliminary-verdict.md` -- NO_DRIFT high confidence.
- Sprint I status verification: vault `docs/research/2026-05-29-sprint-i-status-verification.md` -- DEPRECATED post-pivot Godot 2026-04-29.

## Risks / open questions

- **R5 anti-Creatures stat-drift**: mitigato via bucket DISCRETI hardcoded `data/core/balance/ermes_bucket_thresholds.yaml` (cap +/-2, max 3 buckets active).
- **R6 sot-drift D-HEIR**: TKT-DC-06 epigenome readback + TKT-BR-15 sot-drift-verifier preliminary verdict NO_DRIFT. Re-invocazione gate (a) Fase-4 stat_drift_per_gen / (b) consumer scrive creature_epigenome.bias / (c) N=40 cap exceed.
- **R4 Godot v2 cross-repo parity**: TKT-BR-11 deferred (mirror PR `ermes_role_gap.gd`).
- **TKT-BR-09 Vue 3 view deferred**: REST endpoint shipped + suggestions producer shipped, frontend UI accept/reject in follow-up PR.
- **TKT-BR-12 calibration N=40 deferred**: operational task (richiede game running + test fixtures specifici). Promotion gate post-deploy.

## Anti-pattern guard

- **NON applicare auto suggestions** senza Eduardo gate accept/reject (ADR sezione Scope guard).
- **NON usare nome "ERMES"** come label UI player-facing (doctrine: nome diegetico, narrative "Bioma calmo/in equilibrio/in tensione").
- **NON estendere bucket thresholds** durante pilot senza ratifica master-dd (tunabilita post-playtest TKT-BR-12).
- **NON scrivere dentro creature_epigenome.bias** dal consumer ERMES (vincolo sot-drift-verifier).
- **NON skip mirror Godot v2 PR** quando shipping (TKT-BR-11 obbligatorio post-pilot).

## Next actions

- TKT-BR-09 Vue 3 TraitSuggestionsView (follow-up PR).
- TKT-BR-10 debrief input scaffold (`apps/backend/report.js` extend per session.id -> prototypes/ermes_lab/inputs/).
- TKT-BR-11 cross-repo Godot v2 mirror PR (ermes_role_gap.gd).
- TKT-BR-12 calibration batch N=40 (post-deploy verifica promotion gate).
- TKT-BR-14 trackers update (`Game PILLARS_STATUS.md` + `codemasterdd KNOWLEDGE_MAP.md` sezione 2 row "ERMES runtime bridge").
- TKT-BR-15 sot-drift-verifier final verdict post-FASE 2 ship.
