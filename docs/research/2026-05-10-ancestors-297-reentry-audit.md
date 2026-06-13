---
title: 'Ancestors 297 Reentry Audit — V9 TKT-ANCESTORS-CONSUMER'
type: research
date: 2026-05-10
tags: [ancestors, reentry, museum, style-guide]
doc_status: active
doc_owner: repo-archaeologist
workstream: dataset-pack
last_verified: 2026-05-10
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Ancestors 297 Reentry Audit — V9 TKT-ANCESTORS-CONSUMER

## 0. Scope correction (critical)

**Original BACKLOG wording**: "`data/core/ancestors/` 297 proposal entries zero runtime consumer (proposal-only inert data)."

**Reality post-excavation**: The 297 are NAMING MIGRATION PROPOSALS, not unimplemented traits.

- `data/core/ancestors/ancestors_rename_proposal_v1.yaml` — 297 entries, English IDs, Phase 1 style-guide apply
- `data/core/ancestors/ancestors_rename_proposal_v2.yaml` — 297 entries, Italian IDs, Phase 2 (master-dd verdict 2026-04-27)

**290 / 297 traits (~97%) are already live** in `data/core/traits/active_effects.yaml` (line 2748–9050). The proposals are provenance + attribution registries (CC BY-NC-SA 3.0 Fandom). See existing research doc `docs/planning/2026-05-10-tkt-ancestors-consumer-research.md` for full path comparison table.

**What remains un-consumed**: `branch` grouping metadata, `legacy_code` strings (e.g. "AB 01"), wiki `sources` URLs — all in proposal YAML only, not in active_effects.

---

## 1. Sample 30 Ancestor Entries

Sample drawn from `data/core/traits/active_effects.yaml`: first 10 (Self-Control/Dodge/Attack path A — highest design density), mid 10 (v07 batch: Communication, Ambulation, Intelligence), last 10 (Preventive Med, Therapeutic Med — largest numeric blocks).

### 1.1 Path A entries (lines 2748–3306) — 22 curated Self-Control/Dodge/Attack

| #   | trait_id                                                        | label_it                         | tier | category    | trigger                  | effect_kind           | amount |
| --- | --------------------------------------------------------------- | -------------------------------- | ---- | ----------- | ------------------------ | --------------------- | ------ |
| 1   | `ancestor_autocontrollo_tachipsichia_fr_01`                     | Tachipsichia                     | T1   | neurologico | attack hit MoS≥3         | extra_damage          | 1      |
| 2   | `ancestor_autocontrollo_distorsione_temporale_fr_02`            | Distorsione Temporale            | T1   | neurologico | attack hit MoS≥4         | extra_damage          | 1      |
| 3   | `ancestor_autocontrollo_distorsione_temporale_fr_04`            | Distorsione Temporale            | T1   | neurologico | attack hit MoS≥6         | extra_damage          | 2      |
| 4   | `ancestor_autocontrollo_dilatazione_temporale_percettiva_fr_05` | Dilatazione Temporale Percettiva | T1   | neurologico | attack hit MoS≥4         | extra_damage          | 1      |
| 5   | `ancestor_attacco_risposta_di_combattimento_co_01`              | Risposta di Combattimento        | T1   | neurologico | attack hit               | extra_damage          | 1      |
| 6   | `ancestor_attacco_contromanovra_co_02`                          | Contromanovra                    | T1   | neurologico | attack hit MoS≥2         | extra_damage          | 1      |
| 7   | `ancestor_schivata_risposta_di_fuga_do_01`                      | Risposta di Fuga                 | T1   | neurologico | attack hit (melee)       | damage_reduction      | 1      |
| 8   | `ancestor_schivata_azione_evasiva_bb_do_03`                     | Azione Evasiva                   | T1   | neurologico | attack hit tag:irascible | damage_reduction      | 1      |
| 9   | `ancestor_schivata_azione_evasiva_do_04`                        | Azione Evasiva                   | T1   | neurologico | attack hit tag:wildlife  | damage_reduction      | 1      |
| 10  | `ancestor_schivata_atarassia_do_06`                             | Atarassia                        | T1   | neurologico | attack hit MoS≥2         | apply_status(focused) | —      |

### 1.2 v07 batch entries (lines 3307–5800) — Ambulation / Communication / Intelligence

