# Daily PR Summary — 2025-12-05

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#1152](https://github.com/MasterDD-L34D/Game/pull/1152) | Add validation checklist for migration phase 4 | @MasterDD-L34D | 2025-12-05T00:48:49Z |
| [#1153](https://github.com/MasterDD-L34D/Game/pull/1153) | Add verification memo and log entry | @MasterDD-L34D | 2025-12-05T00:56:56Z |
| [#1154](https://github.com/MasterDD-L34D/Game/pull/1154) | Update staging redirect plan and smoke report | @MasterDD-L34D | 2025-12-05T10:11:03Z |
| [#1155](https://github.com/MasterDD-L34D/Game/pull/1155) | Add staging rollback runbook and log simulation | @MasterDD-L34D | 2025-12-05T10:21:25Z |
| [#1156](https://github.com/MasterDD-L34D/Game/pull/1156) | Record staging redirect smoke rerun | @MasterDD-L34D | 2025-12-05T11:04:59Z |
| [#1157](https://github.com/MasterDD-L34D/Game/pull/1157) | Align redirect backups to archive-less policy | @MasterDD-L34D | 2025-12-05T11:57:17Z |
| [#1158](https://github.com/MasterDD-L34D/Game/pull/1158) | Update validator audit and rerun engine scan | @MasterDD-L34D | 2025-12-05T12:10:17Z |
| [#1159](https://github.com/MasterDD-L34D/Game/pull/1159) | Log staging redirect smoke test pass | @MasterDD-L34D | 2025-12-05T12:43:45Z |
| [#1160](https://github.com/MasterDD-L34D/Game/pull/1160) | Record 2026-09-16 redirect smoke PASS | @MasterDD-L34D | 2025-12-05T13:52:07Z |
| [#1161](https://github.com/MasterDD-L34D/Game/pull/1161) | Add Evo-Tactics archive snapshots | @MasterDD-L34D | 2025-12-05T14:36:55Z |
| [#1162](https://github.com/MasterDD-L34D/Game/pull/1162) | Restore archived PTPF template content | @MasterDD-L34D | 2025-12-05T14:40:52Z |
| [#1163](https://github.com/MasterDD-L34D/Game/pull/1163) | Restore archived Security & Ops playbook content | @MasterDD-L34D | 2025-12-05T14:44:01Z |
| [#1164](https://github.com/MasterDD-L34D/Game/pull/1164) | Restore archived Visione & Struttura guide content | @MasterDD-L34D | 2025-12-05T14:50:22Z |
| [#1165](https://github.com/MasterDD-L34D/Game/pull/1165) | Fix Husky install script for ESM modules | @MasterDD-L34D | 2025-12-05T15:34:06Z |
| [#1166](https://github.com/MasterDD-L34D/Game/pull/1166) | Aggiorna inventario CI con tentativi manuali bloccati | @MasterDD-L34D | 2025-12-05T18:46:59Z |
| [#1168](https://github.com/MasterDD-L34D/Game/pull/1168) | Update GH CLI manual dispatch guide | @MasterDD-L34D | 2025-12-05T20:15:00Z |
| [#1169](https://github.com/MasterDD-L34D/Game/pull/1169) | Aggiorna guida per dispatch manuale con gh CLI | @MasterDD-L34D | 2025-12-05T20:51:45Z |
| [#1170](https://github.com/MasterDD-L34D/Game/pull/1170) | Update manual dispatch workflow guidance | @MasterDD-L34D | 2025-12-05T20:54:56Z |
| [#1171](https://github.com/MasterDD-L34D/Game/pull/1171) | Update GitHub CLI manual dispatch docs | @MasterDD-L34D | 2025-12-05T21:49:19Z |
| [#1172](https://github.com/MasterDD-L34D/Game/pull/1172) | Clarify manual dispatch guidance in CI inventory | @MasterDD-L34D | 2025-12-05T22:06:37Z |
| [#1173](https://github.com/MasterDD-L34D/Game/pull/1173) | Update gh CLI manual dispatch guide with correct scopes and workflows | @MasterDD-L34D | 2025-12-05T22:44:19Z |
| [#1174](https://github.com/MasterDD-L34D/Game/pull/1174) | Sincronizza ci-inventory con guida dispatch manuale | @MasterDD-L34D | 2025-12-05T23:32:58Z |
| [#1175](https://github.com/MasterDD-L34D/Game/pull/1175) | Log RIAPERTURA-2025-02 and sync incoming freeze notes | @MasterDD-L34D | 2025-12-05T23:36:56Z |
| [#1176](https://github.com/MasterDD-L34D/Game/pull/1176) | Update CI inventory with latest run status and retries | @MasterDD-L34D | 2025-12-05T23:46:53Z |

## #1152 — Add validation checklist for migration phase 4

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T00:48:49Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1152

> ## Descrizione
> - Aggiunta una sezione di checklist per la fase 4 di validazione che collega report, mapping e decisioni di gate con owner e scadenze.
> - Inclusi riferimenti a dataset e script per assicurare tracciabilità e ripetibilità dei report.
> ## Checklist guida stile & QA
> - [ ] Nessuna modifica a `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**` nella finestra freeze 2025-11-25T12:05Z–2025-11-27T12:05Z (salvo rollback autorizzati Master DD)
> - [ ] Validator di release **PASS senza regressioni** (allega percorso report). Il merge rimane bloccato finché esistono regressioni aperte nel validator
> - [ ] Approvazione **Master DD** registrata (link a commento/issue che conferma l'ok al merge)
> - [ ] Changelog allegato alla PR e **piano di rollback 03A** incluso (link o allegato nella sezione Note)
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa

## #1153 — Add verification memo and log entry

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T00:56:56Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1153

> ## Summary
> - add a memo summarizing recent verification outcomes, open risks, and report-only commands
> - log the memo and related tickets in the activity log for owner approvals
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69322c09b8ac8328954fe4958e7c2dbc)

## #1154 — Update staging redirect plan and smoke report

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T10:11:03Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1154

> ## Summary
> - add validation note for 2025-12-05 smoke rerun and mapping ownership links in staging plan
> - refresh latest smoke test timestamp and status in redirect plan documentation
> - regenerate redirect smoke report for staging with PASS results
> ## Testing
> - python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932ade4cd488328bf676ed6cf17c28a)

## #1155 — Add staging rollback runbook and log simulation

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T10:21:25Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1155

> ## Summary
> - add detailed staging rollback guidance with manifest and checksum references for ticket #1206
> - record staging rollback simulation and post-restore smoke test, updating ticket #1206 status to Ready
> ## Testing
> - not run (documentation changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932afbf4c288328a56878b3603b4400)

## #1156 — Record staging redirect smoke rerun

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T11:04:59Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1156

> ## Summary
> - capture the latest staging redirect smoke rerun with relative Location headers recorded in the report
> - log the rerun details and notes (host, listener restart, ticket references) in agent activity history
> ## Testing
> - python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932b41622a08328be92a7b1eabc274b)

## #1157 — Align redirect backups to archive-less policy

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T11:57:17Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1157

> ## Summary
> - switch the redirect staging plan to the archive-less policy, updating approval states and instructions for tickets #1203/#1206
> - log the archive-less verification outcome and add textual inventories with deterministic hashes for redirect-config and freeze 03A/03B
> - update both manifests to point to the new inventory files and smoke-based verification steps instead of tar/zip artifacts
> ## Testing
> - Not run (documentation-only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932bc6783c88328be9ebbf522e1b7ba)

## #1158 — Update validator audit and rerun engine scan

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T12:10:17Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1158

> ## Summary
> - log the confirmed TKT-01B-001 sanitized dump and update the validator audit with the recovered v1.5 pack checksum
> - refresh the engine identifier scan after the event-map v2.3 rebase
> - record the activities in the agent activity log
> ## Testing
> - sha256sum reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv
> - sha256sum incoming/evo-tactics-validator-pack-v1.5.zip
> - python incoming/scan_engine_idents.py --root incoming --out reports/temp/engine_ids/incoming_scan.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932c8a5d2f88328836400befc38a8e0)

## #1159 — Log staging redirect smoke test pass

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T12:43:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1159

> ## Summary
> - record the successful staging redirect smoke test with listener restart details
> - note gate 03B unlocked after passing run covering tickets #1204/#1205/#1206
> ## Testing
> - python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932d1925bfc83289f037c93fb256b53)

## #1160 — Record 2026-09-16 redirect smoke PASS

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T13:52:07Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1160

> ## Summary
> - reran the staging redirect smoke test on http://localhost:8000, capturing a PASS report/log and attaching it to the redirect plan
> - refreshed REF_REDIRECT_PLAN_STAGING to anchor on the 2026-09-16 PASS baseline and reopen tickets #1204/#1205/#1206 with fallback and archive-less policies unchanged
> - logged the new rerun in agent_activity and updated mapping/approval tables to reflect the unblocked gates
> ## Testing
> - python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932dbfbda8c8328988d23053d12d232)

## #1161 — Add Evo-Tactics archive snapshots

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T14:36:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1161

> ## Summary
> - add archived copies of the Evo-Tactics guides and integration docs with preserved frontmatter
> - update the Evo-Tactics hub to link to the new archive locations
> - refresh the archive inventory to list the new historical documents
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932ea55f1248328b44ffaa7ab5cb8b1)

## #1162 — Restore archived PTPF template content

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T14:40:52Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1162

> ## Summary
> - restore the pre-ROL-03 PTPF template content into the archived guide while keeping the existing frontmatter
> - ensure the archived template retains all checklist and reference sections for Evo-Tactics workflows
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932ee0f02248328a223436a0ce49cde)

## #1163 — Restore archived Security & Ops playbook content

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T14:44:01Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1163

> ## Descrizione
> - Ripristinato il testo completo del playbook Security & Ops nell’archivio Evo-Tactics utilizzando lo snapshot disponibile, mantenendo il frontmatter con `archived: true`.
> ## Checklist guida stile & QA
> - [ ] Nessuna modifica a `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**` nella finestra freeze 2025-11-25T12:05Z–2025-11-27T12:05Z (salvo rollback autorizzati Master DD)
> - [ ] Validator di release **PASS senza regressioni** (allega percorso report). Il merge rimane bloccato finché esistono regressioni aperte nel validator
> - [ ] Approvazione **Master DD** registrata (link a commento/issue che conferma l'ok al merge)
> - [ ] Changelog allegato alla PR e **piano di rollback 03A** incluso (link o allegato nella sezione Note)
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati

## #1164 — Restore archived Visione & Struttura guide content

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T14:50:22Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1164

> ## Summary
> - Restore the archived Evo-Tactics Visione & Struttura guide using the inventory snapshot content while preserving the archived frontmatter.
> ## Testing
> - Not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932efbceb9c83289e23f6d7697327e2)

## #1165 — Fix Husky install script for ESM modules

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T15:34:06Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1165

> ## Summary
> - add a dynamic `import()` fallback in `scripts/husky-install.cjs` so Husky installs when the package is ESM-only
> - keep install helper detection and warnings intact to avoid skipped hook setup
> ## Testing
> - npm ci
> - npm run docs:lint
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932f1424a1c8328a3e675aec80da610)

## #1166 — Aggiorna inventario CI con tentativi manuali bloccati

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T18:46:59Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1166

> ## Summary
> - Documented the 2025-12-05 manual dispatch attempts for all workflows con log assente, evidenziando il blocco per assenza di gh/credenziali
> - Aggiornate le note e il semaforo go-live per i workflow critici coerentemente con i tentativi non eseguiti
> ## Testing
> - Not run (documentazione)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932e66ded188328bd27b7ec4438dfdf)

## #1168 — Update GH CLI manual dispatch guide

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T20:15:00Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1168

> ## Summary
> - add documentation for running workflow_dispatch jobs via GitHub CLI with updated PAT scopes
> - provide PowerShell loop covering only dispatchable workflows and an evo-batch example with required inputs
> - note schema-validate limitations and operational reminders for PAT removal and native triggers
> ## Testing
> - Not run (documentation change only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69333c35e8508328bc441ed4336aede3)

## #1169 — Aggiorna guida per dispatch manuale con gh CLI

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T20:51:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1169

> ## Summary
> - aggiorna i prerequisiti del PAT includendo lo scope read:org con nota SSO
> - sostituisce il ciclo PowerShell con l'elenco dei workflow con trigger workflow_dispatch
> - aggiunge esempi separati per workflow con input obbligatori e il richiamo al download dei log
> ## Testing
> - non eseguiti (documentazione)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693344faf7988328bb076b6680eac0c4)

## #1170 — Update manual dispatch workflow guidance

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T20:54:56Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1170

> ## Summary
> - document the required PAT scope and SSO note for manual GitHub workflow dispatches
> - update the workflow-dispatch list and provide a PowerShell loop for workflows without required inputs
> - retain separate guidance for workflows with mandatory inputs and reminders to download logs
> ## Testing
> - Not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693345edfdac83288adf87c5f5319872)

## #1171 — Update GitHub CLI manual dispatch docs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T21:49:19Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1171

> ## Summary
> - clarify PAT requirements for manual workflow dispatch via GitHub CLI
> - limit PowerShell dispatch loop to workflows with workflow_dispatch and provide example for required inputs
> - add reminder on listing and downloading run logs replacing placeholders
> ## Testing
> - not run (documentation-only change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69334d735ac4832896f597ed6e9fe29a)

## #1172 — Clarify manual dispatch guidance in CI inventory

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T22:06:37Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1172

> ## Summary
> - clarify that manual dispatch via GitHub CLI should target workflow_dispatch workflows and include required inputs
> - note PAT scope read:org with potential SSO authorization when triggering runs manually
> - add reminder to list and download run logs via gh CLI replacing placeholders
> ## Testing
> - not run (documentation-only change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69334d735ac4832896f597ed6e9fe29a)

## #1173 — Update gh CLI manual dispatch guide with correct scopes and workflows

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T22:44:19Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1173

> ## Summary
> - add read:org PAT prerequisite and note about SSO authorization
> - update PowerShell dispatch loop to only include workflows with workflow_dispatch and separate required-input example
> - document how to fetch run logs/artifacts with gh CLI using real run IDs
> ## Testing
> - not run (documentation only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_693328adc4108328a4452e64a706aa3a)

## #1174 — Sincronizza ci-inventory con guida dispatch manuale

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T23:32:58Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1174

> ## Summary
> - Allineata la tabella dei workflow privi di log indicando quando usare workflow_dispatch e quando ricorrere a push/PR, in coerenza con la guida PowerShell.
> - Aggiornate le istruzioni della sezione "Log ancora assenti" per rimandare ai passi standard della guida e al repository/branch corretti.
> ## Testing
> - Not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_6932e66ded188328bd27b7ec4438dfdf)

## #1175 — Log RIAPERTURA-2025-02 and sync incoming freeze notes

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T23:36:56Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1175

> ## Summary
> - loggato il checkpoint RIAPERTURA-2025-02 con freeze window 2025-10-06→2025-10-13 e kickoff 01A/01B/01C
> - sincronizzati i README incoming con lo sblocco della finestra, gap list 01A chiusa e rischi residui monitorati
> ## Testing
> - n/a
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69336bbec580832886e057e5102f8920)

## #1176 — Update CI inventory with latest run status and retries

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-12-05T23:46:53Z
- Link: https://github.com/MasterDD-L34D/Game/pull/1176

> ## Summary
> - refresh the CI inventory table with latest available logs, planned retry dates, and links
> - update go-live traffic-light guidance for critical workflows based on current coverage
> - consolidate guidance for missing logs using the manual dispatch playbook
> ## Testing
> - not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69336d1268a88328acadc4f55943b4c5)
