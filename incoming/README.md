# Incoming

Questa cartella raccoglie i materiali grezzi (appunti, PDF, zip, ecc.) che devono essere analizzati prima di essere integrati nel progetto.

## Generare i report

1. Posiziona in questa cartella i file o le directory che vuoi esaminare.
2. Dal root del repository esegui lo script dedicato:
   ```bash
   ./scripts/report_incoming.sh
   ```
   Puoi passare argomenti aggiuntivi (ad esempio `--destination sessione-2024-05-19`) che verranno inoltrati al comando Python sottostante.

Lo script produce sia il report JSON sia quello HTML invocando `tools/py/game_cli.py`. I file vengono salvati nella directory `reports/incoming/<destinazione>/` con i nomi `report.json` e `report.html`. Se non specifichi una destinazione, viene usata automaticamente la sottocartella `reports/incoming/latest/`.

Per evitare la creazione di file e ottenere solo l'output JSON su `stdout`, puoi lanciare:
```bash
./scripts/report_incoming.sh --destination -
```
