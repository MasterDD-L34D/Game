# Manutenzione della roadmap live

La roadmap live è alimentata da snapshot di generazione, telemetria Nebula e verifiche QA. Per mantenere il quadro aggiornato è necessario seguire la procedura qui sotto e validare i punti di controllo su layout e telemetria prima di ogni rilascio.

## Procedura di aggiornamento
1. Esegui `node tools/recap/generateRecap.js --output docs/recap/live-ops.md` per produrre il recap aggiornato con snapshot, atlas Nebula e risultati QA live.
2. Avvia (o riavvia) il backend `npm run start:api` assicurandoti che gli endpoint `/api/v1/generation/snapshot`, `/api/v1/atlas/dataset`, `/api/v1/atlas/telemetry` e `/api/v1/qa/status` rispondano con payload coerenti.
3. Effettua il deploy e, una volta completato, invoca l'hook `POST /api/deployments/hook` con `version`, `environment` e note del rilascio per aggiornare `reports/status.json` e inviare le notifiche configurate.
4. Verifica che `GET /api/deployments/status` restituisca l'ultima voce registrata e allega il link al recap nella comunicazione di release.

## Punti di controllo layout & telemetria
- **Layout roadmap / Nebula UI**: controlla che badge, metriche e timeline siano allineate con le etichette di stato restituite dagli endpoint live (nessun placeholder "demo").
- **Copertura QA**: assicurati che il riepilogo riporti `glossary_ok == total_traits` oppure elenca i tratti in conflitto; aggiorna i badge se presenti nuove discrepanze.
- **Telemetria generatore**: conferma che il campo `generator.status` sia coerente con lo stato operativo reale e che `generationTimeMs` rientri nelle soglie previste.
- **Incidenti Nebula**: revisiona la timeline `telemetry.incidents.timeline` per identificare picchi o incidenti ad alta priorità negli ultimi 7 giorni.
- **Reports/status.json**: dopo il deploy verifica che `updatedAt` sia recente e che la voce più recente rifletta version, ambiente e note del rilascio.

## Note operative
- Conserva almeno le ultime 10 voci di deploy in `reports/status.json` per facilitare audit rapidi (puoi passare `{"keepLast": 10}` nel payload dell'hook).
- Allegare sempre link diretti alle dashboard di telemetria quando comunichi il recap ai team di prodotto e QA.
- In caso di errori sugli endpoint live, annotare il dettaglio nella voce di deploy e aprire ticket di follow-up entro la giornata.
