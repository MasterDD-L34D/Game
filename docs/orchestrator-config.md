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

I parametri possono essere sovrascritti impostando variabili d'ambiente o
passando opzioni esplicite quando si crea il bridge (ad esempio nello script di
load test). Per verificare gli effetti delle modifiche si può usare
`scripts/loadtest-orchestrator.mjs`, che esegue richieste parallele e riporta
latenze e retry osservati.
