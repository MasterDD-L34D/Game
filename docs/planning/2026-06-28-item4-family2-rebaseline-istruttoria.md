---
title: 'Salvage item 4 + 2b -- catalog/affinity re-baseline istruttoria (Family-2 fix + canonize 13)'
date: 2026-06-28
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-28'
source_of_truth: false
review_cycle_days: 90
tags: [salvage, derived, catalog, species, affinity, etl, rebaseline, istruttoria, owner-gated]
---

# Salvage item 4 + 2b -- catalog / affinity re-baseline istruttoria

> **EXECUTED (master-dd verdicts 2026-06-28)**: A = prune events, B1 = extend
> GAMEPLAY*BIOMES, C2 = pack-scoped bridge. Catalog half shipped in PR #3045
> (+13 -6, dedup guard added so the 5 already-canon `sp*` species are not
> duplicated; catalog 75 -> 82, guard reproducible). Bridge half (C2) is a
> follow-up. This doc stays as the decision record.

Recon + prepared findings for the OWNER-GATED catalog/affinity re-baseline
(salvage item 4) coupled with canonizing the 13 retired creatures (item 2b).
**Nothing regen'd here is committed** -- this is the decision surface (verdict-3
discipline: "I prepare regen+diff for your review"). Ground-truth verified on a
clean worktree off origin/main, 2026-06-28 (the runbook
`docs/guide/derived-artifacts-reproducibility.md` was dated 2026-06-22, BEFORE
several fixes landed -- the drift has shrunk; this doc supersedes its Family-2
numbers).

## TL;DR -- what changed since the runbook

The owner-gated remediation got materially smaller. `tools/py/check_derived_reproducible.py`
(non-destructive guard) now reports only **4 drift findings**, down from the
runbook's 3-mechanism Family-2:

