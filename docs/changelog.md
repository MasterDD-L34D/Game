# Changelog

## [Unreleased]

### Added

- Quick start/indice rapido in `AGENTS.md` per mappare i documenti di boot
  (obbligatori vs opzionali) e ridurre la lettura distribuita.
- Trait reference aggiornato (`docs/catalog/trait_reference.md`) con mappatura
  glossario IT/EN e workflow di sincronizzazione.
- Guida operativa aggiornata per autori di trait
  (`README_HOWTO_AUTHOR_TRAIT.md`) e report generato da
  `tools/py/collect_trait_fields.py --glossary-output`.
- Estensioni agli script `scripts/sync_trait_locales.py` e
  `tools/py/collect_trait_fields.py` per propagare label/description approvate
  nelle localizzazioni.
- Trait metadata (`species_affinity`, `usage_tags`, `completion_flags`) now exposed across catalog loaders, generators e servizi API, con test automatici aggiornati.
- Piano di rollout trait (`docs/process/trait_rollout_plan.md`) con fasi, checklist e calendario versioni condivisi con i team coinvolti.
- Calendario training per il team di gioco e canali di monitoraggio dedicati (`#trait-rollout`, report settimanali).
- Appendice sandbox draft (`docs/appendici/sandbox/README.md`) con collegamenti ai concept narrativi e agli hook di trait/bilanciamento.
- Nota di chiusura post-merge (2025-12-03, owner archivist) per la triade Frattura Abissale su `main`, con log PASS `reports/temp/main/frattura_abissale_pipeline_20251203T031847Z.log`/`frattura_abissale_pipeline_20251203T032252Z.log`, manifest di backup `reports/backups/2025-11-25_freeze/manifest.txt` e `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, e prove di restore/dry-run documentate in `reports/audit/2025-12-02_frattura_abissale_validators.md`.

### Changed

- Documenti di boot (`.ai/BOOT_PROFILE.md`, `agent.md`, `router.md`,
  `docs/COMMAND_LIBRARY.md`) aggiornati con rinvio esplicito al quick start e
  con note sui contenuti opzionali.
- Template trait, guida contributiva e processo di localizzazione aggiornati per
  includere glossario e checklist sincronizzata.
- Note di rilascio aggiornate con canali di comunicazione e monitoraggio post-rollout, includendo reminder per `docs/publishing_calendar.md`.
- Guida Evo Tactics Pack v2: verificati campi obbligatori con la scheda operativa, ribadita opzionalità di `metrics`/`cost_profile`/`testability`, esempi sinergie/conflitti aggiornati con `id` repository e promemoria mapping.
- Reference tooling/CI (`docs/planning/REF_TOOLING_AND_CI.md`) aggiornata (owner Master DD., riferimento 03A) con mappa workflow/validatori core ↔ pack e checklist 02A (schema-checker, lint dati, rigenerazione pack simulata) senza modifiche ai workflow.
- Indici DOC-02 e 00-INDEX aggiornati con collegamenti alla nuova appendice sandbox e ai concept narrativi in iterazione.

### Fixed

- _Nessuna voce._

### Known Issues

- _Nessuno segnalato._

## [2025-12-17] Repository SSoT & Pack mapping 0.3

### Added

- Reference sorgenti di verità (`docs/planning/REF_REPO_SOURCES_OF_TRUTH.md`) con tabella dei percorsi canonici per trait/specie/biomi/ecosistemi e criteri core vs derived allineati a schema ALIENA/UCUM.
- Mappa sintetica core → derived/pack (`docs/planning/REF_PACKS_AND_DERIVED.md`) con gap noti e script/tool già in repo per la rigenerazione standard (input core → output pack/fixture).

### Changed

- Regola standard di rigenerazione pack/fixture aggiornata per esplicitare dipendenze da `scripts/update_evo_pack_catalog.js`, tool Python `derive_*` e validator pack (`run_all_validators.py`) con step pre-check e gating.
- Collegamento esplicito dei prerequisiti di governance ai patchset **01A – Catalogo incoming** e **02A – Tooling di validazione** per assicurare input canonici e validator in CI.

## [2025-12-06] HUD Smart Alerts & SquadSync bridge

### Added

- Dashboard canary HUD (`tools/feedback/hud_canary_dashboard.yaml`) collegata al canale `#feedback-enhancements` e ai mock aggiornati.
- Tutorial rapidi per overlay HUD (`docs/tutorials/hud-overlay-quickstart.md`) e adaptive engine SquadSync (`docs/tutorials/adaptive-engine-quickstart.md`).
- Mock aggiornati per HUD Smart Alerts e SquadSync (`assets/hud/overlay/mock-timeline.svg`, `assets/analytics/squadsync_mock.svg`) integrati in Canvas e README.

