# Daily PR Summary — 2025-11-21

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#700](https://github.com/MasterDD-L34D/Game/pull/700) | Align workspaces and dev stack setup | @MasterDD-L34D | 2025-11-21T00:05:27Z |
| [#701](https://github.com/MasterDD-L34D/Game/pull/701) | Migrate backend storage to Prisma | @MasterDD-L34D | 2025-11-21T00:21:05Z |
| [#702](https://github.com/MasterDD-L34D/Game/pull/702) | Add Prisma-backed species-biome relations and dashboard wiring | @MasterDD-L34D | 2025-11-21T00:48:28Z |
| [#703](https://github.com/MasterDD-L34D/Game/pull/703) | Document Docker/Prisma bootstrap and env configuration | @MasterDD-L34D | 2025-11-21T00:58:57Z |
| [#704](https://github.com/MasterDD-L34D/Game/pull/704) | Fix Evo pack asset path rewrites | @MasterDD-L34D | 2025-11-21T01:41:26Z |
| [#705](https://github.com/MasterDD-L34D/Game/pull/705) | Preserve biome pool metadata for offline generation | @MasterDD-L34D | 2025-11-21T01:50:17Z |
| [#706](https://github.com/MasterDD-L34D/Game/pull/706) | Add tests for evo pack sync and biome metadata fallback | @MasterDD-L34D | 2025-11-21T01:57:08Z |
| [#707](https://github.com/MasterDD-L34D/Game/pull/707) | Update database tracker and runbook notes | @MasterDD-L34D | 2025-11-21T02:15:44Z |
| [#708](https://github.com/MasterDD-L34D/Game/pull/708) | Finalize data stack tracker and logs | @MasterDD-L34D | 2025-11-21T10:40:02Z |
| [#709](https://github.com/MasterDD-L34D/Game/pull/709) | Aggiorna riferimenti test indice documentazione | @MasterDD-L34D | 2025-11-21T12:52:47Z |
| [#710](https://github.com/MasterDD-L34D/Game/pull/710) | Update traits tracking index entry date | @MasterDD-L34D | 2025-11-21T13:06:11Z |
| [#711](https://github.com/MasterDD-L34D/Game/pull/711) | Add ali_solari_fotoni to trait glossary | @MasterDD-L34D | 2025-11-21T18:01:13Z |
| [#712](https://github.com/MasterDD-L34D/Game/pull/712) | Add pathfinder dataset modular crystal eyes trait | @MasterDD-L34D | 2025-11-21T18:22:57Z |
| [#713](https://github.com/MasterDD-L34D/Game/pull/713) | Add modular crystal eyes trait localization | @MasterDD-L34D | 2025-11-21T18:30:37Z |
| [#714](https://github.com/MasterDD-L34D/Game/pull/714) | Normalize trait entry and refresh coverage baselines | @MasterDD-L34D | 2025-11-21T18:37:04Z |
| [#715](https://github.com/MasterDD-L34D/Game/pull/715) | Refine trait operational sheet and links | @MasterDD-L34D | 2025-11-21T19:00:27Z |
| [#716](https://github.com/MasterDD-L34D/Game/pull/716) | Add quick reference link for trait authoring | @MasterDD-L34D | 2025-11-21T19:05:32Z |
| [#717](https://github.com/MasterDD-L34D/Game/pull/717) | Add references to trait operational guide | @MasterDD-L34D | 2025-11-21T19:07:49Z |
| [#718](https://github.com/MasterDD-L34D/Game/pull/718) | Add quick example to trait operational sheet | @MasterDD-L34D | 2025-11-21T19:16:44Z |
| [#719](https://github.com/MasterDD-L34D/Game/pull/719) | Add quick access navigation for trait docs | @MasterDD-L34D | 2025-11-21T19:18:33Z |
| [#720](https://github.com/MasterDD-L34D/Game/pull/720) | Aggiorna vincolo id traits | @MasterDD-L34D | 2025-11-21T22:14:13Z |

## #700 — Align workspaces and dev stack setup

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T00:05:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/700

> ## Summary
> - scope the workspace configuration to backend, dashboard, and shared packages
> - update the stack scripts to run backend Prisma setup and start both apps through workspace commands
> - expose the shared atlas dataset to the dashboard state layer and refresh the lockfile
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fab6bf89483289a100e49ceda20e0)

## #701 — Migrate backend storage to Prisma

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T00:21:05Z
- Link: https://github.com/MasterDD-L34D/Game/pull/701

> ## Summary
> - add Prisma schema, migration, and seed for the idea engine models and generateable client
> - refactor backend storage/controllers to rely on Prisma Client and adjust setup scripts
> - add Docker Compose and environment defaults for Postgres with idempotent Prisma bootstrap marker
> ## Testing
> - Not run (Prisma engine downloads require network access in this environment)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691facd188888328ad9632ca03266115)

## #702 — Add Prisma-backed species-biome relations and dashboard wiring

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T00:48:28Z
- Link: https://github.com/MasterDD-L34D/Game/pull/702

> ## Summary
> - extend the Prisma schema/seed and expose `/api/species`, `/api/biomes`, and `/api/species-biomes` endpoints that honour the X-User header
> - add shared contract types/schemas plus dashboard data store and view updates to consume live species-biome links with mock fallbacks
> - wire stack scripts to set VITE_API_BASE_URL/VITE_API_USER defaults and provide a combined frontend/backend test runner
> ## Testing
> - npm test --workspace apps/dashboard *(fails: missing ../../src/config/dataSources.ts and existing analytics expectations)*
> - PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate --schema apps/backend/prisma/schema.prisma *(fails: Prisma engine download blocked by 403)*
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fb07a0df88328a55aec7d5b4463a6)

## #703 — Document Docker/Prisma bootstrap and env configuration

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T00:58:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/703

> ## Summary
> - add Docker/Postgres/Prisma bootstrap and reset guidance to the main README
> - document how to rerun migrations/seed and force a fresh bootstrap by clearing the marker file
> - describe backend and dashboard environment variables, including auth and X-User propagation, to align environments
> ## Testing
> - Not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fb6eeb1988328a39140ab03b0e405)

## #704 — Fix Evo pack asset path rewrites

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T01:41:26Z
- Link: https://github.com/MasterDD-L34D/Game/pull/704

> ## Summary
> - update the Evo pack sync script to rewrite any string references from ../../data/ to ../../packs/evo_tactics_pack/data/ when mirroring assets
> - regenerate Evo Tactics pack mirror assets so the docs and public bundles reference the packaged data paths
> ## Testing
> - node scripts/sync_evo_pack_assets.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fc29567688328ad8fdc614c3d8634)

## #705 — Preserve biome pool metadata for offline generation

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T01:50:17Z
- Link: https://github.com/MasterDD-L34D/Game/pull/705

> ## Summary
> - pull schema_version and updated_at from manifest metadata or fallback fields when injecting biome pool metadata
> - ensure offline-generated biome pools retain canonical metadata defaults
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fc34eccd88328a57b734d17685cd7)

## #706 — Add tests for evo pack sync and biome metadata fallback

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T01:57:08Z
- Link: https://github.com/MasterDD-L34D/Game/pull/706

> ## Summary
> - add coverage for sync_evo_pack_assets to ensure mirrored assets rewrite data paths
> - inject schema metadata into biome pools when loading fallback catalog data and fix the catalog service import path
> - validate fallback biome pool metadata via new service test
> ## Testing
> - node --test tests/scripts/sync_evo_pack_assets.test.js tests/services/biomeSynthesizerMetadata.test.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fc56237bc83288c9737e255364ce1)

## #707 — Update database tracker and runbook notes

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T02:15:44Z
- Link: https://github.com/MasterDD-L34D/Game/pull/707

> ## Summary
> - Marked database tracker items complete and refreshed completion percentage
> - Logged mirror normalization, fallback metadata alignment, and added regression test references
> - Added operational runbook guidance and ADR notes for mirror sync and biome pool validation
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fc6fc4ddc83288d8054506bfa4191)

## #708 — Finalize data stack tracker and logs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T10:40:02Z
- Link: https://github.com/MasterDD-L34D/Game/pull/708

> ## Summary
> - update README database tracker to reflect completed mirror and biome metadata fixes and include regression tests
> - refresh progress indicators and discrepancy notes to show current state
> - correct trait tracking log entry with actual regression test locations
> ## Testing
> - node --test tests/scripts/sync_evo_pack_assets.test.js tests/services/biomeSynthesizerMetadata.test.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6917ce08257c83289996b91b48f7ce50)

## #709 — Aggiorna riferimenti test indice documentazione

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T12:52:47Z
- Link: https://github.com/MasterDD-L34D/Game/pull/709

> ## Summary
> - aggiorna l'indice della documentazione con i nomi dei test correnti per i mirror e i pool bioma
> - allinea le istruzioni di esecuzione ai comandi `node --test` utilizzati effettivamente
> ## Testing
> - non eseguiti (modifiche alla documentazione)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69205f5c1f0c8328bee220e6c3a12b1f)

## #710 — Update traits tracking index entry date

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T13:06:11Z
- Link: https://github.com/MasterDD-L34D/Game/pull/710

> ## Summary
> - align the tracker index entry for `logs/traits_tracking.md` to reflect the latest 2025-12-07 update date
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692060a4b0e88328a6fb4b55d9488eec)

## #711 — Add ali_solari_fotoni to trait glossary

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T18:01:13Z
- Link: https://github.com/MasterDD-L34D/Game/pull/711

> ## Summary
> - add Italian and English labels and descriptions for the ali_solari_fotoni trait in the core glossary
> - validate JSON structure with json.tool formatting
> ## Testing
> - python -m json.tool --indent 2 --no-ensure-ascii data/core/traits/glossary.json > /tmp/trait_glossary.json && mv /tmp/trait_glossary.json data/core/traits/glossary.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920a72964708328b764cbf52afa83fb)

## #712 — Add pathfinder dataset modular crystal eyes trait

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T18:22:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/712

> ## Summary
> - add the Occhi di Cristallo Modulare trait for the Sensoriale/Visivo category based on the template
> - register the new trait in the trait indexes with the pathfinder_dataset data origin
> ## Testing
> - python tools/py/trait_template_validator.py --summary
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920a900a8fc8328a0aac3a4758e3c90)

## #713 — Add modular crystal eyes trait localization

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T18:30:37Z
- Link: https://github.com/MasterDD-L34D/Game/pull/713

> ## Descrizione
> - Allineati i campi di `occhi_cristallo_modulare` e dei trait in _drafts alle chiavi i18n e sincronizzate le localizzazioni italiane.
> - Rigenerati i report `trait_fields_by_type.json` e `trait_texts.json`.
> ## Checklist guida stile & QA
> - [x] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati
> - [ ] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact)
> - [ ] Badge "Guida stile" dell'editor in stato "In linea" (suggerimenti applicabili gestiti)
> - [ ] Generato `tools/py/styleguide_compliance_report.py` (link a JSON/Markdown)

## #714 — Normalize trait entry and refresh coverage baselines

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T18:37:04Z
- Link: https://github.com/MasterDD-L34D/Game/pull/714

> ## Summary
> - normalized the `occhi_cristallo_modulare` trait metadata to keep i18n references consistent and mark completion flags
> - regenerated the trait baseline and coverage reports against the current glossary and env-trait mappings
> - verified the strict coverage checks still pass with the refreshed report outputs
> ## Testing
> - python tools/py/normalize_trait_style.py
> - python scripts/sync_trait_locales.py --traits-dir data/traits --locales-dir locales --language it --fallback null --glossary data/core/traits/glossary.json
> - python tools/py/build_trait_baseline.py packs/evo_tactics_pack/docs/catalog/env_traits.json data/traits/index.json --trait-glossary data/core/traits/glossary.json --out data/derived/analysis/trait_baseline.yaml
> - python tools/py/report_trait_coverage.py --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json --trait-reference data/traits/index.json --species-root packs/evo_tactics_pack/data/species --trait-glossary data/core/traits/glossary.json --out-json data/derived/analysis/trait_coverage_report.json --out-csv data/derived/analysis/trait_coverage_matrix.csv --strict
> ------

## #715 — Refine trait operational sheet and links

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T19:00:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/715

> ## Summary
> - align the trait operational sheet to the latest reference/checklist with command reminders and links
> - add entry points to the operational sheet from the author how-to and the trait template intro
> ## Testing
> - not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920b49365dc8328a741fb10876a914d)

## #716 — Add quick reference link for trait authoring

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T19:05:32Z
- Link: https://github.com/MasterDD-L34D/Game/pull/716

> ## Summary
> - add a quick-reference bullet in the trait authoring guide pointing to the full operational sheet
> ## Testing
> - not run (docs change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920b6d5bde8832881c35cd03fa30033)

## #717 — Add references to trait operational guide

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T19:07:49Z
- Link: https://github.com/MasterDD-L34D/Game/pull/717

> ## Summary
> - highlight the operational guide from the trait template introduction
> - link the operational guide from the catalog reference to connect glossary labels with the operational workflow
> ## Testing
> - not run
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920b8066ad483288e5881ceef998ba9)

## #718 — Add quick example to trait operational sheet

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T19:16:44Z
- Link: https://github.com/MasterDD-L34D/Game/pull/718

> ## Descrizione
> - Aggiunto blocco "Esempio rapido" alla scheda operativa dei trait con JSON minimo e voce di glossario corrispondente.
> - Evidenziati i placeholder da sostituire e richiamati i comandi di sync/validazione già elencati.
> ## Checklist guida stile & QA
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati
> - [ ] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact)
> - [ ] Badge "Guida stile" dell'editor in stato "In linea" (suggerimenti applicabili gestiti)
> - [ ] Generato `tools/py/styleguide_compliance_report.py` (link a JSON/Markdown)

## #719 — Add quick access navigation for trait docs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T19:18:33Z
- Link: https://github.com/MasterDD-L34D/Game/pull/719

> ## Summary
> - add a quick Accesso rapido block to the trait operational sheet to link guide, template, and catalog reference
> - add a return link from the trait template back to the authoring guide
> ## Testing
> - not run
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920baa7f4f4832897cac2e43fe67b78)

## #720 — Aggiorna vincolo id traits

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-21T22:14:13Z
- Link: https://github.com/MasterDD-L34D/Game/pull/720

> ## Summary
> - aggiorna il bullet del campo `id` nella scheda operativa con la dicitura `snake_case`
> - allinea il vincolo regex del campo `id` a `^[a-z0-9_]+$`
> ## Testing
> - npx prettier docs/traits_scheda_operativa.md --check
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6920d2fb90988328aa6bb6105e087d16)