| Drift                                              | Status now (2026-06-28)                                   | vs runbook (2026-06-22) |
| -------------------------------------------------- | --------------------------------------------------------- | ----------------------- |
| F2: downgrade-on-rerun (16 species stub-downgrade) | **RESOLVED** (#2971 promote UPGRADES bare stubs in place) | was open mechanism #1   |
| F2: missing newer species (5)                      | **RESOLVED** (no longer predicted by the guard)           | was open mechanism #3   |
| F2: lingering `evento_ecologico` (6)               | **OPEN** -- additive promote never prunes                 | unchanged mechanism #2  |
| F2: `source_provenance` ephemeral `/tmp` paths     | OPEN (cosmetic)                                           | unchanged               |
| F1: trait-bridge stale (committed 287 -> regen 72) | OPEN -- coupled with the catalog (below)                  | unchanged               |

So the Family-2 "pipeline-idempotency fix" the handoff flagged as the blocker is
**already half-done**: only the lingering-event PRUNE remains (the downgrade fix
shipped in #2971). The real remaining work is a **coordinated 3-part decision**,
not a big engine fix.

## The 3 coupled parts (all need a master-dd design decision)

### Part A -- prune the 6 lingering ecological events (F2 mechanism #2)

6 catalog entries are `role_trofico=evento_ecologico`, promoted BEFORE the
`is_event` filter (v0.4.3) landed; promote only ADDS/UPGRADES, never prunes:

`aurora_bridge_runner`, `glowcap_weaver`, `magneto_ridge_hunter`,
`myco_spire_warden`, `slag_veil_ambusher`, `zephyr_spore_courier`.

A fresh promote excludes them (`is_event` skip), but they linger in the committed
catalog. Fix = a one-time prune (a `--prune-events` pass, or rebuild the catalog
with the filter from the start). **Decision: prune them now, or keep as canon
events?** (They have `evento_ecologico` role -- if events are NOT canonical
species they should go; if they are intended canon, the guard finding should be
suppressed instead.)

### Part B -- canonize the 13 retired creatures (item 2b)

The 13 ratified specs live at `packs/evo_tactics_pack/data/species/<biome>/<id>.yaml`
(#3032). `promote_gameplay_to_canon.py` now has `--out`/`--catalog`/`--dry-run`
(dry-testable, #2971). BUT `--all-gameplay` only promotes a hardcoded set:

```
GAMEPLAY_BIOMES = ["badlands", "cryosteppe", "deserto_caldo", "foresta_temperata"]
```

Only **2 of the 13** sit in those biomes (`tellurmordax_phasicus` = badlands,
`illusiopardus_psionicus` = foresta_temperata). The other **11** are in biomes
NOT in the gameplay set:

`abisso_vulcanico, canopia_ionica, canyons_risonanti, caverna, foresta_miceliale,
palude, reef_luminescente, savana, stratosfera_tempestosa`.

So canonizing the 13 is a deliberate **"which biomes enter canon"** decision, not
an automatic regen. Options:

- (B1) extend `GAMEPLAY_BIOMES` with the 11 new biomes (canon-wide, future pack
  species in those biomes auto-promote too);
- (B2) promote via `--biome <name>` per biome. NOTE (Codex P2 correction): `--biome`
  is NOT creature-scoped -- it promotes every non-event creature YAML in that biome,
  same as B1 for the selected biomes (it just limits WHICH biomes, not which creatures).
  Neighbour exclusion comes from the dedup guard + the `is_event` filter, not from
  `--biome`;
- (B3) defer canonize -- keep the 13 as pack-only gameplay species (the catalog
  is NOT the gameplay-species registry; see Part C).

Note: the comment in `GAMEPLAY_BIOMES` says thin/single-creature biomes are
intentionally excluded (YAGNI: "promote when that biome enters gameplay"). Several
of the 11 are single-creature -- so the exclusion was deliberate. **Decision: do
these biomes "enter gameplay" now (B1/B2), or stay pack-only (B3)?**

### Part C -- re-baseline the trait bridge (F1) -- the coupling crux

The bridge (`build_species_trait_bridge.py`) reads trait kits from the **pack
species YAMLs** and emits `species_affinity.json` + an index overlay. Committed =
287 trait entries; a fresh regen = **72** (drops 222 stale trait ids, adds 7).
The guard flags **80 species in the committed (stale) affinity not in the
catalog**; a fresh regen still references pack species not in the catalog (cont-12
measured ~41, including the 13 new creatures).

**This is the crux question**: the bridge's source population (103 pack species
YAMLs) and the catalog (75 entries) are largely **different id-spaces** (only ~23
overlap by filename-norm; the catalog was built from legacy + pack-v2 + 22
gameplay-promote, NOT from the 103 gameplay pack dirs). So a bridge regen will
ALWAYS reference pack species absent from the catalog -- unless either (a) the
catalog absorbs the pack species, or (b) the "species in affinity must be in
catalog" guard expectation is wrong and the bridge legitimately spans pack
species.

**Decision: is the trait bridge meant to reference only catalog species, or all
pack species?**

- (C1) bridge = catalog-scoped -> then Part B must canonize MANY pack species
  (not just 13) to clear the affinity references; large canon expansion.
- (C2) bridge = pack-scoped (legitimate) -> the "not in catalog" guard finding is
  a false-positive for pack species; relax the guard to compare against
  pack-species, re-baseline the bridge to 72 (drops the 222 genuinely-dead trait
  ids), accept pack references. Smaller, cleaner; canonize-13 (Part B) becomes
  independent of the bridge.

C2 is the lower-blast-radius reading (the bridge IS about pack-species trait
kits; the catalog is a separate canonical registry). But it is a master-dd call
on the intended data model.

## Proposed coordinated sequence (after the 3 decisions)

1. **Generator determinism** (already in #2971 for promote; bridge still needs LF
   - `schema_version` wrapper preservation -- low-risk tool fix, can ship first).
2. **Part A**: prune the 6 events (or suppress the finding).
3. **Part B**: canonize the 13 per the B1/B2/B3 choice (`promote --dry-run` first,
   diff, then `--apply`; NEVER hand-edit the catalog).
4. **Part C**: re-baseline the bridge (`node scripts/build_trait_index.js` then
   `python tools/py/build_species_trait_bridge.py`), per the C1/C2 choice.
5. **Consumer check** (required before commit): `apps/backend/services/traitRepository.js`,
   `apps/backend/services/catalog.js`, mission-console, trait-editor,
   `scripts/qa/frattura_abissale_validations.py` must tolerate the leaner 72-entry
   affinity + the new catalog entries. Run `npm run test:api` + the canon
   gates + `check_derived_reproducible.py` (should go clean after).
6. Optionally CI-wire the guard (`.github/workflows`, forbidden path, owner).

## What is NOT in this doc

No regen committed. No catalog/bridge file touched. The 13 lore drafts (#3038)
are independent (codex `_drafts/`, unserved) and do not depend on canonization.

## Decisions requested (master-dd)

1. **Part A** -- prune the 6 lingering `evento_ecologico`, or keep them?
2. **Part B** -- canonize the 13 now via B1 (extend GAMEPLAY_BIOMES) / B2 (scoped
   `--biome` x11) / B3 (defer, pack-only)?
3. **Part C** -- trait bridge data model: C1 (catalog-scoped, large canon
   expansion) or C2 (pack-scoped, relax guard + re-baseline to 72)?

Once decided, the re-baseline is a small, mechanical, dry-testable sequence (no
big engine work). I will prepare the actual regen + diff for review before any
commit.
