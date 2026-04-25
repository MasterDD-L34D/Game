---
title: 'ADR 2026-04-26 — Pincer follow-up intent queue (Triangle Strategy Mechanic 3B)'
doc_status: draft
doc_owner: claude-code
workstream: combat
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/research/triangle-strategy-transfer-plan.md'
  - 'docs/planning/2026-04-25-M14-A-elevation-terrain.md'
  - 'docs/planning/2026-04-26-next-session-handoff-M14-C.md'
  - 'docs/playtest/2026-04-26-M14-C-elevation-calibration.md'
---

# ADR-2026-04-26 · Pincer follow-up intent queue

**Stato**: 🟡 **DRAFT** — scope-in per next session (M14-D). Nessuna implementazione
in PR corrente (#1740 P1).
**Trigger**: handoff `docs/planning/2026-04-26-next-session-handoff-M14-C.md:117` P2 deferred
in attesa di design + cap + priority.

## Contesto

Triangle Strategy Mechanic 3B (ref `docs/research/triangle-strategy-transfer-plan.md:187,209`)
prevede un **pincer follow-up attack**: quando attacker + alleato sono ai lati
opposti del target a hex distanza 1, dopo l'hit dell'attacker si triggera un
attacco bonus automatico dall'alleato.

**Helper già shipped** (M14-B, PR #1737): `hexGrid.detectPincer(attackerHex,
targetHex, allies)` ritorna `{ pincer: boolean, opposite_ally_id, opposite_hex }`.
**Funzione pura**: riceve hex + allies, ritorna metadata. **NON** chiama
roundOrchestrator, NON enqueue intent, NON tocca session state.

**Gap**: nessun meccanismo nel `roundOrchestrator.js` (apps/backend/services/
roundOrchestrator.js, 971 LOC) per **iniettare intents runtime durante
resolution**. Le intents vengono partitionate in `buildResolutionQueue` al
momento di `resolveRound` (L271); nessuna API per enqueue follow-up dinamico.

## Decisione

**Design `roundOrchestrator.pushFollowup(intent)` API** con queste proprietà:

### Schema intent follow-up

```js
{
  type: 'followup',
  origin_event: 'pincer_detected',    // trigger
  origin_intent_id: 'int_1234',        // intent che ha scatenato
  actor_id: 'p_ally_2',                // chi esegue il follow-up
  action: { type: 'attack', target_id: 'e_boss', channel: 'fisico' },
  priority: 'after_origin',            // enum: after_origin | end_of_round
  damage_modifier: -0.5,               // follow-up dimezzato (-50%)
  cap: { max_per_unit_per_round: 1 }
}
```

### Campi chiave

1. **`origin_event`**: motivo semantico (pincer_detected, chain_reaction,
   executioner_mark, ecc.). Permette future mechanics simili (eg. reactive
   strike) senza schema change.
2. **`priority`**: _after_origin_ = inserito subito dopo l'intent corrente nella
   resolution queue (chain); _end_of_round_ = eseguito post tutti gli intents
   pianificati (ripple).
3. **`damage_modifier`**: scalar applied to resolved damage. Follow-up pincer
   default `-0.5` (half damage, da TS spec). Protegge da one-shot chain abuse.
4. **`cap`**: hard limit per prevenire loops. `max_per_unit_per_round: 1`
   significa che ogni alleato può triggerare follow-up solo 1 volta per round,
   anche se pincer detection scatta più volte.

### Storage runtime

```js
// Aggiunto a roundOrchestrator state (per-session):
state.followup_queue = []; // intents pending, pop in LIFO after_origin
state.followup_executed = new Set(); // actor_id già consumati (cap tracking)
state.followup_log = []; // audit trail per telemetry
```

### API

```js
// In orchestrator closure:
roundOrchestrator.pushFollowup(intent, {
  cap, // { max_per_unit_per_round }
  priority, // after_origin | end_of_round
});
// Ritorna: { accepted: boolean, reason: string, followup_id: string }
// Motivi reject: cap reached, invalid priority, unknown actor, dead actor.
```

### Flow lifecycle

```
resolveRound tick:
  1. Pop intent da resolution queue
  2. Execute (performAttack / ability / move)
  3. Post-hit hook:
     - session.js damage step, post hit:
       if (hit && detectPincer(actor, target, allies).pincer) {
         orchestrator.pushFollowup({
           type: 'followup',
           origin_event: 'pincer_detected',
           origin_intent_id: intent.id,
           actor_id: opposite_ally_id,
           action: { type: 'attack', target_id: target.id, channel: 'fisico' },
           priority: 'after_origin',
           damage_modifier: -0.5,
         });
       }
  4. Check followup_queue:
     - If queue has items with priority='after_origin': execute next, back to 3
     - Else: continue main queue
  5. Loop 1-4 until main queue empty
  6. Drain priority='end_of_round' followup_queue
```

### Cap enforcement

- **Per-unit**: 1 follow-up per round per unità (via `followup_executed` Set).
- **Per-round global**: 5 follow-up totali per round (safety cap anti-explosion).
- **Recursion guard**: follow-up NON può triggerare un altro follow-up (origin_event
  del nuovo intent = 'followup_chain' blacklisted da pincer detection hook).

## Conseguenze

### Positive

- **Mechanic visibility**: player vede il follow-up come evento separato con
  origine chiara (telemetry `followup_log`).
- **Testability**: scope contained nell'orchestrator — pure function tests + 3-4
  scenari (happy path, cap reached, dead ally, recursion guard).
- **Extensibility**: schema supporta altri follow-up triggers (es. kill_streak,
  adrenaline_surge) senza API change.

### Negative

- **Round resolution complexity**: resolution queue non è più puramente linear.
  `buildResolutionQueue` resta deterministico, ma resolve step ha branching.
  Richiede aggiornamento doc `docs/architecture/round-orchestrator.md`.
- **Replay/deterministic regression**: raw event log deve includere follow-up
  entries con `origin_intent_id` per replay fedele. Schema combat.schema.json
  estensione richiesta (contracts seam).
- **AI impact**: SIS policy (declareSistemaIntents) attualmente non considera
  pincer opportunity. Follow-up automatici possono rendere player più letale
  di previsto, invalidando calibration iter esistenti.

### Risk / open questions

1. **Damage modifier range**: -0.5 è base TS. Playtest tuning può portare range
   [-0.7, -0.3]. ADR lascia il campo flessibile, default -0.5.
2. **Reactive detection**: detectPincer chiamato dopo un hit. Quid se intent è
   un move che porta attacker al pincer setup (senza attack)? Decisione:
   **no follow-up su move** — solo dopo hit confermato. Previene pincer-setup
   exploit (move in, alleato attacca, follow-up).
3. **Hex vs grid mapping**: detectPincer richiede hex coords (axial). Session.js
   attualmente usa {x, y} grid orthogonal. Conversion layer `gridToHex` richiesto;
   la formula dipende dalla convenzione hex adottata (offset odd-r vs odd-q vs
   doubled) — decisione rimandata a `ADR-2026-04-16-grid-type-hex-axial.md`
   follow-up. Scope doc, non ADR.

## Alternativa valutata e scartata

**Follow-up immediate (synchronous)**: esegui follow-up inline dentro
`performAttack`, skippando orchestrator queue. Più semplice ma rompe il modello
turn-based round (ogni intent deve passare per la queue per replay fedele +
visibility UI). Scartata: la queue è la **single source of truth** per
deterministic replay + telemetry.

## Implementazione (scope M14-D, non in questa ADR)

Estimate **~6h autonomous**:

- **Step 1** (~2h): Aggiungi `state.followup_queue` + `pushFollowup(intent, opts)` API.
  Test isolation (unit test orchestrator stesso).
- **Step 2** (~1.5h): Wire `detectPincer` call in `session.js` damage step
  post-hit. Import `gridToHex` conversion helper.
- **Step 3** (~1h): Estendi `combat.schema.json` con field `origin_event` +
  `followup_id`. Ripple contracts (ADR 04-14 constraint).
- **Step 4** (~1.5h): E2E tests: 3 scenari (happy pincer, cap reached, dead ally),
  verify damage mod -0.5 applied, verify telemetry log.

## Blockers

- **Schema contracts**: `packages/contracts/schemas/combat.schema.json` change
  rompe mock parity e dashboard. Coordinato con mock regeneration pipeline.
- **Grid hex mapping**: decisione formale se converti permanentemente a hex
  (ADR-2026-04-16-grid-type-hex-axial) o mantieni dual mapping. Scope separato.

## Rollback plan

Feature flag `ROUND_FOLLOWUP_QUEUE_ENABLED=false` (default). Off = `pushFollowup`
ritorna `{ accepted: false, reason: 'feature_disabled' }`. Zero behavior change
se flag off.

## Reference

- `apps/backend/services/grid/hexGrid.js:270` — detectPincer helper (shipped M14-B, docstring L251)
- `apps/backend/services/roundOrchestrator.js:271` — buildResolutionQueue
- `docs/research/triangle-strategy-transfer-plan.md:179-283` — Mechanic 3B spec
- `docs/adr/ADR-2026-04-16-grid-type-hex-axial.md` — hex grid decision
