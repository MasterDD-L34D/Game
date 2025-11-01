# Webapp

## Configurazione delle sorgenti dati

La dashboard utilizza un registry centralizzato (`src/config/dataSources.ts`) che mappa ogni feature
(flow snapshot, generazione specie, validatori runtime, Nebula Atlas, ecc.) a endpoint remoti,
fallback statici e payload mock. Il registry legge `import.meta.env` all'avvio dell'applicazione e
normalizza automaticamente stringhe vuote o il valore letterale `null` per consentire la disattivazione
dei fallback locali. Tutti i servizi e gli store (inclusi `useSnapshotLoader` e
`useNebulaProgressModule`) consumano il registry, quindi non è più necessario passare manualmente gli
endpoint o il `fetch` di default. L'ordine di risoluzione è **API remota → fallback dichiarato → mock
di progetto**; quando un passaggio fallisce si passa al successivo e, se tutti risultano indisponibili,
vengono emessi warning nel log della console.

### Variabili d'ambiente disponibili

Oltre a `VITE_API_BASE` (opzionale) per definire una base comune agli endpoint remoti, sono disponibili
variabili dedicate per ogni feature. Tutti i valori possono essere URL assoluti oppure path relativi
rispetto a `BASE_URL`. Se non viene definito `VITE_API_BASE`, ogni endpoint può specificare un URL
completo; in alternativa il registry concatena automaticamente la base ai path forniti dalle variabili
di feature.

- Flow snapshot: `VITE_FLOW_SNAPSHOT_URL`, `VITE_FLOW_SNAPSHOT_FALLBACK`.
- Generazione: `VITE_GENERATION_SPECIES_URL`, `VITE_GENERATION_SPECIES_FALLBACK`,
  `VITE_GENERATION_SPECIES_BATCH_URL`, `VITE_GENERATION_SPECIES_BATCH_FALLBACK`,
  `VITE_GENERATION_SPECIES_PREVIEW_URL`, `VITE_GENERATION_SPECIES_PREVIEW_FALLBACK`.
- Validatori runtime: `VITE_RUNTIME_VALIDATION_URL`, `VITE_RUNTIME_VALIDATION_SPECIES_FALLBACK`,
  `VITE_RUNTIME_VALIDATION_BIOME_FALLBACK`, `VITE_RUNTIME_VALIDATION_FOODWEB_FALLBACK`.
- Quality release: `VITE_QUALITY_SUGGESTIONS_URL`, `VITE_QUALITY_SUGGESTIONS_FALLBACK`.
- Trait diagnostics: `VITE_TRAIT_DIAGNOSTICS_URL`, `VITE_TRAIT_DIAGNOSTICS_FALLBACK`.
- Nebula Atlas: `VITE_NEBULA_ATLAS_URL`, `VITE_NEBULA_ATLAS_FALLBACK`, `VITE_NEBULA_TELEMETRY_MOCK`.

Impostando un fallback su `null` si forza il caricamento esclusivamente da endpoint remoto.

### Asset statici e fallback locali

I JSON di fallback sono stati riorganizzati sotto `webapp/public/data/` per categoria:

- `public/data/flow/snapshots/flow-shell-snapshot.json` (snapshot orchestrator).
- `public/data/flow/generation/*.json` per richieste di generazione e anteprime specie.
- `public/data/flow/validators/*.json` per i validatori runtime.
- `public/data/flow/quality/suggestions/apply.json` per le azioni di quality release.
- `public/data/flow/traits/diagnostics.json` per i trait diagnostics.
- `public/data/nebula/atlas.json` e `public/data/nebula/telemetry.json` per il modulo Nebula.

In fase di build gli asset vengono copiati automaticamente e serviti in base al valore di
`import.meta.env.BASE_URL`. Per deploy statici è sufficiente mantenere `base: './'` in `vite.config.ts`
(o passare `--base=./` al comando di build) così che tutti gli asset vengano risolti in maniera
relativa. L'entrypoint (`index.html`) dichiara il modulo principale con `src="/src/main.js"`; Vite lo
riscrive durante la build in `assets/[name]-[hash].js`, rispettando `BASE_URL` e garantendo che gli
asset fingerprintati vengano serviti correttamente anche da sottocartelle.

## Telemetria Nebula offline

Il modulo Nebula continua a includere un payload di telemetria mock (`public/data/nebula/telemetry.json`)
che viene caricato automaticamente quando la fetch remota fallisce. In questo scenario l'interfaccia mostra
badge "offline/demo" su sparkline, readiness chips e progress bar evolutive per distinguere i dati mock dai
dati live. L'intervallo di polling può essere personalizzato passando `pollIntervalMs` a
`useNebulaProgressModule`; per impostazione predefinita il modulo effettua un aggiornamento ogni 15 secondi.

## Script utili

- `npm run check:data` verifica la presenza dei JSON di fallback richiesti dal registry ed esce con errore
  se uno o più file non sono raggiungibili.

## Static hosting

La dashboard è pensata per essere distribuita anche come bundle statico (es. GitHub Pages, Netlify, bucket S3).

- **Configurazione `base`** – La build di produzione utilizza `base: './'` (vedi `vite.config.ts`) così che gli asset
  vengano risolti in maniera relativa. In ambienti con path personalizzato imposta `VITE_BASE_PATH` o avvia la build
  con `npm run build -- --base=/percorso/`.
- **`import.meta.env.BASE_URL`** – L'entrypoint (`index.html`) dichiara il modulo principale con un `src`
  gestito da Vite, che in fase di build riscrive automaticamente il path (`assets/[name]-[hash].js`) e
  inserisce la `BASE_URL` corretta in modo che router, asset e fallback condividano lo stesso prefisso.
- **Variabili d'ambiente** – Oltre agli endpoint descritti sopra puoi definire `VITE_API_BASE` o URL specifici per ciascun
  modulo. In ambienti statici è possibile precompilare questi valori creando un file `.env.production` prima della build.
- **Fallback HTML** – Quando ospiti la webapp dietro CDN o Pages abilita il fallback su `index.html` per supportare il router
  history di Vue (`404.html` su GitHub Pages, regola di rewrite su Netlify/S3/CloudFront).
- **Test locale della build** – Esegui `npm run build && npm run preview` all'interno di `webapp/` (il
  server preview serve direttamente la build hashata su `http://localhost:4173`). In alternativa usa il
  comando monorepo `npm run webapp:deploy` che installa le dipendenze, genera la build e avvia un server
  di anteprima con gli stessi asset fingerprintati.
- **Asset fingerprint** – La configurazione Vite produce bundle hashati (`assets/[name]-[hash].*`) così da poter impostare
  header di cache aggressivi in hosting statico senza rischiare inconsistenze.

> Suggerimento: il server `preview` di Vite espone la build ottimizzata su `http://localhost:4173` con gli stessi header
> e rewrites che troveresti in hosting statico, così da verificare path relativi e fallback prima del deploy.
