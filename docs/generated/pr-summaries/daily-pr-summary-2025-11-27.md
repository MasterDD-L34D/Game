# Daily PR Summary — 2025-11-27

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#885](https://github.com/MasterDD-L34D/Game/pull/885) | Update integration plan validation details | @MasterDD-L34D | 2025-11-27T00:22:29Z |
| [#886](https://github.com/MasterDD-L34D/Game/pull/886) | Deduplicate evo tactics traits package archive | @MasterDD-L34D | 2025-11-27T00:31:08Z |
| [#887](https://github.com/MasterDD-L34D/Game/pull/887) | Refactor Evo validation tooling paths | @MasterDD-L34D | 2025-11-27T12:02:34Z |
| [#888](https://github.com/MasterDD-L34D/Game/pull/888) | Track 03B smoke validation and backlog prep | @MasterDD-L34D | 2025-11-27T12:10:47Z |
| [#889](https://github.com/MasterDD-L34D/Game/pull/889) | Archive playbook snapshots for rollout ROL-03 | @MasterDD-L34D | 2025-11-27T12:33:55Z |
| [#890](https://github.com/MasterDD-L34D/Game/pull/890) | Regenerate Evo trait rollout reports and fix build targets | @MasterDD-L34D | 2025-11-27T12:49:02Z |
| [#891](https://github.com/MasterDD-L34D/Game/pull/891) | Regenerate trait external export and rollout notes | @MasterDD-L34D | 2025-11-27T12:59:13Z |
| [#892](https://github.com/MasterDD-L34D/Game/pull/892) | Update ROL-07 backlog status | @MasterDD-L34D | 2025-11-27T13:15:31Z |
| [#893](https://github.com/MasterDD-L34D/Game/pull/893) | Normalize species ecosystem rollout data | @MasterDD-L34D | 2025-11-27T13:22:59Z |
| [#894](https://github.com/MasterDD-L34D/Game/pull/894) | Chiudi gap missing_in_index per ROL-04 | @MasterDD-L34D | 2025-11-27T13:32:53Z |
| [#895](https://github.com/MasterDD-L34D/Game/pull/895) | Refresh trait rollout reports | @MasterDD-L34D | 2025-11-27T13:40:57Z |
| [#896](https://github.com/MasterDD-L34D/Game/pull/896) | Improve backlog setup validation and guidance | @MasterDD-L34D | 2025-11-27T14:10:40Z |
| [#897](https://github.com/MasterDD-L34D/Game/pull/897) | Add sentience index buckets to telemetry timelines | @MasterDD-L34D | 2025-11-27T14:17:24Z |
| [#898](https://github.com/MasterDD-L34D/Game/pull/898) | Align rollout rollout metrics with current trait gaps | @MasterDD-L34D | 2025-11-27T14:36:30Z |
| [#899](https://github.com/MasterDD-L34D/Game/pull/899) | Document GitHub token requirements for backlog setup | @MasterDD-L34D | 2025-11-27T14:47:43Z |
| [#900](https://github.com/MasterDD-L34D/Game/pull/900) | Correggi slug rollout duplicato e telemetria | @MasterDD-L34D | 2025-11-27T15:28:02Z |
| [#901](https://github.com/MasterDD-L34D/Game/pull/901) | Document setup_backlog failure due to missing token | @MasterDD-L34D | 2025-11-27T20:20:10Z |
| [#902](https://github.com/MasterDD-L34D/Game/pull/902) | Block main commits and log RIAPERTURA-2026-01 follow-up | @MasterDD-L34D | 2025-11-27T20:58:12Z |
| [#903](https://github.com/MasterDD-L34D/Game/pull/903) | Log kickoff closeout for RIAPERTURA-2026-01 | @MasterDD-L34D | 2025-11-27T21:18:53Z |
| [#904](https://github.com/MasterDD-L34D/Game/pull/904) | Aggiorna triage incoming e log freeze 01A | @MasterDD-L34D | 2025-11-27T22:07:23Z |
| [#905](https://github.com/MasterDD-L34D/Game/pull/905) | Update 01B core-derived matrix and log gate exit | @MasterDD-L34D | 2025-11-27T22:39:10Z |
| [#906](https://github.com/MasterDD-L34D/Game/pull/906) | Document CI and script inventory for incoming/derived (report-only) | @MasterDD-L34D | 2025-11-27T22:53:34Z |

## #885 — Update integration plan validation details

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T00:22:29Z
- Link: https://github.com/MasterDD-L34D/Game/pull/885

> ## Summary
> - add per-batch validation notes covering scope, destinazione, dipendenze e blocchi
> - provide recommended execution sequence and approval status with parallelization guidance
> ## Testing
> - Not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692795ea5c548328b55d399bf36207fe)

## #886 — Deduplicate evo tactics traits package archive

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T00:31:08Z
- Link: https://github.com/MasterDD-L34D/Game/pull/886

> ## Summary
> - verified duplicate assets from the legacy `home/oai/share/evo_tactics_game_creatures_traits_package` against the canonical 2025-12-19 archive
> - updated `inventario.yml` destinations and notes to reference the retained root copies and non-equivalent legacy script
> - removed the redundant 2025-11-15 duplicate files from the archive tree
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692799d2f4408328a5aed8b505ec8123)

## #887 — Refactor Evo validation tooling paths

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T12:02:34Z
- Link: https://github.com/MasterDD-L34D/Game/pull/887

> ## Summary
> - move the Evo validation helper into incoming/scripts/validate_evo_pack.sh and update Makefile defaults
> - run trait review together with species summary generation and refresh tracker commands
> - harden the Evo batch runner/workflow to resolve repository paths from the workspace root
> ## Testing
> - bash incoming/scripts/validate_evo_pack.sh --help
> - python -m py_compile tools/automation/evo_batch_runner.py incoming/scripts/species_summary_script.py incoming/scripts/trait_review.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69279be36cac83288a5d50d5909a82f6)

## #888 — Track 03B smoke validation and backlog prep

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T12:10:47Z
- Link: https://github.com/MasterDD-L34D/Game/pull/888

> ## Summary
> - add checkpoints for the 03B smoke validation to the inventory and rollout task trackers
> - publish refreshed trait and species analysis reports based on the latest logs
> - bring the backlog template into the working area for setup_backlog.py execution
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69283de358c08328a4d9304bf095cacb)

## #889 — Archive playbook snapshots for rollout ROL-03

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T12:33:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/889

> ## Summary
> - archived the Security & Ops, PTPF template, and visione/struttura playbooks under docs/incoming/archive/2025-12-19_inventory_cleanup with frontmatter and changelog entries
> - updated the rollout documentation gap report with the new archived destinations and notes that the playbook gap is closed
> - marked ROL-03 as complete in incoming/lavoro_da_classificare/tasks.yml and refreshed telemetry/samples for the archived playbooks
> ## Testing
> - npx prettier --write docs/incoming/archive/2025-12-19_inventory_cleanup/playbook_security_ops.md docs/incoming/archive/2025-12-19_inventory_cleanup/playbook_template_ptpf.md docs/incoming/archive/2025-12-19_inventory_cleanup/playbook_visione_struttura.md
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6928421c365483288f8988617db9ef1a)

## #890 — Regenerate Evo trait rollout reports and fix build targets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T12:49:02Z
- Link: https://github.com/MasterDD-L34D/Game/pull/890

> ## Summary
> - Regenerated the Evo rollout gap and normalized reports in `reports/evo/rollout` and updated telemetry for ROL-04
> - Reformatted synced glossary entries after running the missing-index sync on the refreshed report
> - Fixed Makefile tabbing for Evo targets and reran `make traits-review`, committing the generated QA CSVs
> ## Testing
> - python tools/traits/sync_missing_index.py --source reports/evo/rollout/traits_gap.csv --dest data/core/traits/glossary.json
> - python tools/audit/evo_trait_diff.py
> - make traits-review
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692845546a708328af853efe4a4de320)

## #891 — Regenerate trait external export and rollout notes

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T12:59:13Z
- Link: https://github.com/MasterDD-L34D/Game/pull/891

> ## Summary
> - regenerate the trait gap artifacts and produce an updated partner export after the ROL-04 closure
> - add the missing coscienza_dalveare_diffusa entry to the legacy trait glossary with metadata from the external dataset
> - refresh ROL-05 rollout notes/telemetry with CSV format guidance, counts, and partner handoff details
> ## Testing
> - python tools/audit/evo_trait_diff.py
> - python tools/traits/sync_missing_index.py --source reports/evo/rollout/traits_gap.csv --dest data/core/traits/glossary.json --trait-dir data/external/evo/traits --update-glossary --export reports/evo/rollout/traits_external_sync.csv
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692848e5654083288961548e29a66066)

## #892 — Update ROL-07 backlog status

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T13:15:31Z
- Link: https://github.com/MasterDD-L34D/Game/pull/892

> ## Summary
> - mark ROL-07 as in-progress now that backlog template is ready for rerun
> - keep notes to rerun setup_backlog.py once a valid GitHub token is available
> ## Testing
> - not run (setup_backlog.py requires valid GitHub token and repo access)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69284b3a5ef48328bc01cccb5a95a18e)

## #893 — Normalize species ecosystem rollout data

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T13:22:59Z
- Link: https://github.com/MasterDD-L34D/Game/pull/893

> ## Summary
> - generate the normalized species ecosystem gap report and matrix to cover the 20 ecotipi mismatches
> - update the atlas controller and telemetry aggregator to load the rollout matrix (sentience/fallback slot) and reuse shared helpers
> - refresh rollout task telemetry to reflect completion
> ## Testing
> - node --test tests/server/nebula-route.spec.js
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69284efba83083288699614d01171ebe)

## #894 — Chiudi gap missing_in_index per ROL-04

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T13:32:53Z
- Link: https://github.com/MasterDD-L34D/Game/pull/894

> ## Summary
> - deduplicate il glossario dei trait rimuovendo l'alias errato e aggiornando il timestamp dopo la sincronizzazione
> - contrassegna le due righe `missing_in_index` in `traits_gap.csv` come risolte con metadati legacy allineati
> - porta il task ROL-04 a completamento con telemetria aggiornata e note coerenti per l'export ROL-05
> ## Testing
> - python tools/traits/sync_missing_index.py --source reports/evo/rollout/traits_gap.csv --dest data/core/traits/glossary.json
> - python -m json.tool data/core/traits/glossary.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692851da601083288c03a4d399ffc060)

## #895 — Refresh trait rollout reports

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T13:40:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/895

> ## Descrizione
> - Rigenerati `traits_gap.csv` e `traits_gap.svg` sul dataset post ROL-04 per allineare gli stati `missing_in_external` e tracciare i due slug ancora `missing_in_index`.
> - Aggiornato il blocco ROL-05 in `tasks.yml` con telemetria al 100% e note sulla consegna locale dell’export partner.
> ## Checklist guida stile & QA
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate (N/A: rigenerazione report CSV)
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa (N/A)
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati (N/A)
> - [ ] Eseguito `scripts/trait_style_check.js` (N/A)
> - [ ] Badge "Guida stile" dell'editor in stato "In linea" (N/A)
> - [ ] Generato `tools/py/styleguide_compliance_report.py` (N/A)

## #896 — Improve backlog setup validation and guidance

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T14:10:40Z
- Link: https://github.com/MasterDD-L34D/Game/pull/896

> ## Descrizione
> - Rafforza `incoming/scripts/setup_backlog.py` con preflight su REPO/BACKLOG_FILE/token, header Projects e messaggi d'errore più chiari in caso di 404 o assenza permessi.
> - Aggiorna le note di ROL-07 in `tasks.yml` e in `docs/incoming/lavoro_da_classificare/TASKS_BREAKDOWN.md` per riflettere le nuove verifiche e la necessità di un PAT repo+project.
> ## Checklist guida stile & QA
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate (N/A)
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa (N/A)
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati (N/A)
> - [ ] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact) (N/A)
> - [ ] Badge "Guida stile" dell'editor in stato "In linea" (suggerimenti applicabili gestiti) (N/A)
> - [ ] Generato `tools/py/styleguide_compliance_report.py` (link a JSON/Markdown) (N/A)

## #897 — Add sentience index buckets to telemetry timelines

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T14:17:24Z
- Link: https://github.com/MasterDD-L34D/Game/pull/897

> ## Summary
> - add sentience_index aggregation to telemetry incident timelines in nebula aggregator and Atlas controller
> - refresh rollout gap report with ROL-08 changes and mark rollout task as completed with telemetry smoke test note
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69285bf3b61883288567ed616cb64ba2)

## #898 — Align rollout rollout metrics with current trait gaps

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T14:36:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/898

> ## Summary
> - update rollout telemetry (status_export, roadmap, tasks) to reflect the two remaining missing_in_index traits and corrected totals
> - refresh weekly snapshot indicators so missing_in_index matches the current trait gap report
> ## Testing
> - pytest tests/reports/test_traits_rollout_reports.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69285ea1eb888328b0d0b2a050242d93)

## #899 — Document GitHub token requirements for backlog setup

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T14:47:43Z
- Link: https://github.com/MasterDD-L34D/Game/pull/899

> ## Summary
> - add local README explaining why GITHUB_TOKEN is absent in the container and how to create/export a PAT with repo+project scopes
> - clarify ROL-07 rollout notes with a pointer to the README and the container’s token limitation
> ## Testing
> - not run (not required)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69286207f3e48328b1672d1ff7e2e5b4)

## #900 — Correggi slug rollout duplicato e telemetria

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T15:28:02Z
- Link: https://github.com/MasterDD-L34D/Game/pull/900

> ## Summary
> - normalizza TR-2002 usando lo slug corretto nel gap report ed elimina il duplicato errato
> - aggiorna il glossario rimuovendo l’entry con slug refuso e rinfresca il timestamp
> - riallinea le metriche di telemetria ROL-04/05 al nuovo conteggio (252 voci, 202 legacy_only)
> ## Testing
> - non eseguiti (aggiornamenti dati/documentazione)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692866a31e448328bc26fee9568fa85f)

## #901 — Document setup_backlog failure due to missing token

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T20:20:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/901

> ## Summary
> - log the latest setup_backlog.py execution output for auditing
> - mark ROL-07 as in-progress after the GitHub 401 failure and reference the stored log
> ## Testing
> - python incoming/scripts/setup_backlog.py (fails: GitHub API 401 Bad credentials with placeholder token)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69286e0a62008328822400f6264b0812)

## #902 — Block main commits and log RIAPERTURA-2026-01 follow-up

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T20:58:12Z
- Link: https://github.com/MasterDD-L34D/Game/pull/902

> ## Descrizione
> - aggiunto un controllo Husky per bloccare i commit sul branch `main`, indirizzando il lavoro verso `work` o i branch 01A–03B
> - riallineati i branch dedicati 01A–03B all’HEAD di `work` e aggiornato il log RIAPERTURA-2026-01 con stato ticket, freeze e riferimenti a `REF_REPO_SCOPE`/`REF_REPO_MIGRATION_PLAN`
> ## Checklist guida stile & QA
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati
> - [ ] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact)
> - [ ] Badge "Guida stile" dell'editor in stato "In linea" (suggerimenti applicabili gestiti)
> - [ ] Generato `tools/py/styleguide_compliance_report.py` (link a JSON/Markdown)

## #903 — Log kickoff closeout for RIAPERTURA-2026-01

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T21:18:53Z
- Link: https://github.com/MasterDD-L34D/Game/pull/903

> ## Summary
> - log the 2026-03-22 kickoff/closeout for RIAPERTURA-2026-01, confirming gap list status, `_holding` absence, and team availability
> - refresh incoming/README.md and docs/incoming/README.md notes with the closeout decision and freeze status
> ## Testing
> - Not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6928bbfc4c5083289d351c6e38908f89)

## #904 — Aggiorna triage incoming e log freeze 01A

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T22:07:23Z
- Link: https://github.com/MasterDD-L34D/Game/pull/904

> ## Summary
> - Registrate note di riesame freeze 01A e conferma etichette DA_INTEGRARE/LEGACY/STORICO per le tabelle incoming.
> - Aggiornata la gap list 01A con owner proposti per ogni ticket e allineati i README incoming/docs.
> - Loggata l’attività nel registro agenti con identificativo, rischio e file toccati.
> ## Testing
> - Not run (docs-only change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6928c045f9e08328a9209d677753f5b4)

## #905 — Update 01B core-derived matrix and log gate exit

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T22:39:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/905

> ## Summary
> - align the core/derived matrix v0.2 with gap list 01A sources, co-triage flags, and references to sources of truth
> - log the 01B gate exit with branch link and Master DD approval request for the updated matrix
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6928cba33c2c8328ad97fb18a85d6e46)

## #906 — Document CI and script inventory for incoming/derived (report-only)

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-27T22:53:34Z
- Link: https://github.com/MasterDD-L34D/Game/pull/906

> ## Summary
> - add a report-only inventory of CI workflows and local scripts relevant to pack/incoming/derived data, noting missing controls
> - log the new inventory step with branch references in agent_activity
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6928d31674bc8328a4b63200d67271a7)
