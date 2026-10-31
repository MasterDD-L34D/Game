# Daily PR Summary — 2025-11-11

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR                                                     | Titolo                                                                | Autore         | Merged (UTC)         |
| ------------------------------------------------------ | --------------------------------------------------------------------- | -------------- | -------------------- |
| [#638](https://github.com/MasterDD-L34D/Game/pull/638) | Rehome console Playwright suite and clean mockup docs                 | @MasterDD-L34D | 2025-11-11T02:03:34Z |
| [#639](https://github.com/MasterDD-L34D/Game/pull/639) | Log validation sweep warnings in traits tracker                       | @MasterDD-L34D | 2025-11-11T02:14:21Z |
| [#640](https://github.com/MasterDD-L34D/Game/pull/640) | Update inventory checklist for trait searches                         | @MasterDD-L34D | 2025-11-11T02:18:00Z |
| [#641](https://github.com/MasterDD-L34D/Game/pull/641) | docs: sincronizza index e log con report incoming                     | @MasterDD-L34D | 2025-11-11T02:21:33Z |
| [#642](https://github.com/MasterDD-L34D/Game/pull/642) | Add Evo-Tactics trait guide markdown conversions                      | @MasterDD-L34D | 2025-11-11T02:30:49Z |
| [#643](https://github.com/MasterDD-L34D/Game/pull/643) | Normalize Evo schemas and document enum diff                          | @MasterDD-L34D | 2025-11-11T02:41:10Z |
| [#644](https://github.com/MasterDD-L34D/Game/pull/644) | Integrate Evo species dataset validation and reporting                | @MasterDD-L34D | 2025-11-11T02:52:30Z |
| [#645](https://github.com/MasterDD-L34D/Game/pull/645) | Import Evo traits batch and update glossary                           | @MasterDD-L34D | 2025-11-11T13:17:22Z |
| [#646](https://github.com/MasterDD-L34D/Game/pull/646) | Stabilize Evo incoming scripts and expose new automation targets      | @MasterDD-L34D | 2025-11-11T13:27:10Z |
| [#647](https://github.com/MasterDD-L34D/Game/pull/647) | Align ops CI docs and site-audit tooling                              | @MasterDD-L34D | 2025-11-11T13:39:50Z |
| [#648](https://github.com/MasterDD-L34D/Game/pull/648) | Relocate Evo Playwright suite and refresh sitemap assets              | @MasterDD-L34D | 2025-11-11T13:58:30Z |
| [#649](https://github.com/MasterDD-L34D/Game/pull/649) | chore: log evo QA run and sync tracking                               | @MasterDD-L34D | 2025-11-11T14:25:47Z |
| [#650](https://github.com/MasterDD-L34D/Game/pull/650) | feat: add automation for Evo tracker registry                         | @MasterDD-L34D | 2025-11-11T14:37:06Z |
| [#651](https://github.com/MasterDD-L34D/Game/pull/651) | Archive Evo incoming duplicates and document audit                    | @MasterDD-L34D | 2025-11-11T14:47:17Z |
| [#652](https://github.com/MasterDD-L34D/Game/pull/652) | Restore docs lint workflow and QA trackers                            | @MasterDD-L34D | 2025-11-11T17:17:14Z |
| [#653](https://github.com/MasterDD-L34D/Game/pull/653) | Use AJV wrapper for evo validation and refresh QA logs                | @MasterDD-L34D | 2025-11-11T17:23:43Z |
| [#654](https://github.com/MasterDD-L34D/Game/pull/654) | Ensure Playwright Chromium is installed and mock console passes tests | @MasterDD-L34D | 2025-11-11T18:07:53Z |
| [#655](https://github.com/MasterDD-L34D/Game/pull/655) | Archive legacy trait docs and update inventory audit                  | @MasterDD-L34D | 2025-11-11T19:26:30Z |
| [#656](https://github.com/MasterDD-L34D/Game/pull/656) | Close QA follow-ups for DOC-02 and FRN-01                             | @MasterDD-L34D | 2025-11-11T20:09:10Z |
| [#657](https://github.com/MasterDD-L34D/Game/pull/657) | Archive Evo-Tactics legacy duplicates                                 | @MasterDD-L34D | 2025-11-11T20:31:29Z |
| [#658](https://github.com/MasterDD-L34D/Game/pull/658) | Document Evo workflow secret dependencies                             | @MasterDD-L34D | 2025-11-11T20:36:32Z |
| [#659](https://github.com/MasterDD-L34D/Game/pull/659) | Finalize evo staging cleanup                                          | @MasterDD-L34D | 2025-11-11T20:38:40Z |
| [#660](https://github.com/MasterDD-L34D/Game/pull/660) | Add integration propagation review summary                            | @MasterDD-L34D | 2025-11-11T20:50:55Z |
| [#661](https://github.com/MasterDD-L34D/Game/pull/661) | Clarify secret provisioning workflow in propagation review            | @MasterDD-L34D | 2025-11-11T20:53:41Z |
| [#662](https://github.com/MasterDD-L34D/Game/pull/662) | Document provisioning of SITE_BASE_URL secret                         | @MasterDD-L34D | 2025-11-11T21:03:46Z |
| [#663](https://github.com/MasterDD-L34D/Game/pull/663) | Add Evo Tactics trace hash tooling and audit                          | @MasterDD-L34D | 2025-11-11T22:25:46Z |
| [#664](https://github.com/MasterDD-L34D/Game/pull/664) | Ensure Evo Tactics trace hashes propagate canonical digest            | @MasterDD-L34D | 2025-11-11T23:07:46Z |
| [#665](https://github.com/MasterDD-L34D/Game/pull/665) | Ensure biome pools expose metadata                                    | @MasterDD-L34D | 2025-11-11T23:26:24Z |
| [#666](https://github.com/MasterDD-L34D/Game/pull/666) | Extend trace hash updater to ecosystem manifests                      | @MasterDD-L34D | 2025-11-11T23:35:00Z |

## #638 — Rehome console Playwright suite and clean mockup docs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:03:34Z
- Link: https://github.com/MasterDD-L34D/Game/pull/638

> ## Summary
>
> - move the legacy console Playwright specs into `webapp/tests/playwright/console` and register the project in the shared configuration so both suites run from the same tooling
> - point the tools workspace Playwright config to the relocated suite and update fixture docs to reference the new path
> - drop the committed PNG mockup and update the documentation to reference the shared asset bucket instead of storing binaries in-repo
>
> ## Testing
>
> - npm run test --prefix webapp/tests/playwright -- --project=console _(fails: Playwright CLI missing in workspace)_
>
> ---
>
> Codex Task (riferimento interno)

## #639 — Log validation sweep warnings in traits tracker

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:14:21Z
- Link: https://github.com/MasterDD-L34D/Game/pull/639

> ## Summary
>
> - record the latest validate-datasets and validate-ecosystem-pack runs in the traits monitoring log
> - capture the missing bridge-species warnings observed in the cross foodweb validator and flag follow-up
>
> ## Testing
>
> - python3 tools/py/game_cli.py validate-datasets
> - python3 tools/py/game_cli.py validate-ecosystem-pack
>
> ---
>
> Codex Task (riferimento interno)

## #640 — Update inventory checklist for trait searches

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:18:00Z
- Link: https://github.com/MasterDD-L34D/Game/pull/640

> ## Summary
>
> - mark the remaining inventory checklist items as tracked and note the active searches
>
> ## Testing
>
> - not run
>
> ---
>
> Codex Task (riferimento interno)

## #641 — docs: sincronizza index e log con report incoming

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:21:33Z
- Link: https://github.com/MasterDD-L34D/Game/pull/641

> ## Summary
>
> - aggiorna l'indice della documentazione con gli ultimi riferimenti a checklist, report incoming e roadmap
> - registra nel log web lo stato dell'audit incoming per la sezione Idea Intake e le azioni collegate
> - aggiunge al monitoraggio trait il riepilogo della sessione incoming su pacchetti synergy/deduped
>
> ## Testing
>
> - not run (documentazione)
>
> ---
>
> Codex Task (riferimento interno)

## #642 — Add Evo-Tactics trait guide markdown conversions

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:30:49Z
- Link: https://github.com/MasterDD-L34D/Game/pull/642

> ## Summary
>
> - convert the incoming Evo-Tactics DOCX guides into Markdown with frontmatter, anchors, and consistent headings
> - link the new guides from the docs index and update the documentation task tracker and inventory
> - archive the original DOCX sources under `incoming/archive/documents`
>
> ## Testing
>
> - npm run docs:lint _(fails: Missing script "docs:lint")_
>
> ---
>
> Codex Task (riferimento interno)

## #643 — Normalize Evo schemas and document enum diff

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:41:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/643

> ## Summary
>
> - normalize the Evo species and trait JSON schemas from the new templates with enum references
> - add a core enum baseline, an enum diff helper, and log the gameplay review outcome
> - merge species aliases into data/core with a pytest guard and refresh task tracking metadata
>
> ## Testing
>
> - PYTHONPATH=. npm run schema:lint -- --pattern schemas/evo/\*.schema.json
> - pytest tests/test_species_aliases.py
>
> ---
>
> Codex Task (riferimento interno)

## #644 — Integrate Evo species dataset validation and reporting

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T02:52:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/644

> ## Summary
>
> - move the Evo species and ecotype payloads into `data/external/evo/species` and refresh the aggregated catalog
> - add validation tooling and an updated summary script to produce Markdown reports and schema logs
> - build an ecotype-to-ecosystem mapping with mismatch notes and align SPEC-01..03 tracking files
>
> ## Testing
>
> - `./scripts/validate.sh --dataset evo-species --schema schemas/evo/species.schema.json`
> - `python incoming/lavoro_da_classificare/species_summary_script.py --input data/external/evo/species/ --output reports/evo/species_summary.md`
>
> ---
>
> Codex Task (riferimento interno)

## #645 — Import Evo traits batch and update glossary

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T13:17:22Z
- Link: https://github.com/MasterDD-L34D/Game/pull/645

> ## Summary
>
> - copy Evo trait JSON into data/external/evo/traits and capture the review output
> - extend trait_review.py with an incoming review mode that produces action=add rows for the imported traits
> - merge 50 Evo traits into data/core/traits/glossary.json, document the outcome, and update task tracking files
>
> ## Testing
>
> - python incoming/lavoro_da_classificare/scripts/trait_review.py --input data/external/evo/traits/ --baseline data/core/traits/glossary.json --out reports/evo/traits_anomalies.csv
>
> ---
>
> Codex Task (riferimento interno)

## #646 — Stabilize Evo incoming scripts and expose new automation targets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T13:27:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/646

> ## Summary
>
> - move the stabilized Evo helper scripts into `incoming/scripts`, fix their headers/paths, and drop the old copies from `incoming/lavoro_da_classificare`
> - expose `evo-validate`, `evo-backlog`, and `traits-review` Makefile targets with the required environment wiring
> - extend the Evo tooling documentation, backlog/tasks registry, and inventory to reflect the promoted scripts
>
> ## Testing
>
> - python -m py_compile incoming/scripts/setup_backlog.py incoming/scripts/species_summary_script.py incoming/scripts/trait_review.py incoming/scripts/update_tracker_registry.py
>
> ---
>
> Codex Task (riferimento interno)

## #647 — Align ops CI docs and site-audit tooling

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T13:39:50Z
- Link: https://github.com/MasterDD-L34D/Game/pull/647

> ## Summary
>
> - refresh the workflow gap analysis to capture divergences in gh-pages, lighthouse, and the missing security workflow
> - bootstrap the site-audit suite with a requests-based crawler, dependency pinning, and a reusable run.sh helper with docs updates
> - move the Lighthouse CI config under config/lighthouse and point npm scripts and docs at the new location while updating ops task trackers
>
> ## Testing
>
> - bash ops/site-audit/run.sh
>
> ---
>
> Codex Task (riferimento interno)

## #648 — Relocate Evo Playwright suite and refresh sitemap assets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T13:58:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/648

> ## Summary
>
> - move the Evo Playwright project to `tests/playwright/evo`, adjust the shared config to point to the new location, and expose a repository-level `test:e2e` script
> - refresh `public/sitemap.xml` and add `public/robots.txt`, moving the link checker into `tools/` and storing its validation output under `reports/evo/`
> - document the Evo mockup in `docs/wireframes/evo/`, update task tracking files, and register the new assets inside the inventory
>
> ## Testing
>
> - npm run test:e2e -- --project=evo _(fails: missing Chromium system dependencies in the container)_
> - python tools/sitemap_link_checker.py public/sitemap.xml > reports/evo/sitemap_validation.csv
>
> ---
>
> Codex Task (riferimento interno)

## #649 — chore: log evo QA run and sync tracking

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T14:25:47Z
- Link: https://github.com/MasterDD-L34D/Game/pull/649

> ## Summary
>
> - archive the latest Evo validation, docs, schema, and e2e outputs under reports/evo/qa
> - compare QA results with existing species and trait artifacts and update the task board plus inventory with the findings
> - mark all integration batches as completed with timestamp/commit metadata
>
> ## Testing
>
> - `make evo-validate` _(fails: Makefile recipe lacks tabs; validation rerun via wrapper)_
> - `AJV=/tmp/ajv-wrapper.sh bash incoming/scripts/validate.sh` _(passes)_
> - `npm run docs:lint` _(fails: script missing)_
> - `PYTHONPATH=. npm run schema:lint -- --pattern schemas/evo/*.schema.json`
> - `npm run test:e2e -- --project=evo` _(fails: Playwright browsers not installed)_

## #650 — feat: add automation for Evo tracker registry

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T14:37:06Z
- Link: https://github.com/MasterDD-L34D/Game/pull/650

> ## Summary
>
> - add a Python utility that reads integration_batches.yml to update tasks.yml and TASKS_BREAKDOWN.md
> - expose the new helper through make update-tracker, documentation, and the incoming inventory
> - add a reusable GitHub Action that runs the tracker check in CI and document it in the workflow diff
>
> ## Testing
>
> - python -m tools.automation.update_tracker_registry --check
>
> ---
>
> Codex Task (riferimento interno)

## #651 — Archive Evo incoming duplicates and document audit

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T14:47:17Z
- Link: https://github.com/MasterDD-L34D/Game/pull/651

> ## Summary
>
> - archive the Evo duplicate assets (species JSON, traits JSON, wireframes markdown, legacy share package) into `incoming/archive/2025-11-15_evo_cleanup/`
> - mark the affected inventory entries as `archiviato` with destination and verification references
> - add the cleanup report in `reports/evo/inventory_audit.md`, link it from `docs/README.md`, and register the archive batch in `incoming/archive/INDEX.md`
>
> ## Testing
>
> - not run
>
> ---
>
> Codex Task (riferimento interno)

## #652 — Restore docs lint workflow and QA trackers

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T17:17:14Z
- Link: https://github.com/MasterDD-L34D/Game/pull/652

> ## Summary
>
> - add a docs:lint npm script that runs the existing internal link checker and clean up the EvoGene deck demo to drop a broken stylesheet include
> - normalise Makefile recipe indentation so make update-tracker works reliably for Evo automation targets
> - refresh the docs QA log and tracker metadata after the successful lint run
>
> ## Testing
>
> - npm run docs:lint > reports/evo/qa/docs.log 2>&1
> - make update-tracker
>
> ---
>
> Codex Task (riferimento interno)

## #653 — Use AJV wrapper for evo validation and refresh QA logs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T17:23:43Z
- Link: https://github.com/MasterDD-L34D/Game/pull/653

> ## Summary
>
> - add a repository-local ajv-cli wrapper and set `make evo-validate` to use it by default
> - rerun evo dataset validation and update the QA log, tracker notes, and inventory metadata
>
> ## Testing
>
> - make evo-validate
> - make update-tracker
>
> ---
>
> Codex Task (riferimento interno)

## #654 — Ensure Playwright Chromium is installed and mock console passes tests

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T18:07:53Z
- Link: https://github.com/MasterDD-L34D/Game/pull/654

> ## Descrizione
>
> - aggiunge al workflow Playwright e alla documentazione locale lo step `npx playwright install --with-deps chromium`
> - sostituisce la configurazione Playwright per avviare il server mock `serve-mission-console.mjs` e aggiorna la UI di test sotto `tests/playwright/mock-app/`
> - registra il log verde dell'esecuzione `npm run test:e2e -- --project=evo` e aggiorna tracker/inventario per FRN-01
>
> ## Checklist guida stile & QA
>
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati
> - [ ] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact)
> - [ ] Badge "Guida stile" dell'editor in stato "In linea" (suggerimenti applicabili gestiti)

## #655 — Archive legacy trait docs and update inventory audit

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T19:26:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/655

> ## Summary
>
> - archive the remaining legacy trait and security reports from incoming/lavoro_da_classificare
> - mark the canonical docs/analysis and docs/security artefacts as validated in the inventory
> - validate the QA docs/frontend logs and the species ecotype mapping, documenting the audit updates
>
> ## Testing
>
> - npm run docs:lint
>
> ---
>
> Codex Task (riferimento interno)

## #656 — Close QA follow-ups for DOC-02 and FRN-01

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T20:09:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/656

> ## Summary
>
> - update DOC-02 and FRN-01 breakdown notes to reference successful QA logs and mark follow-ups closed
> - align tasks.yml and integration_batches.yml by recording the same QA log references with new evidence fields
>
> ## Testing
>
> - make update-tracker
>
> ---
>
> Codex Task (riferimento interno)

## #657 — Archive Evo-Tactics legacy duplicates

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T20:31:29Z
- Link: https://github.com/MasterDD-L34D/Game/pull/657

> ## Summary
>
> - archive the remaining Evo-Tactics backlog, catalog, docs, ops, templates, tests, and workflows under `incoming/archive/2025-12-19_inventory_cleanup/` and update the inventory accordingly
> - consolidate script and ecotype entries by pointing to the canonical `incoming/scripts/` automations and `data/external/evo/species/*.json` datasets, removing all `da revisionare` states
> - document the cleanup in `reports/evo/inventory_audit.md` and surface the completion status in `docs/README.md`
>
> ## Testing
>
> - make update-tracker
>
> ---
>
> Codex Task (riferimento interno)

## #658 — Document Evo workflow secret dependencies

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T20:36:32Z
- Link: https://github.com/MasterDD-L34D/Game/pull/658

> ## Summary
>
> - document which Evo workflows rely on the SITE_BASE_URL secret
> - record the CI secret provisioning request in the Evo inventory and guidance docs
> - note OPS-02/OPS-03 as fully configured thanks to the registered secret
>
> ## Testing
>
> - not run (not requested)
>
> ---
>
> Codex Task (riferimento interno)

## #659 — Finalize evo staging cleanup

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T20:38:40Z
- Link: https://github.com/MasterDD-L34D/Game/pull/659

> ## Summary
>
> - mark the evo staging batches as closed by adding a post-cleanup flag
> - record the staging closure and cleanup steps in the inventory audit log
>
> ## Testing
>
> - make update-tracker
>
> ---
>
> Codex Task (riferimento interno)

## #660 — Add integration propagation review summary

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T20:50:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/660

> ## Summary
>
> - add a formatted review document describing the propagation status of the Evo integration
>
> ## Testing
>
> - not run
>
> ---
>
> Codex Task (riferimento interno)

## #661 — Clarify secret provisioning workflow in propagation review

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T20:53:41Z
- Link: https://github.com/MasterDD-L34D/Game/pull/661

> ## Summary
>
> - expand the integration propagation review with a detailed plan for provisioning the SITE_BASE_URL secret
> - include tracker synchronization and workflow verification steps to complete the evo handoff
>
> ## Testing
>
> - not run
>
> ---
>
> Codex Task (riferimento interno)

## #662 — Document provisioning of SITE_BASE_URL secret

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T21:03:46Z
- Link: https://github.com/MasterDD-L34D/Game/pull/662

> ## Summary
>
> - mark SITE_BASE_URL secret and variable as configured in the inventory with provisioning details and QA reference
> - align OPS tracker notes and integration reports to reflect the completed secret provisioning and add a provisioning section to the inventory audit
> - add the QA log generated by make update-tracker TRACKER_CHECK=1
>
> ## Testing
>
> - make update-tracker TRACKER_CHECK=1
>
> ---
>
> Codex Task (riferimento interno)

## #663 — Add Evo Tactics trace hash tooling and audit

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T22:25:46Z
- Link: https://github.com/MasterDD-L34D/Game/pull/663

> ## Summary
>
> - add a Python utility that normalises Evo Tactics manifests and stamps stable SHA-256 trace hashes across the data, docs and public replicas
> - update every receipt.trace_hash in the Evo Tactics pack (YAML sources, catalog JSON and published species files) and document the hashing workflow in the db schema manual
> - add a pytest audit that imports the updater configuration and fails if any trace_hash remains set to `to-fill`
>
> ## Testing
>
> - python tools/py/update_trace_hashes.py --dry-run
> - pytest tests/scripts/test_trace_hashes.py
>
> ---
>
> Codex Task (riferimento interno)

## #664 — Ensure Evo Tactics trace hashes propagate canonical digest

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T23:07:46Z
- Link: https://github.com/MasterDD-L34D/Game/pull/664

> ## Summary
>
> - compute canonical trace hash digests from the Evo Tactics YAML sources and reuse them while updating JSON replicas
> - restamp the Evo Tactics catalog, docs and public JSON receipts so their trace hashes now mirror the YAML source digests
>
> ## Testing
>
> - python tools/py/update_trace_hashes.py --dry-run
>
> ---
>
> Codex Task (riferimento interno)

## #665 — Ensure biome pools expose metadata

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T23:26:24Z
- Link: https://github.com/MasterDD-L34D/Game/pull/665

> ## Summary
>
> - inject root metadata into biome pools before exposing them to the synthesizer
> - reuse the helper for both catalog and filesystem loading paths
> - add a regression test that verifies filesystem loads include schema metadata
>
> ## Testing
>
> - node --test tests/services/biomeSynthesizerMetadata.test.js
>
> ---
>
> Codex Task (riferimento interno)

## #666 — Extend trace hash updater to ecosystem manifests

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-11T23:35:00Z
- Link: https://github.com/MasterDD-L34D/Game/pull/666

> ## Summary
>
> - extend the trace-hash updater to also scan the canonical ecosystem YAML manifests
> - refresh the pending ecosystem trace hashes and document the broader coverage in the schema notes
> - update the audit test harness so it follows every configured manifest root
>
> ## Testing
>
> - pytest tests/scripts/test_trace_hashes.py
>
> ---
>
> Codex Task (riferimento interno)
