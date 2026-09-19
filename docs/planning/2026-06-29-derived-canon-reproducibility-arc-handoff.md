---
title: 'Derived-canon reproducibility arc -- session handoff (2026-06-28/29)'
date: 2026-06-29
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-29'
source_of_truth: false
review_cycle_days: 90
tags: [salvage, derived, reproducibility, guard, ci, handoff, session-close]
---

# Derived-canon reproducibility arc -- session handoff

Closes the derived-artifact reproducibility program end-to-end. All three families
of committed DERIVED artifacts now reproduce from in-repo sources, are covered by a
guard, and the guard is wired into CI (advisory). Memory: `project_derived_artifact_reproducibility.md`
(cont-17..26).

## What landed (merged to main)

| PR | SHA | What |
| --- | --- | --- |
| #3047 | `8056eb06` | Re-populate 38 trait-keepers -> coverage `rules_missing` 131->0 (in-biome honest). Canon/validator split: canon-resolvable biome_class -> `biomes:[X]`, non-resolvable -> `environment_affinity.biome_class`. Family-1 bridge reproducible. |
| #3055 | `7d6f34f3` | Make `generate_derived_analysis.py` host-deterministic (`sys.executable` spawn, repo-relative posix manifest stamps, drop per-commit pin, strip `generated_at`, LF-hash) + refresh the bundle. |
| #3056 | `3e3fd3d8` | Re-apply the 3 Codex P2 fixes the #3055 squash DROPPED (LF-hash, repo-relative report paths, README `_repo_rel` keys). |
| #3057 | `ad4d6321` | Guard 3rd check `derived-analysis` (committed bytes == manifest sha256 + host-independent stamps) + close TKT-DERIVED-ANALYSIS-REGEN. |
| #3059 | `03c9bca0` | CI-wire the guard into `dataset-checks` (advisory `--warn-only`, pristine-before-regen) + route guard/generators into the `data` paths-filter. |
| #3060 | `144a35ab` | Register 3 expansion biome aliases in core + pack `biomes.yaml` -> 3/5 keepers env_affinity -> honest `biomes:[X]` (canon gate now exercises the refs). |
| #3062 | `0d1ba898` | Guard `--deep` source-drift detection (delete-first regen + orphan/changed/net-new; float-fragile skydock excluded). |
| #3051 | `febf484d` | BACKLOG: file the 4 residual tickets. |

(Earlier this program-session: #3040/#3041 docs, #3044 GAP2 block-2 build, #3045 catalog re-baseline canonize-13.)

**OPEN**: #3063 GAP2 block-3 proposal (6 crisp inert traits) -- awaiting master-dd
RATIFY, then build via the block-2 recipe.

## End state

3 derived families reproduce + are guarded + CI-advisory-wired:
- **trait-bridge** (`species_affinity.json` + index overlay) -- #3047.
- **species-catalog** (`species_catalog.json`) -- #3045 (re-baselined earlier).
- **derived-analysis bundle** (`data/derived/analysis/*`) -- #3055/#3056.

Guard `tools/py/check_derived_reproducible.py`: `trait-bridge` / `species-catalog`
/ `derived-analysis` (cheap hash + host-stamp) + `--deep` (regen source-drift).
"regenerate-or-die, never hand-edit derived" is now SAFE for the guarded families.

## Key findings / lessons (durable)

- **Squash can DROP a late-pushed commit** (the #3055 squash merged only the core
  commit, not my Codex-fix push). ALWAYS verify the merged HEAD contains the fix:
  `git merge-base --is-ancestor <fix> origin/main` + grep the fix symbols.
- **`git status` under `.gitattributes eol=lf` lies**: it CRLF-normalizes the
  working tree for comparison, hiding a generator that writes CRLF. Test the git
  BLOB hash (`sha256(git show :path)` == manifest), not `git status`.
- **`git show <ref>:<path>` mangles on Git-Bash-Windows** (`/`+`:` -> `\`+`;`,
  "ambiguous argument", empty output) -> use `git grep <ref> -- <path>`.
- **Cross-Python-version float non-determinism**: `balance_progression` XP floats
  repr-differ between CPython 3.11/3.12; the committed bundle is 3.12-generated,
  CI is 3.11. `skydock_siege_xp.json` excluded from the `--deep` byte compare.
- **`evo_pack_pipeline.py sync_core` copies `data/core/biomes.yaml` -> the pack
  copy** -> biome aliases MUST live in the core source too (pack-only = erased on
  next sync). (CI `sync:evo-pack` does NOT touch biomes.yaml -- different tool.)
- **`generate_derived_analysis.py` only writes 5 of the 8 manifest artifacts**
  (report + matrix + 3 progression); gap/baseline/env_mapping are sibling
  generators -> the `--deep` delete-first is scoped to `_GENERATOR_OUTPUTS`.
- **Codex (when ACTIVE) is high-signal on path/reproducibility bugs** that
  cavecrew missed (LF-hash, abs paths, README keys, sync_core, deep-orphan).
- **Forbidden-path (.github/workflows) needs EXPLICIT auth** -- a generic
  "procediamo" is not enough; the auto-mode classifier blocks it (correctly).

## Residuals (owner-gated / not reproducibility)

- **#3063 GAP2 block-3** -- ratify the 6 -> build (block-2 recipe).
- **13-lore HITL** (#3038, 32 `_drafts`) -- master-dd prose review then promote.
- **Flip CI-wire to enforcing** -- drop `--warn-only` once the advisory proves quiet.
- **TKT-KEEPER-CONTENT-DEBT** -- ~138/173 env-suggested traits carried only by
  inert keeper stubs; author real species over time.
- **TKT-KEEPER-VALIDATOR-SCOPE** -- extend `run_all_validators` dir-loop when
  keepers become real species.
- **2 orphan biomes** (`laguna_bioreattiva`, `mangrovieto_cinetico`) -- no canonical
  home; kept on `environment_affinity` (give them a canonical biome or accept).
- **Float-stabilize `balance_progression`** -- round XP floats so skydock is
  cross-version reproducible (would let `--deep` cover it).

## Next entry point

Either: (a) master-dd ratifies #3063 -> I build GAP2 block-3; or (b) flip the
CI-wire to enforcing after a quiet period; or (c) pick an owner-gated residual.
The reproducibility arc itself is CLOSED -- no further build needed there.
