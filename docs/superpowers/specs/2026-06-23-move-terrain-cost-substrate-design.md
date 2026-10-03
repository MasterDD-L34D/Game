---
title: 'Move terrain-cost substrate -- design spec (volo grades + radici anchor)'
date: 2026-06-23
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, volo, radici, trait-mechanics, substrate, spec, n40]
---

# Move terrain-cost substrate -- design spec

> **Origine**: verdetto master-dd 2026-06-23 (register `docs/planning/2026-06-23-residual-gate-register.md`
> bucket 2 = BUILD terrain-cost substrate). Piano skeleton: `docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-plan.md`.
> Questo spec risolve le 5 open question (sez.3 del piano) via brainstorming + 4 verdetti
> master-dd (AskUserQuestion 2026-06-23). Feed -> writing-plans (piano implementativo dettagliato).

## 1. Ground-truth verificato (origin/main 2026-06-23, HEAD 9d22a904)

- `packs/evo_tactics_pack/data/balance/movement_profiles.yaml` = dormiente, **0 consumer backend**.
  3 profili W6 (heavy/medium/light) con `terrain_cost_multiplier` per tipo-terreno; `light` = nessuna
  penalita' (tutti default 1.0); `default_profile: medium`.
- `grid.terrain_features` su encounter = `[{x, y, type, defense_mod}]` -- anch'esso **0 consumer
  backend** (dato puro). Pilot `enc_foresta_temperata_radici`: 4 tile tipate su 6x6
  (vegetazione_densa / roccia / radura), resto implicito default.
- **Reframe load-bearing vs piano**: il movimento NON ha pathfinding. Move = **teleport a dest**;
  il budget e' **AP** (`ap_remaining`), non una stat "mobility".
  - Player move (`apps/backend/routes/session.js:2806`): `dist = manhattanDistance(pos, dest)`;
    `apCost = max(1, dist - move_bonus)`; rifiuta se `apCost > ap_remaining`; poi `actor.position = dest`.
  - AI move (`session.js:3286`): stesso teleport, `ap_remaining -= dist`, senza `move_bonus`.
  - Minion command (`abilityExecutor.js:610`): `manhattan(minion.pos, dest) > minion.mobility` -> rifiuta.
- Extension-point pulito: `evaluateMovementTraits` (`traitEffects.js:866`) somma gia' `move_bonus`
  per trait con `trigger.action_type === 'movement'` + `effect.kind === 'buff_stat'`. Il terrain-cost
  e' un fratello di questo.
- Pattern flag-gated transient gia' in repo: `_tiles_voluntary_round` (OD-024 stamina) -- set solo
  quando il flag e' ON, mai serializzato in `publicSessionView` quando OFF. Template per i nostri campi.
- I 2 trait esistono solo come proposta-kit (`docs/planning/2026-06-22-missing-kit-traits-proposal.md`),
  NON ancora in `active_effects.yaml` / `trait_mechanics.yaml`:
  - `adattamento_volo` (fisiologico T1): stub originale `buff_stat move_bonus +1` -> da arricchire a
    terrain-cost relief graduato. Usato da archon, balor, banshee, couatl.
  - `radici_ancora_planare` (difensivo T2): "molto tanky **da fermo**", stub originale `damage_reduction 2`
    -> da arricchire ad anchor (DR condizionata allo stato fermo). Usato da treant.
