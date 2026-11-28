---
title: 'Grid-ratify N=40 -- enc_abisso_colata_basaltica_01 (terzo grid_sized, 18x10 hazard)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-06'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Grid-ratify N=40 -- enc_abisso_colata_basaltica_01 (terzo grid_sized, 18x10, primo con hazard)

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/grid-band-probe.js` (generico)
Base: origin/main `8026f9c49` (post-merge #3229/#3230/#3231). Stato: RATIFY (N=40).
Metodo + semantica banda: `docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md` (authority).
Valori encounter = PROPOSED (SDMG).

## Cosa aggiunge questo doc

1. **Primo grid_sized NON-badlands**: bioma `abisso_vulcanico` (alias `deserto_caldo`) --
   il path grid_sized non e' ne' one-off ne' single-biome (terzo esemplare).
2. **Primo grid_sized con hazard tiles REALI**: 18 celle `lava` su 26 feature (180 celle
   totali, ~14%) -- feed diretto per la calibrazione D9 del termine geometry xpBudget
   (`hazard_set: [lava, acqua_profonda]`, flag `XP_BUDGET_GEOMETRY_ENABLED` OFF).
3. **Aspect ratio nuovo**: 18x10 = 1.8:1 (dorsale 16x12 = 1.33:1, canyon 20x12 = 1.67:1).
4. **Catch foodweb-filter (misurato, non ipotizzato)**: vedi sezione dedicata sotto.

## Design (delta vs dorsale/canyon)

- **Fiume di lava verticale** (x=8-9, varco unico a y=4-5): hazard walkable che NON blocca
  LOS -- il chokepoint vero e' la cornice di roccia (7,3)/(7,6)/(10,3)/(10,6) + il muro di
  occupancy delle 2 elite DENTRO la bocca est (10,4)/(10,5) (lezione canyon).
- Pochi-forti-vicini: wave-1 = 3 unita' (apex `rotabrachium_ferox` + 2 elite
  `pyrosaltus-celeris`), valvola finita cap 4, elimination + time_limit 25.
- Roster canonico abisso_vulcanico (species_catalog `biome_affinity`).
- Lava = costo movimento forward-compat inerte (`MOVE_TERRAIN_COST_ENABLED` OFF, non
  flippato qui), identico a dorsale/canyon.

## Catch: foodweb-filter mangia i threat-tier dal reinforcement_pool

Il primo draft aveva in pool `pyroflagellum_meteoriticum` (T2, `biome_affinity:
abisso_vulcanico` nel catalogo). L'N=10 ha dato `reinforcements = 3` ESATTO su 10/10 run
(deterministico, non varianza): `filterReinforcementPool` (TKT-WORLDGEN-GAPA, whitelist
foodweb per bioma) lo ESCLUDE dal pool misto -- la whitelist abisso = i 5 `sp_*` del
catalogo (pyrosaltus-celeris, basaltocara-scutata, cinerastra-nodosa, fumarisorba-sulfurea,
magmocardium-furens); i threat-tier T2/T3 (`pyroflagellum_meteoriticum`,
`rotabrachium_ferox`) NON sono nel foodweb e in pool misto vengono filtrati (in pool
SINGOLO passano per fallback anti-empty). Fix: 4o slot -> `basaltocara-scutata`.

**Regola per il prossimo authoring**: `biome_affinity` nel catalogo NON implica presenza
nel foodweb -- verifica il pool con
`filterReinforcementPool(pool, biome_id)` PRIMA del probe (1 riga di node -e).
Nota: il filter NON tocca le wave (l'apex rotabrachium_ferox di wave-1 spawna regolare).

## Direction N=10 (draft v1 pool bug + v2 finale)

| Iter                        | WR  | KO-rate | avg_rounds            | reinf             | Verdetto                      |
| --------------------------- | --- | ------- | --------------------- | ----------------- | ----------------------------- |
| v1 (pool con pyroflagellum) | 1.0 | 0       | 14.4 (sd 0.84, 13-16) | 3.00 ESATTO 10/10 | valvola monca (foodweb catch) |
| v2 (pool basaltocara)       | 1.0 | 0       | 14.0 (sd 0.47, 13-15) | 4.00 a cap        | direction STABILE -> N=40     |

## Risultati N=40 (faithful arm, as-authored, seeds 1..40)

Party = canonical badlands tier party (`enc_badlands_pilot_01`, dichiarato: il bioma abisso
non ha party tutorial canonico -- stesso party dei ratify dorsale/canyon = numeri
comparabili), tier table harness (base hp7/mod1, elite hp10/mod2, apex hp14/mod4),
pressure_start 50 (Escalated), multi-unit round driver.

| Metric             | N=40                                | Note                                    |
| ------------------ | ----------------------------------- | --------------------------------------- |
| completion (WR)    | **1.000 (40/40)**                   |                                         |
| WR CI95 Wilson     | [0.912, 1.0]                        |                                         |
| creature_ko_rate   | 0.000                               | ceiling di modello atteso (doc dorsale) |
| avg_rounds (pace)  | **14.00 (sd 1.15, min 12, max 18)** | banda pace RATIFICATA 18x10: [10, 18]   |
| avg_reinforcements | 4.00 (40/40 a cap)                  | liveness spawner                        |
| timeouts           | 0                                   | time_limit 25                           |

Artifacts: `reports/sim/abisso-colata-n40/` (runs.jsonl 40 righe + summary.json) +
`reports/sim/abisso-colata-n10/` (v2).

Wiring proof (osservato a ogni batch): board `18x10`, `terrain_features: 26` su
`session.grid`, LOS env unset -> default ON.

## Nota comparativa (geometria -> pace)

Dorsale 16x12/192 celle: 14.03. Canyon 20x12/240: 12.85. Colata 18x10/180: 14.00 (sd 1.15, min 12, max 18).
Conferma ulteriore che l'area da sola e' un proxy sbagliato (nota canyon): il pace e'
dominato da distanza-al-contatto + mobilita' del presidio, non dai metri quadri.

## xpBudget geometry (flag OFF, osservato -- NON flippato)

Questo e' il primo encounter dove il termine hazard di D9 avrebbe contributo REALE
flag-ON: 18 lava x 40 XP x 1.2 (standard) = 864 XP aggiunti a `used` -- contro un fight
misurato WR 1.000 (40/40) / KO 0.000. Altro dato (nella direzione gia' vista sulla dorsale: il
modello stat-mass over-predice, l'hazard_xp 40 e' fuori scala per hazard di percorso che
il pathing evita) per la calibrazione D9 "warn poi promuovi".

## Baseline update

`grid_ratify_baseline.json` += `enc_abisso_colata_basaltica_01: { grid_size: [18,10],
evidence_ref: questo doc, ratified_at: 2026-07-06 }` -> validator 0 warn.

## Gap dichiarati

- Stessa semantica/limiti del doc dorsale (letalita' = ceiling di modello, NON ratificata;
  banda = completion + pace + liveness).
- Party badlands su bioma abisso: scelta dichiarata per comparabilita' harness; un party
  canonico abisso non esiste ancora (content futuro -> re-probe se cambia).
- `fog_of_war`/`stress_wave` esclusi dal v1 (determinismo ratify).
- Hazard lava = LOS-neutrale e costo-inerte oggi (MOVE_TERRAIN_COST OFF): la banda ratifica
  la geometria di OCCUPANCY/LOS, non il costo lava -- un flip futuro di MOVE_TERRAIN_COST
  su questo encounter richiede re-probe (L-069 non si trasferisce fra semantiche di costo).
