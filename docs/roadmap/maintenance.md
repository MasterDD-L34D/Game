# Manutenzione della roadmap live

La roadmap live è alimentata da snapshot di generazione, telemetria Nebula e verifiche QA raccolti in `reports/status.json`. Il
file include anche la checklist **go/no-go** con riferimenti agli step Flow Shell; assicurati che sia aggiornata e priva di blocchi
prima di ogni rilascio seguendo la procedura e i controlli riportati sotto.

## Procedura di aggiornamento

1. Aggiorna la telemetria aggregata: chiama `GET /api/deployments/status?refresh=1` (o avvia lo script di hook) per rigenerare
   `reports/status.json` con snapshot, Nebula e trait diagnostics allineati.
2. Esegui `node tools/recap/generateRecap.js --output docs/recap/live-ops.md` per produrre il recap aggiornato; il report include
   automaticamente la checklist go/no-go proveniente da `reports/status.json`.
3. Avvia (o riavvia) il backend `npm run start:api` assicurandoti che gli endpoint `/api/generation/snapshot`, `/api/nebula/atlas`
   e `/api/qa/status` rispondano con payload coerenti.
4. Effettua il deploy e, una volta completato, invoca l'hook `POST /api/deployments/hook` con `version`, `environment` e note del
   rilascio per aggiornare `reports/status.json` e inviare le notifiche configurate.
5. Verifica che `GET /api/deployments/status` restituisca l'ultima voce registrata (incluso stato go/no-go `go`) e allega il link al
   recap nella comunicazione di release.

## Checklist go/no-go

- **Flow Shell readiness**: esegui `node tools/deploy/generateStatusReport.js` (o `GET /api/deployments/status?refresh=1`) per
  rigenerare `reports/status.json`, quindi controlla che tutti gli step critici risultino `passed` nella sezione `goNoGo`.
- **Copertura telemetria Nebula**: dal report verifica che `telemetry.nebula.summary.telemetry.coverage` presenti media ≥70% e
  che lo storico mostri una tendenza stabile; in caso contrario apri un ticket verso il team Atlas.
- **Timeline incidenti**: analizza `telemetry.nebula.summary.telemetry.incidents.timeline` e la sezione "Incidenti aperti" del
  recap per confermare che gli eventi ad alta priorità siano azzerati o mitigati entro le ultime 24 ore.
- **Trait diagnostics**: accertati che `telemetry.traitDiagnostics.summary` riporti `with_conflicts == 0` e nessun `matrix_mismatch`;
  se necessario pianifica una sessione di hardening con i referenti QA.
- **Bridge orchestratore**: prima della finestra di deploy verifica il tuning del bridge (`config/orchestrator.json`) controllando
  heartbeat, timeout e pool size; riavvia il bridge con i parametri aggiornati se sono previste variazioni di carico o spike
  durante il rollout.

## Punti di controllo layout & telemetria

- **Flow Shell go/no-go**: controlla che la checklist in `reports/status.json` (campo `goNoGo`) segni tutti gli step critici
  (`Quality Release → Trait diagnostics`, `Nebula Atlas → Telemetry`, ecc.) come `passed`.
- **Layout roadmap / Nebula UI**: controlla che badge, metriche e timeline siano allineate con le etichette di stato restituite
  dagli endpoint live (nessun placeholder "demo").
- **Copertura QA**: assicurati che il riepilogo riporti `glossary_ok == total_traits` oppure elenca i tratti in conflitto; aggiorna
  i badge se presenti nuove discrepanze.
- **Telemetria generatore**: conferma che il campo `generator.status` sia coerente con lo stato operativo reale e che `generationTimeMs`
  rientri nelle soglie previste.
- **Incidenti Nebula**: revisiona la timeline `telemetry.incidents.timeline` per identificare picchi o incidenti ad alta priorità negli ultimi 7 giorni.
- **Reports/status.json**: dopo il deploy verifica che `updatedAt` sia recente, che la voce più recente rifletta version, ambiente e
  note del rilascio e che lo stato complessivo della checklist sia `go` (nessun `failed`).

## Note operative

- Conserva almeno le ultime 10 voci di deploy in `reports/status.json` per facilitare audit rapidi (puoi passare `{"keepLast": 10}` nel
  payload dell'hook).
- Allegare sempre link diretti alle dashboard di telemetria quando comunichi il recap ai team di prodotto e QA.
- In caso di errori sugli endpoint live, annotare il dettaglio nella voce di deploy e aprire ticket di follow-up entro la giornata.
