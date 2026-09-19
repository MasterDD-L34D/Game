---
title: 'Overcharge action-economy -- N=40 evidence (OD-058 D1)'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, od-058, overcharge, action-economy, n40, ratification, p6]
---

# Overcharge (+1 AP) action-economy -- N=40 evidence (2026-06-10)

Evidence pack per il gate **OD-058 D1** (issue #2531): "N=40 action-economy probe
su overcharge (scenario con build +1AP/turno; rischio chain 2 azioni pesanti).
Gate prima di accreditare verso P6". Il verb e' live da #2481
(`overchargeEngine.js`: spend 3 SG -> +1 AP this turn, player-only, once/turn,
gauge POOL_MAX=3 -> per design non chain-abile back-to-back senza ri-accumulo).

Posture L-069: questo documento RIPORTA; l'accredito verso P6 e' verdetto
master-dd.

## Setup

- Harness: `tools/sim/overcharge-probe.js --runs 40 --seed-base 41000` (nuovo,
  paired-arms; pattern fp-delta-probe #2701 + repliche noise-floor a13 #2702).
- Scenario: `enc_hardcore_reinf_01` (elimination 5/5, reinforcement_pool attivo)
  con overlay difficolta' `{countAdd:6, hpAdd:4, modAdd:6, dcAdd:2}` -- scelto
  con mini-probe per portare la baseline FUORI dal ceiling (il greedy sim satura
  ~1.0 sul fight authored; L-069: scelta del punto di misura, NON banda
  ratificata).
- Roster: 2x skirmisher **ap:2** (canone `90-FINAL-DESIGN-FREEZE §7.1` "2 AP
  base"; il roster band full-loop usa ap:3 e avrebbe mis-misurato il marginale
  del +1).
- 4 armi, stessi seed (oc-41000..41039):
  - `control` -- status quo (overcharge mai chiamato);
  - `control2` -- replica del control = **noise floor** per-seed (il seed pinna
    l'RNG di sessione ma residui non-seeded -- es. reinforcement roll -- rendono
    i replay non identici);
  - `live` -- `overcharge:'greedy'` (accrual SG organico, sgTracker 5-taken/8-dealt);
  - `seeded` -- greedy + `initial_sg:3` su tutti i player (worst-case chain dal
    turno 1).
- Adapter esteso (TDD, default byte-identical): opt-in `overcharge:'greedy'` +
  `initialSg` + counter `overchargeUses`/`playerAttacks`.
- Artifacts: `reports/sim/overcharge-n40-2026-06-10/{control,control2,live,seeded}/`.

## Risultati

| arm | n | win rate (Wilson CI95) | rounds (tick) | player attacks | overcharge uses |
| --- | --- | --- | --- | --- | --- |
| control | 40 | 0.90 [0.77, 0.96] | 83.5 +/- 7.0 | 49.5 | 0.00 |
| control2 (floor) | 40 | 0.90 [0.77, 0.96] | 82.2 +/- 7.8 | 48.5 | 0.00 |
| live (greedy) | 40 | **0.65** [0.50, 0.78] | 80.7 +/- 7.9 | 49.4 | 9.60 |
| seeded (worst-case) | 40 | **0.72** [0.57, 0.84] | 80.5 +/- 9.9 | 49.6 | 10.70 |

Paired per-seed (stessi 40 seed):

| pair | win-rate delta | rounds delta (CI95) | attacks delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- | --- |
| control2 - control (noise floor) | 0.00 | -1.3 [-4.5, 1.9] | -1.0 [-2.9, 1.0] | 4 / 4 |
| live - control | **-0.25** | -2.9 [-5.7, 0.0] | -0.1 [-1.9, 1.7] | **2 / 12** |
| seeded - control | **-0.17** | -3.0 [-6.9, 0.8] | 0.1 [-2.3, 2.5] | 4 / 11 |

### Findings

- **F1 -- Verb esercitato davvero**: 9.6 (organico) / 10.7 (seeded) overcharge
  per run; l'accrual sgTracker (5-taken/8-dealt, cap 3) ricarica la gauge in
  continuazione su un fight lungo. Il gap anti-#14 ("gli scenari esistenti non
  esercitano overcharge") e' chiuso dall'opt-in adapter.
- **F2 -- Greedy overcharge NON e' free-value: -25pp win-rate, oltre il floor.**
  Flips 12 W->L contro 2 L->W (floor: 4/4 simmetrico, delta 0.00). L'arm
  worst-case (gauge piena dal turno 1) conferma direzione (-17pp). Il temuto
  snowball player ("rischio chain 2 azioni pesanti") NON si manifesta: a
  fidelity sim il greedy use e' una LIABILITY.
- **F3 -- Meccanismo (design note, non verdetto)**: l'AP extra converte in kill
  piu' veloci -> `sistema_pressure` +20 per kill player (`PRESSURE_DELTAS
  pg_kills_sis`) -> tier sale prima -> `enc_hardcore_reinf_01` ha
  reinforcement_pool: l'escalation spawna prima/di piu' e il party da 2 viene
  travolto. Overcharge = "borrow tempo dal Sistema": il prestito ha interesse.
- **F4 -- Output piatto, run piu' corte**: attacks delta ~0 (CI [-1.9, +1.7]),
  rounds -2.9: i turni overcharged attaccano di piu' ma le run (sconfitte)
  finiscono prima -- il guadagno tattico non diventa guadagno strategico.

## Domande per la ratifica (master-dd)

1. **Il coupling pressure e' intenzionale?** "Spendi tempo preso in prestito ->
   acceleri l'escalation del Sistema" e' un anti-spam emergente elegante (il
   verb resta forte nel singolo turno, costoso nella partita). Se SI ->
   ratify-as-built e l'accredito P6 puo' citare questa evidence ("overcharge =
   scelta tattica con costo strategico, non free-value"). Se NO (il verb
   dovrebbe essere net-neutral o net-positive a uso giudizioso) -> serve
   taratura (es. pressure delta ridotto sui kill in turni overcharged, o costo
   SG variabile).
2. **Telegraph del costo strategico**: il player vede l'AP comprato (gauge), ma
   il costo (pressure -> rinforzi) e' visibile solo via AI Progress meter.
   Serve un hint surface dedicato ("il Sistema reagisce al tuo tempo rubato")?
   Gate-5 question, non blocca D1.
3. **Fidelity**: policy = solo attacchi base. Player reali convertono l'AP in
   abilita' cost_ap 3 (burst piu' efficiente, forse MENO kill-events/pressure).
   Re-validate su player data quando il tier arriva (pattern #2693).

## Verdetto (master-dd 2026-06-10, sessione interattiva)

- [x] **Q1 coupling pressure: INTENZIONALE, ratify-as-built.** Overcharge =
  scelta tattica con costo strategico ("borrow tempo dal Sistema: il prestito
  ha interesse"), anti-spam emergente senza knob. L'accredito P6 puo' citare
  questa evidence.
- [x] **Q2 telegraph: SI, hint leggero** -- ticket separato #2716 (Gate-5
  surface, non gating).
- [x] **Q3 fidelity**: re-validate su player data quando il tier arriva
  (pattern #2693, policy standard).

## Caveat strutturali

- La policy sim condivisa fa SOLO attacchi base (1 AP) e mai abilita' cost_ap
  2-3: i delta misurano il +1 AP come "un attacco base in piu' per turno
  overcharged" = **floor conservativo** dello swing. Player reali incatenano
  abilita' pesanti (cost_ap 3) sull'AP preso in prestito.
- Win-rate del greedy sim su fight authored = saturo (~1.0): l'overlay
  difficolta' e' il punto di misura, non una banda. Su player reali lo swing
  relativo sara' diverso (stesso caveat di #2701).
- Kill piu' veloci alzano `sistema_pressure` (+20/kill player) -> tier/rinforzi:
  l'effetto netto include questo feedback loop, by design (e' l'economia
  d'azione REALE del sistema, non il verb isolato).

## Riproduzione

```bash
GIT_COMMIT=$(git rev-parse HEAD) node tools/sim/overcharge-probe.js \
  --runs 40 --seed-base 41000 \
  --scaling '{"countAdd":6,"hpAdd":4,"modAdd":6,"dcAdd":2}' \
  --out reports/sim/overcharge-n40-2026-06-10
```

## Stato gate D1

Probe costruito + N=40 eseguito: il box D1 "N=40 action-economy probe" di #2531
e' soddisfatto come EVIDENCE. L'accredito verso P6 (e l'eventuale taratura del
costo/cap del verb) resta verdetto master-dd sulle domande sopra.
