# Configurazione dell'orchestrator di generazione

Il file [`config/orchestrator.json`](../config/orchestrator.json) controlla il pool di
worker Python usato dal bridge Node.js. I parametri più frequentemente regolati
sono:

- **`poolSize`**: numero di processi worker da avviare in parallelo. Ogni worker
  può elaborare una richiesta alla volta; aumentare il valore riduce la coda ma
  incrementa l'uso di CPU/memoria. Il valore deve essere almeno 1.
- **`requestTimeoutMs`**: tempo massimo, in millisecondi, concesso a una singola
  generazione prima di forzare l'interruzione del worker. È utile per prevenire
  blocchi della pipeline; impostare un timeout troppo basso può interrompere
  richieste legittimamente lente.
- **`autoShutdownMs`**: se valorizzato, chiude automaticamente il pool dopo
  un periodo di inattività. Valori `null`, `0` o stringhe come `"off"` disattivano
  l'arresto automatico.
- **`workerStartTimeoutMs`**: intervallo massimo per attendere l'avvio di un
  nuovo worker; impostare `0` o `"off"` disabilita il controllo.

I parametri possono essere sovrascritti impostando variabili d'ambiente o
passando opzioni esplicite quando si crea il bridge (ad esempio nello script di
load test).

## Telemetria e metriche Prometheus

Il bridge emette eventi (`stats`, `task-completed`, `task-retry`, `task-failed`,
`heartbeat-missed`) raccolti da `server/metrics/orchestrator.js`, che espone le
seguenti metriche Prometheus:

- `orchestrator_pool_workers_total`, `orchestrator_pool_workers_busy`,
  `orchestrator_pool_queue_size` — dimensione del pool, worker occupati e coda.
- `orchestrator_worker_heartbeat_missed_total` — heartbeat mancati.
- `orchestrator_task_retries_total` — numero di retry effettuati.
- `orchestrator_task_failures_total{code="..."}` — errori definitivi, divisi per codice.
- `orchestrator_task_duration_seconds{action="..."}` — istogramma delle latenze.
- `orchestrator_task_queue_duration_seconds{action="..."}` — tempo trascorso in coda.

L'app Express pubblica le metriche su [`/metrics`](../server/app.js) con content
type Prometheus (`text/plain; version=0.0.4`). Per verificarle in locale:

```bash
node server/index.js &
curl http://localhost:3333/metrics | grep orchestrator_
```

## Load test e workflow CI

Lo script [`scripts/loadtest-orchestrator.mjs`](../scripts/loadtest-orchestrator.mjs)
simula generazioni parallele sfruttando l'`EventEmitter` del bridge per
raccogliere latenze, tempi di coda e retry. Opzioni principali:

- `--requests <n>`: numero totale di richieste (default 12).
- `--concurrency <n>`: richieste simultanee (default 4).
- `--threshold-ms <n>`: soglia di latenza mediana; se superata il comando esce con codice `1`.
- `--pool-size <n>`: override temporaneo del pool.
- `--timeout-ms <n>` / `--request-timeout-ms <n>`: override del timeout per singola richiesta.

Il workflow CI esegue automaticamente il load test con
`--requests 12 --concurrency 4 --threshold-ms 3000` ogni volta che vengono
modificati:

- `config/orchestrator.json` o file nel percorso `server/metrics/**`.
- Script e servizi orchestrator (`server/services/orchestratorBridge.js`, `services/generation/**`).
- La documentazione dedicata, incluse le guide di stile dell'orchestrator.
- Il lock file principale `package-lock.json` (per intercettare nuovi pacchetti).

Per prove manuali:

```bash
npm ci
python -m pip install --requirement requirements-dev.txt
node scripts/loadtest-orchestrator.mjs --requests 20 --concurrency 6 --threshold-ms 2500
```

L'output JSON riporta statistiche aggregate (`median`, `p95`, `retries`,
`definitiveFailures`). I job CI falliscono se la latenza mediana supera la
soglia oppure se emergono errori definitivi.
