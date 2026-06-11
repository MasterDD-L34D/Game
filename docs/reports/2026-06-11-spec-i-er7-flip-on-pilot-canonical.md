---
title: 'SPEC-I ER7 flip-ON pilot -- encounter badlands stat-canoniche (N=40)'
date: 2026-06-11
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-11'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [evo-tactics, spec-i, er7, biome-population, n40, flip-on, pilot, ecology]
---

# SPEC-I ER7 -- flip-ON pilot, encounter badlands stat-canoniche (2026-06-11)

Risolve il forward-work della decisione 4 dell'evidence ER7
(`docs/reports/2026-06-11-spec-i-er7-population-n40-evidence.md`): il flip-ON di
`BIOME_POPULATION_ENABLED` era stato deferito perche' lo swing combat -0.25 del primo
probe dipendeva da stat DIFFERENZIATE a mano (prey hp5/mod1 vs apex hp12/mod4), non da
una proprieta' intrinseca di ER7. Questo pilot rimisura con le stat CANONICHE delle
specie foodweb badlands per decidere il flip-ON.

**VERDETTO master-dd 2026-06-11: FLIP-ON ratificato.** Su domanda strutturata (L-069):
`BIOME_POPULATION_ENABLED` flippato **default ON** (opt-out '!= false', pattern ER6 #2725),
scope pilota `ER7_PILOT_BIOMES=['badlands']`. Motivazione: effetto combat outcome-neutro
con le stat reali + band-safe per costruzione + mechanism confermato. Surface: i segnali
narrativi escono gia' nel chronicle (viewer Godot M-7); il telegraph diegetico dedicato
dello stato bioma resta forward-work item-3.

## Measurement-point: stat canoniche, non differenziate

Encounter probe `enc_badlands_foodweb_pilot_01`: identico strutturalmente a
`enc_badlands_foodweb_probe_01` MA il reinforcement pool porta le stat CANONICHE da
`ecologyCombatAdapter.deriveCombatStats` (le stesse di `badlandsPilotScenario.js`, il
pilot ER5 ratificato):

| specie | ruolo | hp | mod | dc |
| --- | --- | --- | --- | --- |
| sand-burrower | prey | 4 | 2 | 11 |
| rust-scavenger | prey | 4 | 2 | 11 |
| echo-wing | mesopredator | 4 | 2 | 11 |
| ferrocolonia-magnetotattica | mesopredator | 7 | 2 | 12 |
| dune-stalker | apex | 13 | 3 | 14 |

Rispetto al probe differenziato: il tank-gap prey->apex resta (hp4 vs hp13), ma
l'offensive-gap crolla (mod 2->3 canonico vs 1->4 differenziato). Quindi escludere la
prey e lasciare meso+apex e' molto meno punitivo che nel probe.

## Risultati N=40 ISO (due gambe, floor-check per gamba)

Harness `tools/sim/spec-i-gates-probe.js --effect er7 --scenario enc_badlands_foodweb_pilot_01`.
Protocollo ISO (un processo per arm + aggregate). Due gambe a baseline diverso per il
floor-check (TKT-SIM-PROBE-ENTROPY): il sim greedy ha un knee netto, un baseline a 0.50
esatto = max flip-sensitivity = floor gonfio.

### Gamba 1 -- baseline ~0.50 (knife-edge), seed 72000

| arm | win rate (CI95) | delta vs off | composizione (prey/meso/apex) |
| --- | --- | --- | --- |
| off | 0.50 [0.35, 0.65] | -- | 0.63 / 0.30 / 0.07 |
| off2 | 0.63 [0.47, 0.76] | **+0.13 (floor)** | 0.69 / 0.20 / 0.11 |
| on_depleted | 0.72 [0.57, 0.84] | +0.23 | **0.00** / 0.66 / 0.34 |
| on_abundant | 0.57 [0.42, 0.71] | +0.07 | 0.59 / 0.23 / 0.18 |

Floor **+0.13** (off a 0.50 esatto = knife-edge): outcome NON separabile pulito dal
rumore. Ma la direzione e' chiara: on_depleted va SU (+0.23), **opposto** al -0.25 del
probe differenziato.

### Gamba 2 -- baseline off-knife-edge (~0.68), seed 73000

| arm | win rate (CI95) | delta vs off | composizione (prey/meso/apex) |
| --- | --- | --- | --- |
| off | 0.68 [0.52, 0.80] | -- | 0.65 / 0.23 / 0.12 |
| off2 | 0.63 [0.47, 0.76] | **-0.05 (floor)** | ... |
| on_depleted | 0.60 [0.45, 0.74] | **-0.075** | **0.00** / 0.62 / 0.38 |
| on_abundant | 0.60 [0.45, 0.74] | -0.075 | 0.57 / 0.16 / 0.27 |

Floor **-0.05 PULITO** (baseline 0.68, lontano dal knife-edge). Con un floor sano,
**entrambi** gli effetti combat sono -0.075 = solo -0.025 oltre il floor = **outcome-neutro**.
Tutti gli arm in/vicino banda (0.60-0.68), nessuna deriva OOB. Mechanism fired (esclusione
prey 0.65->0.00, boost apex 0.12->0.27/0.38).

Le due gambe CONCORDANO: il net-effect dell'esclusione depleted e' ~0 (gamba 1: +0.23 su
floor +0.13 = +0.10 net; gamba 2: -0.075 su floor -0.05 = -0.025 net). Nessuna direzione
robusta, nessuna magnitudine combat reale.

## Finding -- il -0.25 era un artefatto, ER7 canonico e' benigno

1. **Mechanism confermato** (canonico, anti-#14): esclusione prey 0.63->0.00, boost apex
   0.07->0.18. Identico al probe differenziato -- lo shaping morde sulle stat vere.
2. **Outcome: il "harder when depleted" NON e' robusto.** Probe differenziato = -0.25
   (piu' duro); pilot canonico = direzione opposta/neutra. Lo swing dipendeva
   dall'offensive-gap esagerato (mod 1->4), non da ER7. Con le stat canoniche
   (mod 2->3) l'esclusione e' outcome-neutra.
3. **Band-safety strutturale** (invariata): `applyPopulationToPool` non svuota/blocca
   mai il pool; rimodella solo QUALI specie rinforzano, mai QUANTE. ER7 non puo'
   causare un wipe.

Conseguenza per la decisione 3 dell'evidence precedente (esclusione = "ferita ecologica
piu' dura", A13-like): la DIREZIONE narrativa resta voluta, ma la MAGNITUDINE combat con
le stat reali e' trascurabile -- ER7 e' un segnale ecologico/narrativo (composizione del
branco rinforzi) piu' che una leva di difficolta'.

## Decisione (verdetto master-dd 2026-06-11)

**Flip-ON ratificato**: `BIOME_POPULATION_ENABLED` flippato default ON (opt-out
`!= 'false'`) nello stesso PR -- `biomePopulation.isEnabled()` + comment + 3 test legacy
"flag OFF default" aggiornati al pattern opt-out. Scope pilota invariato (badlands).
Forward-work residuo: telegraph diegetico Godot (item-3) + espansione bioma-per-bioma.

Evidence only -- il flip e' verdetto master-dd (L-069).
