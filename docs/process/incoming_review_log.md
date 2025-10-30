# Incoming Review — Registro sessioni agentiche

`AG-Orchestrator` annota ogni sessione asincrona seguendo il [template](../templates/incoming_triage_meeting.md). Le nuove sezioni vengono aggiunte in cima al file.

> Nota: il Support Hub (`docs/index.html`) legge la prima sezione datata per mostrare l'ultimo report. Mantieni il formato `## YYYY-MM-DD — Facilitatore: ...` e aggiorna il link HTML dopo ogni triage.

---

## 2025-11-13 — Facilitatore: `AG-Orchestrator`
- Report: `docs/process/incoming_agent_streams.md`
- Agenti coinvolti: `AG-Validation`, `AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith`
- Decisioni chiave:
  - Raccolte e consolidate le schede operative dei cinque stream agentici (triage, validazione, biomi, personality, tooling) in un unico riferimento aggiornato.
  - Pubblicato il link del documento nel canale `#incoming-triage-agenti` per garantire visibilità a tutti i caretaker.
- Follow-up:
  - Verificare nella prossima sessione che ogni caretaker abbia preso in carico gli aggiornamenti di responsabilità/dependenze elencati.


## 2025-10-29 — Facilitatore: `AG-Orchestrator`
- Report: `reports/incoming/sessione-2025-10-29/report.html`
- Agenti coinvolti: `AG-Validation`, `AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith`
- Decisioni chiave:
  - Avvio manuale della pipeline completato con generazione di report HTML/JSON; validazioni automatiche positive per 10 archivi `*.zip` su 11 e dataset singoli (`README_SCAN_STAT_EVENTI.md`, `recon_meccaniche.json`, `engine_events.schema.json`).
  - Identificato incidente di estrazione su `incoming/evo_tactics_param_synergy_v8_3.zip` dovuto a conflitti di file duplicati (`pack_biome_jobs_v7.json` vs `pack_biome_jobs_v8_alt.json`), bloccando lo script con prompt interattivo.
  - Evidenziati tre asset prioritari per il ciclo in corso: `evo_pacchetto_minimo_v7.zip` (hook biomi → `AG-Biome`), `ancestors_integration_pack_v0_5.zip` (ecosistema completo → `AG-Core`), `recon_meccaniche.json` (nuove regole evento → `AG-Validation`).
- Follow-up:
  - `AG-Toolsmith` (entro 2025-10-30): aggiornare `scripts/report_incoming.sh` per forzare estrazione non interattiva (`unzip -o`) e registrare regressione nel log manutenzione.
  - `AG-Validation` (entro 2025-10-31): rieseguire `report_incoming.sh` dopo la patch per rigenerare validazione su `evo_tactics_param_synergy_v8_3.zip` e allegare esito alla card Kanban.
  - `AG-Orchestrator` (entro 2025-10-29): creare card Kanban dedicate ai tre asset prioritari e notificare caretaker.

## YYYY-MM-DD — Facilitatore: `AG-Orchestrator`
- Report: `reports/incoming/sessione-YYYY-MM-DD/index.html`
- Agenti coinvolti: `AG-Validation`, `AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith`
- Decisioni chiave:
  - ...
- Follow-up:
  - ...

*(Aggiungere nuove sezioni sopra questa riga di placeholder.)*
