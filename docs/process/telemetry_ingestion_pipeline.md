# Pipeline Dati Telemetria → Tabella QA/Design

Questo documento descrive la configurazione operativa per alimentare la tabella centrale di controllo (base Airtable `Segnalazioni` oppure equivalente DB relazionale) con tre canali di input — telemetria automatizzata, snapshot visuali e modulo QA manuale — e per garantire monitoraggio continuo della qualità dei dati.

## 1. Export telemetria e import automatico
### 1.1 Valutazione sorgenti
- **Inventario API/CSV**
  - Verificare se il backend telemetria espone endpoint REST (`/metrics/export`, `/events?from=...`) con autenticazione service account.
  - In assenza di API, pianificare export periodico dei CSV (report scheduler o dump da warehouse) nella cartella `telemetria/raw/` su storage condiviso.
- **Schema minimo richiesto**
  - `event_timestamp` (UTC, ISO 8601).
  - `session_id`, `player_id`, `match_id`.
  - `metric_key` (`aggro_index`, `risk_index`, `tilt_trigger`, ecc.).
  - `metric_value` normalizzata a float.
  - Metadati opzionali: `map_id`, `form_seed`, `build_version`.

### 1.2 Job di normalizzazione
- **Strumento**: preferire script Python (`scripts/pipeline/telemetry_ingest.py`) con librerie `pandas`/`requests`.
- **Frequenza**: cron oraria (`0 * * * *`) per pipeline near-real-time.
- **Steps**:
  1. Recupero token OAuth2 service account (scadenza 1h) → caching in `~/.cache/telemetry/`.
  2. Download delta rispetto all'ultimo `event_timestamp` processato (persistito in `logs/pipeline_state.json`).
  3. Conversione timezone → UTC, cast numerici, rimozione duplicati su (`session_id`, `metric_key`, `event_timestamp`).
  4. Mapping `metric_key` → colonne standard della tabella (`Aggro`, `Risk`, `Cohesion`, `Setup`, `Explore`, `Tilt`).
  5. Calcolo indicatori derivati (EMA 5/15/60 minuti) come richiesto da `docs/24-TELEMETRIA_VC.md`.
  6. Serializzazione batch in CSV normalizzato (`telemetria/processed/YYYY/MM/DD/batch_<timestamp>.csv`).
  7. Invio verso tabella: chiamata API Airtable (`PATCH`/`POST`) oppure stored procedure (`CALL upsert_telemetry_batch(...)`).
- **Error handling**:
  - Retries esponenziali (max 3) su failure di rete.
  - Skip batch se >5% record invalidi, log in `logs/pipeline_errors.log` + notifica Slack.

### 1.3 Mappatura schema tabella
| Campo tabella | Origine | Tipo | Note |
| --- | --- | --- | --- |
| `Fonte` | costante `telemetry-log` | Single select | Segmentazione per pipeline. |
| `Timestamp evento` | `event_timestamp` | DateTime | Sempre UTC. |
| `Session ID` | `session_id` | Testo | Chiave secondaria. |
| `Indice Aggro` | Derivazione `metric_value` | Number (decimali) | 2 decimali, clamp 0-100. |
| `Indice Risk` | Derivazione `metric_value` | Number | Idem. |
| `Indice Cohesion` | Derivazione `metric_value` | Number | Idem. |
| `Indice Setup` | Derivazione `metric_value` | Number | Idem. |
| `Indice Explore` | Derivazione `metric_value` | Number | Idem. |
| `Indice Tilt` | Derivazione `metric_value` | Number | Idem. |
| `EMA_5`, `EMA_15`, `EMA_60` | Calcolo step 5 | Number | Facoltativi ma consigliati. |
| `Build` | `build_version` | Testo | Per regressioni. |
| `Allegati` | link storage | URL | Inserito se esistono log raw. |

## 2. Automazione screenshot
### 2.1 Raccolta e storage
- **Origine**: snapshot da test visivi, manuali o tool regression (`tools/visual-regression/*`).
- **Routine proposta**: script (`scripts/pipeline/upload_screenshots.py`) eseguibile via CI nightly.
  1. Scan directory `logs/screenshots/pending/`.
  2. Upload su bucket S3 (`s3://vc-evidence/screenshots/`) o Drive condiviso (API v3) con ACL lettura pubblica con token firmato (scadenza ≥ 30 giorni).
  3. Generazione URL pubblico + checksum (SHA256) salvato nel metadata.
  4. Spostamento file in `logs/screenshots/archive/` con retention 90 giorni.

### 2.2 Aggiornamento tabella
- Per ogni upload completato:
  - Creare/aggiornare record su tabella `Evidenze` (linkata a `Segnalazioni`).
  - Campi minimi: `ID segnalazione` (lookup), `Tipo evidenza` = `screenshot`, `URL pubblico`, `Checksum`, `Autore`, `Timestamp upload`.
  - Se l'evidenza nasce da test automatizzato, impostare `Fonte` record principale su `visual-regression` e allegare link nel campo `Link a evidenze`.
