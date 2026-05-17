---
title: Swarm UI ⇄ Skiv Monitor — integration contract
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: true
language: it
review_cycle_days: 60
tags: [skiv, swarm, integration, contract, api]
---

# Swarm UI ⇄ Skiv Monitor — integration contract

> **Audience**: chiunque debba mostrare lo stato di Skiv (creatura canonical) dentro la **Swarm AI Dashboard** (`http://127.0.0.1:5000`, runtime Dafne) o altri pannelli esterni al backend Game.

## Architettura

```
Game backend :3334            Swarm UI :5000 (Dafne)
+---------------------+       +----------------------+
| /api/skiv/status    |<------| polling fetch (10s)  |
| /api/skiv/feed      |<------| timeline component   |
| /api/skiv/card      |<------| ASCII card pre-block |
| /api/skiv/webhook   |       |                      |
+---------------------+       +----------------------+
        ^
        | writes
+---------------------+
| GitHub Actions cron |
| skiv-monitor.yml    |
| every 4h            |
+---------------------+
```

CORS già abilitato lato Game backend (`apps/backend/app.js` `cors()` middleware) — **nessun proxy richiesto** per fetch cross-origin da `:5000` verso `:3334`.

## Endpoint contract (read-only, idempotent)

### `GET /api/skiv/status`

Stato corrente creatura (snapshot). 200 sempre, anche se monitor non ha mai girato (`_fallback: true`).

**Response shape**:

```json
{
  "schema_version": "0.1.0",
  "unit_id": "skiv",
  "species_id": "dune_stalker",
  "species_label": "Arenavenator vagans",
  "biome": "savana",
  "job": "stalker",
  "level": 4,
  "xp": 230,
  "xp_next": 275,
  "form": "INTP",
  "form_confidence": 0.76,
  "gauges": { "hp": 12, "hp_max": 14, "ap": 2, "ap_max": 2, "sg": 2, "sg_max": 3 },
  "currencies": { "pe": 47, "pi": 8 },
  "cabinet": {
    "slots_max": 3,
    "slots_used": 2,
    "internalized": ["i_osservatore", "n_intuizione_terrena"]
  },
  "bond": { "vega_enfj": 3, "rhodo_istj": 2 },
  "pressure_tier": 2,
  "sentience_tier": "T2-T3",
  "mood": "watchful",
  "stress": 0,
  "composure": 1,
  "curiosity": 0,
  "resolution_count": 1,
  "perk_pending": 1,
  "evolve_opportunity": 1,
  "last_voice": "Nodo sciolto. Sabbia liscia di nuovo.",
  "last_event_id": "iss-555-closed",
  "last_updated": "2026-04-25T20:15:44Z",
  "narrative_log_size": 7,
  "counters": {
    "prs_merged": 3,
    "issues_opened": 1,
    "issues_closed": 1,
    "workflows_passed": 1,
    "workflows_failed": 1,
    "commits_silent": 0,
    "commits_fix": 1,
    "commits_revert": 0
  }
}
```

**Campi load-bearing** per render dashboard:

| Campo                | Render hint                                |
| -------------------- | ------------------------------------------ |
| `level`, `xp`        | Progress bar                               |
| `gauges.hp/hp_max`   | HP bar segmentata                          |
| `last_voice`         | Speech bubble sopra avatar                 |
| `evolve_opportunity` | Glow/pulse su sprite quando ≥1             |
| `pressure_tier`      | Color tint background (T0=verde, T5=rosso) |
| `last_updated`       | "X minuti fa" relative ts                  |

### `GET /api/skiv/feed?limit=N`

Timeline eventi recenti (default 50, max 500).

**Response shape**:

```json
{
  "count": 7,
  "entries": [
    {
      "ts": "2026-04-25T16:00:00Z",
      "event": {
        "id": "iss-555-closed",
        "kind": "issue_closed",
        "ts": "2026-04-25T16:00:00Z",
        "number": 555,
        "title": "Skiv: aggiungi voice palette type 7",
        "labels": ["P4", "skiv"],
        "html_url": "https://github.com/MasterDD-L34D/Game/issues/555"
      },
      "category": "issue_close",
      "voice": "Nodo sciolto. Sabbia liscia di nuovo.",
      "state_delta": { "counters.issues_closed": 1, "resolution_count": 1 }
    }
  ]
}
```

