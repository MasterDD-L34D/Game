# Changelog

## [Unreleased]
### Added
- Bundle demo pubblico con preset "demo-bundle", press kit markdown automatico
  e documentazione di deploy in `docs/evo-tactics-pack/deploy.md`.
- Modulo `packs/pack-data.js` con supporto a override locali/remoti e variabili
  d'ambiente per pipeline CI.
- Report sintetico sulle PR #68-#96 che introduce Mission Control navigabile, radar e confronto specie nel generatore, dataset hub con validazione automatica e strumenti playtest/QC aggiornati.
- Workflow giornaliero `daily-pr-summary` con script `tools/py/daily_pr_report.py` per produrre report automatici delle PR fuse e aggiornare changelog, roadmap, checklist e Canvas.
- Registro manutenzione 2025-10-24 con reinstallazione dipendenze `tools/ts` e `tools/py` documentato in `logs/tooling/2025-10-24-tooling.md`.
- Nota di manutenzione in `docs/chatgpt_sync_status.md` per l'ambiente corrente (Node 22.19.0 / Python 3.11.12).
- Verbale test manuali 2025-10-26 per `docs/test-interface/` con esiti positivi su ricarica YAML e suite pulsanti automatici.
- Documentazione hook EMA/HUD per trasmissione metriche e alert risk in `docs/hooks/ema-metrics.md`.
- Dataset di tuning missione `data/missions/skydock_siege.yaml` con target `risk.time_low_hp_turns` e interventi condivisi con il team VC.
- Target telemetrici ruolo/rarità e curva budget PI visibili nel test interface grazie all'estensione dei dataset `packs.yaml`/`telemetry.yaml` e dei relativi hook HUD.
- Allineamento note di rilascio condivise con Marketing Ops e kit asset (HUD/Screens) aggiornato per la finestra di annuncio VC.

### Changed
- Il generatore seleziona di default il bundle demo per le esportazioni e
  aggiorna il manifest con press kit e insight.
- Allineate le finestre EMA (`phase_weights` 0.25/0.35/0.40, `idle_threshold_s` 10) e definite le nuove sezioni `hud_breakdown`, `telemetry_targets` e `pe_economy.curve` per sincronizzare i log VC con la curva PE aggiornata.
- Hotfix missione "Skydock Siege" (build VC 2025-02-15): scudi potenziati, medkit anticipati e ack PI in 2 turni per riportare `risk.time_low_hp_turns` entro il target Tier 3 (<=6).
- Consolidato il calendario comunicazioni con Marketing/Product definendo owner, cadenza (daily standup + sync settimanale) e canali condivisi per il piano feedback post-annuncio.
- Registrato l'impegno congiunto Marketing/Product e QA per il checkpoint finale e per il rilascio del pacchetto asset aggiornato.

### Fixed
- Allineamento degli output `roll_pack` tra CLI TypeScript e Python utilizzando seed condiviso (`demo`).
- Checklist progetto aggiornata con esito ultimo run `validate_datasets.py` e verifica CLI.
- Ripristinata la pipeline export PDF del generatore aggiornando l'SRI di `html2pdf` e tracciando il fallback nel manifest (ticket `EVO-421`).

### Known Issues
- Nessuno segnalato.

