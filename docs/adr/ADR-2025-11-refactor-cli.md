# ADR-2025-11: Consolidamento refactor CLI

- **Data**: 2025-11-05
- **Stato**: Proposto
- **Owner**: Lead Dev Platform
- **Stakeholder**: Team Tools, Support, QA, Narrative Ops

## Contesto

Il refactor della CLI di gestione pacchetti (script `tools/cli.py`) introdotto nel ciclo VC-2025-10 ha unificato le funzioni di deploy, raccolta telemetria e generazione encounter. L'adozione estesa richiede policy aggiornate per ambienti locali, pipeline CI e supporto live.

## Decisione

1. **Strutturare la CLI in moduli** (`commands/`, `services/`) con entrypoint unico `game-cli` per evitare duplicazioni.
2. **Introdurre profili di esecuzione** (`playtest`, `telemetry`, `support`) leggendo le configurazioni da `config/cli/<profilo>.yaml`.
3. **Stabilire log operativi** utilizzando gli output generati da `scripts/cli_smoke.sh` (`logs/cli/smoke-YYYYMMDDTHHMMSSZ.log`, con varianti configurabili tramite `--label` e `--log-subdir`) e inviarli quotidianamente al bucket condiviso (`drive-sync`).
4. **Vincolare merge su branch principali** alla riuscita dei nuovi smoke test CLI (`scripts/cli_smoke.sh`).

## Conseguenze

- Richiede aggiornamento documentazione (`docs/README.md`, `docs/piani/roadmap.md`) e materiale onboarding dedicato.
- Le squadre Support/QA devono migrare agli script profilati prima dell'onboarding del 2025-11-18.
- Possibile aumento temporaneo dei tempi di build CI finché i container caching non sono aggiornati.
- Abilitato monitoraggio più granulare sulle chiamate CLI, facilitando debug di encounter generati.
- I mirror documentali (`docs/public/evo-tactics-pack/`, `docs/evo-tactics-pack/`) devono essere normalizzati con
  `scripts/sync_evo_pack_assets.js` e coperti da test di regressione (`tests/scripts/test_sync_mirrors.py`) per evitare
  percorsi relativi non risolvibili.
- I fallback bioma usati offline richiedono `metadata.schema_version` e `updated_at` allineati ai file canonici; monitorare con
  `tests/biomes/test_biome_pool_metadata.py` e con la validazione CLI `validate-ecosystem-pack`.

## Azioni di follow-up

- [x] Pubblicare guida CLI aggiornata in `docs/tools/` (nuovo file) → vedi `docs/tools/cli.md`.
- [x] Aggiornare i workflow CI per includere `scripts/cli_smoke.sh`.
- [x] Confermare con Support/QA la rotazione dei token API per profilo `support` (`docs/support/token-rotation.md`).
