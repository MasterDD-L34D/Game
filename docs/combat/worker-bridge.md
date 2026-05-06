---
title: Worker Bridge — Node ↔ Python protocol
description: Protocollo JSON-line stdin/stdout tra il backend Node e il worker Python del rules engine.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Worker Bridge — Node ↔ Python protocol

Il rules engine è scritto in Python (`services/rules/resolver.py`, `hydration.py`) ma il backend dell'applicazione è Node (`apps/backend/`). La comunicazione avviene tramite `services/rules/worker.py`, un **worker persistente** che legge messaggi JSON-line da stdin e scrive risposte JSON-line su stdout.

Il pattern è identico a `services/generation/worker.py` (Flow workstream) per coerenza operativa: ready → heartbeat → response loop → shutdown.

## Lifecycle del worker

```
Parent process (Node)          Worker process (Python)
       |                                 |
       |---- spawn (exec worker.py) ---->|
       |                                 |
       |                                 | 1. carica trait_mechanics.yaml
       |                                 |    (via RULES_TRAIT_MECHANICS_PATH
       |                                 |    o default pack path)
       |                                 |
       |                                 | 2. avvia heartbeat thread
       |                                 |
       |<-- {"type":"ready","pid":PID}---|
       |                                 |
       |                                 | 3. read loop su stdin
       |                                 |
       |-- {"id":..,"action":..} ------->|
       |                                 | 4. parse + dispatch
       |<-- {"type":"response",..}-------|
       |                                 |
       |-- {"id":..,"action":..} ------->|
       |<-- {"type":"response",..}-------|
       |                                 |
       |<-- {"type":"heartbeat",..}------|   (ogni N ms)
       |                                 |
       |-- {"id":..,"action":"shutdown"}>|
       |<-- {"type":"response",..}-------|
       |                                 | 5. chiude heartbeat thread
       |                                 |    e termina
```

Il worker è **single-threaded sul read loop**: una richiesta alla volta, in ordine. Il heartbeat gira su un thread separato daemon e non interferisce con le risposte.

## Handshake iniziale

All'avvio il worker emette:

```json
{ "type": "ready", "pid": 12345 }
```

Il parent Node deve **attendere questo messaggio** prima di inviare richieste. Se arriva invece un `response` con `status: "error"` e `code: "RULES_ERROR"`, il worker ha fallito il caricamento del catalog (tipicamente `trait_mechanics.yaml` mancante).

## Heartbeat

Ogni `RULES_WORKER_HEARTBEAT_INTERVAL_MS` millisecondi (default 5000, minimo 1000, configurabile via env), il worker emette:

```json
{ "type": "heartbeat", "pid": 12345, "timestamp": 1713012345.678 }
```

**Scopo**:

- Il parent può rilevare un worker hung (assenza di heartbeat per N intervalli).
- Il parent può usare il `timestamp` per sincronizzare orologi o log.
- Non è una request-response; il parent **non deve rispondere** agli heartbeat.

Il parent può ignorare silenziosamente i heartbeat se non ne ha bisogno.

## Request format

Il parent invia un messaggio per riga (newline-delimited) con shape:

```json
{
  "id": "req-042",
  "action": "resolve-action",
  "payload": {
    "state": {...},
    "action": {...},
    "seed": "s-2026-04-14",
    "namespace": "attack"
  }
}
```

**Campi**:

- `id` _(string | int, obbligatorio)_: identifier opaco del request. Il worker lo copia 1:1 in `response.id` per permettere al parent di correlare request/response.
- `action` _(string, obbligatorio)_: uno di `"hydrate-encounter"`, `"resolve-action"`, `"shutdown"`.
- `payload` _(object, obbligatorio)_: il contenuto specifico dell'action. Vedi sotto.

## Action: `hydrate-encounter`

Converte un encounter + party in un `CombatState` iniziale chiamando `hydration.hydrate_encounter`.

**Payload**:

