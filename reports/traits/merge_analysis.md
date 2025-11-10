# Analisi merge trait – aggiornamento TRT-03

## Contesto del batch

- **Fonte primaria**: `incoming/lavoro_da_classificare/traits/traits_aggregate.json`
  (50 trait con codici `TR-11xx` → `TR-20xx`).
- **Audit duplicati**: `python traits/scripts/audit_duplicates.py`
  (esecuzione 2025-11-10T19:30:29Z UTC) → nessun duplicato rilevato, report
  vuoto in `reports/traits/duplicates.csv`.
- **Documentazione di supporto**: inventario normalizzato in
  [`traits/glossary.md`](../../traits/glossary.md).

## Risultati principali

| Indicatore | Valore |
| --- | --- |
| Trait totali analizzati | 50 |
| Famiglie con almeno un trait | 27 |
| Tier distribuiti | T2 (14) · T3 (26) · T4 (10) |
| Fattore energetico | Basso (22) · Medio (24) · Alto (4) |
| Trait con >1 sinergia | 5 |
| Trait con conflitti dichiarati | 4 |

### Distribuzione sinergie e conflitti

- La maggior parte dei trait (45/50) definisce una sola sinergia diretta,
  favorendo catene lineari facili da integrare nel catalogo esistente.
- Quattro trait (`TR-1103`, `TR-1105`, `TR-1303`, `TR-1305`) espongono conflitti
  espliciti che andranno verificati contro le regole già presenti in
  `data/traits/index.json` per evitare inconsistenze nelle build automatiche.

### Copertura famiglie

Le famiglie `Locomotivo/Terrestre`, `Cognitivo/Sociale`,
`Difensivo/Camuffamento`, `Fisiologico/Metabolico`, `Offensivo/Controllo` e
`Sensoriale/Visivo` coprono da tre a sette trait ciascuna, offrendo materiale
sufficiente per creare pacchetti tematici senza duplicazioni semantiche.

## Raccomandazioni per il merge

1. **Creazione slug** – Convertire le etichette in chiavi kebab-case per
   allinearsi alla struttura di `data/core/traits/glossary.json` (es.:
   `Rostro Emostatico-Litico` → `rostro-emostatico-litico`).
2. **Arricchimento descrizioni** – Popolare i campi `description_it` e
   `description_en` usando i testi `uso_funzione` e `mutazione_indotta` quando
   disponibili, mantenendo l'attuale convenzione del glossario.
3. **Validazione incrociata** – Eseguire `python tools/py/validate_registry_naming.py`
   indicando il nuovo glossario per garantire coerenza con gli ID esistenti.
4. **Aggiornamento report** – Rigenerare `tools/py/report_trait_coverage.py`
   dopo l'import per aggiornare i KPI di copertura (`trait_coverage_report.json`).

## Prossimi passi

- Pianificare il merge in `data/core/traits/glossary.json` applicando le
  raccomandazioni sopra.
- Annotare le sinergie multiple in `traits/glossary.md` (se emergono nuove
  dipendenze) e aprire un ticket per gestire eventuali conflitti non risolvibili
  automaticamente.
