# ADR-XXX: Motivazioni refactor CLI e allineamento toolchain

- **Data**: 2025-11-20
- **Stato**: Accettato
- **Owner**: Team Lead Tools
- **Stakeholder**: Team Platform, HUD/UX, Support, QA

## Contesto

Durante il ciclo VC-2025-10 il refactor della CLI (`game-cli`) ha introdotto entrypoint modulare e profili di esecuzione condivisi. Il team lead ha richiesto una decisione formale che preservi: (1) determinismo sugli output, (2) parità tra implementazioni TypeScript e Python e (3) continuità della pipeline HUD che consuma gli eventi CLI.

## Motivazioni raccolte dal team lead

1. **Determinismo riproducibile** — ogni comando deve accettare `--seed` e loggare gli input in modo da poter riprodurre un encounter o un pacchetto partendo dagli stessi dati.
2. **Allineamento TS/Python** — `roll_pack` e gli altri tool devono condividere lo stesso set di sorgenti YAML e la stessa logica di calcolo per evitare regressioni quando i team cambiano linguaggio di riferimento.
3. **Pipeline HUD** — gli aggiornamenti `hud_alerts.ts` devono ricevere stream coerenti dagli script CLI, evitando divergenze sui formati telemetry (`ema.update`) e mantenendo i tag missione configurabili.

## Opzioni valutate

- **A. Mantenere doppia CLI separata (status quo pre-refactor)**: lasciare gli script Python e TypeScript indipendenti con logiche duplicate.
- **B. Centralizzare tutto in TypeScript**: spostare la generazione dei pacchetti e encounter in TS e deprecare i wrapper Python.
- **C. Stabilire un contratto di reference implementation**: definire moduli condivisi (schema YAML, seed handling, normalizzazione log) e test cross-language obbligatori.

## Decisione

Adottare l'opzione **C**. Il refactor CLI rimane modulare, ma tutti i comandi devono validare seed e schema dati contro la reference TypeScript, con test di parità che girano sia in `tools/ts` sia in `tools/py` ad ogni modifica.

### Sottocomandi disponibili (2025-11)

L'entrypoint `python tools/py/game_cli.py [--profile <nome>] <comando>` espone i comandi `roll-pack [FORM MBTI] [ARCHETIPO] [data_path] [--seed <valore>]`, `generate-encounter [biome] [data_path] [--party-power <int>] [--seed <valore>]`, `validate-datasets`, `validate-ecosystem-pack [--json-out <percorso>] [--html-out <percorso>]` (alias legacy `validate-ecosystem`) e `investigate <file|dir> [...] [--recursive] [--json] [--html] [--destination NAME|-] [--max-preview <int>]`. Ogni nuovo flusso deve essere aggiunto qui e coperto dai test di parità.

## Impatti sugli strumenti

- **`tools/py/roll_pack.py`**: mantiene supporto come wrapper di compatibilità. I test di parità con `tools/ts/dist/roll_pack.js` devono essere schedulati nelle pipeline e documentati nei log giornalieri.
- **`tools/ts/hud_alerts.ts`**: consuma gli eventi prodotti da `server/services/nebulaTelemetryAggregator` (lanciato da `tools/deploy/generateStatusReport.js`). In assenza di un sottocomando `telemetry stream`, il monitoraggio real time deve appoggiarsi a questo aggregatore o prevedere un nuovo task Tools per introdurre un wrapper dedicato.
- **Pipeline HUD**: la CLI diventa la fonte autorevole per gli eventi `ema.update`; gli adapter HUD devono ascoltare il bus CLI e rispettare il formato JSON deciso qui.

## Conseguenze

- Gli script Python vengono trattati come implementazione di riferimento secondaria ma con parità garantita tramite test comparativi.
- La documentazione operativa deve descrivere come usare i seed condivisi e dove reperire i log generati da `scripts/cli_smoke.sh` (es. `logs/cli/smoke-YYYYMMDDTHHMMSSZ.log` o gli snapshot con `--label`/`--log-subdir`).
- HUD/UX può anticipare regressioni monitorando i tag missione e gli alert generati dal nuovo flusso CLI.

## Azioni di follow-up

- [x] Aggiornare i test di parità CLI TS/Python (`npm test` in `tools/ts`, `pytest tests/test_tools_modules.py`).
- [ ] Automatizzare l'esecuzione giornaliera dei test di parità nella pipeline CI (`scripts/cli_smoke.sh`).
- [ ] Estendere la documentazione HUD con esempi di alert generati dalla CLI (`docs/tools/hud.md`).
- [ ] Verificare con Support/QA la disponibilità dei log CLI nel drive condiviso.
- [ ] Valutare la necessità di un nuovo sottocomando `telemetry` basato sull'aggregatore, aprendo task dedicato se richiesto dalle squadre HUD/Telemetria.
