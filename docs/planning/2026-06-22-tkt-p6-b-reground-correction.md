---
title: 'Re-ground correction -- TKT-P6-TRAIT-ORPHAN-DESIGN-B orphan data + trait data model'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [trait, orphan, correction, data-model, istruttoria, ground-truth]
---

# Re-ground correction -- TKT-P6-TRAIT-ORPHAN-DESIGN-B

> **Perche'**: l'istruttoria mergeata ([#2953](https://github.com/MasterDD-L34D/Game/pull/2953))
> ha controllato l'orphan-status SOLO su `data/core/species/species_catalog.json` (trait_refs
> combat). Due harsh-review (compensanti per Codex offline) + verifica hanno mostrato che il
> data model dei trait e' **multi-registro**: 4 trait risultano assegnati altrove. Questo doc
> ri-grounda i dati su TUTTI i registri e corregge l'istruttoria. Nessun edit a dati/trait
> (research-only). Esecuzione = vedi sez. 5 (blocker).

## 1. Il vero data model dei trait (registri)

| Registro | Tipo | Ruolo |
| --- | --- | --- |
| `data/core/traits/active_effects.yaml` | **SOURCE** | mechanics combat (trigger+effect, tier T1-T3) -- valutato a runtime |
| `data/core/traits/glossary.json` | **SOURCE** | label IT/EN |
| `data/traits/<categoria>/<trait>.json` + `data/traits/index.json` | **SOURCE** | DB metadata ricco (famiglia, `requisiti_ambientali.biome_class`, sinergie, `completion_flags.has_species_link`, tier) |
| `data/core/traits/biome_pools.json` | **SOURCE** | pool PCG (core/support/preferred_traits) |
| `packs/evo_tactics_pack/data/species/**/*.yaml` | **SOURCE** | specie pack (liste trait) |
| `data/external/evo/` (species + traits TR-NNNN) | **SOURCE (import)** | pack-v2 source per l'ETL |
| `data/core/species/species_catalog.json` (`trait_refs`) | **DERIVED** | catalog combat (ETL 4-stage `merge_pack_v2_species`->`enrich`->`promote_gameplay_to_canon`->`apply_interoception`); **MAI hand-edit** |
| `data/traits/species_affinity.json` | **DERIVED** | bridge trait->specie per affinita' (gen. `tools/py/build_species_trait_bridge.py`); soft, NON assegnazione combat |
| `packs/evo_tactics_pack/docs/catalog/`, `public/docs/` | **DERIVED** | mirror catalog |

**Implicazione**: "orphan" ha senso solo con definizione precisa. Adotto:
> **TRUE orphan** = nessuna assegnazione in (a) `species_catalog.json` trait_refs [combat] NE
> (b) una specie pack YAML NE (c) un PCG pool. (L'affinita' biome in `data/traits` DB /
> `species_affinity` = layer ecologico soft, NON conta come assegnazione.)

## 2. Tabella corretta (ground-truth 2026-06-22, scan su tutti i registri)

| trait | AE tier/cat | combat-species (catalog) | pack-species YAML | PCG pool | **TRUE orphan** | tot-ref | note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `magnetic_rift_resonance` | T2/neurologico | - | - | - | **SI** | 20 | status telepatic_link wired |
| `magnetic_sensitivity` | T1/sensoriale | - | - | - | **SI** | 9 | status sensed wired |
| `rift_attunement` | T2/sensoriale | - | - | - | **SI** | 9 | status attuned wired |
| `sussurro_psichico` | T1/comportamentale | - | - | - | **SI** | 12 | BUG key disoriented->disorient |
| `mente_lucida` | T2/mentale | - | - | - | **SI** | 9 | balance (panic 2t MoS3) |
| `cervello_predittivo` | T3/mentale | - | - | - | **SI** | 10 | balance/tier-slot |
| `biochip_memoria` | T2/mentale | - | - | - | **SI** | **52** | DB tier=T1 (mismatch!), biome steppe_algoritmiche, mirror pesante |
| `aura_glaciale` | T1/fisiologico | - | - | **cryosteppe_convergence** | **NO** | 14 | gia' PCG-reachable |
| `tela_appiccicosa` | T1/fisiologico | - | - | **mycelial_vaults** | **NO** | 13 | gia' PCG-reachable |
| `antenne_wideband` | T1/fisiologico | - | - | **cryosteppe_convergence** | **NO** | **53** | + DB entry (steppe_algoritmiche), mirror pesante |
| `marchio_predatorio` | T1/comportamentale | - | **ferrimordax-rutilus** | - | **NO** | 21 | gia' assegnato a una specie pack (+4 mirror) |

**Risultato: 7 TRUE orphan, 4 NON-orphan** (gia' raggiungibili via PCG o specie pack).

## 3. Correzioni vs istruttoria mergeata (#2953)

1. **"0 species refs per tutti gli 11"** = vero SOLO per la def. stretta (catalog combat trait_refs).
   Sotto def. completa, **4 trait hanno un assignment-path**: `aura_glaciale`/`tela_appiccicosa`/
   `antenne_wideband` (PCG pool) + `marchio_predatorio` (specie pack `ferrimordax-rutilus`).
   -> chiamarli tutti "orphan" era fuorviante.
2. **Blast-radius sottostimato**: `antenne_wideband` (53 ref) e `biochip_memoria` (52 ref) hanno
   entry nel DB `data/traits` + mirror derivati -> un edit/rename NON e' single-file.
   Gli altri 9 sono leggeri (9-21 ref, in larga parte docs).
3. **Inconsistenza tier**: `biochip_memoria` = T2 in active_effects ma **T1** nel DB `data/traits`.
   Da riconciliare (quale e' canonico?) prima di qualsiasi rename/assegnazione.
4. **`marchio_predatorio` NON-orphan** (gia' in `ferrimordax-rutilus.yaml`): la premessa del
   verdetto 7 ("non in specie") era errata; il verdetto (add a PCG) resta valido come additivo.

## 4. Implicazioni sui verdetti (ricalibrate sui dati corretti)

| Verdetto | Stato corretto |
| --- | --- |
| v2 `mente_lucida` MoS5 | TRUE orphan, 9 ref (solo active_effects+glossary) -> edit pulito, band-neutral |
| v4 `sussurro_psichico` key-fix | TRUE orphan, 12 ref (solo active_effects+glossary) -> edit pulito |
| v1 `antenne_wideband` differenzia | NON-orphan, **53 ref + DB entry** -> edit deve sincronizzare `data/traits/locomotorio/antenne_wideband.json` + mirror; NON single-file |
| v8 `biochip_memoria` rename | TRUE orphan combat MA **52 ref** (DB+mirror+affinity+locale+aggregate) + tier-mismatch -> rename **high-blast**, cross-file |
| v5 cluster magnetico (3) | TRUE orphan; assegnazione = BLOCKED (sez. 5) |
| v6 `aura_glaciale`+`tela_appiccicosa` | gia' PCG-reachable (NON-orphan); "roster fisso" = additivo, BLOCKED (sez. 5) |
| v7 `marchio_predatorio` PCG | gia' in specie pack; add-PCG = additivo (edit biome_pools, eseguibile) |
| v3 `cervello_predittivo` | TRUE orphan; create-species = BLOCKED (sez. 5) |

## 5. Execution feasibility (blocker verificato)

`species_catalog.json` (DERIVED) ha `source_provenance` con **3/5 sorgenti out-of-repo**:
`/tmp/species_catalog_v0.2.0_backup.json`, `/tmp/species_etl_source.yaml`,
`/tmp/species_expansion_etl_source.yaml` (= 48/75 specie: 38 legacy + 10 pack-v2). Su questo
checkout **il catalog NON e' rigenerabile** (un regen parziale droppa 48 specie); hand-edit =
CI-vietato (canon-enforcement + `TKT-CATALOG-REF-GUARD` rifiuta ref `TR-`). Quindi:
- **BLOCKED** (serve owner): tutte le assegnazioni-a-specie (v3 create, v5 magnetic, v6 roster-fisso).
  Path: fornire i sorgenti `/tmp` o ripristinare i legacy YAML, e mappare l'ETL 4-stage completo
  (`merge_pack_v2_species` e' solo stage 1).
- **Eseguibile** (no catalog regen): v2, v4 (active_effects puliti); v7 (biome_pools add); v1/v8
  con sync cross-file esplicito.

## 6. Tooling esistente da riusare (no reinvent)

- **name-audit / style (R2b)**: `tools/py/normalize_trait_style.py` + `tools/py/styleguide_compliance_report.py`
  esistono gia' -> usarli per trovare/allineare gli outlier, non scrivere un auditor nuovo.
- **ETL catalog**: pipeline 4-stage `tools/etl/{merge_pack_v2_species,enrich_species_heuristic,promote_gameplay_to_canon,apply_interoception_traits}.py`.
- **affinity bridge**: `tools/py/build_species_trait_bridge.py` (rigenera species_affinity).

## 7. Raccomandazione per il re-plan (next)

Riscrivere il piano (v4) su questi dati: (1) ship v2+v4 (puliti); (2) v7 biome_pools add; (3) v1+v8
come edit cross-file espliciti (sync DB+mirror, risolvi prima il tier-mismatch biochip); (4) v3/v5/v6
= BLOCKED owner-gated finche' la regen del catalog non e' ripristinabile; (5) name-audit via tooling esistente.
La design-call resta master-dd; questo doc = solo dati corretti + opzioni.
