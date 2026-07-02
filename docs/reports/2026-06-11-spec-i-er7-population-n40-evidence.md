---
title: 'SPEC-I ER7 population tick -- N=40 flag-ON evidence (ratifica magnitudini)'
date: 2026-06-11
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-11'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [evo-tactics, spec-i, er7, biome-population, n40, ratification, ecology, worldgen]
---

# SPEC-I ER7 -- population tick N=40 flag-ON evidence (2026-06-11)

Chiude il residuo #2 dell'handoff 2026-06-10: playtest N=40 con
`BIOME_POPULATION_ENABLED=true` per ratificare le magnitudini PROPOSED del build
#2723 (`RECOVERY_SEASONS`, `ABUNDANCE_SEASONS`, `ABUNDANT_WEIGHT_MULT`) + decidere
l'accensione del population tick (pilot badlands).

**VERDETTO master-dd 2026-06-11: magnitudini RATIFIED as-built, flag tenuto OFF.**
Su domanda strutturata (L-069): (1) `RECOVERY_SEASONS=2` / `ABUNDANCE_SEASONS=2`
**RATIFIED**; (2) `ABUNDANT_WEIGHT_MULT=2` **RATIFIED**; (3) esclusione `depleted`
= conseguenza ecologica **INTENZIONALE** (A13-like, "bioma depleted = combat piu'
duro"); (4) flag `BIOME_POPULATION_ENABLED` **resta OFF** -- knob ratificati ma
accensione deferita a un pilot su encounter badlands REALE (stat canoniche, non
probe differenziato), pattern ER1 #2704 (wired-ratified, flag-OFF).

Design ratificato: `docs/design/evo-tactics-ermes-runtime-pressure.md` sez. ER7.
Build-record: `docs/reports/2026-06-10-er7-biome-population-build-evidence.md`.

## Natura di ER7 (perche' l'evidenza ha 2 layer, non un solo win-rate N=40)

ER7 = state machine cross-run a season-tick (PURA, deterministica, zero RNG) +
uno shaper band-safe del pool rinforzi. I tre knob PROPOSED NON vivono sullo stesso
asse:

- `RECOVERY_SEASONS=2` / `ABUNDANCE_SEASONS=2` = soglie TEMPORALI deterministiche
  (recupero cross-season). Un probe stocastico N=40 win-rate NON le esercita: si
  ratificano esibendo la TIMELINE che producono (Finding 1).
- `ABUNDANT_WEIGHT_MULT=2` + l'esclusione del ruolo `depleted` = l'unico layer che
  tocca il combat (composizione del pool rinforzi). Qui serve l'N=40 (Finding 2).

Trap evitata (verify-first, pattern ER1/ER6): gli encounter badlands authored
(`enc_sabotage_01`, `enc_hardcore_reinf_01`) hanno un reinforcement pool OFF-foodweb
(`predoni_nomadi`) -> `applyPopulationToPool` = no-op strutturale (ruolo `undefined`
ovunque). L'N=40 e' stato misurato su un encounter probe dedicato il cui pool E' il
foodweb badlands (vedi Finding 2), altrimenti il gate sarebbe stato un on==off
byte-identico che "passa" la banda senza provare nulla (anti-pattern #14).

## Finding 1 -- season-tick timeline (deterministico, ratifica RECOVERY/ABUNDANCE_SEASONS)

Harness: `tools/sim/er7-season-trace.js` (route reale
`POST /api/campaign/seasonal/advance-season`, flag ON, pilot badlands). Sequenza
segnali scriptata su 7 season-tick. Output: `reports/sim/spec-i-er7-season-trace/`.

| tick | season | prey (stato/seasons) | meso | apex | evento |
| --- | --- | --- | --- | --- | --- |
| S1 wound badlands | summer | depleted/0 | stable/1 | stable/1 | local_extinction:prey |
| S2 wound healed | autumn | depleted/1 | stable/2 | stable/2 | - |
| S3 quiet | winter | **stable/0** | stable/3 | stable/3 | - |
| S4 apex overhunted | spring | stable/1 | stable/4 | depleted/0 | local_extinction:apex |
| S5 quiet | summer | **abundant/0** | stable/5 | depleted/1 | population_boom:prey |
| S6 quiet | autumn | abundant/1 | stable/6 | stable/0 | - |
| S7 quiet | winter | **stable/0** | stable/7 | stable/1 | - |

Determinismo: due run indipendenti dell'intera sequenza = byte-identici (`true`).

Lettura:

- prey depleted a S1, recupera `stable` a S3 = **2 season quiete** -> RECOVERY_SEASONS=2.
- apex depleted a S4; il boom trofico parte a S5 (prey `abundant`, `population_boom`)
  = **lag di 1 season** dopo la perdita apex (il predatore sparito libera la preda,
  ma non lo stesso tick); apex recupera a S6 (2 season dopo S4).
- la prey in boom decade a `stable` a S7 = **2 season** dopo S5 -> ABUNDANCE_SEASONS=2.

Le due soglie temporali sono leggibili e simmetriche (depletion e abundance durano
entrambe 2 season). Nessun numero continuo, nessuna equazione (anti-UO compliant).

## Finding 2 -- spawn-shaping N=40 (ratifica ABUNDANT_WEIGHT_MULT + band-safety)

Harness: `tools/sim/spec-i-gates-probe.js --effect er7`. Measurement-point (L-069):
encounter probe `enc_badlands_foodweb_probe_01` (10x10, biome badlands, elimination)
il cui reinforcement pool E' il foodweb badlands con stat DIFFERENZIATE per ruolo
(prey deboli hp5/mod1, meso medi hp8/mod2, apex forti hp12/mod4) cosi' che la
composizione spawn abbia peso combat reale e il gate banda sia informativo. Campaign
seedata per-arm con `biomePopulation.badlands` nello stato target. Protocollo
evidence-grade: UN processo node per arm + `--aggregate` (ISO, pattern ER6),
`--modulation duo_hardcore` (10x10 -> entry tiles on-grid), `pressure_start` 30
(Alert), scaling `{countAdd:6,hpAdd:4,modAdd:7,dcAdd:2}` (baseline off la banda),
N=40 paired, seed base 62000, commit `ba5975d52`.

### Outcome (win-rate)

| arm | n | win rate (Wilson CI95) | delta vs off | lettura |
| --- | --- | --- | --- | --- |
| off | 40 | 0.63 [0.47, 0.76] | -- | baseline (flag OFF, pool pieno) |
| off2 | 40 | 0.57 [0.42, 0.71] | **-0.05 (floor)** | replica byte-identica = noise floor pulito |
| on_depleted | 40 | 0.38 [0.24, 0.53] | **-0.25** | prey escluse -> rinforzi apex-dominati = piu' duro |
| on_abundant | 40 | 0.72 [0.57, 0.84] | +0.10 | dentro il rumore (CI overlap massiccio) |

Floor `off2-off` = **-0.05** (pulito, come la gamba abisso di ER6, NON la atollo
+0.33 rotta -> gamba badlands informativa, TKT-SIM-PROBE-ENTROPY non colpisce qui).
Caveat knife-edge: il baseline ~0.6 e' vicino al boundary win/loss del sim greedy
-> alto flip-count tra armi identiche (off2-off = 22/40 pair flippano) ma NET ~0;
i delta vanno letti come NET sopra il floor, non come win-rate assoluti pinnati.

- **on_depleted -0.25 SUPERA il floor di 5x** -> effetto REALE. L'esclusione della
  prey depleted lascia spawnare solo meso+apex (forti) -> il bioma a prey rarefatta
  diventa apex-dominato e piu' duro. Direzione coerente con la filosofia A13 (ferita
  ecologica -> combat piu' duro).
- **on_abundant +0.10 NON supera il floor in modo netto** (CI [0.57,0.84] vs off
  [0.47,0.76] overlap quasi totale) -> **outcome-neutro**: il boost apex sposta la
  composizione ma non muove il win-rate in modo distinguibile dal rumore (gli apex
  `flanking` perdono tempo a riposizionarsi nel sim greedy).

### Mechanism (composizione spawn -- prova che l'effetto FIRED, anti-#14)

| arm | prey share | meso share | apex share | lettura |
| --- | --- | --- | --- | --- |
| off | 0.63 | 0.16 | 0.21 | pool pieno (pesi 6/2/2 = 60/20/20) |
| on_depleted | **0.00** | 0.46 | 0.54 | prey (sand-burrower/rust-scavenger) ESCLUSE |
| on_abundant | 0.50 | 0.15 | **0.35** | apex pesato x2: share 0.21 -> 0.35 (+67% rel) |

Log runtime confermano lo shaping: `{"component":"reinforcement-population-shape",
"reason":"shaped","excluded":["sand-burrower","rust-scavenger"]}` (depleted) e il
boost apex (share 0.21->0.35). Entrambi i layer del consumer (esclusione binaria +
boost `ABUNDANT_WEIGHT_MULT`) mordono in combat reale, non solo negli unit-test.

## Band-safety (garanzia strutturale)

`applyPopulationToPool` non svuota MAI il pool (fallback al pool pre-shaping) e non
BLOCCA mai lo spawn: rimodella solo QUALI specie rinforzano, mai QUANTE (il cap
`max_total_spawns` resta). Quindi ER7 non puo' causare un wipe; il caso peggiore e'
un mix piu' duro/molle. Il -0.25 di on_depleted e' la magnitudine della
DIFFERENZIAZIONE STAT scelta per il probe (prey hp5 vs apex hp12), NON una proprieta'
intrinseca di ER7: in un encounter reale le specie foodweb portano le loro stat
canoniche (`deriveCombatStats`), quindi lo swing in partita sara' diverso.

## Decisioni (verdetto master-dd 2026-06-11)

1. `RECOVERY_SEASONS=2` / `ABUNDANCE_SEASONS=2`: timeline Finding 1 leggibile e
   simmetrica. **-> RATIFIED as-built.**
2. `ABUNDANT_WEIGHT_MULT=2`: meccanismo fired (apex share +67% rel), outcome-neutro
   in banda. **-> RATIFIED as-built.**
3. Esclusione `depleted` (binaria, nessun knob): effetto reale -0.25, direzione
   "ferita ecologica = piu' duro" coerente con A13. **-> conseguenza ecologica
   INTENZIONALE** (accettata come `woundedStep` A13); nessun fork esclusione-soft.
4. Flip-ON `BIOME_POPULATION_ENABLED`: **-> flag tenuto OFF.** Knob ratificati ma
   accensione deferita a un pilot su encounter badlands REALE (stat canoniche);
   pattern ER1 #2704 (wired-ratified, flag-OFF). Il flip-ON diventa forward-work.

## Forward-work (NON gate di questa evidenza)

- **Flip-ON deferito** (decisione 4): pilot su encounter badlands REALE (pool foodweb
  con stat canoniche `deriveCombatStats`, non il probe differenziato) -> conferma
  l'impatto in banda con le stat vere, poi flip `BIOME_POPULATION_ENABLED` default ON.
- Espansione bioma-per-bioma post-flip (mirror ER5, un bioma alla volta dietro N=40).
- Surface Godot: telegraph diegetico dello stato bioma (item 3, Lenovo).
- Affinare il proxy `apexOverhunted` (kill-heavy reale per-ruolo vs run vinto).

Evidence only -- il flip e la ratifica sono verdetto master-dd (L-069, spec sez. 8).
