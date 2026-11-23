---
title: Drift Audit 2026-11-23
date: 2026-11-23
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-11-23
source_of_truth: false
language: it
---

# Drift Audit 2026-11-23

## TL;DR

| Metrica | Valore |
|---|---|
| Data audit | 2026-11-23 |
| P0 (bloccante) | 0 |
| P1 (importante) | 3 |
| P2 (advisory) | 2 |
| Auto-fix eseguiti | 40 handoff doc archiviati |
| PR remediation | vedi link in fondo |

**CI main**: verde (ultimo run 2026-11-16, success). No CI_RED.

---

## Findings P1

### 1. SPRINT_STALE — CLAUDE.md sprint pointer scaduto (142 gg)

| Campo | Valore |
|---|---|
| File | `CLAUDE.md` riga 187 |
| Data sprint pointer | 2026-07-04 |
| Giorni fa | 142 |
| Soglia | > 14 gg |

Sprint pointer punta a TKT-P6-AP3 (luglio 2026). Nessun commit su `main` dopo `2026-07-14`. Il progetto è in stasi operativa. Non auto-fixabile (requires master-dd).

---

### 2. STALE_ADR — 2 ADR in stato PROPOSED > 14 gg

| ADR | Data proposta | Giorni fa | Decider |
|---|---|---|---|
| `ADR-2026-07-10-sistema-action-symmetry.md` | 2026-07-10 | ~136 | master-dd |
| `ADR-2026-07-14-worldgen-data-model.md` | 2026-07-14 | ~132 | master-dd |

Entrambi bloccano lavoro di contenuto (species/biomi). Non auto-fixabili (status = decisione owner).

---

### 3. PR_ROT — 20 PR open tutte > 7 gg

| # | Titolo | Ultima attività |
|---|---|---|
| #3325 | chore(governance): weekly drift remediation 2026-11-16 | 2026-11-16 |
| #3324 | chore(governance): weekly drift remediation 2026-11-09 | 2026-11-09 |
| #3323 | chore(governance): weekly drift audit 2026-11-02 | 2026-11-02 |
| #3322 | chore(governance): weekly drift remediation 2026-10-26 | 2026-10-26 |
| #3321 | chore(governance): weekly drift audit 2026-10-19 | 2026-10-19 |
| #3320 | chore(governance): weekly drift audit 2026-10-12 | 2026-10-12 |
| #3319 | chore(governance): weekly drift remediation 2026-10-05 | 2026-10-05 |
| #3318 | chore(governance): weekly drift remediation 2026-09-28 | 2026-09-28 |
| #3317 | chore(governance): weekly drift remediation 2026-09-21 | 2026-09-21 |
| #3316 | chore(governance): weekly drift remediation 2026-09-14 | 2026-09-14 |
| #3315 | chore(governance): weekly drift remediation 2026-09-07 | 2026-09-07 |
| #3314 | chore(governance): weekly drift remediation 2026-08-31 | 2026-08-31 |
| #3313 | chore(governance): weekly drift remediation 2026-08-24 | 2026-08-24 |
| #3312 | chore(governance): weekly drift remediation 2026-08-17 | 2026-08-17 |
| #3311 | chore(governance): weekly drift audit 2026-08-10 | 2026-08-10 |
| #3310 | chore(governance): weekly drift audit 2026-08-03 | 2026-08-03 |
| #3309 | chore(governance): weekly drift audit 2026-07-27 | 2026-07-27 |
| #3308 | chore(governance): weekly drift audit 2026-07-20 | 2026-07-20 |
| #3306 | fix(species): recover rovine_planari | 2026-07-14 |

**Root cause**: 18 drift-audit PR accumulate senza merge. Il routine produce PR draft ogni settimana ma nessuno le chiude. `#3306` è una PR di contenuto reale (specie + ADR addendum) ferma da 4 mesi — richiede review master-dd.

Non auto-fixabili (merge / close = owner decision).

---

## Findings P2

### 4. HANDOFF_STALE — 40 handoff doc > 45 gg in `docs/planning/` (AUTO-FIX ✅)

Tutti i file con data 2026-06-xx / 2026-07-xx in `docs/planning/`. Archiviati in questa PR in `docs/archive/historical-snapshots/documents/`.

<details>
<summary>Lista 40 file (clicca per espandere)</summary>

