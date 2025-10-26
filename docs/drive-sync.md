# Sincronizzazione YAML ↔ Google Sheets

Questa guida spiega come configurare lo script `scripts/driveSync.gs` su Google Apps Script per convertire i file YAML della repo in Google Sheet e mantenerli sincronizzati automaticamente.

## Prerequisiti
- **Account Google** con accesso a Drive e permessi per creare trigger di Apps Script.
- **Cartella Drive dedicata** contenente i file `.yaml` o `.yml` da sincronizzare.
- **Autorizzazioni** per spostare file nella cartella e creare nuovi Spreadsheet.
- **Quota Apps Script disponibile**: massimo 20 trigger per progetto e chiamate `UrlFetchApp` sufficienti per scaricare la libreria YAML.
- **Credenziali OAuth**: al primo avvio verranno richiesti i consensi per accedere a Drive, Spreadsheet, Script Properties, Cache e UrlFetch; confermare lo scope completo (`https://www.googleapis.com/auth/drive`, `.../drive.file`, `.../spreadsheets`, `.../script.external_request`).

## Configurazione iniziale
1. Apri [script.google.com](https://script.google.com) e crea un nuovo progetto collegato alla cartella Drive che contiene gli YAML ("Nuovo > Script" dall'interno della cartella).
2. Copia il contenuto di [`scripts/driveSync.gs`](../scripts/driveSync.gs) e incollalo nel progetto Apps Script.
3. Imposta gli script properties (`File > Project properties > Script properties`) con i valori desiderati:
   - `DRIVE_SYNC_FOLDER_ID`: ID della cartella Drive con gli YAML.
   - `DRIVE_SYNC_SHEET_PREFIX`: prefisso facoltativo da anteporre al nome dei fogli (default `[YAML]`).
   - `DRIVE_SYNC_YAML_LIB_URL`: URL della libreria js-yaml (lasciare il default salvo mirror interni).
   - `DRIVE_SYNC_AUTOSYNC_ENABLED`: `true`/`false` per attivare il trigger automatico.
   - `DRIVE_SYNC_AUTOSYNC_EVERY_HOURS`: intervallo di riesecuzione (1-24).
4. Salva il progetto, apri `Project Settings > Scopes` e verifica che gli scope siano coerenti con gli accessi richiesti; se necessario, forzare il re-deploy eliminando eventuali scope obsoleti.
5. Autorizza lo script eseguendo manualmente `convertYamlToSheets()` dalla barra "Run" e seguendo il flusso OAuth.

## Test manuale (`convertYamlToSheets`)
1. Preparare nella cartella Drive uno o più file YAML di test (es. `sample.yaml`).
2. Dal progetto Apps Script, eseguire `convertYamlToSheets()`.
3. Al termine:
   - Ogni file YAML genera (o aggiorna) uno Spreadsheet nominato con il prefisso configurato.
   - Gli Sheet creati vengono spostati automaticamente nella cartella sorgente.
4. Validare il risultato aprendo gli Spreadsheet e verificando che ogni chiave di primo livello dello YAML corrisponda a un tab.

## Trigger automatico (`ensureAutoSyncTrigger`)
1. Verificare le quote disponibili (`Resources > Triggers`) e assicurarsi di non aver raggiunto il limite di 20 trigger.
2. Eseguire `ensureAutoSyncTrigger()`:
   - Lo script controlla che le autorizzazioni siano concesse; in caso contrario fornisce l'URL per completare l'OAuth.
   - Se non esiste già un trigger sul metodo `convertYamlToSheets`, ne crea uno con frequenza pari all'intervallo configurato.
   - Il trigger suggerito per i dataset principali è **ogni 6 ore** (valore predefinito di `DRIVE_SYNC_AUTOSYNC_EVERY_HOURS`), con fallback giornaliero se l'intervallo viene impostato ≥24 ore.
3. È possibile rimuovere i trigger con `removeAutoSyncTriggers()` o dal pannello "Triggers".

### Trigger consigliati
| Handler                | Tipo       | Frequenza | Note |
|------------------------|------------|-----------|------|
| `convertYamlToSheets`  | time-based | ogni 6 h  | Mantiene sincronizzati i dataset YAML principali senza saturare le quote giornaliere. |
| `convertYamlToSheets`  | manuale    | on demand | Usare come fallback in caso di errori nel trigger automatico. |

Documentare nel pannello `Triggers` di Apps Script l'utente proprietario: il progetto deve appartenere a un account con permessi di modifica sulla cartella condivisa, altrimenti i fogli non vengono spostati nel Drive di destinazione.

## Quote e limiti
- **Esecuzione script**: max 6 minuti per esecuzione e 90 minuti totali/giorno per account consumer.
- **Chiamate `UrlFetchApp`**: 20.000 richieste/giorno; lo script utilizza una singola richiesta per recuperare `js-yaml` (riusata tramite cache).
- **Operazioni su Drive/Spreadsheet**: 10 minuti/giorno per `DriveApp` e 100 MB/giorno di scrittura su Spreadsheet; il dataset attuale è ben al di sotto del limite ma monitorare `Executions` in caso di picchi.
- **Trigger**: max 20 per progetto (già ricordato sopra) e 90 esecuzioni/ora per trigger time-based; il ritmo ogni 6 ore è sicuro.

Quando le quote vengono esaurite, Apps Script registra errori `Exceeded maximum execution time` o `Service invoked too many times` nei log: impostare notifiche email dal pannello `Triggers` per intercettare gli eventi.

## Limiti e note operative
- L'esecuzione dipende da `UrlFetchApp`: verificare che l'URL della libreria sia raggiungibile; usare un mirror se il CDN è bloccato.
- Gli Sheet vengono rigenerati a ogni esecuzione eliminando tab non presenti nello YAML; evitare modifiche manuali direttamente nei fogli.
- Gli array di oggetti vengono tabellati con colonne aggregate; altri tipi vengono serializzati in JSON.
- In caso di librerie YAML > 6 MB la cache di Apps Script può troncare il contenuto: utilizzare un host alternativo o caricare la libreria nel progetto.

## Manutenzione periodica
- Programmare una verifica trimestrale delle quote App Script e dei log di esecuzione (`Executions` panel) per individuare errori di parsing.
- Aggiornare la libreria js-yaml testando l'URL in un ambiente di staging prima di cambiare `DRIVE_SYNC_YAML_LIB_URL`.
- Usare `removeAutoSyncTriggers()` prima di rigenerare i trigger con un nuovo intervallo.
- Annotare gli Spreadsheet generati e i relativi link in [`docs/checklist/milestones.md`](checklist/milestones.md) per mantenere la tracciabilità delle sincronizzazioni.

## Workflow consigliato per i log VC
1. Eseguire i playtest e archiviare i log YAML in `logs/playtests/<data>/` (es. `logs/playtests/2025-10-24-vc/session-metrics.yaml`).【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】
2. Caricare i file nella cartella Drive configurata (`CONFIG.folderId`).
3. Lanciare `convertYamlToSheets()` per generare fogli come `[YAML] session-metrics` mantenendo le colonne `overcap_guard_events` introdotte dal nuovo tuning.
4. Verificare che i fogli aggiornati alimentino dashboard o grafici condivisi (es. Canvas VC) prima di archiviare le versioni precedenti.
