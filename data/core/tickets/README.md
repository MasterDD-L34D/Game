# Ticket Store

Canonical ticket directory per agent auto-gen architecture (architecture: [`docs/research/2026-04-26-ticket-auto-gen-architecture-D.md`](../../../docs/research/2026-04-26-ticket-auto-gen-architecture-D.md)).

## Structure

```
data/core/tickets/
├── ticket_schema.json   # canonical JSON Schema (Standard level — 8 required fields)
├── proposed/            # auto-emitted by agents OR human-curated, REVIEW NEEDED
├── active/              # accepted, sprint-ready (move from proposed/ via /ticket-triage skill)
├── rejected/            # rejected with reason (frontmatter: rejection_reason, rejected_by)
└── merged/              # completed (linked to PR sha)
```

## Conventions

- **1 file = 1 ticket** (no JSON arrays)
- File naming: `{id}.json` where id = il `id` field
- ID pattern: `TKT-{PILLAR_OR_AREA}-{DONOR-GAME-FEATURE}` (e.g. `TKT-P1-TACTICS-OGRE-HP-FLOATING.json`)
- Validation: `python -c "import json,jsonschema; ..."` — see `tools/py/validate_tickets.py` (TODO sub-step)

## Lifecycle

```
proposed → (triage) → active OR rejected
active → (PR merged) → merged
proposed → (duplicate) → rejected (with note pointing to canonical)
```

## Initial seed (2026-04-27)

73 pattern residui catalogati da cross-game extraction matrices, generati post deep extraction pass-2:
- 38 Tier S pattern (FFT, Tactics Ogre, FE, Wesnoth, AncientBeast, XCOM EW, LW2, Disco, AI War, Fallout, Wildermyth, Jackbox)
- 11 Tier A pattern (StS, Hades, MT, ITB, Dead Cells, CoQ, MHS, CK3, Subnautica, Spelunky, Dead Space)
- 11 Tier B pattern (Halfway, FS, Cogmind, Balatro, Magicka, NS2, Isaac, Battle Brothers, FF7R, Hades GDC, Wargroove)
- 13 Tier E pattern (Stockfish, Hearthstone MAP-Elites, WFC, ASP, MAP-Elites, MCTS, LLM-as-critic, Tufte, Grafana, Riot, deck.gl, DuckDB, Machinations)

Source canonical: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../../docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.

## Cross-link

- Architecture spec: [`docs/research/2026-04-26-ticket-auto-gen-architecture-D.md`](../../../docs/research/2026-04-26-ticket-auto-gen-architecture-D.md)
- Agent integration: [`docs/research/2026-04-26-agent-integration-plan-DETAILED.md`](../../../docs/research/2026-04-26-agent-integration-plan-DETAILED.md)
- Source matrices: `docs/research/2026-04-26-tier-{s,a,b,e}-extraction-matrix.md`