**Event kinds**:

`pr_merged`, `issue_opened`, `issue_closed`, `workflow_passed`, `workflow_failed`.

**Categories** (per styling):

`feat_p2`, `feat_p3`, `feat_p4`, `feat_p5`, `feat_p6`, `data_core`, `services`, `skiv_doc`, `issue_open`, `issue_close`, `wf_fail`, `wf_pass`, `fix`, `revert`, `default`.

### `GET /api/skiv/card`

Card ASCII pre-renderizzata (text/plain UTF-8). Per dashboard text-only o terminal embed.

```
Content-Type: text/plain; charset=utf-8
```

### `POST /api/skiv/webhook` (Phase 4, opt-in)

GitHub webhook receiver. Disabilitato di default (503 se `SKIV_WEBHOOK_SECRET` env unset). HMAC-SHA256 verify obbligatorio. NON usare per dashboard polling.

## Polling strategy (raccomandata Swarm UI)

```javascript
// Swarm UI client snippet (jQuery / fetch / qualsiasi)
const GAME_API = 'http://127.0.0.1:3334';

async function pollSkiv() {
  try {
    const r = await fetch(GAME_API + '/api/skiv/status', { cache: 'no-store' });
    if (!r.ok) throw new Error('status ' + r.status);
    const state = await r.json();
    renderSkivCard(state); // your function
  } catch (err) {
    console.warn('[skiv] poll failed', err);
    // graceful degrade: keep last render
  }
}

setInterval(pollSkiv, 10_000); // 10s
pollSkiv(); // initial fire
```

**Rate budget**: backend non rate-limita endpoint Skiv lato server (è solo `fs.readFile` su file locali). Polling 10s è sicuro. Per timeline feed, 30-60s è sufficiente (cambio reale solo dopo cron 4h).

## Failure modes

| Scenario                              | Backend response       | Suggested UI                   |
| ------------------------------------- | ---------------------- | ------------------------------ |
| Monitor mai girato                    | 200 + `_fallback:true` | Card stato "dormante" greyed   |
| state.json corrotto                   | 500 (rethrow JSON err) | Toast "Skiv unreachable"       |
| Game backend offline                  | network error          | Use stale cache + retry banner |
| feed.jsonl >500MB (rotation rule TBD) | OK ma slow             | Lazy-load more on scroll       |

## Refresh trigger

Skiv state cambia solo quando `tools/py/skiv_monitor.py` gira:

1. **Cron**: ogni 4h via `.github/workflows/skiv-monitor.yml`
2. **Manual**: `python tools/py/skiv_monitor.py --repo MasterDD-L34D/Game` da locale
3. **CI workflow_dispatch**: dalla UI GitHub Actions
4. **Phase 4 webhook**: real-time post commit (richiede tunnel pubblico)

Swarm UI **non triggera** monitor; si limita a leggere stato.

## Cross-references

- Plan: [../planning/2026-04-25-skiv-monitor-plan.md](../planning/2026-04-25-skiv-monitor-plan.md)
- Persona: [../skiv/CANONICAL.md](../skiv/CANONICAL.md)
- Live monitor doc: [../skiv/MONITOR.md](../skiv/MONITOR.md)
- Backend route: [`apps/backend/routes/skiv.js`](../../apps/backend/routes/skiv.js)
- Python monitor: [`tools/py/skiv_monitor.py`](../../tools/py/skiv_monitor.py)
- Workflow: [`.github/workflows/skiv-monitor.yml`](../../.github/workflows/skiv-monitor.yml)
- Tests: [`tests/api/skivRoute.test.js`](../../tests/api/skivRoute.test.js), [`tests/test_skiv_monitor.py`](../../tests/test_skiv_monitor.py)
