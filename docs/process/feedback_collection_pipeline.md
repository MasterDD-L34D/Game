# Pipeline di raccolta feedback

Questa guida descrive in dettaglio il flusso operativo per raccogliere, filtrare e integrare i feedback provenienti da playtest, demo interne e canali asincroni. È pensata per accompagnare il nuovo form centralizzato definito in `tools/feedback/form_config.yaml` e per fornire riferimenti rapidi a chi gestisce triage, follow-up e comunicazione.

## 1. Obiettivi principali
- Garantire una **raccolta strutturata** dei feedback, con metadati minimi per identificare build, feature e intensità dei problemi.
- Ridurre il tempo di **triage** combinando etichette automatiche e code prioritarie.
- Fornire al team di design e alle pipeline di qualità un set di **azionabili** chiaro e versionato.

## 2. Panoramica del flusso
1. **Invio**: i tester compilano il form centralizzato (webapp, dashboard docs o CLI) includendo build ID, scenario giocato e livello di severità.
2. **Ingest**: un job programmato (`feedback_intake`) salva le submission nel datastore `data/feedback/` e pubblica il riepilogo nel canale Slack `#feedback-intake`.
3. **Triage giornaliero**: gli owner (vedi tabella ruoli) smistano ogni ticket assegnando label `gameplay`, `tecnica`, `narrativa` o `ux` e definiscono priorità.
4. **Routing**: i feedback prioritari generano task in `incoming/FEATURE_MAP_EVO_TACTICS.md` tramite lo script `tools/feedback/sync_tasks.py`.
5. **Follow-up**: stato e note vengono sincronizzati verso il form (per email) e verso la dashboard `docs/playtest-log-guidelines.md`.

## 3. Ruoli e responsabilità
| Ruolo | Owner | Responsabilità | Frequenza |
| --- | --- | --- | --- |
| Intake steward | Ops QA | Monitorare Slack `#feedback-intake`, assicurare completezza metadati | 2 volte al giorno |
| Gameplay curator | Lead Design | Validare priorità, assegnare follow-up a design o narrative | Giornaliera |
| Tech curator | Lead Engineering | Triagiare bug tecnici, aprire ticket in `services/` o `webapp/` | Giornaliera |
| Report maintainer | Producer | Aggiornare report settimanale e comunicare gli highlight | Settimanale |

## 4. Checklist operativa
- [ ] Verificare che ogni submission abbia `build_version` e `scenario_slug`.
- [ ] Applicare label prioritaria (`P0`, `P1`, `P2`) e categoria.
- [ ] Aggiornare il campo `status` in `tools/feedback/collection_pipeline.yaml` quando il follow-up è completato.
- [ ] Notificare il tester se `requires_followup` è vero e l'azione è stata implementata.

## 5. Metriche e dashboard
- **Tempo medio di triage** (Target: < 12h) — calcolato nel report generato da `tools/feedback/report_generator.py`.
- **Feedback chiusi per sprint** (Target: ≥ 15) — monitorati in `analytics/feedback/weekly_summary.csv`.
- **Copertura build** (Target: 100% build principali) — confrontare con `docs/roadmap_generator.md`.

## 6. Automazioni collegate
- `tools/feedback/sync_tasks.py`: esporta priorità su backlog.
- `tools/feedback/report_generator.py`: crea snapshot HTML/CSV per il playtest weekly.
- `tools/feedback/cleanup.py`: archivia submission vecchie di 90 giorni.

## 7. Risorse correlate
- [Tutorial form feedback](../tutorials/feedback-form.md)
- [Linee guida playtest](../playtest/playtest-log-guidelines.md)
- [Schema telemetria VC](../24-TELEMETRIA_VC.md)

> Mantieni questa pagina aggiornata ad ogni revisione del processo: annota in `docs/changelog.md` le modifiche rilevanti in modo da garantire tracciabilità.
