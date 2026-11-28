---
title: 'ADR-2026-04-28: Grid type final — SQUARE wins (post BG3-lite Plus, supersedes ADR-2026-04-16 hex axial)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-28
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-04-16-grid-type-hex-axial.md
  - docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/research/2026-04-28-grid-less-feasibility.md
  - docs/research/2026-04-28-deep-research-synthesis.md
---

# ADR-2026-04-28: Grid type final — SQUARE wins

- **Data**: 2026-04-28
- **Stato**: Accepted
- **Owner**: Master DD
- **Stakeholder**: gameplay-programmer + ui-programmer + qa-tester
- **Supersedes**: [ADR-2026-04-16: Grid Type — Hex con coordinate axial](./ADR-2026-04-16-grid-type-hex-axial.md) (status Proposto, mai implementato)

## 1. Contesto

ADR-2026-04-16 ha proposto hex grid coordinate axial (q, r) come grid type Evo-Tactics. Status mai avanzato oltre **Proposto**: zero implementazione (~30-40h refactor mai partito), zero `honeycomb-grid` npm dep aggiunto, repo ha sempre usato square grid (apps/play canvas + roundOrchestrator + encounter YAML 6×6).

Sessione 2026-04-28 ha shipped:

- Deep research SRPG/strategy synthesis (PR #1996)
- Tester feedback playtest informal: "grafica pre-2000" + "movement BG3-like richiesto"
- ADR-2026-04-28-bg3-lite-plus-movement-layer accepted (Sprint G.2b NEW ~10-12g) con Tier 2 backend cherry-pick:
  - **Sub-tile positioning float** (unit ferma a 1.7 tile dist, NOT center)
  - **Flanking continuous angle** (fianco crit math angolo float, NOT facing 3-zone discrete)
  - vcScoring `area_covered` float metric

Grid type decision deferred 3 volte in sessione (ADR-2026-04-16 Proposto, BG3-lite Plus §6 "resta Proposed", synthesis Action 5 "square stays per FFT-job-system fit"). User esplicito 2026-04-28: _"alla fine con tutte le scelte fatte e i deep research letti non abbiamo deciso se è meglio hex o square"_.

Decision finale risolta NOW.

## 2. Decisione

**SQUARE grid wins definitivo**.

ADR-2026-04-16 hex axial → marked **Superseded** da questo ADR. Hex mai shippato, hex non sarà shippato.

## 3. Motivazioni decision-altering 2026-04-28

### 3.1 — Vantaggi hex original ADR-2026-04-16 = REDUNDANT post BG3-lite Plus

ADR-2026-04-16 §"Motivazioni" cita 5 ragioni hex. Rivalutate:

| ADR-2026-04-16 motivation                                  | Status post BG3-lite Plus                                                                                                                                      | Verdict                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **1. Creature multi-tile** (size 1-3 AncientBeast pattern) | NON shippato. Skiv canon size=1 standard. Roadmap M12+ creatures multi-size = future deferred.                                                                 | NULL — non urgente, square handles size=1 nativo                  |
| **2. LOS/range d20 ambiguita diagonale**                   | BG3-lite Plus Tier 2 #5 **flanking continuous angle math float** elimina ambiguita esattamente. Player vede cerchio range arc (BG3-style), NON tile diagonale. | **CAPTURED da BG3-lite Plus**                                     |
| **3. Pathfinding equidistant 6 vicini**                    | Sub-tile float positioning Tier 2 #1 = unit ferma anywhere, NON solo tile center. Diagonal sqrt(2) cost handled in render + smooth movement curve.             | **CAPTURED da BG3-lite Plus**                                     |
| **4. TV readability hex grandi**                           | Grid HIDDEN post-BG3-lite Plus. Player NON vede esagoni o quadrati. Range cerchio + AOE shape sphere/cone visualizzano.                                        | **MOOT** — grid invisibile, hex/square choice invisible to player |
| **5. Libreria `honeycomb-grid` npm**                       | NON installata. Adding = +1 dep, +30-40h refactor pathfinding/render/encounter. Skip dep = saved bandwidth.                                                    | **NEGATIVE** se aggiunta ora                                      |

**Conclusione**: 5/5 motivazioni hex ADR-2026-04-16 = obsolete post-BG3-lite Plus o future-deferred. Hex pivot = solution looking for problem.

### 3.2 — Vantaggi square confermati research domain

Research deep research SRPG (F2 §"Raccomandazione progettuale" line 155):

> _"tra quadrata ed esagonale, la quadrata è migliore se l'obiettivo è job system, verticalità e level design alla FFT; l'esagonale è migliore se vuoi less geometrical ambiguity nei fronti e nei fianchi, e se il tuo focus è più vicino a Brigandine o Battle Brothers."_

Domain agent feasibility analysis Q2 (vedi `docs/research/2026-04-28-grid-less-feasibility.md`):

> _"Square grid is correct for current pillar set. P1 (Tattica leggibile) is modeled on FFT. P3 (Specie x Job) with 7 jobs + 35 abilities uses vertical/positional read."_

P1 FFT-inspired + P3 job system = research esplicito vote square.

### 3.3 — Sunk cost preserved

12 mesi work square grid:

- `apps/play/src/render.js` 1834 LOC — drawCell + canvasToCell + fitCanvas
- `apps/backend/services/ai/policy.js` — manhattanDistance + stepAway gridSize=6
- `apps/backend/services/vcScoring.js` 935 LOC — 6 raw metrics positional gridSize=6
- 14 encounter YAML — `grid.width: 6` `grid.height: 6` block
- 382 test green — assumption square coords
- `roundOrchestrator.js` 1003 LOC — round model + planning phase tile-based

Hex pivot = ~30-40h refactor + ~+1 npm dep + 60-80 test sweep + 14 YAML reformat. **NO benefit catturabile post-BG3-lite Plus**. Pure waste.

### 3.4 — BG3-lite Plus shipped soon = grid invisible al player

Sprint G.2b NEW ship ~10-12g post Sprint G v3 asset swap. Post-ship:

- Player vede smooth movement + range cerchio + AOE shape
- Player NON vede tile borders (grid hidden)
- Player NON percepisce "esagoni vs quadrati"
- Backend math square (manhattanDistance) opera invisibile

Hex/square diventa **backend implementation detail invisibile UX**. Square implementato + free + fast = wins.

## 4. Conseguenze

### Positive

- ADR-2026-04-16 chiuso (status Proposto da 12 giorni → Superseded 2026-04-28)
- Zero refactor effort (~30-40h saved)
- Zero npm dep aggiunto (`honeycomb-grid` skip permanent)
- 382 test green preservati
- 12 mesi sunk cost square preservato
- 14 encounter YAML format preservato
- BG3-lite Plus Tier 2 cherry-pick (sub-tile + flanking angle continuous) cattura vantaggi hex senza pivot
- Future-proof: SE M12+ creatures multi-size shippa, square handles via cluster di tile (es. size=2 = 2x2 cluster) come Disgaea pattern

### Negative

- ADR-2026-04-16 motivation #1 (creature multi-tile naturali su hex) deferred — risolto via cluster di tile su square se shippato future
- Non beneficiamo da `honeycomb-grid` libreria matura (~700 GitHub star) — accettabile, nostra implementazione square sufficient

### Neutral

- ADR-2026-04-16 doc resta in repo come historical reference (status Superseded, NOT deleted)
- Reference repo research raccomandato `Battle for Wesnoth` (hex + AI + campagna) e `HexTactics` (BFS/Dijkstra hex) restano utili come reference pattern AI/pathfinding general — applicabili anche a square con minor adaptation

## 5. Decisioni vs ADR-2026-04-28-bg3-lite-plus-movement-layer

| ADR-2026-04-28-bg3-lite-plus §6 anti-pattern                                                                                                | Status post questo ADR                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"NO drop ADR-2026-04-16 hex grid Proposed (resta Proposed, future-deferred — BG3-lite hidden grid risolve visual SENZA implementare hex)"_ | **SUPERSEDED**: ADR-2026-04-16 ora Superseded, NON Proposed. Hex pivot definitively closed. BG3-lite Plus reasoning preservato (hidden grid risolve visual SENZA hex). |

ADR-2026-04-28-bg3-lite-plus §6 → update segue questo ADR (mark complementary).

## 6. Plan v2 → v3 effort delta

**Zero effort delta** da questo ADR. Solo doc status update:

- ADR-2026-04-16 status field: `Proposto` → `Superseded by ADR-2026-04-28-grid-type-square-final`
- ADR-2026-04-28-bg3-lite-plus §6 update mention "ADR-2026-04-16 Superseded" (was "resta Proposed")

Total effort: ~30min doc updates.

## 7. Rollback path

| Trigger                                                              | Rollback action                                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Future M12+ creature multi-size shippa e square cluster pattern fail | Riapri grid type discussion via NEW ADR. NON revert questo. Eventualmente hex via Godot port Sprint M.4 (Godot TileMap supporta hex nativo).                    |
| Tester post-Sprint G.2b feel "grid still feels boxy"                 | NOT a grid type issue (grid hidden). Investiga BG3-lite Plus implementation quality — sub-tile positioning + smooth interpolation potrebbero richiedere tuning. |

## 8. References

- ADR-2026-04-16 hex axial Proposed: [`docs/adr/ADR-2026-04-16-grid-type-hex-axial.md`](./ADR-2026-04-16-grid-type-hex-axial.md)
- ADR-2026-04-28 BG3-lite Plus: [`docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md`](./ADR-2026-04-28-bg3-lite-plus-movement-layer.md)
- ADR-2026-04-28 deep research actions: [`docs/adr/ADR-2026-04-28-deep-research-actions.md`](./ADR-2026-04-28-deep-research-actions.md)
- Grid-less feasibility analysis: [`docs/research/2026-04-28-grid-less-feasibility.md`](../research/2026-04-28-grid-less-feasibility.md)
- Deep research synthesis: [`docs/research/2026-04-28-deep-research-synthesis.md`](../research/2026-04-28-deep-research-synthesis.md)
- Master plan v2: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md)
- Research domain quote: F2 §"Raccomandazione progettuale" line 155
- Research domain agent: Q2 grid type fit (square correct for FFT-inspired P1 + job system P3)

## 9. Lato gamer

**Player IMPACT: ZERO**.

Pre-questo-ADR o post-questo-ADR, player vede:

- Stesso movement smooth (BG3-lite Plus)
- Stesso range cerchio (BG3-lite Plus)
- Stesso AOE shape (BG3-lite Plus)
- Stesso tactical combat d20 + AP

Hex vs square = **backend math invisibile**. Decision puramente architecture future-proof.

**Why decided now**: chiudere ADR-2026-04-16 limbo Proposto da 12 giorni. ADR aperti = debt cognitivo + risk future "dovremmo migrare hex?" rabbit hole. Closure clean.
