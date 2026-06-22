---
title: 'Derived-canon salvage roadmap -- everything through the gates (traits + 14 retired creatures)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [roadmap, derived, trait, species, salvage, canon, reproducibility, etl]
---

# Derived-canon salvage roadmap

> Program plan. Phase 0 is detailed + executable; later phases are scoped with
> their gates and will get their own bite-sized plans when reached.

**Goal:** No silent drops. Every trait + feature earns canon status by passing
the established gates; the 14 retired creatures are adapted, renamed (IP-safe),
and run through species canonization -- on a pipeline that is first made
reproducible.

**Master-dd decisions (2026-06-22):**

1. **Re-baseline at END** -- do the pipeline CODE fixes now; the single data
   re-baseline (commit fresh catalog + affinity) happens once at the end, after
   traits + creatures are in. No double re-baseline.
2. **14 creatures: I draft, you ratify** -- per creature I propose an IP-safe
   canon name + lore (lore-gen DRAFT) + biome/stats heuristic from its salvaged
   trait-kit; you approve/correct per creature; then I canonize.
3. **Trait scope = re-sync + audit gate + rename-style batch v8.**

**Sequencing:** Phase 0 (foundation, no design) -> Phase 1 (audit) -> Phase 2
(rename-style, your name-ratify) -> Phase 3 (creatures, your per-creature
ratify) -> Phase 4 (single re-baseline). Each phase = its own PR(s).

**Prereq context:** [`docs/guide/derived-artifacts-reproducibility.md`](../../guide/derived-artifacts-reproducibility.md)
(root cause) + guard `tools/py/check_derived_reproducible.py`. Foundation PR: #2971.

## Status + corrected sequencing (2026-06-22)

DONE in PR #2971 (foundation, green, awaiting master-dd merge): Phase 0 pipeline
fixes + guard + doc + Phase 1 audit + GAP1 triage.

**Corrected sequencing (verify-first).** Authoring a new trait/creature is
CI-coupled to derived-sync: the coverage validator requires the per-trait id in
`index.json.traits` (the aggregate of all per-trait files) AND the evo-pack mirror
must be re-synced (`sync:evo-pack`). A naive source-add (GAP1 batch 1) failed CI on
both and was reverted. There is no single `add-trait` tool today -- that gap is the
trait-side reproducibility hazard.

So the order is NOT "author, then re-baseline at the end". It is:

