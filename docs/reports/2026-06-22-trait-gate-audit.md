---
title: 'Trait gate audit -- multi-registry coverage (Phase 1)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [trait, audit, gate, registry, coverage, salvage]
---

# Trait gate audit -- multi-registry coverage (Phase 1)

Phase 1 of [`derived-canon-salvage-roadmap`](../superpowers/plans/2026-06-22-derived-canon-salvage-roadmap.md). Audits every trait against three registries: per-trait DB files (`data/traits/<cat>/<trait>.json`), the resolver (`data/core/traits/active_effects.yaml`), and the glossary (`data/core/traits/glossary.json`). `ancestor_*` identity-only traits are excluded (Tier-Ancestor policy: no per-trait file expected).

## Summary

| Check | Result |
| --- | --- |
| Per-trait files vs schema gate (ADR-2026-05-29) | **263/263 PASS** (0 failures) |
| Per-trait DB files | 263 |
| Resolver (active_effects) ids, non-ancestor | 213 |
| Glossary ids | 604 |
| GAP 1: in resolver, NO per-trait file | **53** |
| GAP 2: per-trait file, NOT in resolver | **103** |

No per-trait file fails the schema gate -- the work is coverage, not conformance.

## GAP 1 -- in active_effects (resolver) but NO per-trait DB file (53)

Resolve mechanically but lack a canonical DB definition. Many are clearly real + recent (interoception `nocicezione`/`propriocezione`/`equilibrio_vestibolare`; TKT-P6-B `cervello_predittivo`/`mente_lucida`/`marchio_predatorio`; bond `legame_di_branco`). They need a per-trait file to fully pass the iter (mostly mechanical authoring from the active_effects entry; a few `starter_bioma_*` may be non-traits to drop). Includes the 6 traits missing from the stale affinity: `legame_di_branco`, `marchio_predatorio`, `ferocia`, `aculei_velenosi`, `martello_osseo`, `pelle_elastomera`.

- `aculei_velenosi`
- `arco_voltaico`
- `aura_glaciale`
- `canto_di_richiamo`
- `cervello_predittivo`
- `cuore_in_furia`
- `denti_seghettati`
- `equilibrio_vestibolare`
- `ferocia`
- `intimidatore`
- `legame_di_branco`
- `marchio_predatorio`
- `martello_osseo`
- `mente_lucida`
- `midollo_iperattivo`
- `nocicezione`
- `pelle_elastomera`
- `pelli_anti_ustione`
- `pelli_cave`
- `pelli_fitte`
- `propriocezione`
- `pungiglione_paralizzante`
- `risonanza_magnetica`
- `scarica_ionica`
- `senso_magnetico`
- `sensori_sismici`
- `sintonia_magnetica`
- `spirito_combattivo`
- `spore_paniche`
- `starter_bioma_enfj`
- `starter_bioma_enfp`
- `starter_bioma_entj`
- `starter_bioma_entp`
- `starter_bioma_esfj`
- `starter_bioma_esfp`
- `starter_bioma_estj`
- `starter_bioma_estp`
- `starter_bioma_infj`
- `starter_bioma_infp`
- `starter_bioma_intj`
- `starter_bioma_intp`
- `starter_bioma_isfj`
- `starter_bioma_isfp`
- `starter_bioma_istj`
- `starter_bioma_istp`
- `stordimento`
- `sussurro_psichico`
- `tela_appiccicosa`
- `tentacoli_uncinati`
- `termocezione`
- `voce_imperiosa`
- `wounded_perma`
- `zampe_radianti`

## GAP 2 -- per-trait DB file but NOT in active_effects (103)

Defined as DB files but not wired to the resolver -> likely inert (no mechanical effect). Each needs either an active_effects entry (design-call: WHAT effect) or a decision that it is descriptive-only. Note the `*_2` dup-suffix entries (e.g. `artigli_sette_vie_2`) = probable duplicates to reconcile first.