```
docs/planning/2026-06-01-goal-coordinator-session-handoff.md
docs/planning/2026-06-01-master-goal-handoff.md
docs/planning/2026-06-02-full-loop-build-handoff.md
docs/planning/2026-06-02-full-loop-fase2-handoff.md
docs/planning/2026-06-02-goal-master-session-handoff.md
docs/planning/2026-06-02-h2-economy-handoff.md
docs/planning/2026-06-04-option-c-handoff.md
docs/planning/2026-06-04-session-handoff-optionc-flip.md
docs/planning/2026-06-09-lenovo-handoff-item2-item3.md
docs/planning/2026-06-09-maintenance-hygiene-handoff.md
docs/planning/2026-06-09-reconstruction-residuals-closure-handoff.md
docs/planning/2026-06-10-mega-session-closure-handoff.md
docs/planning/2026-06-14-issue-2746-coop-ws-closure-handoff.md
docs/planning/2026-06-16-session-handoff.md
docs/planning/2026-06-17-session-handoff-continuation.md
docs/planning/2026-06-17-session-handoff.md
docs/planning/2026-06-18-session-handoff.md
docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md
docs/planning/2026-06-20-session-handoff.md
docs/planning/2026-06-22-session-handoff.md
docs/planning/2026-06-23-derived-canon-salvage-session-handoff.md
docs/planning/2026-06-24-form-pulse-trait-v2-coverage-handoff.md
docs/planning/2026-06-29-derived-canon-reproducibility-arc-handoff.md
docs/planning/2026-06-29-session-handoff.md
docs/planning/2026-06-30-session-handoff-aa01-codex-aisim.md
docs/planning/2026-06-30-session-handoff-closeout-residuals.md
docs/planning/2026-06-30-session-handoff-lethal-flip-grilling.md
docs/planning/2026-06-30-session-handoff-tier2-infra-closeout.md
docs/planning/2026-07-01-session-handoff-fc1-tier2-o8-closeout.md
docs/planning/2026-07-01-session-handoff-grilling-value-picks-drained.md
docs/planning/2026-07-01-session-handoff-spec-f-auth-isolation.md
docs/planning/2026-07-01-session-handoff-spec-f-fc1-resync.md
docs/planning/2026-07-01-session-handoff-spec-f-import.md
docs/planning/2026-07-01-session-handoff-tkt-p6-tier1-spec-f-b4.md
docs/planning/2026-07-01-session-handoff-w5-d8-w6-close.md
docs/planning/2026-07-01-session-handoff-w5-inc123.md
docs/planning/2026-07-01-session-handoff.md
docs/planning/2026-07-02-session-handoff-w5-graded-close.md
docs/planning/2026-07-03-fase2c-grid-wiring-handoff.md
docs/planning/2026-07-04-tkt-p6-ap3-closure-handoff.md
```
</details>

---

### 5. BRANCH_STALE — ≥10 branch senza PR open, ultimo commit > 30 gg

| Branch | Stima ultima attività |
|---|---|
| `chore/weekly-drift-audit-2026-06-01` | giugno 2026 |
| `chore/weekly-drift-audit-2026-06-15` | giugno 2026 |
| `chore/weekly-drift-audit-2026-07-06` | luglio 2026 |
| `chore/weekly-drift-audit-2026-07-13` | luglio 2026 |
| `aa01/cap-02-tracking-commit` | estate 2026 |
| `aa01/cap-03-readme-pillar-sync` | estate 2026 |
| `aa01/cap-04-changelog-create` | estate 2026 |
| `aa01/cap-06-elevation-refactor` | estate 2026 |
| `aa01/cap-07-terrain-reactions-wire` | estate 2026 |
| `claude/busy-fermat-4cddcb` | estate 2026 |

Nessuna open PR associata. Non auto-fixabili (branch delete = owner decision).

---

## Auto-fix changelog

| Azione | File | Commit |
|---|---|---|
| `git mv` 40 handoff docs 2026-06/07 | `docs/planning/` → `docs/archive/historical-snapshots/documents/` | (vedi PR) |

---

## Governance check

```
errors=0 warnings=684 (tutti stale_document, cadenza review)
```

Nessun errore fatale. Nessun auto-fix governance (bump last_verified richiederebbe > 684 edit = fuori scope auto-fix triviale).

---

## Suggested next actions

| Priorità | Azione | Owner |
|---|---|---|
| P1 | **Revisione sprint**: aggiornare CLAUDE.md sprint pointer o decidere se il progetto è in pausa ufficiale | master-dd |
| P1 | **ADR #3306**: revisione + merge/close PR rovine_planari | master-dd |
| P1 | **ADR propose→active/reject**: ADR-2026-07-10, ADR-2026-07-14 | master-dd |
| P1 | **PR accumulo drift**: close/merge #3308–#3325 (18 PR drift arretrate) | master-dd |
| P2 | **Branch cleanup**: delete 10+ stale branch senza PR | master-dd |
| P2 | **Governance warnings**: 684 stale_document — se progetto riparte, run bump-last-verified batch | governance-illuminator |
