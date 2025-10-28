# Walkthrough demo VC

Questa guida accompagna la presentazione pubblica della demo VC mostrando in sequenza HUD, vista SquadSync e controlli di export. È pensata per essere letta insieme alle build client `client-r2821` e successive.

## 1. Overlay HUD contestuale
- Attivare l'overlay smart alerts dal menu Debug della build (`HUD > Smart Overlay`). Il componente React principale è `public/hud/Overlay.tsx`, che carica il layout da `data/hud/layout.yaml` oppure da `__HUD_LAYOUT__` se presente a runtime.
- Lo script seleziona automaticamente l'overlay in base a `missionTag`/`missionId` e mostra filtri attivi (`risk_threshold`, `cohesion_floor`, ecc.) insieme ai pannelli abilitati (radar risk/cohesion, timeline eventi, log acknowledgement). Questo consente di raccontare al pubblico come i trigger EMA alimentano la UI.
- In caso di fallback (layout assente), spiegare la modalità legacy: viene renderizzato `LegacyRiskOverlay` con copia statica e link all'asset legacy. È utile citare la differenza rispetto alla visualizzazione dinamica.

## 2. Vista SquadSync analytics
- Dal menu Demo selezionare **SquadSync Overview**: la pagina è fornita da `public/analytics/squadsync/index.tsx` e interroga l'endpoint `/api/graphql` usando la query `SquadSync`.
- Il Range Picker (`public/analytics/components/RangePicker.tsx`) permette di restringere la finestra a 5/7/14 giorni. Durante la presentazione mostrare come cambiano `deployments`, `standups`, `incidents` e l'indice di engagement medio.
- Per raccontare la coesione delle squadre utilizzare il grafico `EngagementSparkline` e la griglia `SquadSummaryGrid`, evidenziando i pattern per Bravo/Delta/Echo (copertura giorni, deployment totali, incidenti) e collegandoli agli alert HUD.

## 3. Filtri export telemetria
- Chiudere con la sezione **Export Telemetry**. Il modale `public/analytics/export/ExportModal.tsx` consente di scegliere i gruppi destinatari (`ops_drive`, `qa_review`, ecc.), filtrare per stato (`open`, `triaged`, `resolved`, `closed`, ... ) e limitare l'invio alle finestre di reperibilità.
- Mostrare che i filtri sono normalizzati/ordinati prima dell'invio e che ogni applicazione genera un evento di telemetria (`analytics.export_modal`) inviato tramite `navigator.sendBeacon` o `fetch`.
- Selezionare l'opzione "Only within schedule" per spiegare la conformità rispetto agli slot di reperibilità definiti in `RecipientScheduleWindow`.

## Appendix — asset utili
- Screenshot aggiornati HUD e SquadSync: `docs/presentations/assets/vc-hud-briefing-deck.md`.
- Log di esempio per supportare la narrazione: `logs/playtests/2025-02-15-vc/session-metrics.yaml` e `logs/playtests/2025-11-05-vc/session-metrics.yaml`.