1. Phase 0 -- pipeline reproducibility (DONE, #2971).
2. **Phase 1.5 -- `add_trait` sync helper (NEW, the unblock).** One deterministic
   tool that, given a trait id, writes the per-trait DB file + the
   `index.json.traits` entry + updates `traits_aggregate` + runs `sync:evo-pack`,
   so a trait cleanly "passes the iter" in one atomic, CI-green step. Build TDD.
3. GAP1 authoring (37: 33 + 4 interoception-also-need-glossary) THROUGH the helper,
   batch per category. Decisions taken: triage-first (16 drop / 37 author); batch
   per category.
4. Phase 3 creatures THROUGH the helper + species canonization (Phase 0.3 promote).
5. Affinity/catalog re-baseline (species_affinity 287->54 + catalog refresh) =
   separate end-step, still owner-gated.

---

## Phase 0 -- Pipeline reproducibility (CODE only, no re-baseline) [MINE]

Make a no-op regen reproduce committed output (modulo provenance), so later
phases canonize onto a trustworthy base. TDD; tools only (no forbidden paths;
no data commit).

### Task 0.1 -- Bridge determinism (`tools/py/build_species_trait_bridge.py`)

- LF newlines (Windows `write_text` emits CRLF; committed is LF) -> write with
  `newline="\n"` / `open(..., newline="")`.
- `schema_version` aware: preserve/emit the top-level wrapper key that `#2885`
  added to `species_affinity.json` (read existing value, default if absent).
- Match the committed top-level key ordering of `index.json` + `species_affinity.json`
  (inspect first; the current `sort_keys=True` may reorder vs committed).
- Guard `--only trait-bridge` newline/schema_version findings clear; content
  delta (287->54 stale) stays flagged (resolved at Phase 4 re-baseline).

### Task 0.2 -- ETL dry-testability (`tools/etl/`)

- Add `--catalog` + `--out` to `promote_gameplay_to_canon.py` (currently
  hardcoded `CATALOG_PATH`, no dry-test). Verify `apply_interoception_traits.py`
  accepts `--catalog`. Default behaviour unchanged when flags omitted.

### Task 0.3 -- Idempotency: kill the lifecycle-stub downgrade (`promote` + integrity test)

- Today: `merge` stubs every `*_lifecycle.yaml` species; `promote` SKIPS
  existing ids -> a species that gained a lifecycle YAML downgrades from rich
  `gameplay-promote` to bare `game-canonical-stub` (16 species).
- Fix: `promote` UPGRADES an existing bare stub in place when a gameplay YAML
  exists for it (preserve `lifecycle_yaml` link; set source `gameplay-promote`),
  instead of skipping. Real species already richer than a stub are left alone.
- Update `tests/api/envelope-b-data-integrity.test.js` source-count expectations
  to the post-fix partition (TDD: write the new expectation first, watch it
  fail, then fix `promote`).

### Task 0.4 -- Refresh the guard

- After 0.1-0.3, the guard should no longer report the newline/schema_version or
  downgrade items as drift; the remaining stale-content delta is the Phase-4
  re-baseline target. Update guard messages/assertions accordingly.

Exit criteria: `check_derived_reproducible.py` reports ONLY the expected
re-baseline content delta; existing suites green (`node --test tests/api/...`,
governance `--strict`).

---

## Phase 1 -- Trait audit (gate-conformance) [MINE audit; fixes may need your call]

- Audit EVERY trait in `data/traits/<cat>/*.json` + `data/core/traits/active_effects.yaml`
  - `data/core/traits/glossary.json` against the ADR-2026-05-29 schema gate
    (`tools/lint/trait_schema_gate.py`) and the multi-registry orphan check.
- Output: `docs/reports/2026-06-22-trait-gate-audit.md` -- per-trait PASS/FAIL +
  the 6 traits missing from affinity (`legame_di_branco`, `marchio_predatorio`,
  `ferocia`, `aculei_velenosi`, `martello_osseo`, `pelle_elastomera`).
- Mechanical fixes I apply; semantic/design fixes are flagged for you.

## Phase 2 -- Trait rename-style batch v8 [GATE: you ratify the name list]

- Run `tools/py/normalize_trait_style.py` + `tools/py/styleguide_compliance_report.py`
  -> propose renames (anglicisms/eponyms -> IT canon): `antenne_tesla`,
  `antenne_dustsense`, `antenne_wideband`, `biochip_memoria -> corteccia_predatoria`,
  `magnetic_*`/`rift_*` (all-EN), etc.
- You ratify the final names. Then ONE batch PR: rename in per-trait
  `data/traits/<cat>/<trait>.json` + `active_effects.yaml` + `glossary.json` +
  locale, then regenerate (bridge + `sync_trait_lists.js` + snapshots).

## Phase 3 -- 14 retired creatures: adapt + rename + canonize [GATE: per-creature ratify]

Salvaged trait-kits (distinctive traits beyond the universal ciclo_vitale/
metabolismo/respirazione) recovered from the stale affinity. D&D-name placeholders
-> need IP-safe rename + new identity. Per creature I produce a DRAFT (name +
lore via lore-gen + biome/stats heuristic); you ratify; I canonize via the Phase-0
pipeline + HITL gate (`lore_review_status: human_reviewed`).

| Retired id             | Distinctive salvaged kit                                                             | Concept seed                               |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| archon-solare          | aura_scudo_radianza, ali_solari_fotoni, visione_spettrale                            | radiant solar flyer                        |
| balor-fission          | frusta_fiammeggiante, mantello_meteoritico, artigli_sette_vie                        | fire/meteor bruiser (D&D name)             |
| banshee-risonante      | ali_fono_risonanti, voce_spettrale, lamenti_diradanti, intangibilita_parziale        | sonic wraith flyer                         |
| bulette-fase           | armatura_pietra_planare, carapace_fase_variabile, sensori_geomagnetici               | phasing burrower (D&D name)                |
| couatl-aurora          | ali_solari_fotoni, ghiandole_nettare_memetico, sensori_geomagnetici                  | auroral winged serpent (myth/D&D)          |
| golem-runico           | armatura_pietra_planare, matrice_antimagia, nuclei_di_controllo, origine_artificiale | artificial anti-magic construct            |
| magnet-fathom-surveyor | olfatto_risonanza_magnetica, struttura_elastica_amorfa, filamenti_digestivi          | magnetic amorphous surveyor                |
| marilith-vault         | frusta_fiammeggiante, nucleo_ovomotore_rotante, artigli_sette_vie                    | multi-limb rotary striker (D&D name)       |
| orbital-ascendant      | sacche_galleggianti_ascensoriali, occhi_cristallo_modulare, criostasi_adattiva       | high-altitude floater                      |
| otyugh-sentinella      | proboscide_polifaga, filtri_bioattivi, membrane_osmotiche, sensori_chimici           | filth-filter sentinel (D&D name)           |
| psionic-canopy-scout   | mimetismo_cromatico_passivo, sacche_galleggianti, spore_psichiche_silenziate         | psionic canopy glider                      |
| rakshasa-corte         | artigli_psionici, maschera_illusoria, tessuti_adattivi                               | illusionist courtier (myth/D&D name)       |
| resonant-claw-hunter   | artigli_sette_vie (thin -- 1 trait)                                                  | resonant clawed hunter (candidate: museum) |
| treant-portale         | corteccia_memetica, radici_ancora_planare, reti_capillari_radici, pigmenti_aurorali  | rooted planar anchor (D&D-adjacent name)   |

Note: `random` / `pathfinder` appear in some kits = parse artifacts, not real
traits -- drop on adaptation.

## Phase 4 -- Single re-baseline [GATE: your OK -- given for end-of-program]

- Run the Phase-0-fixed pipeline once (bridge 2-step + ETL 5-stage with the
  faithful in-repo source args), commit fresh `species_catalog.json`,
  `index.json`, `species_affinity.json`. Provenance flips `/tmp` -> in-repo.
- Guard goes GREEN (no-op regen reproduces committed).
- Verify backend consumers (`traitRepository.js`, `catalog.js`, mission-console,
  trait-editor, QA scripts) tolerate the refreshed data.

---

## Gate table (who decides)

| Item                                          | Owner                                |
| --------------------------------------------- | ------------------------------------ |
| Pipeline determinism/idempotency code         | me                                   |
| Trait audit + mechanical fixes                | me                                   |
| Trait rename names (v8)                       | master-dd                            |
| 14 creatures identity (name/lore/biome/stats) | master-dd (I draft)                  |
| Final re-baseline (data commit)               | master-dd (OK given, end-of-program) |
| CI wiring of the guard (`.github/workflows/`) | master-dd (forbidden path)           |
