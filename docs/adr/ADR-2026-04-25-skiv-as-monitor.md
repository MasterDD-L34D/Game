---
title: 'ADR-2026-04-25 — Skiv-as-Monitor: creature canonica reagisce a git events'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-25'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - docs/skiv/CANONICAL.md
  - docs/skiv/MONITOR.md
  - tools/py/skiv_monitor.py
  - apps/backend/routes/skiv.js
  - apps/play/src/skivPanel.js
  - .github/workflows/skiv-monitor.yml
---

# ADR-2026-04-25 — Skiv-as-Monitor

## Status

**ACCEPTED** — 2026-04-25

## Context

Skiv (creatura canonical `Arenavenator vagans` / `dune_stalker`) era persona-recap project ma **statica** — non cambiava in funzione di evoluzione repo. User richiesto: monitor commit/issue/PR/workflow del git per dare vita a Skiv mostrando scheda + avventure + feedback derivati. Triple surface: Game in-game UI + Swarm dashboard + autogen MD.

Vincoli:

- NO LLM in-loop (deterministic, replay-safe)
- NO new npm/pip deps senza approvazione esplicita (CLAUDE.md)
- Cross-PC (memory PC-local non sync, hub canonical via git sì)

## Decision

**Architettura event-driven deterministic** con cron 4h GitHub Actions:

```
GitHub events ──cron 4h──▶ tools/py/skiv_monitor.py ──writes──▶ data/derived/skiv_monitor/
                                                                  ├── state.json
                                                                  ├── feed.jsonl (append-only)
                                                                  └── cursor.json
                                                                       │
                                                          apps/backend/routes/skiv.js
                                                          /api/skiv/{status,feed,card,webhook}
                                                                       │
                                                              ┌────────┴────────┐
                                                              ▼                 ▼
                                                       Game in-game         Swarm dashboard
                                                       skivPanel.js        :5000 cross-origin
                                                       header btn 🦎       polling 30s
```

**Mapping pure function** `map_event(event) → {state_delta, voice}` con Conventional Commits parser typed.

**Lifecycle 5 fasi** gating `data/core/species/dune_stalker_lifecycle.yaml`: hatchling → juvenile → mature → apex → legacy.

**Voice palette layered** deterministic seed: 50% Tracery seeded grammar (662 voci combinatorial) + 25% Lifecycle YAML voice_it + 25% static palette (131 lines × 21 categories).

**Weekly digest QBN salience** (`narrative_log_size % 7`): 14 storylets in YAML data-driven con predicates gte/lte/gt/lt/eq/ne/in.

**Self-healing workflow**: cron 4h push `auto/skiv-monitor-update` branch → idempotent PR auto-create → Master DD merge.

## Consequences

### Positive

- Skiv vivo con memoria full repo (1730+ PR + 72 issues + 2496 workflows backfilled)
- Cross-PC determinism via git (replay-safe, zero LLM cost)
- Triple surface real-time (Game overlay + Swarm card + MD autogen)
- Diary auto-populate cross-session
- Phase visual progression bar 5-cell + sprite SVG hand-craft + raster CC0 (GrafxKid TL_Creatures.png)
- Webhook live receiver opt-in (Phase 4) per real-time alternative cron 4h
- Industry pattern adoption inline (Tracery + SimpleQBN + Conventional Commits) zero deps

### Negative

- Saga JSON non auto-update di default — saga è SoT human-curated separato monitor (intentional, manual sync via `tools/py/skiv_saga_sync.py`)
- Italian gender disagree minor in tracery voci ("le stomaco") — accettato per non-fluent creatura
- Workflow needs branch protection bypass via auto branch + PR pattern (no direct push main)
- Webhook tunnel = userland (ngrok/Cloudflare richiesto per real-time public)

### Costs

- ~14 PR shipped sessione (#1831, #1832, #1839, #1836, #1841, #1843, #1845, #1847, #1849, #1850 + chain)
- ~10000 LOC totali (Python + Node + YAML + SVG + docs)
- Cron 4h budget GitHub Actions minutes (negligible)
- 2 evo-swarm PR (#43, #46) per Swarm dashboard wire

## Alternatives considered

| Alternative                      | Rejected because                                           |
| -------------------------------- | ---------------------------------------------------------- |
| LLM-driven voice generation      | Vincolo no-LLM; replay-safe + zero cost preferred          |
| Tamagotchi idle/clicker          | Non event-driven; non si lega a repo evolution             |
| Reset/death loop classico        | Skiv additive-only, fasi cumulative (lifecycle)            |
| Single-platform UI (Discord bot) | Triple-surface architectural choice                        |
| Octokit npm deps for webhook     | npm dep approval pending — deferred (proposal doc shipped) |

## Addendum — Distribution channel v2 (OD-042-A, 2026-05-16)

**Supersedes**: "git-hub-via-PR-to-main" distribution path.

**Problema rilevato**: il canale "bot apre PR derived-only → main protetto"
generava (1) PR BLOCKED ricorrente eterno (`ci.yml` required-check
path-filtered → skipped su PR derived → mai mergiabile, vedi Game #2257)
e (2) bloat: `feed.jsonl` append-only 8.3 MB +ogni 4h nella git-history
di `main` se mergiato.

**Decisione master-dd (vault `docs/decisions/OD-042-skiv-monitor-
distribution-channel-2026-05-16.md`, verdict A)**: lo stato Skiv è dato
derived/rigenerabile di distribuzione → NON appartiene a `main`. Bot
orphan-force-push a branch dedicato non-protetto `skiv-monitor/state`
(nessun PR, nessun required-check, history shallow ogni run = zero
bloat). Git resta hub cross-PC (intento ADR preservato), fuori dal path
protetto. Backend `apps/backend/routes/skiv.js` fetcha quel branch
(raw.githubusercontent + cache TTL + fallback locale graceful). API
`/api/skiv/{status,feed,card}` invariata. Cleanup gitignore
`data/derived/skiv_monitor/` = follow-up opzionale separato (post
stabilizzazione, coerente con `data/derived/unit_diaries/` già gitignored).

Resto dell'ADR (event-driven deterministic, mapping pure-function,
lifecycle, voice) **invariato**: cambia solo il canale di distribuzione.

## Cross-references

- Decisione redesign: [vault OD-042](../decisions/) (`docs/decisions/OD-042-skiv-monitor-distribution-channel-2026-05-16.md`)
- Persona canonical: [docs/skiv/CANONICAL.md](../skiv/CANONICAL.md)
- Live monitor doc: [docs/skiv/MONITOR.md](../skiv/MONITOR.md) (autogen, do NOT edit)
- Plan: [docs/planning/2026-04-25-skiv-monitor-plan.md](../planning/2026-04-25-skiv-monitor-plan.md)
- Online imports research: [docs/research/2026-04-25-skiv-online-imports.md](../research/2026-04-25-skiv-online-imports.md)
- Octokit npm proposal: [docs/planning/2026-04-25-skiv-octokit-webhooks-proposal.md](../planning/2026-04-25-skiv-octokit-webhooks-proposal.md)
- Swarm UI integration contract: [docs/integrations/swarm-skiv-feed.md](../integrations/swarm-skiv-feed.md)

🦎 _Sabbia segue. Skiv ricorda da quando primo PR è nato._
