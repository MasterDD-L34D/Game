# Feedback toolkit

Questo modulo raccoglie configurazioni, script e flussi operativi per centralizzare la raccolta feedback. I file sono pensati per essere consumati dalla webapp, dalla documentazione e dagli script CLI.

## Struttura
- `form_config.yaml`: definizione del form (sezioni, campi, vincoli).
- `collection_pipeline.yaml`: processi post-intake e stati operativi.
- `sync_tasks.py`: sincronizza i feedback prioritari con il backlog incoming.
- `report_generator.py`: compila report settimanali in HTML/CSV.
- `cleanup.py`: archivia e ripulisce le submission storiche.

## Workflow rapido
1. Aggiorna `form_config.yaml` quando aggiungi nuove feature o mutazioni da tracciare.
2. Personalizza `collection_pipeline.yaml` per riflettere SLA e owner correnti.
3. Esegui `python sync_tasks.py --dry-run` per verificare la sincronizzazione con il backlog.
4. Pianifica `report_generator.py` tramite cron/CI per ricevere report automatici.

Per istruzioni operative consulta:
- [Pipeline di raccolta feedback](../../docs/process/feedback_collection_pipeline.md)
- [Tutorial form feedback](../../docs/tutorials/feedback-form.md)
