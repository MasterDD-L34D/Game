---
title: 'Move terrain-cost substrate -- implementation plan (volo grades + radici anchor)'
date: 2026-06-23
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, volo, radici, trait-mechanics, substrate, plan, n40]
---

# Move terrain-cost substrate -- implementation plan

> **Verdetto master-dd 2026-06-23** (build-3 della sessione tee-up) = **BUILD terrain-cost
> substrate**: wire il `terrain_cost_multiplier` dormiente nel move-calc, cosi' volo I
> (gradi di volo) e `radici_ancora_planare` hanno una meccanica su cui mordere.
> Registro: `docs/planning/2026-06-23-residual-gate-register.md` (bucket 2).
>
> Questo e' un **piano** per una sessione dedicata, NON codice. La build cambia una
> meccanica core (band-affecting -> N=40) e tocca un file condiviso con la sessione
> trait-mechanics viva -> richiede coordinamento. Non va crammata in un'altra sessione.

## 1. Ground-truth (verificato 2026-06-23)

- **Il config esiste, dormiente.** `packs/evo_tactics_pack/data/balance/movement_profiles.yaml`
  (pattern W6 / Wesnoth `movement_type`): 3 profili `heavy`/`medium`/`light`, ciascuno con
  `terrain_cost_multiplier` per tipo-terreno (`roccia`/`sabbia`/`acqua_profonda`/`vegetazione_densa`/
  `ghiaccio`/`lava`/`default`). Commento: "il resolver moltiplica `ap_cost` base per il
  terrain multiplier; le specie riferiscono un profilo". **`light` = "unita agili o volanti,
  nessuna penalita"** (tutti i moltiplicatori `default 1.0`).
- **ZERO consumer backend.** `grep terrain_cost_multiplier|movement_profiles apps/backend data/core`
  = 0 hit. Il file e' non-letto da nessuna parte nel runtime.
- **Move = Manhattan puro.** `apps/backend/services/abilityExecutor.js` usa `manhattanDistance(actor.position, dest)`
  per il range-check del movimento (linee ~214/386) + range abilita'. Nessun termine terrain-cost:
  muoversi di N tile costa uguale su qualsiasi terreno; il gate e' `manhattanDistance <= mobility`.
- **Il terreno ESISTE sulla griglia.** Gli encounter portano `grid.terrain_features: [{x,y,type,defense_mod}]`
  (es. pilot `enc_foresta_temperata_radici`: `vegetazione_densa`/`roccia`/`radura`). Quindi il
  tipo-terreno per-tile e' gia' dato; manca solo il consumo nel costo-movimento.
- **`abilityExecutor.js` e' un file CORE condiviso.** La sessione trait-mechanics (slici, ora 9.5/12
  su origin/main #2996) edita `apps/backend/services/combat/*` + abilityExecutor. **Collision-risk reale.**
- **volo I + radici sono gli ULTIMI trait non costruiti** del kit 12 (gli altri 11 mergiati slici 1-7).
  Il substrate e' il loro prereq -> questa build SBLOCCA la chiusura del kit trait.

## 2. Modello proposto (da ratificare in brainstorming + master-dd)

Trasformare il gate movimento da **distanza** a **costo**:

- **Move-cost resolver** (nuovo, puro): dato un path (o la dest + il profilo), somma
  `base_step_cost * terrain_cost_multiplier[tile.type]` per ogni tile attraversata, secondo
  il `movement_profile` dell'unita'. Gate = `costo_totale <= budget` (mobility/AP), non
  `manhattanDistance <= mobility`.
- **Profilo per-specie**: l'unita' riferisce un profilo (`heavy`/`medium`/`light`) -- da dove?
  (open question A). Default = `medium` finche' non assegnato.
- **volo I/II/III (gradi di volo)** -> mappano su profili progressivamente piu' "light":
  volo riduce/azzera il terrain multiplier (volo III = `light`, ignora il terreno). Il grado
  e' il trait `adattamento_volo` (3 gradi). Questo da' a volo qualcosa su cui mordere
  (oggi il move e' Manhattan -> volo inerte).
- **`radici_ancora_planare`** -> producer "0-move this round": l'unita' ancorata NON puo'
  muoversi (move-budget = 0) ma guadagna il suo effetto (flat-DR / anchor). Serve un segnale
  per-round "anchored" (open question C: dove vive lo stato).
- **Pathing**: Manhattan assume movimento ortogonale libero. Con costi per-tile serve decidere
  se il costo e' sul path minimo (richiede un mini-pathfinder, es. Dijkstra su griglia piccola
  6x6) o un'approssimazione (costo = Manhattan * profilo-medio sulle tile di dest). (open question B).

