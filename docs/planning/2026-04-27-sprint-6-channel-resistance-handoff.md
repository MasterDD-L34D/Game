---
title: 'Sprint 6 channel resistance earth/wind/dark — handoff 2026-04-27'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, sprint, balance, ancient-beast, tier-s, channel-resistance]
related:
  - docs/planning/2026-04-27-sprint-1-5-autonomous-handoff.md
  - docs/balance/2026-04-27-numeric-reference-canonical.md
  - packs/evo_tactics_pack/data/balance/species_resistances.yaml
  - packs/evo_tactics_pack/data/balance/trait_mechanics.yaml
  - tests/ai/resistanceEngine.test.js
  - tests/api/contracts-trait-mechanics.test.js
  - CLAUDE.md
---

# Sprint 6 channel resistance — handoff 2026-04-27

> Scope: 1 PR autonomous shipped (~6h effort) — quick win balance.
> Trigger: handoff Sprint 1-5 §9 candidato C "3 nuovi elementi channel resistance (earth/wind/dark) AncientBeast #6 residuo".
> Pattern source: AncientBeast Tier S #6 Material/Element classes (extraction matrix).

## §1 — Sessione output

**1 PR mergiato (in corso CI)**:

| PR    | Sprint              | Scope                                                                                                                                                                                  |   Status   |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: |
| #1964 | 6 channel resist QW | species_resistances.yaml v0.2.0 (+earth/wind/dark, 15 entry) + trait_mechanics 6 ability nuove + 3 resist passive + 10 test resistanceEngine + numeric-reference §10 canonical channel | 🟡 PENDING |

## §2 — Pillars status delta

| #   | Pilastro | Pre Sprint 6 | Post Sprint 6 | Delta                                                                                                                                                                                                                                                                                                       |
| --- | -------- | :----------: | :-----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P6  | Fairness |    🟢c++     |    🟢 def     | Parity 11 channel canonical (vs 8 attuali) — earth/wind/dark integrated 5 archetype + 6 ability routing + invariant test no outlier > 2× baseline (cap 20 dmg) e < 0.5× baseline (cap 5 dmg) su 6 channel × 5 archetype matrix. AncientBeast Tier S #6 partial closure (residui Beast Bond + r3/r4 ability) |

**Score finale post Sprint 1-6**: **5/6 🟢 def + 1/6 🟢c** (P5 unblock playtest live + P6 def chiusa).

## §3 — Decisioni chiave

### Channel allocation per archetipo (delta convention)

Range 70-120 (delta ±30 max). Coerente con valori pre-Sprint 6 (es. corazzato.fisico=80, psionico.psionico=70):

| Archetipo    | earth         | wind          | dark          | Rationale                                     |
| ------------ | ------------- | ------------- | ------------- | --------------------------------------------- |
| corazzato    | 70 (+30 res)  | 80 (+20 res)  | 100 (neutral) | Heavy plate: terra/aria-pressure resilient    |
| bioelettrico | 120 (-20 vul) | 90 (+10 res)  | 110 (-10 vul) | Light/airy electric: ground-conductive vuln   |
| psionico     | 100 (neutral) | 100 (neutral) | 80 (+20 res)  | Mind-affinity con abyss/anti-light            |
| termico      | 90 (+10 res)  | 110 (-10 vul) | 120 (-20 vul) | Solar/fire dwellers: dark = sun-bound penalty |
| adattivo     | 100           | 100           | 100           | Neutral baseline (no outlier)                 |

### Ability allocation (6 ability su 5 trait esistenti)

Multi-active_effect pattern: trait con 2 ability (1 nuovo channel + 1 esistente). Schema permette array `active_effects`, no breaking change ai 33 core trait. Tutti effect_type=damage con damage_dice 1d6+1 / 1d6+2 / 1d8+1 / 1d8+2 (range entro damage_step cap ≤2).

## §4 — Test enforcement

- `tests/ai/resistanceEngine.test.js` 21 → 31 test (+10):
  - 6 test channel-specific (earth/wind/dark × archetype-resist/vuln)
  - 1 test adattivo neutral su tutti 3 channel
  - 1 test 11-channel presence (no missing key per archetype)
  - 1 test 6×5 matrix invariant no outlier
  - 1 test esistente parity check
- `tests/api/contracts-trait-mechanics.test.js` CANONICAL_CHANNELS 8 → 11

**AI baseline**: 363/363 ✓ (zero regression, was 311 pre + 21 resistanceEngine = 332; ora 363 = +31 dopo Sprint 6).

## §5 — Backlog residuo AncientBeast Tier S #6

| Tier | Ticket                         | Effort | Pillar | Note                                                 |
| :--: | ------------------------------ | :----: | :----: | ---------------------------------------------------- |
|  S   | Beast Bond reaction trigger    |  ~5h   |  P1+   | Tactical depth + creature trait reactivity           |
|  S   | Ability r3/r4 tier progressive |  ~10h  |  P3+   | Jobs depth (r1/r2 attuali → r3/r4 + costing scaling) |

## §6 — Next session entry points

**Bundle quick win (~5h, P1+)**:

- Beast Bond reaction trigger ~5h: estende `intercept` reaction system (M2 ability executor) con creature affinity bonds. `creature_bond.yaml` data + `bondReactionTrigger.js` runtime + 3-5 trait wirable.

**Bundle deep (~10h, P3+)**:

- Ability r3/r4 tier progressive: extend `data/core/jobs.yaml` con rank r3/r4 + scaling formula + 2-3 ability per job. Test: `tests/api/jobs.test.js`.

**Bundle outside Tier S #6**:

- Thought Cabinet UI panel cooldown round-based (Disco Tier S #9, ~8h, P4 dominant)
- Wildermyth layered storylets pool (Tier S #12 residuo, ~10h, P4 narrative)

## §7 — Doc updates

- ✅ `docs/balance/2026-04-27-numeric-reference-canonical.md` §10 nuova sezione canonical channel matrix
- ✅ Memory file `project_sprint_6_resistance_channels.md` + MEMORY.md index entry
- ✅ Handoff doc (questo file)
- ⏳ CLAUDE.md sprint context bump (next paragrafo)
- ⏳ docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §B.1.5 AncientBeast riga "channel resistance partial closure"
