# Telemetria del flusso agenti

## Passaggi chiave del flusso
- **Scelta agente**: routing esplicito o automatico; registriamo agente richiesto, selezionato e latenza della scelta.
- **Applicazione comando**: esecuzione dei COMANDO:* o azioni dirette; logghiamo comando, target e durata.
- **Conferma patch**: decisione sull'applicazione di una patch/diff; logghiamo patch coinvolta, esito e tempo di validazione.

## Tracciamento minimale
- Logger JSONL in `scripts/agent_flow_telemetry.js`.
- Eventi persistiti (se abilitato) in `logs/agent_workflow.log` oppure nel path definito da `AGENT_TELEMETRY_PATH`.
- Metadata ridotti e sanitizzati (stringhe troncate, max 20 elementi in lista) per evitare dati sensibili.

## Come usare
1. Abilita la telemetria solo quando serve:
   - `AGENT_TELEMETRY_ENABLED=1` per attivare la scrittura.
   - `AGENT_TELEMETRY_PATH=/percorso/custom.log` (opzionale) per scegliere il file.
2. Inserisci i log point nelle funzioni che orchestrano il flusso agenti:
   - `const telemetry = require('./agent_flow_telemetry');`
   - `await telemetry.logAgentSelection({ sessionId, requestedAgent, selectedAgent, router, latencyMs, reason });`
   - `await telemetry.logCommandApplication({ sessionId, command, target, success, durationMs });`
   - `await telemetry.logPatchConfirmation({ sessionId, patchId, accepted, durationMs });`
3. Esegui la demo per validare il wiring: `AGENT_TELEMETRY_ENABLED=1 node scripts/agent_flow_telemetry.js --demo`.

## Analisi rapida e colli di bottiglia
- Genera un report leggibile: `node scripts/analyze_agent_flow.js --log logs/agent_workflow.log --threshold 2500`.
- Il report mostra:
  - medie e massimi per step (scelta agente, applicazione comando, conferma patch),
  - sessioni con durata aggregata più alta,
  - eventi che superano la soglia di bottleneck.
- Aumenta/diminuisci la soglia per mettere a fuoco le aree critiche.

## Privacy e prestazioni
- Nessun log se `AGENT_TELEMETRY_ENABLED` è assente/false.
- Metadata sanitizzati per evitare payload completi o PII.
- File JSONL append-only per minimizzare lock e overhead; ruotare il file log via strumenti esterni se cresce troppo.

## Disattivare
- Rimuovi `AGENT_TELEMETRY_ENABLED` o impostalo a `0/false` per spegnere il tracciamento senza modificare il codice.