- `antenne_waveguide`
- `appendici_thermotattiche`
- `articolazioni_multiassiali`
- `artigli_sette_vie_2`
- `bioantenne_gravitiche`
- `branchie_solfatiche`
- `branchie_turbina`
- `camere_anticorrosione`
- `camere_nutrienti_vent`
- `canto_risonante`
- `capsule_paracadute`
- `cartilagine_flessotermica_venti`
- `cartilagini_desertiche`
- `cavita_risonanti_tundra`
- `cervelletto_equilibrio_statico`
- `chemiorecettori_bromuro`
- `chioma_parassita_canopica`
- `cinghia_iper_ciliare`
- `circolazione_bifasica_palude`
- `circolazione_cooling_loop`
- `ciste_riduttive`
- `ciste_salmastre`
- `cisti_di_ibernazione_minerale`
- `cisti_iperbariche`
- `coda_frusta_cinetica_2`
- `coda_stabilizzatrice_geiser`
- `colonne_vibromagnetiche`
- `coralli_partner`
- `coralli_sinaptici_fotofase`
- `coscienza_dalveare_diffusa`
- `criostasi_adattiva_2`
- `cromofori_alert_acido`
- `cuscinetti_elettrostatici`
- `echi_risonanti`
- `ectotermia_dinamica`
- `emettitori_voidsong`
- `emolinfa_conducente`
- `enzimi_metanoossidanti`
- `epitelio_fosforescente`
- `estroflessione_gastrica_acida`
- `filtri_planctonici`
- `flagelli_ancoranti`
- `focus_frazionato_2`
- `foliage_fotocatodico`
- `foliaggio_spugna`
- `ghiaccio_piezoelettrico`
- `ghiandola_caustica`
- `ghiandole_fango_coesivo`
- `ghiandole_mnemoniche`
- `ghiandole_ventosa`
- `giunti_antitorsione`
- `gusci_magnesio`
- `impulsi_bioluminescenti`
- `integumento_bipolare`
- `lamelle_sincroniche`
- `lamine_scudo_silice`
- `linfa_tampone`
- `lobi_risonanti_crepuscolo`
- `locomozione_miriapode_ibrida`
- `luminescenza_hydrotermica`
- `mantelli_geotermici`
- `membrane_captura_rugiada`
- `membrane_planata_vectored`
- `motore_biologico_silenzioso`
- `mucillagine_simbionte_mangrovie`
- `mucose_aderenza_sonica`
- `mucose_barofile`
- `nebbia_mnesica`
- `nodi_micorrizici_oracolari`
- `nodi_sinaptici_superficiali`
- `organi_metacronici`
- `organi_sismici_cutanei`
- `pathfinder`
- `pianificatore`
- `piume_solari_fotovoltaiche`
- `placca_diffusione_foschia`
- `placche_pressioniche`
- `polmoni_cristallini_alta_quota`
- `random`
- `rete_filtro_polmonare`
- `risonanza_di_branco_2`
- `riverbero_memetico`
- `rostro_linguale_prensile`
- `sacche_galleggianti_ascensoriali_2`
- `sacche_spore_stratosferiche`
- `scheletro_idro_regolante_2`
- `scintilla_sinaptica`
- `scudo_gluteale_cheratinizzato`
- `secrezioni_antistatiche`
- `siero_anti_gelo_naturale`
- `sinapsi_coraline_polifoniche`
- `spicole_canalizzatrici`
- `squame_diffusori_ionici`
- `squame_rifrangenti_deserto`
- `struttura_elastica_amorfa_2`
- `tattiche_di_branco`
- `tattiche_di_branco_2`
- `traits_aggregate`
- `unghie_a_micro_adesione`
- `vello_condensatore_nebbie`
- `vello_di_assorbimento_totale`
- `vortice_nera_flash`
- `zanne_idracida`

## Closure approach (proposed)

- **GAP 1 (mine, mostly mechanical):** author a per-trait DB file per resolver entry (id + category + label from glossary + mechanic ref). Flag ambiguous `starter_bioma_*` for you.
- **GAP 2 (design-gated):** the mechanical effect for each inert trait is a design call -- I propose, you ratify (same model as the creatures). Reconcile `*_2` dupes first.
- After closure: `node scripts/build_trait_index.js` + bridge + `check_derived_reproducible.py`.
