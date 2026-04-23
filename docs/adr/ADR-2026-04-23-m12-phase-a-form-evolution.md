---
title: 'ADR-2026-04-23: M12 Phase A — Form evolution engine (Pilastro 2)'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-23
source_of_truth: false
language: it-en
review_cycle_days: 30
related:
  - docs/core/PI-Pacchetti-Forme.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
---

# ADR-2026-04-23: M12 Phase A — Form evolution engine

- **Data**: 2026-04-23
- **Stato**: Accepted
- **Owner**: Backend + Design
- **Stakeholder**: Pilastro 2 (Evoluzione emergente), Campaign engine (M10), VC scoring (P4)

## Contesto

Pilastro 2 (Evoluzione emergente, Spore-like) era 🔴 all'audit 2026-04-20:

- Dataset shipped completo (84 species + 16 MBTI forms YAML + packs.yaml)
- Runtime `metaProgression.js` (recruit + mating + nest) — prima leva, ma NON evoluzione
- Zero form transitions runtime, zero PI spender integrato, zero trigger

M12 big rock (~35h) restava deferred. Dopo chiusura M11 (PR #1682/#1686/#1684/#1685/#1688), M12 Phase A sblocca il primo piede del Pilastro: **state machine di form transition con trigger deterministici**.

Runtime già disponibile:

- `apps/backend/services/personalityProjection.js` — `loadForms` + `projectForm` (closest MBTI) → inferenza form da VC axes
- `apps/backend/services/metaProgression.js` — in-memory + Prisma fallback (NPC affinity/trust/nest)
- `data/core/forms/mbti_forms.yaml` — 16 forms con axes target + job_affinities + temperament

**Mancava**: layer che leghi questi pezzi in un **engine evoluzione** con trigger (confidence, PE, cooldown, cap) + endpoint REST.

## Decisione

Implementare `FormEvolutionEngine` (class) come layer sopra `personalityProjection` con 5 regole di gating + 5 endpoint REST. Persistence deferred a M12.B (integrazione con meta/campaign session store).

### Architettura

```
                          ┌──────────────────────────────┐
                          │ data/core/forms/mbti_forms   │
                          │   .yaml (16 forms + NEUTRA)  │
                          └────────────┬─────────────────┘
                                       │ loadForms()
                                       ▼
 VC snapshot  ───────▶  personalityProjection.projectForm (closest MBTI)
 (mbti_axes)                       │
                                   │ axes + forms registry
                                   ▼
                        ┌──────────────────────────────────┐
                        │ FormEvolutionEngine              │
                        │   evaluate(unit, vc, target)     │
                        │   evaluateAll(unit, vc)          │
                        │   evolve(unit, vc, target)       │
                        │   snapshot() · getForm(id)       │
                        └────────────┬─────────────────────┘
                                     │
                          /api/v1/forms/{registry, :id,
                                        evaluate, options, evolve}
                                     │
                                     ▼
                              Campaign/session consumer
                              (M12.B integration)
```

### 5 regole di gating (default)

| Regola                       | Check                                                                         | Default  |
| ---------------------------- | ----------------------------------------------------------------------------- | -------- |
| `form_not_found`             | `targetFormId` esiste in registry                                             | strict   |
| `confidence_below_threshold` | `1 - euclideanDistance(observedAxes, targetAxes) / 2` ≥ `confidenceThreshold` | **0.55** |
| `insufficient_pe`            | `unit.pe + extraPe` ≥ `peCost`                                                | **8 PE** |
| `cooldown_active`            | `currentRound - unit.last_evolve_round` ≥ `cooldownRounds`                    | **3**    |
| `already_current_form`       | `unit.current_form_id !== targetFormId` (bypass via `allowSameForm: true`)    | strict   |
| `max_evolutions_reached`     | `unit.evolve_count < maxEvolutions` (solo se `maxEvolutions !== null`)        | disabled |

Tutte configurabili via `new FormEvolutionEngine({ options: {...} })`.

### Protocollo REST

| Method | Path                     | Input                                        | Output                                         |
| ------ | ------------------------ | -------------------------------------------- | ---------------------------------------------- |
| GET    | `/api/v1/forms/registry` | —                                            | `{ version, forms: [...] }`                    |
| GET    | `/api/v1/forms/:id`      | —                                            | form detail · 404 se unknown                   |
| POST   | `/api/v1/forms/evaluate` | `{ unit, vc_snapshot, target_form_id, ... }` | eligibility report                             |
| POST   | `/api/v1/forms/options`  | `{ unit, vc_snapshot, ... }`                 | `{ options: scored[] }` sorted desc confidence |
| POST   | `/api/v1/forms/evolve`   | `{ unit, vc_snapshot, target_form_id, ... }` | `{ ok, unit, delta, report }` · 409 se fail    |

Mount su **sia** `/api/v1/forms` sia `/api/forms` (backward-compat con convention meta/tutorial/jobs).

### Opzioni valutate

#### A. FormEvolutionEngine class + plugin loader ← SCELTA

- **Pro**: zero nuove deps, riuso `personalityProjection`, separazione clean stato/trigger, test unit + integration facili
- **Pro**: ownership clear: engine pure / routes thin / persistence deferred
- **Contro**: stato unit è caller-supplied → M12.B deve orchestrare chi lo chiama e persiste (session store?)

#### B. Trait-like plugin diretto su session.js

- **Pro**: integration nativa con combat loop
- **Contro**: session.js già 851 LOC + guardrail CLAUDE.md "non toccare senza segnalare". Blast radius alto, DoD complesso.
- Rigettato.

#### C. Dataset YAML extension + applica via Flow pipeline

- **Pro**: fit con Flow generation
- **Contro**: Flow genera pre-session blueprint, NON evoluzione runtime emergente. Missing a point.
- Rigettato — confonderebbe dataset con runtime, stesso pattern identificato nell'audit.

## Conseguenze

### Positive

- **Pilastro 2 gap ridotto**: 🔴 → 🟡 per Phase A (runtime engine + endpoint). M12.B sblocca 🟢 chiudendo persistence + integration.
- **Zero deps**: engine riusa `js-yaml` + `personalityProjection` esistenti.
- **Test coverage**: 25 test nuovi (16 unit + 9 route) senza regressioni.
- **Endpoint contract stabile**: 5 endpoint testati + documentati.
- **Configurabile**: ogni soglia/cost/cooldown via options → facilita balance tuning senza code changes.

### Negative

- **Persistence assente**: unit state caller-supplied. M12.B deve decidere dove vive (session engine? meta store? campaign Prisma?).
- **Integrazione VC/PE pending**: PE cost oggi è caller-supplied; M12.B integra con economia PI pack + campaign ledger.
- **Cooldown in rounds, non in time**: dipende dal caller sapere `currentRound`. Semplice ma accoppia engine al round loop.
- **Max evolutions disabled default**: design choice da confermare — senza cap, un'unità può hoppare liberamente se PE+axes lo permettono.

### Rollback

- Plugin removal: rimuovere `formsPlugin` da `BUILTIN_PLUGINS` in `pluginLoader.js` → endpoint non esposti.
- Revert PR: engine + routes + tests rimossi, nessun impatto runtime (non chiamato da altre parti).

## Scope Phase A (questo PR)

- `apps/backend/services/forms/formEvolution.js` (~200 LOC): `FormEvolutionEngine` class
- `apps/backend/routes/forms.js` (~100 LOC): 5 endpoint
- `apps/backend/services/pluginLoader.js`: +`formsPlugin` in `BUILTIN_PLUGINS`
- Tests: `tests/api/formEvolution.test.js` (16 unit) + `tests/api/formsRoutes.test.js` (9 integration)

**Totale nuovi test**: **25/25** pass. Baseline AI 307/307 + lobby 26/26 intatti.

## Fuori scope Phase A (M12.B next sprint, ~12h)

- Persistence: salvare `current_form_id + pe + last_evolve_round + evolve_count` in session/campaign store
- PI pack spender: integrare `data/packs.yaml` cost system (trait_T1/T2/T3, job_ability, sigillo_forma) con il flusso evolve
- Integration campaign engine: trigger `evolve` al `campaign/advance` node boundary
- UX frontend: pannello evoluzione in `apps/play/src/` (form select + preview deltas + PE balance)

## Fuori scope Phase C+ (deferred)

- Visual feedback (anim transition, form sprite swap)
- Trait acquisition via pack roll durante evolve (Wesnoth advancement pattern)
- Multi-step evolution path (prerequisiti form → form)
- Balance tuning via calibration harness

## Riferimenti

- Canvas B design canonical: [`docs/core/PI-Pacchetti-Forme.md`](../core/PI-Pacchetti-Forme.md)
- MBTI forms YAML: `data/core/forms/mbti_forms.yaml` (16 types + NEUTRA fallback)
- Pilastri audit: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](../planning/2026-04-20-pilastri-reality-audit.md)
- Strategy M9-M11: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](../planning/2026-04-20-strategy-m9-m11-evidence-based.md)
- personalityProjection impl: `apps/backend/services/personalityProjection.js`
