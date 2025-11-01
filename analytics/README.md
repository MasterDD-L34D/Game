# Analytics Toolkit

Questo pacchetto raccoglie gli script e le pipeline di analisi utilizzate per
monitorare lo stato dei dataset del gioco. In particolare, il dashboard di
copertura dei trait fornisce un quadro immediato dell'avanzamento dei campi
chiave (specie collegate, tag di bioma, flag di completamento, ecc.).

## Rigenerare il dashboard dei trait

1. Assicurarsi di avere le dipendenze Python installate:
   ```bash
   pip install -r tools/py/requirements.txt
   ```
2. Eseguire lo script dedicato:
   ```bash
   python tools/py/trait_completion_dashboard.py \
     --trait-reference data/traits/index.json \
     --out-markdown reports/trait_progress.md \
     --history-file logs/trait_audit/trait_progress_history.json
   ```
   - Usa `--no-history-update` per generare il report senza aggiornare lo
     storico JSON.

Lo script produce due artefatti:
- `reports/trait_progress.md`: tabella con i KPI aggiornati, elenco dei trait
  ancora privi di informazione e trend storico.
- `logs/trait_audit/trait_progress_history.json`: snapshot cronologico delle
  metriche di copertura (utile per grafici o confronti settimanali).

## Interpretare gli indicatori

| Indicatore | Significato | Azione consigliata |
| --- | --- | --- |
| **Specie collegate** | Percentuale di trait che hanno una relazione con il bestiario. | Mappa le abilità mancanti su specie esistenti o pianifica nuove creature. |
| **Tag bioma** | Copertura dei tag ambientali sperimentali. | Aggiungi i tag per migliorare le query e i filtri del catalogo. |
| **Tag d'uso** | Classificazione funzionale delle mutazioni. | Allinea nomenclatura con i registri di bilanciamento e con le UI di editing. |
| **Flag completamento** | Stato di revisione/QA per ciascun trait. | Chiudi i loop di review e aggiorna i flag nei file sorgente. |
| **Origine dati** | Provenienza editoriale o tecnica del tratto. | Traccia i dataset di origine per audit futuri e responsabilità. |

Il trend storico nel report mostra l'ultima decina di snapshot registrati: una
linea crescente suggerisce una buona copertura, mentre plateau prolungati
richiedono follow-up con i team di narrative e bilanciamento.


## Analisi bilanciamento tratti

1. Assicurati di avere le dipendenze grafiche installate (pandas, matplotlib, seaborn).
   ```bash
   pip install pandas matplotlib seaborn
   ```
2. Lancia l'analisi completa: 
   ```bash
   python analytics/trait_balance_analysis.py
   ```
   - Puoi personalizzare le sorgenti con `--index` e `--species-bridge` se stai lavorando su esportazioni alternative.
3. I grafici sono salvati localmente in `reports/trait_balance/` (heatmap biomi/tier, top specie, sinergie per famiglia); la cartella è ignorata dal versionamento così da evitare di tracciare i PNG generati.
4. Le note interpretative sono aggiornate in `reports/trait_balance_summary.md` e mettono in evidenza i biomi saturi, le specie con più accesso e le famiglie dominanti nelle sinergie.
   - Usa questi punti come base per priorizzare interventi di bilanciamento: ridistribuisci tratti nei biomi poveri, amplia l'accesso delle specie marginali e riequilibra sinergie troppo concentrate.
