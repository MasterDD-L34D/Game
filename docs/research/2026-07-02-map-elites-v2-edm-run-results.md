# MAP-Elites v2 edm-run -- knob-space SoT-full: coverage 10/25, WR floor 15%, SPRT esercitato

status: COMPLETE (run 2026-07-02, 894.5s)
run: calibrate_map_elites.py --scenario hardcore_06 --iterations 50 --n-per-trial 40 --shards 4 --base-port 3390 --sprt --label v2-edm-run
base code: claude/map-elites-v2-edm @ 03f6c7c9 (knob-space esteso al manifest SoT)
trial dir: docs/playtest/map-elites-hardcore_06-v2-edm-run
decisione owner: 2026-07-02 "Re-run +enemy_damage, con --sprt" (post v2-run)

## TL;DR

Terza run Method D (seconda completa): knob-space allineato al manifest SoT
(boss_hp 0.50-1.30, + enemy_damage_multiplier_override 1.0-2.5, OD-032 C mai
esplorato da Method D) + primo esercizio reale di --sprt. Coverage 10/25 (era
6/25), WR floor 0.28 -> 0.15, riga turns 30-36 aperta, r(WR,turns)=0.158.
SPRT ha troncato 14/50 trial risparmiando 352 run (18% del budget). Due
finding: (a) WR <10%% resta irraggiungibile anche col knob-space pieno --
floor strutturale ~15%% del greedy AI; (b) wart SPRT trovato sui dati (trial
troncato N=10-11 puo' EVICT un occupante full-N) e fixato post-run
(truncated = populate-only, mai replace; test dedicato).

## Integrita'

- 50/50 iterazioni, iter 0-49, eval_failures=0, n_shortfall=0.
- n_eff=40 in 36/50; i 14 sotto-40 sono troncamenti SPRT intenzionali
  (distribuzione: 10x5, 11x3, 12, 15, 18, 19, 30, 31).
- r(WR, turns_avg) = 0.158 su 50 sample: assi indipendenti anche nel
  knob-space esteso.

## Archive (10/25, coverage 40%)

| cella                | WR   | turns | boss_hp | cap | edm  | N    |
| -------------------- | ---- | ----- | ------- | --- | ---- | ---- |
| (1,2) 10-20 x 24-26  | 0.15 | 25.5  | 1.16    | 26  | 1.73 | 40   |
| (2,2) 20-30 x 24-26  | 0.25 | 25.4  | 1.11    | 26  | 1.88 | 40   |
| (2,3) 20-30 x 26-30  | 0.20 | 27.6  | 1.16    | 28  | 1.78 | 40   |
| (3,1) 30-40 x 22-24  | 0.33 | 23.5  | 0.87    | 25  | 2.01 | 40   |
| (3,2) 30-40 x 24-26  | 0.33 | 24.6  | 0.87    | 26  | 1.67 | 40   |
| (4,0) 40-100 x <22   | 0.62 | 21.4  | 0.76    | 25  | 1.34 | 40   |
| (4,1) 40-100 x 22-24 | 0.80 | 23.8  | 0.53    | 30  | 1.11 | 10\* |
| (4,2) 40-100 x 24-26 | 0.75 | 24.7  | 0.75    | 29  | 1.10 | 40   |
| (4,3) 40-100 x 26-30 | 0.73 | 27.5  | 1.09    | 33  | 1.28 | 11\* |
| (4,4) 40-100 x 30-36 | 0.62 | 31.3  | 1.29    | 35  | 2.03 | 40   |

(\*) Occupanti low-N da trial SPRT-troncati: direction-probe, NON ratify-grade
(L-073). Il fix post-run impedisce questi replace nelle run future.

Banda target 15-30%% ora coperta da 3 celle full-N con il lever edm:
(1,2) 15%%, (2,3) 20%%, (2,2) 25%% -- tutte boss_hp 1.11-1.16 + edm 1.7-1.9.
NB: la prod (boss 1.02, edm none, WR 23%% N=100) resta la config ratificata;
queste sono coordinate mappa, non candidati ship.

## Finding

### F-A: WR <10%% irraggiungibile anche nel knob-space SoT-full

WR minimo osservato 0.15 su 50 sample; i 3 sample con WR=0.15 hanno gia'
boss_hp 1.01-1.26 + edm 1.7-2.1. La colonna 0-10%% richiederebbe condizioni
fuori dal SoT attuale. Floor strutturale del greedy AI su hc06 ~15%%: la
mappa dice che il knob-space canonico NON puo' produrre un hc06 "quasi
impossibile" -- rilevante se in futuro serve una variante nightmare.

### F-B (wart SPRT, fixato): truncated-eviction

Il troncamento SPRT scatta quando la CI95 raggiunge solo colonne WR gia'
piene -- corretto per l'ESPLORAZIONE, ma il risultato parziale (N=10-31)
partecipava anche al REPLACE su celle occupate: iter 49 (N=11) ha sostituito
un occupante full-N in (4,3). Rumore contro L-073. Fix nel branch: entry
troncata puo' popolare una cella vuota, mai sostituire un occupante
(place_in_map + persist del flag nel checkpoint; test dedicato).

### F-C: SPRT funziona e paga

14/50 trial troncati = 352 run risparmiate (18%% del budget 2000). I
troncamenti sono tutti su trial alto-WR dopo che la colonna 4 era satura
(5/5 righe) -- semantica corretta. Wall-time simile alla run non-SPRT
(894s vs 862s) perche' la wave-barrier limita il guadagno: il beneficio
cresce con --iterations alti o shard piu' lenti.

## Ref

- Run precedente: docs/research/2026-07-02-map-elites-v2-run-results.md (PR #3182)
- v2 + gate: docs/research/2026-07-02-map-elites-v2-dryrun-gate.md (PR #3181)
- Manifest SoT knob_space: docs/playtest/canonical-suite.yaml (G2 P1)
- OD-032 C enemy_damage lethality lever
