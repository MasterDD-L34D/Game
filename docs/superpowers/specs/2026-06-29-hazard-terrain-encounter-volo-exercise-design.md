---
title: 'Hazard-terrain encounter to exercise volo grades -- design spec'
date: 2026-06-29
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-29'
source_of_truth: false
review_cycle_days: 90
tags: [combat, movement, terrain-cost, volo, hazard, lava, encounter, substrate, spec]
---

# Hazard-terrain encounter to exercise volo grades -- design spec

> **Origine**: move terrain-cost substrate, fase 5 residuo. La substrate (volo graduato
> g1/g2/g3 + radici anchor) e' costruita e flag-gated OFF (`MOVE_TERRAIN_COST_ENABLED`).
> Le grade g2/g3 mordono SOLO su HAZARD ({lava, acqua_profonda}) -- terreno assente da
> tutti gli encounter loadable. Questo spec autora il contenuto mancante: un encounter
> loadable con muro di lava + roster volo-graduato, cosi' g2/g3 sono ESERCITATE (non latenti).
> Decisioni di design = 4 verdetti master-dd (AskUserQuestion 2026-06-29). Feed -> writing-plans.
> Il flag resta OFF (owner-gated); questo spec NON lo flippa.

## 1. Ground-truth verificato (origin/main 2026-06-29, HEAD 144a35ab)

