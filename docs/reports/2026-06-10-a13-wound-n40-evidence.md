---
title: 'A13 biome-wound magnitude -- N=40 evidence (post fix-A)'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, a13, biome-wound, spec-i, spec-p, n40, ratification]
---

# A13 biome-wound (PRESSURE_PER_BIOME / DEGRADE_STEP) -- N=40 evidence (2026-06-10)

Evidence pack per la ratifica della magnitude PROPOSED di A13 (`biomeWound.js`
`PRESSURE_PER_BIOME=1` + `woundedStep=1` read-side, gate SPEC-I; PA2 mirror).
Posture L-069: questo documento RIPORTA; la ratifica e' verdetto master-dd.

Storia in 2 round (stesso PR):

- **Round 1 (pre fix)**: exposure 0% -- trovato il trigger-gap (issue #2703):
  100% dei fail = timeout run-level, `/end` riderivava `abandon` (board entrambi
  vivi) non in `DEFEAT_OUTCOMES` -> wound mai scritto.
- **Verdetto master-dd**: fix opzione A -- `/end` accetta `outcome` dichiarato
  **downgrade-only** (enum {timeout, defeat, objective_failed}, applicato solo su
  board `abandon`/`draw`; un win/wipe di board non e' MAI sovrascritto).
- **Round 2 (post fix-A)**: trigger LIVE -- 100% dei retry del live arm combattuti
  su bioma ferito. Numeri sotto.

## Setup

- Harness: `tools/sim/full-loop-batch.js --runs 40 --a13 --isolate` (commit
  `4de0e14a`). Modalita' a13 (opt-in, default OFF): sessioni linkate
  (`campaign_id` + `biome_id` da encounter YAML), `/end` per capitolo con outcome
  dichiarato sui fail (fix-A), telegraph `biome_wounded` catturato, retry bounded
  (`a13MaxRetries=1`, flusso prodotto reale `/advance` -> `retry:true`).
- A/B paired (seed 1000-1039): arm CONTROL = `A13_WOUND_READ_DISABLED=1`
  (amplifier neutralizzato; write-side e tutti gli altri sistemi cross-run
  identici) vs arm WOUND-LIVE = knob attivo.
- Artifacts: `reports/sim/a13-wound-n40-2026-06-10/{control,live,probe-wipe-1,
  probe-wipe-2}/`. I probe-wipe-* sono il round-1 (pre-fix): documentano che il
  failure-mode wipe e' irraggiungibile coi knob FL_ENEMY_* (16/16 timeout anche a
  mod+10/cm8/hp+6) -- e' il fix-A, non il knob-tuning, che ha sbloccato il trigger.

## Risultati post fix-A

| arm | n | completion | attempts | retries | retry su ferito | retry win-rate | failed-on-retry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| control (flag=1) | 40 | 0.825 | 312 | 21 | 0 (knob off) | 14/21 (66.7%) | 7 |
| wound-live (flag=0) | **36** | 0.917 | 287 | 15 | **15/15 (100%)** | 12/15 (80.0%) | 3 |

- **F1 -- Trigger VERIFICATO live**: ogni retry del live arm combatte il bioma
  ferito (write-side su timeout dichiarato + read-side telegraph + debuff
  attivi). Il gap #2703 e' chiuso dal fix-A per il loop AI-playtest.
- **F2 -- Live arm n=36**: 4 seed crashed-after-retries (0xC0000409 noto,
  esclusi da N e loggati, mai contati come fail). Il paired design e' quindi
  imperfetto sui 4 seed mancanti.
- **F3 -- Magnitude: effetto netto indistinguibile da zero a N=40.** Il retry
  win-rate col debuff (80.0%) NON e' peggiore del control (66.7%): delta +13pp
  nella direzione "sbagliata", dentro il rumore (round-1 noise floor ~10pp a
  n~19; qui n=15 vs 21 e insiemi seed non identici per F2). Completion 0.917 vs
  0.825: stesso discorso.
- **F4 -- Spiegazione strutturale (design note, non verdetto)**: il read-side
  applica `-woundedStep` ai `BIOME_ECO_FIELDS` di **TUTTE** le unit della
  sessione (`session.js` -> `units.map(applyBiomeEcoEffects)`, player E
  sistema, entro cap ER2 +/-2). Debuff simmetrico -> net-impact sul win-rate
  strutturalmente ~0. La "ferita" oggi e' percepibile (telegraph, eco-log,
  epilogo) ma quasi non punitiva nel combat outcome.

## Domande per la ratifica (master-dd)

1. **La simmetria e' intenzionale?** PA2/PA4 parlano di "pressione" entro ER2.
   Se l'intento e' biomi feriti = piu' duri per il BRANCO, serve un read-side
   asimmetrico (debuff solo player, o buff sistema). Se l'intento e' "il bioma
   soffre per tutti" (lettura ecologica), la magnitude attuale e' coerente e la
   sua firma e' narrativa/telegraph piu' che meccanica.
2. **Magnitude 1 ratificabile cosi'?** A effetto netto ~0, ratificare
   `PRESSURE_PER_BIOME=1`/`DEGRADE_STEP=1` = ratificare una ferita
   "segnaletica". Alternativa: alzare la magnitude o asimmetrizzare, poi
   re-run (2 comandi, harness pronto).
3. **Potenza**: per misurare un effetto <10pp sul retry-rate servono piu' retry
   (N>40, o `a13MaxRetries` piu' alto, o difficolta' che produca piu' fail) o
   una metrica diretta meno rumorosa (delta eco-cost per attempt, gia' nei log
   `biomeCostsLog`).

## Riproduzione

```bash
# arm control
A13_WOUND_READ_DISABLED=1 node tools/sim/full-loop-batch.js --runs 40 --a13 --isolate --out <dir>/control
# arm wound-live
node tools/sim/full-loop-batch.js --runs 40 --a13 --isolate --out <dir>/live
```

## Stato gate SPEC-I

Trigger A13: **LIVE e verificato N=40** (fix-A #2703). Magnitude: evidence
raccolta; il numero e' "effetto netto ~0 per costruzione simmetrica" -- la
ratifica e' una design call (domande sopra), non piu' un buco di misura.

## Verdetto (master-dd 2026-06-10, sessione interattiva)

- [x] **Q1 simmetria: INTENZIONALE** -- lettura ecologica ("il bioma soffre per
  tutti"): la ferita e' firma narrativa/telegraph, non punizione. Anti
  death-spiral (chi ha perso non viene punito doppio); la durezza direzionale
  futura arriva da ER6/ER7 (eventi/popolazione, bounded), non dal wound.
- [x] **Q2 magnitude: RATIFICATA** -- `woundedStep=1` + `PRESSURE_PER_BIOME=1`
  -> **RATIFIED-PROVISIONAL** (re-validate on player data, tier #2693).
- [x] **Q3 potenza**: non necessaria per questo verdetto (la natura segnaletica
  e' by-design, non serve misurare un effetto che non deve esserci); metrica
  eco-cost diretta resta l'opzione se la re-validazione player la richiede.
