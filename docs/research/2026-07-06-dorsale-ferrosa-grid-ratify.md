# Grid-ratify N=40 -- enc_badlands_dorsale_ferrosa_01 (primo encounter grid_sized 16x12)

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/dorsale-ferrosa-band-probe.js`
Base: origin/main `ab0a7482a` (LOS default ON #3226, tests/sim in CI #3228)
Stato: RATIFY (N=40 faithful arm); iterazioni direction N=10 in coda al doc. Valori encounter = PROPOSED (SDMG).

## Cosa ratifica questo doc

Primo encounter `board_scale: grid_sized` (ADR-2026-07-03, wiring #3199): board AUTORATA 16x12
(192 celle), non piu' party fill-ratio. L-069: ogni cambio grid -> N=10 probe -> N=40 ratify.
Baseline aggiornata in `data/core/balance/grid_ratify_baseline.json` con `evidence_ref` = questo doc.

**La banda ratificata e' completion + pace + reinforcement-liveness, NON una banda di letalita'**:
sul driver round-model AI-vs-AI la letalita' e' ceiling strutturale (WR 1.0 in OGNI arm, vedi
"Limite di modello"). Un resize futuro si confronta su completion/pace: se il resize sposta
avg_rounds o completion fuori banda, il guard L-069 ha morso.

## Design dell'encounter (principi densita' applicati)

Ricerca big-map 2026-07-03 (codemasterdd) sez. 3 + decisioni D1-D10; spec geometry-gate sez. B3:

| Principio (B3) | Applicazione |
| --- | --- |
| Pochi nodi difendibili | 3 strutture: gola ovest (gate y5-6), dorsale centrale (gap y4-7), plateau est |
| Chokepoint LOS-reali | roccia/vegetazione_densa spezzano sightline (LOS default ON #3226); 36 celle tipizzate su 192 (~19%), NO fill uniforme |
| Spawn-zone curate | `reinforcement_entry_tiles` fianchi est + creste nord/sud, mai alle spalle del party; Manhattan >= 4 |
| Wave-close valve | `max_total_spawns: 4` = pressione FINITA (Gears E-hole), elimination chiudibile |
| Objective density | elimination + `loss_conditions.time_limit: 20` anti-turtle; contatto dal round 2-4 (intercept alla gola) |

Nota onesta: i blocker sono LOS-real OGGI; il costo movimento per-tile resta dietro
`MOVE_TERRAIN_COST_ENABLED` (OFF, non flippato qui) -> lava/typed-tiles = forward-compat inerte.

## Risultati N=40 (faithful arm, as-authored)

Party = canonical badlands tier party (`/api/tutorial/enc_badlands_pilot_01`), tier table
harness (base hp7/mod1, elite hp10/mod2, apex hp14/mod4), pressure_start 50 (Escalated),
seeds 1..40 appaiati, multi-unit round driver (`allPlayersActPerRound`, memo co-op 2026-07-05).

| Metric | N=40 | Note |
| --- | --- | --- |
| completion (WR) | **1.000** (40/40) | vittorie / N |
| WR CI95 Wilson | [0.912, 1.0] | |
| creature_ko_rate | 0.000 | KO party / slot (ceiling di modello, vedi sotto) |
| avg_rounds (pace) | **14.03** (sd 1.9, min 11, max 18) | banda pace RATIFICATA per la 16x12: [10, 18] |
| avg_reinforcements | 4.00 (40/40 run a cap) | liveness spawner: valvola sempre esaurita |
| timeouts | 0 | time_limit 30 mai raggiunto |

Artifacts: `reports/sim/dorsale-ferrosa-n40/` (runs.jsonl + summary.json). Resume checkpoint
esercitato live (batch ripreso a 30/40 dopo un kill manuale: 0 run persi).

Wiring proof (osservato a ogni batch): board `16x12`, `terrain_features: 36` su `session.grid`,
LOS env unset -> default ON.

## Direction N=10 (iterazioni, tutte archiviate in reports/sim/)

| Arm | WR | KO-rate | avg_rounds | Verdetto |
| --- | --- | --- | --- | --- |
| c1-c2 capture (clamp bug attivo) | 1.0 | 0-0.025 | 11-12 | GEOGRAFIA FALSA (bug clamp) |
| c3-c4 capture (clamp fixato) | 1.0 | 0 | 12-18, zero varianza | ceiling strutturale hold |
| c5 elimination (bug id/bounds attivi) | 0.3 | 0.075 | 31.8 | "morso" = interamente i 2 bug |
| c6 elimination faithful (bug fixati) | 1.0 | 0 | 13.3 | direction pace/completion STABILE |
| cal hp+3/mod+1/dc+1 | 1.0 | 0 | 15.7 | ceiling anche calibrato |
| cal-r4 (+range 4, mirror los banda dura) | 1.0 | 0 | 15.3 | ceiling anche ranged |

## Bug backend REALI trovati (e fixati in questa PR) -- il valore del primo grid_sized

La prima board grande/non-quadrata ha esposto 3 difetti che il parco 6x6-10x10 quadrato non
poteva vedere:

1. **Position clamp pre-resolve** (`routes/session.js`): le posizioni unita' venivano clampate a
   `GRID_SIZE-1` (5) PRIMA di `resolveBoardSize` -> spawn autorati a x=12-13 collassavano
   nell'angolo 6x6. Fix: bounds da `isAuthoredGrid` (inline o YAML via encounter_id).
   Test: `tests/api/sessionStartBoardScale.test.js` (+2).
2. **ID rinforzi duplicati** (`reinforcementSpawner.js`): la formula sommava total_spawned E il
   conteggio in-tick -> tick da 2 emetteva `reinf_1/reinf_3` e il tick dopo ripartiva da
   `reinf_3` = attori gemelli. Il resolve-by-id dell'attack colpiva il gemello sbagliato ->
   400 out-of-range -> attaccante congelato per il resto del fight. Fix: indice monotonico.
   Test: `tests/services/reinforcementSpawner.test.js` (+1).
3. **stepAway quadrato su board rettangolare** (`services/ai/policy.js` + 2 call-site): il bound
   scalare usava width per entrambi gli assi -> un'unita' in ritirata usciva DALLA board
   (apex a y=14 su height 12) = elimination unwinnable. Fix: bounds `{width,height}`
   back-compat. Test: `tests/ai/policy.test.js` (+2).

## Limite di modello (il finding di design, feed per D4/D9)

Sul driver round-model, il throughput sistema e' cappato da `intents_per_round`
(sessionHelpers TIERS: Calm 1 / Escalated 2 / Apex 3 azioni GLOBALI per round, indipendenti
dal roster). Party 4 unita' x 2 AP = 8 azioni/round vs 2-3 sistema:

- La letalita' AI-vs-AI e' ceiling su QUALSIASI authoring di questa taglia (misurato: faithful,
  hp+3/mod+1/dc+1, +range4 -> tutti WR 1.0, 0 KO; 2 attacchi sistema in 17 round su un seed
  strumentato, contro 21 del party).
- Roster sistema GRANDI peggiorano (2/13 = 15% attivo): su big-map "piu' nemici" != "piu'
  pressione". Coerente con la ricerca (activation count = lever #1) -- ma al runtime il lever
  e' cappato dal dial, non dal count autorato.
- **Chip design**: perche' le mappe grandi mordano in AI-playtest serve che il dial scali
  (per-board o per-roster: D4 threat-dial) e/o AI zone-defense per gli objective non-elim
  (la variante capture_point di questo encounter e' pronta nel layout, ceiling finche' l'AI
  non difende una zona).

## xpBudget geometry (flag OFF, osservato -- NON flippato)

Warn a /start (XP_BUDGET_GEOMETRY_ENABLED off): `budget 200 / used 590 / ratio 2.95 ->
critical_over`; `activation_ratio 0.75 -> under`. Il modello stat-mass dice "troppo duro"
mentre il fight misurato e' WR 1.0 player: OVER-predice perche' conta massa e ignora
l'action-economy (dial). Il campo passivo `activation_ratio` (Shape 2, #3197) e' il piu'
vicino al vero -- altro dato per la calibrazione D9 "warn poi promuovi".

## Baseline update

`grid_ratify_baseline.json` += `enc_badlands_dorsale_ferrosa_01: { grid_size: [16,12],
evidence_ref: "docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md", ratified_at:
"2026-07-06" }` -> `tools/js/validate_encounter_grid_ratify.js` = 0 warn sull'encounter.

## Gap dichiarati

- Banda di LETALITA' non ratificabile (ceiling di modello, non di mappa) -- si ratifica
  completion/pace/liveness. Un modello sistema piu' aggressivo richiede re-ratify.
- `fog_of_war`/`stress_wave` esclusi dal v1 (determinismo ratify); candidati al v2.
- Variante capture_point: layout pronto, gated su AI zone-defense.
- Seed-replay determinism: flake noto su Windows, non osservato in questi batch.