```json
{
  "encounter": { ... },
  "party": [ {...}, {...} ],
  "seed": "s-2026-04-14",
  "session_id": "skydock-2026-04-14-01",
  "encounter_id": "caverna-eco",
  "hostile_species_ids": ["h-drone", "h-sentinel"],
  "hostile_trait_ids": ["artigli_sette_vie"]
}
```

**Campi obbligatori**: `encounter` (object), `party` (array), `seed` (string), `session_id` (string).

**Campi opzionali** (possono essere `null`):

- `encounter_id` _(string | null)_: id opaco dell'encounter per tracciamento.
- `hostile_species_ids` _(array<string> | null)_: override degli species id degli hostile quando l'encounter ne dichiara solo i gruppi.
- `hostile_trait_ids` _(array<string> | null)_: override dei trait per gli hostile.

**Response success**:

```json
{
  "type": "response",
  "id": "req-042",
  "status": "ok",
  "result": {
    "session_id": "skydock-2026-04-14-01",
    "seed": "s-2026-04-14",
    "turn": 1,
    "initiative_order": ["h-01", "p-02", ...],
    "active_unit_id": "h-01",
    "units": [...],
    "log": []
  }
}
```

Il `result` è un `CombatState` conforme a `combat.schema.json`. Il parent può serializzarlo come-è nella risposta HTTP del backend.

## Action: `resolve-action`

Risolve una singola action chiamando `resolver.resolve_action`.

**Payload**:

```json
{
  "state": { ... },
  "action": { ... },
  "seed": "s-2026-04-14",
  "namespace": "attack"
}
```

**Campi obbligatori**: `state` (object, CombatState), `action` (object, Action), `seed` (string).

**Campo opzionale**: `namespace` _(string, default `"attack"`)_. Il worker costruisce `rng = namespaced_rng(seed, namespace)` prima di chiamare il resolver. Usare namespace diversi (`"attack"`, `"parry"`, `"ability"`, ecc.) su seed uguali per ottenere stream RNG indipendenti. Vedi [determinism.md](determinism.md).

**Response success**:

```json
{
  "type": "response",
  "id": "req-043",
  "status": "ok",
  "result": {
    "next_state": { ... },
    "turn_log_entry": { ... }
  }
}
```

Il parent tipicamente:

1. Sostituisce il `CombatState` corrente con `result.next_state`.
2. Appende `result.turn_log_entry` a `state.log`.
3. Serializza lo state aggiornato nella risposta HTTP.

## Action: `shutdown`

Chiude il worker in modo pulito.

**Payload**: `{}` (vuoto).

**Response success**:

```json
{
  "type": "response",
  "id": "req-044",
  "status": "ok",
  "result": { "message": "shutdown" }
}
```

Dopo aver inviato la response, il worker esce dal read loop, chiude il heartbeat thread e termina con exit code 0.

**Nota**: il parent può anche chiudere stdin per forzare il termine. Il shutdown esplicito è preferibile perché permette la conferma round-trip.

## Response format unificato

Ogni response ha questa shape (`$defs` interno al worker, non formalizzato in JSON schema):

```json
{
  "type": "response",
  "id": <same as request.id, or null for parse errors>,
  "status": "ok" | "error",
  "result": <any> | null,
  "error": <string>,
  "code": <error code>
}
```

- Se `status == "ok"`: il campo `result` contiene il payload della risposta, `error` e `code` sono assenti.
- Se `status == "error"`: il campo `error` contiene un messaggio umano, `code` uno dei codici standard, `result` è assente.

## Error codes

| Code               | Significato                                                                              | Quando                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `RULES_ERROR`      | Errore gestito (validazione payload, action mancante, trait_mechanics non trovato, ecc.) | `RulesWorkerError` sollevato esplicitamente nel worker |
| `UNEXPECTED_ERROR` | Eccezione non gestita (bug nel resolver, ValueError inatteso, ecc.)                      | `Exception` catturata dal wrapper `_handle_request`    |
| `INVALID_MESSAGE`  | Riga stdin non è JSON valido                                                             | `json.JSONDecodeError` durante il parse                |