### Changed

- README e Canvas aggiornati con la sezione "Sync HUD · dicembre 2025" e riferimenti incrociati a dashboard, changelog e routing Slack.
- `tools/feedback/form_config.yaml` e `tools/feedback/collection_pipeline.yaml` estesi per la pipeline canary e le nuove cadence di sync.

### Fixed

- Allineamento dei link dashboard/documentazione per gli owner feedback, evitando riferimenti obsoleti al canale `#feedback-intake`.

### Known Issues

- In corso la validazione dei cron canary (`config/jobs/hud_canary.yaml`) per assicurare refresh puntuali sopra i 10 minuti.

## [2025-12-02] Feedback & Tutorial boost

### Added

- Tutorial rapidi con schede SVG dedicate per CLI, Idea Engine e dashboard (`docs/tutorials/*`, `assets/tutorials/*`).
- Integrazione del changelog nel `README.md` e nelle pagine indice dei documenti.
- Canale Slack `#feedback-enhancements` collegato alle procedure di QA rapida.

### Changed

- Modulo feedback dell'Idea Engine ora visibile anche senza API configurata, con fallback su Slack e template aggiornato.
- `docs/public/embed.js` supporta il canale Slack configurabile e messaggi guida aggiornati.

### Fixed

- Documentazione principale aggiornata con link coerenti verso tutorial e changelog.

### Known Issues

- In attesa di nuove PR giornaliere per popolare la sezione "Unreleased".

### Riepilogo PR giornalieri

