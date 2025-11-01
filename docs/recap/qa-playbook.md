# QA Playbook · Nebula Release Flow

Questo playbook riassume come mantenere allineati i report QA orchestrati e come sfruttare la console UI per seguire i rilasci Nebula.

## Rigenerare i report QA

I report vengono generati dal bridge Node ↔ orchestrator Python (`scripts/export-qa-report.js`). Il job avvia un worker Python, raccoglie i trait diagnostics e normalizza quattro output coordinati:

* `reports/trait_baseline.json` – dump completo degli stati dei tratti con copertura, conflitti, sorgenti dati e tassonomia.
* `reports/generator_validation.json` – fotografia dei check runtime sull'orchestrator (pass/fail, warning e note contestuali).
* `reports/qa_badges.json` – riepilogo per i badge UI (totali superati, conflitti, tratti senza copertura) con gli highlight principali.
* `reports/qa-changelog.md` – changelog sintetico con delta rispetto allo snapshot precedente, utile per note recap e Flow Shell.

### Requisiti

* Python 3.11 con le dipendenze definite in `tools/py/requirements.txt`.
* Node.js 20 (come in CI) per eseguire lo script.

### Comandi

Per rigenerare manualmente i report:

```bash
npm install          # solo se non hai già le dipendenze locali
python -m pip install -r tools/py/requirements.txt
npm run export:qa
```

Il comando è un wrapper di `node scripts/export-qa-report.js` e aggiorna i file in `reports/`. Lo stesso script gira in CI (`.github/workflows/qa-reports.yml`) e fallisce se i report non sono in sync: se vedi il job rosso, esegui i comandi sopra e committa i JSON/Markdown aggiornati. Il bridge Node avvia automaticamente l'orchestrator Python e chiude il pool al termine, quindi non servono processi manuali aggiuntivi.

### Workflow manuale GitHub

Per produrre un export on-demand e allegarlo al recap, usa il workflow `QA export manual` (`.github/workflows/qa-export.yml`):

1. Apri **Actions → QA export manual → Run workflow** e (opzionale) indica il numero di PR da commentare.
2. Il job esegue `scripts/export-qa-report.js`, carica gli artefatti (`qa_badges.json`, `trait_baseline.json`, `generator_validation.json`, `qa-changelog.md`) e pubblica un commento con i badge QA.
3. Il commento include i badge `shields.io`, gli highlight principali e link diretti agli artefatti: usalo come fonte per il canale Flow Shell e per la sezione “QA Highlights” del recap.

Gli stessi artefatti restano scaricabili dall'esecuzione Actions e sono già formattati per essere caricati nella Flow Shell (`Quality Release → QA Highlights`).

## Esportare i log dalla console UI

Nella sezione **Log runtime** della `QualityReleaseView` sono disponibili due pulsanti:

* **Esporta JSON QA** – esporta l'elenco filtrato in JSON.
* **Esporta CSV QA** – esporta lo stesso set in CSV, utile per spreadsheet e share rapide.

I pulsanti restano disabilitati quando non ci sono log visibili per evitare export vuoti. Ogni azione produce un evento `quality.logs.exported` che include formato, filename generato e numero di righe esportate (`data.count`).

Il filtro scope applicato nella toolbar (Tutti/Specie/Biomi/Foodweb/Publishing) determina le righe esportate. Ogni azione viene tracciata nei log client per audit (`quality.logs.exported`).

## Interpretare i badge UI

I badge che compaiono nella console QA (`Specie`, `Biomi`, `Foodweb` e il badge addizionale `Traits`) si basano sulle metriche caricate via snapshot orchestrator e sul riepilogo di `qa_badges.json`. Il servizio UI (`webapp/src/services/clientLogger.js`) trasforma gli stessi dati in highlight, riusati dal recap (`tools/recap/generateRecap.js`) e dal commento automatico del workflow:

* `checks.traits.passed / total` evidenzia quanti tratti hanno metadati glossary completi.
* `checks.traits.matrix_mismatch` e `highlights.matrix_mismatch_traits` aiutano a individuare tratti senza copertura nel matrix.
* `highlights.glossary_missing` e `highlights.zero_coverage_traits` elencano priorità per gli interventi manuali.

Per un controllo rapido confronta i badge UI con i report esportati:

1. Apri `reports/qa_badges.json` (o la sezione artefatti del workflow) e verifica gli ID presenti nelle liste highlight.
2. Consulta `reports/qa-changelog.md` per capire cosa è cambiato rispetto all’ultimo ciclo.
3. In Flow Shell (`Quality Release → QA Highlights`) controlla che badge e highlight coincidano con il commento Actions.
4. Usa i pulsanti di esportazione della console per scaricare i log pertinenti e allegarli alle note QA.

In caso di incongruenze tra badge e dataset:

* rigenera i report (`npm run export:qa`) oppure rilancia il workflow manuale,
* controlla che il worker orchestrator abbia prodotto `trait_baseline.json` e `generator_validation.json` aggiornati,
* aggiorna la dashboard UI ricaricando lo snapshot (`/api/generation/snapshot`).
