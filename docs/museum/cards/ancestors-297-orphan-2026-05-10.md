---
title: 'Ancestors Rename Proposals v1/v2 — Branch Metadata Archive'
museum_id: M-2026-05-10-001
type: dataset
domain: ancestors
provenance:
  found_at: data/core/ancestors/ancestors_rename_proposal_v2.yaml
  git_sha_first: '24229bd4'
  git_sha_last: 'edb069e6'
  last_modified: 2026-04-26
  last_author: MasterDD-L34D
  buried_reason: deferred
relevance_score: 3
reuse_path: 'biome_pools.json seeder via branch metadata — Path A ~3h, blast ×1.2'
related_pillars: [P2, P3]
status: excavated
excavated_by: repo-archaeologist
excavated_on: 2026-05-10
last_verified: 2026-05-10
---

# Ancestors Rename Proposals v1/v2 — Branch Metadata Archive

## Summary (30s)

- **What**: 2 YAML files (v1 English IDs, v2 Italian IDs) each mapping all 297 Ancestors game neurons to Evo-Tactics snake_case IDs with provenance (wiki URLs, CC BY-NC-SA 3.0) and **branch metadata** (18 branches: Ambulation, Communication, Senses, etc.)
- **Where**: `data/core/ancestors/ancestors_rename_proposal_v1.yaml` (4640 lines) + `v2.yaml` (4645 lines)
- **Why counts**: The 290 trait IDs are ALREADY live in `data/core/traits/active_effects.yaml`. The proposals are provenance registries + the ONLY place where branch→trait_id grouping exists.

## What was buried

