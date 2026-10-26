---
title: Drift Audit 2026-10-26
date: '2026-10-26'
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: '2026-10-26'
source_of_truth: false
language: it
---

# Drift Audit 2026-10-26

> Routine settimanale automatica. Audit-date: 2026-10-26. Branch: `chore/weekly-drift-audit-2026-10-26`.

---

## TL;DR

| Categoria | Valore |
|-----------|--------|
| Totale finding | 14 gruppi (109 item aggregati) |
| **P0 critici** | 2 |
| **P1 should-fix** | 5 |
| **P2 nice-to-fix** | 7 |
| Auto-fix eseguiti | 0 (git mv tentato e revertito — breaking 71 doc-pin) |
| CI main | 🟢 verde (ultimo push 2026-07-14, run #14201) |
| Governance errors | 0 |
| Governance warnings | 657 (+17 vs settimana scorsa) |
| PR aperti | 15 (14 drift + 1 feature) |

**PR remediation**: `chore/weekly-drift-audit-2026-10-26` — aperto come draft.

### Segnale di contesto

⚠️ **Il repo è dormiente da 104 giorni** (ultimo push main: 2026-07-14). Tutti i finding
P0/P1 sono conseguenze dirette di questa inattività. La routine ha funzionato correttamente
ma nessun PR è stato mergiato nelle 14 settimane precedenti.

---

## Findings P0

| # | Tipo | Dettaglio | Età |
|---|------|-----------|-----|
| P0-1 | `DRIFT_PR_ACCUMULATION` | 14 drift-audit PR (#3308–#3321) aperti non mergiati. Pattern cronico da luglio 2026. | 14–98 gg |
| P0-2 | `SPRINT_STALE` | CLAUDE.md sprint context ultimo aggiornamento 2026-07-04 | 114 gg |

**P0-1 note**: #3308 (2026-07-20) → #3321 (2026-10-19) tutti draft, nessuno mergiato.
Ogni settimana la routine apre un nuovo PR ma il backlog accumulato non viene smaltito.
Azione richiesta a master-dd: merge/close batch dei PR drift arretrati.

**P0-2 note**: Lo sprint context fa riferimento al TKT-P6-AP3 chiuso 2026-07-04.
Il repo non ha avuto push a main dopo 2026-07-14 → il context non è stale per errore
ma perché il lavoro si è interrotto.

---

## Findings P1

| # | Tipo | File | Età |
|---|------|------|-----|
| P1-1 | `STALE_ADR` | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` — Status: proposed | 108 gg |
| P1-2 | `STALE_ADR` | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` — Status: proposed | 104 gg |
| P1-3 | `REPO_DORMANT` | Nessun push a main dal 2026-07-14. CI verde su quel commit ma nessuna attività da allora. | 104 gg |
| P1-4 | `HANDOFF_STALE` | 89 handoff docs in `docs/planning/` tutti >45 gg (range 2026-04-24 → 2026-07-04). Auto-fix tentato (git mv → archive) poi **revertito**: CLAUDE.md sprint context e BACKLOG.md contengono 71 doc-pin a questi file; il mv avrebbe rotto la governance CI. Owner-gated: smaltire a mano o aggiornare i pin prima del mv. | 114–185 gg |
| P1-5 | `BACKLOG_DORMANT` | 6 ticket BACKLOG con [ ] aperti, nessun commit recente (>30 gg): TKT-SIM-COOP-SEED · D6-graded-reratify · N3-ER7-flag-ON · TKT-P6-orphans · zone-defense · XP_BUDGET_GEOMETRY flip. | >100 gg |

**P1-1/P1-2 note**: Entrambi gli ADR hanno `doc_owner: master-dd`. Status proposed >14 giorni
→ decisione pending. Non auto-fixabili (ADR status = owner-gated).

**P1-4 note**: Auto-fix tentato poi revertito. Il mv avrebbe rotto 71 doc-pin in CLAUDE.md
(sprint context) e BACKLOG.md, causando `path_missing` governance errors in CI.
Il più recente handoff è `2026-07-04-tkt-p6-ap3-closure-handoff.md` (114 gg).
Azione richiesta a master-dd: aggiornare i pin prima di archiviare.

---

## Findings P2

| # | Tipo | Dettaglio |
|---|------|-----------|
| P2-1 | `PR_ROT` | PR #3306 `fix(species): recover rovine_planari` — aperto, ultimo aggiornamento 2026-07-14 (104 gg). Branch: `fix/rovine-planari-recovery`. Non è un drift PR, è una feature reale. |
| P2-2 | `GOVERNANCE_WARNINGS` | 657 warning (errors=0). +17 vs settimana scorsa (640). Nessun errore — non bloccante. |
| P2-3 | `BRANCH_STALE` | 10 branch senza open PR, ultimo commit >30 gg (top 10 sotto). |
| P2-4 | `ADR_REVIEW_CYCLE` | `review_cycle_days: 90` su entrambi gli ADR proposed: la soglia non è stata rispettata. |
| P2-5 | `BACKLOG_MARKER_CHECK` | BACKLOG.md non aggiornato post-dormienza. Nessun marker STALE_TICKET identificato (i PR mergiati sono correttamente marcati ✅). |

### P2-3 Branch stale (top 10, no open PR, >30 gg)

| Branch | Motivo |
|--------|--------|
| `chore/weekly-drift-audit-2026-06-01` | Audit precedente, no PR aperto |
| `chore/weekly-drift-audit-2026-06-15` | Audit precedente, no PR aperto |
| `chore/weekly-drift-audit-2026-07-06` | Audit precedente, no PR aperto |
| `chore/weekly-drift-audit-2026-07-13` | Audit precedente, no PR aperto |
| `aa01/cap-02-tracking-commit` | Arco aa01 fermo, no PR |
| `aa01/cap-07-terrain-reactions-wire` | Arco aa01 fermo, no PR |
| `auto/mission-console-dist-2026-05-10-1919` | Auto-dist branch, no PR |
| `automation/daily-tracker-refresh` | Bot branch fermo, no PR |
| `autoresearch/coop-broadcast-debrief-payload` | Research branch, no PR |
| `claude/closeout-sync-0701` | Sprint sync branch, no PR |

---

## Auto-fix changelog

Nessun auto-fix eseguito in questa run.

**AF-1 tentato e revertito**: git mv 89 handoff docs `docs/planning/` → archive.
Revertito perché avrebbe rotto 71 doc-pin governance (`path_missing` errors in CI)
in CLAUDE.md sprint context e BACKLOG.md. Il finding P1-4 resta aperto, owner-gated.

Bump `last_verified` non eseguito (richiederebbe lettura di ~650 file per identificare
i candidati >90 gg — operazione fuori budget per questa routine settimanale; delegato
alla governance tool).

---

## Suggested next actions

| Priorità | Azione | Owner |
|----------|--------|-------|
| 🔴 P0 | Merge o close batch PR drift #3308–#3321 | master-dd |
| 🔴 P0 | Aggiornare CLAUDE.md sprint context se il lavoro riprende | master-dd |
| 🟡 P1 | Decidere su ADR-2026-07-10 (sistema-action-symmetry) — ratify o withdraw | master-dd |
| 🟡 P1 | Decidere su ADR-2026-07-14 (worldgen-data-model) — ratify o withdraw | master-dd |
| 🟡 P1 | PR #3306 (rovine_planari): merge o close | master-dd |
| 🔵 P2 | Bulk-delete branch stale (post-merge dei PR drift) | master-dd |
| 🔵 P2 | Indagare +17 governance warnings (657 totali) | governance-illuminator |
