---
title: 'Resolution status -- TKT-P6-TRAIT-ORPHAN-DESIGN-B (what shipped, owner-gated recipes, master-dd flags)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [trait, orphan, resolution, owner-gated, master-dd-gated]
---

# TKT-P6-TRAIT-ORPHAN-DESIGN-B -- Resolution status

Stato esecuzione dei verdetti dopo "risolviamo i bloccati". Distingue: SHIPPED /
OWNER-GATED (con ricetta) / MASTER-DD micro-call.

## 1. SHIPPED (merged 2026-06-22)

| PR | Verdetti |
| --- | --- |
| [#2953](https://github.com/MasterDD-L34D/Game/pull/2953) | istruttoria (decision brief) |
| [#2963](https://github.com/MasterDD-L34D/Game/pull/2963) | v1 antenne_wideband MoS3 + v2 mente_lucida MoS5 + v4 sussurro_psichico disorient |
| [#2964](https://github.com/MasterDD-L34D/Game/pull/2964) | v7 marchio_predatorio -> PCG (magnetar_badlands + crepuscolo_synapse_bloom) |
| [#2967](https://github.com/MasterDD-L34D/Game/pull/2967) | dead-disorient key fix su 2 orphan (arco_voltaico, zoccoli_risonanti_steppe) |

Tutti band-neutral, CI-green, verify-done.

## 2. OWNER-GATED -- v3/v5/v6 (assegnazione-a-specie)

**Blocco confermato (verificato)**: `species_catalog.json` e' DERIVED + NON rigenerabile in
sicurezza su questo checkout:
- `source_provenance` punta a 3 file `/tmp` out-of-repo; il doc di reproducibility
  (`OD-024-031-envelope-b-summary.md:99`) usa un `--pack-v2` **vault** (out-of-repo) come SoT.
- `promote_gameplay_to_canon.py` NON ha `--out`/`--catalog` -> scrive il catalog REALE in-place
  (no dry-run a temp) -> impossibile testare byte-identical senza toccare il canon.
- hand-edit del catalog = CI-vietato (canon-enforcement Phase A/B/D + TKT-CATALOG-REF-GUARD).

**Ricetta per l'owner** (gli input ESISTONO in-repo, verificato -- merge riproduce pack-v2 10 +
legacy 38):
```bash
AR=docs/archive/historical-snapshots/2026-05-15_species-deprecation
python tools/etl/merge_pack_v2_species.py \
  --pack-v2 data/external/evo/species/species_catalog.json \
  --species-yaml $AR/species.yaml --expansion-yaml $AR/species_expansion.yaml \
  --lifecycle-dir data/core/species --out data/core/species/species_catalog.json
python tools/etl/enrich_species_heuristic.py --catalog data/core/species/species_catalog.json --in-place
python tools/etl/promote_gameplay_to_canon.py --all-gameplay      # scrive il catalog reale
python tools/etl/derive_interoception_overrides.py --apply
python tools/etl/apply_interoception_traits.py --apply
# poi: git diff data/core/species/species_catalog.json  -> confermare 75 specie + by_source
#      {pack-v2:10, stub:5, legacy:38, gameplay-promote:22}; provenance /tmp->in-repo cambiera'.
```
Owner conferma che il regen riproduce il catalog (modulo provenance) PRIMA di usarlo per le
assegnazioni. **Poi**:
- **v5** cluster magnetico: aggiungi gli slug (NON codici TR) `magnetic_sensitivity`/`rift_attunement`/`magnetic_rift_resonance` ai `trait_refs` di `anguis_magnetica` nel source `data/external/evo/species/species_catalog.json`, poi regen.
- **v6** aura_glaciale/tela_appiccicosa roster-fisso: basso valore (gia' PCG-reachable); opzionale.
- **v3** create nuova specie apex psionico per cervello_predittivo: **serve identita' master-dd** (GATE C1: nome/lore/biome/stats/sentience) prima dell'authoring nel source pack-v2 + lifecycle YAML stub.

## 3. MASTER-DD micro-call (decisioni piccole, non eseguibili autonome)

- **2 dead-disorient assegnati** (`secrezione_rallentante_palmi`, `campo_di_interferenza_acustica`):
  stesso bug di v4 MA su specie LIVE (catalog trait_refs) -> fixarli ATTIVA il disorient (prima
  inerte) = balance buff. Ratifica: fix (attivazione voluta) o lascia inerte? (oracle band-neutral, sim=0.)
- **biochip tier**: active_effects `T2` vs `data/traits` DB `T1` -> quale canonico (prima del rename v8)?
- **name-audit (R2b) + v8**: outlier off-style candidati = `magnetic_rift_resonance`/`magnetic_sensitivity`/`rift_attunement` (all-EN -> IT), `antenne_tesla` (eponimo), `antenne_dustsense`/`antenne_wideband` (anglicismi), `biochip_memoria` -> `corteccia_predatoria` (v8, device-name). Tool sistematico = `tools/py/normalize_trait_style.py` + `styleguide_compliance_report.py`. **Eseguire come UN batch** (rename nel per-trait `data/traits/<cat>/<trait>.json` + active_effects + glossary + locale, poi rigenera: `build_species_trait_bridge.py` [index+affinity] + `sync_trait_lists.js` [trait_reference mirror] + snapshot regen [`tests/snapshots/species_builder_predatore.json` + mission-console GenerationFlow.snap]) -> 1 PR, master-dd ratifica i nomi. v8 = high-blast (52 ref + 2 snapshot) -> ha senso SOLO dentro questo batch, non da solo.

## 4. Note data-model (vedi [reground-correction](2026-06-22-tkt-p6-b-reground-correction.md))

DERIVED (regenerate, mai hand-edit): `species_catalog.json` (ETL 4-5 stage) + `data/traits/species_affinity.json` + `data/traits/index.json` (bridge) + mirror pack-catalog + snapshot. SOURCE: active_effects.yaml, glossary.json, `data/traits/<cat>/<trait>.json`, biome_pools.json, pack species YAML, `data/external/evo`.
