# Telemetry Export — Log interazioni filtri

| Timestamp (UTC) | Evento | Recipient groups | Status | Only within schedule | Note |
|-----------------|--------|------------------|--------|-----------------------|------|
| 2025-11-08T07:12:04Z | analytics.export.modal_opened | hud_ops, qa_leads, support_ops_night | open, triaged, in_progress, blocked, resolved, closed | true | Preset default applicato dalla modale. |
| 2025-11-08T07:12:23Z | analytics.export.recipient_toggle | qa_leads, support_ops_night | open, triaged, in_progress, blocked, resolved, closed | true | Rimosso gruppo `hud_ops` per verifica canali drive. |
| 2025-11-08T07:12:38Z | analytics.export.status_toggle | qa_leads, support_ops_night | open, triaged, in_progress, resolved | true | Filtrati gli alert `blocked` e `closed` per isolare backlog attivo. |
| 2025-11-08T07:12:45Z | analytics.export.schedule_toggle | qa_leads, support_ops_night | open, triaged, in_progress, resolved | false | Disattivata guardia oraria per includere alert fuori finestra. |
| 2025-11-08T07:12:59Z | analytics.export.filters_applied | qa_leads, support_ops_night | open, triaged, in_progress, resolved | false | Export inviato su Slack QA + Drive sync. |

_Registro aggiornato da Analytics/Support per audit settimanale (drive-sync & pipeline telemetry-export)._ 