## 3. Open design questions (brainstorming + master-dd PRIMA del codice)

- **A. Da dove viene il profilo dell'unita'?** species master-record? morphotype? un nuovo campo?
  (i 5 orfani-roster non hanno record -> serve un default robusto).
- **B. Costo sul path minimo (Dijkstra) o approssimazione?** Il path minimo e' corretto ma
  aggiunge un pathfinder; l'approssimazione e' piu' semplice ma puo' sbagliare su terreno misto.
- **C. Dove vive lo stato "anchored" (radici)?** `unit.status` per-round? interagisce con AP-refill?
- **D. Volo ignora SOLO il terrain-cost o anche gli hazard/blocchi?** (es. `acqua_profonda`/`lava`).
- **E. Banda**: di quanto cambia la reachability media? -> impatta win-rate -> **N=40 obbligatorio**.

## 4. Implementazione a fasi (TDD, flag-gated OFF)

> Flag `MOVE_TERRAIN_COST_ENABLED` OFF di default -> band-neutral (move resta Manhattan finche'
> non si flippa). Ogni fase = 1 PR piccola, test-first.

1. **Fase 0 -- loader + resolver puro** (no wire): `movementProfiles.js` (load `movement_profiles.yaml`,
   fallback) + `moveCost.js` (puro: `(path|dest, profile, terrainAt) -> cost`). TDD completo.
   Zero impatto runtime (non chiamato). Decide B (path vs approx) qui.
2. **Fase 1 -- wire flag-gated nel move-gate** (`abilityExecutor.js`): quando il flag e' ON, il
   range-check movimento usa `moveCost <= budget` invece di `manhattanDistance <= mobility`.
   **Coordinare con la sessione trait** (stesso file). Default OFF = Manhattan = band-neutral.
3. **Fase 2 -- volo grades**: `adattamento_volo` (3 gradi) abbassa il terrain multiplier
   (volo III -> light). TDD su un'unita' con/senza volo su terreno costoso.
4. **Fase 3 -- radici anchor**: producer 0-move + lo stato anchored; il move-gate rifiuta il
   movimento di un'unita' ancorata. TDD.
5. **Fase 4 -- N=40 (band)**: con il flag ON su uno scenario con terreno reale, misura win-rate
   vs OFF (paired seed, harness in-process, NO prod). Ratifica banda (master-dd, SDMG).
6. **Fase 5 -- flip** (mani master-dd): `MOVE_TERRAIN_COST_ENABLED=true` quando la banda regge +
   volo/radici sono player-visible (Gate-5, eventuale surface Godot per il telegraph del costo).

## 5. Rischi + coordinamento

- **Collision con la sessione trait viva** (`abilityExecutor.js`): la Fase 1 tocca il file core.
  Sequenziare DOPO che la sessione trait chiude il kit (9.5/12 -> 12/12), o coordinare la regione
  esatta (il move-gate e' una sezione distinta dai trait-handler). Worktree isolato + rebase frequente.
- **Band-affecting**: cambia reachability -> NON band-neutral quando ON -> N=40 e' un gate, non opzionale.
- **Core-mechanic blast radius**: il move-gate e' usato da player-move + AI-move + minion-command +
  ability-range. Il resolver va isolato in modo che SOLO il path "movimento" cambi, non i range-check
  delle abilita' (quelli restano Manhattan, sono "linea di tiro" non "costo di cammino"). Distinzione
  load-bearing (open question, verificare in Fase 1).
- **Pathfinder**: se si sceglie Dijkstra (B), e' nuovo codice su hot-path combat -> perf + test.

## 6. Gate / Definition of Done

- Ogni fase: `node --test tests/services/combat/*.test.js` verde + prettier + governance.
- Tocca `apps/backend/services/combat/` -> aggiornare `docs/hubs/combat.md`.
- Fase 4 N=40 in-banda ratificata master-dd PRIMA del flip (Fase 5).
- Flag OFF di default per tutta la durata = band-neutral; il flip e' owner-gated.

## 7. Entry point

Sessione dedicata: leggi questo piano + il register (bucket 2/4) + `movement_profiles.yaml` +
`abilityExecutor.js` (move path). Brainstorming sulle open question A-E, poi Fase 0 (resolver puro
TDD, zero rischio). Coordina con la sessione trait-mechanics sul timing di Fase 1.
