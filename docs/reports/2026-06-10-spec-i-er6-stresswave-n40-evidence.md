---
title: 'SPEC-I ER6 StressWave events -- N=40 evidence (gate sez.8)'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, spec-i, er6, stresswave, n40, ratification, flag-gate]
---

# SPEC-I ER6 StressWave events -- N=40 evidence (2026-06-10)

Evidence pack per il gate **SPEC-I sez.8** dell'effetto ER6 (#2712, flag
`STRESSWAVE_EVENTS_ENABLED` default OFF): i dati `stresswave` di biomes.yaml
come event-trigger bounded -- `rescue` (+`RESCUE_HEAL_HP`=2 alle unit player
vive, cap max_hp) e `overrun` (+`OVERRUN_BUDGET_BONUS`=1 al reinforcement
budget, consume-once). Magnitudini PROPOSED.

Posture L-069: questo documento RIPORTA; il flip del flag e' verdetto
master-dd.

## Setup

- Harness: `tools/sim/spec-i-gates-probe.js --effect er6` (nuovo; pattern
  paired-arms fp-delta #2701 / overcharge #2713 + repliche noise-floor).
  Adapter esteso TDD, default byte-identical: `collectEvents` (conteggio raw
  event `stresswave_event`/`reinforcement_spawn` dal tail-30 di /state, dedupe
  cross-poll + sweep finale), `pressureStart`, `modulation` (per il re-run
  post-fix #2724 su board 10x10).
- Scenario: `enc_hardcore_reinf_01` (elimination 5/5, reinforcement_pool
  attivo) con `biome_id: abisso_vulcanico` (stresswave baseline 0.36,
  escalation_rate 0.06, soglie rescue 0.58 / overrun 0.82 -> crossing
  deterministico a turno 4 / turno 8).
- Overlay difficolta' `{countAdd:6, hpAdd:4, modAdd:6, dcAdd:2}` (stesso punto
  di misura #2713; ladder piloti: WR off 0.85@cA6 / 0.80@cA7 / 0.70@cA8 --
  curva piatta, nessun knife-edge raggiungibile senza timeout; L-069: scelta
  del punto di misura, NON banda ratificata). `pressure_start` 30 (tier Alert:
  arma il path budget del overrun).
- Roster: 2x skirmisher-statline ap:2 (canone 7.1, identico a #2713).
- 3 armi, stessi seed (er6-52000..52039), **un processo node per arm** +
  `--aggregate` (il primo batch same-process mostrava +0.20 di gap tra armi
  meccanicamente identiche: stato modulo-globale combat -- es. pseudoRng
  miss-streak -- condiviso tra armi sequenziali; isolando i processi il floor
  torna simmetrico):
  - `off` -- flag OFF (status quo);
  - `off2` -- replica di off = **noise floor** per-seed;
  - `on` -- `STRESSWAVE_EVENTS_ENABLED=true`.
- Artifacts: `reports/sim/spec-i-er6-stresswave-n40-2026-06-10/`.

## Risultati

| arm | n | win rate (Wilson CI95) | rounds (tick) | survivors |
| --- | --- | --- | --- | --- |
| off | 40 | 0.875 [0.74, 0.95] | 92.9 +/- 9.9 | 1.75 |
| off2 (floor) | 40 | 0.825 [0.68, 0.91] | 91.2 +/- 11.3 | 1.65 |
| on | 40 | 0.825 [0.68, 0.91] | 90.4 +/- 10.6 | 1.65 |

Eventi (collector raw event, per arm):

| arm | rescue rate | rescue turn | overrun rate | overrun turn | spawns/run |
| --- | --- | --- | --- | --- | --- |
| off | 0.00 | - | 0.00 | - | 0.13 |
| off2 | 0.00 | - | 0.00 | - | 0.17 |
| on | **1.00** | **4.0 (sd 0)** | **1.00** | **8.0 (sd 0)** | 0.17 |

Paired per-seed (stessi 40 seed):

| pair | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- |
| off2 - off (noise floor) | -0.050 | -1.7 [-6.5, 3.1] | 5 / 7 |
| on - off (ER6 effect) | **-0.050** | -2.5 [-7.1, 2.1] | **5 / 7** |

### Findings

- **F1 -- Wiring provato end-to-end, deterministico**: con flag ON rescue
  scatta a t4 e overrun a t8 in 40/40 run (sd 0 -- la wave e' funzione pura del
  turno, come da design "nessun feed continuo"); con flag OFF zero eventi in
  80/80 run. One-shot rispettato (mai doppi trigger).
- **F2 -- Rescue (+2 HP) = WR-neutro al floor**: il paired delta ON-OFF
  (-0.050, flips 5/7) e' IDENTICO al noise floor (-0.050, flips 5/7). A
  magnitudine 2 l'effetto meccanico non sposta l'esito oltre il rumore
  per-seed. Nota anti lucky-sample: il pilot N=10 mostrava +0.40 -- a N=40
  l'effetto sparisce (conferma L-069/N-sample: N=10 = direction, N=40 =
  ratify).
- **F3 -- Overrun strutturalmente NO-OP a runtime**: il bonus budget viene
  armato e consumato, ma lo spawner non spawna MAI finche' un PG e' vivo --
  bug pre-esistente formato position (array vs `{x,y}`) in
  `reinforcementSpawner.farFromAllPG`/`isWalkable`, trovato dai pilot di
  questo probe: **issue #2724**. Gli spawns ~0.15/run osservati avvengono
  solo post-wipe nelle run di sconfitta. L'effetto overrun NON e' misurabile
  finche' #2724 resta aperto.
- **F4 -- Il valore di ER6 a questa magnitudine e' il layer eventi/telegraph**
  (design note, non verdetto): eventi diegetici deterministici nel raw stream
  + `stresswave_event_latest`, senza swing meccanico misurabile. Coerente con
  la lettera della spec ("event-trigger bounded", anti death-spiral)?
  Domanda di ratifica sotto.

## Domande per la ratifica (master-dd)

1. **Flip ON con effetto meccanico ~neutro?** Il rescue a +2 e' WR-neutro al
   floor: se l'intento di ER6 e' principalmente segnaletico/diegetico
   (telegraph "Protocollo di soccorso"/"Overrun" + pressione narrativa), il
   flip e' safe-by-measurement. Se invece il rescue deve essere un salvagente
   percepibile, serve magnitudine maggiore (es. RESCUE_HEAL_HP 3-4) -> nuovo
   N=40.
2. **Overrun: gate sul fix #2724.** Ratificare ORA solo il rescue (+ telegraph)
   e tenere l'overrun PROPOSED fino al fix spawner + re-run N=40 (il probe ha
   gia' `--modulation duo_hardcore` per il board 10x10 con gli entry tiles
   authored)? Oppure flip unico post-fix?
