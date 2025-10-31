# Struttura dati e piano di migrazione

## Mappa delle directory

La radice `data/` è ora segmentata in tre bucket funzionali per distinguere i
flussi di aggiornamento e i consumatori dei dataset:

```
data/
├── core/                 # dataset canonici usati da generatori/validatori
│   ├── species.yaml      # catalogo specie/eventi consolidato
│   ├── biomes.yaml       # biomi e condizioni ambientali ufficiali
│   ├── biome_aliases.yaml
│   ├── missions/         # template missioni e scenari
│   ├── traits/           # glossario, pool e tassonomie trait
│   ├── hud/              # configurazioni HUD di runtime
│   ├── mating.yaml       # matrici di accoppiamento/slot
│   ├── game_functions.yaml
│   └── telemetry.yaml
├── derived/              # artefatti generati, fixture e snapshot
│   ├── analysis/         # report, coverage matrix, audit
│   ├── exports/          # esportazioni destinate a dashboard o BI
│   ├── mock/             # snapshot di ambienti/prod
│   └── test-fixtures/    # dataset minimi per test UI/CLI
├── external/             # fonti di terze parti e sorgenti ingest
│   ├── auto_external_sources.yaml
│   ├── chatgpt/          # dump conversazioni da lavorare
│   ├── chatgpt_sources.yaml
│   ├── drive/            # sincronizzazioni Google Drive
│   └── pathfinder_bestiary_1e.json
└── packs.yaml            # registro pack runtime (resta al livello superiore)
```

I pack giocabili mantengono la struttura dedicata in `packs/<nome>/` e
continuano a pubblicare i propri dataset interni (`data/species`, `docs/catalog`
…); la separazione serve a chiarire cosa è foundation del catalogo e cosa è
contenuto estendibile.

## Piano di refactor controllato

1. **Preparazione** – i mapping legacy→nuovo vivono in
   [`config/data_path_redirects.json`](../config/data_path_redirects.json). Questa
   tabella è sorgente unica sia per gli script di migrazione sia per i servizi
   che devono riscrivere i percorsi in modo trasparente.
2. **Migrazione assistita** – lo script
   [`scripts/data_layout_migration.py`](../scripts/data_layout_migration.py)
   applica il refactor in due modalità:
   - `--dry-run` per verificare le operazioni da eseguire sugli archivi legacy;
   - esecuzione reale con creazione opzionale di un manifest di redirect (`--redirect-output`)
     da consegnare ai servizi che non possono cambiare subito i percorsi.
3. **Redirect applicativi** – i servizi che leggono file tramite path statici
   possono caricare il manifest JSON prodotto dallo script (o direttamente la
   config in `config/data_path_redirects.json`) per risolvere i percorsi verso la
   nuova struttura prima di aprire i file.
4. **Pulizia finale** – una volta che tutti i consumatori sono aggiornati, il
   manifest può essere rigenerato senza le voci `legacy-missing` e, in seguito,
   eliminato per evitare ambiguità.

## Integrazione con tool esistenti

- Il trait generator (`scripts/generator.py`) normalizza automaticamente il
  `--data-root` verso `data/core/`, garantendo compatibilità con vecchi job CI
  che passavano la radice `data/`.
- Il caricatore del catalogo trait (`services/generation/species_builder.py`) e
  i validatori Python/TypeScript usano ora i percorsi `data/core/...`, così i
  test continuano a funzionare senza configurazioni ad-hoc.
- I report e le fixture sono stati riallineati per riflettere le nuove cartelle
  `data/derived/` e i riferimenti aggiornati a `data/external/`.

Seguendo questo schema possiamo introdurre nuovi pack o dataset esterni senza
riaprire decisioni sulla collocazione dei file core o derived, mantenendo al
contempo un canale di migrazione chiaro per chi usa snapshot precedenti.

## Settori operativi e dipendenze

- **Flow** – orchestration Python/TypeScript (`services/generation/`, `tools/py`, `tools/ts`) alimentata dai dataset `data/core/`.
  I payload prodotti vengono validati e pubblicati verso il backend e la webapp.
- **Atlas** – dashboard Vue (`webapp/`) e pannelli statici (`docs/test-interface/`) che consumano snapshot `data/derived/` e fallback `webapp/public/data/`.
  Dipende dalle stesse variabili `VITE_*` utilizzate da Flow per mantenere path coerenti in hosting statico.
- **Backend Idea Engine** – API Express (`server/`, `services/`) che espongono generazione e validazione a Flow e Atlas;
  produce report in `reports/` e nel pack (`packs/evo_tactics_pack/out/`).
- **Dataset & pack** – sorgente unica (`data/`, `packs/`, `reports/`) da cui derivano orchestratore, backend e dashboard.
  Ogni modifica richiede sincronizzazione con Flow (validator), Atlas (snapshot/preview) e documentazione (`docs/catalog/`).

> In fase di pianificazione considera sempre l'impatto incrociato: es. aggiornare i trait implica rigenerare i bundle web (`npm run webapp:deploy`), rieseguire i validator Python/TS e aggiornare i manifest distribuiti dal backend.
