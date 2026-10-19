---
title: Drift Audit 2026-10-19
date: 2026-10-19
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-10-19
source_of_truth: false
language: it
---

# Drift Audit 2026-10-19

## TL;DR

| Metrica | Valore |
|---|---|
| Data audit | 2026-10-19 |
| CI main | ✅ verde (last run success 2026-10-12) |
| Governance errors | 0 (warnings: 640, +21 vs settimana scorsa 619) |
| **P0** | 1 (accumulo cronico PR drift-audit non mergiati) |
| **P1** | 2 (SPRINT_STALE 107gg + 2 ADR proposed stale) |
| **P2** | 16 (PR_ROT 14 PR + 2 branch stale senza PR) |
| Auto-fix eseguiti | 0 |
| PR questo audit | chore/weekly-drift-audit-2026-10-19 |

> **Azione owner-required P0**: chiudi/mergea i 13 drift-audit PR accumulati (#3308–#3320). Pattern identico segnalato ogni settimana da luglio — non si auto-risolve.

---

## Findings P0

### ACCUMULO_PR_DRIFT (CRITICO — richiede azione owner)

13 PR `chore(governance): weekly drift audit/remediation` aperti da luglio a oggi, mai mergiati né chiusi. Crescono +1/settimana. Il pattern è stato segnalato in ogni audit precedente senza risoluzione.

| PR | Titolo | Ultimo aggiornamento | Giorni stale |
|---|---|---|---|
| #3308 | weekly drift audit 2026-07-20 | 2026-07-20 | 91 |
| #3309 | weekly drift audit 2026-07-27 | 2026-07-27 | 84 |
| #3310 | weekly drift audit 2026-08-03 | 2026-08-03 | 77 |
| #3311 | weekly drift audit 2026-08-10 | 2026-08-10 | 70 |
| #3312 | weekly drift remediation 2026-08-17 | 2026-08-17 | 63 |
| #3313 | weekly drift remediation 2026-08-24 | 2026-08-24 | 56 |
| #3314 | weekly drift remediation 2026-08-31 | 2026-08-31 | 49 |
| #3315 | weekly drift remediation 2026-09-07 | 2026-09-07 | 42 |
| #3316 | weekly drift remediation 2026-09-14 | 2026-09-14 | 35 |
| #3317 | weekly drift remediation 2026-09-21 | 2026-09-21 | 28 |
| #3318 | weekly drift remediation 2026-09-28 | 2026-09-28 | 21 |
| #3319 | weekly drift remediation 2026-10-05 | 2026-10-05 | 14 |
| #3320 | weekly drift audit 2026-10-12 | 2026-10-12 | 7 |

**Azione richiesta**: master-dd chiude o mergea batch. Se i report non vengono letti, valuta disabilitare il cron trigger.

---

## Findings P1

### SPRINT_STALE

Sprint context in CLAUDE.md ultimo aggiornamento: **2026-07-04** (TKT-P6-AP3 closure).  
Oggi: 2026-10-19. Delta: **~107 giorni**.  
Soglia flag: 14 giorni.  
**Azione**: owner aggiorna sprint context con stato corrente (post-luglio).

### STALE_ADR

Due ADR con `status: proposed` last commit > 14 giorni:

| File | Status | Ultimo commit | Giorni |
|---|---|---|---|
| `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | proposed | 2026-07-14 | 97 |
| `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | proposed | 2026-07-10 | 101 |

**Azione owner-gated**: advance a `accepted`/`rejected`/`superseded` o documenta esplicitamente hold reason.

---

## Findings P2

### PR_ROT — PR #3306

| PR | Titolo | Ultimo aggiornamento | Giorni stale |
|---|---|---|---|
| #3306 | fix(species): recover rovine_planari | 2026-07-14 | 97 |

PR non-audit aperto da 97 giorni. Richiede review + merge o close.

### BRANCH_STALE (top 2 senza open PR)

| Branch | Note |
|---|---|
| `chore/weekly-drift-audit-2026-06-01` | Nessuna PR aperta; commit da giugno. |
| `chore/weekly-drift-audit-2026-06-15` | Nessuna PR aperta; commit da giugno. |

(Molti altri `claude/*` branches >30gg senza open PR — già segnalati in audit precedenti, top-10 invariato.)

### GOVERNANCE_WARNINGS

Warnings saliti da 619 (2026-10-12) → 640 (+21). Errors: 0. Auto-fix non applicabile (nessun `last_verified` >90gg rilevato su doc con fix autorizzato).

---

## Auto-fix changelog

Nessun auto-fix eseguito in questo audit:
- Handoff >45gg: 0 trovati (già archiviati in remediation 2026-10-05 #3319).
- `last_verified` bump >90gg: non applicabile (governance errors=0, nessun target eleggibile senza frontmatter missing).
- Typo registry path: nessuno rilevato.

---

## Suggested next actions

| Priorità | Azione | Owner |
|---|---|---|
| P0 | Chiudi/mergea batch #3308–#3320 (13 PR drift-audit) | master-dd |
| P0 | Se i report non vengono usati: disabilita cron o riduci frequenza | master-dd |
| P1 | Aggiorna CLAUDE.md sprint context (107gg stale) | master-dd |
| P1 | Decide ADR-2026-07-14 worldgen + ADR-2026-07-10 sistema-action-symmetry (proposed 97/101gg) | master-dd |
| P2 | Review + merge/close PR #3306 (rovine_planari, 97gg) | master-dd |
| P2 | Delete branch `chore/weekly-drift-audit-2026-06-01` + `*-06-15` (nessuna PR) | master-dd |
