# STANDALONE Trait Editor

## Panoramica
Il pacchetto **Trait Editor/** mette a disposizione un editor standalone per la manutenzione del catalogo trait senza dover avviare l'intera webapp di gioco. L'obiettivo è velocizzare le iterazioni sul dataset, sfruttando un'interfaccia dedicata ma coerente con i modelli descritti nello [schema e dataset dei trait](../README_TRAITS.md). Il capitolo estende il workflow operativo presentato in [Workflow & strumenti](05-workflow-strumenti.md) con indicazioni specifiche per l'esecuzione e la sincronizzazione del pacchetto.

## Documentazione locale
- Una copia curata dei capitoli essenziali è distribuita insieme al pacchetto nella cartella [`Trait Editor/docs/`](../../Trait%20Editor/docs/README.md).
- Ogni file locale riporta il percorso d'origine (es. `docs/traits-manuale/05-workflow-strumenti.md`, `README_HOWTO_AUTHOR_TRAIT.md`) per facilitare i confronti.
- Per mantenere sincronizzati i contenuti, confronta periodicamente i file con le rispettive controparti nel monorepo e aggiorna note o date di revisione in entrambi i percorsi.

## Prerequisiti
- Node.js >= 18 (versione allineata con quella usata dal repository).
- Gestore pacchetti `npm` (installato insieme a Node.js).
- Ambiente di sviluppo compatibile con [Vite](https://vitejs.dev/), utilizzato come bundler del pacchetto.

## Setup rapido
1. Posizionarsi nella directory del pacchetto:
   ```bash
   cd Trait\ Editor/
   ```
2. Installare le dipendenze:
   ```bash
   npm install
   ```
3. Avviare l'ambiente di sviluppo con hot reload:
   ```bash
   npm run dev
   ```
4. (Opzionale) Effettuare una preview della build prodotta:
   ```bash
   npm run preview
   ```
5. Creare la build di produzione quando necessario:
   ```bash
   npm run build
   ```

## Configurazione del datasource
- L'editor legge i dati dei trait a partire dal servizio `TraitDataService` e dalle variabili `VITE_*` documentate in `Trait Editor/README.md`. Verificare il file prima di avviare l'applicazione.
- Per sincronizzare il catalogo con i dati ufficiali, impostare le variabili d'ambiente prima di eseguire `npm run dev`/`npm run preview`:
  ```bash
  export VITE_TRAIT_DATA_SOURCE=remote
  export VITE_TRAIT_DATA_URL=../data/traits/index.json
  ```
  In alternativa è possibile creare un file `.env.local` con gli stessi valori (caricato automaticamente da Vite) oppure puntare a una copia locale con `VITE_TRAIT_DATA_URL=/percorso/custom/index.json`.
- In assenza di una sorgente remota valida l'applicazione esegue il fallback automatico ai mock definiti in `src/data/traits.sample.ts`, loggando l'evento in console.
- Riprendere le checklist operative descritte in [Workflow & strumenti](05-workflow-strumenti.md) per assicurare la coerenza tra aggiornamenti manuali, script di validazione e pubblicazione.

## Risorse collegate
- [Schema e dataset dei trait](../README_TRAITS.md)
- [Pacchetto standalone Trait Editor](../../Trait%20Editor/README.md)
- [Checklist operative del workflow](05-workflow-strumenti.md)
