---
title: 'A13 biome-wound magnitude -- N=40 evidence (trigger-gap finding)'
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
`PRESSURE_PER_BIOME=1` + `woundedStep=1` read-side, gate SPEC-I per il flip; PA2
mirror). Posture L-069: questo documento RIPORTA; la ratifica e' verdetto
master-dd. Esito sintetico: **la magnitude NON e' misurabile oggi** -- il
trigger del wound non scatta MAI sotto il loop AI-playtest. Il blocker e' un
gap engine a 1 seam, localizzato con precisione (F1).

## Setup

- Harness: `tools/sim/full-loop-batch.js --runs 40 --a13 --isolate` (commit
  `aa1793e0`, worktree branch `claude/a13-wound-n40-evidence`). Modalita' a13
  (questo PR, opt-in, default OFF): sessioni linkate alla campagna
  (`campaign_id` + `biome_id` da encounter YAML), `POST /api/session/end` per
  capitolo (write-side trigger), telegraph `biome_wounded` catturato, retry
  bounded di un capitolo fallito (`a13MaxRetries=1`, flusso prodotto reale:
  `/campaign/advance` -> `retry:true`).
- Disegno A/B paired (stessi seed 1000-1039): arm CONTROL =
  `A13_WOUND_READ_DISABLED=1` (amplifier read-side neutralizzato, env-guard di
  questo PR, default OFF in prod) vs arm WOUND-LIVE = knob attivo. Entrambi gli
  arm condividono il resto del wiring (sistema-learning M1, woundedPerma,
  chronicle) -> il delta isola SOLO la magnitude.
- Artifacts: `reports/sim/a13-wound-n40-2026-06-10/{control,live,probe-wipe-1,
  probe-wipe-2}/` (runs.jsonl + summary.json + report.md ciascuno).

## Risultato principale: exposure = 0 in entrambi gli arm

| arm | n | completion | attempts | retries | wounded attempts | exposure |
| --- | --- | --- | --- | --- | --- | --- |
| control (flag=1) | 40 | 0.95 | 334 | 18 | 0 | 0% |
| wound-live (flag=0) | 40 | 0.90 | 316 | 19 | 0 | 0% |

19 retry nel live arm, **0 con bioma ferito**: il wound write-side non e' mai
scattato.

## F1 -- Trigger-gap (root cause, load-bearing)

100% dei fallimenti = `timeout` (23/23 nel live arm; 16/16 nei due probe). La
catena del gap:

1. Il runner chiude la missione a 40 round -> outcome run-level `timeout`
   (che E' in `DEFEAT_OUTCOMES = {wipe, timeout, defeat, objective_failed}`).
2. Ma il write-side A13 vive in `POST /api/session/end` (`session.js:3511`),
   che RIDERIVA l'outcome dallo stato board: entrambe le fazioni vive ->
   `abandon` (`session.js:3459`).
3. `abandon` non e' in `DEFEAT_OUTCOMES` -> `woundBiome` mai chiamato.

La campagna SA che il run e' fallito (`/campaign/advance` riceve
`outcome:'timeout'` dichiarato dal client -- modello di trust gia' canonico);
la sessione NO. Le missioni gating del calibrato (enc_tutorial_01 /
enc_savana_01) sono elimination senza `loss_conditions.time_limit` -> nessun
objective evaluator che produca `objective_failed`. Engine-LIVE /
Trigger-DEAD nel failure-mode dominante.

## F2 -- Wipe irraggiungibile con i knob attuali

Due direction-probe (N=6, L-072) per forzare il failure-mode `wipe` (che
ferirebbe il bioma con la semantica attuale):

- probe-wipe-1: `FL_ENEMY_MOD_ADD=8` -> 4/4 fail ancora `timeout`.
- probe-wipe-2: `FL_ENEMY_MOD_ADD=10 FL_ENEMY_COUNT_MULT=8 FL_ENEMY_HP_ADD=6`
  -> 12/12 fail ancora `timeout`.

La policy AI non muore: va fuori clock (danno per hit nemico resta 1-3; il
party 60HP non collassa mai prima dei 40 round). Il wipe non e' un failure-mode
raggiungibile dal sim al calibrato -- la misura della magnitude richiede il fix
del trigger (F1), non altro knob-tuning.

## F3 -- Noise floor (valore del paired design anche a exposure 0)

Con ZERO esposizione al wound in entrambi gli arm, ogni delta osservato e'
varianza pura run-to-run (stessi seed, knob ininfluente):

- retry victory rate: control 16/18 (88.9%) vs live 15/19 (78.9%) -> ~10pp di
  rumore a n(retries)~19.
- completion: 0.95 vs 0.90 -> 2 run di differenza su 40.

Implicazione per la ratifica futura: a N=40 con ~19 retry/arm, un effetto della
magnitude sotto ~10pp sul retry-rate NON e' distinguibile dal rumore. Servira'
o un effetto piu' grande, o piu' N, o una metrica meno rumorosa (es. delta
eco-cost diretto per attempt).

## F4 -- Strumento pronto

Il wiring a13 funziona end-to-end (integration test + probe reali): biomi
risolti lungo tutta la chain (5 biomi distinti), sessioni linkate, `/end`
chiamato, telegraph catturato, JSONL `a13_chapters` con trail per-attempt.
Quando il trigger-gap e' fixato, la STESSA coppia di comandi produce la misura.

## Opzioni di fix (design call master-dd -- NON implementate qui)

- **(A) `/end` accetta `outcome` dichiarato (downgrade-only)**: il client/sim
  dichiara `timeout`; mai upgrade a victory (heal non spoofabile). Coerente col
  trust model di `/advance` (outcome gia' client-declared li'). Fix minimo.
- **(B) wound write-side spostato/duplicato in `/campaign/advance`**: il seam
  che RICEVE l'outcome autoritativo del run e possiede gia' lo stato cross-run
  (`campaign.woundedBiomes`). Argomentabilmente il posto PA2-corretto
  ("wound on run-fail"); refactor piu' largo.
- **(C) `abandon` aggiunto a DEFEAT_OUTCOMES**: sconsigliato -- abbandoni reali
  (quit/disconnect co-op) ferirebbero biomi spuriamente.

## Riproduzione

```bash
# arm control
A13_WOUND_READ_DISABLED=1 node tools/sim/full-loop-batch.js --runs 40 --a13 --isolate --out <dir>/control
# arm wound-live
node tools/sim/full-loop-batch.js --runs 40 --a13 --isolate --out <dir>/live
```

## Stato gate SPEC-I

Il gate "A13/N=40" NON e' soddisfatto da questo pack (magnitude non misurata).
Il blocker pero' passa da "nessuno l'ha corsa" a un gap engine preciso a 1 seam
con 3 opzioni di fix. Dopo il verdetto F1 + fix, re-run = 2 comandi.
