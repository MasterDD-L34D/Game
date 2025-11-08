# STANDALONE Trait Editor

> Copia adattata di `docs/traits-manuale/06-standalone-trait-editor.md`.
> Aggiornata per la distribuzione insieme al pacchetto.

## Panoramica
Il pacchetto **Trait Editor/** mette a disposizione un editor standalone per la manutenzione del catalogo trait senza dover avviare l'intera webapp di gioco. L'obiettivo è velocizzare le iterazioni sul dataset, sfruttando un'interfaccia dedicata ma coerente con i modelli descritti nello [schema e dataset dei trait](../../docs/README_TRAITS.md). Questo capitolo estende il workflow operativo presentato in [Workflow & strumenti](workflow-strumenti.md) con indicazioni specifiche per l'esecuzione e la sincronizzazione del pacchetto.

## Prerequisiti
- Node.js >= 18 (allineato con il repository principale).
- Gestore pacchetti `npm` (installato con Node.js).
- Ambiente di sviluppo compatibile con [Vite](https://vitejs.dev/), utilizzato come bundler del pacchetto.

## Setup rapido
1. Posizionati nella directory del pacchetto:
   ```bash
   cd Trait\ Editor/
   ```
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Avvia l'ambiente di sviluppo con hot reload:
   ```bash
   npm run dev
   ```
4. (Opzionale) Effettua una preview della build prodotta:
   ```bash
   npm run preview
   ```
5. Crea la build di produzione quando necessario:
   ```bash
   npm run build
   ```

## Configurazione del datasource
- L'editor legge i dati dei trait a partire dal servizio `TraitDataService` e dalle variabili `VITE_*` documentate nel [README del pacchetto](../README.md).
- Per sincronizzare il catalogo con i dati ufficiali del monorepo, imposta le variabili d'ambiente prima di eseguire `npm run dev`/`npm run preview`:
  ```bash
  export VITE_TRAIT_DATA_SOURCE=remote
  export VITE_TRAIT_DATA_URL=../data/traits/index.json
  ```
  In alternativa puoi creare un file `.env.local` con gli stessi valori (caricato automaticamente da Vite) oppure puntare a una copia locale con `VITE_TRAIT_DATA_URL=/percorso/custom/index.json`.
- In assenza di una sorgente remota valida l'applicazione esegue il fallback automatico ai mock definiti in `src/data/traits.sample.ts`, loggando l'evento in console.
- Riprendi le checklist operative descritte in [Workflow & strumenti](workflow-strumenti.md) per assicurare la coerenza tra aggiornamenti manuali, script di validazione e pubblicazione.

## Risorse collegate
- [Schema e dataset dei trait](../../docs/README_TRAITS.md)
- [Workflow & strumenti](workflow-strumenti.md)
- [How-To authoring trait](howto-author-trait.md)
