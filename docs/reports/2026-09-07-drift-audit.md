---
title: Drift Audit 2026-09-07
date: 2026-09-07
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-09-07
source_of_truth: false
language: it
---

# Drift Audit 2026-09-07

## TL;DR

| Metrica | Valore |
|---------|--------|
| **P0** | 0 |
| **P1** | 3 |
| **P2** | 10 |
| **Auto-fix** | 89 `git mv` handoff docs |
| **PR** | questo documento |

CI main: ✅ verde (ultimo run 2026-07-14, commit `c3013af`). Governance: errors=0 warnings=300.

**Note operativa**: PR #3314 (audit 2026-08-31) ancora DRAFT/non mergiato. Le stesse 89 handoff erano già nell'auto-fix di #3314. I finding P1 (SPRINT_STALE + 2× STALE_ADR) aggravati: ora 65/59/55gg.

---

## Findings P1

| ID | Tipo | Dettaglio | Età | Azione |
|----|------|-----------|-----|--------|
| F-01 | `SPRINT_STALE` | CLAUDE.md sprint pointer fermo a 2026-07-04 | **65gg** | master-dd aggiorna pointer |
| F-02 | `STALE_ADR` | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` — Status: proposed | **59gg** | master-dd delibera: accept/reject/extend |
| F-03 | `STALE_ADR` | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` — Status: proposed | **55gg** | master-dd delibera: accept/reject/extend |

---

## Findings P2

### PR_ROT — 8 PR aperte, tutte >7gg senza attività

| PR | Titolo | Tipo | Nota |
|----|--------|------|------|
| #3306 | fix(species): recover rovine_planari | non-draft | **55gg** abbandonata; CI green; master-dd review |
| #3308 | weekly drift audit 2026-07-20 | draft | 49gg — unmerged |
| #3309 | weekly drift audit 2026-07-27 | draft | 42gg — unmerged |
| #3310 | weekly drift audit 2026-08-03 | draft | 35gg — unmerged |
| #3311 | weekly drift audit 2026-08-10 | draft | 28gg — unmerged |
| #3312 | weekly drift remediation 2026-08-17 | draft | 21gg — unmerged |
| #3313 | weekly drift remediation 2026-08-24 | draft | 14gg — unmerged |
| #3314 | weekly drift remediation 2026-08-31 | draft | 7gg — unmerged (contiene 89 handoff mv) |

**Pattern**: le PR di governance si accumulano senza merge. #3306 è non-draft e mergeable — probabilmente serve solo un secondo sguardo da master-dd.

### HANDOFF_STALE — 89 file (auto-fixed ↓)

Tutti i `docs/planning/*handoff*.md` datano da 2026-04-24 a 2026-07-04 (>45gg dalla data odierna 2026-09-07). Auto-fix: `git mv` → `docs/archive/historical-snapshots/planning-handoffs/`.

Distribuzione date:
- 2026-04-xx: ~32 file
- 2026-05-xx: ~20 file
- 2026-06-xx: ~28 file
- 2026-07-xx: ~9 file (tutti ≤ 2026-07-04)

### Governance warnings

| Metrica | Valore |
|---------|--------|
| errors | 0 |
| warnings | 300 |

Warnings in aumento (254 → 300 rispetto all'audit 2026-08-31). Nessun auto-fix applicabile (stale_document legacy, non `last_verified` bump-able).

### BACKLOG drift

BACKLOG.md contiene ticket con PR refs (#3119–#3240) tutti in sprint context fermo a 2026-07-04. Nessun item segnalato come STALE_TICKET (nessun ref esplicitamente open in BACKLOG). Items potenzialmente DORMANT: tutti i `[ ]` in sezioni post-luglio sono owner-gated, non bloccati da attività mancante.

### Branch staleness (top 10 campione)

Branch `claude/*` e `chore/*`: almeno 20 branch visibili senza PR aperta associata. Commit date non determinabili dalla clone (non fetchati). Flags conservativi:

| Branch | Candidato BRANCH_STALE |
|--------|------------------------|
| `claude/busy-fermat-4cddcb` | probabile (nome auto-gen, nessuna PR) |
| `claude/epic-satoshi-fddd3d` | probabile |
| `claude/gallant-joliot-a41916` | probabile |
| `claude/gifted-burnell-7a3466` | probabile |
| `chore/weekly-drift-audit-2026-06-01` | certa (giugno, nessuna PR) |
| `chore/weekly-drift-audit-2026-06-15` | certa |
| `chore/weekly-drift-audit-2026-07-06` | certa |
| `chore/weekly-drift-audit-2026-07-13` | certa |
| `chore/governance-non-living-stale-skip` | probabile |
| `ci/wire-tests-sim-glob` | probabile |

Azione suggerita: `git push origin --delete <branch>` per le branch drift-audit old (master-dd autorizza).

---

## Auto-fix changelog

| Commit | Azione | File |
|--------|--------|------|
| 1 | `git mv` 89 `docs/planning/*handoff*.md` → `docs/archive/historical-snapshots/planning-handoffs/` | 89 file |
| 2 | Questo report | `docs/reports/2026-09-07-drift-audit.md` |

Nessun aggiornamento registry (0 handoff docs registrati in `docs_registry.json`).

---

## Suggested next actions

1. **Master-dd** — aggiorna sprint pointer in CLAUDE.md (F-01, 65gg stale)
2. **Master-dd** — delibera 2× ADR proposed (F-02/F-03: action-symmetry + worldgen)
3. **Master-dd** — review/merge #3306 (fix species, CI green, 55gg)
4. **Master-dd** — review/merge o chiudi i 7 draft governance PR (#3308–#3314)
5. **Batch branch cleanup** — delete vecchie `chore/weekly-drift-audit-*` + `claude/*` auto-gen (autorizzazione master-dd)
6. **Governance warnings** — smaltimento `stale_document` (300 warning, batch separato)
