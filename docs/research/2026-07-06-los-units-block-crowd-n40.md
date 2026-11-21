# LOS units_block_los ratify N=40 -- geometria crowd (corpo alleato sulla linea)

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/los-repos-probe.js` @ `0feab14c4`
Base: main POST-FLIP `51e551266` (#3226: `COMBAT_LOS_ENABLED` default ON, sistema reposition
pinnato a budget 1 = step). Stato: RATIFY asse C2 (N=40, seed appaiati). Chiude il gap
"units_block_los non-misurato" del report `2026-07-06-los-flip-ratify-n40.md` (PR #3223): la
fixture lane/wide e' strutturalmente CIECA all'asse (1 attaccante + 1 nemico per corsia, endpoint
esclusi da squareLos -> nessun terzo corpo sta mai sulla linea di tiro; delta 0 garantito per
costruzione).

## Fixture `crowd` (probe v2.3)

Per corsia: attaccante x=1, corpo ALLEATO x=3 sulla linea di tiro, nemico x=5; NESSUN blocker
terrain in-lane (i muri separatori y=3/y=7 restano). L'alleato e' un prop di fixture:
player-controlled ma MAI pilotato dal loop del probe (non in rosterIds); hp 24 / dc 12 per reggere
la linea nei primi round a enemyScale 2.0. Con `units_block_los: true` il corpo blocca il tiro
dritto in ENTRAMBE le direzioni; con `false` linea libera.

## Configurazione

- Asse: `data/core/balance/los.yaml units_block_los` (letto da losBlockers.js, cache fredda per
  processo). 2 varianti worktree (true / false); la variante true NON e' mai stata committata.
- Modo `flip`: arm ON = `COMBAT_LOS_ENABLED=true` + repositioning reale; arm OFF = flag PINNATO a
  `'false'` = l'opt-out esplicito post-flip (#3226: i reader gate-ano su `=== 'false'`, un delete
  lascerebbe la LOS ATTIVA -- il gotcha "default cambiato" e' gestito e verificato). Provenienza
  per-arm nel JSON: `los_flag_env` on='true' / off='false' verificato in entrambi i run.
- Sistema reposition = step (budget pinnato a 1 in `declareSistemaIntents.js`, #3226); il seam
  player del probe resta budget two-phase (knob `COMBAT_LOS_REPOSITION_MODE` non settato).
- Banda: `enemyScale 2.0`, `enemyRange 4` (stessa banda de-ceilinged del ratify #3223).
- N=40 per run, seed appaiati 1..40, child process per arm (module graph fresco).
- Positive-control nuovo (fallibile in entrambe le direzioni): il predicato units-aware di
  produzione (`losClearOnGrid(grid, from, to, units)`) DEVE body-bloccare 3/3 coppie lane con
  config true e lasciarle libere 3/3 con false; gate terrain invertito (0 coppie terrain-blocked).
  Esito: true -> body_blocked 3/3, terrain 0; false -> body_blocked 0, terrain 0. PASS.
- Gate operativo: drain porte effimere tra i run (TIME_WAIT < 3000, poll 45s; il run true ha
  lasciato ~16.3k TIME_WAIT) + checkpoint per-file (resume idempotente).

## Risultati

| units_block | arm | WR    | CI95 Wilson   | W/D/T   | avg round |
| ----------- | --- | ----- | ------------- | ------- | --------- |
| true        | ON  | 0.150 | [0.071,0.291] | 6/0/34  | 36.88     |
| true        | OFF | 0.800 | [0.652,0.895] | 32/0/8  | 19.00     |
| false       | ON  | 0.525 | [0.375,0.671] | 21/0/19 | 25.60     |
| false       | OFF | 0.800 | [0.652,0.895] | 32/0/8  | 19.00     |

**Asse units_block (arm ON, true vs false, seed appaiati): dWR = -0.375** (0.525 -> 0.150, CI95
non sovrapposti), **dRound = +11.28** (25.60 -> 36.88), timeout 19 -> 34.
Repositioning counters arm ON: real_calls 10970 / nonnull 8257 (true) vs 262 / 96 (false).

Consistenza interna: arm OFF IDENTICO nei due run (32/0/8, WR 0.800, 19.00 round) -- a LOS spento
la config non viene mai letta e i seed sono appaiati, quindi il controllo replica byte-identico.
Conferma che il confronto e' pulito (zero rumore cross-run).

Robustezza pre/post-flip: la coppia di run era stata eseguita ANCHE su main pre-#3226 (sistema
reposition budget full-AP): run true BYTE-IDENTICO (stessi 40 esiti, stessi counter -- in crowd
il tile 1-step terrain-clear esiste sempre e la metrica cost-first lo sceglieva gia', quindi il
clamp budget-1 e' un no-op); run false stesso WR 0.525 ma mix esiti diverso (21/11/8 -> 21/0/19:
il sistema step insegue meno -> le sconfitte diventano timeout). L'asse dWR -0.375 e' identico
nelle due misure.

## Meccanismo (replay seed 1, arm ON, config true)

Stallo BILATERALE, ground-truthed con replay loggato round-per-round:

1. **Oscillazione attaccanti**: la policy player gate-a l'attacco units-aware
   (`combat-policy.js` threada `units`) ma `stepToRegainLos` e' TERRAIN-ONLY by-design
   (`losReposition.js:29-30`): da (1,y) propone (2,y) (terrain-clear), il corpo resta interposto,
   da (2,y) ripropone (1,y) -- mirror-dance infinito, zero attacchi. ranged_2/ranged_3: 120 azioni
   (cap del guard) nel seed 1, quasi tutte move.
2. **Sistema idle / no-retarget**: il sistema AI sceglie il target PRIMA (selezione LOS-blind),
   poi il gate LOS declassa attack -> approach con reposition pinnato SUL target scelto
   (`declareSistemaIntents.js` passa `[target]`, "do not switch enemies" by-design): foe_2/foe_3
   restano fermi a (5,y) senza mai ritargettare il corpo alleato VISIBILE a 2 tile.
3. **Asimmetria edge-row** (pre-esistente, vale per tutte le geometrie): la corsia y=1 ha la riga
   di bordo y=0 come scappatoia diagonale -- foe_1 la usa e risolve (colpisce ranged_1 aggirando
   il corpo); le corsie y=5 (boxed piena) e y=9 no. Da cui i 6 win residui a config true.

Nota difensiva: zero sconfitte in ogni arm ON post-flip -- a config true il corpo scherma anche
i tiri nemici (e pre-flip azzerava le 11 sconfitte del run false). L'asse alza la difesa e
ammazza l'offesa: il collasso WR e' interamente da timeout.

## Verdetti

1. **L'asse ora e' misurato e NON e' neutro**: units_block ON su una linea affollata costa
   dWR -0.375 e +11.28 round, con l'85% degli incontri in stallo (34/40 timeout). Il flip
   eseguito oggi (#3226) a `units_block_los=false` e' COERENTE col dato: la config deve restare
   false.
2. **Il collasso e' comportamentale, non geometrico**: entrambe le AI trattano l'occlusione da
   corpo come un blocco che il loro strumento di sblocco non vede (reposition terrain-only) e
   che la loro selezione target non aggira (no-retarget). Flippare units_block_los senza (a)
   reposition body-aware e (b) retarget su target visibile = stallo patologico.
3. **Costo combinato su questa fixture**: a config true, LOS ON-vs-OFF = dWR -0.65 (vs -0.275 a
   config false). Prerequisito per accendere l'asse corpo: le due fix AI del punto 2, POI
   ri-misura su crowd.
4. Baseline OFF crowd (0.800) non confrontabile con OFF lane #3223 (0.850): fixture diversa
   (3 corpi in piu' cambiano occupancy/aggro). I confronti validi sono within-fixture.

## Gap dichiarati

- `stepToRegainLos` body-blind: documentato by-design in `losReposition.js`; la fix e' fuori
  scope di questo probe (misura, non patch).
- Sistema no-retarget su target LOS-bloccato: by-design (commit-window/stickiness); asse di fix
  separato.
- Ally prop hp 24 / dc 12 non balance-representative: fixture worst-case (corpo perfettamente
  interposto in corridoio isolato), non stima dell'impatto medio in partita reale.
- Timeout baseline 8/40 anche a LOS OFF: proprieta' della banda scale 2.0 / range 4 su questa
  fixture, simmetrica su tutti gli arm.
