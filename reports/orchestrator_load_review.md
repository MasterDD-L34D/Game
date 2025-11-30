# Revisione configurazione orchestrator

## Contesto e stato attuale
- File: `config/orchestrator.json`
- Nuovi valori applicati: `poolSize: 6`, `requestTimeoutMs: 90000` (90s), `maxTaskRetries: 1`, heartbeat 5s.
- Assunzioni sul carico: sistema gestisce richieste sugli endpoint `/api/v1/generation/*` e `/api/v1/validators/runtime` con picchi stimati di 8–12 richieste concorrenti (valore da confermare con metriche recenti). Il pool a 6 worker è allineato a un host con risorse CPU adeguate; in ambienti più stretti si può ridurre a 4–6.

## Valutazione
- `poolSize: 2` era adeguato solo per 2–3 richieste simultanee; con 8–12 concorrenti creava coda e latenza elevata. Il nuovo valore aumenta il parallelismo mantenendo margine di sicurezza.
- `requestTimeoutMs: 120000` offriva ampia tolleranza, ma poteva mascherare hang. Il nuovo limite a 90s resta sopra i tempi medi di inferenza (45–60s) ma libera più rapidamente gli slot bloccati.
- `maxTaskRetries: 1` limita l’impatto di ripetizioni eccessive; mantenerlo se gli errori sono transienti rari.

## Raccomandazioni
- Impostare `poolSize` tra **6 e 8** se il target è 8–12 richieste concorrenti e l’host dispone di risorse CPU adeguate. Ridurre a 4–6 se la CPU è limitata o se i job sono particolarmente pesanti (configurazione attuale: 6 worker).
- Ridurre `requestTimeoutMs` a **60000–90000 ms** per individuare più rapidamente i job bloccati, mantenendo margine per inferenze pesanti. Tenere 120s solo per modelli che superano stabilmente i 90s (configurazione attuale: 90s).
- Monitorare la saturazione: se la coda rimane lunga a pool aumentato, valutare scale-out (più istanze orchestrator) oltre al tuning locale.

## Piano di test di carico
Obiettivo: validare la nuova combinazione di `poolSize` e `requestTimeoutMs` sugli endpoint critici.

1. **Script k6**: `tests/load/orchestrator-load.k6.js` con due scenari paralleli:
   - `generation`: ramping a 10–12 VU (`POST /api/v1/generation/species`) con payload realistico e soglia p95 < 90s, errori < 1%.
   - `validators`: ramping a 6–8 VU (`POST /api/v1/validators/runtime`) con soglia p95 < 10s, errori < 1%.
   - Esecuzione: `BASE_URL=http://<host>:3333 k6 run tests/load/orchestrator-load.k6.js` (timeout per request impostati a 95s/30s).
2. **Warm-up**: 2–3 minuti a bassa intensità (1–2 VU) per stabilizzare cache e connessioni.
3. **Stress breve**: opzionale spike di 15–18 VU per 2 minuti per validare recupero e coda.
4. **Raccolta dati**: esportare log di latenza/timeout, saturazione CPU/RAM, code intere per `poolSize`.
5. **Criteri di successo**: latenza p95 entro SLO, zero timeout per validator, retry non superiore a 1%.

## Risultati e note
- Esecuzione non effettuata in questo ambiente (mancano dipendenze k6 e backend attivo). Lo script è pronto per essere lanciato dove sono disponibili backend e risorse.
- Limiti previsti: se l'host dispone di meno core, ridurre `poolSize` a 4–5 per evitare saturazione CPU; mantenere `requestTimeoutMs` a 90s salvo workload eccezionalmente lunghi.
