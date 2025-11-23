# Trait Editor standalone — Setup, sviluppo e deploy

Il pacchetto [`Trait Editor/`](../Trait Editor/) fornisce un editor AngularJS dedicato alla manutenzione dei trait senza avviare l'intera webapp. Questa guida riassume i prerequisiti, i comandi principali e le azioni consigliate prima di distribuire una nuova versione.

## Prerequisiti

- **Node.js 18+** e **npm 9+** (il pacchetto sfrutta Vite 5).
- Dipendenze JavaScript installate con `npm install` (AngularJS e moduli correlati sono risolti via npm e inclusi nella build).
- Dataset trait aggiornato in `data/traits/` quando si lavora con sorgente remota (`VITE_TRAIT_DATA_SOURCE=remote`).

Suggerimenti rapidi:

```bash
node --version
npm --version
corepack enable
corepack prepare npm@latest --activate
```

## Installazione

Esegui l'installazione una volta per ogni macchina o quando aggiorni le dipendenze:

```bash
cd "Trait Editor"
npm install
```

In ambienti bloccati è possibile usare `npm install --ignore-scripts` (il pacchetto non applica patch post-install).

## Configurazione dati

Il servizio `TraitDataService` legge i dati in base alle variabili `VITE_*` esportate prima dell'avvio:

```bash
export VITE_TRAIT_DATA_SOURCE=remote
export VITE_TRAIT_DATA_URL=../data/traits/index.json
# opzionale quando si pubblica in sottocartella
export VITE_BASE_PATH=/trait-editor/
```

- `VITE_TRAIT_DATA_SOURCE=remote` attiva il dataset reale.
- `VITE_TRAIT_DATA_URL` punta al JSON generato dai workflow dei trait.
- `VITE_BASE_PATH` (o `BASE_PATH`) imposta il prefisso delle rotte quando l'app vive in una sottocartella.

Salva i valori in `.env.local` per caricarli automaticamente in sviluppo.

## Sviluppo locale

```bash
# dalla root del monorepo
npm run dev:stack     # avvia backend + webapp principale per confronti rapidi

# oppure lavora solo sull'editor
cd "Trait Editor"
npm run dev           # http://localhost:5173
```

Lo script `npm run dev:stack` (o `make dev-stack`) avvia anche l'API Express (`npm run start:api`) così da poter verificare rapidamente eventuali endpoint utilizzati dall'editor.

Durante lo sviluppo puoi verificare il fallback ai mock con:

```bash
node scripts/simulate-trait-source.mjs
```

## Test & verifica

Esegui questi comandi prima di aprire una PR o condividere una build:

```bash
# dalla root per assicurarti che backend e webapp superino i check
npm run test:stack

# dal pacchetto Trait Editor
npm run build         # produce dist/
npm run preview       # anteprima produzione
```

Il comando `npm run test:stack` esegue sia la suite API (`npm run test:api`) sia i test unitari della webapp (`npm run test --workspace webapp`).

## Deploy statico

1. Imposta le variabili `VITE_TRAIT_DATA_SOURCE`, `VITE_TRAIT_DATA_URL` e (se necessario) `VITE_BASE_PATH`.
2. Genera la build dopo aver installato le dipendenze:
   ```bash
   cd "Trait Editor"
   npm install
   VITE_BASE_PATH=/trait-editor/ npm run build
   ```
3. Distribuisci il contenuto di `dist/` su hosting statico (GitHub Pages, Netlify, S3, ecc.).
4. Convalida la build con `npm run preview` prima dell'upload finale.

Per pipeline automatiche puoi riutilizzare lo script `npm run ci:stack` dalla root, che include lint (`npm run lint:stack`), suite API, test webapp e build produzione con `VITE_BASE_PATH=./`.

## Troubleshooting rapido

- **Dipendenze AngularJS non installate** → Esegui `npm install` nella root di `Trait Editor/` per ripristinare i moduli (`angular`, `angular-route`, `angular-animate`, `angular-sanitize`) prima di lanciare `npm run build`.
- **Dataset remoto non raggiungibile** → Controlla il log del browser: l'app registra `console.error('Impossibile caricare i tratti:', error)` e fa fallback ai mock con `console.warn('Falling back to sample traits after remote fetch failure:', error)`.
- **Deploy in sottocartella** → Verifica che `VITE_BASE_PATH`/`BASE_PATH` combaci con il percorso pubblicato; riesegui `npm run build` se cambi il prefisso.
