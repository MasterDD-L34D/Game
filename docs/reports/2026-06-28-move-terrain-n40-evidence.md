---
title: 'Move terrain-cost substrate -- Phase 4 N=40 band evidence (preliminary)'
date: 2026-06-28
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-28'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, substrate, n40, band, evidence, volo]
---

# Move terrain-cost substrate -- Phase 4 N=40 band evidence (preliminary)

> **Scopo**: misurare l'impatto sul win-rate del flip `MOVE_TERRAIN_COST_ENABLED` sul pilot encounter
> (`enc_foresta_temperata_radici`), con un roster che esercita il kit volo. **Io misuro, master-dd ratifica
> la banda** (SDMG). Preliminare: roster hand-rostered (Path B), banda = direction-probe non calibrazione.

## 1. Metodo

- **In-process** (`supertest` `createApp`, NO prod), **node 22** (`process.version` registrato nell'output;
  il combat-sim NON e' bit-deterministico cross-node -- misurato e gate sullo stesso node di CI/prod).
- **Paired-seed**: stesso `seed` per il braccio ON e OFF -> l'UNICA differenza e' il flag (isola il substrate).
- Harness: `tools/sim/move-terrain-n40-probe.js` -> `combat-adapter.runEncounter` con `terrainFeatures` inline
  (il pilot encounter vive in `data/encounters/`, NON nella dir di `encounterLoader` -> il terreno e' iniettato).
  Outcome = eliminazione (nessun objective caricato -> alive-count).
- **Roster**: 3 flyer volo (`echo_wing` g1 / `aurora_gull` g2 / `noctule_termico` g3, esenti dal costo-terreno
  per grado) + 1 unita' a terra non-volo (paga il costo ON). Nemici = roster foresta scalato. Terreno =
  i 4 tile tipati del pilot (vegetazione_densa x2 / roccia / radura).
- **radici ESCLUSO dal delta-flip**: e' always-on (flag-independent) -> presente in ENTRAMBI i bracci, si
  cancella dal delta; inoltre un'unita' sessile range-1 non traversa (lo scenario non si risolve). La sua
  banda e' una domanda separata carrier-vs-non-carrier, NON il gate del flip.

## 2. Risultati

### 2a. Banda foresta (N=40, paired-seed)

```json
{
  "N": 40,
  "enemyScale": 0.3,
  "flag_on": { "wins": 16, "defeats": 0, "timeouts": 24, "win_rate": 0.4, "avg_rounds": 29.7 },
  "flag_off": { "wins": 16, "defeats": 0, "timeouts": 24, "win_rate": 0.4, "avg_rounds": 29.7 },
  "wr_delta": 0,
  "avg_rounds_delta": 0,
  "node": "v22.22.3"
}
```

**ON identico a OFF** (16/16 vittorie, 24/24 timeout, 29.7/29.7 round): `wr_delta = 0`, `avg_rounds_delta = 0`.
Il flip e' **band-neutral** sul pilot foresta. (Nota: 24/40 timeout = scenario ad attrito; ma essendo ON==OFF
byte-identico il null regge a prescindere dal tasso di timeout.)

### 2b. Sanity flag-applies (il flag MORDE quando si traversa terreno costoso)

Un'unita' heavy (morphotype `corazzato` -> profilo heavy, roccia 2.0) forzata ad attraversare un corridoio
di roccia (1..4, y4) per raggiungere il nemico:

| seed | ON (rounds) | OFF (rounds) |
| ---- | ----------- | ------------ |
| 1    | victory r7  | victory r9   |
| 2    | victory r7  | victory r9   |
| 3    | victory r9  | victory r9   |

Il flag CAMBIA i run quando le unita' traversano terreno costoso -> l'harness applica correttamente il
substrate; il delta-0 sul foresta NON e' un bug.

## 3. Interpretazione

- **Il substrate e' meccanicamente vivo** (sanity 2b + unit/integration test gia' verdi: roccia 2 AP vs 1,
  lava g3 1 AP vs g1 2).
- **Sul pilot foresta il flip e' band-neutral** perche': (a) i profili medium pagano ~0 su questo terreno
  (vegetazione_densa = 1.0 = gratis per medium; SOLO roccia = 1.5, su un tile spesso fuori-percorso);
  (b) i flyer volo sono esenti per design. Le unita' non traversano abbastanza terreno costoso per spostare
  l'outcome.
- **Il substrate e' una leva di level-design, non uno shifter passivo del WR**: morde su terreno costoso
  (profili heavy / hazard lava+acqua_profonda / corridoi forzati). Su un encounter mite l'effetto WR ~0.

## 4. Raccomandazione (master-dd ratifica)

- **Flip LOW-RISK sul pilot foresta** (banda-neutrale). Il rischio-banda emerge solo dove il terreno e'
  costoso -> e' una scelta di chi-disegna-gli-encounter, non un effetto globale.
- **Caveat SDMG**: roster hand-rostered, banda = direction-probe (non calibrazione N=100). Il delta-0 e'
  STRUTTURALE (le unita' non attraversano tile costosi su questo terreno), non un equilibrio fine.
- Per una banda che ESERCITI i gradi g2/g3 servirebbe terreno hazard (lava/acqua_profonda) -- assente dal
  pilot foresta: scelta di design separata.

## 5. Boundary

Io ho costruito l'harness + misurato; **master-dd ratifica la banda + la decisione di flip** (fase 5,
owner-gated, post Gate-5 Godot telegraph). La banda always-on di radici = misura separata carrier-vs-noncarrier.
