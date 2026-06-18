---
title: '5-stub species calibration + authoring -- master-dd ratification proposal'
workstream: ops-qa
category: planning
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-18'
language: en
tags: [species, calibration, balance, vc, foodweb, ecology, ai-playtest, ratification]
---

# 5-stub species calibration + authoring -- ratification proposal

Deferred follow-up to PR #2850 (`5e10825d`), which deployed 5 promoted species as
honest uncalibrated stubs (`vc: {}`, `balance: encounter_role` only, empty/partial
`trait_refs`, foodweb + ecology marked `needs-master-dd` in `species_catalog.json`).

Master-dd decisions (AskUserQuestion 2026-06-18): scope = **everything now** (author +
calibrate badlands + build foresta scenario infra + vc telemetry refine); authoring =
**I propose / you ratify**; bands = **dedicated per-role**.

This doc is the "I propose" artifact. Values grounded in the existing canon
(`species_catalog.json` prose: visual_description / symbiosis / ecology) + the
calibrated reference species (`rust-scavenger.yaml`, `dune-stalker.yaml`) +
`active_effects.yaml` (every trait id below verified present).

## Verified edit-target map (corrects two research-agent errors)

| Surface                                                             | Edit target                                                                                 | Evidence                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| balance (rarity/threat_tier/encounter_role) + vc + genetic_traits   | pack species YAML `packs/evo_tactics_pack/data/species/<biome>/<id>.yaml`                   | refs use exactly these; `genetic_traits` = plain slugs (NOT `trait_refs: TR-####`)     |
| foodweb edges (predation/herbivory/...)                             | `packs/evo_tactics_pack/data/foodwebs/<biome>_foodweb.yaml` (nodes + edges, prey->predator) | both biome files exist; zero pack YAML uses top-level `interactions`                   |
| interactions narrative + ecology (the `needs-master-dd` provenance) | `data/core/species/species_catalog.json`                                                    | catalog is SoT; `update_evo_pack_catalog.js` mirror reads `entry.interactions/ecology` |

Foodweb validator rules (enforced): edge node ids must exist; `decompositore`/`produttore`
CANNOT be a predation/herbivory/grazing SOURCE; apex `predated_by` a non-threat/event = WARNING;
`engineering` edge source must be keystone/ingegnere_ecosistema.

## Per-species proposal

### 1. ferrimordax-rutilus (badlands, apex, elite) -- danger 2, solitary territorial

- **balance**: rarity `R3`, threat_tier `T3`, encounter_role `elite` (unchanged).
- **vc**: aggro 0.8, risk 0.7, cohesion 0.2 (solitary), setup 0.4, explore 0.5, tilt 0.5.
- **genetic_traits**: core `denti_ossidoferro, carapaci_ferruginosi` (existing); optional
  `martello_osseo, artigli_sette_vie`; synergy `marchio_predatorio, olfatto_risonanza_magnetica`
  (solitary-appropriate; NO branco synergies).
- **foodweb** (badlands): new node `ferrimordax-rutilus` (species). Edges:
  `rubrospina-velox -> ferrimordax-rutilus (predation)`, `sand-burrower -> ferrimordax-rutilus (predation)`.
- **interactions** (catalog): predates_on `[rubrospina-velox, sand-burrower]`; predated_by `[]`; symbiosis `nessuna`.
- **ecology**: trophic_tier `apex`, pack_size `{min:1, max:1}`.

### 2. rubrospina-velox (badlands, consumatore_secondario, ambient) -- bridge/scout, fast cursorial

- **balance**: rarity `R2`, threat_tier `T1`, encounter_role `ambient`.
- **vc**: aggro 0.5, risk 0.5, cohesion 0.4, setup 0.4, explore 0.8 (scout/bridge), tilt 0.3.
- **genetic_traits**: core `artigli_sette_vie, aculei_velenosi, zampe_a_molla`; optional
  `antenne_eco_turbina, criostasi_adattiva`; synergy `focus_frazionato`.
