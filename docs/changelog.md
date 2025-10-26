# Changelog

## [Unreleased]
### Added
- Report sintetico sulle PR #68-#96 che introduce Mission Control navigabile, radar e confronto specie nel generatore, dataset hub con validazione automatica e strumenti playtest/QC aggiornati.
- Workflow giornaliero `daily-pr-summary` con script `tools/py/daily_pr_report.py` per produrre report automatici delle PR fuse e aggiornare changelog, roadmap, checklist e Canvas.
- Registro manutenzione 2025-10-24 con reinstallazione dipendenze `tools/ts` e `tools/py` documentato in `logs/tooling/2025-10-24-tooling.md`.
- Nota di manutenzione in `docs/chatgpt_sync_status.md` per l'ambiente corrente (Node 22.19.0 / Python 3.11.12).
- Verbale test manuali 2025-10-26 per `docs/test-interface/` con esiti positivi su ricarica YAML e suite pulsanti automatici.
- Documentazione hook EMA/HUD per trasmissione metriche e alert risk in `docs/hooks/ema-metrics.md`.
- Dataset di tuning missione `data/missions/skydock_siege.yaml` con target `risk.time_low_hp_turns` e interventi condivisi con il team VC.
- Target telemetrici ruolo/rarità e curva budget PI visibili nel test interface grazie all'estensione dei dataset `packs.yaml`/`telemetry.yaml` e dei relativi hook HUD.

### Changed
- Allineate le finestre EMA (`phase_weights` 0.20/0.40/0.40, `idle_threshold_s` 8) e definite le nuove sezioni `hud_breakdown`, `telemetry_targets` e `pe_economy.curve` per sincronizzare i log Delta/Echo con la curva PE aggiornata.

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
- **HUD Risk/Cohesion Overlay** — Pronto per release; metriche QA 2025-11-01 confermano risk medio 0.55 e coesione 0.81 dopo il tuning EMA 0.2.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L45】
- **Protocollo SquadSync Playbook** — Deployato con successo nelle squadre Echo/Bravo; resta monitoraggio su picchi risk >0.60 durante wave prolungate.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L19-L44】
- **Missione Skydock Siege (vertical slice)** — Contenuti narrativi e timer evacuazione completi; mantenere focus su supporto Aeon Overclock con guardie condivise.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L31-L36】

### Issue note
- **Picco risk Echo wave 3** — Evento isolato (0.62) risolto con swap supporti; verificare alert in tempo reale nel rollout finale.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L24-L33】
- **Allineamento annunci** — Coordinare il calendario cross-team e gli aggiornamenti Canvas prima del tag `v0.6.0-rc1`.

### Prossimi passi
- Pubblicare il tag `v0.6.0-rc1` dopo conferma QA e distribuire note VC al team ampliato.
- Aggiornare materiali marketing/Canvas con screenshot HUD e grafici risk/cohesion aggiornati al 2025-11-01.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L45】
