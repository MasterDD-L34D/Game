---
title: '14 retired creatures -- salvage identity proposal (RATIFIED 2026-06-23)'
date: 2026-06-22
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
review_cycle_days: 90
tags: [species, salvage, creatures, ip-safe, ratify, codex]
---

# 14 retired creatures -- salvage identity proposal

Phase 3 of the [salvage roadmap](../superpowers/plans/2026-06-22-derived-canon-salvage-roadmap.md).
The 14 creatures referenced only by the stale affinity were retired (D&D-name
placeholders, IP risk). Per master-dd: adapt + rename (IP-safe) + run through
canonization. **I draft, you ratify** -- approve/edit the name + concept + biome
per creature; then I generate A.L.I.E.N.A. lore (HITL gate) + canonize via the
species pipeline + `add_trait_stub` for any kit traits still missing.

Each `scientific_name` / `id` / `common_name_it` below is a **proposal** derived
from the salvaged trait-kit (the creature's mechanical identity). No D&D names.
Edit freely.

| #   | retired id             | proposed scientific_name   | proposed id                  | common_name_it        | concept (from kit)                                                         | biome (proposed)       | danger / sentience |
| --- | ---------------------- | -------------------------- | ---------------------------- | --------------------- | -------------------------------------------------------------------------- | ---------------------- | ------------------ |
| 1   | archon-solare          | Heliopteryx radians        | `heliopteryx_radians`        | Aliradiante solare    | Volatore sociale a vele fotoniche, aura-scudo di radianza                  | altipiani_solari       | 2 / T2             |
| 2   | balor-fission          | Pyroflagellum meteoriticum | `pyroflagellum_meteoriticum` | Flagello igneo        | Bruiser volante corazzato, frusta fiammeggiante + mantello meteoritico     | abisso_vulcanico       | 4 / T1             |
| 3   | banshee-risonante      | Sonovespera lamentans      | `sonovespera_lamentans`      | Vespero sonoro        | Volatore a risonanza sonora, eco sismico, spore psichiche silenziate       | canyons_risonanti      | 3 / T2             |
| 4   | bulette-fase           | Tellurmordax phasicus      | `tellurmordax_phasicus`      | Tellumordace di fase  | Scavatore corazzato a carapace di fase, coda-frusta cinetica               | badlands               | 4 / T1             |
| 5   | couatl-aurora          | Auroserpens photonicus     | `auroserpens_photonicus`     | Auroserpe             | Serpente alato fotonico sociale, empatia coordinativa                      | canopia_ionica         | 3 / T3             |
| 6   | golem-runico           | Lithoconstructus inhibens  | `lithoconstructus_inhibens`  | Litoautoma inibitore  | Costrutto artificiale corazzato, matrice anti-campo + nuclei di controllo  | cattedrale_apex        | 4 / T1             |
| 7   | magnet-fathom-surveyor | Amorphovenator magneticus  | `amorphovenator_magneticus`  | Sondatore amorfo      | Predatore amorfo abissale, olfatto a risonanza magnetica                   | abisso_luminescente    | 2 / T1             |
| 8   | marilith-vault         | Rotabrachium ferox         | `rotabrachium_ferox`         | Rotabraccio           | Percussore multi-arto a nucleo ovomotore rotante, frusta fiammeggiante     | abisso_vulcanico       | 5 / T2             |
| 9   | orbital-ascendant      | Aerostatocyon altivolans   | `aerostatocyon_altivolans`   | Aerostato ascendente  | Fluttuatore d'alta quota a sacche ascensionali, occhi cristallo, criostasi | stratosfera_tempestosa | 2 / T2             |
| 10  | otyugh-sentinella      | Filtrophagus custos        | `filtrophagus_custos`        | Filtrofago sentinella | Spazzino-sentinella a filtri bioattivi + membrane osmotiche                | palude                 | 3 / T1             |
| 11  | psionic-canopy-scout   | Cryptopennatus psionicus   | `cryptopennatus_psionicus`   | Esploratore di chioma | Aliante di chioma mimetico, psionico a spore silenziate                    | canopia_ionica         | 2 / T3             |
| 12  | rakshasa-corte         | Illusiopardus psionicus    | `illusiopardus_psionicus`    | Mascheraio illusorio  | Psionico illusionista a maschera + tessuti adattivi, sociale               | foresta_temperata      | 4 / T4             |
| 13  | resonant-claw-hunter   | _(museum candidate)_       | _(defer)_                    | _(defer)_             | **THIN** -- 1 solo trait (artigli_sette_vie); identita' insufficiente      | --                     | --                 |
| 14  | treant-portale         | Radiciforma ancorans       | `radiciforma_ancorans`       | Ancora radicale       | Flora-creatura ancorata, corteccia memetica + pigmenti aurorali            | foresta_miceliale      | 3 / T2             |

## Notes

- `rovine_planari` deliberately avoided (off-limits per project memory).
- `danger` / `sentience` = seeds derived from the kit (offensive trait count +
  social/psionic markers); ratify or adjust.
- **#13 resonant-claw-hunter**: only `artigli_sette_vie` survives -> not enough to
  anchor a species. Proposal: **museum/defer** (revive later if wanted) rather than
  invent an identity from one generic trait.

## After your ratify (per creature)

1. Generate A.L.I.E.N.A. lore DRAFT (`codex_aliena_lore_gen.py`) -> you review the
   prose (HITL gate `lore_review_status: human_reviewed`).
2. Author the source entry (`data/external/evo/species/...` + lifecycle stub) +
   any missing kit traits via `add_trait_stub`.
3. Canonize through the species pipeline (merge -> enrich -> promote) + re-baseline
   step; CI-green per the 5-gate flow.

**Your call**: approve the names/concepts/biomes as-is, edit any, and confirm #13
museum-vs-keep. Then I proceed creature-by-creature.

## RATIFIED 2026-06-23 (master-dd)

master-dd ratified **all 13 viable identities as proposed** (names / ids / biomes /
danger / sentience unchanged). **#13 resonant-claw-hunter -> museum/defer** confirmed
(THIN, single trait). Proceed: per creature -> A.L.I.E.N.A. lore DRAFT (HITL review) ->
source entry -> canonize via the species pipeline (the promote/re-baseline step is the
owner-gated catalog ETL -- coupled with the salvage residual item 4).

### Recovered kits (ground-truth from the stale `species_affinity.json`, NOT fabricated)

Each retired id's full trait kit, inverted from the trait-keyed affinity (core =
`roles:[core]`). Authoring source for each creature's `genetic_traits` /
`derived_from_environment.suggested_traits`. All kit traits are authored in `index.json`
(the `*_2` files in `data/traits/_drafts/` are external-import duplicates = item 3 dedup,
NOT missing traits).

