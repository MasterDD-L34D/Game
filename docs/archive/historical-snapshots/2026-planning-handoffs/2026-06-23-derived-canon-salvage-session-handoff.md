---
title: 'Derived-canon salvage -- session handoff (2026-06-23 close)'
date: 2026-06-23
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
review_cycle_days: 90
tags: [salvage, derived, trait, species, handoff, continuation]
---

# Derived-canon salvage -- session handoff (2026-06-23)

Closing a very long session at near-full context. Ground-truth = git + the persistent
memory `project_derived_artifact_reproducibility.md` (auto-loaded; read the SESSION CLOSE
cont-1..cont-12 blocks). This doc = the continuation map.

## Done this session (MERGED on main)

- **Trait engine closed to the band-neutral frontier + eco producer**: eco_sismico
  producer (#3027 `982dd33b`, forbidden-path), membrane terrain-heal (#3013), eco
  tile-status primitive (#3015), the active modes (matrice/filtri/pigmenti). 13
  retired-creature gameplay-spec drafts (#3032 `26fdfa1d`) + their identity ratification
  (#3029 `1aab9640`). Salvage progress doc + substrate phase-0 review (#3011) + combat.md
  doc-sync (#3026).

## Open PRs awaiting master-dd merge

- **#3035** -- 6 GAP2 secretion/sensory trait mechanics (data-only, mirror-consistent, green).
- **#3036** -- 9 appendix-A `*_2` variant traits (deep-research grounded, design_stub:true
  pending master-dd prose ratify).
- **#3033** -- GAP2 6-trait mechanics PROPOSAL doc (SUPERSEDED by the build #3035 -> merge
  as record or close).
- (This handoff doc's own PR.)

## The 4 master-dd verdicts (AskUserQuestion 2026-06-23) -- status

1. GAP2 6 mechanics: ratify-all-and-build -> **DONE #3035**.
2. `*_2` author-as-distinct -> **DONE #3036** (deep-research workflow wf_bc250b40; the
   "25/25 killed" verdict was a RATE-LIMIT artifact, verifiers abstained -- biology sound).
3. item 4 catalog/affinity re-baseline = "I prepare regen+diff for review" -> **PREPARED +
   FINDING (see below); NOT committed**.
4. 13 creature A.L.I.E.N.A. lore DRAFTs = "generate now" -> **NOT STARTED**.

## Remaining work (the continuation)

1. **Verdict 4 -- 13 creature lore DRAFTs** (the one un-started autonomous piece).
   Generate via `tools/py/codex_aliena_lore_gen.py` (Tracery, `data/codex/_grammar/`)
   for the 13 ratified creatures (ids in the ratify doc on main:
   `docs/planning/2026-06-22-retired-creatures-salvage-proposal.md` RATIFIED section).
   HITL gate: machine-prose stays DRAFT (`lore_review_status` != human_reviewed) until
   master-dd reviews; promote via `tools/js/promote_codex_draft.js`. Needs per-creature
   `lore_vars`. The 13 species specs are on main (#3032) as the source.
2. **item 4 -- catalog/affinity re-baseline (owner-gated, master-dd design call)**.
   KEY FINDING: the Family-1 trait-bridge re-baseline WORKS (drops ~215 stale, 287->72,
   consumers green) BUT is COUPLED with the catalog -- it then references 41 species not
   in the catalog (incl. the 13 new creatures = pack-species not yet canonized). A
   bridge-only regen leaves a 41-mismatch -> do NOT commit it alone. The full clean
   re-baseline needs the **Family-2 catalog pipeline-idempotency fix** (downgrade-on-rerun
   - lingering `evento_ecologico` prune; runbook `docs/guide/derived-artifacts-reproducibility.md`
     "owner-gated remediation" #2) + **canonize the 13 (item 2b)**, done together. This is
     master-dd's design decision -- surface, do not naive-regen.
3. **item 2b -- canonize the 13 creatures into species_catalog** (the owner-gated ETL,
   coupled with item 4 above). Promote via the species pipeline (NEVER hand-edit the
   catalog -- regenerate); blocked on the Family-2 fix.
4. **`*_2` ratify** (#3036): the prose is Claude-invented -> master-dd ratifies, then drop
   `design_stub`. Same for the GAP2 6 PROPOSED mechanic values (#3035, ratify N=40).
5. **GAP2 broader 104 inert traits**: 53 crisp-described (groundable), the rest need a
   description first. Per-block mechanic ratify (framework in #3033). Design-gated.
6. (Minor) CI-wire the reproducibility guard (`.github/workflows`, forbidden).

## Reusable patterns + gotchas (established this session)

- Trait-mechanic add: trait_mechanics.yaml + active_effects.yaml MIRROR (the
  `check_trait_mirror_consistency` gate is a P1 -- a trait in one but not the other is
  silently no-op'd) + jobs regen for actives (`generate_trait_native_abilities.py --write`).
- New trait DB file needs `slot`+`sinergie` in BOTH the DB file and the index.json entry.
- index.json + glossary.json are round-trip-stable under `json.dumps(indent=2,
ensure_ascii=False)+'\n'` -> append entries surgically, no mass-reformat.
- Per-slice loop: TDD against the AI baseline (557, byte-stable) -> the 5 trait gates if a
  NEW trait -> compensating review (cavecrew; Codex rate-limited) -> branch + PR, NO
  self-merge (forbidden-path PRs = master-dd manual merge; he merges promptly, often
  `--admin` when a fast-moving main keeps a green PR BEHIND).
- Biome canon authority = `data/core/biomes.yaml` + `scripts/check-canon-consistency.cjs`
  (NOT the pack species dirs). jobs_bias must be one of the 7 jobs.yaml jobs. Every
  species trait ref needs a glossary entry (test-enforced).
- Worktree `.claude/worktrees/derived-artifact-reproducibility`, branch off origin/main
  per slice. ADR-0011 trailers (`Coding-Agent` + `Trace-Id`). DON'T run
  `tools/py/update_trace_hashes.py` (reformats 92 files).
