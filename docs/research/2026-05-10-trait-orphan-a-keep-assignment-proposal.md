---
title: 'Trait Orphan A=keep Assignment Proposal — biome-aligned wave 6+'
date: 2026-05-10
type: research
status: live
workstream: dataset-pack
slug: 2026-05-10-trait-orphan-a-keep-assignment-proposal
tags: [trait, orphan, assignment, species, biome-aligned, master-dd-review]
author: claude-autonomous
---

# Trait Orphan A=keep Assignment Proposal — 2026-05-10 sera

V13 cascade master-dd grant "3+4". Action 3 trait orphan A=91 review window. Audit canonical [`docs/research/2026-05-10-trait-orphan-audit-batch-review.md`](2026-05-10-trait-orphan-audit-batch-review.md) (PR #2195 `089cea2e`).

Doc-only proposal mapping. Master-dd executes batch ship via TKT-P3-TRAIT-ORPHAN-ASSIGN-A dedicated session (~4h estimated).

## Strategy biome-aligned

Per audit doc §7: assign 3-4 traits per species batch wave 6. Existing species 31 in repo (20 species.yaml + 11 species_expansion.yaml). Each species can absorb 1-3 new traits per slot policy.

## Wave-by-wave assignment table

### Wave 0 — core engine (6 traits)

| trait_id         | category        | proposed species         | biome alignment | rationale                                         |
| ---------------- | --------------- | ------------------------ | --------------- | ------------------------------------------------- |
| zampe_a_molla    | fisiologico     | rupicapra_sensoria       | montagna/rocce  | jumping/elevation-based extra_damage              |
| pelle_elastomera | fisiologico     | elastovaranus_hydrus     | acqua/fluido    | name-aligned (elasto + elastomera)                |
| ferocia          | comportamentale | dune_stalker             | savana/Skiv     | rage on-kill = predator instinct (Skiv canonical) |
| intimidatore     | comportamentale | sp_lithoraptor_acutornis | rocce           | apex-predator panic AOE                           |
| stordimento      | traumatico      | terracetus_ambulator     | terra/sasso     | impact-based stunned applier                      |
| martello_osseo   | traumatico      | gulogluteus_scutiger     | rocce           | mass-impact fracture applier                      |

### Wave 1 ARTIGLI (6 traits)

| trait_id                   | proposed species       | biome                       | rationale               |
| -------------------------- | ---------------------- | --------------------------- | ----------------------- |
| artigli_sghiaccio_glaciale | psionerva_montis       | caldera_glaciale            | T4 glacier biome match  |
| artigli_acidofagi          | chemnotela_toxica      | chemio/tossico              | chemical predator       |
| artigli_vetrificati        | sp_basaltocara_scutata | basalto vetrificato         | name match              |
| artigli_induzione          | electromanta_abyssalis | frattura_abissale_sinaptica | T4 induction = electric |
| artigli_radice             | sp_arenaceros_placidus | sabbia/radici               | rooted predator         |
| artigli_scivolo_silente    | umbra_alaris           | ombra/foresta               | silent stealth          |

### Wave 1 DENTI (4 traits)

| trait_id             | proposed species       | biome                     |
| -------------------- | ---------------------- | ------------------------- |
| denti_chelatanti     | symbiotica_thermalis   | dorsale_termale_tropicale |
| denti_ossidoferro    | sp_ferrimordax_rutilus | ferro/ruggine             |
| denti_silice_termici | sp_pyrosaltus_celeris  | fuoco/silice              |
| denti_tuning_fork    | sonaraptor_dissonans   | canopia_ionica            |

### Wave 1 ALI (3 traits)

| trait_id            | proposed species       | biome       |
| ------------------- | ---------------------- | ----------- |
| ali_fulminee        | sp_ventornis_longiala  | aria/cielo  |
| ali_ioniche         | soniptera_resonans     | aria/sonica |
| ali_membrana_sonica | sp_sonapteryx_resonans | aria/sonica |

### Wave 1 CODA (2 traits)

| trait_id         | proposed species         | biome    |
| ---------------- | ------------------------ | -------- |
| coda_balanciere  | rupicapra_sensoria       | montagna |
| coda_contrappeso | sp_arenavolux_sagittalis | sabbia   |

### Wave 1 ACULEI (2 traits)

| trait_id                 | proposed species                         | biome    |
| ------------------------ | ---------------------------------------- | -------- |
| aculei_velenosi          | chemnotela_toxica                        | chemio   |
| pungiglione_paralizzante | spore_psichiche_silenziate (TBD species) | psichico |

### Wave 2 DEFENSIVE (13 traits)

| trait_id                       | proposed species             | biome                       |
| ------------------------------ | ---------------------------- | --------------------------- |
| epidermide_dielettrica         | electromanta_abyssalis       | frattura_abissale_sinaptica |
| cuticole_neutralizzanti        | chemnotela_toxica            | chemio                      |
| carapace_luminiscente_abissale | simbionte_corallino_riflesso | reef abissale               |
| carapace_segmenti_logici       | sp_basaltocara_scutata       | basalto                     |
| carapaci_ferruginosi           | sp_ferriscroba_detrita       | ferro                       |
| membrane_eliofiltranti         | sp_arenaceros_placidus       | sabbia esposta              |
| membrane_pneumatofori          | sp_salifossa_tenebris        | mangrovie/palude            |
| cartilagini_biofibre           | proteus_plasma               | plasma                      |
| cartilagini_pseudometalliche   | sp_ferrimordax_rutilus       | ferro                       |
| cartilagini_flessoacustiche    | soniptera_resonans           | sonica                      |
| biofilm_iperarido              | dune_stalker                 | savana arida (Skiv)         |
| biofilm_glow                   | sp_salifossa_tenebris        | tenebra                     |
| lamelle_shear                  | sp_lithoraptor_acutornis     | rocce                       |

### Wave 3 STATUS APPLIERS (13 traits)

| trait_id                     | proposed species       | biome            |
| ---------------------------- | ---------------------- | ---------------- |
| ghiandole_inchiostro_luce    | umbra_alaris           | ombra            |
| ghiandole_nebbia_acida       | chemnotela_toxica      | chemio           |
| ghiandole_nebbia_ionica      | electromanta_abyssalis | frattura ionica  |
| ghiandole_iodoattive         | symbiotica_thermalis   | dorsale termale  |
| ghiandole_fango_calde        | sp_salifossa_tenebris  | mangrovie        |
| ghiandole_condensa_ozono     | sp_ventornis_longiala  | aria/cielo       |
| enzimi_chelatori_rapidi      | chemnotela_toxica      | chemio           |
| enzimi_antipredatori_algali  | symbiotica_thermalis   | tropicale        |
| enzimi_antifase_termica      | psionerva_montis       | caldera_glaciale |
| tentacoli_uncinati           | polpo_araldo_sinaptico | reef             |
| spore_paniche                | fusomorpha_palustris   | palude           |
| batteri_endosimbionti_chemio | symbiotica_thermalis   | termale          |
| canto_di_richiamo            | sciame_larve_neurali   | mente collettiva |

### Wave 4 SENSORY (~14 traits)

| trait_id                     | proposed species       | biome            |
| ---------------------------- | ---------------------- | ---------------- |
| antenne_plasmatiche_tempesta | sp_ventornis_longiala  | aria/tempesta    |
| antenne_dustsense            | dune_stalker           | savana arida     |
| antenne_microonde_cavernose  | sp_salifossa_tenebris  | caverna          |
| occhi_cristallo_modulare     | psionerva_montis       | caldera glaciale |
| filamenti_superconduttivi    | electromanta_abyssalis | frattura ionica  |
| filamenti_termoconduzione    | symbiotica_thermalis   | termale          |
| (residue 8)                  | TBD master-dd          | TBD              |

### Wave 5+6 RESIDUE (~28 traits)

Master-dd review subset wave-by-wave. Pattern stesso: biome alignment + tier match + category coherence.

## Aggregate proposal

| Wave      | Trait count |     Species touched     | Biome diversity |
| --------- | :---------: | :---------------------: | :-------------: |
| 0         |      6      |            6            |    5 biomes     |
| 1         |     17      |       ~15 species       |    8 biomes     |
| 2         |     13      |       11 species        |    7 biomes     |
| 3         |     13      |        9 species        |    6 biomes     |
| 4         |     14      |       ~12 species       |    7 biomes     |
| 5+6       |     ~28     |           TBD           |       TBD       |
| **Total** |   **~91**   | **~30 species touched** |   **diverse**   |

## Risk + smoke gate

Per trait assignment:

- ✅ Verify trait_id presence `data/core/traits/active_effects.yaml`
- ✅ Verify species_id presence `data/core/species.yaml` o `species_expansion.yaml`
- ✅ Tier match (T1/T2 trait + species level cap)
- ✅ Category coherence (fisiologico/comportamentale/traumatico vs species archetype)
- ✅ Biome alignment narrative-fit
- ✅ Slot policy (max N traits per species)

Smoke post-assignment batch:

- `python3 tools/py/game_cli.py validate-datasets`
- `node --test tests/api/*.test.js` (regression check)
- AI baseline 393/393

## Master-dd execution path

Recommended cascade:

1. **Wave 0+1** (~23 traits) ship singolo PR (~1h) — concrete batch first
2. **Wave 2** (~13 traits) ship PR (~30min)
3. **Wave 3** (~13 traits) ship PR (~30min)
4. **Wave 4** (~14 traits) ship PR (~30min)
5. **Wave 5+6 residue** (~28 traits) ship PR (~1h)

**Total cumulative**: ~3.5h actual ship effort (vs ~4h estimated).

Master-dd review per PR ~5-10min biome alignment sanity check.

## TKT residue post-proposal

```
TKT-P3-TRAIT-ORPHAN-ASSIGN-A-WAVE-0-1: ~1h ship 23 traits
TKT-P3-TRAIT-ORPHAN-ASSIGN-A-WAVE-2: ~30min ship 13 traits
TKT-P3-TRAIT-ORPHAN-ASSIGN-A-WAVE-3: ~30min ship 13 traits
TKT-P3-TRAIT-ORPHAN-ASSIGN-A-WAVE-4: ~30min ship 14 traits
TKT-P3-TRAIT-ORPHAN-ASSIGN-A-WAVE-5-6: ~1h ship 28 traits
```

Cascade autonomous post-master-dd review proposta (questo doc) ~3.5h.

## Caveat anticipated judgment

Biome alignment mappings = Claude autonomous heuristic basato su naming + tier + category. Master-dd review può:

- Approve as-is → cascade autonomous ship 5 PR sequenziali
- Modify subset → master-dd indicate divergent assignment
- Defer wave-by-wave → ship granular dedicated session

## Cross-references

- Audit canonical: [`docs/research/2026-05-10-trait-orphan-audit-batch-review.md`](2026-05-10-trait-orphan-audit-batch-review.md) PR #2195
- BACKLOG entry: TKT-P3-TRAIT-ORPHAN-ASSIGN-A residue (PR #2199)
- Style guide: [`docs/traits/styleguide.md`](../traits/styleguide.md)
- Naming convention: [`docs/traits/manuale/03-tassonomia-famiglie.md`](../traits/manuale/03-tassonomia-famiglie.md)