- Automazione Airtable: webhook "nuovo attachment" → aggiorna campo formula `Evidenza più recente`.

## 3. Modulo QA manuale
### 3.1 Scelta strumento
- **Opzione rapida**: Google Form collegato al foglio `QA Intake`. Campi obbligatori:
  - `Email QA` (risposta precompilata).
  - `Build testata` (drop-down sincronizzato con `build_version`).
  - `Categoria` (`telemetry`, `ui`, `gameplay`, `performance`, `altro`).
  - `Descrizione breve` (short text ≤ 140 char).
  - `Descrizione dettagliata` (long text, obbligatorio).
  - `Passi di riproduzione` (long text, obbligatorio).
  - `Evidenza richiesta?` (checkbox) → condizionale carica link o upload.
  - `Priorità suggerita` (`critical`/`high`/`medium`/`low`).
- **Opzione avanzata**: webform interno (Next.js + Supabase) con validazione in linea e upload diretto verso storage `vc-evidence`.

### 3.2 Integrazione con tabella
- Utilizzare Apps Script (`scripts/qa_form_sync.gs`) che ascolta l'evento `onFormSubmit`:
  1. Legge le colonne del foglio risposte e mappa sui campi `Segnalazioni`.
  2. Normalizza `Priorità` → single select.
  3. Se `Evidenza richiesta?` = true e link fornito, popola `Link a evidenze`.
  4. Crea record via API REST `POST https://api.airtable.com/v0/<baseId>/Segnalazioni`.
  5. Scrive back `RecordID` Airtable nel foglio (colonna nascosta) per evitare duplicati.
- Controllo qualità: validare lunghezza `Descrizione` (<500 char) e presenza minima di 3 passi riproduzione.

## 4. Monitoraggio e alerting
### 4.1 Notifiche su failure
- **Stack**: cronjobs loggano su `logs/pipeline_errors.log` + invio eventi a Slack webhook `#vc-telemetry-alerts`.
- **Policy**:
  - Se job telemetria fallisce 2 volte consecutive → alert `critical` con mention `@data-oncall`.
  - Se upload screenshot fallisce >10 file in un run → alert `warning`.
  - Se modulo QA restituisce errore HTTP (status >= 400) durante creazione record → alert `critical` con dettagli payload anonimizzato.

### 4.2 Verifiche periodiche integrità dati
- **Script programmato** (`scripts/pipeline/audit_ingestion.py`) eseguito giornalmente h 07:00 CET:
  - Confronta numero record generati da ciascuna pipeline con baseline (media ultime 7 giornate ±20%).
  - Esegue controlli di schema (campi nulli in `Timestamp evento`, `Indice Aggro` fuori range).
  - Verifica coerenza link evidenze (`HTTP 200` per URL).
  - Produce report Markdown salvato in `logs/reports/ingestion_audit_<YYYYMMDD>.md` e invia summary via email.
- **Metriche chiave** da tracciare in dashboard (Looker/Data Studio):
  - `telemetry_ingest_success_rate`.
  - `qa_form_submission_count`.
  - `evidence_attachment_latency` (tempo tra creazione segnalazione e upload evidenza).

### 4.3 Disaster recovery / fallback manuale
- Conservare ultimi 30 giorni di CSV normalizzati per re-import manuale.
- Documentare procedura di re-run nel `README` dello script (`python scripts/pipeline/telemetry_ingest.py --replay 2024-05-01 2024-05-07`).
- Prevedere checklist settimanale per QA Lead:
  1. Verificare che tutti i job abbiano eseguito (cron logs).
  2. Spot check di 3 segnalazioni casuali incrociando dati telemetria + screenshot + form.
  3. Aggiornare il registro decisioni in `docs/tool_run_report.md` in caso di anomalie.

## 5. Ownership e governance
- **Owner tecnico**: Data Engineer (gestione script, storage, credenziali).
- **Owner QA**: QA Lead (monitoraggio modulo manuale, validazione evidenze).
- **Owner Product**: PM LiveOps (verifica KPI e follow-up segnalazioni critiche).
- Richiedere revisione trimestrale della pipeline in riunione `VC Reviews` (vedi `docs/24-TELEMETRIA_VC.md`).

## 6. Check-list Go-Live
1. Credenziali service account archiviate in vault (HashiCorp/1Password) con rotazione 90 giorni.
2. Storage bucket configurato con versioning e lifecycle rule (archiviazione 180 giorni → cold storage).
3. Trigger cron e Apps Script attivi (testati con dry-run).
4. Slack webhook registrati e testati.
5. Dashboard monitoraggio pubblicata e condivisa con stakeholder.
6. Documentazione aggiornata in Confluence/Notion con link a questo file e script.
