# Daily PR Summary — 2025-12-06

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#1177](https://github.com/MasterDD-L34D/Game/pull/1177) | Document esito RIAPERTURA-2025-02 in planning checklist | @MasterDD-L34D | 2025-12-06T00:06:18Z |
| [#1178](https://github.com/MasterDD-L34D/Game/pull/1178) | Aggiorna documentazione CI con run del 05/12/2025 | @MasterDD-L34D | 2025-12-06T00:20:39Z |
| [#1179](https://github.com/MasterDD-L34D/Game/pull/1179) | Aggiorna inventario workflow CI | @MasterDD-L34D | 2025-12-06T00:44:54Z |
| [#1180](https://github.com/MasterDD-L34D/Game/pull/1180) | Document CI workflow follow-ups | @MasterDD-L34D | 2025-12-06T01:03:57Z |
| [#1182](https://github.com/MasterDD-L34D/Game/pull/1182) | Update validate naming latest run date | @MasterDD-L34D | 2025-12-06T01:33:10Z |
| [#1183](https://github.com/MasterDD-L34D/Game/pull/1183) | Allinea riferimenti CI ai run più recenti | @MasterDD-L34D | 2025-12-06T01:38:59Z |
| [#1184](https://github.com/MasterDD-L34D/Game/pull/1184) | Add CI log harvesting script and automation guide | @MasterDD-L34D | 2025-12-06T02:34:16Z |
| [#1185](https://github.com/MasterDD-L34D/Game/pull/1185) | Add GitHub CLI setup guidance and ci-log-harvest reminder | @MasterDD-L34D | 2025-12-06T02:39:18Z |
| [#1186](https://github.com/MasterDD-L34D/Game/pull/1186) | Update CI inventory status | @MasterDD-L34D | 2025-12-06T12:23:47Z |
| [#1187](https://github.com/MasterDD-L34D/Game/pull/1187) | Update CI inventory with latest workflow runs | @MasterDD-L34D | 2025-12-06T12:41:55Z |
| [#1188](https://github.com/MasterDD-L34D/Game/pull/1188) | Enhance CI log harvesting with PAT archive support | @MasterDD-L34D | 2025-12-06T12:55:27Z |
| [#1189](https://github.com/MasterDD-L34D/Game/pull/1189) | Improve artifact archive detection in ci_log_harvest | @MasterDD-L34D | 2025-12-06T13:21:52Z |
| [#1190](https://github.com/MasterDD-L34D/Game/pull/1190) | Fix gh run id extraction in ci log harvest | @MasterDD-L34D | 2025-12-06T13:26:27Z |
| [#1191](https://github.com/MasterDD-L34D/Game/pull/1191) | Add gh api output fallback for ci log harvest | @MasterDD-L34D | 2025-12-06T13:56:10Z |
| [#1192](https://github.com/MasterDD-L34D/Game/pull/1192) | Add log harvester workflow | @MasterDD-L34D | 2025-12-06T14:18:14Z |
| [#1193](https://github.com/MasterDD-L34D/Game/pull/1193) | Document log harvester workflow | @MasterDD-L34D | 2025-12-06T14:26:18Z |
| [#1194](https://github.com/MasterDD-L34D/Game/pull/1194) | Add log harvester artifact archive | @MasterDD-L34D | 2025-12-06T14:38:30Z |
| [#1195](https://github.com/MasterDD-L34D/Game/pull/1195) | Update CI inventory with remediation steps for failing workflows | @MasterDD-L34D | 2025-12-06T14:42:05Z |

## #1177 — Document esito RIAPERTURA-2025-02 in planning checklist

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T00:06:18Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1177

> ## Summary
> - add Esito 2026-09-17 section summarizing RIAPERTURA-2025-02 log steps and mark document as completed
> - update log prerequisite to reference the existing RIAPERTURA-2025-02 entry with its timestamp
> - add follow-up authorization for proceeding with pipeline 01A and record the update in the changelog
> ## Testing
> - not run (documentation only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6933717b20288328b84d78835b53555d)

## #1178 — Aggiorna documentazione CI con run del 05/12/2025

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T00:20:39Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1178

> ## Summary
> - Allinea la sezione Stato attuale e l’ordine di abilitazione CI con i risultati dei run del 05/12/2025, includendo gate enforcing/consultivi e KO aperti.
> - Aggiorna l’inventario CI con gli esiti 05/12/2025, i workflow monitorati aggiuntivi (QA export/reports, deploy-test-interface, HUD, evo-batch) e le azioni aperte con owner/trigger.
> ## Testing
> - not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693374dd055883289dd8911058304103)

## #1179 — Aggiorna inventario workflow CI

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T00:44:54Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1179

> ## Summary
> - aggiorna la tabella degli stati run con gli esiti più recenti e i link ai log archiviati
> - riallinea il semaforo go-live e le azioni aperte ai blocchi effettivi
> - elenca i workflow ancora privi di log con riferimento alla procedura di recupero
> ## Testing
> - Non eseguiti (aggiornamento documentazione)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693378fe1df483289576b118fca97c1c)

## #1180 — Document CI workflow follow-ups

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T01:03:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1180

> ## Summary
> - update the CI inventory with current status for incoming-smoke, qa-export, HUD, and evo-batch workflows including manual rerun plans
> - log the follow-up outcomes and scheduling decisions in logs/agent_activity.md
> ## Testing
> - not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69337c91e6a88328b786be09a93be08d)

## #1182 — Update validate naming latest run date

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T01:33:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1182

> ## Summary
> - update the CI inventory entry for validate-naming to reflect the latest logged run date
> ## Testing
> - not run (docs only change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693386b7a04883289e1d616fb7cfff8f)

## #1183 — Allinea riferimenti CI ai run più recenti

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T01:38:59Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1183

> ## Summary
> - aggiorna lo stato corrente di REF_TOOLING_AND_CI con i run più recenti e le note di rollback post 05/12/2025
> - riallinea l'ordine di abilitazione CI ai log fino al 06/12/2025 mantenendo le azioni aperte e i guardrail
> - estende in ci-inventory le azioni aperte includendo opzioni di rollback consultivo e il gate validate-naming
> ## Testing
> - not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693387daf56c83289189b0c0575077cc)

## #1184 — Add CI log harvesting script and automation guide

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T02:34:16Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1184

> ## Summary
> - add a dedicated CI log automation guide with workflow triggers, destinations, and command examples
> - introduce a reusable ci_log_harvest.sh wrapper plus Makefile target to pull latest run artifacts
> - document config options for manual workflows and default coverage
> ## Testing
> - ⚠️ `scripts/ci_log_harvest.sh --help` (fails locally because `gh` is not installed in the environment)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693389840f00832895d7aeee7b8a5fa5)

## #1185 — Add GitHub CLI setup guidance and ci-log-harvest reminder

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T02:39:18Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1185

> ## Summary
> - add GitHub CLI requirement with install commands and PAT scope notes to the main setup guide
> - provide a quick-install block for GitHub CLI in the CI log automation prerequisites
> - remind the ci-log-harvest target to install/authenticate gh when missing
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69339605030c8328ade31aa9c5b360fc)

## #1186 — Update CI inventory status

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T12:23:47Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1186

> ## Summary
> - refresh CI inventory with recent workflow retry outcomes and log references
> - align tooling/CI status and enablement order with latest documented runs
> ## Testing
> - not run (documentation only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69341ee6f3108328bb6ef55e74503a01)

## #1187 — Update CI inventory with latest workflow runs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T12:41:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1187

> ## Summary
> - Archived the latest run pages for CI, E2E, data-quality, schema-validate, validate-traits, and validate-naming workflows into `logs/ci_runs/`.
> - Updated `docs/planning/ci-inventory.md` with current run dates/results and noted log download limitations and rerun needs.
> - Refreshed go-live semaphore/actions to highlight new PASS/FAIL states for critical workflows.
> ## Testing
> - Not run (documentation and log archiving only).
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69342133944883289e950174b27e900c)

## #1188 — Enhance CI log harvesting with PAT archive support

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T12:55:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1188

> ## Descrizione
> - aggiunto supporto per PAT con permessi workflow/read:org e repo admin nello script di raccolta log, usando variabili CI_LOG_PAT/LOG_HARVEST_PAT come sorgente del token
> - estesa la raccolta per salvare pagina HTML, archivio log zip e artefatti (estratti + zip) per ogni run, includendo destinazioni visual e incoming
> - aggiornati riferimenti documentali e il target Makefile per riflettere il nuovo requisito di secret e i percorsi di download
> ## Testing
> - bash -n scripts/ci_log_harvest.sh
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6934250992088328af2882b003302d5c)

## #1189 — Improve artifact archive detection in ci_log_harvest

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T13:21:52Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1189

> ## Summary
> - detect the artifact archive filename produced by `gh run download --archive` instead of assuming `run.zip`
> - rename the downloaded archive to the workflow- and run-specific filename after locating it
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69342d0fd21c8328aea735402abd3490)

## #1190 — Fix gh run id extraction in ci log harvest

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T13:26:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1190

> ## Summary
> - use `gh run list --jq` to fetch the latest run databaseId without scientific notation in manual wait flow
> - parse run info with jq/TSV output to preserve raw databaseId while retaining status and conclusion fields
> - adjust parsing to read tab-separated fields without altering the run identifier
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69342e69fc8c8328bfaea467bdb02572)

## #1191 — Add gh api output fallback for ci log harvest

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T13:56:10Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1191

> ## Summary
> - add compatibility logic for downloading logs when `gh api` lacks `--output`
> - ensure log downloads use the zip accept header and fallback to stdout redirection
> ## Testing
> - bash -n scripts/ci_log_harvest.sh
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6934357b5de08328a9c01e25370de32d)

## #1192 — Add log harvester workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T14:18:14Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1192

> ## Descrizione
> - Aggiunto workflow `log-harvester.yml` schedulato e manuale che recupera l’ultimo run dei workflow in inventario, scarica log/artefatti nelle cartelle esistenti e crea un branch con commit e artifact opzionale quando sono presenti nuovi file.
> ## Checklist guida stile & QA
> - [ ] N/A (nessuna modifica a dati o file soggetti al freeze)
> - [ ] N/A (validator di release non toccato)
> - [ ] N/A (approvazione Master DD non richiesta per questo change)
> - [ ] N/A (nessun changelog o rollback 03A richiesto)
> - [ ] N/A (nessuna nuova chiave i18n)
> - [ ] N/A (nessuna modifica a tier/slot)
> - [ ] N/A (requisiti ambientali/flag completamento invariati)

## #1193 — Document log harvester workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T14:26:18Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1193

> ## Summary
> - add CI inventory entry for the log-harvester workflow with triggers, permissions, outputs, and cadence
> - note how harvester updates statuses in run/traffic-light sections for non-dispatch and manual workflows
> - include harvester maintenance and token-permission review in the open actions checklist
> ## Testing
> - not run (documentation-only change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69343b35e2ac83289cc00eed5e82d0d0)

## #1194 — Add log harvester artifact archive

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T14:38:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1194

> ## Summary
> - add a packaging step to zip harvested logs with a date-based name and publish as an artifact
> - document the new artifact naming, location, and 14-day retention in the CI inventory
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69343d11487c8328bdd213871562b1cd)

## #1195 — Update CI inventory with remediation steps for failing workflows

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-06T14:42:05Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1195

> ## Summary
> - add remediation guidance to go-live semaphore for failing and warning workflows
> - document rerun commands, owners, prerequisites, log locations, and timelines for failing workflows and QA suite
> ## Testing
> - not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69343ff570308328a7bebfb578fae668)