Correzioni vs la premessa "due pezzi gia' shippati" (anti-pattern #19, marker != git):

- **#3050 MERGED** (`feat/volo-radici-pathA-assign`, 2026-06-28): i 3 volatori portano gia'
  `adattamento_volo` in `genetic_traits.core` su origin/main -> sono carrier volo. Grade
  default = 1 (registry base) finche' non c'e' un `volo_grade` per-unit.
- **#557 MERGED** (Game-Godot-v2): telegraph move terrain-cost (cost-math client-side).
- 🔴 **#3061 = OPEN** (`feat/move-terrain-flip-prereqs`, CI-green, band-safe), NON merged. E'
  la PR che aggiunge il campo `volo_grade` per-species sui 3 YAML volatori + l'emissione
  `unit.volo_grade` da `deriveCombatStats` + il lift negli scenario loaders (Path A). Finche'
  e' OPEN, un'unita' derivata-da-species NON porta automaticamente g2/g3.

Tre realta' architetturali load-bearing (verificate end-to-end):

1. **`waves[].units[]` NON e' il roster iniziale**: sono rinforzi consumati piu' tardi da
   `reinforcementSpawner.tick()`. Le unita' di partenza vengono da `req.body.units` ->
   `normaliseUnitsPayload` -> `session.units`. Inoltre lo schema wave-unit e'
   `additionalProperties:false` (solo species/count/tier/ai_profile/affixes) -> **non si puo'
   mettere `volo_grade`/`traits` su una wave-unit**.
2. **`normaliseUnit` (`sessionHelpers.js`) preserva `volo_grade` (whitelist) + `traits`**: e' il
   solo seam per portare il grade su un'unita' -- via payload diretto o scenario JS. Path B.
3. **`grid.terrain_features` e' ingerito a `/start`** (`session.js:2417-2424`):
   `encounterPayload = req.body.encounter ?? loadEncounter(encounter_id)`; poi
   `session.grid.terrain_features = encounterPayload.grid.terrain_features`. Quindi un file
   loadable in `docs/planning/encounters/` con `grid.terrain_features` raggiunge il grid runtime
   via `encounter_id`. **MA** `encounter.schema.json` (`additionalProperties:false`) NON ha la
   chiave `grid`, e `tests/scripts/encounterSchema.test.js` AJV-valida ogni `enc_*.yaml`. Quindi
   serve un'estensione schema additiva.

Costi terreno (`movement_profiles.yaml`) + `applyVoloGrade` (`movementResolver.js`):

- heavy: lava 2.0, roccia 2.0, sabbia 1.5. medium: lava 1.5, roccia 1.5. light: tutto 1.0.
- `applyVoloGrade(profile, g)`: g1 azzera il terreno NORMALE (roccia/sabbia -> 1.0), hazard
  INVARIATO; g2 dimezza la penalita' hazard (lava 2.0 -> 1.5); g3 azzera l'hazard (lava -> 1.0).
- 🔑 **Implicazione per "g3 < g2 < g1"**: su lava PURA g1 == g0 (hazard invariato). La scala
  pulita g0 > g1 > g2 > g3 esiste solo se il path di attraversamento include sia un tile
  NORMALE costoso (roccia/sabbia, dove g1 morde) SIA hazard (lava, dove g2/g3 mordono). Il
  layout deve quindi alternare roccia + lava sul corridoio forzato.

## 2. Decisioni (4 verdetti master-dd 2026-06-29)

- **A. Encounter**: nuovo, tema "bocche vulcaniche" in `deserto_caldo`. `noctule_termico` (g3)
  e' nativo deserto_caldo + volatore termico (lava-free per ecologia) = il g3-carrier coerente;
  `aurora_gull` (g2) + `echo_wing` (g1) come volatori cross-bioma.
- **B. Layout lava**: muro di lava ad attraversamento forzato (con corridoio roccia+lava per la
  scala g0>g1>g2>g3); griglia 8x8.
- **C. Roster**: misto su entrambi i lati (volatori + terrestri sia player sia sistema).
- **D. Scope**: encounter loadable + estensione schema + test deterministico costo + variante
  hazard del probe N=40 + **scenario JS** (SCENARIO_MAP-style, AI-giocabile e2e). Rendering
  GGv2 FUORI scope (il telegraph #557 e' gia' merged; il flag resta OFF -> nessun visual nuovo
  necessario per questo deliverable backend).

## 3. Architettura (unita' isolate)

1. **Estensione schema** (`schemas/evo/encounter.schema.json`, additiva, backward-compatible):
   aggiunge una proprieta' opzionale `grid` = `{ width, height, terrain_features:[{x,y,type,
defense_mod}] }`, `type` enum = i tipi di `movement_profiles.yaml` + radura. `grid_size`
   resta required e autoritativo per i bounds della board. Tutti gli encounter esistenti
   (senza `grid`) restano validi. **Guardrail `schemas/evo/` -> da segnalare in PR.**
2. **Encounter loadable** (`docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml`):
   `encounter_id`, `name`, `biome_id: deserto_caldo`, `grid_size:[8,8]`, `grid:{width:8,
height:8, terrain_features: muro lava x=3 (y0..7) + roccia x=4 (y0..7)}`, `objective:
elimination`, `player_spawn`, `waves` (roster tematico via species-id, per il flavour +
   l'objective), `difficulty_rating` (drift <= 2 vs `validate_encounter_difficulty.js`),
   `encounter_class`, `tags`. Passa `encounterSchema.test.js` + difficulty validator.
3. **Scenario JS** (`apps/backend/services/worldgen/desertoCaldoHazardScenario.js`):
   build di un roster MISTO con unita' volo-graduate esplicite (Path B: `volo_grade` +
   `traits:['adattamento_volo']` sui volatori, mirror del probe esistente), terrain = muro
   lava+roccia, dimensionato per RISOLVERE (winnable, come l'hazard-probe, NON come i pilot
   adapter che vanno in timeout). Esporta `SCENARIO`, `buildUnits()`, `TERRAIN`. Riusato dal
   probe e dal test integrazione cosi' c'e' UNA fonte del roster/terrain.
4. **Test deterministico costo** (`tests/services/combat/voloHazardEncounterCost.test.js`):
   carica l'encounter via `loadEncounter`, estrae `grid.terrain_features`, costruisce `terrainAt`,
   e per il corridoio roccia+lava asserisce `moveCost` STRETTAMENTE decrescente:
   g0 > g1 > g2 > g3 (heavy profile + `applyVoloGrade`). Prova che la substrate morde su QUESTO
   contenuto. Deterministico, no sim, no flag.
5. **Variante hazard del probe N=40** (`tools/sim/move-terrain-hazard-encounter-probe.js`):
   paired-seed ON-vs-OFF sul roster misto dello scenario JS, node 22, in-process. Misura
   wr_delta + rounds_delta. Evidence -> `docs/reports/2026-06-29-volo-hazard-encounter-band-evidence.md`.

## 4. Layout terreno + roster (concreto)

Griglia 8x8 (x,y 0..7). Muro verticale:

- `lava` su x=3, y=0..7 (8 tile).
- `roccia` su x=4, y=0..7 (8 tile).

Attraversamento sinistra->destra: per ogni y il path entra in (3,y)=lava poi (4,y)=roccia.
Costo di attraversamento (entrare lava + entrare roccia), heavy profile:

| grade | lava | roccia | totale corridoio |
| ----- | ---- | ------ | ---------------- |
| g0    | 2.0  | 2.0    | 4.0              |
| g1    | 2.0  | 1.0    | 3.0              |
| g2    | 1.5  | 1.0    | 2.5              |
| g3    | 1.0  | 1.0    | 2.0              |

Scala pulita g0 > g1 > g2 > g3. (g1 morde sulla roccia, g2/g3 sulla lava.)

Roster MISTO (Path B, volo_grade esplicito):

- Player: `noctule_termico` g3 + `echo_wing` g1 (volatori) + 1 pesante non-volo (paga il muro).
- Sistema: `aurora_gull` g2 (volatore) + 2 terrestri non-volo.

Dimensionamento winnable (mirror hazard-probe): nemici a HP/mod moderati, posizioni che
costringono l'attraversamento, maxRounds 30 -> l'encounter RISOLVE (no timeout strutturale).

## 5. Fasi (TDD, 1 PR)

0. Estensione schema additiva + aggiorna `encounterSchema.test.js` se serve un caso `grid`
   (red->green: un fixture con `grid.terrain_features` valida).
1. Encounter YAML loadable -> `encounterSchema.test.js` verde + `validate_encounter_difficulty.js`
   drift <= 2.
2. Scenario JS (`desertoCaldoHazardScenario.js`) + unit test (buildUnits porta volo_grade +
   adattamento_volo sui volatori; terrain = muro).
3. Test deterministico costo (`voloHazardEncounterCost.test.js`): g0>g1>g2>g3 sul corridoio.
4. Variante hazard del probe N=40 + evidence report (band ratify = master-dd, NON in questa PR).

## 6. Definition of Done

- `node --test tests/services/combat/*.test.js tests/scripts/encounterSchema.test.js` verde.
- `node tools/js/validate_encounter_difficulty.js` errors=0.
- `python3 tools/py/game_cli.py validate-datasets` verde (encounter content non rompe i validator).
- `npm run format:check` + `python tools/check_docs_governance.py --strict` verdi.
- Flag `MOVE_TERRAIN_COST_ENABLED` resta OFF (band-neutral). Il flip resta owner-gated.
- Commit ADR-0011 (`Coding-Agent:` + `Trace-Id:`), no `Co-Authored-By:`.
- Guardrail segnalato: tocco `schemas/evo/encounter.schema.json` (additivo) -> master-dd merge-gate.

## 7. Entry point implementazione

writing-plans -> piano dettagliato file-by-file TDD. Worktree off origin/main, deps installati.
