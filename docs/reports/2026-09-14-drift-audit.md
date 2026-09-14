---
title: Drift Audit 2026-09-14
date: 2026-09-14
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-09-14
source_of_truth: false
language: it
---

# Drift Audit — 2026-09-14

## TL;DR

| | |
|---|---|
| **Data audit** | 2026-09-14 |
| **Ultimo commit main** | 2026-07-14 (`c3013af`) — 62 giorni fa |
| **CI stato** | ✅ green (ultimo run 2026-07-14) |
| **Findings totali** | 23 (P0: 1 · P1: 4 · P2: 18) |
| **PR rimedio** | questo branch |

> ⚠️ **Segnale principale**: sviluppo fermo da 62 giorni + 8 PR draft di audit accumulate senza review. Repo in stato di conservazione, non di sviluppo attivo.

---

## Findings P0 — Critico

| ID | Tipo | Descrizione | Note |
|---|---|---|---|
| F-01 | `AUDIT_PR_ACCUMULATION` | 8 draft PR drift-audit aperte senza review: #3308–#3315 | Tutte da >7 gg, alcune da 56 gg. Systemic: l'audit gira ma nessuno chiude/fa review delle PR. Azione owner: chiudi o mergia. |

---

## Findings P1 — Alto

| ID | Tipo | Target | Età | Note |
|---|---|---|---|---|
| F-02 | `SPRINT_STALE` | CLAUDE.md sprint context | 72 giorni (ultimo entry 2026-07-04) | Soglia: >14 gg. Sprint context non aggiornato da >2 mesi. |
| F-03 | `STALE_ADR` | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | 66 giorni | `status: proposed` — soglia: >14 gg. Auto-fix vietato: owner decision. |
| F-04 | `STALE_ADR` | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | 62 giorni | `status: proposed` — soglia: >14 gg. Auto-fix vietato: owner decision. |
| F-05 | `PR_ROT` | #3306 fix/rovine-planari-recovery | 62 giorni | Non-draft, aperta 2026-07-14. Nessuna activity. Owner: review/chiudi/mergia. |

---

## Findings P2 — Medio

### PR Rot — drift audit accumulate

| PR | Titolo | Età |
|---|---|---|
| #3308 | weekly drift audit 2026-07-20 | 56 gg |
| #3309 | weekly drift audit 2026-07-27 | 49 gg |
| #3310 | weekly drift audit 2026-08-03 | 42 gg |
| #3311 | weekly drift audit 2026-08-10 | 35 gg |
| #3312 | weekly drift remediation 2026-08-17 | 28 gg |
| #3313 | weekly drift remediation 2026-08-24 | 21 gg |
| #3314 | weekly drift remediation 2026-08-31 | 14 gg |
| #3315 | weekly drift remediation 2026-09-07 | 7 gg |

> Tutte draft. Accumulate perché l'audit scheduled gira automaticamente ma non c'è un reviewer. Suggerimento: disabilita lo schedule o nomina reviewer con auto-merge L3.

### Branch Stale — top 10 (>30 gg, no open PR)

| Branch | Ultimo commit |
|---|---|
| `claude/vibrant-curie-e6ddac` | 2026-04-18 |
| `claude/zealous-bell-70e3b8` | 2026-04-18 |
| `claude/parallel-coop-disc-race-roledemands-2026-05-20` | 2026-05-20 |
| `claude/wave2-orphan-wiring` | 2026-05-30 |
| `claude/d4-ecoyaml` | 2026-05-31 |
| `claude/catalog-biome-wire` | 2026-06-01 |
| `claude/fix-aberrant-pe-earn` | 2026-06-01 |
| `claude/goal-handoff` | 2026-06-01 |
| `claude/handoff-v2` | 2026-06-01 |
| `claude/job-phasec-specs` | 2026-06-01 |

> Conteggio totale branch stale stimato: ~60+. Auto-fix vietato (branch delete). Owner: `gh api ... DELETE /branches/<name>` per cleanup manuale.

### Governance

| Metrica | Valore |
|---|---|
| Errors | 0 |
| Warnings | 342 |
| Tipo prevalente | `stale_document` (review_cycle_days scaduto) |

> Nessun auto-fix di massa per `last_verified` senza revisione reale. Batch bump richiede sessione dedicata.

---

## Auto-fix changelog

| Fix | Dettaglio | Commit |
|---|---|---|
| `HANDOFF_STALE` archivio | git mv 89 handoff docs (pre-2026-07-31) → `docs/archive/historical-snapshots/planning-handoffs-pre-2026-07-31/` | `3745ce60` |
| Registry update | 71 entry: path aggiornato + `doc_status: historical_ref` | `3745ce60` |
| Governance report | `reports/docs/governance_drift_report.json` rigenerato | `3745ce60` |

---

## Azioni suggerite

| Priorità | Azione | Owner |
|---|---|---|
| 🔴 P0 | Chiudi o mergia le 8 PR drift-audit accumulate (#3308–#3315) | master-dd |
| 🔴 P0 | Valuta sospendere scheduled audit se nessuno le revisiona | master-dd |
| 🟠 P1 | Aggiorna CLAUDE.md sprint context (ultima modifica 72 gg fa) | master-dd |
| 🟠 P1 | Decidi su ADR-2026-07-10 e ADR-2026-07-14 (accept/reject/supersede) | master-dd |
| 🟠 P1 | Revisiona o chiudi PR #3306 (fix/rovine-planari, 62 gg aperta) | master-dd |
| 🟡 P2 | Cleanup branch stale (60+ branch, audit identifica top 10) | master-dd |
| 🟡 P2 | Governance warnings 342: sessione batch bump `last_verified` | governance |
