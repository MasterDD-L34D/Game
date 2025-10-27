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

### Known Issues
- Nessuno segnalato.

### Riepilogo PR giornalieri
<!-- daily-pr-summary:start -->
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