- Sono gli **ultimi 2 del kit 12-trait** (gli altri 11 mergiati slici 1-7; engine 9.5/12 su origin/main #2996).
  Questo substrate sblocca la chiusura del kit.

## 2. Decisioni (4 verdetti master-dd 2026-06-23 + sub-decisioni confermate)

### A. Risoluzione del movement_profile dell'unita'

**Verdetto**: campo esplicito sul species master-record **+ derivazione concorrente da morphotype E form**
(fallback), poi default medium.

`resolveMovementProfile(unit, speciesRecord)` -- precedenza:

1. `speciesRecord.movement_profile` esplicito (`heavy`|`medium`|`light`) se presente;
2. else `deriveProfile(morphotype, form)` -- morphotype primario (riusa il pattern `speedForMorphotype`
   / `attackRangeFor`: morphotype aereo/volante -> light; corazzato/massiccio -> heavy; else medium),
   `form` come modificatore secondario quando presente sull'unita';
3. else `default_profile` dal yaml (medium).

Orfani-roster senza morphotype -> medium (robusto). Il profilo risolto e' poi **modificato dal trait volo**
(sez. C/volo), indipendentemente dalla sorgente.

### B. Calcolo del costo-terreno

**Verdetto**: cheapest-path BFS/Dijkstra su griglia (solo terreno).

`moveCost(from, dest, profile, terrainGrid) -> cost` = path piu' economico `from -> dest` sotto i
`terrain_cost_multiplier[tile.type]` del profilo, sommando il costo per step. Griglia piccola
(tipicamente 6x6, max attesa ~8x8) -> Dijkstra/BFS banale. **Solo terreno**: ignora unita' intermedie
(coerente con l'attuale teleport che controlla solo dest-occupata). Terreno tutto-default
(mult 1.0) -> `cost == manhattanDistance` -> flag-ON **band-neutral** finche' non c'e' terreno tipato.

### C. Stato "anchored" (radici)

**Verdetto**: `unit.status` `ancorato` producer/consumer (allinea ai pattern slici 1-7 + PERSISTENT_STATUS_KEYS).

### D. Semantica del volo

**Verdetto**: graduato -- volo I = solo costo; volo III = costo + hazard-bypass.

### Sub-decisioni (proposte e confermate nel design)

- **Move-gate ON**: `apCost = max(1, ceil(moveCost) - move_bonus)`. OFF: Manhattan invariato.
- **Range delle abilita' restano Manhattan** (linea di tiro != costo di cammino). Solo il path "movimento"
  cambia. Distinzione load-bearing -- da ri-verificare puntualmente in fase 1.
- **radici** = passivo "tanky da fermo": a inizio attivazione, unita' con il trait -> status `ancorato`
  (DR 2). Un intent `move` **rompe l'ancora** (clear `ancorato`, perde la DR quel round) poi muove
  normale. Non muovere -> tiene DR 2. Tradeoff via il move-gate, zero nuove action/UI.
  (Scartato: anchored = move hard-block; break-anchor e' piu' giocabile.)
- **hazard** (per volo III): `HAZARD_TERRAIN = {lava, acqua_profonda}` = costo alto per i non-volanti
  (NON hard-block, per non rendere dest irraggiungibili a sorpresa); volo III le attraversa free.

### E. Banda

**N=40 e' un gate obbligatorio** (non una scelta): il substrate cambia la reachability media -> impatta
win-rate. Fase 4 misura ON vs OFF (paired seed, harness in-process, NO prod); master-dd ratifica la banda
(SDMG) PRIMA del flip (fase 5).

## 3. Architettura (unita' isolate)

- **`movementProfiles.js`** (nuovo, puro): carica `movement_profiles.yaml`, espone
  `getProfile(name) -> {terrain_cost_multiplier, default}` + `DEFAULT_PROFILE`. Fallback se file assente.
- **`moveCost.js`** (nuovo, puro): `moveCost(from, dest, profile, terrainGrid)` Dijkstra + helper
  `terrainTypeAt(terrainGrid, x, y) -> type|null`. Zero dipendenze runtime, 100% testabile.
- **`resolveMovementProfile(unit, speciesRecord)`** (nuovo, puro): precedenza A. Include `deriveProfile`
  - l'applicazione del modificatore volo (abbassa il profilo verso light per grado).
- **Move-gate wire** (`session.js` player + AI, `abilityExecutor.js` minion): dietro
  `MOVE_TERRAIN_COST_ENABLED`. ON -> usa `moveCost`; OFF -> Manhattan. Modulo flag in
  `services/combat/` (mirror `staminaFatigue.isFatigueEnabled()`).
- **Trait data** (`active_effects.yaml` + `trait_mechanics.yaml`): autora `adattamento_volo`
  (con `grade`) + `radici_ancora_planare` (anchor/DR). Passa il flusso 5-gate (`add_trait_stub`).
- **Anchor producer/consumer**: status `ancorato` (DR 2) -- producer all'attivazione di un'unita' con
  `radici_ancora_planare`; consumer = il move-gate (rompe l'ancora su `move`).

## 4. Fasi (TDD, ognuna 1 PR piccola, flag OFF default)

0. **Resolver puro** (0 runtime): `movementProfiles.js` + `moveCost.js` + `resolveMovementProfile`.
   TDD completo. Non chiamato da nessun path runtime -> zero impatto, zero rischio banda.
1. **Wire move-gate flag-gated** (`session.js` player+AI, minion): ON -> `moveCost <= ap`; OFF ->
   Manhattan. Verifica che i range-abilita' restino Manhattan. Coordina con la sessione trait (stesso file).
2. **volo grades**: autora `adattamento_volo` (grade 1/2/3) + il modificatore profilo nel resolver.
   TDD: unita' con/senza volo su terreno costoso; g3 + hazard.
3. **radici anchor**: autora `radici_ancora_planare` + producer status `ancorato` + consumer move-gate
   (break-anchor). TDD: DR da fermo, perdita DR su move, PERSISTENT_STATUS_KEYS se durabile.
4. **N=40 banda**: flag ON su scenario con terreno reale (pilot foresta) vs OFF, paired seed, in-process.
   Ratifica banda (master-dd, SDMG).
5. **flip** (mani master-dd): `MOVE_TERRAIN_COST_ENABLED=true` post-banda + volo/radici player-visible
   (Gate-5: eventuale surface Godot per il telegraph del costo-terreno).

## 5. Rischi + coordinamento

- **Collision con la sessione trait viva** (`session.js` + `abilityExecutor.js` core): la fase 1 tocca il
  move-gate. Sequenziare DOPO la chiusura del kit (9.5/12 -> 12/12) o coordinare la regione esatta
  (il move-gate e' distinto dai trait-handler). Worktree isolato off origin/main + rebase frequente.
- **Band-affecting**: cambia reachability quando ON -> N=40 e' gate non opzionale.
- **Blast radius core-mechanic**: il move-gate serve player-move + AI-move + minion-command. Isolare il
  resolver cosi' che SOLO il path movimento cambi; i range-check abilita' restano Manhattan.
- **Pathfinder su hot-path**: Dijkstra e' nuovo codice nel combat-loop. Griglia piccola -> perf trascurabile,
  ma test su edge (terreno misto, dest irraggiungibile, hazard).
- **Authoring trait** passa i 5-gate (schema / template_validator-strict / style-i18n-refs / coverage /
  QA-baseline). `add_trait_stub` e i generatori derivano `trait_abilities`; MAI hand-editare i derivati.

## 6. Definition of Done

- Ogni fase: `node --test tests/services/combat/*.test.js` verde + prettier + governance.
- Tocca `apps/backend/services/combat/` o il move-gate -> aggiornare `docs/hubs/combat.md`.
- Fase 4 N=40 in-banda ratificata master-dd PRIMA del flip (fase 5).
- Flag OFF default per tutta la durata = band-neutral; il flip e' owner-gated.
- Commit ADR-0011 (`Coding-Agent:` + `Trace-Id:`), no self-merge che salta il review-gate,
  review compensativa (cavecrew-reviewer; Codex puo' essere rate-limited).

## 7. Entry point implementazione

writing-plans -> piano dettagliato per fase. Iniziare dalla fase 0 (resolver puro TDD, zero rischio).
Coordinare con la sessione trait-mechanics sul timing della fase 1.
