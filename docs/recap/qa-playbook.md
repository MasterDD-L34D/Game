# QA Playbook · Nebula Release Flow

Questo playbook riassume come mantenere allineati i report QA orchestrati e come sfruttare la console UI per seguire i rilasci Nebula.

## Rigenerare i report QA

I report vengono generati dal bridge Node ↔ orchestrator Python (`scripts/export-qa-report.js`). Il job avvia un worker Python, raccoglie i trait diagnostics e normalizza due output:

* `reports/trait_baseline.json` – dump completo degli stati dei tratti con copertura, conflitti e sorgenti dati.
* `reports/qa_badges.json` – riepilogo per i badge UI (totali superati, conflitti, tratti senza copertura) con gli highlight principali.

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

Il comando è un wrapper di `node scripts/export-qa-report.js` e aggiorna i file in `reports/`. Lo stesso script gira in CI (`.github/workflows/qa-reports.yml`) e fallisce se i report non sono in sync: se vedi il job rosso, esegui i comandi sopra e committa i JSON aggiornati.

## Esportare i log dalla console UI

Nella sezione **Log runtime** della `QualityReleaseView` sono disponibili due pulsanti:

* **Esporta JSON QA** – esporta l'elenco filtrato in JSON.
* **Esporta CSV QA** – esporta lo stesso set in CSV, utile per spreadsheet e share rapide.

Il filtro scope applicato nella toolbar (Tutti/Specie/Biomi/Foodweb/Publishing) determina le righe esportate. Ogni azione viene tracciata nei log client per audit (`quality.logs.exported`).

## Interpretare i badge UI

I badge che compaiono nella console QA (`Specie`, `Biomi`, `Foodweb` e il badge addizionale `Traits`) si basano sulle metriche caricate via snapshot orchestrator e sul riepilogo di `qa_badges.json`:

* `checks.traits.passed / total` evidenzia quanti tratti hanno metadati glossary completi.
* `checks.traits.matrix_mismatch` e `highlights.matrix_mismatch_traits` aiutano a individuare tratti senza copertura nel matrix.
* `highlights.glossary_missing` e `highlights.zero_coverage_traits` elencano priorità per gli interventi manuali.

Per un controllo rapido confronta i badge UI con i JSON:

1. Apri `reports/qa_badges.json` e verifica gli ID presenti nelle liste highlight.
2. Usa i pulsanti di esportazione della console per scaricare i log pertinenti e allegarli alle note QA.

In caso di incongruenze tra badge e dataset:

* rigenera i report (`npm run export:qa`),
* controlla che il worker orchestrator abbia prodotto `trait_baseline.json` aggiornato,
* aggiorna la dashboard UI ricaricando lo snapshot (`/api/generation/snapshot`).
