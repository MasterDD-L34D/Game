# Checklist Milestone

## Setup iniziale
- [x] Caricati dataset YAML di base (biomi, pacchetti PI, mating, telemetria).【F:data/biomes.yaml†L1-L17】【F:data/packs.yaml†L1-L88】【F:data/mating.yaml†L1-L32】【F:data/telemetry.yaml†L1-L29】
- [x] Pubblicati script CLI per roll pack e encounter (`tools/ts`, `tools/py`).

## In corso
- [x] Espandere `compat_forme` per coprire tutte le 16 forme MBTI.【F:data/mating.yaml†L1-L32】
- [ ] Validare le formule di telemetria con dati di playtest reali.【F:data/telemetry.yaml†L1-L25】
  - [x] Pianificate ed eseguite sessioni Alpha/Bravo/Charlie con logging coerente con gli indici VC definiti.【F:docs/checklist/vc_playtest_plan.md†L1-L33】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L1-L125】
  - [x] Confrontati gli indici con le soglie EMA: Bravo supera risk 0.60, richiesta revisione timer scudi; Alpha vicino al limite Enneagram Conquistatore.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L23-L58】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L59-L94】
  - [ ] Aggiornare formule di normalizzazione risk (`minmax_scenario`) per ridurre sensibilità a burst multipli.
- [ ] Creare esempi di encounter documentati per ciascun bioma.【F:data/biomes.yaml†L1-L13】

## Completare prossimamente
- [x] Collegare esport automatizzato dei log VC a Google Sheet (`scripts/driveSync.gs`).
  - Fogli di riferimento: [VC Telemetry Sync](https://docs.google.com/spreadsheets/d/1VCExampleTelemetrySync/edit) · [PI Packs Sync](https://docs.google.com/spreadsheets/d/1PIExamplePacksSync/edit)
- [ ] Aggiornare i Canvas principali con note sulle nuove feature CLI.
