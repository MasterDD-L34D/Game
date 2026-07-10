---
title: 'Re-ratify N=40 substrate-ON -- 3 grid_sized sotto MOVE_TERRAIN_COST + XP_BUDGET_GEOMETRY (hazard_xp misurato 0)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-10'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Re-ratify N=40 substrate-ON -- dorsale / canyon / abisso sotto MOVE_TERRAIN_COST + XP_BUDGET_GEOMETRY

Data: 2026-07-10 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/grid-band-probe.js` (generico)
Base: origin/main `faf55c33e`. Stato: RATIFY (N=40, paired seeds 1..40 vs baseline 07-06).
Metodo + semantica banda: `docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md` (authority).

## 1. Perche' questo re-probe (finding RED fleet-verify 2026-07-09)

I 3 encounter `board_scale: grid_sized` sono stati ratificati N=40 il 2026-07-06 con
`MOVE_TERRAIN_COST_ENABLED=OFF`; in prod ora il flag e' ON insieme a
`XP_BUDGET_GEOMETRY_ENABLED=true`. Il repo stesso lo esigeva:

- `docs/research/2026-07-06-abisso-colata-grid-ratify.md` sez. Gap dichiarati: "un flip
  futuro di MOVE_TERRAIN_COST su questo encounter richiede re-probe (L-069 non si
  trasferisce fra semantiche di costo)".
- `data/core/balance/xp_budget.yaml` geometry: "hazard_xp resta PROPOSED e si ratifica
  quando il substrate flippa".

Metodo identico ai ratify 07-06 (stesso harness, stesso party canonico, pressure_start 50,
node v24.11.0); unica differenza dichiarata = env `MOVE_TERRAIN_COST_ENABLED=true` +
`XP_BUDGET_GEOMETRY_ENABLED=true` alla launch. Seed NUMERICI 1..40 (post fix #3232
passthrough) -> confronto PAIRED per-seed contro i runs.jsonl baseline 07-06.

## 2. Direction N=10 (seeds 1..10, paired)

| Encounter     | Baseline avg (1..10) | ON avg | Delta medio                     | Banda 07-06 | Verdetto        |
| ------------- | -------------------- | ------ | ------------------------------- | ----------- | --------------- |
| dorsale 16x12 | 13.3                 | 14.1   | +0.8                            | [10, 18]    | in banda        |
| canyon 20x12  | 12.4                 | 18.3   | **+5.9**                        | [10, 17]    | **FUORI BANDA** |
| abisso 18x10  | 14.0                 | 14.0   | **0** (10/10 per-seed identici) | [10, 18]    | in banda        |

Canyon fuori banda (7/10 run oltre 17, max 23) -> N=40 su tutti e 3 (canyon obbligatorio;
abisso = evidence per la ratifica hazard_xp; dorsale = claim banda-invariata, L-069 non
trasferisce fra semantiche).

## 3. Risultati N=40 (faithful arm, seeds 1..40, paired)

| Metric                | dorsale 16x12            | canyon 20x12                  | abisso 18x10             |
| --------------------- | ------------------------ | ----------------------------- | ------------------------ |
| completion (WR)       | 1.000 (40/40)            | 1.000 (40/40)                 | 1.000 (40/40)            |
| WR CI95 Wilson        | [0.912, 1.0]             | [0.912, 1.0]                  | [0.912, 1.0]             |
| avg_rounds (pace)     | 14.07 (sd 1.54, 11-17)   | **19.32 (sd 3.98, 11-27)**    | 13.85 (sd 0.98, 12-17)   |
| delta paired vs 07-06 | +0.05 CI95 [-0.66,+0.76] | **+6.47 CI95 [+5.17,+7.78]**  | -0.15 CI95 [-0.50,+0.20] |
| creature_ko_rate      | 0.0063                   | 0                             | 0.0063                   |
| avg_reinforcements    | 4.00 (a cap)             | 4.00 (a cap)                  | 4.00 (a cap)             |
| timeouts              | 0                        | 0 (time_limit 30)             | 0 (time_limit 25)        |
| banda pace verdict    | **[10, 18] CONFERMATA**  | **[10, 28] NUOVA RATIFICATA** | **[10, 18] CONFERMATA**  |

Wiring proof osservato a ogni batch (board autorata + terrain_features su session.grid,
LOS default ON #3226). Letalita' = ceiling di modello come nei ratify 07-06 (invariato).

### Canyon: banda nuova [10, 28]

Il costo-terreno morde sui detour lunghi della serpentina: profilo medium (default) paga
roccia 1.5x / lava 1.5x (heavy 2.0x) su traversata ~19 celle con doppio chokepoint ->
pace +6.47 round medi, tail 27 su time_limit 30 (margine 3, zero timeout su 40).
Watch dichiarato: un aumento futuro del costo roccia o della lunghezza di traversata
va ri-probato contro il time_limit (anti-dead-time).

### Abisso: delta zero -- la lava non morde

25/40 seed con delta ESATTAMENTE 0, delta medio -0.15 CI95 [-0.50, +0.20] (attraversa lo
zero). Il fiume di lava (x=8-9) ha il varco a y=4-5 dentro la cornice di roccia: il
pathing passava dal varco a substrate OFF e continua a passarci a substrate ON. Le 18
tile lava non entrano mai nel percorso pagato.

## 4. hazard_xp: ratifica del termine (PROPOSED -> MEASURED-0)

Il termine hazard di D9 (Shape 1) prediceva flag-ON+substrate-ON:

| Encounter | used (audit /start, party 4)    | ratio | status        | Fight misurato N=40           |
| --------- | ------------------------------- | ----- | ------------- | ----------------------------- |
| dorsale   | 221 + 4 lava x 40 x 1.2 = 413   | 2.07  | critical_over | WR 1.0, delta pace +0.05      |
| canyon    | 221 + 4 lava x 40 x 1.2 = 413   | 2.07  | critical_over | WR 1.0, delta pace +6.47      |
| abisso    | 221 + 18 lava x 40 x 1.2 = 1085 | 5.43  | critical_over | WR 1.0, delta pace -0.15 (~0) |

Doppia falsificazione della shape per-tile flat (misurata, non ipotizzata):

1. **Predice dove non succede niente**: abisso ha il warn peggiore (5.43) e delta reale 0.
2. **Non predice dove succede**: il pace-tax vero (canyon +6.47) viene dalla ROCCIA dei
   detour -- che non e' in `hazard_set` -- e il warn canyon era identico a dorsale (2.07)
   contro delta +6.47 vs +0.05.

Correzione applicata (questa PR): `hazard_xp: {lava: 0, acqua_profonda: 0}` -- valori
MEASURED-0 con evidence, non piu' PROPOSED-SDMG. Post-fix i 3 grid_sized sotto flag prod
= `used 221 / ratio 1.11 / in_band` = l'unico arm che concorda col fight misurato
(stessa conclusione della calibrazione 2026-07-06, ora estesa a substrate ON).
Struttura invariata: `hazard_set`, il gate su MOVE_TERRAIN_COST in `xpBudget.js` e i
test (resi config-driven) restano -- un valore futuro non-zero riattiva il termine senza
toccare codice.

**v2 candidata (OD, decider Eduardo)**: predittore path-tax geometrico (costo del
cheapest-path spawn->contatto sotto profilo medium vs Manhattan) al posto della massa
per-tile; e' l'unica shape coerente con entrambe le falsificazioni. Non implementata qui
(SDMG: metodo self-designed = ipotesi, serve falsificazione esterna prima
dell'integrazione).

## 5. Effetto sul prod (Lenovo CODEMASTERDD)

Oggi il /start dei 3 grid_sized logga `critical_over` (2.07/2.07/5.43) = warn fuorviante
(D9 e' warn-only, nessun block). Al deploy di questa PR il warn sparisce (in_band non
logga). Nessun cambio runtime di combat: la correzione tocca solo il modello di audit.

## 6. Gate eseguiti

- `node --test tests/services/xpBudget.test.js` **21/21** (2 test riscritti DICHIARATI:
  gli assert hazard ora leggono `hazard_xp.lava` dal config -- meccanica verificata per
  qualunque valore, valore corrente 0).
- Audit arms post-fix: 3/3 `ratio 1.11 in_band` sotto `XP_BUDGET_GEOMETRY_ENABLED=true`
  - `MOVE_TERRAIN_COST_ENABLED=true` (script inline, output nel PR).
- `tools/js/validate_encounter_grid_ratify.js`: 0 warn (baseline aggiornato).

## 7. Artifacts

- `reports/sim/{dorsale-ferrosa,canyon-lungo,abisso-colata}-n10-terrain-on/` (direction)
- `reports/sim/{dorsale-ferrosa,canyon-lungo,abisso-colata}-n40-terrain-on/` (ratify;
  runs.jsonl 40 righe + summary.json ciascuno)
- Log batch: `Extras/ollama-runs/2026-07-10-grid-terrain-reprobe.log` (repo codemasterdd)
- Baseline paired: `reports/sim/{...}-n40/` (07-06, invariati)

## 8. Baseline + bande aggiornate (questa PR)

- `data/core/balance/grid_ratify_baseline.json`: evidence_ref -> questo doc,
  ratified_at 2026-07-10 (3 encounter; grid_size invariati).
- `docs/core/15-LEVEL_DESIGN.md`: canyon banda [10, 17] -> [10, 28] (substrate-ON);
  dorsale/abisso confermate [10, 18]; aggiunta riga abisso 18x10 (mancava dalla
  tabella); nota semantica-costo sulla tabella.

## 9. Rollback

- Revert del commit (doc + yaml + test + bande + baseline sono un'unita' atomica).
- Solo-valori: ripristinare `hazard_xp: {lava: 40, acqua_profonda: 30}` in
  `xp_budget.yaml` (i test config-driven seguono) + revert bande/baseline.
- Nessuna migrazione, nessun flag runtime toccato da questa PR.

## 10. Gap dichiarati

- Letalita' resta ceiling di modello (driver AI-vs-AI, dial intents_per_round) --
  stessa semantica banda dei ratify 07-06: completion + pace + liveness.
- `acqua_profonda` azzerata per coerenza di shape ma MAI esercitata da un encounter
  grid_sized: quando esistera' un esemplare acqua, re-probe dedicato.
- Party badlands canonico su bioma abisso: gap ereditato dal ratify 07-06 (dichiarato
  li'), invariato per comparabilita' paired.
- Il pace-tax canyon avvicina il tail al time_limit (27 su 30): ogni ulteriore aumento
  di costo/traversata su quel layout richiede re-probe mirato.
