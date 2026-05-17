---
title: Skiv-as-Monitor — feature plan + architecture
doc_status: draft
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [skiv, monitor, github, telemetry, swarm-ui, persona]
---

# Skiv-as-Monitor — feature plan

> **Goal**: Skiv (creatura canonical) reagisce live a commit/PR/issue/workflow del repo `MasterDD-L34D/Game`. User vede scheda + avventure + feedback derivati da git events. Stessa scheda esposta a Swarm UI (`http://127.0.0.1:5000`) e in-game (debriefPanel) per leggere "come la creatura percepisce il gioco che evolve".

## Why (problem statement)

- Repo evolve veloce (200+ PR/sprint). User vuole feedback narrativo immediato sul significato di ogni cambio per la creatura canonical.
- Skiv è già la persona-recap del progetto (vedi [docs/skiv/CANONICAL.md](../skiv/CANONICAL.md)). Manca event-driven loop.
- Swarm UI separata (Dafne :5000) deve mostrare lo stesso feed → bridge HTTP needed.
- Nessuna invenzione: composiamo solo asset esistenti (telemetry pipeline + GitHub poller + Skiv persona + canonical data).

## Architecture (single-pass, no new deps)

```
┌─────────────────────────┐
│ GitHub MasterDD-L34D/   │  push, PR merge, issue, workflow run
│ Game (events source)    │
└──────────┬──────────────┘
           │ REST API poll (4h cron) + optional webhook
           ▼
┌─────────────────────────────────────────┐
│ tools/py/skiv_monitor.py                │
│   1. fetch events since last cursor     │
│   2. classify (commit/PR/issue/wf)      │
│   3. map to Skiv state delta            │
│      (HP/SG/PE/biome/voice line)        │
│   4. compose narrative beat (it)        │
│   5. append JSONL feed                  │
│   6. update state.json snapshot         │
│   7. render MONITOR.md card             │
└──────────┬──────────────────────────────┘
           │ writes
           ▼
┌─────────────────────────────────────────┐
│ data/derived/skiv_monitor/              │
│   ├── feed.jsonl       (append-only)    │
│   ├── state.json       (current)        │
│   └── cursor.json      (last seen sha)  │
│ docs/skiv/MONITOR.md   (rendered)       │
└──────────┬──────────────────────────────┘
           │ read
           ▼
┌─────────────────────────────────────────┐
│ apps/backend/routes/skiv.js             │
│   GET  /api/skiv/status   → state.json  │
│   GET  /api/skiv/feed     → feed.jsonl  │
│   GET  /api/skiv/card     → ASCII card  │
│   POST /api/skiv/webhook  → webhook in  │
└────┬───────────────┬────────────────────┘
     │               │
     ▼               ▼
┌──────────┐    ┌────────────────────┐
│ in-game  │    │ Swarm UI :5000     │
│ debrief- │    │ (Dafne dashboard)  │
│ Panel    │    │ HTTP poll JSON     │
└──────────┘    └────────────────────┘
```

## Skiv state mapping (deterministic, no LLM)

State delta da event type:

| Event                         | Skiv reaction (state)               | Narrative voice                                   |
| ----------------------------- | ----------------------------------- | ------------------------------------------------- |
| PR merged + label `feat/p2-*` | Form evolve opportunity +1, PE +5   | _"Sento il guscio cambiare. Allenatore..."_       |
| PR merged + label `feat/p3-*` | XP +20, perk_pending++              | _"Il branco si organizza. Imparo un nome nuovo."_ |
| PR merged + label `feat/p4-*` | MBTI confidence ±5, cabinet_event   | _"Voce nuova nella stanza interna."_              |
| PR merged + label `feat/p5-*` | Bond ♥ +1 (random co-op)           | _"Ho sentito un altro respiro vicino."_           |
| PR merged + label `feat/p6-*` | Pressure Tier shift                 | _"Sistema preme. Sabbia vibra."_                  |
| PR merged + path `data/core/` | Trait pool refresh                  | _"Memoria genetica risistema indici."_            |
| PR merged + path `services/`  | Combat awareness +                  | _"Riflessi affilati."_                            |
| PR merged + path `docs/skiv/` | Self-reflection beat                | _"L'allenatore parla di me. Me ne accorgo."_      |
| Issue opened                  | curiosity++                         | _"Domanda nuova nell'aria."_                      |
| Issue closed                  | resolution_count++                  | _"Una voce tace. Pace breve."_                    |
| Workflow failed               | stress +1, HP -1 (cosmetic)         | _"Qualcosa scricchiola. Aspetto."_                |
| Workflow success              | composure +1                        | _"Tutto in posto. Respiro."_                      |
| Commit `chore:` solo          | no narrative (silent counter)       | —                                                 |
| Commit `fix:`                 | small healing tick HP +1 (max base) | _"Una crepa chiusa. Bene."_                       |
| Commit `revert:`              | confusion +1                        | _"Era così. Adesso non più. Ricordo entrambi."_   |

Mapping è **pure function** `map_event(event_dict) -> {state_delta, voice}`. Determinismo = riproducibile + testabile.

