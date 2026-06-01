---
title: 'TRAIT-RECONCILE audit (Wave 3) + badlands Strato-2 trait_refs'
workstream: worldgen
category: planning
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [planning, wave3, trait-reconcile, traits, glossary, species]
---

# TRAIT-RECONCILE audit (Wave 3, 2026-05-31)

Ticket **TKT-TRAIT-RECONCILE** (ultimo audit aperto di Wave 3). Read-only; corregge i
numeri stale del piano ("104 senza meccanica + tassonomia 57->106").

## Il vero quadro (ground-truth main 2e9ca343)

Due artefatti separati:

- **`data/core/traits/glossary.json`** = **604** tratti, SOLO flavor (label_it/en +
  description_it/en, nessun campo meccanica). **Synced** da `data/traits/index.json` via
  `tools/traits/sync_missing_index.py` (workflow `traits-sync.yml`) -> **NON hand-edit**.
- **`data/core/traits/active_effects.yaml`** = **502** tratti CON meccanica (trigger +
  effect; consumati da `traitEffects.js`).

| relazione                                    | n       |
| -------------------------------------------- | ------- |
| glossary (flavor)                            | 604     |
| active_effects (meccanica)                   | 502     |
| meccanica ∩ glossary                         | 498     |
| **meccanica SENZA flavor (orphan-mechanic)** | **4**   |
| **glossary SENZA meccanica (flavor-only)**   | **106** |

I 4 orphan-mechanic: `equilibrio_vestibolare`, `nocicezione`, `propriocezione`,
`termocezione` (hanno effetto ma manca la entry glossary).

## Species trait_refs -- il bug headline

`species_catalog.json` referenzia **177** trait_id distinti:

| categoria                                     | n      | stato                                                |
| --------------------------------------------- | ------ | ---------------------------------------------------- |
| slug name-id (es. `scheletro_idro_regolante`) | 127    | ✅ **127/127 risolvono** in glossary                 |
| **codici `TR-####`** (TR-1101..TR-2005)       | **50** | 🔴 **TUTTI dangling** (in NESSUNO dei due artefatti) |

I 50 `TR-####` sono un **secondo namespace legacy** mai mappato agli slug, su ~10 specie
canon (`elastovaranus_hydrus`, `gulogluteus_scutiger`, `perfusuas_pedes`,
`terracetus_ambulator`, `chemnotela_toxica`, `proteus_plasma`, `soniptera_resonans`,
`anguis_magnetica`, `umbra_alaris`, `rupicapra_sensoria` -- 5 TR-code ciascuna).

**Perche' main e' verde nonostante i 50 dangling**: `tests/scripts/speciesTraitReferences.test.js`
valida i trait-list dei **pack YAML** (`suggested_traits`/`optional_traits`/`core`...), NON
i `trait_refs` di `species_catalog.json` -> i TR-code sono latenti (come gli ecotypes
del CANON-RECONCILE).

## Fix applicato in questo PR (Strato-2 badlands, opzione B)

Le 22 creature `gameplay-promote` (CANON-RECONCILE #2490) avevano `trait_refs: []`. Riempiti
i `trait_refs` delle **5 creature badlands** con `suggested_traits` (tutti glossary-valid):
`echo_wing` / `ferrocolonia_magnetotattica` / `nano_rust_bloom` / `rust_scavenger` /
`sand_burrower` (5 trait ciascuna). `magneto_ridge_hunter` + `slag_veil_ambusher` non hanno
suggested_traits -> restano `[]`. Effetto: i tratti ora si attivano in combat (traitEffects

- adapter). Campi prosa (scientific_name, visual_description, functional_signature) restano
  TODO writer-gated -- NON fabbricati (lore = master-dd/writer).

## Follow-up (nuovi ticket)

| Ticket                 | Cosa                                                                                           | Effort  | Stato / nota                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TKT-TRAIT-TRCODE-REMAP | rimappare i 50 `TR-####` -> slug glossary su 10 specie canon                                   | audit+  | ✅ **RESOLVED**: la mappa esisteva in-repo (`data/external/evo/traits/TR-####.json` campo `id`); 50/50 -> slug, tutti ∈ glossary; remappati in catalog |
| TKT-CATALOG-REF-GUARD  | estendere il guard CI per validare anche `species_catalog.json` trait_refs (era latente)       | piccolo | ✅ **RESOLVED**: nuovo test in `envelope-b-data-integrity.test.js` (0 TR-code, 0 dangling); previene regressioni                                       |
| TKT-TRAIT-ORPHAN-MECH  | aggiungere i 4 orphan-mechanic alla glossary via `index.json` source + `sync_missing_index.py` | piccolo | aperto -- NON hand-edit glossary; passa dal source synced                                                                                              |
| TKT-TRAIT-FLAVOR-MECH  | 106 flavor-only senza meccanica = backlog design (quali meritano un effetto)                   | design  | aperto -- YAGNI: solo i tratti citati dalle specie gameplay-touched                                                                                    |

## Controlli

- `speciesTraitReferences.test.js` (pack yaml refs) verde (badlands suggested_traits gia' ∈
  glossary).
- `envelope-b-data-integrity.test.js` verde (catalog 75, base-53 invariata).
- `validate-dataset.cjs`: le righe gameplay-promote restano valide (trait_refs slug ∈
  glossary; nessun nuovo TR-code introdotto).