- **foodweb**: new node `rubrospina-velox`. Edges: `sand-burrower -> rubrospina-velox (predation)`,
  `rubrospina-velox -> ferrimordax-rutilus (predation)`, `rubrospina-velox -> dune-stalker (predation)`.
- **interactions**: predates_on `[sand-burrower]`; predated_by `[ferrimordax-rutilus, dune-stalker]`; symbiosis `nessuna`.
- **ecology**: trophic_tier `secondary_consumer`, pack_size `{min:1, max:3}`.

### 3. ferriscroba-detrita (badlands, decompositore, ambient) -- keystone

- **balance**: rarity `R2`, threat_tier `T1`, encounter_role `ambient`.
- **vc**: aggro 0.2, risk 0.2, cohesion 0.7, setup 0.6, explore 0.4, tilt 0.2 (passive keystone scavenger, mirrors rust-scavenger).
- **genetic_traits**: core `ventriglio_gastroliti, filamenti_digestivi_compattanti, enzimi_chelanti`;
  optional `respiro_a_scoppio, nucleo_ovomotore_rotante`; synergy none.
- **foodweb**: new node `ferriscroba-detrita`. Edges: `detrito -> ferriscroba-detrita (detritus)`,
  `carcasse -> ferriscroba-detrita (scavenging)`, `ferriscroba-detrita -> arbusti_xerofili (engineering)`
  (keystone redistributes detritus -> producers; canon symbiosis; engineering source OK = keystone).
  NO predation source edge (decompositore rule).
- **interactions**: predates_on `[]`; predated_by `[]`; symbiosis = existing catalog text (keep).
- **ecology**: trophic_tier `scavenger`, pack_size `{min:1, max:3}` (already in catalog).

### 4. nebulocornis-mollis (foresta_temperata, consumatore_primario, ambient) -- support/grazer, soft misty

- **balance**: rarity `R2`, threat_tier `T1`, encounter_role `ambient`.
- **vc**: aggro 0.2, risk 0.3, cohesion 0.6, setup 0.5, explore 0.5, tilt 0.2.
- **genetic_traits**: core `pelle_elastomera, scheletro_pneumatico_a_maglie, membrane_pneumatofori`;
  optional `biofilm_glow, cuticole_cerose`; synergy `empatia_coordinativa, focus_frazionato`.
- **foodweb** (foresta): new node `nebulocornis-mollis`. Edges:
  `produttori_base -> nebulocornis-mollis (herbivory)`, `nebulocornis-mollis -> PRED_LUPO (predation)`.
- **interactions**: predates_on `[]`; predated_by `[lupus-temperatus]`; symbiosis `nessuna`.
- **ecology**: trophic_tier `primary_consumer`, pack_size `{min:3, max:6}` (gregario grazer).

### 5. arboryxis-lenis (foresta_temperata, consumatore_primario, ambient) -- bridge/grazer, slow arboreal

- **balance**: rarity `R2`, threat_tier `T1`, encounter_role `ambient`.
- **vc**: aggro 0.2, risk 0.2, cohesion 0.4, setup 0.6, explore 0.7 (bridge), tilt 0.2.
- **genetic_traits**: core `zampe_a_molla, articolazioni_a_leva_idraulica, pelle_elastomera`;
  optional `pelage_idrorepellente_avanzato, sacche_galleggianti_ascensoriali`; synergy `focus_frazionato, legame_di_branco`.
- **foodweb**: new node `arboryxis-lenis`. Edges:
  `produttori_base -> arboryxis-lenis (grazing)`, `arboryxis-lenis -> PRED_LUPO (predation)`.
  (Canon "opens canopy clearings" kept as catalog symbiosis narrative only -- arboryxis is not
  keystone, so no `engineering` edge to avoid validator WARNING.)
