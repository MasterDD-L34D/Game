---
title: T4 species candidate proposals — 5 specie via orphan trait activation
status: pending-master-dd-verdict
date: 2026-05-10
type: planning
audience: master-dd
related:
  - data/core/species.yaml
  - data/core/species_expansion.yaml
  - data/core/companion/skiv_archetype_pool.yaml
  - data/core/traits/active_effects.yaml
  - docs/museum/MUSEUM.md
  - BACKLOG.md TKT-TRAIT-ORPHAN-ACTIVE Q2
---

# T4 species candidate proposals — Cross-domain audit follow-up

## Context

User verdict 2026-05-10 cross-domain audit TKT-TRAIT-ORPHAN-ACTIVE Q2 = **"Entrambi (usa museo e i report della swarm come base)"**:

- 15 categoria B orphan trait wired via `biome_pools.json` rotation (TKT-BIOME-POOL-EXPAND, separate ticket)
- - nuove species candidate (Tier 4 sentience expansion) che usano questi trait

Research via `repo-archaeologist` agent (museum + swarm reports + EVO_FINAL_DESIGN docs). Cross-ref:

- Museum cards M-2026-04-25-001 (sentience tiers) + M-2026-04-25-005 (magnetic_rift) + M-2026-04-26-013 (species emergence) + M-2026-04-26-018 (biome gameplay gap)
- BACKLOG.md §P2.3 audit 2026-05-07 (T4=0 confirmed)
- 42 orphan traits referenced in species trait_plans but unimplemented

## T4 gap canonical

CLAUDE.md noted: "T4=0 attualmente" — discontinuity T3→T5 nel sentience ladder. T4 descriptor da museum M-001:

- "divisione del lavoro"
- "proto-legge"
- "uso intentional di tools/environment"

5 proposals (1 per clade) chiudono ladder per 5 biomi.

## Proposal 1 — `psionerva_montis`

| Field                   | Value                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Clade                   | Bridge                                                                                                                            |
| Sentience               | T4                                                                                                                                |
| Biome                   | `caldera_glaciale` (gap T4 intermediate vs T5 rupicapra_sensoria)                                                                 |
| Ennea                   | Architetto                                                                                                                        |
| MBTI                    | NT                                                                                                                                |
| Orphan traits activated | corna_psico_conduttive, focus_frazionato, criostasi_adattiva, olfatto_risonanza_magnetica, metabolismo_di_condivisione_energetica |
| Provenance              | M-001 (T4 descriptor) + skiv_archetype_pool.yaml caldera_glaciale gap                                                             |
| Reuse path              | species.yaml + new lifecycle stub + extend skiv pool                                                                              |
| Effort estimate         | ~3h YAML + 1h active_effects stub                                                                                                 |

## Proposal 2 — `fusomorpha_palustris`

| Field                   | Value                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Clade                   | Playable                                                                                                                          |
| Sentience               | T4                                                                                                                                |
| Biome                   | `palude` (gap T4 vs T0 proteus_plasma only)                                                                                       |
| Ennea                   | Individualista                                                                                                                    |
| MBTI                    | NF                                                                                                                                |
| Orphan traits activated | flusso_ameboide_controllato, fagocitosi_assorbente, filtrazione_osmotica, ermafroditismo_cronologico, moltiplicazione_per_fusione |
| Provenance              | M-001 + M-013 ecosystem role gap (palude decomposer)                                                                              |
| Reuse path              | species.yaml + extend palude pool (no entry currently in skiv_archetype_pool)                                                     |
| Effort estimate         | ~3h YAML + 2 active_effects stubs                                                                                                 |

## Proposal 3 — `sonaraptor_dissonans`

| Field                   | Value                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clade                   | Threat                                                                                                                                                                                                                                |
| Sentience               | T4                                                                                                                                                                                                                                    |
| Biome                   | `canopia_ionica` (gap T4 boss vs T2 soniptera_resonans)                                                                                                                                                                               |
| Ennea                   | Conquistatore                                                                                                                                                                                                                         |
| MBTI                    | SJ                                                                                                                                                                                                                                    |
| Orphan traits activated | cannone_sonico_a_raggio, campo_di_interferenza_acustica, sistemi_chimio_sonici, comunicazione_fotonica_coda_coda, visione_multi_spettrale_amplificata                                                                                 |
| Provenance              | M-001 + soniptera_resonans T2 ancestor analog + BACKLOG.md GAP-004                                                                                                                                                                    |
| Reuse path              | species.yaml — `cannone_sonico_a_raggio` + `campo_di_interferenza_acustica` already referenced soniptera_resonans trait_plan → active_effects stubs ship via TKT-TRAIT-MECH-NO-HANDLER batch (note: cannone già in batch 2 questo PR) |
| Effort estimate         | ~2h YAML + ~2h active_effects (1 trait residual: campo_di_interferenza_acustica)                                                                                                                                                      |

