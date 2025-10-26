# Changelog

## [Unreleased]
### Added
- Registro manutenzione 2025-10-24 con reinstallazione dipendenze `tools/ts` e `tools/py` documentato in `logs/tooling/2025-10-24-tooling.md`.
- Nota di manutenzione in `docs/chatgpt_sync_status.md` per l'ambiente corrente (Node 22.19.0 / Python 3.11.12).
- Verbale test manuali 2025-10-26 per `docs/test-interface/` con esiti positivi su ricarica YAML e suite pulsanti automatici.
- Documentazione hook EMA/HUD per trasmissione metriche e alert risk in `docs/hooks/ema-metrics.md`.
- Dataset di tuning missione `data/missions/skydock_siege.yaml` con target `risk.time_low_hp_turns` e interventi condivisi con il team VC.

### Changed
- Aggiornate le finestre EMA (`phase_weights`, `idle_threshold_s`) e i costi PE (`cap_pt`, `guardia_situazionale`, `starter_bioma`, `sigillo_forma`) in `data/telemetry.yaml` per allineare i log VC e il negozio PI.

### Fixed
- Allineamento degli output `roll_pack` tra CLI TypeScript e Python utilizzando seed condiviso (`demo`).
- Checklist progetto aggiornata con esito ultimo run `validate_datasets.py` e verifica CLI.

### Known Issues
- Nessuno segnalato.