Two YAML files in `data/core/ancestors/` created during sprint 2026-04-26 (PR #1878 `24229bd4` + PR #1881 `edb069e6`). Schema per entry:

```yaml
- id_old: 'AB 01'
  id_new: ancestor_deambulazione_resistenza_ab_01
  branch: deambulazione # UNIQUE — not in active_effects.yaml
  branch_label_it: 'Deambulazione'
  branch_label_en: 'Ambulation'
  label_it: 'Resistenza'
  label_en: 'Endurance'
  description_it: 'Moving requires a lot less energy.'
  genetic: false
  legacy_code: 'AB 01' # UNIQUE — not in active_effects.yaml
  license: 'CC BY-NC-SA 3.0'
  attribution: 'ancestors.fandom.com (Fandom CC BY-NC-SA)'
  sources: 'https://ancestors.fandom.com/wiki/Endurance_(AB_01)' # UNIQUE
  style_guide_changes: [snake_case_id, italianize_id_base, ...]
```

**Fields present in proposals but NOT in active_effects.yaml**:

- `branch` / `branch_label_it` / `branch_label_en` — 18 branch groupings
- `legacy_code` (AB 01, FR 01...) — original Ancestors game codes
- `sources` (wiki URL per row) — per-entry CC attribution URL
- `style_guide_changes` (list of transforms applied) — provenance trail

**Distribution**: 297 entries across 18 branches: Senses 37, Dexterity 33, Preventive Med 30, Ambulation 26, Therapeutic Med 24, Communication 20, Motricity 20, Hominid lineages 33, Intelligence 14, Settlement 10, Dodge 10, Omnivore 11, Attack 8, Orrorin Tugenensis 8, Swim 5, Metabolism 4, Ardipithecus Ramidus 13, Australopithecus Afarensis 12.

**Genetic split**: 89 T2 genetic (BB-prefix) + 208 T1 regular = 297.

## Why it was buried

Not buried — deferred by design. Proposals = migration staging area. After Phase 2 apply (PR #1881, master-dd verdict 2026-04-27 Q1=b Q2=B Q3=B), traits were batch-applied to `active_effects.yaml`. Proposals were left as-is: provenance archive + branch metadata reference. No explicit header marking them proposal-only → caused BACKLOG confusion (`data/core/ancestors/` described as "297 entries zero runtime consumer").

## Why it might still matter

1. **Branch metadata nowhere else**: `branch` field (18 categories) is the ONLY place ancestor traits are grouped by functional domain. Consumer that reads this = free biome-pool seeder (Path A).
2. **CC BY-NC-SA attribution per row**: wiki URL + license per entry = legal compliance trail. Delete proposals = lose per-row attribution (aggregated in gallery but not per-row).
3. **Style guide history**: `style_guide_changes` list per entry = migration audit trail (which transforms were applied). Relevant if future editorial pass needed.
4. **Research patterns support branch mapping**: CK3 genetic inheritance → branch-as-hereditary-pool. Wildermyth transformation persistence → genetic=true as T2 tier marker. Battle Brothers random-pool-on-recruit → branch→biome_pool seeder.

Pillar match: P2 (branch metadata unlocks emergent evolution pool seeding), P3 (branch→job archetype proposal in gallery).

## Concrete reuse paths

1. **Minimal — Sandbox header (~10 min)**: Add YAML comment header to both files: `# STATUS: proposal-only — naming migration archive. Traits live in active_effects.yaml. Do NOT process at runtime.` Prevents future agent confusion. Zero risk. No PR needed, can be inline edit. **Recommended first step.**

2. **Moderate — Biome pool seeder (~3h)**: Read `ancestors_rename_proposal_v2.yaml` branch field → assign branch-grouped trait_id lists to `biome_pools.json` encounter pools. AB/SW/MT → terrain biomes; CM/IN → social biomes; SE/DX/AT → predator biomes. Blast radius ×1.2 (data service layer only). Open ticket TKT-BIOME-POOL-EXPAND aligns. Gate: master-dd Q1 verdict from `docs/planning/2026-05-10-tkt-ancestors-consumer-research.md`.

3. **Full — Attribution codex browser (~2h + UI scope)**: Parse proposals into trait lore codex (branch → entries → wiki source link) as read-only lore tab. Requires NEW UI component. Blast ×1.3 (route layer). Post-playtest.

## Sources / provenance trail

- Found at: [`data/core/ancestors/ancestors_rename_proposal_v2.yaml`](../../data/core/ancestors/ancestors_rename_proposal_v2.yaml)
- Git history:
  - `24229bd4` MasterDD-L34D 2026-04-26 — initial v1 (English IDs, Phase 1 apply)
  - `edb069e6` MasterDD-L34D 2026-04-26 — Phase 2 apply (Italian IDs, master-dd verdict)
- Existing gallery: [`docs/museum/galleries/ancestors.md`](../galleries/ancestors.md) — 290 traits wired, job-archetype mapping, PR sequence
- Existing card: [`M-2026-04-25-004 ancestors-neurons-dump-csv`](ancestors-neurons-dump-csv.md) — Path A/B integration trace
- Research audit: [`docs/research/2026-05-10-ancestors-297-reentry-audit.md`](../../research/2026-05-10-ancestors-297-reentry-audit.md)
- Prior planning: [`docs/planning/2026-05-10-tkt-ancestors-consumer-research.md`](../../planning/2026-05-10-tkt-ancestors-consumer-research.md)
- Related museum: M-2026-04-25-007 (mating engine orphan, OD-001) — CM branch → `linked` status surface on mating UI activation

## Risks / open questions

- **Delete risk HIGH**: losing per-row CC attribution + branch metadata + style_guide_changes audit trail. Do NOT delete without explicit master-dd OK + this card is live.
- **Branch metadata drift if active_effects edited**: if a future edit renames a trait in active_effects, the proposal YAML will drift. Low risk (trait IDs are stable post-v2 apply), but flag.
- **Schema drift `effect:` vs `effects:`**: 290 ancestor entries use singular `effect:` key in active_effects. Template expects `effects:` array. Non-breaking (runtime handles both), but pre-empts any future schema strict validation.
- **User decision needed Q1**: Is Path A (biome seeder ~3h) approved? See planning doc open questions.
