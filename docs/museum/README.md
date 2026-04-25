---
title: Museum — How to use
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [archive, archaeology, curation, agents]
---

# Museum — Guida d'uso

## Cos'è

Archivio curato di **idee sepolte** nel repo Evo-Tactics che potrebbero essere riusate. Non è cestino. Non è log. È **codex consultabile** (pattern Hades Codex) con metadata Dublin Core (provenance + relevance + reuse path).

## Quando consultare

Tu sei un agent (balance/creature/narrative/...) e stai per iniziare research su un dominio. **PRIMA** di WebSearch / repo dig:

1. `Read docs/museum/MUSEUM.md` (index, cap 200 righe come MEMORY.md)
2. Se vedi card relevant nel domain → `Read docs/museum/cards/<id>.md`
3. Se ≥3 card stesso domain → `Read docs/museum/galleries/<domain>.md` per narrative aggregate

## Quando NON consultare

- Bug fix puntuali (no domain reasoning)
- Tweak parametri esistenti
- UI polish
- Scope sotto 50 LOC

## Quando popolare

Solo agent [`repo-archaeologist`](../../.claude/agents/repo-archaeologist.md) scrive qui. Invocazione tipica:

```
invoke repo-archaeologist --mode excavate --domain ancestors
invoke repo-archaeologist --mode curate --target incoming/sentience_traits_v1.0.yaml
```

## Schema card

Frontmatter Dublin Core-inspired + 5 sezioni body (Summary / What was buried / Why buried / Why matters / Reuse paths / Sources / Risks). Vedi [agent spec](../../.claude/agents/repo-archaeologist.md#museum-schema-dublin-core-inspired).

## Anti-pattern

- ❌ Mai cancellare card. Mark `status: rejected` se decisi non revivere.
- ❌ Mai duplicare card per stesso artifact. Update existing.
- ❌ Mai rivivere artifact da card senza ADR + user OK.
- ❌ Mai consultare il museo come fonte canonical: museum è **idee da valutare**, non `data/core/`.

## Lifecycle stato

```
excavated     # found, datalogged, no curate yet
  ↓
curated       # card written + provenance verified
  ↓
reviewed      # human/user has read, decision pending
  ↓
revived       # integrated into runtime (link PR)
  ↓
rejected      # decided not to revive (link reason ADR)
```

## Manutenzione

- Sweep periodico (suggested: ogni 3 sprint): re-score relevance via time-decay.
- Card `revived`: spostare in `docs/museum/cards/_revived/` (sub-dir) con link PR.
- Card `rejected` >12 mesi: archive in `docs/archive/museum-rejected/`.

## Bootstrap status

**2026-04-25 sera (post-session-2)**: 100% domain coverage (8/8). 11 card curate (5 score 5/5 + 6 score 4/5). 8 inventory + 1 gallery (enneagramma). Cross-agent validation PASS (creature-aspect-illuminator consultato spontaneously, 6 GAP found, ~10-15min saved).

Vedi [`MUSEUM.md`](MUSEUM.md) "📊 Stats" per breakdown corrente. Prossimo step: review user OD-001 correction (mating engine LIVE, decisione product Path A/B/C).
