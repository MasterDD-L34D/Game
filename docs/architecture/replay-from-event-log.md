---
title: 'Match Replay from Event Log — Implementation Spec'
doc_status: active
doc_owner: backend-team
workstream: flow
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Match Replay from Event Log — Implementation Spec

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T2.4)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A4 (SoT §19 Q27 "Replay match — Event log in debrief")

## Contesto

SoT §19 Q27 propone: "Replay match: Event log in debrief" come soluzione a basso costo. Il repository già traccia raw events:

- `apps/backend/services/vcScoring.js:687` legge `session.events` array
- Schema event: `{ action_type, turn, actor_id, target_id, damage_dealt, result, position_from, position_to }` (CLAUDE.md)
- Generato da session engine in ogni azione
- Persiste in `session.events` ma **non esposto** al client

**Gap**: endpoint che restituisce event log per replay, formato serializzabile, downloadable JSON.

## Deliverables proposti (split PR)

### PR-1 · Design spec (NO CODE, in Q-001) ✅ questo doc

Definisce endpoint, schema, use case.

### PR-2 · Endpoint GET /api/v1/session/:id/replay (branch dedicato)

```javascript
// apps/backend/routes/session.js (sessionRoundBridge.js) — patch
router.get('/:id/replay', async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const replayPayload = {
    session_id: session.id,
    encounter_id: session.encounter_id,
    biome_id: session.biome_id,
    started_at: session.started_at,
    ended_at: session.ended_at,
    result: session.result, // victory|defeat|abandoned
    seed: session.rngSeed,
    units_snapshot_initial: session.unitsSnapshotInitial,
    events: session.events, // array di raw events
    meta: {
      turns_played: computeTurnsPlayed(session.events),
      events_count: session.events.length,
      export_version: 1,
    },
  };

  res.json(replayPayload);
});
```

**Coordinamento richiesto**: modifica `apps/backend/routes/session.js` (o file bridge). Quarantine Q-001 copre.

### PR-3 · Deterministic replay engine (branch dedicato)

Componente `services/replay/replayEngine.js` che prende un payload replay e simula step-by-step:

```javascript
class ReplayEngine {
  constructor(payload) {
    this.payload = payload;
    this.currentStep = 0;
    this.state = initStateFromSnapshot(payload.units_snapshot_initial);
  }
  step() {
    /* applica events[currentStep] */
  }
  seekTo(turn, actorId) {
    /* salta a evento specifico */
  }
  getCurrentState() {
    /* ritorna stato derivato */
  }
}
```

**Requisito determinismo**: stessa seed + stessi events = stesso stato. Validato da snapshot test.

### PR-4 · Debrief UI replay player (frontend, post-M4)

- Pulsante "Rivedi match" in debrief panel
- Timeline scrollable con event markers
- Playback controls (play/pause/step/seek)
- Turn-by-turn state overlay sulla griglia

### PR-5 · Export download JSON (frontend)

- Pulsante "Esporta replay" in debrief
- Download `replay_<session_id>.json`
- Share code (short link per community sharing)

## Schema payload

```typescript
interface ReplayPayload {
  session_id: string;
  encounter_id: string;
  biome_id: string;
  started_at: string; // ISO datetime
  ended_at: string | null;
  result: 'victory' | 'defeat' | 'abandoned' | null;
  seed: number;
  units_snapshot_initial: UnitSnapshot[];
  events: RawEvent[];
  meta: {
    turns_played: number;
    events_count: number;
    export_version: number;
  };
}

interface RawEvent {
  action_type: string;
  turn: number;
  actor_id: string;
  target_id: string | null;
  damage_dealt: number;
  result: string;
  position_from: [number, number] | null;
  position_to: [number, number] | null;
}

interface UnitSnapshot {
  unit_id: string;
  species: string;
  position: [number, number];
  hp_max: number;
  hp_current: number;
  pt_current: number;
  traits: string[];
  // ... altri campi canonical unit state
}
```

Schema AJV in `packages/contracts/schemas/replay.schema.json` (PR-2).

## Effort stimato

| Step                      | LOC       | Effort | Branch               |
| ------------------------- | --------- | ------ | -------------------- |
| PR-1 design spec          | +250      | S      | Q-001 (qui)          |
| PR-2 endpoint + schema    | +120      | M      | feat/replay-endpoint |
| PR-3 deterministic engine | +250      | L      | feat/replay-engine   |
| PR-4 UI replay player     | +400      | L      | feat/replay-ui       |
| PR-5 export + share       | +100      | M      | feat/replay-export   |
| **Totale**                | **+1120** | **L**  | 5 PR                 |

## Vincoli

- **Guardrail Pilastro 5**: session.js tocca AI co-op vs Sistema. Endpoint read-only NON modifica comportamento → safe
- **Storage**: session.events può crescere. Per match 30+ turni con 5 unità → ~500-1000 events. JSON non gzipped ~100-200 KB. Accettabile.
- **Privacy**: replay export contiene nomi creature utente. Pseudonymize prima di share pubblico? (Decisione Master DD)
- **Backward compat**: events schema stabile. Export version field permette migration futura.

## Use cases

1. **Debrief personale** — giocatore vede ultimi match per capire errori
2. **Teaching moment** — rivedere momento critico ("why did I lose?")
3. **Community sharing** — condividere strategie tactical interessanti
4. **QA / playtest** — report bug include replay per repro
5. **VC validation** — verifica MBTI/Ennea emerge da pattern coerente

## Test strategy

- **Snapshot replay** — run simulation N=100 con seed fisso, verifica output identico a playback replay engine
- **Idempotence** — stesso payload processato 2×, stesso state
- **Corrupt event handling** — event manipolato, replay flagga error non crasha
- **Large replay** — 1000+ events non timeout

## Decisione Master DD (2026-04-17) — Q-001 T2.4

- 5-PR split: **SI**
- PR-2 endpoint in Q-001: **SI** (read-only, zero behavioral change su session.js, safe nella quarantine)
- Pseudonymize share pubblico: **OPT-IN** (privacy default, user sceglie se condividere nomi)
- Export version: **ITER** (incrementale, migration field pronto)
- Priorità implementazione: **PR-3 engine first** (UI depends engine logic)

Follow-up branch sequenza: `feat/replay-endpoint` (+ PR-2 inclusa Q-001) → `feat/replay-engine` → `feat/replay-ui` → `feat/replay-export`.

## Cross-reference

- SoT §19 Q27 (replay = event log in debrief)
- SoT §24 (VC scoring già usa events)
- apps/backend/services/vcScoring.js (consumer attuale)
- CLAUDE.md "Session engine" (schema raw event stabile)
- data/core/ui/loading_tips.yaml tip_gen_03 (menziona debrief replay)
