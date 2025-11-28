# Revisione configurazione orchestrator

## Contesto e stato attuale
- File: `config/orchestrator.json`
- Valori attuali: `poolSize: 2`, `requestTimeoutMs: 120000` (120s), `maxTaskRetries: 1`, heartbeat 5s.
- Assunzioni sul carico: sistema gestisce richieste sugli endpoint `/api/v1/generation/*` e `/api/v1/validators/runtime` con picchi stimati di 8–12 richieste concorrenti (valore da confermare con metriche recenti).

## Valutazione
- `poolSize: 2` è adeguato solo per 2–3 richieste simultanee; con 8–12 concorrenti crea coda e latenza elevata. Suggerito allineare il pool al numero di core/worker disponibili e al target di concorrenza.
- `requestTimeoutMs: 120000` offre ampia tolleranza, ma può mascherare hang. Per workload generativi tipici (sotto i 45–60s) un timeout più stretto riduce la durata di richieste bloccate e libera slot più rapidamente.
- `maxTaskRetries: 1` limita l’impatto di ripetizioni eccessive; mantenerlo se gli errori sono transienti rari.

## Raccomandazioni
- Impostare `poolSize` tra **6 e 8** se il target è 8–12 richieste concorrenti e l’host dispone di risorse CPU adeguate. Ridurre a 4–6 se la CPU è limitata o se i job sono particolarmente pesanti.
- Ridurre `requestTimeoutMs` a **60000–90000 ms** per individuare più rapidamente i job bloccati, mantenendo margine per inference pesanti. Tenere 120s solo per modelli che superano stabilmente i 90s.
- Monitorare la saturazione: se la coda rimane lunga a pool aumentato, valutare scale-out (più istanze orchestrator) oltre al tuning locale.

## Piano di test di carico
Obiettivo: validare la nuova combinazione di `poolSize` e `requestTimeoutMs` sugli endpoint critici.

1. **Strumenti**: k6 o Artillery, con scenari separati per `generation` e `validators`.
2. **Warm-up**: 2–3 minuti a bassa intensità (1–2 VU) per stabilizzare cache e connessioni.
3. **Scenario `/api/v1/generation/*`**:
   - Ramp-up fino a 10–12 VU in 5 minuti.
   - Payload misti (richieste brevi e lunghe) per simulare variazione prompt.
   - Metriche: p95 latency < target SLO, error rate < 1%, assenza di timeout.
4. **Scenario `/api/v1/validators/runtime`**:
   - Ramp-up a 6–8 VU; richieste più brevi ma frequenti.
   - Metriche: p95 latency, throughput, errori/timeout.
5. **Stress test breve**: spike di 15–18 VU per 2 minuti per validare recupero e coda.
6. **Raccolta dati**: esportare log di latenza/timeout, saturazione CPU/RAM, code intere per `poolSize`.
7. **Criteri di successo**: latenza p95 entro SLO, zero timeout per validator, retry non superiore a 1%.
