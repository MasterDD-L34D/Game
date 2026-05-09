---
title: 'Status Effects v2 Phase A — Handoff 2026-05-09'
date: 2026-05-09
doc_status: active
doc_owner: claude-code
workstream: combat
last_verified: '2026-05-09'
source_of_truth: false
language: it
review_cycle_days: 14
---

# Status Effects v2 Phase A — Handoff 2026-05-09

## Risultato sessione

**Goal originale**: implementare 5 stati Tier 1 come 5 mini-PR.
**Finding audit**: runtime già su main (implementato 2026-04-27, handoff `2026-04-27-status-effects-phase-a-handoff.md`).
**Pivot**: 2 PR sui gap residui effettivi.

| PR     | Branch                        | Scope                                     | CI      | Tests         |
| ------ | ----------------------------- | ----------------------------------------- | ------- | ------------- |
| [#2138](https://github.com/MasterDD-L34D/Game/pull/2138) | `feat/status-phase-a-glossary` | Glossary sync: 5 trait Phase A in glossary.json | ✅ verde | 42/42 (invariato) |
| [#2139](https://github.com/MasterDD-L34D/Game/pull/2139) | `feat/status-phase-a-policy`   | AI policy: debuff target preference       | in progress | 52/52 (+10) |

## Stato runtime Phase A su main (completo da 2026-04-27)

| Stato        | Consumer hook                          | Trait produttore       | Cap | Tests |
| ------------ | -------------------------------------- | ---------------------- | --- | ----- |
| `slowed`     | `sessionHelpers.js:698` -1 AP reset    | `tela_appiccicosa`     | 3T  | ✅    |
| `marked`     | `session.js:597` +1 dmg next hit       | `marchio_predatorio`   | 2T  | ✅    |
| `burning`    | `session.js:1217` DoT 2 PT/T           | `respiro_acido`        | 3T  | ✅    |
| `chilled`    | `session.js:513` + `helpers:697`       | `aura_glaciale`        | 2T  | ✅    |
| `disoriented`| `session.js:518` -2 atk 1T            | `sussurro_psichico`    | 1T  | ✅    |

## Cosa è stato fatto questa sessione

### PR-A: Glossary sync

- Aggiunti 5 entry in `data/core/traits/glossary.json` (592 → 597 traits)
- Format: `{ label_it, label_en, description_it, description_en }` per ogni trait
- CI PR #2138: 100% verde (dataset-checks + styleguide + python-tests + cli-checks + governance + QA baselines)

### PR-B: AI policy status-awareness

- `apps/backend/services/ai/policy.js`: nuovo `DEFAULT_OBJECTIVES.attack_debuffed_target` (weight 0.5)
- `apps/backend/services/ai/declareSistemaIntents.js`: `hasDebuffStatus` helper + debuff tie-break in `pickTargetExcluding` (±2 HP threshold)
- `tests/ai/statusEffectsPhaseA.test.js`: +10 test (7 hasDebuffStatus + 3 objective spec)
- Test baseline: 42 → 52 pass

### Docs prodotti

- `docs/planning/2026-05-09-status-effects-phase-a-audit.md` — audit completo pipeline
- `docs/planning/2026-05-09-status-effects-phase-a-design.md` — design call 2 gap

## Gap residui (non questa sessione)

### Gate 5 — HUD surface (Priority 2, deferred)

Nessuno dei 5 stati ha surface player-visible. Gate 5 violation.
- **Scope**: Godot v2 `unit_info_panel.gd` + combat log
- **Effort**: ~3-4h frontend
- **Trigger consigliato**: sessione Godot v2 post-Day 7 monitoring

### Phase B stati (Priority 4, deferred)

- `burning` + `chilled` cancel → reward +1 PT (design call pendente master-dd)
- `chilled` → `frozen` upgrade su doppia applicazione
- `burning` resistenza specie acquatiche
- `burning`-awareness AI (DoT prediction, non-urgente)

## Test baseline post-sessione

```
node --test tests/ai/statusEffectsSlowed.test.js tests/ai/statusEffectsMarked.test.js \
  tests/ai/statusEffectsBurning.test.js tests/ai/statusEffectsPhaseA.test.js
# pass 52, fail 0
```

AI test totale (infrastruttura ok): 220 pass, 10 fail (js-yaml/supertest mancanti — pre-esistenti).

## Resume trigger prossima sessione

```
leggi docs/planning/2026-05-09-status-effects-phase-a-handoff.md
→ PR #2138 + #2139 da mergere se CI verde
→ Gate 5 HUD surface: Godot v2 unit_info_panel.gd + log combat Phase A states
→ oppure Phase B stati: burning+chilled interaction design call con master-dd
```