Per `UNEXPECTED_ERROR` il worker stampa anche un traceback su **stderr** (non stdout) per debugging, ma non in response.

## Pattern di utilizzo dal backend Node

Esempio schematico di un client Node per questo protocollo:

```js
const { spawn } = require('node:child_process');

class RulesWorkerClient {
  constructor() {
    this.pending = new Map(); // id -> { resolve, reject }
    this.nextId = 1;
    this.proc = spawn('python3', ['services/rules/worker.py'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let buffer = '';
    this.proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        this.handleMessage(JSON.parse(line));
      }
    });
  }

  handleMessage(msg) {
    if (msg.type === 'ready') {
      this.readyResolve();
      return;
    }
    if (msg.type === 'heartbeat') {
      this.lastHeartbeat = Date.now();
      return;
    }
    if (msg.type === 'response') {
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      if (msg.status === 'ok') pending.resolve(msg.result);
      else pending.reject(new Error(`${msg.code}: ${msg.error}`));
    }
  }

  request(action, payload) {
    const id = `req-${this.nextId++}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify({ id, action, payload }) + '\n');
    });
  }

  async hydrate(encounter, party, seed, sessionId) {
    return this.request('hydrate-encounter', {
      encounter,
      party,
      seed,
      session_id: sessionId,
    });
  }

  async resolve(state, action, seed, namespace = 'attack') {
    return this.request('resolve-action', { state, action, seed, namespace });
  }

  async shutdown() {
    return this.request('shutdown', {});
  }
}
```

**Considerazioni pratiche**:

- **Una singola istanza persistente** per processo backend è preferibile. Lo spawn ogni request è costoso (~200ms per il catalog load).
- **Pool di worker**: se il backend deve gestire richieste concorrenti, considera un pool di N worker. Il pattern è identico a `config/orchestrator.json` per il flow worker.
- **Timeout**: applica un timeout lato Node per ogni request (es. 5s per `resolve-action`, 10s per `hydrate-encounter`). Un worker hung va killato e sostituito.
- **Heartbeat watchdog**: se `Date.now() - this.lastHeartbeat > 3 * HEARTBEAT_INTERVAL_MS`, considera il worker dead e killalo.
- **stderr**: il worker scrive traceback su stderr per errori inattesi. In produzione, cattura e log (es. via Winston) per postmortem.

## Configurazione via environment

Il worker legge due variabili d'ambiente:

- `RULES_TRAIT_MECHANICS_PATH` _(opzionale)_: override del path di `trait_mechanics.yaml`. Utile per test isolati con una versione custom del catalog.
- `RULES_WORKER_HEARTBEAT_INTERVAL_MS` _(opzionale, default 5000, minimo 1000)_: intervallo heartbeat.

## Debugging

**Smoke test manuale** (copia-incolla in shell):

```bash
echo '{"id": "test-1", "action": "hydrate-encounter", "payload": {"encounter": {"hostile": []}, "party": [], "seed": "s1", "session_id": "sess-1"}}' | \
  PYTHONPATH=. python3 services/rules/worker.py
```

Dovresti vedere:

1. `{"type": "ready", "pid": <PID>}` immediatamente
2. `{"type": "response", "id": "test-1", "status": "ok", "result": {...}}` dopo il parse
3. Il processo resta in attesa di ulteriori input. Usa Ctrl+D per chiudere stdin o manda un messaggio shutdown.

## Riferimenti

- Codice: `services/rules/worker.py`
- Protocollo analogo (flow): `services/generation/worker.py`
- Deterministic RNG: [determinism.md](determinism.md)
- Resolver API che il worker invoca: [resolver-api.md](resolver-api.md)
- Schema dei payload: `packages/contracts/schemas/combat.schema.json`
