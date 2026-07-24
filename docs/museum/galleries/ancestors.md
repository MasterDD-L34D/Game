---
title: Gallery Ancestors — 290 trait wired (RFC v0.1 closed, v07 residual covered)
museum_id: G-2026-04-25-001
type: gallery
domain: ancestors
relevance_score: 5
related_pillars: [P1, P2, P3]
related_cards:
  - M-2026-04-25-004
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: '2026-04-25'
---

# Gallery Ancestors — 290 trait neuroni-derived runtime

## Overview

Sessione 2026-04-25 sera ha chiuso RFC v0.1 promise (`docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md`) di 297 neuroni Ancestors recovery completi. Ramo Self-Control + Attack + Dodge wired prima ([PR #1813](https://github.com/MasterDD-L34D/Game/pull/1813)) tramite 22 trigger from CSV `ancestors_neurons_dump_01B_sanitized.csv`. Path B 297-row CSV via Fandom wiki MediaWiki API ([PR #1815](https://github.com/MasterDD-L34D/Game/pull/1815)) + wire batch 267 nuovi entry ([PR #1817](https://github.com/MasterDD-L34D/Game/pull/1817)). Sessione 2026-04-26 ha chiuso v07 residual gap: diff CSV 297 codes vs YAML rilevò 7 codes truly missing (BB CO 02, BB DO 01/02/03-2, BB FR 02-04). Coverage chiusa via 2 range-extension provenance updates (BB CO 01-02, BB FR 01-04 collapsed semantica) + 1 nuovo entry `ancestor_dodge_infundibular_pathway` T2 collassante BB DO 01/02/03-2 (Infundibular Pathway = genetic version di DO 06 Atarassia, focused 2t target). All 297 v07 codes ora hanno mapping YAML.

**Total ancestor entries in `data/core/traits/active_effects.yaml`**: 22 (Path A) + 267 (Path B) + 1 (v07 residual) = **290**. **Codes covered**: 297/297 v07 wiki recovery (con range-collapse semantics).

## Distribution per branch

| Branch                     |    Count | Mechanic primaria                 | Card ref        |
| -------------------------- | -------: | --------------------------------- | --------------- |
| Self-Control (FR)          | 8 + 1 BB | actor MoS-gated extra_damage      | M-004           |
| Attack/Counter (CO)        | 6 + 1 BB | actor melee+MoS extra_damage      | M-004           |
| Dodge (DO)                 | 7 + 1 BB | target damage_reduction + focused | M-004           |
| Senses (SE)                |       37 | apply_status:focused 1t           | RFC §2 priority |
| Dexterity (DX)             |       33 | actor extra_damage on hit         | RFC §2          |
| Ambulation (AB)            |       26 | buff_stat:move_bonus              | RFC §2          |
| Communication (CM)         |       20 | apply_status:linked 2t            | bonus           |
| Intelligence (IN)          |       14 | apply_status:focused on miss      | bonus           |
| Motricity (MT)             |       20 | buff_stat:move_bonus              | bonus           |
| Omnivore (OM)              |       11 | apply_status:fed 3t               | bonus           |
| Settlement (ST)            |       10 | damage_reduction target           | bonus           |
| Swim (SW)                  |        5 | buff_stat:move_bonus water_only   | bonus           |
| Metabolism (MB)            |        4 | apply_status:fed 3t               | bonus           |
| Preventive Med (PM)        |       30 | damage_reduction target           | bonus           |
| Therapeutic Med (TM)       |       24 | apply_status:healing 2t           | bonus           |
| Orrorin Tugenensis         |        8 | per-name fit                      | hominid         |
| Ardipithecus Ramidus       |       13 | per-name fit                      | hominid         |
| Australopithecus Afarensis |       12 | per-name fit                      | hominid         |

**Tier split**: 178 T1 + 90 T2 (BB-genetic) + 0 T3 (post-v07 residual: +1 T2 Infundibular Pathway).

## Job archetype mapping (proposal post-playtest)

Ramificazione Ancestors → job archetypes Evo-Tactics:

| Ancestors branch                      | Job archetype   | Reasoning                                  |
| ------------------------------------- | --------------- | ------------------------------------------ |
| Senses 37 + Intelligence 14           | **Recon**       | sensory awareness + learning               |
| Communication 20                      | **Support**     | clan coordination passive                  |
| Settlement 10 + Preventive Med 30     | **Tank**        | defensive group buff + damage reduction    |
| Therapeutic Med 24 + Metabolism 4     | **Warden**      | regen healing-over-time                    |
| Self-Control 12 + Attack 8 + Dodge 10 | **Vanguard**    | reaction trigger + counter                 |
| Dexterity 33 + Motricity 20           | **Skirmisher**  | aim/equilibrium + mobility                 |
| Ambulation 26 + Swim 5                | **Ranger**      | endurance + biome traversal                |
| Omnivore 11 + 3 hominid lineages 33   | **Beastmaster** | adaptive feeding + evolutionary milestones |

Pattern allinea 8 mapping branch → 7 jobs canonical + 1 expansion (Beastmaster M13 wave).

## Runtime status: 6/9 active

Per audit balance-auditor 2026-04-25 sera + status engine extension [PR #1822](https://github.com/MasterDD-L34D/Game/pull/1822):

| Status           | Mechanic wired                         | Used by                 |
| ---------------- | -------------------------------------- | ----------------------- |
| `focused`        | +1 attack_mod actor                    | Senses, Intelligence    |
| `linked`         | +1 attack_mod when ally adjacent       | Communication           |
| `fed`            | +1 HP regen turn_end                   | Omnivore, Metabolism    |
| `healing`        | +1 HP regen HoT                        | Therapeutic Med         |
| `attuned`        | +1 defense_mod target                  | Settlement (subset)     |
| `sensed`         | +1 attack_mod actor (accuracy)         | Senses (subset)         |
| `telepatic_link` | log marker only (M-future reveal pipe) | magnetic_rift_resonance |

`frenzy` aggiunto per coverage rage variants.

## License + provenance

Ancestors wiki content **CC BY-NC-SA 3.0 Fandom**. Ogni trait `provenance` block:

```yaml
provenance:
  source: ancestors_csv_v07_wiki # or ancestors_csv_01B per Path A
  code: <CO/DO/FR/SE/AB/...>
  branch: <branch_name>
  license: CC BY-NC-SA 3.0 Fandom
```

Derivative work obligation preserved per row for runtime + downstream consumers.

## Files reference

- Source CSVs:
  - `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv` (34 entries Path A baseline)
  - `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` (297 entries Path B full)
  - `reports/incoming/ancestors/ancestors_neurons_manifest_v07.json` (manifest + SHA256)
- Runtime YAML: `data/core/traits/active_effects.yaml` 165→432 traits (22→289 ancestor entries)
- Cards: [`M-2026-04-25-004 ancestors-neurons-dump-csv`](../cards/ancestors-neurons-dump-csv.md)
- Inventory: [`docs/museum/excavations/2026-04-25-ancestors-inventory.md`](../excavations/2026-04-25-ancestors-inventory.md)

## PR sequence (chronological)

1. [#1813](https://github.com/MasterDD-L34D/Game/pull/1813) Path A 22 trigger wire (FR 8 + CO 6 + DO 7 + BB 2)
2. [#1815](https://github.com/MasterDD-L34D/Game/pull/1815) Path B 297-row dataset CSV + manifest
3. [#1817](https://github.com/MasterDD-L34D/Game/pull/1817) Path B wire 267 batch
4. [#1819](https://github.com/MasterDD-L34D/Game/pull/1819) Audit fixes (gates + balance + sprint context)
5. [#1822](https://github.com/MasterDD-L34D/Game/pull/1822) Status engine extension 7 statuses runtime
6. [#1825](https://github.com/MasterDD-L34D/Game/pull/1825) P4 enneaEffects wire 6/9 archetipi

## Pillar impact verified

- **P1 Tattica leggibile 🟢**: 68 trait no-op → observable game effect via 7 status engine extension
- **P2 Evoluzione emergente 🟢c+ candidato**: ancestors base genetica popolata 297 neuroni complete
- **P3 Specie×Job 🟢c+**: rami Ancestors mappabili a 8 job archetypes (vedi proposal sezione sopra)

## Follow-up M-future

- ✅ **3 stat consumer wire** — DONE branch `feat/stat-consumer-wire-move-stress-evasion`: `move_bonus` (validatePlayerIntent budget extend), `stress_reduction` (sgTracker damage_taken multiplier cap 0.5), `evasion_bonus` (resolveAttack+predictCombat DC). 5/5 stat mechanical, 0/5 log_only. Ennea P4 🟢 candidato.
- **`telepatic_link` real intent-reveal pipe** wire to `buildThreatPreview` (~2-3h)
- **Per-tag enemy-status check** (predator/irascible/wildlife): currently inert in `description_it` only, attiva runtime gate ~3-4h
- **Job-archetype mapping pass** dataset → species canonical (post-playtest validation)
- **UI HUD ancestor branch badge** (post-playtest)

## Anti-pattern guard

⚠️ NON reinventare ancestors design ad-hoc. Provenance CC BY-NC-SA Fandom + RFC v0.1 baseline preserved. Mechanic mapping conservative (max amount=2 T2 only) per evitare game-breaking ratios.

⚠️ NON aggiungere nuovi trait ancestor senza:

1. Source provenance (CSV row reference o RFC mention)
2. License attribution preserved
3. Conservative cap rispettato
4. Schema mapping coerente con baseline esistente

## Cross-links

- Inventory: [`docs/museum/excavations/2026-04-25-ancestors-inventory.md`](../excavations/2026-04-25-ancestors-inventory.md)
- Card primary: [`M-2026-04-25-004 ancestors-neurons-dump-csv`](../cards/ancestors-neurons-dump-csv.md)
- RFC source: [`docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md`](../../planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md)
- License sources: [`docs/planning/research/sentience-rfc/sources.md`](../../planning/research/sentience-rfc/sources.md)
