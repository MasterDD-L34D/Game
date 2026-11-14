# OD-024 D4 — interoception_traits populate pipeline — Continuation Plan

> **For agentic workers:** recon-first plan. The producer read-path (`perSpeciesOverride`) already exists + ships; this plan builds ONLY the pipeline that PROPAGATES the `interoception_traits` field from source species into the generated `species_catalog.json`. master-dd verdict 2026-06-22: **D4 = solo pipeline, ZERO override autorati** (infra-ready; nessuna specie usa il campo ancora).

**Goal:** make the generation pipeline carry an optional `interoception_traits: [<gateway ids>]` field from a source species record through to `data/core/species/species_catalog.json`, so the already-shipped producer override (`apps/backend/services/sentience/sentienceInteroceptionGrant.js` → `perSpeciesOverride`) becomes usable. No species authors the field in this work (band-neutral, infra-only).

**Non-goals:** authoring `interoception_traits` on any species (master-dd content, later); changing the tier map (D2, ratified); the flag flip (D7, owner); engine #3 (parked).

**Hard constraints:**

- **Canon: MAI hand-edit `species_catalog.json`** (è generato). Il campo deve fluire via pipeline; poi si rigenera il catalog.
- ADR-0011 commit trailer (`Coding-Agent: claude-opus-4-8` + `Trace-Id:` uuidv7, NO `Co-Authored-By`); lowercase subject ≤72.
- Python launcher `C:/Users/edusc/AppData/Local/Programs/Python/Python312/python.exe`; Node tests via `node --test`; full `node scripts/run-test-api.cjs` for regression.
- Worktree off `origin/main` + `npm ci` (pinned prettier).
- **`services/generation/` è forbidden-path** (review-gated). Il catalog-gen vero è in `tools/etl/` + `tools/py/` + `scripts/` (NON services/generation) — verificare, ma se un tocco cade in services/generation → segnalare + master-dd manual merge.

---

## Phase 0 — RECON (load-bearing; the ETL flow is the unknown)

The catalog is built by a MULTI-STAGE ETL (verify-first 2026-06-22 identified these writers):
`tools/etl/merge_pack_v2_species.py` · `tools/etl/enrich_species_heuristic.py` · `tools/etl/promote_gameplay_to_canon.py` · `scripts/update_evo_pack_catalog.js` (+ `tools/py/lib/species_loader.py`).

- [ ] **R1 — find the catalog assembler.** Determine WHICH stage emits the final `catalog[]` entries written to `species_catalog.json` (grep the writers for `json.dump`/`writeFileSync` targeting that file; trace which dict/object becomes a catalog entry). Identify the field allowlist/shape there.
- [ ] **R2 — find a precedent field.** `trait_refs` and `role_tags` already flow source→catalog. Trace HOW one of them is carried (which stage reads it from source, which key, whether there's an explicit field list or a passthrough). `interoception_traits` mirrors that path EXACTLY.
- [ ] **R3 — find the source shape.** Where does a source species record live (e.g. `packs/evo_tactics_pack/data/species/**` master YAML, or the pack v2 input) and what key would hold `interoception_traits`? Confirm the gateway whitelist ids (`propriocezione`, `equilibrio_vestibolare`, `nocicezione`, `termocezione`).
- [ ] **R4 — regeneration command.** Find the exact command that regenerates `species_catalog.json` from source (likely `npm run sync:evo-pack` / `npm run evo:import` / a `tools/py` CLI). Confirm it runs clean on current main (baseline: no diff when run as-is).

Output of Phase 0: a 5-line note naming the stage to edit, the precedent field, the source key, and the regen command. If the assembler turns out to be in `services/generation/` (forbidden-path), STOP and surface to master-dd before editing.

## Phase 1 — passthrough (TDD)

- [ ] **1.1** Write a failing test: a synthetic source record carrying `interoception_traits: ['propriocezione']` → after the assembler stage (call it directly with a fixture, like the other ETL tests in `tests/` / `tools/py/test_*.py`) → the produced catalog entry contains `interoception_traits: ['propriocezione']`; a record WITHOUT the field → entry has no `interoception_traits` key (no empty-array injection → keeps catalog diff-clean). Mirror the existing `trait_refs` test if present.
- [ ] **1.2** Run → fail (field dropped).
- [ ] **1.3** Add the passthrough in the stage from R1, mirroring the R2 precedent (copy the field from source to the catalog entry when present; omit when absent). Filter to the gateway whitelist (defensive — a bad id never reaches the catalog), reusing/ mirroring `INTEROCEPTION_TRAIT_IDS` from the producer module if cheap, else a local const documented as the canonical 4.
- [ ] **1.4** Run → pass.
- [ ] **1.5** Commit (ADR-0011).

## Phase 2 — regenerate + verify diff-clean

- [ ] **2.1** Run the R4 regen command. Expectation: **`species_catalog.json` diff is EMPTY** (no source authors `interoception_traits` yet → the passthrough is a no-op on current data). If the regen produces an unrelated diff, that's a pre-existing drift — do NOT bundle it; note it and regenerate only the intended change (or abort + surface).
- [ ] **2.2** Confirm the producer read-path now works end-to-end: a unit test that loads the (unchanged) catalog + asserts `perSpeciesOverride` returns null for all current species (none carry the field) — proving the infra is wired but inert. Optionally: a fixture catalog with the field → override returns it.
- [ ] **2.3** Commit (regen, if any) — likely zero-diff so no commit; document in the PR that the passthrough is verified no-op on current data.

## Phase 3 — verify + PR

- [ ] **3.1** Full regression: `node scripts/run-test-api.cjs` green (flag OFF default; `synergyCombo` flake = known #2938-fixed, re-run once only if it alone fails). Relevant ETL/python tests: `PYTHONPATH=tools/py python -m pytest` the touched test file(s).
- [ ] **3.2** `npx prettier --check` the touched files (+ `--write` then re-run if needed). If a `.py` stage changed, no prettier; if `.js`/`scripts` changed, prettier applies.
- [ ] **3.3** PR off `origin/main`. Band-neutral (no behavior change, no catalog diff). Not auto-merge-L3 if test >50 LOC outside `apps/backend` → master-dd manual merge. Compensating adversarial review (Codex has been rate-limited) before merge.

## Done-when

- Pipeline propagates `interoception_traits` source→catalog (proven by the passthrough test).
- `species_catalog.json` regenerates **diff-clean** on current data (band-neutral infra).
- Producer `perSpeciesOverride` read-path proven usable (override applies when a catalog entry carries the field).
- Full regression green; PR open + reviewed.

## After D4 (program residue, all master-dd/owner-gated)

- **D7 incremental flip** — owner: N=40 calibration per piece, then `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` / `STAMINA_FATIGUE_ENABLED` ON in `~/.config/api-keys/keys.env` + restart. The D2 map values are RATIFIED (#2947); N=40 gates the flip, not the values.
- **D6 engine #3 (encumbrance / equilibrio_vestibolare)** — PARKED: needs an absent inventory/weight system (own design-pass).

Refs: scope+verdetti `docs/planning/2026-06-21-sentience-traits-wiring-scope.md` sez.7-8; BACKLOG `TKT-SENT-*`; producer `apps/backend/services/sentience/sentienceInteroceptionGrant.js`; ratify #2947; D3 #2945; engine#2 #2937; engine#1 #2936; producer #2932.
