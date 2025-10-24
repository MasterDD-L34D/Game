# Sincronizzazione YAML ↔ Google Sheets

Questa guida spiega come configurare lo script `scripts/driveSync.gs` su Google Apps Script per convertire i file YAML della repo in Google Sheet e mantenerli sincronizzati automaticamente.

## Prerequisiti
- **Account Google** con accesso a Drive e permessi per creare trigger di Apps Script.
- **Cartella Drive dedicata** contenente i file `.yaml` o `.yml` da sincronizzare.
- **Autorizzazioni** per spostare file nella cartella e creare nuovi Spreadsheet.
- **Quota Apps Script disponibile**: massimo 20 trigger per progetto e chiamate `UrlFetchApp` sufficienti per scaricare la libreria YAML.

## Configurazione iniziale
1. Apri [script.google.com](https://script.google.com) e crea un nuovo progetto collegato alla cartella Drive che contiene gli YAML ("Nuovo > Script" dall'interno della cartella).
2. Copia il contenuto di [`scripts/driveSync.gs`](../scripts/driveSync.gs) e incollalo nel progetto Apps Script.
3. Imposta gli script properties (`File > Project properties > Script properties`) con i valori desiderati:
   - `DRIVE_SYNC_FOLDER_ID`: ID della cartella Drive con gli YAML.
   - `DRIVE_SYNC_SHEET_PREFIX`: prefisso facoltativo da anteporre al nome dei fogli (default `[YAML]`).
   - `DRIVE_SYNC_YAML_LIB_URL`: URL della libreria js-yaml (lasciare il default salvo mirror interni).
   - `DRIVE_SYNC_AUTOSYNC_ENABLED`: `true`/`false` per attivare il trigger automatico.
   - `DRIVE_SYNC_AUTOSYNC_EVERY_HOURS`: intervallo di riesecuzione (1-24).
4. Salva e autorizza lo script eseguendo manualmente `convertYamlToSheets()` dalla barra "Run".

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
3. È possibile rimuovere i trigger con `removeAutoSyncTriggers()` o dal pannello "Triggers".

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