| proposed id                  | core kit                                                                                                                                                                       | other kit                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `heliopteryx_radians`        | adattamento_volo, aura_scudo_radianza, ciclo_vitale_completo, metabolismo_attivo, respirazione_biologica                                                                       | ali_solari_fotoni, empatia_coordinativa, focus_frazionato, risonanza_di_branco, visione_spettrale                                                                           |
| `pyroflagellum_meteoriticum` | adattamento_volo, ciclo_vitale_completo, frusta_fiammeggiante, mantello_meteoritico, metabolismo_attivo, respirazione_biologica                                                | armatura_pietra_planare, artigli_sette_vie, carapace_fase_variabile, empatia_coordinativa, focus_frazionato                                                                 |
| `sonovespera_lamentans`      | adattamento_volo, ali_fono_risonanti, assenza_respirazione, ciclo_vitale_anomalo, metabolismo_sostentato, origine_artificiale, risonanza_di_branco, spore_psichiche_silenziate | eco_sismico, focus_frazionato, intangibilita_parziale, lamenti_diradanti, voce_spettrale                                                                                    |
| `tellurmordax_phasicus`      | ciclo_vitale_completo, fisiologia_predatoria, metabolismo_attivo, respirazione_biologica                                                                                       | armatura_pietra_planare, carapace_fase_variabile, coda_frusta_cinetica, lamelle_termoforetiche, scheletro_idro_regolante, sensori_geomagnetici                              |
| `auroserpens_photonicus`     | adattamento_volo, ciclo_vitale_completo, metabolismo_attivo, respirazione_biologica                                                                                            | ali_solari_fotoni, artigli_sette_vie, empatia_coordinativa, focus_frazionato, ghiandole_nettare_memetico, lamelle_termoforetiche, risonanza_di_branco, sensori_geomagnetici |
| `lithoconstructus_inhibens`  | armatura_pietra_planare, assenza_respirazione, ciclo_vitale_anomalo, metabolismo_sostentato, origine_artificiale                                                               | carapace_fase_variabile, matrice_antimagia, nuclei_di_controllo                                                                                                             |
| `amorphovenator_magneticus`  | filamenti_digestivi_compattanti, olfatto_risonanza_magnetica, struttura_elastica_amorfa                                                                                        | lamelle_termoforetiche, scheletro_idro_regolante                                                                                                                            |
| `rotabrachium_ferox`         | ciclo_vitale_completo, focus_frazionato, frusta_fiammeggiante, mantello_meteoritico, metabolismo_attivo, nucleo_ovomotore_rotante, respirazione_biologica                      | artigli_sette_vie, coda_frusta_cinetica, empatia_coordinativa, sensori_geomagnetici, visione_spettrale                                                                      |
| `aerostatocyon_altivolans`   | focus_frazionato, occhi_cristallo_modulare, olfatto_risonanza_magnetica, sacche_galleggianti_ascensoriali                                                                      | criostasi_adattiva, eco_interno_riflesso                                                                                                                                    |
| `filtrophagus_custos`        | ciclo_vitale_completo, metabolismo_attivo, respirazione_biologica                                                                                                              | artigli_sette_vie, carapace_fase_variabile, filtri_bioattivi, lamelle_termoforetiche, membrane_osmotiche, proboscide_polifaga, sensori_chimici                              |
| `cryptopennatus_psionicus`   | focus_frazionato, mimetismo_cromatico_passivo, pathfinder, sacche_galleggianti_ascensoriali, struttura_elastica_amorfa                                                         | ali_fono_risonanti, nucleo_ovomotore_rotante, occhi_cristallo_modulare, olfatto_risonanza_magnetica, spore_psichiche_silenziate                                             |
| `illusiopardus_psionicus`    | ciclo_vitale_completo, metabolismo_attivo, respirazione_biologica                                                                                                              | artigli_psionici, empatia_coordinativa, maschera_illusoria, risonanza_di_branco, tessuti_adattivi                                                                           |
| `radiciforma_ancorans`       | ciclo_vitale_completo, metabolismo_attivo, respirazione_biologica                                                                                                              | armatura_pietra_planare, corteccia_memetica, pigmenti_aurorali, radici_ancora_planare, reti_capillari_radici, risonanza_di_branco                                           |

(`random` markers in the raw affinity are dropped -- not a trait.)
