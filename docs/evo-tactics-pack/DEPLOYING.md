# Deploy rapido · Evo Tactics Pack

Questa checklist descrive come produrre e pubblicare il pacchetto
statico del generatore, assicurando che gli asset runtime e i dataset
siano allineati prima di distribuirli su CDN o bucket statici.

## Checklist di pubblicazione

1. **Build del pacchetto**  
   Esegui una build pulita del bundle in `dist/evo-tactics-pack/`:

   ```bash
   npm run build:evo-tactics-pack
   ```

   > Suggerimento: se stai lavorando offline puoi usare
   > `npm run build:evo-tactics-pack:offline`, che sostituisce Chart.js e
   > html2pdf con stub compatibili per test rapidi. Prima della pubblicazione
   > su CDN ripeti la build senza flag offline in modo da includere le
   > librerie reali.

2. **Revisione contenuto dist/**  
   Verifica che la cartella contenga:
   - pagine HTML (`index.html`, `generator.html`, `catalog.html`, `reports/*`);
   - runtime locali (`runtime/chart.umd.min.js`, `runtime/jszip.min.js`,
     `runtime/html2pdf.bundle.min.js`);
   - dataset aggiornati in `packs/evo_tactics_pack/`.

3. **Upload su CDN o storage statico**  
   Pubblica **l'intera** cartella `dist/evo-tactics-pack/` mantenendo la
   struttura delle directory. Un deploy tipico con AWS CLI potrebbe essere:

   ```bash
   aws s3 sync dist/evo-tactics-pack s3://cdn.example.com/evo-tactics-pack --delete
   ```

   Assicurati che l'hosting serva gli asset con `Content-Type` corretti e che
   i file JavaScript non vengano minificati ulteriormente.

4. **Configurazione endpoint API**  
   L'applicazione si aspetta `window.__EVO_TACTICS_API_BASE__` valorizzato con
   l'endpoint di generazione (`https://api.evo-tactics.dev/`). Inserisci lo
   snippet nello `head` della pagina host o fornisci la variabile via template
   engine / configuration file.

5. **Smoke test post-deploy**  
   Avvia un server locale per validare l'output appena pubblicato:

   ```bash
   npm run preview:docs-generator
   ```

   In un browser verifica rapidamente:
   - caricamento del catalogo e delle specie;
   - funzionamento del radar comparison nel pannello Generatore;
   - download ZIP e PDF dai preset Export;
   - navigazione dei report HTML con filtri e link ai dataset.

   Chiudi il server con `CTRL+C` dopo i controlli.

## Note operative

- Il comando `make evo-tactics-pack` è equivalente a `npm run
build:evo-tactics-pack` e può essere integrato in pipeline CI.
- Gli asset runtime vengono prima cercati in
  `assets/vendor/evo-tactics-pack/`. Popola questa directory con le versioni
  approvate (Chart.js, JSZip, html2pdf) per evitare download da CDN in
  ambienti isolati.
- Per mirroring custom imposta la query string `?pack-root=` o il meta tag
  `pack-root` sulle pagine generate; in alternativa configura le variabili
  `EVO_PACK_*` lato server come descritto in
  `docs/evo-tactics-pack/deploy.md`.