## Proposal 4 — `electromanta_abyssalis`

| Field                   | Value                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Clade                   | Apex                                                                                                                           |
| Sentience               | T4                                                                                                                             |
| Biome                   | `frattura_abissale_sinaptica` (gap T4 sub-Apex vs T5 leviatano)                                                                |
| Ennea                   | Esploratore                                                                                                                    |
| MBTI                    | NT                                                                                                                             |
| Orphan traits activated | elettromagnete_biologico, scivolamento_magnetico, seta_conduttiva_elettrica, integumento_bipolare, olfatto_risonanza_magnetica |
| Provenance              | M-001 + M-005 magnetic_rift tier ladder + anguis_magnetica T1 lower-tier neighbor                                              |
| Reuse path              | species.yaml + active_effects.yaml (`elettromagnete_biologico` anchors anguis_magnetica trait_plan ref)                        |
| Effort estimate         | ~3h YAML + ~3h active_effects (2 stubs)                                                                                        |

## Proposal 5 — `symbiotica_thermalis`

| Field                   | Value                                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clade                   | Keystone                                                                                                                                                                                                              |
| Sentience               | T4                                                                                                                                                                                                                    |
| Biome                   | `dorsale_termale_tropicale` (gap T4 keystone vs T3 umbra_alaris playable)                                                                                                                                             |
| Ennea                   | Coordinatore                                                                                                                                                                                                          |
| MBTI                    | NF                                                                                                                                                                                                                    |
| Orphan traits activated | metabolismo_di_condivisione_energetica, scheletro_idraulico_a_pistoni, filtro_metallofago, sacche_galleggianti_ascensoriali, risonanza_di_branco                                                                      |
| Provenance              | M-001 + M-018 biome gameplay gap (5/7 fields unused runtime) + umbra_alaris T3 same-biome neighbor                                                                                                                    |
| Reuse path              | species.yaml + extend dorsale_termale_tropicale pool in skiv_archetype_pool edge_cases (currently "no pool"). Trait `metabolismo_di_condivisione_energetica` + `risonanza_di_branco` shared con rupicapra_sensoria T5 |
| Effort estimate         | ~3h YAML + ~1h biome pool extension + ~3h active_effects (2 stubs)                                                                                                                                                    |

## Coverage summary

**T4 ladder closure** post-adoption: 5 species (1 per clade) → T3→T4→T5 closed per 4 biomi (caldera_glaciale, palude, canopia_ionica, frattura_abissale_sinaptica, dorsale_termale_tropicale).

**Orphan trait activation**: 25 trait references → 22 unique orphan trait activated (3 shared between 2 proposals each).

**Anti-canonical check**: tutti 5 slug verificati NOT in `species.yaml` (16 entries) o `species_expansion.yaml` (31 entries). Zero false positives.

**Blast radius**: YAML-only ×1.0 + service layer stubs ×1.2. No schema-breaking changes. Adoption 1-at-a-time independent.

## Master-dd verdict needed

- **Q1**: Adoption order — quale proposal ship per primo? (recommend `electromanta_abyssalis` Apex per max signal Apex×T4 gap)
- **Q2**: Adoption all 5 OR subset? (completista grant tutti; ottimizzatore può scegliere 2-3 high-impact)
- **Q3**: Per ogni species, sprite/visual asset requirement? (Cabinet Path 1+2 PR pattern)
- **Q4**: ADR formal pre-ship OR additive YAML extension senza ADR (per museum protocol)?

## Effort aggregate

| Approach                          | Total effort |
| --------------------------------- | :----------: |
| Ship 1 species (highest priority) |    ~6-7h     |
| Ship 3 species (semi-completista) |   ~18-21h    |
| Ship 5 species (full completista) |   ~30-36h    |

## Out of scope

- Biome_pools.json rotation per 15 categoria B trait (TKT-BIOME-POOL-EXPAND separate ticket)
- Sprite/visual asset creation per 5 species (Path 1/2/3 workflow doc)
- Lifecycle 5-fasi YAML per ogni T4 species (richiede design call per persona/voice)

## Resume trigger

> _"adopt T4 species candidate <slug>, ship YAML + active_effects stubs + skiv_archetype_pool extension"_