| #   | trait_id                                                     | label_it                   | tier | category    | trigger | effect_kind             | notes                      |
| --- | ------------------------------------------------------------ | -------------------------- | ---- | ----------- | ------- | ----------------------- | -------------------------- |
| 11  | `ancestor_deambulazione_resistenza_ab_01`                    | Resistenza                 | T1   | neurologico | passive | buff_stat(move_bonus)   | AB 01                      |
| 12  | `ancestor_deambulazione_resistenza_nel_trasporto_ab_07`      | Resistenza nel Trasporto   | T1   | neurologico | passive | buff_stat(move_bonus)   | AB 07 trigger_hint present |
| 13  | `ancestor_deambulazione_velocita_di_deambulazione_bb_ab_01`  | Velocita' di Deambulazione | T1   | neurologico | passive | buff_stat(move_bonus)   | genetic=true BB-prefix     |
| 14  | `ancestor_comunicazione_unita_del_gruppo_cm_07`              | Unita' del Gruppo          | T1   | neurologico | passive | apply_status(linked,2t) | prov: csv_v07              |
| 15  | `ancestor_comunicazione_bisogno_di_attaccamento_hb_01`       | Bisogno di Attaccamento    | T1   | neurologico | passive | apply_status(linked,2t) | HB 01 mating context       |
| 16  | `ancestor_comunicazione_bisogno_di_attaccamento_hb_02`       | Bisogno di Attaccamento    | T1   | neurologico | passive | apply_status(linked,2t) | HB 02 2-baby variant       |
| 17  | `ancestor_ardipithecus_ramidus_via_mesolimbica_dp_05`        | Via Mesolimbica            | T1   | neurologico | passive | buff_stat               | hominid lineage            |
| 18  | `ancestor_australopithecus_afarensis_termoregolazione_th_01` | Termoregolazione           | T1   | neurologico | passive | buff_stat               | hominid lineage            |
| 19  | `ancestor_intelligenza_percezione_spaziale_an_04`            | Percezione Spaziale        | T1   | neurologico | passive | apply_status(focused)   | IN branch                  |
| 20  | `ancestor_destrezza_abilita_motoria_fine_al_07`              | Abilita' Motoria Fine      | T1   | neurologico | passive | buff_stat               | DX branch                  |

### 1.3 Large numeric blocks (lines 6884–9050) — Preventive Med / Therapeutic Med

| #   | trait_id                                                                         | label_it                                | tier | category    | trigger | effect_kind              | prov_code        |
| --- | -------------------------------------------------------------------------------- | --------------------------------------- | ---- | ----------- | ------- | ------------------------ | ---------------- |
| 21  | `ancestor_medicina_preventiva_prevenzione_del_trauma_si_02`                      | Prevenzione del Trauma                  | T1   | neurologico | passive | damage_reduction(1)      | SI 02            |
| 22  | `ancestor_medicina_preventiva_prevenzione_del_trauma_si_03`                      | Prevenzione del Trauma                  | T1   | neurologico | passive | damage_reduction(1)      | SI 03            |
| 23  | `ancestor_medicina_preventiva_resistenza_al_veleno_st_06`                        | Resistenza al Veleno                    | T1   | neurologico | passive | damage_reduction(1)      | ST 06            |
| 24  | `ancestor_medicina_preventiva_resistenza_xenobiotica_bb_st_01`                   | Resistenza Xenobiotica                  | T1   | neurologico | passive | damage_reduction         | BB ST 01 genetic |
| 25  | `ancestor_sensi_identificazione_odoranti_so_06`                                  | Identificazione Odoranti                | T1   | neurologico | passive | apply_status(sensed)     | SO 06 Senses     |
| 26  | `ancestor_sensi_localizzazione_sonora_ss_01`                                     | Localizzazione Sonora                   | T1   | neurologico | passive | apply_status(focused)    | SS 01            |
| 27  | `ancestor_medicina_terapeutica_sollievo_dal_trauma_ci_02`                        | Sollievo dal Trauma                     | T1   | neurologico | passive | apply_status(healing,2t) | CI 02            |
| 28  | `ancestor_medicina_terapeutica_sollievo_dal_trauma_ci_03`                        | Sollievo dal Trauma                     | T1   | neurologico | passive | apply_status(healing,2t) | CI 03            |
| 29  | `ancestor_medicina_terapeutica_efficienza_idratazione_detossificazione_bb_ct_03` | Efficienza Idratazione Detossificazione | T1   | neurologico | passive | buff_stat                | BB CT 03 genetic |
| 30  | `ancestor_medicina_terapeutica_metabolismo_xenobiotico_bb_ct_04`                 | Metabolismo Xenobiotico                 | T1   | neurologico | passive | buff_stat                | BB CT 04 genetic |

---

## 2. Museum Cross-Reference

Relevant cards identified in `docs/museum/MUSEUM.md`:

