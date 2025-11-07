# STANDALONE Trait Editor

## Panoramica
Il pacchetto **Trait Editor/** mette a disposizione un editor standalone per la manutenzione del catalogo trait senza dover avviare l'intera webapp di gioco. L'obiettivo è velocizzare le iterazioni sul dataset, sfruttando un'interfaccia dedicata ma coerente con i modelli descritti nello [schema e dataset dei trait](../README_TRAITS.md). Il capitolo estende il workflow operativo presentato in [Workflow & strumenti](05-workflow-strumenti.md) con indicazioni specifiche per l'esecuzione locale del pacchetto.

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
4. Creare la build di produzione quando necessario:
   ```bash
   npm run build
   ```

## Configurazione del datasource
- L'editor legge i dati dei trait a partire dal file `Trait Editor/README.md`, che documenta struttura e opzioni del pacchetto. Verificare che la configurazione del percorso di lettura punti al dataset corretto prima di avviare l'applicazione.
- Per sincronizzare il catalogo con i dati ufficiali, collegare la sorgente a `data/traits/index.json`. In alternativa è possibile utilizzare mock locali per test e prototipi rapidi (es. `Trait Editor/mock-data/*.json`).
- Riprendere le checklist operative descritte in [Workflow & strumenti](05-workflow-strumenti.md) per assicurare la coerenza tra aggiornamenti manuali, script di validazione e pubblicazione.

## Risorse collegate
- [Schema e dataset dei trait](../README_TRAITS.md)
- [Pacchetto standalone Trait Editor](../../Trait%20Editor/README.md)
- [Checklist operative del workflow](05-workflow-strumenti.md)
