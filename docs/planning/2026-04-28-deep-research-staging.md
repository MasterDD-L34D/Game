---
title: 2026-04-28 Deep research staging — handoff per NEW session analysis
doc_status: staging
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
language: it
review_cycle_days: 7
related:
  - 'docs/planning/2026-04-28-master-execution-plan.md'
  - 'docs/planning/2026-04-28-godot-migration-strategy.md'
  - 'docs/planning/2026-04-28-asset-sourcing-strategy.md'
---

# Deep research staging — handoff per NEW session analysis

## Context

User ha 2 file deep research da contestualizzare a:

1. **Master execution plan v2** (Sprint G v3 + Visual Map Obsidian + Godot migration phased)
2. **Repo state corrente** (web stack Vue 3 + Canvas 2D + Express backend, sprint A-F shipped, P5 gating TKT-M11B-06 pending)

**Decision** (questa sessione): NEW session dedicata per deep research analysis — context window saturazione + attention dedicata + plan v2 ESEGUIBILE in parallel.

**Stato sessione current** post-PR #1995 merge `4844add6`:

- Branch deleted: `feat/visual-upgrade-tactical-2026-04-28`
- Branch staging: `feat/deep-research-analysis-2026-04-28` (da origin/main)
- Working tree clean
- Master plan v2 production-ready (3 CRITICAL + 5 HIGH gap killed via 2-agent review)
- Sprint G v3 ready start (Legacy Collection Ansimuz CC0, ~20h ~2.5g)

## Deep research file (TO BE PROVIDED da user)

**Path placeholder** (user fornirà NEW session):

- `<file-1-path>` — TBD
- `<file-2-path>` — TBD

**Format atteso**:

- File location (zip / .md / .pdf / cartella?)
- Topic / scope
- Source (academic? industry? whitepaper? blog series?)
- Length (LOC / pagine)
- Goal user (apply to plan v2 / reference / decision-altering)

## Goals analysis NEW session

1. **Read + understand** entrambi file deep research thoroughly
2. **Cross-reference** vs master plan v2 — quale fase / sprint impattano?
3. **Gap detection** — research findings rivelano gap nuovi nel plan v2?
4. **Decision-altering check** — research findings cambiano decisioni v2 (es. NO Godot migration / SI Trilium / cherry-pick diverso)?
5. **Update plan v2** se necessario → master plan v3
6. **Output**: doc dedicato `docs/research/2026-04-28-deep-research-synthesis.md` con:
   - Executive summary 2 file
   - Cross-ref matrix (research finding × plan v2 sprint)
   - Action items concrete + effort
   - Plan v2 → v3 changelog se decision-altering

## Pre-loaded context (NEW session leggi questi PRIMA)

| File                                                   | Why                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `docs/planning/2026-04-28-master-execution-plan.md`    | Plan v2 980 LOC — current execution state                                                               |
| `docs/planning/2026-04-28-godot-migration-strategy.md` | 3-fase migration plan                                                                                   |
| `docs/planning/2026-04-28-asset-sourcing-strategy.md`  | Asset multi-tier (Legacy + itch.io + Godot Asset Library)                                               |
| `CLAUDE.md` (Game repo)                                | Sprint context attuale (post Sprint 13 #1994) + autonomous execution policy + 4-gate DoD + Gate 5 wired |
| `BACKLOG.md`                                           | Open ticket + deferred decisions (Colyseus post-playtest gating)                                        |
| `OPEN_DECISIONS.md`                                    | Ambiguità non bloccanti + verdict                                                                       |

## Resume trigger phrase

In NEW session, user può dire:

> _"leggi docs/planning/2026-04-28-deep-research-staging.md, fornisco i 2 file deep research, esegui §Goals analysis"_

Claude (NEW session):

1. Read staging doc + pre-loaded context (5 file sopra)
2. Read 2 file deep research (path forniti da user)
3. Spawn 2 agent paralleli (general-purpose + balance-illuminator) per cross-reference + gap detection
4. Synthesize → `docs/research/2026-04-28-deep-research-synthesis.md`
5. Update plan v2 → v3 se decision-altering
6. Commit + push branch `feat/deep-research-analysis-2026-04-28`
7. PR open

## Decision points pending master plan v2 (carry-over)

| #   | Decision                                                                              | Default v2 |
| --- | ------------------------------------------------------------------------------------- | :--------: |
| 1   | Ordine fasi (G→I→J‖K→L→M→N→gate→O-S)                                                  | confermato |
| 2   | Obsidian invece Trilium                                                               | confermato |
| 3   | DevForge skip                                                                         |  default   |
| 4   | Donchitos cherry-pick (24 agent + 30 skill)                                           |  default   |
| 5   | HermeticOrmus cherry-pick 10-15 prompt                                                |  default   |
| 6   | Repo strategy Fase 2: NEW repo Game-Godot-v2                                          |  default   |
| 7   | Vertical slice scope: 3-feature (combat + mating + thoughts)                          | default v2 |
| 8   | Backend Express + Prisma + WS persiste Fase 3                                         |  default   |
| 9   | Mission Console deprecated immediate Fase 3                                           |  default   |
| 10  | Cherry-pick Donchitos `/art-bible` `/asset-spec` `/asset-audit` defer Sprint K Fase 2 |  default   |

**Deep research analysis può alterare decision points 3-10**. Decision 1+2 confermati esplicitamente user.

## Pre-condition NEW session start

- ✅ PR #1995 MERGED main (4844add6)
- ✅ Working tree clean
- ✅ Branch `feat/deep-research-analysis-2026-04-28` ready (da origin/main)
- ✅ Plan v2 production-ready
- ⚠️ 2 deep research file path NOT YET provided (user fornirà NEW session)

## NON-goals NEW session

- ❌ Sprint G v3 esecuzione (parallel auto mode separate session OR defer post-analysis)
- ❌ Re-analyze plan v2 da zero (carry-over OK)
- ❌ Re-spawn 2 review agent stesso scope plan v2 (focus deep research only)
- ❌ Git operations destructive su main (no force push, no rebase plan v2 history)

## Memory save ritual current session

- ✅ COMPACT_CONTEXT.md update (pending — vedi sotto)
- ✅ BACKLOG.md update (pending — vedi sotto)
- ✅ Memory file `feedback_*` PC-local NON-sync (skip — cross-PC via git only)
- ✅ This staging doc commit + push branch

## NEW session start checklist (Claude)

```
1. Read docs/planning/2026-04-28-deep-research-staging.md (this file)
2. Read CLAUDE.md (autonomous execution policy)
3. Read master plan v2 + Godot strategy + asset strategy
4. User provides 2 deep research file paths
5. Read 2 deep research thoroughly (offset/limit if large)
6. Spawn 2 agent paralleli: general-purpose (gap analysis) + balance-illuminator (domain fit)
7. Synthesize output doc
8. Decision-altering check → plan v2 → v3 if needed
9. Commit + push branch + open PR
```

---

**Status**: STAGING — pending NEW session start + 2 deep research file fornitura.
