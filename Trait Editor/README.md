# Trait Editor

Sandbox indipendente per la libreria dei tratti, pensata per revisioni rapide e pubblicazione statica.

## Documentazione

- Consulta la cartella [`docs/`](docs/README.md) per l'indice locale dei capitoli duplicati dal manuale (`docs/traits-manuale/**/*`) e dal vademecum `README_HOWTO_AUTHOR_TRAIT.md`.
- Ogni file indica il percorso sorgente nel monorepo: quando aggiorni il materiale, ricordati di sincronizzare entrambe le copie (locale e originale) e di riportare la data dell'ultima revisione.

## Requisiti

- Node.js 18+
- npm 9+

## Installazione

```bash
cd "Trait Editor"
npm install
```

> **Suggerimento:** se devi eseguire l'installazione in ambienti bloccati (es. CI) puoi utilizzare `npm install --ignore-scripts`.
> Il progetto non applica patch automatiche post-install, quindi l'opzione non comporta effetti collaterali.

## Comandi disponibili

- `npm run dev` avvia il dev server Vite su <http://localhost:5173> con hot module replacement.
- `npm run build` genera la build statica nella cartella `dist/`.
- `npm run preview` esegue una preview locale della build prodotta.

## Origine dei dati

Di default l'app utilizza i mock definiti in `src/data/traits.sample.ts`.
Per collegarsi al dataset reale (`../data/traits/index.json` nel monorepo) puoi:

1. Esportare le variabili d'ambiente prima di avviare Vite:

   ```bash
   export VITE_TRAIT_DATA_SOURCE=remote
   # opzionale: override dell'endpoint relativo
   export VITE_TRAIT_DATA_URL=../data/traits/index.json
   ```

2. Oppure creare un file `.env.local` nella cartella `Trait Editor/` con il seguente contenuto (comodo per lo sviluppo locale):

   ```bash
   VITE_TRAIT_DATA_SOURCE=remote
   VITE_TRAIT_DATA_URL=../data/traits/index.json
   ```

Durante lo sviluppo Vite carica automaticamente `.env.local`. In produzione puoi applicare le stesse variabili sul runtime di hosting.

Il servizio `TraitDataService` effettua automaticamente il fallback ai mock se il fetch remoto non è disponibile, registrando l'errore in console con `console.error('Impossibile caricare i tratti:', error)` e delegando a `resolveTraitSource` la gestione dell'avviso `console.warn('Falling back to sample traits after remote fetch failure:', error)`.
Per verificare localmente entrambe le condizioni puoi eseguire `node scripts/simulate-trait-source.mjs`, che mocka `fetch` prima con un payload remoto e poi con un `503`, mostrando la ricaduta sui mock (`fallback traits length: 4`).

## Pubblicazione

1. Esegui `npm run build` per produrre la cartella `dist/`.
2. Distribuisci il contenuto di `dist/` su un hosting statico (GitHub Pages, S3, Netlify, ecc.).
3. Imposta `VITE_BASE_PATH` o `BASE_PATH` prima della build se il sito verrà servito da una sottocartella.

## Nota sul caricamento di AngularJS

L'app si affida alla CDN Google per caricare AngularJS 1.8.x (`angular`, `angular-route`, `angular-animate`, `angular-sanitize`). Verifica le policy di Content Security Policy del target di pubblicazione e aggiungi eventuali eccezioni se richiesto.
