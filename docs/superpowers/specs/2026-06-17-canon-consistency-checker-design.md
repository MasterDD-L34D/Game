---
title: 'Canon-consistency checker (cross-entity semantic gate, beyond schema)'
doc_status: draft
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-06-17'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Canon-consistency checker

> Brainstormed 2026-06-17 (gap-audit G3, cross-repo AI-gamedev-standards report). Adds a
> **semantic cross-entity** consistency layer on top of the existing shape-only schema
> validation. `validate-dataset.cjs` (AJV) and the current guard tests cover _shape_ and a
> few foreign-key classes (trait_refs -> glossary, TR-code remap, base-53 invariant); they do
> **not** cover biome/job referential integrity, trait synergy/conflict closure, promotion
> ladder monotonicity, or i18n coverage. This spec defines a focused checker that closes
> those, adoptable on pre-existing debt via a **baseline allowlist** (gate = "no new
> violations"). Input to `writing-plans`. TDD, owner-gated merge, single PR.

## 1. Problem / current state (verified on origin/main `70ddf163`)

Canon is a data product (75 species, ~800 trait rows, 7+ jobs, ~40 biomes, 5-tier promotion
ladder). Cross-entity references are foreign-key-like and can dangle or mismatch, especially
after the 53->75 canon unify + 50 TR-code remap (2026-05-31). Current validation:

- **`scripts/validate-dataset.cjs`** — AJV 2020-12, shape-only (types, required, patterns,
  `$ref`). No cross-entity/foreign-key/range/monotonicity checks. CI: `schema-validate.yml`,
  **non-blocking**.
- **Existing semantic guards (CI-blocking via `test:api` / ci-gate)**:
  - `tests/scripts/speciesTraitReferences.test.js` — pack-YAML trait slugs ∈ glossary.
  - `tests/api/envelope-b-data-integrity.test.js` — 75 count, base-53 invariant, catalog
    `trait_refs` -> glossary, no un-remapped TR-#### codes.
- **Unguarded semantic gaps** (this spec's target subset, per gap-audit):
  1. biome refs: species `biomes[]` / catalog `biome_affinity` -> biomes.yaml (no existence check)
  2. job-bias enum: species `jobs_bias[]` / `job_bias_map` -> jobs.yaml roles (no enum check)
  3. trait synergy/conflict closure: `active_effects.yaml` `sinergie[]`/`conflitti[]` -> glossary
     (inverse of trait_refs; unguarded), conflict not self-referential
  4. promotion ladder monotonicity: `promotions.yaml` `kills_min` strictly increasing
  5. i18n coverage: every referenced trait has `label_it` + `label_en` in glossary

**Known pre-existing debt** (from audit, must not block adoption): ~106 flavor-only traits
without mechanics, 4 orphan-mechanic traits without glossary entry; possible biome/job
mismatches from the 53->75 promote. The gate must enforce **no new** violations while
recording the known set.

## 2. Goal / scope

Close the 5 gaps above with a **rule-registry** checker, exposed both as a dev CLI and a
CI-blocking test, adoptable immediately on existing debt via a baseline allowlist.

**In scope**: the 5 rules; baseline allowlist; all-error severity; "no new violations" gate;
per-rule unit tests + end-to-end wrapper on real dataset; CLI report.

**Out of scope (YAGNI, deferred)**: role_trofico foodweb constraints (already partly covered
by `validate_ecosystem_foodweb.py`, high domain-semantics error-risk), lifecycle YAML content
validation, trait `biome_tags` vs biome affinity. These can become new rules later (the
registry makes that additive). Auto-fix is out of scope (checker reports; fixes are manual).

## 3. Architecture

Rule-registry pattern (design-for-isolation: each rule independently understandable + testable).

- **`scripts/check-canon-consistency.cjs`** — pure module.
  - `loadCanonIndex({datasetRoot})` -> in-memory index (parses species_catalog.json,
    pack species YAML, data/traits/index.json, glossary.json, active_effects.yaml, jobs.yaml,
    biomes.yaml, promotions.yaml ONCE; builds lookup sets: `biomeIds`, `jobRoles`,
    `traitSlugs`, etc.). Pure read; no mutation.
  - `RULES` — array of `{ id, description, severity: 'error', run(index) -> Violation[] }`.
    Five entries (sec 4). Adding/removing a rule = editing this array.
  - `checkCanonConsistency({datasetRoot, baselinePath})` -> `{ violations, newViolations,
baselinedViolations, summary }`. Runs all rules, partitions each violation against the
    baseline by stable key.
  - CLI entry (guarded `import.meta`/`require.main` per L-038 — verify OUTPUT not just exit):
    prints report grouped by rule (error/warn counts, cited entity+ref), exits 1 iff
    `newViolations` non-empty.
- **`data/core/canon-consistency-baseline.json`** — allowlist of accepted known violations.
  Array of `{ rule, entity, ref }` (the stable key). Generated once at adoption
  (`--write-baseline`), then shrunk manually as debt is closed (remove entry -> that case
  becomes enforced).
- **`tests/api/canon-consistency.test.js`** — thin wrapper: imports `checkCanonConsistency`
  on the real dataset + baseline, asserts `newViolations.length === 0`. CI-blocking via the
  existing `test:api` -> ci-gate path.

### Violation shape

```
{ rule: string, severity: 'error', entity: string, ref: string|null, message: string }
```

Stable baseline key = `${rule}::${entity}::${ref}`. Stable across runs (no line numbers /
timestamps), so baseline diffs are meaningful.

## 4. The 5 rules

| id                           | inputs                                                         | violation when                                                              | severity                 |
| ---------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ |
| `biome-refs`                 | species `biomes[]`, catalog `biome_affinity`; biomes.yaml ids  | a referenced biome id ∉ biomes.yaml                                         | error                    |
| `job-bias-enum`              | species `jobs_bias[]` / `job_bias_map`; jobs.yaml role tags    | a job/role ref ∉ jobs.yaml enum                                             | error                    |
| `synergy-conflict-closure`   | active_effects.yaml `sinergie[]`/`conflitti[]`; glossary slugs | a synergy/conflict slug ∉ glossary, OR a trait lists itself as own conflict | error                    |
| `promotion-ladder-monotonic` | promotions.yaml tiers `kills_min`                              | sequence base<veteran<captain<elite<master not strictly increasing          | error                    |
| `i18n-coverage`              | every referenced trait slug; glossary `label_it`/`label_en`    | a referenced trait missing `label_it` or `label_en`                         | error (debt -> baseline) |

All `error`. The pre-existing i18n / closure debt is absorbed by the baseline at adoption, so
"all-error" does not break CI; only _new_ breakage of any rule blocks a PR.

Each rule is a pure `(index) -> Violation[]`; no I/O, no cross-rule state. A rule that finds
its inputs absent (e.g. an optional field) returns `[]` (missing-optional is not a violation;
only dangling-present is).

## 5. Enforcement model (baseline, gate = "no new")

- Adoption: run `--write-baseline` once -> records all current violations into
  `canon-consistency-baseline.json` (committed). Gate goes green immediately.
- Steady state: the test asserts `newViolations === 0` (violations not in baseline). A PR that
  introduces a dangling biome/job ref, breaks the ladder, or adds an unglossed trait -> red.
- Debt paydown: closing a real issue + removing its baseline entry makes that case enforced
  going forward. Baseline shrinks monotonically toward empty (end-state = strict zero, reached
  incrementally without ever blocking adoption).
- Guard against silent growth: a `--check-baseline-stale` mode flags baseline entries that no
  longer reproduce (the underlying data was fixed but the entry was left) so the baseline can
  be pruned. Optional, report-only.

## 6. Testing strategy (TDD)

- **Per-rule unit tests** (`tests/scripts/canon-consistency/<rule>.test.js`): feed a small
  in-memory index fixture (valid + each violating shape) -> assert exact `Violation[]`. Each
  rule provable in isolation.
- **Baseline partition test**: violations split correctly into new vs baselined for a known
  fixture + baseline.
- **End-to-end wrapper** (`tests/api/canon-consistency.test.js`): real dataset + committed
  baseline -> `newViolations === 0`. This is the CI gate.
- **Negative control** (per L-041): a deliberately-broken fixture MUST produce a non-empty
  `newViolations` (proves the gate can fail; no vacuous false-PASS).
- QG Step-1 evidence: CLI run output captured (not just exit code, L-038) in the PR.

## 7. CI integration

- The wrapper runs under the existing `test:api` suite -> already a required check via the
  ci-gate aggregator (ADR-0030 / branch protection). No new workflow needed; no path-filter
  footgun (L-039) since it rides the existing required job.
- CLI also runnable standalone for fast local feedback:
  `node scripts/check-canon-consistency.cjs [--write-baseline] [--check-baseline-stale]`.

## 8. Risks / open questions

- **Field-name discovery**: exact field names for biome_affinity / job_bias_map / sinergie
  must be confirmed against live data during implementation (the index loader is the single
  place that encodes them; unit-fixture them). Mitigation: implementation step 1 = dump real
  field names, not assume.
- **biomes.yaml location**: `packs/evo_tactics_pack/data/biomes.yaml` (pack) vs any
  data/core biome list — confirm the authoritative id set before writing `biome-refs`.
- **Bidirectional biome check** (species appears in biome spawn) is deferred to a future
  `warn` rule; v1 does existence-only to avoid false-positives on intentional asymmetry.
- **SDMG note**: this is a self-designed validation method -> per governance, the rule set +
  severity get an external falsification pass (harsh-reviewer on the PR) before the gate is
  flipped from baseline-adopted to debt-closed.

## 9. Delivery

Single PR on `feat/canon-consistency-checker` (this branch). TDD order: index loader + 1 rule

- its unit test green, then remaining rules, then baseline + wrapper, then `--write-baseline`
  adoption commit. Owner-gated merge (Eduardo). Spec input to `writing-plans`.