### Riepilogo PR giornalieri
<!-- daily-pr-summary:start -->
- **2025-10-26** — [#71](https://github.com/MasterDD-L34D/Game/pull/71) Expose shared catalog loader helpers across Evo Pack tools; [#72](https://github.com/MasterDD-L34D/Game/pull/72) Restore CI workflow and expand site deployment; [#73](https://github.com/MasterDD-L34D/Game/pull/73) Add procedural biome synthesis to the ecosystem generator; [#74](https://github.com/MasterDD-L34D/Game/pull/74) Restore helper APIs in env traits scanner; [#75](https://github.com/MasterDD-L34D/Game/pull/75) Populate ext v1.5 NPG pack and add validation docs; [#77](https://github.com/MasterDD-L34D/Game/pull/77) Add export previews and persist generator activity log; [#78](https://github.com/MasterDD-L34D/Game/pull/78) Enhance generator page with codex navigation overlay; [#80](https://github.com/MasterDD-L34D/Game/pull/80) Enhance generator cards with responsive layout and pinning; [#79](https://github.com/MasterDD-L34D/Game/pull/79) Ensure Ennea theme hooks mirror effect detail triggers; [#81](https://github.com/MasterDD-L34D/Game/pull/81) Restore approved canvas archives for versions A, C, and D; [#82](https://github.com/MasterDD-L34D/Game/pull/82) Add radar comparison UI to ecosystem generator; [#83](https://github.com/MasterDD-L34D/Game/pull/83) Document environment refresh and regenerate encounter samples; [#84](https://github.com/MasterDD-L34D/Game/pull/84) Document web interface manual test run; [#85](https://github.com/MasterDD-L34D/Game/pull/85) Document roll_pack CLI parity spot-check; [#86](https://github.com/MasterDD-L34D/Game/pull/86) Document drive sync quotas and trigger guidance; [#87](https://github.com/MasterDD-L34D/Game/pull/87) Documenta esito test manuale interfaccia web; [#88](https://github.com/MasterDD-L34D/Game/pull/88) feat: align telemetry pe costs and skydock tuning; [#90](https://github.com/MasterDD-L34D/Game/pull/90) feat: add activity timeline controls and generator KPIs; [#89](https://github.com/MasterDD-L34D/Game/pull/89) Reinstate full CI workflow validations and update docs; [#91](https://github.com/MasterDD-L34D/Game/pull/91) Add playtest documentation for scenarios and pilot session; [#92](https://github.com/MasterDD-L34D/Game/pull/92) Improve generator responsive cards and pinned state; [#93](https://github.com/MasterDD-L34D/Game/pull/93) Add VC November 2025 RC notes and communications plan; [#94](https://github.com/MasterDD-L34D/Game/pull/94) Document post-October 2025 processes and CLI ADR; [#95](https://github.com/MasterDD-L34D/Game/pull/95) Annota ambiente di clonazione nella checklist setup; [#96](https://github.com/MasterDD-L34D/Game/pull/96) Enhance radar comparison metrics in generator; [#97](https://github.com/MasterDD-L34D/Game/pull/97) Configure Drive sync folder and document Apps Script deployment; [#98](https://github.com/MasterDD-L34D/Game/pull/98) Add activity log export actions; [#99](https://github.com/MasterDD-L34D/Game/pull/99) Add telemetry targets and PI budget curve integrations; [#100](https://github.com/MasterDD-L34D/Game/pull/100) Add export presets, dossier generation, and ZIP bundles; [#101](https://github.com/MasterDD-L34D/Game/pull/101) Implement HUD risk alert instrumentation and Skydock Siege retune; [#103](https://github.com/MasterDD-L34D/Game/pull/103) Fix manifest preset initialization order; [#104](https://github.com/MasterDD-L34D/Game/pull/104) Implement HUD risk alert instrumentation and Skydock Siege retune; [#102](https://github.com/MasterDD-L34D/Game/pull/102) Automate daily PR reporting; [#106](https://github.com/MasterDD-L34D/Game/pull/106) Align PI balance alert notifications with configured channel; [#107](https://github.com/MasterDD-L34D/Game/pull/107) Persist daily PR summaries across runs; [#108](https://github.com/MasterDD-L34D/Game/pull/108) Add filter profiles, history, and lock persistence to ecosystem…; [#109](https://github.com/MasterDD-L34D/Game/pull/109) Normalize hazard registry structure; [#111](https://github.com/MasterDD-L34D/Game/pull/111) Document first-wave completion; [#110](https://github.com/MasterDD-L34D/Game/pull/110) Add narrative prompt generation and rare event feedback to generator; [#112](https://github.com/MasterDD-L34D/Game/pull/112) Document 26 Feb 2025 playtest session outcomes; [#113](https://github.com/MasterDD-L34D/Game/pull/113) Add generator flow map and quality benchmark documentation; [#114](https://github.com/MasterDD-L34D/Game/pull/114) Replace balancing workbook with CSV export; [#115](https://github.com/MasterDD-L34D/Game/pull/115) Refine generator UI with shared tokens; [#116](https://github.com/MasterDD-L34D/Game/pull/116) docs: dettaglia coordinamento marketing e tag QA; [#117](https://github.com/MasterDD-L34D/Game/pull/117) Add contextual insight panel and filter reuse metrics; [#118](https://github.com/MasterDD-L34D/Game/pull/118) docs: allinea canvas operativi e onboarding; [#119](https://github.com/MasterDD-L34D/Game/pull/119) Add CLI profile guide and smoke automation; [#120](https://github.com/MasterDD-L34D/Game/pull/120) Restore original manifest presets alongside demo bundle; [#122](https://github.com/MasterDD-L34D/Game/pull/122) Align Enneagram compat map with engine aliases; [#123](https://github.com/MasterDD-L34D/Game/pull/123) docs: formalize setup workflow and maintenance cadence; [#125](https://github.com/MasterDD-L34D/Game/pull/125) Align PI traits with environment registry; [#124](https://github.com/MasterDD-L34D/Game/pull/124) Add November 2025 playtest insights and update roadmap priorities; [#126](https://github.com/MasterDD-L34D/Game/pull/126) Generate trait baseline and update species progression; [#127](https://github.com/MasterDD-L34D/Game/pull/127) Add advanced composition panel with synergy tooling. [Report](chatgpt_changes/daily-pr-summary-2025-10-26.md)
<!-- daily-pr-summary:end -->

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