### M-2026-04-25-004 — Ancestors Neurons Dump 01B (score 4/5, `cards/ancestors-neurons-dump-csv.md`)

Status: **integrated**. Path A (22 trait, PR #1813) + Path B (267 batch, PR #1817) + 1 v07 residual = 290 live. Gallery `galleries/ancestors.md` documents 7 status engine extension statuses + 8 job-archetype mapping (Recon / Support / Tank / Warden / Vanguard / Skirmisher / Ranger / Beastmaster).

**Reuse for reentry**: branch → job archetype mapping is canonical provenance. Safe to consume in codex/catalog consumer.

### M-2026-04-25-007 — Mating Engine D1+D2 Orphan (score 5/5, `cards/mating_nido-engine-orphan.md`)

**Cross-ref relevance**: ancestor `Communication` branch (20 entries, HB codes = pair bonding) maps directly to mating engine mechanics. If OD-001 resolved Path A (activate mating UI ~12-15h), `linked` status from Communication ancestors would surface as visible social bond indicator — first player-visible ancestor trait surface. Zero new work needed once mating UI ships.

### M-2026-04-25-001 — Sentience Traits v1.0 (score 5/5, `cards/cognitive_traits-sentience-tiers-v1.md`)

**Cross-ref relevance**: ancestor `Intelligence` + `Ardipithecus Ramidus` hominid branches (27 entries) overlap with T1/T2 sentience tier criteria. If sentience tiers ship (RFC v0.1), ancestor IN/AR entries would naturally populate T2-T3 cognitive gate prerequisites — no new trait authoring needed.

### Museum gallery: `docs/museum/galleries/ancestors.md`

Follow-up M-future items listed there: `telepatic_link` real wire (~2-3h), per-tag enemy-status check (~3-4h), job-archetype dataset pass (post-playtest). These remain open as of 2026-05-10.

---

## 3. Style Guide Audit

Reference: `docs/core/00E-NAMING_STYLEGUIDE.md` (active, v2026-04-16) — primary for species/biomes. Ancestor traits live in `data/core/traits/active_effects.yaml` which follows `docs/traits/traits_template.md` + `docs/traits/traits_scheda_operativa.md` schema.

### Naming convention (30 sample — compliance check)

Proposal v2 convention (`ancestors_rename_proposal_v2.yaml`): `ancestor_<branch_it>_<label_it_snake>_<legacy_code_suffix>`.

Examples verified:

- `ancestor_deambulazione_resistenza_ab_01` ✅ snake_case, IT branch, IT label, code suffix
- `ancestor_autocontrollo_tachipsichia_fr_01` ✅ full IT base
- `ancestor_medicina_terapeutica_metabolismo_xenobiotico_bb_ct_04` ✅ genetic BB-prefix in suffix

**Compliance ratio (sample of 30)**: **30/30 IDs follow v2 convention** (snake_case + IT branch slug + IT label slug + legacy code suffix). No drift found in IDs applied to active_effects.

### Schema field conformity (active_effects.yaml entries)

| Field                 | Expected                       | Status                                                                                                                                                                                    |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label_it`            | required, Italian string       | ✅ 290/290 present                                                                                                                                                                        |
| `label_en`            | required, English string       | ✅ 290/290 present (applied at import time)                                                                                                                                               |
| `tier`                | T1 or T2                       | ✅ all T1 (T2 present via BB-genetic flag in proposal, but live entries uniformly T1 — intentional conservative cap)                                                                      |
| `category`            | enum                           | ✅ all `neurologico` — correct, ancestors = neuronal branch                                                                                                                               |
| `applies_to`          | actor/target                   | ✅ present on trigger-based entries                                                                                                                                                       |
| `provenance.source`   | string                         | ✅ `ancestors_csv_01B` or `ancestors_csv_v07_wiki`                                                                                                                                        |
| `provenance.code`     | legacy_code                    | ✅ present                                                                                                                                                                                |
| `provenance.license`  | CC string                      | ✅ `CC BY-NC-SA 3.0 Fandom` on v07 entries                                                                                                                                                |
| `description_it`      | Italian prose                  | ⚠️ 22 Path-A entries use mixed IT+EN (EN original + IT summary). v07 batch uses EN original description with IT suffix "Effetto: X (T1)." — functional but not fully editorial-translated |
| `effect` vs `effects` | canonical uses `effects` array | ⚠️ Path-A (22 entries) uses singular `effect:` key; v07 batch (267) uses `effect:` too. Schema drift vs template expectation `effects` array. Non-breaking but inconsistent.              |

**Style guide compliance**: IDs 100%, schema field coverage ~95%. Two minor issues: `effect:` vs `effects:` key (non-breaking, pre-existing), description_it partially EN.

### Tier/category conformity vs canonical traits

Non-ancestor canonical traits (`artigli_sette_vie`, `coda_frusta_cinetica`, etc.) use `category: fisico` or `category: mentale`. Ancestors uniformly use `category: neurologico` — correct and intentional (neuron-derived), no conflict.

---

## 4. Online Research — SRPG/RPG Ancestor/Heritage Patterns

Three primary reference systems with extractable design patterns:

### Pattern R1 — Crusader Kings 3: Dynasty Legacies + Genetic Traits

**Source**: [CK3 Traits Wiki](https://ck3.paradoxwikis.com/Traits) + [Dynasty Guide](https://ck3.paradoxwikis.com/Dynasty)

**Mechanic summary**: Congenital traits inherit probabilistically at birth. Legacy tracks (spent via renown) boost inheritance probability by up to 30% + unlock "chosen trait" for entire dynasty. Leveled congenital trait: 50% chance to level-up if both parents share it.

**Applicable patterns for Evo-Tactics ancestors**:

1. **Branch → hereditary pool**: CK3 maps traits to "genetic category" (health, appearance, intellect). Ancestors branch metadata (AB=locomotion, CM=social, SE=senses) maps cleanly to Evo-Tactics genetic slot pools in `mating.yaml`. Branch → gene_slot assignment = ~2h design + 0h code (pool seeder already scaffolded Path B).
2. **Leveled inheritance**: CK3's T1→T2 genetic escalation mirrors `regular_count: 208 (T1)` vs `genetic_count: 89 (T2, BB-prefix)`. The BB entries ARE the leveled-up variants — this distinction is already in proposals, just not surfaced in mating UI.
3. **Renown gate**: CK3 blocks top-tier traits behind dynasty investment. Evo-Tactics analog: T2 BB ancestors gated behind "evolutionary milestone" unlock — maps to sentience tier criteria in M-001.

### Pattern R2 — Wildermyth: Legacy Transformation + Permanent Body Change

**Source**: [Wildermyth Legacy Wiki](https://wildermyth.com/wiki/Legacy) + [Adventure Rules analysis](https://adventurerules.blog/2022/02/17/how-wildermyths-legacy-mechanic-supports-mythmaking/)

**Mechanic summary**: Hero survives campaign → promoted to legacy tier → transformations (maimed body parts replaced by mythical equivalents) carry forward to next campaign. Semi-permanent: maiming persists across campaigns.

**Applicable patterns for Evo-Tactics ancestors**:

1. **Ancestor-as-transformation**: Wildermyth transformation = "inherited morphological change." Evo-Tactics ancestor traits ARE the hominid evolutionary transformation — same concept. A "lineage reveal" moment (first ancestor trait fires) could display narrative beat (current gap: no player-visible surface for passive ancestor effects).
2. **Campaign-to-campaign persistence**: Wildermyth promotes survivors. Evo-Tactics analog: ancestor trait tree inherited from parent species encounter → descendant unit carries T2 BB variant. Zero new design — provenance already in `genetic: true` flag.
3. **Maiming as badge**: permanent visible change. Evo-Tactics analog: ancestor branch badge on unit HUD (noted as M-future in gallery). Museum card `Wildermyth-battle-scar-portrait` M-031 already exists (score 4/5), directly reusable.

### Pattern R3 — Battle Brothers: Veteran Traits + Permanent Injury Inheritance

**Source**: [BB Traits Fandom](https://battlebrothers.fandom.com/wiki/Traits) + [BB Dev Blog permanent injuries](http://battlebrothersgame.com/dev-blog-79-progress-update-injury-mechanics/permanent-injuries/)

**Mechanic summary**: Recruits have 0-2 random traits affecting stats. Being struck down inflicts permanent injury (reduces HP pool). Veteran attributes incorporate bonuses/maluses from traits AND permanent injuries. Single legendary item (Water Skin) removes them — intentionally rare.

**Applicable patterns for Evo-Tactics ancestors**:

1. **Random-pool-on-recruit**: BB assigns traits from pool at recruit time. Evo-Tactics Path B (biome seeder) = assign ancestor branch traits from pool at species generation time. Mechanically identical — our species are "recruited" from biome encounter pools.
2. **Permanent + recoverable split**: BB has permanent injuries + recoverable status. Ancestor trait split: T1 regular (always-available passive, like BB base trait) vs T2 BB-genetic (hard-earned, like BB permanent buff — requires unlock). Already encoded in `genetic: true` — just needs UI surface.
3. **Trait × injury interaction**: BB veteran level = base + trait + injury modifiers. Evo-Tactics vcScoring already aggregates 20+ raw metrics — ancestor trait contribution could be one vcScoring axis (heritage score), visible in debrief.

---

## 5. Three Path Options Synthesis

Based on runtime audit, museum cross-ref, and research patterns:

### Path A — Build Consumer Service (~2-4h biome seeder, scalable)

**Description**: `ancestors_rename_proposal_v2.yaml` contains `branch` metadata (AB=deambulazione, CM=comunicazione, SE=sensi, etc.) NOT present in `active_effects.yaml`. Consume branch mapping to seed `biome_pools.json` — assign ancestor-branch trait pools to biome archetypes.

**Effort breakdown**:

- Read `ancestors_rename_proposal_v2.yaml` branch→trait_id map: 0.5h
- Extend `biome_pools.json` per 5 terrain archetypes (AB/SW/MT → traversal biomes; CM/IN → social biomes; SE/DX/AT → predator biomes): 1.5h
- Validation + test: 1h
- **Total: ~3h. Blast radius ×1.2 (data service layer, no schema change)**

**Risk**: biome_pools seeder already has open ticket TKT-BIOME-POOL-EXPAND. Integration straightforward. Zero schema change.

**Player visible**: INDIRECT — unit generation pulls ancestor-branch traits from biome. Player sees trait on unit card.

**Pillar**: P2 (emergent evolution) + P3 (species identity).

### Path B — Reject + Delete Proposal Files (~1h)

**Description**: Delete `ancestors_rename_proposal_v1.yaml` + `v2.yaml` from `data/core/ancestors/`. Traits are already live in active_effects. Proposals are purely archival.

**Risk**: Loss of:

- CC BY-NC-SA 3.0 attribution index (wiki URLs per row)
- Branch metadata (the ONLY place branch→trait_id mapping exists)
- Style guide history (which changes applied per entry)

**Museum card required pre-delete** per CLAUDE.md completionist-preserve protocol. Without museum card, deletion violates no-silent-discard rule.

**Recommendation**: REJECT unless master-dd explicitly approves + museum card M-2026-05-10-XXX written first.

### Path C — Sandbox Dormant / Header Proposal-Only (default recommended)

**Description**: Add header comment to both proposal YAML files: `# STATUS: proposal-only — naming migration archive. Traits live in data/core/traits/active_effects.yaml. Do NOT process at runtime. DO NOT delete without museum card.`

**Effort**: ~10 min. Zero code change.

**Value**: Makes intent explicit. Prevents future agent from treating proposals as unimplemented traits (original BACKLOG confusion). Fully reversible — proposals stay as provenance + future Path A activation reference.

**Risk**: None. Pure documentation clarification.

**Recommendation**: SHIP immediately as default. Does not block Path A later.

---

## 6. Recommendation Matrix

| Criterion             | Optimizer pick             | Completionist pick                    |
| --------------------- | -------------------------- | ------------------------------------- |
| Fastest value         | Path A (~3h, biome seeder) | Path C + A (sandbox header + seeder)  |
| Zero risk             | Path C (header only)       | Path C (provenance preserved)         |
| Ancestor surface live | Path A indirect            | Path A + mating OD-001 resolution     |
| Provenance preserved  | Path C                     | Path C + new museum card M-2026-05-10 |
| Consistency           | Path C clarifies intent    | Path C removes drift                  |

**Both optimizer + completionist recommend Path C as immediate zero-cost default.**

**Path A (biome seeder ~3h) is the highest-value follow-up** — uses unique branch metadata from proposals, wires P2+P3, blast radius ×1.2.

**Path B (delete) deferred** — museum card prerequisite, master-dd explicit verdict needed.

---

## Summary Numbers

- **Sample size**: 30 entries (10 Path-A curated + 10 v07 mid-batch + 10 v07 large-block)
- **Style guide compliance (IDs)**: 30/30 (100%) v2 convention
- **Schema field compliance**: ~95% (2 minor drift: `effect:` key singular, description_it partial EN)
- **Runtime consumed**: 290/297 traits in active_effects (97%). 3 consumers: passiveStatusApplier + evaluateMovementTraits + passesBasicTriggers
- **Branch metadata unconsumed**: 18 branches in proposals, 0 consumed by runtime code
- **Research patterns extracted**: 3 (CK3 genetic inheritance + Wildermyth transformation persistence + Battle Brothers veteran pool)
- **Recommendation**: Path C (sandbox header, ~10min) + Path A (biome seeder, ~3h) as follow-up
