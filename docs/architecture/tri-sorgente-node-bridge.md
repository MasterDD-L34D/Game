---
title: 'Tri-Sorgente Node Bridge — Design Spec'
doc_status: active
doc_owner: backend-team
workstream: flow
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Tri-Sorgente Node Bridge — Design Spec

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T3.2)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: G2.1 audit gap implementativo 2026-04-17

## Contesto

Il sistema **Tri-Sorgente** (card offer engine basato su pool R/A/P) è implementato in Python:

- `engine/tri_sorgente/tri_sorgente_config.yaml` — config completo (softmax T=0.7, weights, synergy, skip economy, diversity, recent_actions dict)
- `engine/tri_sorgente/card_offer_engine.yaml` — engine logic declarativa
- `tests/tri_sorgente_sim.py` — simulatore NumPy per validazione

Manca **integrazione nel backend Node**. GDD Master §8 descrive la pipeline come attiva, ma nessun endpoint la espone al session loop.

## Obiettivo

Esporre Tri-Sorgente come servizio consumabile da `apps/backend/routes/session.js` al momento del card offer (inizio round / post-encounter).

## Architettura proposta

### Pattern: Python worker pool (mirror di `services/generation/`)

```
Session Round End (Node)
  → apps/backend/routes/session.js emette `/api/v1/tri-sorgente/offer` call
  → services/triSorgente/bridge.js (Node)
  → Python worker pool (config/tri_sorgente_orchestrator.json)
  → engine/tri_sorgente_worker.py (new)
  → offers + skip economy response
```

### File da creare

1. **`services/triSorgente/bridge.js`** (Node, ~120 LOC)
   - Gestisce worker pool Python
   - Riuso pattern `services/generation/orchestrator.js`
   - Interface: `async offerCards({ actorId, biomeId, recentActions, pools })`

2. **`engine/tri_sorgente_worker.py`** (Python, ~80 LOC)
   - Entry point stdin/stdout JSON (come `services/generation/orchestrator.py`)
   - Carica config + engine YAML al boot
   - Per request: computa pool merge, score, softmax, pick 3 + skip

3. **`config/tri_sorgente_orchestrator.json`**

   ```json
   {
     "poolSize": 2,
     "requestTimeoutMs": 500,
     "maxQueueSize": 50
   }
   ```

4. **`apps/backend/routes/triSorgente.js`** (~60 LOC)
   - `POST /api/v1/tri-sorgente/offer` → delega a bridge
   - Input validation via AJV schema
   - Output sempre: `{offers, skip_economy, meta}`

5. **`packages/contracts/schemas/tri-sorgente.schema.json`** (AJV)
   - Input: `{actor_id, biome_id, recent_actions_counts, pools_override?, seed?}`
   - Output: `{offers: [{card_id, score, softmax_prob, breakdown}], skip_economy: {fg_values: [low, mid, high]}, meta: {seed, pool_ids, timestamp}}`

### Integrazione session loop

In `apps/backend/routes/session.js`:

```js
// Dopo round end, prima di round start (gate offerCards)
const offers = await triSorgenteBridge.offerCards({
  actorId: currentActor.id,
  biomeId: encounter.biome_id,
  recentActions: session.vcScoring.recentActionsCounts,
  seed: session.rngSeed,
});
session.pendingOffers = offers;
emitEvent('offer:proposed', offers);
```

Side-effect minimo: **non modifica trait/status**, aggiunge campo `pendingOffers` allo state.

## Test strategy

- **Unit**: `tests/triSorgente/bridge.spec.ts` (tsx) — mock Python, verifica schema I/O
- **E2E**: `tests/triSorgente/e2e.spec.ts` — avvio worker pool reale, 100 offerte con seed fisso, verifica reproducibility
- **Snapshot**: output confrontato con `tests/tri_sorgente_sim.py` baseline
- **Regression**: session full round con offer flow

**Target**: 15+ test, coverage ≥ 80% per bridge + route.

## Schema contract (additivo, non breaking)

```typescript
interface TriSorgenteOfferRequest {
  actor_id: string;
  biome_id: string;
  recent_actions_counts: {
    cariche_effettuate?: number;
    salti_lunghi?: number;
    colpi_critici?: number;
    cure_erogate?: number;
    danni_subiti?: number;
    assist?: number;
    colpi_mancati?: number;
  };
  pools_override?: { R?: number; A?: number; P?: number };
  seed?: number;
}

interface TriSorgenteOfferResponse {
  offers: Array<{
    card_id: string;
    score: number;
    softmax_prob: number;
    breakdown: {
      w_roll: number;
      w_pers: number;
      w_actions: number;
      w_syn: number;
      w_dup: number;
      w_excl: number;
    };
  }>;
  skip_economy: {
    fg_values: [number, number, number]; // 1st, 2nd, 3rd consecutive skip
    cap_per_act: number;
  };
  meta: {
    seed: number;
    pool_ids: { R: string[]; A: string[]; P: string[] };
    timestamp: string;
  };
}
```

## Effort stimato

| Step                     | LOC      | Effort |
| ------------------------ | -------- | ------ |
| Schema AJV               | +80      | S      |
| Python worker            | +80      | S      |
| Node bridge              | +120     | M      |
| Route + integration      | +60      | S      |
| Test suite               | +200     | M      |
| Doc (hub + architecture) | +100     | S      |
| **Totale**               | **+640** | **M**  |

## Rischi

1. **Overhead Python bridge** — 500ms timeout potrebbe essere stretto per alto throughput. Mitigazione: cache layer Redis se necessario.
2. **Reproducibility seed** — RNG Python + NP vs RNG Node. Test snapshot deterministico richiede seed propagation consistente.
3. **Schema drift** — config YAML e schema AJV devono restare sincronizzati. Mitigazione: generator tool in `tools/py/gen_tri_sorgente_schema.py`.

## Piano esecuzione

**Split consigliato**: PR separata dopo merge Q-001. Motivo:

- Q-001 è "triage + docs" per design decisions
- Tri-Sorgente bridge è **implementazione +640 LOC** → merita PR dedicata con review backend-team + QA

**Sequence proposto**:

1. Questa design spec merged in Q-001 (no code change)
2. Branch feature `feat/tri-sorgente-bridge` dopo approvazione Master DD
3. Implementation step-by-step (schema → worker → bridge → route → integration → test)
4. Gate M4: tri-sorgente wired in session loop

## Decisione Master DD (2026-04-17) — Q-001 T3.2

- Design bridge Python worker pool: **SI** (mirror services/generation/)
- Split PR dedicata post-Q-001: **SI** (`feat/tri-sorgente-bridge`, +640 LOC)
- Side-effect session state `pendingOffers`: **SI** (additive)
- Test coverage target ≥ 80%: **SI** (baseline repo)

Implementation branch parte dopo merge Q-001.