## Files to ship (MVP)

| File                                             | Type     | LOC est  | Status |
| ------------------------------------------------ | -------- | -------- | :----: |
| `tools/py/skiv_monitor.py`                       | Python   | ~280     |  NEW   |
| `apps/backend/routes/skiv.js`                    | Node     | ~140     |  NEW   |
| `apps/backend/app.js` wire                       | edit     | +2       |  EDIT  |
| `.github/workflows/skiv-monitor.yml`             | workflow | ~45      |  NEW   |
| `docs/skiv/MONITOR.md`                           | doc      | template |  NEW   |
| `data/derived/skiv_monitor/state.json` (seeded)  | data     | ~40      |  NEW   |
| `data/derived/skiv_monitor/cursor.json` (seeded) | data     | ~5       |  NEW   |
| `tests/tools/skiv_monitor.test.py`               | test     | ~80      |  NEW   |
| `docs/planning/2026-04-25-skiv-monitor-plan.md`  | this     | ~200     |  NEW   |

**Zero nuove deps**. Python: `requests` (già in repo). Node: solo `fs/promises` + `path`.

## Phases

### Phase 1 — MVP backend + cron (this PR, ~2h)

- [x] Plan doc
- [ ] Python monitor (offline-runnable con `--mock-events fixture.json`)
- [ ] Backend route + wire
- [ ] GitHub Actions workflow
- [ ] Initial state seed
- [ ] Smoke test offline

### Phase 2 — Frontend wire (follow-up PR, ~2h)

- Extend `apps/play/src/debriefPanel.js` con `renderSkivMonitorCard()` che fetch `/api/skiv/card`
- Header button 🦎 Skiv per overlay full feed
- CSS minimo (riutilizza `.db-card` pattern)

### Phase 3 — Swarm UI integration (follow-up PR, ~3h)

- Cross-origin GET (Game backend `:3334` da Swarm UI `:5000`)
- CORS già abilitato lato Game
- Swarm dashboard fetch + render Skiv card sub-component
- Documentazione contract endpoint in `docs/integrations/swarm-skiv-feed.md`
- (Swarm dashboard repo: `~/Dafne/workspace/swarm/` — separato, requires owner Dafne side)

### Phase 4 — Webhook live (optional, ~2h)

- Espone `POST /api/skiv/webhook` con HMAC verify (`X-Hub-Signature-256`)
- GitHub repo settings → webhook URL (richiede tunnel ngrok/Cloudflare per dev)
- Real-time vs 4h cron poll

## Gates DoD (4-gate policy)

1. **Smoke test** — `python tools/py/skiv_monitor.py --mock-events fixtures/test_events.json --dry-run` verde + state.json output diff atteso
2. **Edge cases** — empty events, malformed JSON, GitHub rate-limit (403), cursor reset, race condition workflow concurrent runs
3. **Tuning** — narrative beat dedup (no spam stesso PR), cap feed.jsonl 5000 entries (rotate), state proportions stabili (HP/AP/SG never below 0)
4. **Optimization** — token-efficient API (incremental cursor), 1 GitHub call per cron tick

## Risks + mitigations

| Risk                                | Mitigation                                                  |
| ----------------------------------- | ----------------------------------------------------------- |
| GitHub rate-limit (5k req/h auth)   | Cursor incremental + ETag if-modified-since                 |
| Skiv "voice spam" su batch merge    | Dedup window 30min stesso PR/issue                          |
| State drift vs canonical proporsion | State proportions clamped + reset script                    |
| Swarm UI cross-origin               | CORS Game already enabled (`cors()` middleware app.js:line) |
| Webhook public endpoint security    | Phase 4 only — HMAC verify mandatory                        |
| Hallucinated narrative              | Voice lines = static palette, NO LLM in-loop                |

## Acceptance criteria (when "done")

- ✅ `python tools/py/skiv_monitor.py --since 2026-04-20` produce JSONL + state.json + MONITOR.md
- ✅ `curl http://localhost:3334/api/skiv/status` ritorna state JSON
- ✅ `curl http://localhost:3334/api/skiv/feed?limit=20` ritorna eventi recenti
- ✅ `curl http://localhost:3334/api/skiv/card` ritorna ASCII card pronto-render
- ✅ GitHub Actions workflow gira ogni 4h, commits MONITOR.md aggiornata
- ✅ `python -m pytest tests/tools/skiv_monitor.test.py` verde (≥3 edge case)
- ✅ Phase 2/3 doc scritti come placeholder per follow-up

## Cross-references

- [docs/skiv/CANONICAL.md](../skiv/CANONICAL.md) — persona + voice rules
- [tools/py/daily_pr_report.py](../../tools/py/daily_pr_report.py) — GitHub API client pattern
- [apps/backend/routes/session.js:213-230](../../apps/backend/routes/session.js) — telemetry append pattern
- [WORKSPACE_MAP.md](../../WORKSPACE_MAP.md) — Swarm UI :5000 entrypoint
- [docs/museum/MUSEUM.md](../museum/MUSEUM.md) — prior art (consulted before WebSearch per protocol)
