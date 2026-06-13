---
title: FASE 1 AI-driven sim harness — T1.1 + T1.2 baseline
workstream: ops-qa
doc_status: active
doc_owner: master-dd
last_verified: 2026-05-09
source_of_truth: true
language: it
review_cycle_days: 30
status: active
owner: master-dd
last_review: 2026-05-09
tags:
  - playtest
  - ai
  - sim
  - smoke
  - synthetic
  - harness
  - fase1
  - jsonl
---

# FASE 1 AI-driven sim harness — 2026-05-09

Sprint Q+ AI test infra plan FASE 1 T1.1 + T1.2 shipped. T1.3 browser sync DEFERRED (baseline ship first per master-dd FASE 4 P0 unblocked combat reachable runtime via B-NEW-14).

## Files

- [`tests/smoke/ai-driven-sim.js`](../../tests/smoke/ai-driven-sim.js) — single-file Node harness, no extra deps beyond existing `ws`.

## Coverage

| Phase               | Method                                                   | AI driver                                |
| ------------------- | -------------------------------------------------------- | ---------------------------------------- |
| lobby create        | REST `/api/lobby/create`                                 | scripted                                 |
| players join        | REST `/api/lobby/join` × N                               | scripted                                 |
| coop run start      | REST `/api/coop/run/start` (skip_onboarding=true)        | scripted                                 |
| character_creation  | WS intent `character_create` × N                         | per-player synthetic spec                |
| world_setup vote    | WS intent `world_vote` × N                               | all accept                               |
| world_setup confirm | WS intent `world_confirm` (host)                         | B-NEW-14 path                            |
| session/start       | REST `/api/session/start`                                | host posts characters + scenario enemies |
| combat round loop   | REST `/api/session/state` poll + `/action` + `/turn/end` | minimal closest-enemy player AI          |
| session/end         | REST `/api/session/end` + VC capture                     | telemetry pull                           |
| debrief phase       | WS host `phase=debrief`                                  | B-NEW-1-bis orch sync                    |
| lineage_choice      | WS intent × N                                            | empty mutations_to_leave                 |
| ended               | auto via lineage quorum                                  | —                                        |

## Player AI policy (T1.1)

Minimal closest-enemy attack policy embedded in driver:

```js
function selectPlayerAction(actor, units) {
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
  if (!enemies.length) return null;
  const target = enemies.sort(
    (a, b) => dist(actor.position, a.position) - dist(actor.position, b.position),
  )[0];
  if (dist(actor.position, target.position) <= actor.attack_range && actor.ap_remaining >= 1) {
    return { action_type: 'attack', target_id: target.id };
  }
  return { action_type: 'move', target_position: stepToward(actor, target) };
}
```

Sistema (enemy) units already auto-driven server-side via `services/ai/sistemaTurnRunner` invoked on `/turn/end`. No client-side enemy AI needed.

**Future T1.x**: replace minimal policy with full `services/ai/policy.selectAiPolicy(actor, target, profile, threatCtx)` reuse via shim adapter — currently policy.js exposes Sistema-side semantics, mapping to player intents needs minor wrapper. Intentionally deferred to keep T1.1 baseline lean.

## Telemetry (T1.2)

Per-event JSONL append `/tmp/ai-sim-runs/run-<ISO>.jsonl`. Event kinds:

| kind                   | Trigger                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `rest`                 | every REST round-trip (method, path, status, dur_ms)              |
| `ws`                   | every WS msg received (label, type, payload, version)             |
| `ws_open` / `ws_error` | WS lifecycle                                                      |
| `section`              | major sim phase marker                                            |
| `round`                | combat round snapshot (players_count, enemies_count, active_unit) |
| `player_action`        | each AI player intent emitted                                     |
| `combat_outcome`       | victory / defeat / timeout                                        |
| `vc_capture`           | post-combat MBTI + Ennea distribution                             |
| `final_phase`          | terminal coop phase                                               |

Aggregate report printed end-of-run + JSONL retained for downstream `playtest-analyzer` agent ingestion.

## Run example

```bash
TUNNEL=https://<host>.trycloudflare.com node tests/smoke/ai-driven-sim.js
```

Optional env:

```bash
AI_SIM_PLAYERS=2          # extra player count beyond host (default 1)
AI_SIM_MAX_ROUNDS=15      # combat round cap before timeout outcome
AI_SIM_LOG_DIR=/tmp/ai-sim-runs
AI_SIM_SCENARIO=enc_tutorial_01
```

## Live runtime baseline (2026-05-09)

Run target: tunnel `given-jan-convention-cowboy.trycloudflare.com` (post B-NEW-14 + B-NEW-7 v2 merged).

| Metric            | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| Wall duration     | 13.0s                                                       |
| REST calls        | 53                                                          |
| WS events         | 37                                                          |
| Player AI actions | 15                                                          |
| Combat outcome    | timeout (15 rounds, no kills)                               |
| Phase progression | character_creation → world_setup → combat → debrief → ended |
| Final phase       | **ended ✅**                                                |
| JSONL entries     | 133                                                         |

Combat timeout = expected baseline. Minimal player policy + Sistema sistemaTurnRunner reach stalemate within 15 rounds. Real balance signal requires either:

- Higher action variance (Usa Trait + critical mods — T1.x follow-up)
- Damage output modifiers per archetype (already shipped Sprint Spore Moderate, but minimal policy doesn't pick traits)
- More rounds (env `AI_SIM_MAX_ROUNDS=50`)

## What this unblocks

1. **FASE 2 batch AI-vs-AI**: harness can run N=100 parallel via simple shell wrapper. Output JSONL × 100 → `playtest-analyzer` aggregate report.
2. **CI nightly regression** (`.github/workflows/ai-sim-nightly.yml`): cron 02:00 UTC, alert on phase-flow break.
3. **Pre-merge regression guard** for backend changes touching coop / session / WS — drop-in `npm run smoke:ai-sim`.

## T1.3 browser sync (DEFERRED)

Deferred per master-dd current focus on backend AI infra. Pattern noted:

- Run sim AS host (this driver)
- Spectator phone tab via Chrome MCP
- Screenshot per `phase_change` event
- Visual regression compare baseline (canvas-grid PR #2095)

Effort estimate: ~2-3h. Resume trigger: _"esegui FASE 1 T1.3 browser sync spectator"_.

## Cross-ref

- Original plan: FASE 0+1+2+3+4+5 in Game/ session 2026-05-09 message _"parto da FASE 0 + FASE 4 P0 (sblocca current stuck)"_
- B-NEW-14 host CTA WS handler: PR #2140 + Godot v2 main `7b92724`
- AI infra recon FASE 0: `apps/backend/services/ai/{policy,sistemaTurnRunner,utilityBrain}.js` + `packs/.../ai_profiles.yaml` + 4 Beehave factories Godot v2
- balance-illuminator agent calibration mode (already shipped, ready FASE 2)

## Out of scope

- Combat balance tuning (covered FASE 2 batch + Stockfish SPRT)
- MAP-Elites Quality-Diversity grid (FASE 2 advanced)
- Phone visual regression (T1.3 deferred)
- Master-dd hardware test (Phase B trigger gate ≥ 2026-05-15)
