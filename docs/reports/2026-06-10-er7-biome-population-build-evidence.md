---
title: 'SPEC-I ER7 -- biome population tick BUILT flag-gated (build + PROPOSED knobs)'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, spec-i, er7, biome-population, worldgen, ecology, flag-gated, proposed, n40]
---

# SPEC-I ER7 -- A9 population tick BUILT flag-gated (2026-06-10)

Build-record del fork **ER7** (RATIFICATO 2026-06-10, opzione A). L'ecosistema
evolve cross-run come **stato discreto per ruolo trofico** (abundant/stable/
depleted -- MAI numeri continui). Posture L-069: questo documento RIPORTA il
build + le magnitudini PROPOSED; la ratifica delle magnitudini e il flip-ON del
flag restano verdetto master-dd post playtest N=40.

Design ratificato: `docs/design/evo-tactics-ermes-runtime-pressure.md` sez. ER7.

## Cosa e' stato costruito

| Layer | File | Ruolo |
|-------|------|-------|
| Engine (puro) | `apps/backend/services/worldgen/biomePopulation.js` | stato discreto + advance season-tick + eventi |
| Role map | `apps/backend/services/worldgen/ecosystemResolver.js` (`getSpeciesRoles`) | species -> ruolo trofico (da trofico tier) |
| Consumer | `apps/backend/services/worldgen/foodwebFilter.js` (`applyPopulationToPool`) | depleted escluso, abundant pesato su |
| Season-tick wire | `apps/backend/routes/campaign.js` (advance-season) | avanza i biomi-pilota, persiste, emette permanentFlags |
| Spawn wire | `apps/backend/services/combat/reinforcementSpawner.js` | shaping del pool a runtime (flag-gated) |
| Signal apex | `apps/backend/routes/session.js` (A13 block) | run vinto -> `apexPressureByBiome` (one-shot) |
| Persistence | `apps/backend/services/campaign/campaignStore.js` | `biomePopulation` + `apexPressureByBiome` (additive) |

## Modello (anti-UO compliant)

WARNING museum (worldgen-stack card + PCG audit): UO 1997 = mai simulare il
foodweb a runtime col player libero. Pattern sano (Rimworld/DF): stato discreto,
modifier flat, worldgen frozen in-play. Lotka-Volterra (opzione B) SCARTATO.

Stato per ruolo: `{ state: abundant|stable|depleted, seasons: int }`. Ruoli
tracciati = quelli che compaiono nei reinforcement pool: `apex` (consumatori
terziari), `mesopredator` (secondari), `prey` (primari). Produttori/decompositori
non rinforzano mai -> non tracciati.

Regole FLAT (avanzano SOLO a season-tick, deterministiche, monotone entro il tick):

1. `biomeWounded` (A13, `campaign.woundedBiomes`) -> `prey` depleted.
2. `apexOverhunted` (run vinto, `campaign.apexPressureByBiome`) -> `apex` depleted.
3. Trophic release: `apex` depleted per un INTERO tick (prev E next) + prey non
   ferita -> `prey` abundant (il predatore sparito libera la preda; lag di 1
   season cosi' il boom non scatta lo stesso tick della perdita apex, e si ferma
   il tick in cui l'apex recupera).
4. Recovery: un ruolo non ri-triggerato torna `stable` dopo `RECOVERY_SEASONS`
   (depleted) / `ABUNDANCE_SEASONS` (abundant) season.

Eventi `local_extinction` (ruolo entra in depleted) / `population_boom` (prey
entra in abundant) = `permanentFlags` narrativi (Wildermyth pattern LIVE),
emessi solo alla transizione (anti-spam). Consumer: `foodwebFilter` esclude le
specie del ruolo depleted dalla spawn whitelist e pesa su quelle abundant.

## Magnitudini PROPOSED (ratify N=40)

| Knob | Valore | File |
|------|--------|------|
| `RECOVERY_SEASONS` | 2 | `biomePopulation.js` |
| `ABUNDANCE_SEASONS` | 2 | `biomePopulation.js` |
| `ABUNDANT_WEIGHT_MULT` | 2 | `foodwebFilter.js` |
| Proxy `apexOverhunted` | run vinto nel bioma (semplificazione del "kill-heavy apex") | `session.js` |

## Governance / band-safety

- Flag `BIOME_POPULATION_ENABLED` **default OFF** (spec sez. 8 / pattern ER1/ER6:
  ON solo post playtest N=40 GREEN, verdetto master-dd). Flag OFF = zero nuovo
  code path: `advance-season` ritorna `biome_population: null`, nessuna mutazione
  del campaign, lo spawner non legge la popolazione.
- Pilot scope **badlands** (`ER7_PILOT_BIOMES = ['badlands']`, mirror ER5):
  espansione = aggiungere biomi un alla volta dietro il gate N=40.
- Band-safety consumer: `applyPopulationToPool` non svuota MAI il pool (fallback
  al pool pre-population), specie off-foodweb/sintetiche passano invariate.
- Schema campaign additive-only (nessun `packages/contracts`).

## Verifica (build gate)

- TDD: 14 test engine + 10 test consumer (+role map) + 4 test wire integration.
- Regressione: `tests/worldgen/foodwebFilter.test.js` (8) +
  `tests/services/reinforcementSpawner*.test.js` (29) +
  `tests/api/campaignSeasonal.test.js` (11) verdi.
- Full suite: `node --test tests/api/*.test.js` -> **1555 pass / 0 fail / 1 skip**
  (flag OFF: legacy invariato).

## Forward-work (NON gate del build, post-evidence)

- Playtest **N=40 flag-ON** badlands: win-rate dentro banda + nessuna regressione
  fuori banda (pattern ER5) -> ratifica magnitudini + flip-ON.
- Affinare il proxy `apexOverhunted` (kill-heavy reale per-ruolo vs run vinto).
- Surface Godot: telegraph diegetico dello stato bioma (item 3).
- Espansione bioma-per-bioma post-gate.
