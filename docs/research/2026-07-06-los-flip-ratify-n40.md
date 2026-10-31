# LOS flip ratify N=40 -- matrice 3 arm x 2 geometrie (banda de-ceilinged)

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/los-repos-probe.js` @ main `5f384de25`
Sessione: fixture de-ceiling post PR #3214 (active_unit onesto). Stato: RATIFY (N=40); direzione N=10 in coda al doc.

## Contesto

Il verdetto flip del 2026-07-06 notte (PR #3213/#3216) lasciava la letalita' NON testata: la fixture
del probe flip era strutturalmente un-losable (WR 1.0/1.0 entrambi gli arm, nessun knob la staccava).
Ipotesi dell'epilogo: il workaround action-economy su active_unit affamava la pressione nemica, e il
fix #3214 poteva sbloccarla. **Confermata**: su main post-#3214, senza alcuna modifica al probe, la
banda scale 2.0 / enemyRange 4 produce sconfitte in entrambi gli arm.

## Configurazione

- Modo `flip`: arm ON = `COMBAT_LOS_ENABLED=true` + repositioning reale; arm OFF = flag assente
  (nessun vincolo LOS = comportamento live attuale).
- Banda: `enemyScale 2.0`, `enemyRange 4` (soglia de-ceiling tra 1.5 e 2.0 a range 4).
- Arm repositioning via `COMBAT_LOS_REPOSITION_MODE`: `off` / `step` (greedy 1-tile shipped) /
  unset (`budget` lookahead multi-tile, PR #3217).
- N=40 per cella, seed appaiati 1..40, child process per arm (module graph fresco).
- Gate operativo: drain porte effimere tra i run (un run N=40 genera ~16k TIME_WAIT su Windows;
  senza drain i run successivi muoiono EADDRINUSE in cascata). Dettaglio in memoria operativa.

## Risultati

| geom | euristica | WR ON | CI95 Wilson | W/L/T | round ON | WR OFF | dWR | dRound |
|------|-----------|-------|-------------|-------|----------|--------|------|--------|
| lane | off    | 0.600 | [0.45,0.74] | 24/16/0 | 13.80 | 0.850 | -0.250 | +1.55 |
| lane | step   | 0.700 | [0.55,0.82] | 28/12/0 | 12.95 | 0.850 | -0.150 | +0.70 |
| lane | budget | 0.700 | [0.55,0.82] | 28/12/0 | 12.57 | 0.850 | -0.150 | +0.32 |
| wide | off    | 0.725 | [0.57,0.84] | 29/11/0 | 13.43 | 0.850 | -0.125 | +1.18 |
| wide | step   | 0.700 | [0.55,0.82] | 28/12/0 | 13.22 | 0.850 | -0.150 | +0.97 |
| wide | budget | 0.675 | [0.52,0.80] | 27/13/0 | 12.47 | 0.850 | -0.175 | +0.22 |

Consistenza interna: arm OFF = 0.850 identico in tutti e 6 i run (seed appaiati + repositioning mai
attivo a LOS spento -> il controllo replica deterministicamente; conferma assenza di rumore cross-run
nel confronto). Positive-control fixture 3/3 coppie bloccate in ogni run; zero timeout (240 encounter).

## Verdetti

1. **LOS costa letalita' vera**: dWR -0.125..-0.25 su tutte le celle, oltre al costo pace. La
   meccanica sposta il balance (atteso by-design); la TAGLIA ora e' misurata sulla banda dura.
   A banda mite (scale 1.5) il costo WR e' invisibile (ceiling 1.0/1.0): il costo si concentra
   sugli incontri difficili.
2. **step-vs-budget: nessuna separazione outcome**, nemmeno su geometria wide costruita per
   distinguerli (il positive-control prova che budget raggiunge tile di riapertura che step non
   vede: budget1=0/3, budget2=3/3 -- ma non converte in WR). Valore di budget = SOLO pace
   (dRound 0.22-0.32 vs 0.70-0.97 di step vs 1.18-1.55 di off).
3. **Euristica on-vs-off** (lane): +0.10 WR trend positivo, CI95 sovrapposti -> direzione, non prova.
   Il repositioning NON e' inerte nella banda de-ceilinged (contrariamente al regime ceiling di ieri).

## Direzione N=10 (pre-ratify, stessa banda)

lane s1.5 r4: 1.0/1.0 (ceiling) | lane s2.0 r4: ON 0.6 / OFF 0.9 | wide s2.0 r4: ON 0.5 / OFF 0.9.

## Gap dichiarati (non coperti dalla matrice)

- Board mirror-wall anti-oscillazione (raccomandazione game-design-validator): non implementata.
- Asse `avoidBlockerTiles` A/B: rimandato per scelta owner (matrice 6 run, non 12).
- K4 recognizer `_LOS_BLOCKED` vs oscillazione documentata: decisione design, non misurabile qui.

## Decisioni owner a valle (docs/quality/2026-07-06-los-reposition-budget-QUALITY.md)

1. Default prod budget-vs-step: i dati NON giustificano budget su outcome; budget vince solo pace.
2. avoidBlockerTiles: asse ancora aperto.
3. Flip `COMBAT_LOS_ENABLED`: costo misurato; la scelta se/quando flippare e' design, non piu' bloccata
   da assenza di misura. Condizione C2 (units_block_los / UI-tell pre-Godot) resta aperta.
