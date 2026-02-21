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
- **2026-02-20** — Nessun merge registrato.
- **2026-02-19** — Nessun merge registrato.
- **2026-02-18** — Nessun merge registrato.
- **2026-02-17** — Nessun merge registrato.
- **2026-02-16** — Nessun merge registrato.
- **2026-02-15** — Nessun merge registrato.
- **2026-02-14** — Nessun merge registrato.
- **2026-02-13** — Nessun merge registrato.
- **2026-02-12** — Nessun merge registrato.
- **2026-02-11** — Nessun merge registrato.
- **2026-02-10** — Nessun merge registrato.
- **2026-02-09** — Nessun merge registrato.
- **2026-02-08** — Nessun merge registrato.
- **2026-02-07** — Nessun merge registrato.
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
