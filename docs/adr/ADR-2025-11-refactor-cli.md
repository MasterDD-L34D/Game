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
3. **Stabilire log operativi** in `logs/cli/<AAAA-MM-DD>.log` e inviarli quotidianamente al bucket condiviso (`drive-sync`).
4. **Vincolare merge su branch principali** alla riuscita dei nuovi smoke test CLI (`scripts/cli_smoke.sh`).

## Conseguenze
- Richiede aggiornamento documentazione (`docs/README.md`, `docs/piani/roadmap.md`) e materiale onboarding dedicato.
- Le squadre Support/QA devono migrare agli script profilati prima dell'onboarding del 2025-11-18.
- Possibile aumento temporaneo dei tempi di build CI finché i container caching non sono aggiornati.
- Abilitato monitoraggio più granulare sulle chiamate CLI, facilitando debug di encounter generati.

## Azioni di follow-up
- [ ] Pubblicare guida CLI aggiornata in `docs/tools/` (nuovo file).
- [ ] Aggiornare i workflow CI per includere `scripts/cli_smoke.sh`.
- [ ] Confermare con Support/QA la rotazione dei token API per profilo `support`.
