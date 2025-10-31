# Webapp

## Deploy / static hosting

La dashboard viene distribuita con Vite e supporta il deploy su hosting statico. Un helper centralizza la costruzione degli endpoint partendo da `import.meta.env.BASE_URL` e da eventuali variabili personalizzate. Le principali variabili supportate sono:

- `VITE_API_BASE` (opzionale) definisce la base comune per gli endpoint remoti. Può essere un URL assoluto (`https://api.example.com/`) oppure un path relativo (`/backend/`). In assenza del valore la webapp usa automaticamente `BASE_URL`.
- `VITE_FLOW_SNAPSHOT_URL` (opzionale) sovrascrive l'endpoint `/api/generation/snapshot` usato per caricare lo snapshot dell'orchestrator.
- `VITE_FLOW_SNAPSHOT_FALLBACK` (opzionale) permette di specificare un JSON alternativo da usare come fallback. Impostare il valore a `null` per disabilitare completamente il fallback locale.

Il file di fallback di default (`demo/flow-shell-snapshot.json`) è incluso in `webapp/public/demo/`, quindi viene copiato automaticamente in fase di build e servito in base al valore di `import.meta.env.BASE_URL`. Quando `base` è relativo (ad esempio `vite build --base=./`), il loader prova per prima cosa il fallback locale e registra nei log il passaggio allo snapshot statico prima di contattare l'endpoint remoto. Lo stesso meccanismo è disponibile per gli altri servizi (generazione, anteprime, validatori, quality release, trait diagnostics, modulo Nebula) con i JSON presenti sotto `webapp/public/api-mock/`. È possibile sostituire i file oppure puntare a percorsi personalizzati tramite le opzioni dei singoli store/servizi.

Per deploy statici è sufficiente mantenere `base: './'` in `vite.config.ts` (o passare `--base=./` al comando di build) così che tutti gli asset, inclusi quelli nella cartella `public/`, vengano risolti in maniera relativa.
