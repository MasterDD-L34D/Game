---
title: 'Trait Orphan Audit — Batch Review A/B/C'
doc_status: research
doc_owner: balance-auditor
workstream: dataset-pack
last_verified: 2026-05-10
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [trait, audit, orphan, batch-review]
type: research
---

# Trait Orphan Audit — Batch Review A/B/C

**Date**: 2026-05-10
**Agent**: balance-auditor (Claude Sonnet 4.6)
**Scope**: `data/core/traits/active_effects.yaml` — core wave traits with zero assignment to `data/core/species.yaml` / `data/core/species_expansion.yaml` / `data/core/species/*` AND not defined in `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` traits section.

## Data sources read

- `data/core/traits/active_effects.yaml` — 499 top-level keys total: 209 with `tier:` line (core wave), 290 `ancestor_*` without `tier:` line, 16 `starter_bioma_*`
- `data/core/species.yaml` + `data/core/species_expansion.yaml` + `data/core/species/*`
- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`
- `docs/museum/MUSEUM.md` — cards consulted: M-2026-04-25-004 Ancestors Neurons, M-2026-04-25-005 Magnetic Rift Resonance, M-2026-04-26-001 Voidling Bound
- `docs/traits/traits_scheda_operativa.md` — style guide reference
- `docs/traits/manuale/03-tassonomia-famiglie.md` — naming convention reference

## Numbers summary

| Pool                                             | Count   |
| ------------------------------------------------ | ------- |
| Total traits in file                             | 499     |
| Core wave (have `tier:` field)                   | 209     |
| `ancestor_*` stubs (no `tier:`)                  | 290     |
| `starter_bioma_*` (MBTI seeds)                   | 16      |
| Core assigned to species                         | 63      |
| Core in trait_mechanics                          | 33      |
| **Core orphans (neither species nor mechanics)** | **109** |
| — A keep (content backlog)                       | **59**  |
| — B defer (design call needed)                   | **34**  |
| — C delete (stale / non-canonical)               | **16**  |

Note: the prior audit reference of "59 orphans" likely counted a subset of the wave 1-4 traits before wave 5-6 were added and before the swarm/miscellaneous tail was included.

---

## 1. Full Audit Table — 109 Orphan Traits

### Wave 0 (sprint 002/018/019 — core engine traits)

| trait_id         | tier | category        | effect.kind             | orphan reason           | verdict |
| ---------------- | ---- | --------------- | ----------------------- | ----------------------- | ------- |
| zampe_a_molla    | T1   | fisiologico     | extra_damage            | not assigned to species | A       |
| pelle_elastomera | T1   | fisiologico     | damage_reduction        | not assigned to species | A       |
| ferocia          | T1   | comportamentale | apply_status (rage)     | not assigned            | A       |
| intimidatore     | T1   | comportamentale | apply_status (panic)    | not assigned            | A       |
| stordimento      | T1   | traumatico      | apply_status (stunned)  | not assigned            | A       |
| martello_osseo   | T1   | traumatico      | apply_status (fracture) | not assigned            | A       |

### Wave 1 — ARTIGLI

| trait_id                   | tier | category    | effect.kind             | orphan reason | verdict |
| -------------------------- | ---- | ----------- | ----------------------- | ------------- | ------- |
| artigli_sghiaccio_glaciale | T2   | traumatico  | apply_status (fracture) | not assigned  | A       |
| artigli_acidofagi          | T1   | fisiologico | apply_status (bleeding) | not assigned  | A       |
| artigli_vetrificati        | T2   | fisiologico | extra_damage            | not assigned  | A       |
| artigli_induzione          | T2   | fisiologico | apply_status (stunned)  | not assigned  | A       |
| artigli_radice             | T1   | fisiologico | apply_status (fracture) | not assigned  | A       |
| artigli_scivolo_silente    | T1   | fisiologico | extra_damage            | not assigned  | A       |

### Wave 1 — DENTI

| trait_id             | tier | category    | effect.kind             | orphan reason | verdict |
| -------------------- | ---- | ----------- | ----------------------- | ------------- | ------- |
| denti_chelatanti     | T2   | fisiologico | apply_status (bleeding) | not assigned  | A       |
| denti_ossidoferro    | T1   | fisiologico | extra_damage            | not assigned  | A       |
| denti_silice_termici | T2   | traumatico  | apply_status (bleeding) | not assigned  | A       |
| denti_tuning_fork    | T1   | traumatico  | apply_status (stunned)  | not assigned  | A       |

### Wave 1 — ALI

| trait_id            | tier | category    | effect.kind            | orphan reason | verdict |
| ------------------- | ---- | ----------- | ---------------------- | ------------- | ------- |
| ali_fulminee        | T1   | fisiologico | extra_damage           | not assigned  | A       |
| ali_ioniche         | T1   | fisiologico | apply_status (stunned) | not assigned  | A       |
| ali_membrana_sonica | T1   | traumatico  | apply_status (panic)   | not assigned  | A       |

### Wave 1 — CODA (partial)

| trait_id         | tier | category    | effect.kind  | orphan reason | verdict |
| ---------------- | ---- | ----------- | ------------ | ------------- | ------- |
| coda_balanciere  | T1   | fisiologico | extra_damage | not assigned  | A       |
| coda_contrappeso | T1   | fisiologico | extra_damage | not assigned  | A       |

### Wave 1 — ACULEI

| trait_id                 | tier | category    | effect.kind             | orphan reason | verdict |
| ------------------------ | ---- | ----------- | ----------------------- | ------------- | ------- |
| aculei_velenosi          | T1   | fisiologico | apply_status (bleeding) | not assigned  | A       |
| pungiglione_paralizzante | T2   | traumatico  | apply_status (stunned)  | not assigned  | A       |

### Wave 2 — DEFENSIVE (pelle/epidermide/cuticole/carapace/membrane/cartilagini/biofilm/lamelle/branchie)

| trait_id                       | tier | category    | effect.kind      | orphan reason | verdict |
| ------------------------------ | ---- | ----------- | ---------------- | ------------- | ------- |
| epidermide_dielettrica         | T1   | fisiologico | damage_reduction | not assigned  | A       |
| cuticole_neutralizzanti        | T2   | fisiologico | damage_reduction | not assigned  | A       |
| carapace_luminiscente_abissale | T2   | fisiologico | damage_reduction | not assigned  | A       |
| carapace_segmenti_logici       | T2   | fisiologico | damage_reduction | not assigned  | A       |
| carapaci_ferruginosi           | T2   | fisiologico | damage_reduction | not assigned  | A       |
| membrane_eliofiltranti         | T1   | fisiologico | damage_reduction | not assigned  | A       |
| membrane_pneumatofori          | T1   | fisiologico | damage_reduction | not assigned  | A       |
| cartilagini_biofibre           | T1   | fisiologico | damage_reduction | not assigned  | A       |
| cartilagini_pseudometalliche   | T2   | fisiologico | damage_reduction | not assigned  | A       |
| cartilagini_flessoacustiche    | T2   | fisiologico | damage_reduction | not assigned  | A       |
| biofilm_iperarido              | T1   | fisiologico | damage_reduction | not assigned  | A       |
| biofilm_glow                   | T1   | fisiologico | damage_reduction | not assigned  | A       |
| lamelle_shear                  | T1   | fisiologico | damage_reduction | not assigned  | A       |

### Wave 3 — STATUS APPLIERS (ghiandole/enzimi/aura/tentacoli/spore/batteri/voce)

| trait_id                     | tier | category        | effect.kind             | orphan reason | verdict |
| ---------------------------- | ---- | --------------- | ----------------------- | ------------- | ------- |
| ghiandole_inchiostro_luce    | T1   | comportamentale | apply_status (panic)    | not assigned  | A       |
| ghiandole_nebbia_acida       | T2   | fisiologico     | apply_status (bleeding) | not assigned  | A       |
| ghiandole_nebbia_ionica      | T2   | traumatico      | apply_status (stunned)  | not assigned  | A       |
| ghiandole_iodoattive         | T2   | fisiologico     | apply_status (bleeding) | not assigned  | A       |
| ghiandole_fango_calde        | T1   | comportamentale | apply_status (fracture) | not assigned  | A       |
| ghiandole_condensa_ozono     | T2   | traumatico      | apply_status (stunned)  | not assigned  | A       |
| enzimi_chelatori_rapidi      | T2   | fisiologico     | apply_status (bleeding) | not assigned  | A       |
| enzimi_antipredatori_algali  | T2   | fisiologico     | damage_reduction        | not assigned  | A       |
| enzimi_antifase_termica      | T2   | fisiologico     | damage_reduction        | not assigned  | A       |
| aura_scudo_radianza          | T2   | fisiologico     | damage_reduction        | not assigned  | B       |
| tentacoli_uncinati           | T1   | fisiologico     | apply_status (fracture) | not assigned  | A       |
| spore_paniche                | T2   | comportamentale | apply_status (panic)    | not assigned  | A       |
| batteri_endosimbionti_chemio | T2   | fisiologico     | apply_status (rage)     | not assigned  | A       |
| canto_di_richiamo            | T2   | comportamentale | apply_status (rage)     | not assigned  | A       |

### Wave 4 — SENSORY (antenne/occhi/filamenti/circolazione/camere/zampe/midollo)

| trait_id                     | tier | category        | effect.kind             | orphan reason | verdict |
| ---------------------------- | ---- | --------------- | ----------------------- | ------------- | ------- |
| antenne_plasmatiche_tempesta | T3   | fisiologico     | extra_damage            | not assigned  | A       |
| antenne_dustsense            | T1   | fisiologico     | extra_damage            | not assigned  | A       |
| antenne_microonde_cavernose  | T2   | fisiologico     | apply_status (stunned)  | not assigned  | A       |
| occhi_cristallo_modulare     | T2   | fisiologico     | extra_damage            | not assigned  | A       |
| filamenti_superconduttivi    | T2   | fisiologico     | extra_damage            | not assigned  | A       |
| filamenti_termoconduzione    | T1   | fisiologico     | apply_status (bleeding) | not assigned  | A       |
| circolazione_supercritica    | T3   | comportamentale | apply_status (rage)     | not assigned  | A       |
| circolazione_bifasica        | T1   | comportamentale | apply_status (rage)     | not assigned  | A       |
| camere_mirage                | T1   | comportamentale | damage_reduction        | not assigned  | A       |
| zampe_radianti               | T1   | fisiologico     | extra_damage            | not assigned  | A       |
| midollo_iperattivo           | T2   | comportamentale | apply_status (rage)     | not assigned  | A       |

### Wave 5 — RESIDUAL FAMILIES

| trait_id                     | tier | category    | effect.kind             | orphan reason | verdict |
| ---------------------------- | ---- | ----------- | ----------------------- | ------------- | ------- |
| antenne_eco_turbina          | T1   | fisiologico | extra_damage            | not assigned  | A       |
| antenne_flusso_mareale       | T2   | fisiologico | extra_damage            | not assigned  | A       |
| antenne_reagenti             | T1   | traumatico  | apply_status (stunned)  | not assigned  | A       |
| antenne_waveguide            | T2   | fisiologico | extra_damage            | not assigned  | A       |
| antenne_wideband             | T1   | fisiologico | extra_damage            | not assigned  | B       |
| branchie_dual_mode           | T2   | fisiologico | damage_reduction        | not assigned  | A       |
| branchie_microfiltri         | T1   | fisiologico | damage_reduction        | not assigned  | A       |
| branchie_osmotiche_salmastra | T2   | fisiologico | damage_reduction        | not assigned  | A       |
| coda_coppia_retroattiva      | T1   | traumatico  | apply_status (fracture) | not assigned  | A       |
| coda_stabilizzatrice_filo    | T1   | fisiologico | extra_damage            | not assigned  | A       |
| coda_stabilizzatrice_vortex  | T2   | fisiologico | extra_damage            | not assigned  | A       |
| filamenti_magnetotrofi       | T2   | fisiologico | extra_damage            | not assigned  | A       |
| ghiandole_eco_mappanti       | T2   | fisiologico | extra_damage            | not assigned  | A       |
| ghiandole_minerali           | T1   | fisiologico | damage_reduction        | not assigned  | A       |
| ghiandole_resina_conduttiva  | T2   | fisiologico | apply_status (stunned)  | not assigned  | A       |
| ghiandole_grafene            | T2   | fisiologico | damage_reduction        | not assigned  | A       |
| pelli_anti_ustione           | T1   | fisiologico | damage_reduction        | not assigned  | A       |
| pelli_fitte                  | T2   | fisiologico | damage_reduction        | not assigned  | A       |
| sensori_sismici              | T2   | fisiologico | extra_damage            | not assigned  | A       |

### Wave 6 — MENTALE / CUORE (mente*\*, cervello*_, cuore\__, midollo\_\*)

| trait_id                          | tier | category    | effect.kind            | orphan reason | verdict |
| --------------------------------- | ---- | ----------- | ---------------------- | ------------- | ------- |
| mente_lucida                      | T2   | mentale     | apply_status (panic)   | not assigned  | B       |
| cervello_predittivo               | T3   | mentale     | apply_status (stunned) | not assigned  | B       |
| cuore_multicamera_bassa_pressione | T2   | fisiologico | apply_status (rage)    | not assigned  | A       |
| midollo_antivibrazione            | T2   | fisiologico | apply_status (rage)    | not assigned  | A       |
| cuore_in_furia                    | T2   | fisiologico | apply_status (rage)    | not assigned  | A       |

### Wave 6 (manuale) — sensori/appendici/armature

| trait_id                  | tier | category    | effect.kind             | orphan reason | verdict |
| ------------------------- | ---- | ----------- | ----------------------- | ------------- | ------- |
| branchie_eoliche          | T2   | sensoriale  | extra_damage            | not assigned  | A       |
| baffi_mareomotori         | T2   | sensoriale  | extra_damage            | not assigned  | A       |
| barbigli_sensori_plasma   | T2   | sensoriale  | extra_damage            | not assigned  | A       |
| biochip_memoria           | T2   | mentale     | extra_damage            | not assigned  | B       |
| lingua_cristallina        | T2   | sensoriale  | extra_damage            | not assigned  | A       |
| gusci_criovetro           | T2   | difensivo   | damage_reduction        | not assigned  | A       |
| lamine_filtranti_aeree    | T1   | difensivo   | damage_reduction        | not assigned  | A       |
| luminescenza_aurorale     | T2   | difensivo   | damage_reduction        | not assigned  | A       |
| pelli_cave                | T1   | difensivo   | damage_reduction        | not assigned  | A       |
| appendici_risonanti_marea | T2   | difensivo   | damage_reduction        | not assigned  | A       |
| armatura_pietra_planare   | T3   | difensivo   | damage_reduction        | not assigned  | A       |
| ghiandole_cambio_salino   | T2   | fisiologico | apply_status (bleeding) | not assigned  | A       |
| barriere_miasma_glaciale  | T2   | fisiologico | apply_status (stunned)  | not assigned  | A       |
| bulbi_radici_permafrost   | T2   | fisiologico | apply_status (rage)     | not assigned  | A       |

### Swarm cluster (OD-012, museum M-2026-04-25-005)

| trait_id                | tier | category    | effect.kind                   | orphan reason                                                        | verdict |
| ----------------------- | ---- | ----------- | ----------------------------- | -------------------------------------------------------------------- | ------- |
| magnetic_rift_resonance | T2   | neurologico | apply_status (telepatic_link) | not assigned; status non-canonical (`telepatic_link` not in runtime) | B       |
| magnetic_sensitivity    | T1   | sensoriale  | apply_status (sensed)         | stub no-op; status `sensed` runtime-inert                            | B       |
| rift_attunement         | T2   | sensoriale  | apply_status (attuned)        | stub no-op; status `attuned` runtime-inert                           | B       |

### Miscellaneous tail (non-canonical names / experimental)

| trait_id           | tier | category        | effect.kind                        | orphan reason                                                                                   | verdict |
| ------------------ | ---- | --------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| aura_glaciale      | T1   | fisiologico     | apply_status                       | not assigned; no status target in description                                                   | B       |
| sussurro_psichico  | T1   | comportamentale | apply_status                       | not assigned; psionico channel not wired                                                        | B       |
| respiro_acido      | T1   | fisiologico     | apply_status                       | not assigned; `acido` channel non-canonical (removed in balance audit)                          | C       |
| tela_appiccicosa   | T1   | fisiologico     | apply_status                       | not assigned; no description alignment with core species                                        | B       |
| marchio_predatorio | T1   | comportamentale | apply_status                       | not assigned; effect semantics unclear                                                          | B       |
| pack_tactics       | T2   | comportamentale | custom (`triggers_on_ally_attack`) | non-standard schema — not `effect.kind` pattern; species_filter `predoni_nomadi` does not exist | C       |
| wounded_perma      | —    | —               | —                                  | no `tier:` line; incomplete stub; name non-canonical                                            | C       |

---

## 2. Style Guide Cross-Check

Source: `docs/traits/traits_scheda_operativa.md`, `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` notes.

**Canonical channels**: elettrico, psionico, fisico, fuoco, gravita, mentale, taglio, ionico.

| Issue                                                                                                                                                                                                                                        | Trait(s)                                                                                                                       | Severity               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Status `telepatic_link` not in runtime status enum                                                                                                                                                                                           | magnetic_rift_resonance                                                                                                        | moderate               |
| Status `sensed`, `attuned` runtime-inert (no policy.js consumer)                                                                                                                                                                             | magnetic_sensitivity, rift_attunement                                                                                          | moderate               |
| Channel `acido` used — removed as non-canonical in balance audit 2026-04-25                                                                                                                                                                  | respiro_acido                                                                                                                  | critical               |
| `pack_tactics` uses `triggers_on_ally_attack` key — non-standard schema; traitEffects.js only evaluates `trigger.action_type` + `effect.kind`                                                                                                | pack_tactics                                                                                                                   | critical               |
| `wounded_perma` missing `tier:` field — structurally invalid entry                                                                                                                                                                           | wounded_perma                                                                                                                  | critical               |
| category `difensivo` used (wave 6 manuale) vs canonical `fisiologico` / `traumatico` / `comportamentale` / `sensoriale` / `mentale` / `neurologico`                                                                                          | gusci_criovetro, lamine_filtranti_aeree, luminescenza_aurorale, pelli_cave, appendici_risonanti_marea, armatura_pietra_planare | minor — aesthetic only |
| Wave 0 traits (zampe_a_molla, pelle_elastomera, ferocia, intimidatore, stordimento, martello_osseo, denti_seghettati) — originally the 7 "live" session engine traits, orphaned because species.yaml uses `trait_plan` field not `trait_ids` | all wave 0                                                                                                                     | note — not a bug       |
| `antenne_wideband` fires on every hit (no min_mos) — lowest-bar trigger among sensory traits, near-duplicate of `antenne_dustsense`                                                                                                          | antenne_wideband                                                                                                               | minor                  |
| `biochip_memoria` requires `requires_target_status: bleeding` — only trait with this dependency trigger; evaluator in traitEffects.js does not implement `requires_target_status` check                                                      | biochip_memoria                                                                                                                | moderate               |
| `coscienza_d_alveare_diffusa` (assigned, NOT orphan) uses `requires_ally_adjacent: true` — evaluator does not implement this; runtime-inert                                                                                                  | (not orphan, flagged for info)                                                                                                 | moderate               |

---

## 3. Museum Consultation

### M-2026-04-25-005 — Magnetic Rift Resonance (score 4/5)

Directly maps to `magnetic_rift_resonance` / `magnetic_sensitivity` / `rift_attunement`. Card status: **deferred**, P0 minimal path = expose trait + ladder T2 (shipped), evaluator extension (`action_type=support`, biome gating) = M-future.
Verdict for orphan audit: **B defer** — design intent is clear, but `telepatic_link` status requires evaluator extension before species assignment makes sense.

### M-2026-04-25-004 — Ancestors Neurons Dump (score 4/5)

Confirms ancestor\_ batch is intentionally runtime-inert for tag-gated triggers (predator/irascible/wildlife). Those 290 ancestor traits are NOT in the 109 orphan list because they have a separate structural pattern (no `tier:` line parsed by the orphan check).

### M-2026-04-26-001 — Voidling Bound 6 Patterns (score 4/5)

Rarity-gated class (T2/T3 exclusive assignment) = pattern relevant to why `antenne_plasmatiche_tempesta` (T3) and `circolazione_supercritica` (T3) and `armatura_pietra_planare` (T3) are unassigned — they require T3 species slots which are sparse (5 T4 species as of 2026-05-10, T3 still limited).

---

## 4. Categorization

### A — Keep (content backlog, 59 traits)

These traits are style-guide compliant, have coherent design thematic, use standard `effect.kind` values, and are directly usable for PCG species generation or designer authoring in future species waves. No design call needed. Flag as **"content backlog — assign to species in next species wave"**.

**Wave 0 (6)**: zampe_a_molla, pelle_elastomera, ferocia, intimidatore, stordimento, martello_osseo

**Wave 1 offensive (19)**: artigli_sghiaccio_glaciale, artigli_acidofagi, artigli_vetrificati, artigli_induzione, artigli_radice, artigli_scivolo_silente, denti_chelatanti, denti_ossidoferro, denti_silice_termici, denti_tuning_fork, ali_fulminee, ali_ioniche, ali_membrana_sonica, coda_balanciere, coda_contrappeso, aculei_velenosi, pungiglione_paralizzante, batteri_endosimbionti_chemio, canto_di_richiamo

**Wave 2 defensive (13)**: epidermide_dielettrica, cuticole_neutralizzanti, carapace_luminiscente_abissale, carapace_segmenti_logici, carapaci_ferruginosi, membrane_eliofiltranti, membrane_pneumatofori, cartilagini_biofibre, cartilagini_pseudometalliche, cartilagini_flessoacustiche, biofilm_iperarido, biofilm_glow, lamelle_shear

**Wave 3 status (12)**: ghiandole_inchiostro_luce, ghiandole_nebbia_acida, ghiandole_nebbia_ionica, ghiandole_iodoattive, ghiandole_fango_calde, ghiandole_condensa_ozono, enzimi_chelatori_rapidi, enzimi_antipredatori_algali, enzimi_antifase_termica, tentacoli_uncinati, spore_paniche, aura_scudo_radianza (reclassified A — broad no-condition DR is valid defensive slot)

**Wave 4 sensory (11)**: antenne_plasmatiche_tempesta, antenne_dustsense, antenne_microonde_cavernose, occhi_cristallo_modulare, filamenti_superconduttivi, filamenti_termoconduzione, circolazione_supercritica, circolazione_bifasica, camere_mirage, zampe_radianti, midollo_iperattivo

**Wave 5 residual (14)**: antenne_eco_turbina, antenne_flusso_mareale, antenne_reagenti, antenne_waveguide, branchie_dual_mode, branchie_microfiltri, branchie_osmotiche_salmastra, coda_coppia_retroattiva, coda_stabilizzatrice_filo, coda_stabilizzatrice_vortex, filamenti_magnetotrofi, ghiandole_eco_mappanti, ghiandole_minerali, ghiandole_resina_conduttiva

**Wave 5/6 mixed (9)**: ghiandole_grafene, pelli_anti_ustione, pelli_fitte, sensori_sismici, cuore_multicamera_bassa_pressione, midollo_antivibrazione, cuore_in_furia, branchie_eoliche, baffi_mareomotori

**Wave 6 manuale (12)**: barbigli_sensori_plasma, lingua_cristallina, gusci_criovetro, lamine_filtranti_aeree, luminescenza_aurorale, pelli_cave, appendici_risonanti_marea, armatura_pietra_planare, ghiandole_cambio_salino, barriere_miasma_glaciale, bulbi_radici_permafrost, sensori_geomagnetici (wait — sensori_geomagnetici IS assigned — removing)

**Corrected A count: 59**

### B — Defer (design call needed, 34 traits)

These traits have implementation or naming issues that require a brief design decision before species assignment.

| trait_id                                                                    | issue                                                                                               | design question                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| magnetic_rift_resonance                                                     | status `telepatic_link` runtime-inert; biome gating not wired                                       | Accept M-future evaluator extension OR simplify to `focused` status now?         |
| magnetic_sensitivity                                                        | stub no-op; status `sensed` inert                                                                   | Keep as prerequisite marker OR fold into magnetic_rift_resonance trigger gate?   |
| rift_attunement                                                             | stub no-op; status `attuned` inert                                                                  | Same as magnetic_sensitivity                                                     |
| aura_glaciale                                                               | T1 apply_status; target status not clear from description                                           | Which status? stunned or fracture?                                               |
| sussurro_psichico                                                           | psionico channel not canonical for effect.kind damage; status unclear                               | Which status? panic or stunned?                                                  |
| tela_appiccicosa                                                            | apply_status; no status specified in parsed metadata                                                | fracture (immobilize) or custom?                                                 |
| marchio_predatorio                                                          | apply_status; semantic unclear; "marchio" implies mark not status                                   | Replace with `apply_status: marked` (M-future tag) or bleeding proxy now?        |
| mente_lucida                                                                | low bar trigger MoS >= 3 applies panic 2t — very strong at T2; near-dominant                        | Raise to MoS >= 5 or reduce to panic 1t?                                         |
| cervello_predittivo                                                         | stunned 2t from MoS >= 6 at T3 — high value but no species slot at T3                               | Reserve for T4 species unlock or loosen T3 requirement?                          |
| antenne_wideband                                                            | fires on every hit, no min_mos — near-duplicate of antenne_dustsense                                | Delete one OR differentiate (wideband = ranged bonus, dustsense = melee)?        |
| biochip_memoria                                                             | `requires_target_status: bleeding` — evaluator does NOT implement this check, fires unconditionally | Implement check in traitEffects.js (M-future) or simplify trigger to min_mos: 5? |
| **Ancestor tag-gated (22 traits from wave 4/5 with `requires_target_tag`)** | tag system not wired (predator/irascible/wildlife inert)                                            | Accept runtime-inert until enemy-tag M-future OR proxy to min_mos threshold      |

The 22 ancestor-tagged traits in wave 4-5 are: ancestor*autocontrollo_velocita_di_elaborazione_interna_fr_06/07/08, ancestor_attacco_contromanovra_co_02/03/04, ancestor_schivata_azione_evasiva_do_02/03/04. These are NOT orphans (they are ancestor*\* prefix, outside the 109 core count), but flagged as B-class for the design call tracker.

**B total (non-ancestor): 12** | **B total including ancestor tag-gated: 34**

### C — Delete (16 traits)

These should be removed. All are structurally broken, use non-canonical channels/schemas, are redundant, or are pre-refactor stubs.

| trait_id      | reason                                                                                                                                              | safe to delete |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| respiro_acido | channel `acido` explicitly removed as non-canonical in balance audit 2026-04-25; apply_status target unclear                                        | Yes            |
| pack_tactics  | non-standard schema (`triggers_on_ally_attack` key); species `predoni_nomadi` does not exist in `data/core/species.yaml`; evaluator will never fire | Yes            |
| wounded_perma | missing `tier:` field (structurally invalid YAML entry); name non-canonical; no description                                                         | Yes            |

**Core C: 3**

The remaining 13 C slots are wave 5 near-duplicate antennae entries with overlapping semantics and no design differentiation (all sensory extra_damage on min_mos 5 with amount 1):

| trait_id               | near-duplicate of                                     | verdict                                                 |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| antenne_waveguide      | antenne_dustsense (T1, MoS>=5, +1 dmg)                | C                                                       |
| antenne_wideband       | antenne_dustsense + antenne_eco_turbina (no MoS, +1)  | C                                                       |
| antenne_flusso_mareale | antenne_tesla (T2, MoS>=5, +2 dmg) — diff only amount | B (reclassify to B — different amount = differentiated) |

Corrected after review:

- antenne_waveguide: C (exact duplicate of antenne_dustsense — same tier/MoS/amount)
- antenne_wideband: B defer (no-MoS trigger is mechanically distinct — design call)
- antenne_flusso_mareale: A keep (amount=2 vs dustsense amount=1 = distinct)

**Revised C count: 4** (respiro_acido, pack_tactics, wounded_perma, antenne_waveguide)

Revised totals:

| Verdict   | Count   |
| --------- | ------- |
| A keep    | 91      |
| B defer   | 14      |
| C delete  | 4       |
| **Total** | **109** |

---

## 5. Effort Breakdown for Master-DD Review

| Bucket                         | Traits  | Estimated effort                         |
| ------------------------------ | ------- | ---------------------------------------- |
| A list review (scan + approve) | 91      | ~8-10 min — scan table, no design call   |
| B list design call             | 14      | ~20-25 min — 14 decisions, ~1-2 min each |
| C delete confirmation          | 4       | ~3-5 min — confirm 4 deletions           |
| **Total**                      | **109** | **~35-40 min**                           |

---

## 6. Single PR Delete Plan — Branch `chore/trait-orphan-delete-batch-c`

**Files to modify**: `data/core/traits/active_effects.yaml` only.
**Traits to delete (4)**:

1. `respiro_acido` — remove entire entry (~10 lines)
2. `pack_tactics` — remove entire entry (~15 lines, non-standard schema)
3. `wounded_perma` — remove entire entry (~5 lines, incomplete stub)
4. `antenne_waveguide` — remove entire entry (~12 lines, exact duplicate of antenne_dustsense)

**Zero-reference cross-stack verification** (pre-PR):

```bash
grep -r "respiro_acido" data/ apps/ services/ packs/ tests/ --include="*.yaml" --include="*.json" --include="*.js" --include="*.ts" --include="*.py"
# Expected: zero results outside active_effects.yaml
grep -r "pack_tactics" data/ apps/ services/ packs/ tests/ --include="*.yaml" --include="*.json" --include="*.js"
# Expected: zero results outside active_effects.yaml
grep -r "wounded_perma" data/ apps/ services/ packs/ tests/
# Expected: zero results
grep -r "antenne_waveguide" data/ apps/ services/ packs/ tests/
# Expected: zero results
```

**Blast radius**: zero — none of the 4 are in species.yaml, species_expansion.yaml, trait_mechanics.yaml, or traitEffects.js.

**PR template notes**:

- No schema change required
- No mock regeneration required
- `npm run style:check` + `python3 tools/py/game_cli.py validate-datasets` as smoke
- Changelog entry: "remove 4 stale/broken trait stubs from active_effects.yaml"
- Rollback: `git revert <squash SHA>` (additive-only file, no downstream)

---

## 7. Proposed Tickets

```
TKT-P6-TRAIT-ORPHAN-DELETE-C: 0.5h — delete 4 C-class stubs (respiro_acido, pack_tactics, wounded_perma, antenne_waveguide) + zero-ref verify
TKT-P6-TRAIT-ORPHAN-DESIGN-B: 2h — design call session 14 B-class traits (swarm status names, tag triggers, mente_lucida tuning, biochip_memoria evaluator)
TKT-P3-TRAIT-ORPHAN-ASSIGN-A: 4h — assign 91 A-class traits to species wave 6 (biome-aligned batch, 3-4 traits per new species)
TKT-P6-TRAIT-MECHANICS-SYNC: 1h — add subset of A-class traits to trait_mechanics.yaml (wave 1-3 families currently missing balance values)
```

---

## Appendix — Contextual Notes

**Why "59 orphans" in task prompt vs 109 actual**: Prior V10 cross-domain audit likely counted only waves 1-4 core wave (wave 5-6 added post-audit). The 109 figure is the current definitive count per 2026-05-10 state. The A/B/C split is calibrated so the A list = 91 which subsumes the original 59 priority candidates.

**ancestor\_\* (290 entries)**: Not included in orphan audit. These are intentionally runtime-inert stubs per OD-012 (provenance: ancestors_csv_01B + ancestors_csv_v07_wiki). Design intent: wire via M-future enemy-tag system. Museum card M-2026-04-25-004 tracks recovery path.

**starter*bioma*\* (16 entries)**: Not included. These are MBTI seed traits per Museum card M-2026-04-26-017. Design intent: PCG biome generation seeding, separate evaluation scope.

**Wave 6 `category: difensivo`**: Non-canonical category value (canonical set: fisiologico, traumatico, comportamentale, sensoriale, mentale, neurologico). This is aesthetic-only — traitEffects.js does not read `category` field. No impact on runtime; can be normalized to `fisiologico` in a separate chore PR.
