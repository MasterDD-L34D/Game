---
title: 'fase-2c grid-wiring: honor authored grid_size (board_scale) -- design spec'
date: 2026-07-03
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-03'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [combat, encounter, grid, board-size, party, big-maps, descent, adr, spec]
---

# fase-2c grid-wiring: honor authored grid_size (board_scale) -- design spec

> **Origine**: big-maps arc (parent "mappe grandi", D1 ratificato = "per-cella, parti-grande subito").
> Il keystone Game-backend che sblocca D1: oggi il `grid_size` autorato negli encounter e' INERTE --
> la board giocata la decide `gridSizeFor(deployed)` dal party. Questo spec progetta il wiring che fa
> valere il grid_size autorato, opt-in e band-neutral. **ADR-gated** (tocca la derivazione party-grid
> governata da ADR-04-16/04-17): ADR nuovo via `sot-planner` (verdetto owner 2026-07-03, opzione 1).
> **Scope**: DESIGN only in questo spec. Il BUILD (ADR + implementazione + N=40 re-ratify) = sessione
> fresca (verdetto owner: "write spec now, build in fresh session"). Nessun codice qui.

## 1. Ground-truth verificato (origin/main 2026-07-03, post #3197)

1. **`grid_size` autorato = INERTE a runtime**. `apps/backend/routes/session.js:2396-2408`: `gridW/gridH`
   partono da `GRID_SIZE` (costante) e vengono sovrascritti da `gridSizeFor(deployedCount)`
   (`services/party/loader.js:55` + `data/core/party.yaml grid_scaling`: 6x6/8x8/10x10 per fascia
   deployed). Il `req.body.modulation` puo' cambiare `deployedCount` ma passa comunque per `gridSizeFor`.
   **`encounter.grid_size` NON e' letto da nessuna parte nel path board-size.**
2. **Il sim idem + clampa**. `tools/sim/scenario-enemies.js:41` dimensiona da `gridSizeFor` e clampa gli
   spawn autorati a `GRID_SAFE_MAX=5` (commento: "authored per-encounter grid e' fase-2c").
3. **Il mito hardcore-06**. `docs/core/15-LEVEL_DESIGN.md` cita "override esplicito 10x10 via
   `grid_size: 10`" -- **FALSO/fuorviante**: quel 10x10 lo produce l'8-player modulation (gridSizeFor),
   NON il campo YAML. Il doc va corretto (unita' 4).
4. **Rationale del fill-ratio**. `party.yaml grid_scaling` mantiene fill < 25% "per leggibilita'
   tattica" a roster fisso -- un vincolo di LEGGIBILITA', non un cap di difficolta' (parent research
   sez. 4): una board grande a fill basso resta leggibile se la densita' viene da terrain/objective.
5. **Governance**. ADR-04-16 (hex axial) + ADR-04-17 (coop-scaling) governano la derivazione. Onorare
   il grid autorato = decisione ADR-level -> `sot-planner`.

## 2. Decisioni (owner 2026-07-03)

- **ADR = nuovo, via sot-planner** (opzione 1): documenta "il grid autorato per-encounter e' il path
  sancito per encounter `board_scale: authored` (non-legibility-constrained); `gridSizeFor` resta il
  default per `auto`". NON riscrive ADR-04-16/04-17.
- **Setup**: spec ora (questa sessione), BUILD in sessione fresca.
- (parent) **D1** per-cella parti-grande; **D10** visual-first -> il wiring e' groundwork backend
  band-neutral/opt-in (non ingrandisce nulla di default, non tocca il render).

## 3. Design

**Meccanismo (band-neutral di default):** nuovo campo encounter `board_scale: auto | authored` (default
`auto`). `auto` = comportamento attuale `gridSizeFor` fill-ratio, **byte-identical** (band-neutral).
`authored` = la board usa `encounter.grid_size`.

**Unita' isolate:**

1. **Schema** (`schemas/evo/encounter.schema.json`, additivo, backward-compat): aggiunge
   `board_scale` enum `[auto, authored]` default `auto`. Tutti gli encounter esistenti (senza il campo)
   = `auto` = invariati. **Guardrail: schemas/evo -> segnalare in PR (master-dd review).**
