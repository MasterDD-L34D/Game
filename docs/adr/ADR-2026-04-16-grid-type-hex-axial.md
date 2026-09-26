---
title: 'ADR-2026-04-16: Grid Type — Hex con coordinate axial'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# ADR-2026-04-16: Grid Type — Hex con coordinate axial

> ⚠️ **SUPERSEDED 2026-04-28** by [ADR-2026-04-28-grid-type-square-final.md](./ADR-2026-04-28-grid-type-square-final.md). Hex axial mai shippato (12 giorni Proposto). BG3-lite Plus shipped (ADR-2026-04-28-bg3-lite-plus-movement-layer) con sub-tile positioning float + flanking continuous angle = catturano vantaggi hex senza refactor 30-40h. Square wins definitivo. Doc preservato come historical reference.

- **Data**: 2026-04-16
- **Stato**: **Superseded by ADR-2026-04-28-grid-type-square-final**
- **Owner**: Team Backend & Tools
- **Stakeholder**: Frontend Squad (rendering), Rules Engine (resolver.py), AI SIS (pathfinding), QA (test grid)

## Contesto

Evo-Tactics ha dati di terreno (`terrain_defense.yaml`) integrati nel calcolo CD del resolver, ma **nessuna implementazione grid**. Non esiste pathfinding, FOV/LOS, o map engine. Le creature hanno dimensioni diverse (`species.yaml`), il combat usa range attacks (d20), e il gioco e TV-first (4 giocatori, schermo condiviso).

La scelta del tipo di griglia impatta: pathfinding, LOS, creature multi-tile, leggibilita UI, complessita implementativa.

## Opzioni valutate

### A. Square grid

- Pro: implementazione banale, familiare (FFT, Fire Emblem), nessuna libreria necessaria
- Contro: ambiguita diagonale (8 vicini, costo sqrt(2)), LOS con edge case angoli, creature multi-tile meno naturali
- Reference: FFT, Fire Emblem, godot-tactical-rpg

### B. Hex grid con coordinate offset

- Pro: 6 vicini equidistanti, LOS naturale
- Contro: coordinate offset non supportano operazioni vettoriali, algoritmi complessi, storage rettangolare forzato
- Reference: nessun repo analizzato usa offset

### C. Hex grid con coordinate axial (q, r) ← SCELTA

- Pro: 6 vicini equidistanti, distanza = `max(|q|,|r|,|s|)/2`, operazioni vettoriali native, LOS senza ambiguita, creature multi-hex naturali (AncientBeast pattern size 1-3), libreria npm matura
- Contro: meno intuitivo per sviluppatori, richiede libreria per coordinate, leggibilita TV richiede hex grandi
- Reference: AncientBeast (hex 16x9), Red Blob Games (reference canonico), honeycomb-grid (npm)

## Decisione

**Hex grid con coordinate axial (q, r).** Storage axial, calcolo cube quando necessario (`s = -q - r`).

## Motivazioni

1. **Creature multi-tile**: `species.yaml` prevede creature di dimensioni diverse. AncientBeast dimostra che hex gestisce size 1-3 con `getMovementRange(x, y, distance, size, id)`.
2. **LOS/range d20**: attacchi a distanza richiedono distanza univoca. Hex: 6 direzioni equidistanti, nessuna ambiguita diagonale. Critico per `CD = 10 + tier + defense_mod + terrain_mod`.
3. **Pathfinding**: Dijkstra flood-fill su hex = ~80 LOC custom. Red Blob Games documenta algoritmo completo. BFS per range = ~30 LOC.
4. **TV readability**: hex grandi (diametro ~80px+) con alto contrasto compensano la minore familiarita. Gia previsto da design (D-pad, font grande).
5. **Libreria**: `honeycomb-grid` (npm, MIT, TS, Node >=16, 695 stars) fornisce grid, coordinate, traversal. No pathfinding built-in ma esempio A\* incluso.

## Conseguenze

### Positive

- API pathfinding chiara: `getReachableTiles()`, `findPath()`, `getTilesInRange()`, `getLineOfSight()`
- FOV naturale senza hack diagonali
- Terreno da estendere in `terrain_defense.yaml`: `movement_cost`, `elevation`, `cover`, `blocks_los`

### Negative

- Dipendenza `honeycomb-grid` (nuova dipendenza npm — richiede approvazione)
- Rendering hex piu complesso di square (ma non in scope backend)
- Conversione coordinate axial ↔ pixel richiede math specifico

### Rischi

- `honeycomb-grid` ultimo release Nov 2023 — monitorare manutenzione. Fallback: implementazione custom axial (~200 LOC)
- Leggibilita TV da validare con playtest su schermo reale

## Implementazione proposta

1. Aggiungere `honeycomb-grid` come dipendenza (approvazione richiesta)
2. Modulo `services/grid/hexGrid.js`: wrapper API (4 funzioni)
3. Estendere `terrain_defense.yaml` con campi mancanti
4. Integrare pathfinding nel round orchestrator per validazione intenti movimento
5. Test: almeno 20 casi (distanza, path, LOS, reachable, multi-hex)
