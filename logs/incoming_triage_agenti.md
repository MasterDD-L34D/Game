# Canale `#incoming-triage-agenti` — Registro aggiornamenti

<!-- incoming_triage_log:start -->
## 2025-11-10T07:45:00Z · Bozza annuncio piano settimanale
- **Messaggio Slack**: preparata bozza per `#incoming-triage-agenti` con link a backlog, registro sessioni e roadmap; disponibile in `logs/incoming_triage_slack_plan_2025-11-10.md` pronta per il post manuale.【F:logs/incoming_triage_slack_plan_2025-11-10.md†L1-L23】
- **Aggiornamenti richiesti**: dopo la pubblicazione ricordarsi di spostare le card Kanban secondo gli highlight e registrare outcome su `docs/process/incoming_review_log.md`.【F:docs/process/incoming_agent_backlog.md†L9-L38】【F:docs/process/incoming_review_log.md†L1-L27】
- **Prossimi passi**: confermare completamento del fix `unzip -o`, smoke test CLI `staging_incoming` e consolidamento report `recon_meccaniche.json` durante gli slot del 10-11 novembre.【F:docs/process/incoming_agent_backlog.md†L18-L47】
## 2025-11-09T08:30:00Z · Pianificazione slot calendario condiviso
- **Calendario condiviso**: programmati tre slot (10:00, 14:30, 11:00 CET) per le card `evo_pacchetto_minimo_v7`, `ancestors_integration_pack_v0_5` e `recon_meccaniche.json`, collegando ciascun blocco alla tabella "Slot calendario condiviso" nel backlog agentico.【F:docs/process/incoming_agent_backlog.md†L18-L36】
- **Prerequisiti pre-slot**: verificare prima di ogni blocco il fix `unzip -o` e la rigenerazione log `sessione-2025-11-10`, la disponibilità dell'ambiente `staging_incoming` con smoke test salvato e la raccolta stime/confronti per `recon_meccaniche.json`.【F:docs/process/incoming_agent_backlog.md†L28-L36】
- **Controlli post-processo**: al termine di ciascun slot aggiornare la colonna della card sul Kanban, allegare evidenze nei log `logs/incoming_triage_agenti.md`/`logs/incoming_smoke/` e sincronizzare la knowledge base (`docs/process/incoming_review_log.md`).【F:docs/process/incoming_agent_backlog.md†L28-L36】
## 2025-11-08T09:15:00Z · Aggiornamento assignment caretaker
- **Audit caretaker**: riallineata la snapshot `reports/data_inventory.md` con i caretaker del playbook per gli asset prioritari (`evo_pacchetto_minimo_v7`, `ancestors_integration_pack_v0_5`, `recon_meccaniche.json`).【F:reports/data_inventory.md†L109-L139】
- **Kanban**: accodate note prerequisito su ciascuna card (fix `unzip -o`, smoke test CLI staging, raccolta stime analisi) nella sezione backlog dedicata.【F:docs/process/incoming_agent_backlog.md†L9-L21】
- **Notifiche caretaker**: ping inviato a `AG-Biome`, `AG-Core`, `AG-Validation`, `AG-Toolsmith` per acknowledgement e condivisione ETA (richiesto update nel thread `#incoming-triage-agenti`).【F:docs/process/incoming_review_log.md†L15-L19】【F:logs/incoming_triage_agenti.md†L5-L11】
## 2025-11-08T00:00:00Z · Sincronizzazione stato pipeline
- **Playbook & backlog**: confermata la distribuzione dei caretaker e il flusso di triage secondo `docs/process/incoming_triage_pipeline.md`, `docs/process/incoming_agent_backlog.md` e `docs/templates/incoming_triage_meeting.md`.
- **Widget Support Hub**: verificato che `docs/index.html` → sezione "Incoming Pipeline" carichi l'ultima voce di `docs/process/incoming_review_log.md` (report 2025-10-29) tramite `parseLatestIncomingSession` in `docs/site.js`.
- **Dipendenze**: follow-up aperto per `AG-Toolsmith` sul fix `unzip -o` di `scripts/report_incoming.sh`; necessario per sbloccare la riesecuzione di `AG-Validation` su `evo_tactics_param_synergy_v8_3.zip`.
<!-- incoming_triage_log:end -->