2. **Resolver board** (`services/party/loader.js`): nuovo helper puro `resolveBoardSize(deployedCount,
encounter, modulation)` -> `[w, h]`. Se `encounter?.board_scale === 'authored'` e `encounter.grid_size`
   valido -> ritorna `encounter.grid_size`; altrimenti delega a `gridSizeFor` (comportamento attuale).
   `gridSizeFor` resta invariato (unita' testabile a se'). Confine netto: un solo punto decide la board.
3. **Runtime wire** (`apps/backend/routes/session.js:2396-2408`): sostituisce la chiamata diretta
   `gridSizeFor(deployedCount)` con `resolveBoardSize(deployedCount, session.encounter, requestedModulation)`.
   Con encounter senza `board_scale` (o `auto`) -> identico a oggi.
4. **Sim parity** (`tools/sim/scenario-enemies.js`): usa lo stesso `resolveBoardSize` e, per encounter
   `authored`, alza il clamp `GRID_SAFE_MAX` al bound del grid autorato (spawn on-grid sul board reale).
   `auto` -> clamp attuale invariato.
5. **Doc correction** (`docs/core/15-LEVEL_DESIGN.md`): correggi il mito hardcore-06 (il 10x10 = party
   modulation, non `grid_size:`); documenta `board_scale: authored` come il path per board autorate.

**Fill-ratio:** board `authored` grande a fill basso = ACCETTATA (parent research sez. 4: leggibilita'
da terrain/objective density). Nessun cambio cap -- `grid_size` schema max resta 20.

**Band-neutrality:** default `auto` su tutti i 21 encounter attuali -> `resolveBoardSize == gridSizeFor`
-> board identica -> zero cambio di difficolta'/sim. Solo un encounter che opta `board_scale: authored`
cambia board (e quello DEVE ri-passare N=10 probe -> N=40 ratify, author-guard grid-ratify di #3197).

## 4. Interazione col gate geometria (#3197)

Il gate xpBudget geometry (#3197, flag OFF) e l'author-guard grid-ratify sono i PREREQUISITI di questo
wiring: appena una board diventa `authored` + resized, l'author-guard segnala il re-ratify e il gate
(quando flippato post-N=40) misura hazard/activation sul board reale. fase-2c ABILITA il resize che il
#3197 rende gate-safe. Sequenza corretta: #3197 (merged) -> fase-2c wiring -> autora un encounter
`authored` -> N=40 ratify -> flip gate. Coerente con D9 (warn poi promuovi).

## 5. Decomposizione + sequencing

- **Questo spec** = design del wiring Game-backend (unita' 1-5).
- **BUILD (sessione fresca)**: (a) ADR via `sot-planner`; (b) writing-plans TDD (resolver +
  wire + sim + schema + doc); (c) N=40 re-ratify se/quando un encounter `authored` viene autorato
  (non in questa PR -- il wiring e' band-neutral finche' nessun encounter opta authored).
- **D10 visual-first**: il wiring e' backend/opt-in/band-neutral -> non viola il visual-first (non
  ingrandisce nulla di default, non tocca Godot/render). Abilita la capacita'; il CONTENT big-board
  - il play visivo restano downstream (arco parent, GGv2).

## 6. Definition of Done (PR del build)

- `resolveBoardSize` unit-tested: `auto`/assente -> == `gridSizeFor` (regression); `authored` ->
  `encounter.grid_size`.
- `node --test tests/ai/*.test.js` + suite party/session verdi (baseline preservata; default auto
  byte-identical).
- Sim: un encounter `authored` grande risolve on-grid (no spawn clampati fuori board).
- `python tools/check_docs_governance.py --strict` verde (doc correction).
- Nessun encounter esistente cambia board (tutti `auto`); band-neutral.
- Commit ADR-0011 (`Coding-Agent` + `Trace-Id`), no `Co-Authored-By`. Guardrail `schemas/evo`
  segnalato -> master-dd review. Nessuna nuova dep.

## 7. Open items per il build

- [OWNER/sot-planner] il testo dell'ADR nuovo (nome + scope).
- [BUILD] valore/naming: `board_scale` vs alt; conferma default `auto`.
- [BUILD] verifica che `session.encounter` sia disponibile nel punto `session.js:2396` (l'encounter
  e' caricato prima della board-resolution? ground-truth nel build prima di wirare).

## 8. Entry point

Sessione fresca -> ADR (sot-planner) -> writing-plans -> build TDD. Worktree fresco off main, deps
installati (junction node_modules per husky).
