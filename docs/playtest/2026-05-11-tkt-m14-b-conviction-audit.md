---
title: TKT-M14-B Conviction system audit + scope refinement
doc_status: active
doc_owner: claude
workstream: ops-qa
last_verified: '2026-05-11'
source_of_truth: false
language: it
review_cycle_days: 30
---

# TKT-M14-B Conviction system audit + scope refinement

**Sessione**: 2026-05-11 — cascade serial post PR #2246 (TKT-M14-A).
**Pillar target**: P4 MBTI/Ennea 🟡 → 🟢 candidato.
**Scope ticket**: [`docs/planning/2026-05-11-big-items-scope-tickets-bundle.md`](../planning/2026-05-11-big-items-scope-tickets-bundle.md) §2 (~13h stimati).
**Verdict**: scope-refinement, defer impl a sprint dedicato (audit shows <5% complete, full impl out of session budget).

## Contesto

Verdict batch master-dd 2026-05-11 A2: sequenza M14-A → M14-B → M15 (Triangle Strategy slice). PR #2246 ha chiuso M14-A (elevation + terrain). Sessione precedente (PR #2246 agent) ha notato che M14-B era stato "rescoped" come "positional damage" e dichiarato già shipped via `computePositionalDamage` in `sessionHelpers.js:624`. Questo audit verifica se quella rescoping è valida o se la specifica originale §2 (Conviction system Utility/Liberty/Morality) sia ancora unshipped.

## Audit findings

### Grep coverage map

```
grep "conviction|Conviction" apps/backend/     → 1 file: services/mbtiSurface.js
grep "conviction|Conviction" data/core/         → 0 file
grep "convictionEngine|ConvictionEngine" apps/  → 0 file
grep "utility|liberty|morality" vcScoring.js    → 'utility' presente ma è T_F MBTI raw metric
```

### Interpretazione