- **interactions**: predates_on `[]`; predated_by `[lupus-temperatus]`; symbiosis = existing catalog text (keep).
- **ecology**: trophic_tier `primary_consumer`, pack_size `{min:1, max:2}`.

## Band mapping (dedicated per-role) + calibration tracks

Per-role bands using master-dd ranges (tutorial 70-90 / standard 30-50 / elite 15-30).
Win-rate = party-vs-encounter; a species' "difficulty" = how it shifts its host scenario.

| species             | encounter_role | calibration track / scenario                          | proposed band      | infra                                                         |
| ------------------- | -------------- | ----------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| ferrimordax-rutilus | elite          | **enc_badlands_elite_01** (NEW, ferrimordax-anchored) | [0.15, 0.30]       | new scenario + runner + SCENARIO_MAP + curves + route + suite |
| rubrospina-velox    | ambient        | enc_badlands_pilot_01 (existing)                      | [0.40, 0.60] reuse | roster add + re-verify N=40 holds                             |
| ferriscroba-detrita | ambient        | enc_badlands_pilot_01 (existing)                      | [0.40, 0.60] reuse | roster add + re-verify                                        |
| nebulocornis-mollis | ambient        | **enc_foresta_pilot_01** (NEW)                        | [0.30, 0.50]       | new scenario stack                                            |
| arboryxis-lenis     | ambient        | **enc_foresta_pilot_01** (NEW)                        | [0.30, 0.50]       | new scenario stack                                            |

objective_metric (all tracks, doctrine composite): `0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio`.
escalation_policy: N=10 probe (direction) -> N=40 ratify (gate) -> N=100 forensic if steep/OOB.
Runtime = node 22 (canonical, per CANONICAL-AI-PLAYTEST sec 3 rule 8). seed 424242.

## Build plan (PR sequence)

- **S0 -- data authoring (all 5)**: pack YAML balance+vc+genetic_traits (5 files) + foodweb edges
  (badlands + foresta foodweb yaml) + catalog interactions/ecology (clear `needs-master-dd` marks) ->
  `npm run sync:evo-pack` -> gates: `validate-datasets`, `validate-ecosystem-pack` (species + foodweb),
  canon-consistency. Band-neutral (no scenario wired yet).
- **S1 -- badlands calibration**: add rubrospina+ferriscroba to `badlandsPilotScenario.js` roster (re-verify
  [0.40,0.60] N=40) + build `enc_badlands_elite_01` (ferrimordax) -> N=10 probe -> N=40 ratify [0.15,0.30]
  - canonical-suite entries.
- **S2 -- foresta calibration infra**: build `forestaPilotScenario.js` + `batch_calibrate_foresta_pilot_01.py`
  - SCENARIO_MAP `foresta_pilot_01` + damage_curves `foresta_temperata` class band + tutorial route +
    suite entry -> N=10 -> N=40 ratify [0.30,0.50]. (Adapter is biome-agnostic -> no adapter change.)
- **S3 -- vc telemetry refine**: N>=50 sim across the encounters -> aggregate vc via `vcScoring.js` ->
  update the 5 vc blocks from ratified telemetry (replaces the heuristic vc above).

Each PR: ASCII-first, ADR-0011 trailers (`Coding-Agent` + `Trace-Id`), Conventional Commit lowercase,
manual `prettier --write` pre-commit, gates green, Eduardo merges.

## Open ratification questions

1. **Bands**: confirm the 3-track mapping + numbers above? Or simplify (e.g. no separate elite scenario --
   fold ferrimordax into the badlands pilot as an apex anchor and re-ratify the pilot to a harder band)?
   Or different band numbers?
2. **Authoring**: approve the per-species genetic_traits + foodweb edges + ecology + interactions as
   proposed, or flag specific species to revise?
3. **vc heuristic**: OK to ship S0 with the heuristic vc above (refined later in S3 from telemetry),
   matching the reference-species convention?
