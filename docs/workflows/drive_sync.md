# Workflow driveSync — approvazione asset

Questa procedura descrive come generare l'elenco di asset approvati da sincronizzare
con `scripts/driveSync.gs`, inviarlo all'Apps Script e documentare i trigger e le
credenziali necessari.

## 1. Generare il manifest degli asset approvati

1. Aggiorna le sorgenti in [`config/drive/approved_asset_sources.json`](../../config/drive/approved_asset_sources.json)
   se servono nuove directory o pattern. Ogni voce può indicare l'ID della sorgente
   Apps Script (`driveSourceId`) per collegare l'asset al relativo mapping
   (`vc-logs`, `hub-ops`, ecc.).
2. Esegui il generatore locale:
   ```bash
   npm run drive:generate-approved
   ```
   Il comando produce/aggiorna `data/drive/approved_assets.json` includendo nome file,
   hash SHA-256, sorgente e driveSourceId per l'incrocio con `driveSync.gs`.
3. Verifica il riepilogo stampato a console: il manifest riporta il numero totale di
   asset approvati e gli eventuali file scartati da ciascuna sorgente.

## 2. Invio all'Apps Script `driveSync.gs`

1. Distribuisci `scripts/driveSync.gs` come Web App (Deploy → *Web App*) e annota
   l'URL pubblicato, oppure configura l'Execution API se preferisci invocare la
   funzione `updateApprovedAssets` direttamente.
2. Definisci nelle Script Properties:
   - `DRIVE_SYNC_APPROVED_ASSETS_TOKEN`: token condiviso da fornire al Web App per
     autorizzare l'aggiornamento della whitelist.
   - (Opzionale) `DRIVE_SYNC_APPROVED_ASSETS`: verrà sovrascritto dallo script con il
     JSON generato al passaggio successivo.
3. Esegui lo script di invio:
   ```bash
   npm run drive:push-approved -- \
     --url "https://script.google.com/macros/s/ID_DEPLOY/exec" \
     --token "<TOKEN>"
   ```
   Parametri utili:
   - `--token-location query|header|body` per scegliere dove passare il token
     (default: body JSON).
   - `--dry-run` per ispezionare il payload senza effettuare chiamate.

Lo script invia il manifest al Web App usando l'azione `updateApprovedAssets`; lo
script Apps Script salva il JSON nelle Script Properties e ricarica la whitelist in
memoria. Solo i file elencati (per sorgente) verranno poi processati dai run di
`convertYamlToSheets`.

## 3. Trigger e credenziali

- **Trigger time-driven**: esegui `ensureAutoSyncTrigger()` in Apps Script per
  installare il trigger ogni 6 ore (`ClockTrigger` → handler `convertYamlToSheets`).
  Questo è il flusso consigliato per mantenere allineati i dataset principali.
- **Trigger manuale**: `convertYamlToSheets()` può essere avviato on-demand per
  validare cambi rapidi o dopo aver aggiornato la whitelist.
- **Credenziali richieste**:
  - Account `ops.drive-sync@game-dev.internal` (o equivalente con permessi sulla
    cartella Drive e sul progetto Apps Script) per creare trigger e gestire le
    Script Properties.
  - Accesso al Web App protetto dal token configurato in `DRIVE_SYNC_APPROVED_ASSETS_TOKEN`.
  - Variabili localmente (`DRIVE_SYNC_WEBAPP_URL`, `DRIVE_SYNC_WEBAPP_TOKEN`) utili
    per automatizzare `push-approved-assets` senza passare parametri espliciti.

Tutte le configurazioni e i dettagli operativi di `driveSync.gs` restano descritti in
[`docs/drive-sync.md`](../drive-sync.md); questo documento aggiunge la sezione di
approvazione asset e la relativa automazione.
