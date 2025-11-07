# Trait Editor

Sandbox indipendente per la libreria dei tratti, pensata per revisioni rapide e pubblicazione statica.

## Requisiti

- Node.js 18+
- npm 9+

## Installazione

```bash
cd "Trait Editor"
npm install
```

## Comandi disponibili

- `npm run dev` avvia il dev server Vite su <http://localhost:5173> con hot module replacement.
- `npm run build` genera la build statica nella cartella `dist/`.
- `npm run preview` esegue una preview locale della build prodotta.

## Origine dei dati

Di default l'app utilizza i mock definiti in `src/data/traits.sample.ts`.
Per collegarsi al dataset reale (`../data/traits/index.json` nel monorepo) esporta le seguenti variabili d'ambiente prima di avviare Vite:

```bash
export VITE_TRAIT_DATA_SOURCE=remote
# opzionale: override dell'endpoint relativo
export VITE_TRAIT_DATA_URL=../data/traits/index.json
```

Il servizio `TraitDataService` effettua automaticamente il fallback ai mock se il fetch remoto non è disponibile.

## Pubblicazione

1. Esegui `npm run build` per produrre la cartella `dist/`.
2. Distribuisci il contenuto di `dist/` su un hosting statico (GitHub Pages, S3, Netlify, ecc.).
3. Imposta `VITE_BASE_PATH` o `BASE_PATH` prima della build se il sito verrà servito da una sottocartella.

## Nota sul caricamento di AngularJS

L'app si affida alla CDN Google per caricare AngularJS 1.8.x (`angular`, `angular-route`, `angular-animate`, `angular-sanitize`). Verifica le policy di Content Security Policy del target di pubblicazione e aggiungi eventuali eccezioni se richiesto.