3. **Punto di misura**: baseline 0.825-0.875 (sopra-centro). La ladder piloti
   mostra curva piatta fino a 0.70@cA8 (rounds 125, vicino al cap 160): un
   baseline ~0.5 su questo scenario non e' raggiungibile senza rischiare
   timeout-artifact. Accettare il ceiling-caveat o indicare un altro scenario
   di misura?

## Verdetto (master-dd 2026-06-10, sessione interattiva)

- [x] **Q1 flip: ON.** Il valore misurato di ER6 = layer eventi/telegraph
  diegetico senza swing meccanico, coerente con la lettera "event-trigger
  bounded, anti death-spiral"; l'overrun diventera' attivo col fix #2724.
  Flip eseguito IN QUESTA PR: `STRESSWAVE_EVENTS_ENABLED` default ON
  (`!== 'false'`), opt-out esplicito.
- [x] **Q2 magnitudini: SPLIT.** `RESCUE_HEAL_HP=2` RATIFIED-PROVISIONAL
  (re-validate player data); `OVERRUN_BUDGET_BONUS=1` resta PROPOSED fino a
  fix #2724 + re-run N=40 (probe pronto: `--modulation duo_hardcore` per il
  board 10x10 con gli entry tiles authored).
- [x] **Q3 punto di misura: ceiling-caveat ACCETTATO** (il segno non cambia
  lungo la ladder cA6/cA7/cA8 e il paired delta resta al floor).

Nota post-flip: i prossimi batch full-loop band vedranno ER6 attivo sui biomi
con dati stresswave (effetto atteso ~floor, ma la provenance dei batch va
letta con il flag default ON in mente).

## Caveat strutturali

- Policy sim condivisa = attacchi base + zone pursuit: i delta sono il floor
  conservativo (player reali sfruttano l'heal in modi che la policy non
  modella, es. trade aggressivi post-rescue).
- Baseline vicino al ceiling (0.825-0.875): comprime lo spazio del rescue
  verso l'alto. Ladder documentata in Setup; il segno non cambia a cA7/cA8
  (pilot N=10).
- `pressure_start` 30 fisso: lo spawner legge `session.pressure` (mai
  aggiornato in-fight, drift secondario annotato in #2724), quindi il tier
  spawner e' costante Alert per design del punto di misura.
- Wave-1 only: scenario-enemies non stagia le wave successive authored
  (limite noto del sim).

## Riproduzione

```bash
for arm in off off2 on; do
  GIT_COMMIT=be4f3af9f node tools/sim/spec-i-gates-probe.js --effect er6 \
    --runs 40 --seed-base 52000 --arms "$arm" \
    --scaling '{"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2}' \
    --out reports/sim/spec-i-er6-stresswave-n40-2026-06-10
done
GIT_COMMIT=be4f3af9f node tools/sim/spec-i-gates-probe.js --effect er6 \
  --runs 40 --seed-base 52000 \
  --scaling '{"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2}' \
  --out reports/sim/spec-i-er6-stresswave-n40-2026-06-10 --aggregate
```

## Stato gate

Harness costruito + N=40 paired eseguito + verdetto master-dd reso (sezione
sopra): **gate sez.8 PASSED, flip a default ON eseguito in questa PR** (test
legacy default-OFF migrati a opt-out esplicito). Residuo aperto: re-run N=40
overrun post-fix #2724 prima di ratificare `OVERRUN_BUDGET_BONUS`.
