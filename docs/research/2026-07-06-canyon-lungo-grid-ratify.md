# Grid-ratify N=40 -- enc_badlands_canyon_lungo_01 (secondo grid_sized, cap 20x12)

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/grid-band-probe.js` (GENERICO)
Base: stacked su feat/enc-grid-sized-first-16x12 (PR #3229). Stato: RATIFY (N=40).
Metodo + semantica banda: `docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md` (authority).
Valori encounter = PROPOSED (SDMG).

## Cosa aggiunge questo doc

1. **Cap larghezza esercitato**: prima board a `grid_size: [20, 12]` (max enum schema = 20).
   Wiring proof: board giocata 20x12, 34 terrain features su session.grid, LOS default ON.
2. **Probe GENERALIZZATO**: `grid-band-probe.js --encounter <id>` -- stesso harness del ratify
   dorsale (tier table, canonical party, driver multi-unit, checkpoint resume, drain-gate
   5000), riusabile per ogni grid_sized futuro (e per gli A/B del lavoro D4 sul dial).
3. **Secondo esemplare** del path grid_sized: il wiring #3199 non e' piu' un one-off.

## Design (delta vs dorsale)

- **Doppio chokepoint SERPENTINA**: cresta A (x=6, gate y5-6) + cresta B (x=13, gate y4-5
  SFALSATO) -> il crossing cambia lane due volte. 34/240 celle (~14%), no fill uniforme.
- **Gate presidiato per occupancy**: le 2 echo elite spawano DENTRO le celle del gate B --
  muro fisico vero (i player devono abbatterle per passare), non solo LOS.
- Lezioni dorsale applicate a monte: pochi-forti-vicini (3 unita' wave-1), valvola finita
  (cap 4), elimination + time_limit 30.

## Risultati N=40 (faithful arm, seeds 1..40)

| Metric | N=40 | Note |
| --- | --- | --- |
| completion (WR) | **1.000** (40/40) | |
| WR CI95 Wilson | [0.912, 1.0] | |
| creature_ko_rate | 0.025 | ceiling di modello atteso (vedi doc dorsale); 1 KO al gate |
| avg_rounds (pace) | **12.85** (sd 1.25, min 11, max 16) | banda pace RATIFICATA 20x12: [10, 17] |
| avg_reinforcements | 4.00 (40/40 a cap) | liveness spawner: valvola sempre esaurita |
| timeouts | 0 | time_limit 30 mai raggiunto |

Artifacts: `reports/sim/canyon-lungo-n40/` (runs.jsonl 40 righe + summary.json).

Direction N=10: 10/10, pace 12.4 (sd 1.07), reinf 4/4 -- stabile, direction regge sulla
semantica completion+pace+liveness.

## Nota comparativa (geometria -> pace)

Dorsale 16x12 (192 celle, pack a meta' mappa): pace 14.03. Canyon 20x12 (240 celle, pack
FERMO sul gate B): pace 12.85 -- la board PIU' GRANDE gioca PIU' VELOCE. La distanza al
primo contatto e la mobilita' del pack contano piu' dell'area totale: conferma misurata
del finding "l'area da sola e' un proxy sbagliato" (ricerca sez. 5.2, anti fattore-area
nel gate xpBudget).

## Baseline update

`grid_ratify_baseline.json` += `enc_badlands_canyon_lungo_01: { grid_size: [20,12],
evidence_ref: questo doc, ratified_at: 2026-07-06 }` -> validator 0 warn.

## Gap dichiarati

- Stessa semantica/limiti del doc dorsale (letalita' = ceiling di modello, non ratificata).
- Occupancy-gate: misurato solo indirettamente (pace); un probe dedicato "breach time" =
  eventuale follow-up quando il dial D4 scala.