<!-- daily-pr-summary:start -->
- **2025-12-16** — Nessun merge registrato.
- **2025-12-15** — Nessun merge registrato.
- **2025-12-14** — Nessun merge registrato.
- **2025-12-13** — Nessun merge registrato.
- **2025-12-12** — Nessun merge registrato.
- **2025-12-11** — Nessun merge registrato.
- **2025-12-10** — Nessun merge registrato.
- **2025-12-09** — [#1229](https://github.com/MasterDD-L34D/Game/pull/1229) Add light boot profile for low-risk tasks; [#1230](https://github.com/MasterDD-L34D/Game/pull/1230) Add severity-based workflow guidance; [#1231](https://github.com/MasterDD-L34D/Game/pull/1231) Document default-coordinator mode in router; [#1232](https://github.com/MasterDD-L34D/Game/pull/1232) Add boot cheat sheet prompts; [#1233](https://github.com/MasterDD-L34D/Game/pull/1233) Clarify patch confirmation guidance; [#1234](https://github.com/MasterDD-L34D/Game/pull/1234) Clarify confirmation flow for plans; [#1235](https://github.com/MasterDD-L34D/Game/pull/1235) Add quick start index for agent boot docs; [#1236](https://github.com/MasterDD-L34D/Game/pull/1236) Document fast path policy for command confirmations; [#1237](https://github.com/MasterDD-L34D/Game/pull/1237) Clarify routing escalation guidance; [#1238](https://github.com/MasterDD-L34D/Game/pull/1238) Add agent workflow telemetry logging and analysis; [#1239](https://github.com/MasterDD-L34D/Game/pull/1239) Add guidance for simple-task mini pipeline; [#1240](https://github.com/MasterDD-L34D/Game/pull/1240) Clarify strict-mode handling for info-only requests; [#1241](https://github.com/MasterDD-L34D/Game/pull/1241) Log pre-meeting 01A e ripristino branch report-only; [#1242](https://github.com/MasterDD-L34D/Game/pull/1242) Document QA suite runs and visual regression failure; [#1243](https://github.com/MasterDD-L34D/Game/pull/1243) Log sync agenda PATCHSET-00; [#1244](https://github.com/MasterDD-L34D/Game/pull/1244) Log checklist riapertura 48h e sync README incoming; [#1245](https://github.com/MasterDD-L34D/Game/pull/1245) Document readiness 01B/01C and CI inventory links; [#1246](https://github.com/MasterDD-L34D/Game/pull/1246) Log kickoff agenda sync for PATCHSET-00; [#1247](https://github.com/MasterDD-L34D/Game/pull/1247) Update RIAPERTURA gate closure and readiness notes; [#1248](https://github.com/MasterDD-L34D/Game/pull/1248) Add workflow_dispatch to data-quality workflow; [#1249](https://github.com/MasterDD-L34D/Game/pull/1249) Enable manual dispatch for validate_traits workflow; [#1250](https://github.com/MasterDD-L34D/Game/pull/1250) Add workflow_dispatch trigger to data-quality workflow; [#1251](https://github.com/MasterDD-L34D/Game/pull/1251) Enable manual dispatch for validate_traits workflow; [#1252](https://github.com/MasterDD-L34D/Game/pull/1252) Align ali_solari_fotoni label with i18n; [#1253](https://github.com/MasterDD-L34D/Game/pull/1253) Align ali_solari_fotoni trait with i18n refs; [#1254](https://github.com/MasterDD-L34D/Game/pull/1254) Add Italian localization for traits_aggregate; [#1255](https://github.com/MasterDD-L34D/Game/pull/1255) Remove unused update-evo-tracker workflow; [#1256](https://github.com/MasterDD-L34D/Game/pull/1256) Allinea i18n per traits_aggregate; [#1257](https://github.com/MasterDD-L34D/Game/pull/1257) Fix trait synergy reciprocity; [#1258](https://github.com/MasterDD-L34D/Game/pull/1258) Fix status report script imports; [#1259](https://github.com/MasterDD-L34D/Game/pull/1259) Fix MongoDB migration guard in deploy workflow; [#1260](https://github.com/MasterDD-L34D/Game/pull/1260) Stabilize squadsync adaptive filtering clock; [#1261](https://github.com/MasterDD-L34D/Game/pull/1261) Restore Evo Tactics species inventory resources; [#1262](https://github.com/MasterDD-L34D/Game/pull/1262) Add schema metadata defaults for evo tactics species; [#1263](https://github.com/MasterDD-L34D/Game/pull/1263) Use affinity map to fill missing trait coverage; [#1264](https://github.com/MasterDD-L34D/Game/pull/1264) Allow disabling orchestrator metrics when prom-client is absent; [#1265](https://github.com/MasterDD-L34D/Game/pull/1265) Handle lint-stack diff fallback; [#1266](https://github.com/MasterDD-L34D/Game/pull/1266) Handle missing Playwright console tests; [#1267](https://github.com/MasterDD-L34D/Game/pull/1267) Populate rollout report and fix trait baseline; [#1269](https://github.com/MasterDD-L34D/Game/pull/1269) Fix orchestrator worker path and refresh QA reports; [#1271](https://github.com/MasterDD-L34D/Game/pull/1271) Handle snapshot size mismatches gracefully; [#1272](https://github.com/MasterDD-L34D/Game/pull/1272) Improve test fallbacks for idea and trait APIs; [#1270](https://github.com/MasterDD-L34D/Game/pull/1270) Handle snapshot size mismatches gracefully; [#1268](https://github.com/MasterDD-L34D/Game/pull/1268) Fix orchestrator worker path and refresh QA reports; [#1273](https://github.com/MasterDD-L34D/Game/pull/1273) Add dashboard data source config and Vue plugin; [#1274](https://github.com/MasterDD-L34D/Game/pull/1274) Refresh visual regression baselines; [#1275](https://github.com/MasterDD-L34D/Game/pull/1275) Update CI inventory with latest successful reruns; [#1276](https://github.com/MasterDD-L34D/Game/pull/1276) Clarify GH CLI auth when GH_TOKEN is set. [Report](chatgpt_changes/daily-pr-summary-2025-12-09.md)
- **2025-12-08** — [#1202](https://github.com/MasterDD-L34D/Game/pull/1202) Document blocked QA and smoke workflow dispatches; [#1203](https://github.com/MasterDD-L34D/Game/pull/1203) Document October 2025 freeze status and sync incoming notes; [#1204](https://github.com/MasterDD-L34D/Game/pull/1204) Document freeze manifest verification; [#1205](https://github.com/MasterDD-L34D/Game/pull/1205) Improve CI log harvesting coverage and PAT handling; [#1206](https://github.com/MasterDD-L34D/Game/pull/1206) Add gh bootstrap and dry-run support for ci log harvest; [#1208](https://github.com/MasterDD-L34D/Game/pull/1208) Remove binary CI log zips and add rehydration instructions; [#1209](https://github.com/MasterDD-L34D/Game/pull/1209) Refresh CI inventory after authenticated GH sweep; [#1210](https://github.com/MasterDD-L34D/Game/pull/1210) Clarify GH_TOKEN requirement for CI dispatches; [#1211](https://github.com/MasterDD-L34D/Game/pull/1211) Record QA workflow rerun status; [#1212](https://github.com/MasterDD-L34D/Game/pull/1212) Add logs for workflow dispatch attempts; [#1213](https://github.com/MasterDD-L34D/Game/pull/1213) Archive evo-batch dry-run failure logs; [#1214](https://github.com/MasterDD-L34D/Game/pull/1214) Add post-unfreeze sync draft and gate log; [#1215](https://github.com/MasterDD-L34D/Game/pull/1215) Document RIAPERTURA-2025-02 checklist verification; [#1216](https://github.com/MasterDD-L34D/Game/pull/1216) Add RIAPERTURA-2025-02 follow-up notes; [#1217](https://github.com/MasterDD-L34D/Game/pull/1217) Add RIAPERTURA-2025-02 readiness check log; [#1218](https://github.com/MasterDD-L34D/Game/pull/1218) Update freeze manifest references to current checksums; [#1219](https://github.com/MasterDD-L34D/Game/pull/1219) Add PATCHSET-00 kickoff agenda and gate log; [#1220](https://github.com/MasterDD-L34D/Game/pull/1220) Document PATCHSET-00 sync reaffirmation; [#1221](https://github.com/MasterDD-L34D/Game/pull/1221) Add pipeline 01A pre-meeting checklist; [#1222](https://github.com/MasterDD-L34D/Game/pull/1222) Log unfreeze and branch decisions for PATCHSET-00/01A; [#1223](https://github.com/MasterDD-L34D/Game/pull/1223) Document freeze check for pipeline 01A gate; [#1224](https://github.com/MasterDD-L34D/Game/pull/1224) Document PATCHSET-00 branch recreation; [#1225](https://github.com/MasterDD-L34D/Game/pull/1225) Log freeze status and on-call confirmations; [#1226](https://github.com/MasterDD-L34D/Game/pull/1226) Aggiorna note di triage 01A e log di riapertura; [#1227](https://github.com/MasterDD-L34D/Game/pull/1227) Log incoming holding check; [#1228](https://github.com/MasterDD-L34D/Game/pull/1228) Update 01C CI inventory and log links. [Report](chatgpt_changes/daily-pr-summary-2025-12-08.md)
- **2025-12-07** — [#1196](https://github.com/MasterDD-L34D/Game/pull/1196) Add kickoff entry for PATCHSET-00 routing 01A–01C; [#1197](https://github.com/MasterDD-L34D/Game/pull/1197) Log verifica holding e finestra freeze; [#1198](https://github.com/MasterDD-L34D/Game/pull/1198) Add postponement note to incoming gap review; [#1199](https://github.com/MasterDD-L34D/Game/pull/1199) Add readiness log entry for 01B/01C; [#1200](https://github.com/MasterDD-L34D/Game/pull/1200) Log 03AB backup manifest links for 01C; [#1201](https://github.com/MasterDD-L34D/Game/pull/1201) Fix data validation workflows and trait coverage. [Report](chatgpt_changes/daily-pr-summary-2025-12-07.md)
- **2025-12-06** — [#1177](https://github.com/MasterDD-L34D/Game/pull/1177) Document esito RIAPERTURA-2025-02 in planning checklist; [#1178](https://github.com/MasterDD-L34D/Game/pull/1178) Aggiorna documentazione CI con run del 05/12/2025; [#1179](https://github.com/MasterDD-L34D/Game/pull/1179) Aggiorna inventario workflow CI; [#1180](https://github.com/MasterDD-L34D/Game/pull/1180) Document CI workflow follow-ups; [#1182](https://github.com/MasterDD-L34D/Game/pull/1182) Update validate naming latest run date; [#1183](https://github.com/MasterDD-L34D/Game/pull/1183) Allinea riferimenti CI ai run più recenti; [#1184](https://github.com/MasterDD-L34D/Game/pull/1184) Add CI log harvesting script and automation guide; [#1185](https://github.com/MasterDD-L34D/Game/pull/1185) Add GitHub CLI setup guidance and ci-log-harvest reminder; [#1186](https://github.com/MasterDD-L34D/Game/pull/1186) Update CI inventory status; [#1187](https://github.com/MasterDD-L34D/Game/pull/1187) Update CI inventory with latest workflow runs; [#1188](https://github.com/MasterDD-L34D/Game/pull/1188) Enhance CI log harvesting with PAT archive support; [#1189](https://github.com/MasterDD-L34D/Game/pull/1189) Improve artifact archive detection in ci_log_harvest; [#1190](https://github.com/MasterDD-L34D/Game/pull/1190) Fix gh run id extraction in ci log harvest; [#1191](https://github.com/MasterDD-L34D/Game/pull/1191) Add gh api output fallback for ci log harvest; [#1192](https://github.com/MasterDD-L34D/Game/pull/1192) Add log harvester workflow; [#1193](https://github.com/MasterDD-L34D/Game/pull/1193) Document log harvester workflow; [#1194](https://github.com/MasterDD-L34D/Game/pull/1194) Add log harvester artifact archive; [#1195](https://github.com/MasterDD-L34D/Game/pull/1195) Update CI inventory with remediation steps for failing workflows. [Report](chatgpt_changes/daily-pr-summary-2025-12-06.md)
- **2025-12-05** — [#1152](https://github.com/MasterDD-L34D/Game/pull/1152) Add validation checklist for migration phase 4; [#1153](https://github.com/MasterDD-L34D/Game/pull/1153) Add verification memo and log entry; [#1154](https://github.com/MasterDD-L34D/Game/pull/1154) Update staging redirect plan and smoke report; [#1155](https://github.com/MasterDD-L34D/Game/pull/1155) Add staging rollback runbook and log simulation; [#1156](https://github.com/MasterDD-L34D/Game/pull/1156) Record staging redirect smoke rerun; [#1157](https://github.com/MasterDD-L34D/Game/pull/1157) Align redirect backups to archive-less policy; [#1158](https://github.com/MasterDD-L34D/Game/pull/1158) Update validator audit and rerun engine scan; [#1159](https://github.com/MasterDD-L34D/Game/pull/1159) Log staging redirect smoke test pass; [#1160](https://github.com/MasterDD-L34D/Game/pull/1160) Record 2026-09-16 redirect smoke PASS; [#1161](https://github.com/MasterDD-L34D/Game/pull/1161) Add Evo-Tactics archive snapshots; [#1162](https://github.com/MasterDD-L34D/Game/pull/1162) Restore archived PTPF template content; [#1163](https://github.com/MasterDD-L34D/Game/pull/1163) Restore archived Security & Ops playbook content; [#1164](https://github.com/MasterDD-L34D/Game/pull/1164) Restore archived Visione & Struttura guide content; [#1165](https://github.com/MasterDD-L34D/Game/pull/1165) Fix Husky install script for ESM modules; [#1166](https://github.com/MasterDD-L34D/Game/pull/1166) Aggiorna inventario CI con tentativi manuali bloccati; [#1168](https://github.com/MasterDD-L34D/Game/pull/1168) Update GH CLI manual dispatch guide; [#1169](https://github.com/MasterDD-L34D/Game/pull/1169) Aggiorna guida per dispatch manuale con gh CLI; [#1170](https://github.com/MasterDD-L34D/Game/pull/1170) Update manual dispatch workflow guidance; [#1171](https://github.com/MasterDD-L34D/Game/pull/1171) Update GitHub CLI manual dispatch docs; [#1172](https://github.com/MasterDD-L34D/Game/pull/1172) Clarify manual dispatch guidance in CI inventory; [#1173](https://github.com/MasterDD-L34D/Game/pull/1173) Update gh CLI manual dispatch guide with correct scopes and workflows; [#1174](https://github.com/MasterDD-L34D/Game/pull/1174) Sincronizza ci-inventory con guida dispatch manuale; [#1175](https://github.com/MasterDD-L34D/Game/pull/1175) Log RIAPERTURA-2025-02 and sync incoming freeze notes; [#1176](https://github.com/MasterDD-L34D/Game/pull/1176) Update CI inventory with latest run status and retries. [Report](chatgpt_changes/daily-pr-summary-2025-12-05.md)
- **2025-12-04** — [#1130](https://github.com/MasterDD-L34D/Game/pull/1130) Add redirect server for staging data paths; [#1131](https://github.com/MasterDD-L34D/Game/pull/1131) Add helper server for redirect smoke tests; [#1132](https://github.com/MasterDD-L34D/Game/pull/1132) Log redirect smoke test and refresh ticket notes; [#1133](https://github.com/MasterDD-L34D/Game/pull/1133) Log latest staging redirect smoke failure; [#1134](https://github.com/MasterDD-L34D/Game/pull/1134) Log derived fixture verification for matrix 01B; [#1135](https://github.com/MasterDD-L34D/Game/pull/1135) Document freeze rollback status and 02A readiness; [#1136](https://github.com/MasterDD-L34D/Game/pull/1136) Update redirect staging backup manifest and rollback notes; [#1137](https://github.com/MasterDD-L34D/Game/pull/1137) Align pending/borderline notes and log review; [#1138](https://github.com/MasterDD-L34D/Game/pull/1138) Align redirect smoke references and #1206 status; [#1140](https://github.com/MasterDD-L34D/Game/pull/1140) Log 01B kickoff confirmation for core/derived; [#1141](https://github.com/MasterDD-L34D/Game/pull/1141) Add 01C report-only kickoff handoff log; [#1142](https://github.com/MasterDD-L34D/Game/pull/1142) Log closure fixes for 01B/01C and update planning docs; [#1143](https://github.com/MasterDD-L34D/Game/pull/1143) Clarify redirect readiness baselines in planning docs; [#1144](https://github.com/MasterDD-L34D/Game/pull/1144) Add redirect smoke follow-up note; [#1145](https://github.com/MasterDD-L34D/Game/pull/1145) Reconcile redirect smoke references with latest runs; [#1146](https://github.com/MasterDD-L34D/Game/pull/1146) Update fixture verification and audit notes; [#1147](https://github.com/MasterDD-L34D/Game/pull/1147) Document gate 02A verification and guidance for 03A/03B; [#1148](https://github.com/MasterDD-L34D/Game/pull/1148) Log freeze 03A/03B check and manifest verification; [#1149](https://github.com/MasterDD-L34D/Game/pull/1149) Log redirect smoke review and gate status; [#1150](https://github.com/MasterDD-L34D/Game/pull/1150) Add phase 4 validation sandbox log; [#1151](https://github.com/MasterDD-L34D/Game/pull/1151) Add migration phase 5-7 planning logs. [Report](chatgpt_changes/daily-pr-summary-2025-12-04.md)
- **2025-12-03** — [#1097](https://github.com/MasterDD-L34D/Game/pull/1097) Update Evo rollout status from latest gap reports; [#1098](https://github.com/MasterDD-L34D/Game/pull/1098) Fix trait gap summary counts and regenerate report; [#1099](https://github.com/MasterDD-L34D/Game/pull/1099) Refresh Evo rollout gap data and status; [#1100](https://github.com/MasterDD-L34D/Game/pull/1100) Backfill trait coverage and regenerate analysis reports; [#1101](https://github.com/MasterDD-L34D/Game/pull/1101) Restore trait coverage descriptions and sync derived artifacts; [#1102](https://github.com/MasterDD-L34D/Game/pull/1102) Fix trait gap summary to reflect coverage data; [#1103](https://github.com/MasterDD-L34D/Game/pull/1103) Complete trait species affinity coverage; [#1104](https://github.com/MasterDD-L34D/Game/pull/1104) Regenerate rollout status after archive sync; [#1105](https://github.com/MasterDD-L34D/Game/pull/1105) Update weekly roadmap status for on-track rollout; [#1106](https://github.com/MasterDD-L34D/Game/pull/1106) Finalize 03A/03B checklist logging; [#1107](https://github.com/MasterDD-L34D/Game/pull/1107) Log Frattura Abissale triade rerun 2025-12-03T0322Z; [#1108](https://github.com/MasterDD-L34D/Game/pull/1108) Log backup manifest verification and blocked restore; [#1109](https://github.com/MasterDD-L34D/Game/pull/1109) Aggiorna checklist 03A/03B e log agenti; [#1110](https://github.com/MasterDD-L34D/Game/pull/1110) Update freeze 03A03B backup verification log; [#1111](https://github.com/MasterDD-L34D/Game/pull/1111) Update checklist log references and handoff note; [#1112](https://github.com/MasterDD-L34D/Game/pull/1112) Add post-merge triade closure and backup handoff; [#1113](https://github.com/MasterDD-L34D/Game/pull/1113) Validate generation snapshots before persisting; [#1114](https://github.com/MasterDD-L34D/Game/pull/1114) Update backup manifest verification log; [#1115](https://github.com/MasterDD-L34D/Game/pull/1115) Update backup manifests to zip format; [#1116](https://github.com/MasterDD-L34D/Game/pull/1116) Restore 2025-11-29 freeze archive verification; [#1117](https://github.com/MasterDD-L34D/Game/pull/1117) Add reproducible rebuild for 2025-11-25 freeze backups; [#1118](https://github.com/MasterDD-L34D/Game/pull/1118) Record backup rebuild verification; [#1119](https://github.com/MasterDD-L34D/Game/pull/1119) Log backup verification rerun for 2025-11-25 freeze; [#1120](https://github.com/MasterDD-L34D/Game/pull/1120) Document tar backup checksums for 2025-11-25 freeze; [#1121](https://github.com/MasterDD-L34D/Game/pull/1121) Log backup dry-run and gate blockers; [#1122](https://github.com/MasterDD-L34D/Game/pull/1122) Log validate-naming rerun and update CI inventory; [#1123](https://github.com/MasterDD-L34D/Game/pull/1123) Update staging redirect mapping and smoke test; [#1124](https://github.com/MasterDD-L34D/Game/pull/1124) Assign owner for lavoro_da_classificare catalog items; [#1125](https://github.com/MasterDD-L34D/Game/pull/1125) Update redirect mapping and smoke test defaults; [#1126](https://github.com/MasterDD-L34D/Game/pull/1126) Add 01B triage artifacts and derived fixtures; [#1127](https://github.com/MasterDD-L34D/Game/pull/1127) Update incoming triage and readiness records; [#1128](https://github.com/MasterDD-L34D/Game/pull/1128) Update redirect staging mapping and smoke test; [#1129](https://github.com/MasterDD-L34D/Game/pull/1129) Add rollback runbook and staging rollback simulation. [Report](chatgpt_changes/daily-pr-summary-2025-12-03.md)
<!-- daily-pr-summary:end -->

## [v0.6.0-rc1] - 2025-11-07

### Added

- Generatore VC potenziato con sintesi biomi procedurale, salvataggio filtri avanzati, timeline attività persistente e pannelli insight contestuali per condividere rapidamente i setup QA. Le esportazioni includono ora anteprime JSON/YAML e azioni rapide per dossier/ZIP.
- Instrumentazione HUD risk alert consolidata: pipeline EMA → HUD → canale `pi.balance.alerts` con log dedicato e metriche risk/cohesion pronte per il pacchetto comunicazione `v0.6.0-rc1` (nuovi asset Canvas HUD inclusi).【F:docs/Canvas/feature-updates.md†L9-L23】
- Automazione operativa alimentata dai report PR giornalieri: workflow `daily-pr-summary`, guida CLI/Smoke aggiornata, checklist marketing/prodotto sincronizzata e note Canvas/roadmap derivate automaticamente.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/piani/roadmap.md†L72-L109】
- Aggiornamenti dati e documentazione: allineamento trait PI ↔ environment registry, curva budget PI/telemetry ribilanciata e nuova documentazione playtest/roadmap per il RC di novembre 2025.【F:docs/checklist/project-setup-todo.md†L61-L109】【F:docs/playtest/SESSION-2025-11-12.md†L1-L76】

### Changed

- Allineamento 2025-11-07: follow-up HUD overlay telemetrico (UI Systems — F. Conti), progressione Cipher PROG-04 (Progression Design — L. Serra) e contrasto EVT-03 (VFX/Lighting — G. Leone) registrati in daily summary, checklist e Canvas con checkpoint 2025-11-09.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/checklist/milestones.md†L13-L16】【F:docs/Canvas/feature-updates.md†L24-L37】
- Generatore e documentazione UI rifiniti: layout carte responsive, overlay radar e timeline filtrabili garantiscono lettura coerente su desktop/mobile, con preset manifest storici ripristinati accanto al bundle demo.【F:docs/Canvas/feature-updates.md†L9-L23】
- Pipeline CI completa ristabilita (build/test + Pages) e helper catalog condivisi esposti agli strumenti browser/CLI per ridurre duplicazioni.【F:docs/ci-pipeline.md†L1-L48】
- Bilanciamento VC aggiornato: tuning missione Skydock Siege, curva PI e hazard registry normalizzati per mantenere rischio/coesione nei target RC.【F:docs/piani/roadmap.md†L60-L85】【F:data/core/missions/skydock_siege.yaml†L1-L91】
- Calendario comunicazioni release raffinato con agenda cross-team confermata, allegati HUD/metriche distribuiti su Slack/Drive e notifica marketing/prodotto completata (Slack 16:00 CET, briefing Drive 18:00 CET).【F:docs/Canvas/feature-updates.md†L18-L34】【F:docs/piani/roadmap.md†L72-L85】

### Fixed

- Ripristinate le API helper dello scanner tratti ambientali e l'ordine di inizializzazione del manifest per evitare preset mancanti nel generatore.【F:docs/checklist/project-setup-todo.md†L61-L104】
- Documentazione CLI/playtest aggiornata con esiti verificati, inclusi log test interfaccia e parità `roll_pack` tra stack TS/Python.【F:docs/Canvas/feature-updates.md†L9-L23】【F:docs/playtest/SESSION-2025-11-12.md†L24-L76】

### Known Issues

- Nessuno segnalato.

### Riepilogo PR giornalieri

- **2025-11-07** — Nessun merge registrato; confermati owner e follow-up HUD/PROG-04/EVT-03 nel changelog con supporto di roadmap, Canvas e tool run report.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/piani/roadmap.md†L72-L109】【F:docs/tool_run_report.md†L9-L22】

## [2025-11] VC Patch Note (RC)

### Stato feature

- **HUD Risk/Cohesion Overlay** — Pronto per release; metriche QA 2025-11-05 confermano risk medio 0.57 (Delta 0.59, Echo 0.54) e coesione 0.76/0.80 con alert HUD mitigati entro 2 turni.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】
- **Protocollo SquadSync Playbook** — Deploy confermato su Echo/Delta con cooldown supporti ottimizzato; mantenere monitoraggio su picchi risk 0.62 per eventi Aeon Overclock e ack PI automatici.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L9-L83】
- **Missione Skydock Siege (vertical slice)** — Contenuti narrativi e timer evacuazione completi; tuning Tier 3 stabile con tilt <0.46 e timer evacuazione a 6 turni.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L102】

### Issue note

- **Alert risk Delta turno 11** — Picco 0.62 mitigato entro due turni con ack PI e cooldown relay; verificare replicabilità nel prossimo smoke test.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L19-L83】
- **Allineamento annunci** — Confermare agenda riunione cross-team 2025-11-06 (10:30 CET) e invio comunicazioni Slack/Drive post tag `v0.6.0-rc1` alle 16:00/18:00 CET del 2025-11-07.【F:docs/piani/roadmap.md†L72-L85】

### Prossimi passi

- Pubblicare il tag `v0.6.0-rc1` dopo conferma QA 2025-11-05 e distribuire note VC al team ampliato.
- Aggiornare materiali marketing/Canvas con screenshot HUD e grafici risk/cohesion aggiornati al playtest 2025-11-05 (Delta/Echo).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】【F:docs/Canvas/feature-updates.md†L17-L27】
- Creare il tag Git ufficiale a chiusura QA, notificare Marketing Ops e Product con recap su asset HUD aggiornati e collegare la libreria screenshot revisionata.
