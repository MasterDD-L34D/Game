# Daily PR Summary — 2025-11-12

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#667](https://github.com/MasterDD-L34D/Game/pull/667) | Ensure Evo pack mirrors use pack-relative paths | @MasterDD-L34D | 2025-11-12T00:53:55Z |
| [#668](https://github.com/MasterDD-L34D/Game/pull/668) | Align evo pack mirrors with pack data paths | @MasterDD-L34D | 2025-11-12T01:14:41Z |
| [#669](https://github.com/MasterDD-L34D/Game/pull/669) | Document Evo Tactics database status in README | @MasterDD-L34D | 2025-11-12T01:19:08Z |
| [#670](https://github.com/MasterDD-L34D/Game/pull/670) | Aggiorna documentazione CLI con comandi supportati | @MasterDD-L34D | 2025-11-12T01:34:20Z |
| [#671](https://github.com/MasterDD-L34D/Game/pull/671) | Align log documentation with tracked CLI outputs | @MasterDD-L34D | 2025-11-12T01:43:16Z |
| [#672](https://github.com/MasterDD-L34D/Game/pull/672) | Add discrepancy reporting guidance to README | @MasterDD-L34D | 2025-11-12T01:52:45Z |
| [#673](https://github.com/MasterDD-L34D/Game/pull/673) | Add Evo-Tactics documentation diff tooling and rollout reports | @MasterDD-L34D | 2025-11-12T01:59:31Z |
| [#674](https://github.com/MasterDD-L34D/Game/pull/674) | Switch Evo trait diff graph output to SVG | @MasterDD-L34D | 2025-11-12T02:10:25Z |
| [#675](https://github.com/MasterDD-L34D/Game/pull/675) | Add Evo species ecosystem normalization report | @MasterDD-L34D | 2025-11-12T02:17:48Z |
| [#676](https://github.com/MasterDD-L34D/Game/pull/676) | Plan Evo rollout backlog and coordination assets | @MasterDD-L34D | 2025-11-12T02:20:49Z |
| [#677](https://github.com/MasterDD-L34D/Game/pull/677) | Automate Evo rollout pipeline and telemetry integrations | @MasterDD-L34D | 2025-11-12T12:14:12Z |
| [#678](https://github.com/MasterDD-L34D/Game/pull/678) | Add Evo documentation archive sync workflow | @MasterDD-L34D | 2025-11-12T12:22:11Z |
| [#679](https://github.com/MasterDD-L34D/Game/pull/679) | Automate Evo traits sync workflow | @MasterDD-L34D | 2025-11-12T12:28:27Z |
| [#680](https://github.com/MasterDD-L34D/Game/pull/680) | Align Nebula atlas rollout with feature flag | @MasterDD-L34D | 2025-11-12T12:42:39Z |
| [#681](https://github.com/MasterDD-L34D/Game/pull/681) | Automate Evo rollout status updates | @MasterDD-L34D | 2025-11-12T13:00:00Z |
| [#682](https://github.com/MasterDD-L34D/Game/pull/682) | Align Evo doc metadata workflow outputs | @MasterDD-L34D | 2025-11-12T13:49:03Z |
| [#683](https://github.com/MasterDD-L34D/Game/pull/683) | Fix traits sync workflow secret conditions | @MasterDD-L34D | 2025-11-12T14:36:42Z |
| [#684](https://github.com/MasterDD-L34D/Game/pull/684) | Fix traits sync workflow secret guard | @MasterDD-L34D | 2025-11-12T14:45:07Z |
| [#685](https://github.com/MasterDD-L34D/Game/pull/685) | Add manual helper for traits export publishing | @MasterDD-L34D | 2025-11-12T15:01:12Z |
| [#686](https://github.com/MasterDD-L34D/Game/pull/686) | Replace EvoTactics binaries with text placeholders | @MasterDD-L34D | 2025-11-12T19:00:26Z |
| [#687](https://github.com/MasterDD-L34D/Game/pull/687) | Add Evo trait schema validation and rollout report checks | @MasterDD-L34D | 2025-11-12T19:36:58Z |
| [#688](https://github.com/MasterDD-L34D/Game/pull/688) | Add validate helper to Draft202012Validator stub | @MasterDD-L34D | 2025-11-12T19:45:59Z |
| [#689](https://github.com/MasterDD-L34D/Game/pull/689) | Add internal trait evaluation CLI and tests | @MasterDD-L34D | 2025-11-12T20:12:03Z |
| [#690](https://github.com/MasterDD-L34D/Game/pull/690) | Add internal evaluation artifacts to traits sync workflow | @MasterDD-L34D | 2025-11-12T20:47:22Z |
| [#691](https://github.com/MasterDD-L34D/Game/pull/691) | Propagate Nebula species rollout matrix to telemetry tools | @MasterDD-L34D | 2025-11-12T22:54:06Z |

## #667 — Ensure Evo pack mirrors use pack-relative paths

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T00:53:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/667

> ## Summary
> - update the Evo asset sync to rewrite mirror JSON `path` fields with pack-relative prefixes while preserving key order
> - regenerate the Evo Tactics catalog mirrors so docs and public bundles carry pack-relative references
> - extend the data health audit to flag mirror JSON entries that do not use the pack-relative prefix
> ## Testing
> - node scripts/update_evo_pack_catalog.js
> - node scripts/sync_evo_pack_assets.js
> - python tools/audit/data_health.py *(fails: Missing file packs/evo_tactics_pack/data/core/species.yaml)*
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913caf6b62c83289e19b4f213d3140c)

## #668 — Align evo pack mirrors with pack data paths

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T01:14:41Z
- Link: https://github.com/MasterDD-L34D/Game/pull/668

> ## Summary
> - add a tiny JSON helper and reuse it from the Evo pack sync script while rewriting both `path` and `manifest.path`
> - regenerate the Evo pack catalog mirrors so every JSON points at `../../packs/evo_tactics_pack/data/...`
> - tighten the data-health audit so it guards against regressions in mirrored path prefixes
> ## Testing
> - node scripts/update_evo_pack_catalog.js
> - node scripts/sync_evo_pack_assets.js
> - python tools/audit/data_health.py *(fails: packs/evo_tactics_pack/data/core/species.yaml missing in repository)*
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913dd5315a48328918eaef5487076ac)

## #669 — Document Evo Tactics database status in README

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T01:19:08Z
- Link: https://github.com/MasterDD-L34D/Game/pull/669

> ## Summary
> - add a dedicated "Stato database Evo Tactics" section to the root README with the current state, pending fixes, and progress tracker
> - document the database validation commands that should be run before release, including the planned mirror-path audit
> - update the table of contents so the new database section is discoverable
> ## Testing
> - not run (documentation only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913a56f69a88328b4d895b01633da90)

## #670 — Aggiorna documentazione CLI con comandi supportati

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T01:34:20Z
- Link: https://github.com/MasterDD-L34D/Game/pull/670

> ## Summary
> - aggiorna le sezioni Support/QA e troubleshooting della FAQ sostituendo i comandi CLI rimossi con gli script attivi e aggiungendo l'elenco dei sottocomandi disponibili
> - allinea il template di escalation bug e il tutorial del form feedback alle nuove modalità d'uso della CLI, indicando alternative e il set aggiornato di comandi
> - integra l'ADR sul refactor della CLI con la lista dei sottocomandi attuali e la strategia alternativa per lo streaming di telemetria
> ## Testing
> - not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913e2c490bc83288f6e00c5252edb64)

## #671 — Align log documentation with tracked CLI outputs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T01:43:16Z
- Link: https://github.com/MasterDD-L34D/Game/pull/671

> ## Summary
> - point the Idea Engine feedback tutorial to the versioned `logs/idea_engine/feedback/` folder for storing session notes
> - clarify the support token rotation checklist with the new CLI smoke log filenames
> - capture CLI smoke output into timestamped and `latest` logs while adding tracked directories for log storage
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913e4cb1a848328a95fd2525afdf2f9)

## #672 — Add discrepancy reporting guidance to README

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T01:52:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/672

> ## Summary
> - add a discrepancy reporting section to the README table of contents
> - document key CLI, logging, and dataset mirror discrepancies with links to detailed guides
> ## Testing
> - no tests were run (not needed)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913e63af85483288a235be631c685d3)

## #673 — Add Evo-Tactics documentation diff tooling and rollout reports

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T01:59:31Z
- Link: https://github.com/MasterDD-L34D/Game/pull/673

> ## Summary
> - add a Python utility that extracts inventory imports and diffs Evo-Tactics docs against the archive
> - publish the generated diff JSON plus a markdown gap report with impacts and rollout priorities
> - add an operational checklist for the next Evo-Tactics documentation batches
> ## Testing
> - `python3 scripts/evo_tactics_metadata_diff.py --output reports/evo/rollout/documentation_diff.json`
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913e8ebfc848328ab026456181b04ab)

## #674 — Switch Evo trait diff graph output to SVG

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T02:10:25Z
- Link: https://github.com/MasterDD-L34D/Game/pull/674

> ## Summary
> - default the Evo trait diff audit script to write SVG graph outputs and adjust save parameters per format
> - replace the rollout gap chart artifact with the new SVG export to avoid committing binary images
> ## Testing
> - python tools/audit/evo_trait_diff.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913ea0ca2808328aa405c7dda46d1b6)

## #675 — Add Evo species ecosystem normalization report

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T02:17:48Z
- Link: https://github.com/MasterDD-L34D/Game/pull/675

> ## Summary
> - add a Python reporting script that normalizes Evo species/ecotypes and links them with legacy slot/biome assets
> - generate a normalized CSV matrix combining species catalog traits with ecotype mappings and terraforming band metadata
> - publish a rollout gap report covering ecosystem coverage, telemetry consumers, and milestone recommendations
> ## Testing
> - python tools/py/report_evo_species_ecosystem.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913ec991fd08328bfe5923cd3f034ab)

## #676 — Plan Evo rollout backlog and coordination assets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T02:20:49Z
- Link: https://github.com/MasterDD-L34D/Game/pull/676

> ## Summary
> - add ROL-* rollout epics to the Evo task registry derived from the latest documentation, trait, and species gap analysis
> - document delivery checklists for API, generator, and internal tool consumers tied to rollout responsibilities and QA steps
> - schedule Evo rollout milestones and add a reusable status template for stakeholder updates
> ## Testing
> - no tests were run (not applicable)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913ee564e0c8328a7662c1a0ad5e0e0)

## #677 — Automate Evo rollout pipeline and telemetry integrations

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T12:14:12Z
- Link: https://github.com/MasterDD-L34D/Game/pull/677

> ## Summary
> - extend `scripts/evo_tactics_metadata_diff.py` with backfill/anchor modes and generate the Evo anchor map plus refreshed archive frontmatter
> - add `tools/traits/sync_missing_index.py` to sync trait gaps and produce the partner export, updating rollout docs and tracker status
> - enhance Nebula telemetry with Evo sentience/fallback data and cover it with updated tests
> ## Testing
> - node --test tests/server/nebula-route.spec.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6913e3c5e61883289c5cc9ec5142b694)

## #678 — Add Evo documentation archive sync workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T12:22:11Z
- Link: https://github.com/MasterDD-L34D/Game/pull/678

> ## Summary
> - add evo-doc-backfill workflow to diff, backfill and export Evo documentation metadata
> - upload Evo documentation reports as artifacts and open issues for blocking drifts automatically
> - introduce ops/notifier.py to summarize diffs and send Slack/Teams alerts for frontmatter or anchor gaps
> ## Testing
> - python -m compileall ops/notifier.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69147ae4a8148328ab94b3aaa72731c1)

## #679 — Automate Evo traits sync workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T12:28:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/679

> ## Summary
> - add the `traits-sync` GitHub Actions workflow to run the Evo glossary sync and publish the partner export to S3
> - extend `tools/traits/sync_missing_index.py` with `--update-glossary`/`--export` flags and cover the CLI with regression tests
> - document the automation and secrets in the Evo tooling guide and update the rollout status to reference the new routine
> ## Testing
> - pytest tests/tools/test_traits_sync.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69147c03ec688328aa561e5bc931d014)

## #680 — Align Nebula atlas rollout with feature flag

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T12:42:39Z
- Link: https://github.com/MasterDD-L34D/Game/pull/680

> ## Summary
> - gate Nebula atlas controller endpoints behind the `nebulaAtlasAggregator` feature flag and expose rollout headers
> - add fallback logging to the Nebula telemetry aggregator and align the shared feature flag configuration
> - document the Nebula rollout plan and release steps while extending router tests for enabled/disabled flows
> ## Testing
> - node --test tests/server/nebula-route.spec.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69147d760da8832896f5da9acd0adebe)

## #681 — Automate Evo rollout status updates

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T13:00:00Z
- Link: https://github.com/MasterDD-L34D/Game/pull/681

> ## Summary
> - add a roadmap updater utility that ingests Evo gap reports and refreshes the rollout status markdown, tasks registry telemetry, weekly template, and Kanban JSON export
> - generate the latest Evo rollout status snapshot and weekly template using the new tool
> - schedule a weekly GitHub Actions workflow to run the updater and publish the Kanban export artifact
> ## Testing
> - python tools/roadmap/update_status.py
> - npx prettier --write docs/roadmap/evo-rollout-status.md docs/roadmap/status/evo-weekly-20251029.md incoming/lavoro_da_classificare/tasks.yml
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691480ccab6083289bc654098ca44ba2)

## #682 — Align Evo doc metadata workflow outputs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T13:49:03Z
- Link: https://github.com/MasterDD-L34D/Game/pull/682

> ## Summary
> - capture the latest Evo-Tactics metadata diff in version-controlled reports
> - route evo-doc-backfill workflow notifications to the DevRel/Docs Slack channel
> - allow ops notifier to override the Slack destination channel when dispatching alerts
> ## Testing
> - python -m compileall ops/notifier.py
> - npx prettier --write incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/INTEGRAZIONE_GUIDE.md incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/README.md incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/docs/QA_TRAITS_V2.md incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/evo_tactics_game_database_guide.md incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/evo_tactics_guide.md
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69148970dcd483288a585866f542abae)

## #683 — Fix traits sync workflow secret conditions

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T14:36:42Z
- Link: https://github.com/MasterDD-L34D/Game/pull/683

> ## Summary
> - wrap the traits sync workflow secret checks in GitHub expression syntax so the workflow parses correctly
> ## Testing
> - not run
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914905d56bc83289119d78c56a42247)

## #684 — Fix traits sync workflow secret guard

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T14:45:07Z
- Link: https://github.com/MasterDD-L34D/Game/pull/684

> ## Summary
> - add a guard step that checks whether the partner AWS secrets are populated
> - reuse the guard result to decide whether to configure AWS credentials and publish to S3
> ## Testing
> - not run
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914905d56bc83289119d78c56a42247)

## #685 — Add manual helper for traits export publishing

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T15:01:12Z
- Link: https://github.com/MasterDD-L34D/Game/pull/685

> ## Summary
> - add a manual helper script to re-run the Evo traits sync and optionally publish the export to S3
> - add boto3 to the development requirements so the helper can upload directly
> ## Testing
> - python tools/traits/publish_partner_export.py --help
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914905d56bc83289119d78c56a42247)

## #686 — Replace EvoTactics binaries with text placeholders

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T19:00:26Z
- Link: https://github.com/MasterDD-L34D/Game/pull/686

> ## Summary
> - replace the binary EchoWake PDF with a markdown transcription and companion note that point back to the original archive
> - add a placeholder entry for the EvoTactics flowchart image so consumers know where to retrieve the binary asset externally
> ## Testing
> - not run
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914a63415a483288de25e9943bbc44b)

## #687 — Add Evo trait schema validation and rollout report checks

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T19:36:58Z
- Link: https://github.com/MasterDD-L34D/Game/pull/687

> ## Summary
> - expand the Evo trait JSON schema to cover structured requirement, cost, applicability, and versioning fields
> - add automated tests that validate external Evo trait files against the schema and ensure rollout CSV reports keep the expected headers
> - regenerate the rollout gap visualization to capture the refreshed comparison output
> ## Testing
> - pytest tests/schemas/test_evo_trait_schema.py tests/reports/test_traits_rollout_reports.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914d95b27ec8328867ed4f4125ef4bf)

## #688 — Add validate helper to Draft202012Validator stub

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T19:45:59Z
- Link: https://github.com/MasterDD-L34D/Game/pull/688

> ## Summary
> - add a validate helper to the Draft202012Validator stub that raises the first iterated error
> ## Testing
> - PYTHONPATH=. pytest tests/schemas/test_evo_trait_schema.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914e33aef748328a48b9239acff9d89)

## #689 — Add internal trait evaluation CLI and tests

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T20:12:03Z
- Link: https://github.com/MasterDD-L34D/Game/pull/689

> ## Summary
> - add a CLI tool to evaluate traits internally using the gap report, glossary and optional moderation matrices
> - output consolidated JSON/CSV reports with verdicts, scores and reasons
> - cover the new CLI with unit tests verifying rule application and moderation overrides
> ## Testing
> - pytest tests/tools/traits/test_evaluate_internal.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914e41013c083288a6d08c6c2b64878)

## #690 — Add internal evaluation artifacts to traits sync workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T20:47:22Z
- Link: https://github.com/MasterDD-L34D/Game/pull/690

> ## Summary
> - run the internal evaluation script inside the traits-sync workflow and upload its reports as artifacts
> - gate the S3 upload on an explicit `publish_external` flag and reuse the same logic in the manual helper
> - extend the partner export helper to generate evaluation reports and print the equivalent commands, documenting the new flow in the internal README
> ## Testing
> - python -m compileall tools/traits/publish_partner_export.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914ed20904483288bffae7c52adc5fd)

## #691 — Propagate Nebula species rollout matrix to telemetry tools

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-12T22:54:06Z
- Link: https://github.com/MasterDD-L34D/Game/pull/691

> ## Summary
> - default the Nebula server aggregator to load the species rollout matrix and forward the path to consumers
> - extend the status report and demo data generators with CLI support for custom species matrices and reuse the aggregator path
> - add a regression test covering the demo generator to ensure sentience and fallback slots are applied from the rollout matrix
> ## Testing
> - node --test tests/tools/generate-demo-data.spec.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6914fde771d88328a8ab09ee92761be0)
