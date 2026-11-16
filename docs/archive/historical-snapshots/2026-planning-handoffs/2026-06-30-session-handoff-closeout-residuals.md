---
title: '2026-06-30 session handoff -- owner-residuals via ask + close-out Tier-2 round'
date: 2026-06-30
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-30'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [handoff, closeout, residual, owner-decisions, derived-canon, codex, session]
---

# 2026-06-30 session handoff -- owner-residuals + close-out Tier-2 round

> **Resume entry-point**: read this + the [close-out master plan](2026-06-29-closeout-master-plan.md)
> (PR [#3072](https://github.com/MasterDD-L34D/Game/pull/3072)) + the
> [residual-gate register](2026-06-23-residual-gate-register.md). Continuation chip
> carries the prepared next-work.

## What shipped (all MERGED unless noted)

### Phase 1 -- the 4 prepared owner-residuals ("occupiamoci di tutti i residui via ask")

| residual                                                           | disposition (master-dd via AskUserQuestion)                                  | PR                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| flip-CI reproducibility guard -> **enforcing** + `--deep`          | flip; Codex P2 = default misses bundle source-drift -> `--deep`              | [#3071](https://github.com/MasterDD-L34D/Game/pull/3071) |
| **orphan biomes** -> canonical (laguna->reef, mangrovieto->palude) | MAP (not accept); TKT-KEEPER-CANON-5BIOMI 5/5; +pack alias mirror (Codex P2) | [#3073](https://github.com/MasterDD-L34D/Game/pull/3073) |
| **GAP2 \*\_2** appendix -- ratify + wire 9 variants (407->416)     | ratify+wire (NOT remove -- verify-first correction)                          | [#3074](https://github.com/MasterDD-L34D/Game/pull/3074) |
| **13-lore** retired-creature promote (#3038)                       | review-batch; +`codex_archive` exempt namespace guard #2851; +list-filter    | [#3076](https://github.com/MasterDD-L34D/Game/pull/3076) |

Earlier in the session: [#3067](https://github.com/MasterDD-L34D/Game/pull/3067) float-stabilize,
[#3068](https://github.com/MasterDD-L34D/Game/pull/3068) GAP2 block-3,
[#3070](https://github.com/MasterDD-L34D/Game/pull/3070) doc-sync -- these close the
**derived-canon reproducibility arc** (see [arc handoff](2026-06-29-derived-canon-reproducibility-arc-handoff.md)).

### Phase 2 -- close-out plan Tier-2 round (one batch)

| O#  | item                           | disposition                                                                                  | PR                                                       |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| O1  | SPEC-J `SCAR_TRAIT_MAP` ratify | **ratified as-built** (#2994; flip stays N=40-gated)                                         | marker (recorded)                                        |
| O7  | GAP2-next mechanics            | **deferred** (45-boilerplate = prose-rewrite design; clusters = forbidden-schema primitives) | --                                                       |
| O8  | resistance_archetype guard     | **BUILT** -- guard + remap 5 `strutturale`->`adattivo` (band-neutral; caught real #3032 bug) | [#3080](https://github.com/MasterDD-L34D/Game/pull/3080) |

### Phase 3 -- chip sessions (read + verified all merged)

`task_64eae2e2` Tracery lore-gen fix -> [#3077](https://github.com/MasterDD-L34D/Game/pull/3077);
`sync_core` species foot-gun -> [#3078](https://github.com/MasterDD-L34D/Game/pull/3078);
B8 repoint -> [#3079](https://github.com/MasterDD-L34D/Game/pull/3079) + [#3075](https://github.com/MasterDD-L34D/Game/pull/3075);
governance drift -> #3058; close-out plan -> [#3072](https://github.com/MasterDD-L34D/Game/pull/3072);
hazard-encounter -> #3065; Godot telegraph -> GGv2 #557. **0 open Game PRs** (#3080 pending master-dd merge).

## Completed plans (links)

- [Close-out master plan](2026-06-29-closeout-master-plan.md) -- the tiered closure order; Tier-2 first round done.
- [Derived-canon reproducibility arc handoff](2026-06-29-derived-canon-reproducibility-arc-handoff.md) -- arc CLOSED + extended (CI enforcing + `--deep`).
- [Residual-gate register](2026-06-23-residual-gate-register.md) -- SoT for the SPEC-A..Q + salvage gates.

## Permissions acquired this session (master-dd)

- **Merge-libero** for doc-sync + non-forbidden tool/data PRs (auto-merge L3 on 7-gate green). Canon-DATA = surface green + master-dd merges.
- **FORBIDDEN** (master-dd-manual, never self-merge): `.github/workflows/`, `packages/contracts/`, `services/generation/`, `migrations/`, `services/rules/`. Explicit auth required (a generic "procedi" is not enough).
- Compensating **cavecrew** review on substantial data/tool PRs; reply+resolve every Codex inline thread. Codex was **rate-limited** at session end -> cavecrew is the compensating control.

## Next entry-point (owner-gated -- needs sustained master-dd involvement)

- **Tier-2 remaining**: **ALL DONE 2026-06-30** -- O3 PILLAR 6/6+def++ #3096 / O4 D6 #3083 / O5 D7 prose (form-B) #3097 / O6 D8 #3082 / O1 scar-map+testa #3098 / O7 deferred. **Tier-2 design-call batch DRAINED.**
- **Tier-3 N=40 lane** (ratified order, Q2 = LETHAL first): N1 SPEC-J LETHAL (author `lethal:true` encounter -> N=40 -> flip permadeath) -> N2 HA1 -> N4 STAMINA -> N3 ER7 -> N6 ER6 -> N5 A2 -> N8 DR2 -> N7 interoception.
- **Infra forbidden-path** (master-dd merge/hands): ~~I2 ci.yml stale refs~~ DONE #3088 / **I3 crossbreed cooldown + I4 SPEC-E ritual cost = both DEFERRED 2026-06-30** (same persistence-layer gap: companion store not hydrated from Prisma / no backend resource pool) / I8 prod-flips bundle (post-gates).
- **Godot cross-repo** (GGv2): G2 IMPRINT_BEAT flip / G3 META route-UI / G6 move-terrain engine-AP.
- **Content follow-ups** (flagged this session): the 5 retired codex entries echo old `strutturale` in `key_facts`/`game_impact`/`content` prose (master-dd-reviewed #3076 -> needs a coherent codex pass: gen-source fix + prose review); B1 eco_sismico (forbidden effect_type); B5 TR200X metrics (un-fabricatable); B6 keeper content-debt (large).

## Lessons (this session)

- **Verify-first error + correction (load-bearing)**: classified the 9 `*_2` as "empty cruft" (glossary lookup checked `descrizione`, the field is `description_it`) -> would have deleted authored deep-research variants. Surfaced the correction before deleting -> ratify+wire.
- **codex_archive flag must be honored by BOTH the validator AND `listCodexEntries()`** -- exempting only the validator left the 13 as permanently-locked `???` rows + an impossible completion count.
- **ruamel** for format-preserving YAML edits (`width=4096` avoids reflow); `promote_codex_draft.js` = MOVE.
- The close-out plan's "Tier-1 autonomous (whole tier)" was optimistic: verify-first showed B1/B5/B3 all hit owner-gates (forbidden effect_type / un-fabricatable metrics / external-research corpus). The register/BACKLOG detail rows were already honest.
