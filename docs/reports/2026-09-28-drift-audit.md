---
title: Drift Audit 2026-09-28
date: 2026-09-28
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-09-28
source_of_truth: false
language: it
---

# Drift Audit 2026-09-28

## TL;DR

| Totale | P0 | P1 | P2 |
|--------|----|----|-----|
| 9 finding | 1 | 4 | 4 |

**PR remediation**: aperta in questo run — vedi sezione Auto-fix.

**Pattern critico**: P0 DRIFT_AUDIT_BACKLOG persiste da 10 settimane consecutive. Auto-fix mai applicato. Owner deve mergiare o chiudere le draft PR accumulate (#3308–#3317).

CI main: 🟢 green (ultimo run 2026-07-14, `docs(adr)` → success). Main fermo da 75 giorni (nessun nuovo commit).

Governance: errors=0 warnings=565 (560 stale_document + 4 unregistered + 1 mismatch).

---

## Findings P0

| # | Codice | Dettaglio |
|---|--------|-----------|
| 1 | DRIFT_AUDIT_BACKLOG | 10 PR governance drift aperte senza merge (#3308–#3317). Auto-fix applicati nei branch esistenti mai mergiati. Pattern: scheduled run accumula PR, owner non review/merge. |

**Impatto**: le fix auto (archiviazione handoff, registry update) non raggiungono mai `main` → debito si accumula ogni settimana.

---

## Findings P1

| # | Codice | Ref | Dettaglio |
|---|--------|-----|-----------|
| 2 | SPRINT_STALE | CLAUDE.md | Sprint context al 2026-07-04 → **86 giorni** stale (>14 threshold). Ultimo sprint: TKT-P6-AP3. |
| 3 | STALE_ADR | ADR-2026-07-10 | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` — status: `proposed`, **79 giorni** |
| 4 | STALE_ADR | ADR-2026-07-14 | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` — status: `proposed`, **75 giorni** |
| 5 | PR_ROT | #3306 | `fix(species): recover rovine_planari` — non-draft, open **75 giorni**, clean, 0 review activity |

---

## Findings P2

| # | Codice | Dettaglio |
|---|--------|-----------|
| 6 | PR_ROT (draft) | #3308–#3316: 9 governance drift PRs draft, 14–70 giorni senza attività |
| 7 | HANDOFF_STALE | 89 handoff docs in `docs/planning/` — tutti ≥75 giorni (last repo commit 2026-07-14). **Auto-fix: git mv → archive** |
| 8 | GOVERNANCE_UNREGISTERED | 4 doc con frontmatter `doc_status` assenti dal registry: `docs/ops/backend-components-inventory.md`, `docs/planning/2026-07-14-r1-trait-stub-authoring-istruttoria.md`, `docs/planning/2026-07-14-r1-v2-trait-stub-authoring-corrected.md`, `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` |
| 9 | GOVERNANCE_MISMATCH | `docs/adr/ADR-2026-04-16-session-engine-round-migration.md` — `last_verified` frontmatter `2026-07-05` vs registry `2026-06-06` |

---

## Branch stale (top 4, >30 giorni, no open PR)

| Branch | Età stimata |
|--------|-------------|
| `chore/weekly-drift-audit-2026-06-01` | ~119 giorni |
| `chore/weekly-drift-audit-2026-06-15` | ~105 giorni |
| `chore/weekly-drift-audit-2026-07-06` | ~84 giorni |
| `chore/weekly-drift-audit-2026-07-13` | ~77 giorni |

Plus numerosi `claude/*` e `aa01/*` branch con nessuna PR aperta. **Non auto-fixable** (branch delete = owner).

---

## Auto-fix changelog

### Commit 1: report
- Aggiunto `docs/reports/2026-09-28-drift-audit.md` (questo file)

### Commit 2: archivia handoff docs
- `git mv docs/planning/*handoff*.md docs/archive/historical-snapshots/planning-handoffs/` (89 file)
- Crea `docs/archive/historical-snapshots/planning-handoffs/` se assente

### Commit 3: registry sync
- 71 entry registry aggiornate: path `docs/planning/*.md` → `docs/archive/historical-snapshots/planning-handoffs/*.md`
- `doc_status` → `historical_ref` per gli entry coinvolti

---

## Suggested next actions

1. **[P0 master-dd]** Merge o chiudi #3308–#3317. Il P0 non sparisce finché almeno una delle fix auto non atterra su `main`.
2. **[P1 master-dd]** Aggiorna sprint context CLAUDE.md (fermo a 2026-07-04, 86 giorni). Decidi stato ADR-2026-07-10 e ADR-2026-07-14 (`active`/`superseded`/`rejected`).
3. **[P1 master-dd]** Review #3306 (`fix/rovine-planari-recovery`) — open 75 giorni, clean, non-draft.
4. **[P2 auto]** I 4 doc unregistered e il mismatch ADR-2026-04-16 richiedono registry edit manuale (fuori scope auto-fix).
5. **[P2 master-dd]** Elimina branch stale `chore/weekly-drift-audit-2026-06-01` e predecessori (nessuna PR aperta).
