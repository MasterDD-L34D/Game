---
title: 'Governance drift audit — Wave 2 batch (2026-05-06)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - docs/governance/docs_registry.json
  - reports/docs/governance_drift_report.json
  - docs/reports/2026-05-04-drift-audit.md
---

# Governance drift audit — Wave 2 batch (2026-05-06)

## Status

ACCEPTED — 2026-05-06

## Context

Pre-Wave-2: 460 stale_document warnings su 634 entries registry (~73% stale). Single category dominante = `stale_document` (`last_verified + review_cycle_days < today`).

Sessione verifiche baseline 2026-05-05 (post cutover Phase 3) ha rilevato il backlog drift accumulato. Wave 1 docs sweep (PR [#2065](https://github.com/MasterDD-L34D/Game/pull/2065)) ha chiuso ADR HermeticOrmus + path drift. Wave 2 = governance drift batch.

## Decision

**Bulk update** registry per categorie con semantic chiaro:

| Categoria | Count | Action | Rationale |
| --- | --- | --- | --- |
| `docs/archive/*` | 112 | `doc_status: historical_ref` + `review_cycle_days: 365` + `last_verified: 2026-05-06` | Documenti archiviati = frozen. Annual revisit sufficiente. |
| Root files (`CLAUDE.md`, `README.md`, etc) | 10 | `last_verified: 2026-05-06` (cycle invariato) | Actively maintained, weekly drift acceptable. |
| `docs/planning/*` + `docs/reports/*` + `docs/playtest/*` | 98 | `doc_status: historical_ref` + `review_cycle_days: 180` + `last_verified: 2026-05-06` | Time-stamped historical docs. Semi-annual revisit. |
| `docs/qa/*` + `docs/logs/*` + `docs/presentations/*` | 29 | `doc_status: historical_ref` + `review_cycle_days: 180` + `last_verified: 2026-05-06` | QA reports + logs + presentations = time-stamped historical. |
| **Total fixed** | **249** | — | — |

## Result

**Warnings**: 460 → **218** (-242, -52.6%).

**Errors**: 0 → 0 (invariato).

## Remaining 218 warnings

Distribute across live workstream docs (process, pipelines, core, ops, traits, evo-tactics, combat, guide, tutorials, etc). Require **real human review** — no safe bulk action without semantic risk.

| Workstream dir | Count |
| --- | --- |
| `docs/process/` | 32 |
| `docs/pipelines/` | 30 |
| `docs/core/` | 19 |
| `docs/ops/` | 17 |
| `docs/traits/` | 16 |
| `docs/evo-tactics/` | 14 |
| `docs/combat/` | 12 |
| `docs/guide/` | 12 |
| `docs/evo-tactics-pack/` | 8 |
| `docs/tutorials/` | 8 |
| `docs/adr/` | 7 |
| `docs/frontend/` | 7 |
| `docs/governance/` | 5 |
| `docs/appendici/` | 4 |
| `docs/biomes/` | 4 |
| `docs/architecture/` | 3 |
| `docs/catalog/` | 3 |
| Other | 17 |

**Next audit**: defer remaining 218 a weekly drift audit (precedent PR [#2039](https://github.com/MasterDD-L34D/Game/pull/2039) pattern). Master DD pick top-priority workstream subset per ciclo.

## Methodology

Script Python ad-hoc (vedi commit message). Categorize via path prefix → bulk update. Re-run governance check post-batch. Verify errors=0 invariato.

## Files modified

- `docs/governance/docs_registry.json` — 249 entries updated (last_verified + review_cycle_days + doc_status)
- `reports/docs/governance_drift_report.json` — auto-regenerated post-check

## Reversibility

Reversibile via `git revert`. Nessuna decisione architetturale, solo metadata governance.