| Componente                                       | Stato                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/services/convictionEngine.js`      | ❌ **NOT shipped** (file non esiste)                                                                                               |
| `apps/backend/services/vcScoring.js` extension   | ❌ **NOT extended** per Util/Lib/Mor tracker                                                                                       |
| `data/core/dialogue/conviction_branches/*.yaml`  | ❌ **NOT shipped** (dir non esiste)                                                                                                |
| `/api/v1/conviction/:sessionId` endpoint         | ❌ **NOT shipped** in `session.js`                                                                                                 |
| `tests/api/conviction.test.js`                   | ❌ **NOT shipped**                                                                                                                 |
| `mbtiSurface.js` `buildConvictionBadges()`       | ✅ Shipped MA scope diverso — surface UI badge color-coded per MBTI axis snapshot, NON Conviction tracker Triangle Strategy 3-axis |
| `computePositionalDamage` in `sessionHelpers.js` | ✅ Shipped MA scope diverso — meccanica positional damage (flanking + back attack), NON Conviction (psychological axis influence)  |

**Conclusione**: lo scope §2 originale (Conviction Utility / Liberty / Morality 3-axis psychological tracker + dialogue branching + recruit gating + debrief surface) è **shipped 0%**. La precedente rescoping a "positional damage" era una **mis-assignment**: `computePositionalDamage` è un'implementazione di Mechanic 3 di [`triangle-strategy-transfer-plan.md`](../research/triangle-strategy-transfer-plan.md) (tactical combat — flanking/elevation/follow-up), non Mechanic 1 (Conviction system).

### Naming collision tracker

Il termine "Conviction" è usato in 2 sensi differenti nel repo:

1. **mbtiSurface.js "Conviction badges"**: badge UI Triangle Strategy-styled color-coded che surface l'MBTI snapshot revealed per actor. Pattern reference: TS "Conviction" emoticon palette. Score: surface polish.
2. **Triangle Strategy Conviction system canonical**: 3-axis psychological tracker (Utility / Liberty / Morality) che influenza recruit gating + dialogue branching + combat triggers (mercy/execution split). Pattern reference: `triangle-strategy-transfer-plan.md` Mechanic 1.

I due sono **NON sovrapponibili**: l'attuale `buildConvictionBadges` è surface MBTI, mentre il ticket §2 chiede tracker 3-axis Utility/Liberty/Morality completamente distinto da MBTI.

## Acceptance criteria gap analysis

Dalle 5 acceptance criteria nel ticket §2:

| #   | Criterio                                                                                            | Stato                                      |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Conviction tracker aggrega 3 axis da raw event log (kill mercy ↑ util, refuse ↑ lib, execute ↑ mor) | ❌ assente                                 |
| 2   | Recruit gate: NPC con utility ≥80% rifiuta player liberty-aligned                                   | ❌ assente (no recruit gate system)        |
| 3   | Dialogue branch: 3+ scenari mostrano conviction-gated choice                                        | ❌ assente (no dialogue branching content) |
| 4   | Debrief: snapshot conviction visibile end-of-encounter                                              | ❌ assente                                 |
| 5   | Test suite 8+ coverage                                                                              | ❌ assente                                 |

**5/5 unshipped. Coverage = 0%.**

## Completion path raccomandato

### Option A — Impl full Conviction system (~13h, dedicated sprint)

Segui scope §2 senza modifiche:

1. **5h** — `convictionEngine.js` NEW: `evaluateConviction(events) → { util, lib, mor }` (0-100 scala per axis) + recruit gating predicate. `vcScoring.js` extension: hook raw event → axis delta (mercy_action → util+, refuse_order → lib+, execute_action → mor+).
2. **3h** — `data/core/dialogue/conviction_branches/*.yaml` 3-5 scenari sample (branch shape: `{ scenario_id, trigger: axis_threshold, choices: [...], outcomes: [...] }`).
3. **3h** — `/api/v1/conviction/:sessionId` GET endpoint in `session.js` (forbidden path no grant — richiede master-dd approval per session.js extend, OR alternative route file). Debrief surface: extend session `/state` response con `convictionAxis` snapshot.
4. **2h** — `tests/api/conviction.test.js` 8+ test (3 axis aggregation + recruit gate + 2 dialogue branch + debrief snapshot).

### Option B — Phase decomposition (~5h Phase A, defer B+C)

1. **Phase A (5h)** — `convictionEngine.js` + `vcScoring.js` extension solo (engine pure). Test suite 4 (3 axis + recruit gate predicate). No surface, no dialogue branches. Engine LIVE Surface DEAD anti-pattern noto, justify con: "engine first, surface dopo decision master-dd su criteria dialogue branch tematici".
2. **Phase B (4h, defer)** — dialogue branches YAML + content authoring.
3. **Phase C (4h, defer)** — surface API + debrief snapshot UI.

### Option C — Reject + supersede

Considera scope obsoleto se master-dd verdict batch flag drift: MBTI/Ennea già coprono psychological axis via `vcScoring.js` 6+9. Conviction Triangle Strategy aggiunge 3a dimensione → 3+3+3+9 = 18 trackable axes per actor. Overhead cognitivo player vs benefit narrative.

Se verdict: skip Conviction, mark P4 unlock via altra rotta (es. Ennea archetypes UI surface — gap noted in 2026-04-29 handoff §1).

## Decision raccomandata

**Option B Phase A** — engine first, ~5h scope contenuto in singolo sprint dedicato. Postpone Phase B+C a after-Option-A retrospective. Mitiga rischi:

- Forbidden path `session.js` extend evitato in Phase A (engine pure non richiede route mod).
- Dialogue branches authoring richiede content + lore decision (master-dd domain).
- Debrief surface richiede design UI Mission Console (forbidden path no source repo).

Phase A è quindi **autonomous-friendly** vs Phase B+C che richiedono master-dd content + design decisions.

## Pillar impact preserved

P4 MBTI/Ennea promotion 🟡 → 🟢 candidato **resta gated da Conviction tracker shipping** (Phase A min). Promotion immediate non possibile senza qualche surface (anche solo logged debrief).

Alternativa: P4 unlock via `Ennea archetypes UI surface` (gap separato noted in `docs/research/2026-05-08-ennea-archetypes-surface-gap.md` se esiste, oppure flag come OD futuro).

## Lesson learned canonical

**Naming collision risk**: termini polisemici ("Conviction" in 2 sensi) creano mis-assignment risk durante automation. Auditing requires grep + semantic check, non solo grep.

Pattern check obbligatorio: dopo grep `<term>`, leggere context ≥3 righe per disambiguare scope. Lesson da codify in CLAUDE.md §"Audit Before Claim Done" se ricorre.

## References

- Scope ticket: [`docs/planning/2026-05-11-big-items-scope-tickets-bundle.md`](../planning/2026-05-11-big-items-scope-tickets-bundle.md) §2
- Triangle Strategy reference: [`docs/research/triangle-strategy-transfer-plan.md`](../research/triangle-strategy-transfer-plan.md) Mechanic 1
- mbtiSurface conviction badges: `apps/backend/services/mbtiSurface.js:202` (NON è ticket scope)
- positional damage: `apps/backend/services/sessionHelpers.js:624` `computePositionalDamage` (NON è ticket scope, è Mechanic 3 TS)
- PR #2246 TKT-M14-A shipped (elevation + terrain) — sequenza A2 step 1/3
- OPEN_DECISIONS.md verdict batch master-dd 2026-05-11

## Closure status

- **Audit shipped**: ✅ this doc
- **Code changes**: ❌ none (scope refinement only)
- **Next session entry point**: invoca `/loop` con prompt _"TKT-M14-B Option B Phase A — engine + vcScoring extension + 4 test, ~5h"_
- **Forbidden paths to ask master-dd for grant**: `apps/backend/routes/session.js` (Phase A NON richiede grant; Phase C richiede)
