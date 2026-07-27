---
title: Drift Audit 2026-07-27
date: 2026-07-27
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-07-27
source_of_truth: false
language: it
---

# Drift Audit 2026-07-27

## TL;DR

| Severity | Count | PR |
|---|---|---|
| P1 | 1 | — |
| P2 | 9 | questo file su `chore/weekly-drift-audit-2026-07-27` |
| Auto-fix | 0 | nessun item auto-fixable trovato |

CI main: ✅ green (ultima run 2026-07-14 `success`). Sprint context: ⚠️ STALE 23gg.

**Governance**: 193 warnings totali — up da 77 la settimana scorsa (+116). Nessuna auto-bump applicabile (0 doc `last_verified` >90gg).

---

## Findings P1

| # | Tipo | Path / Ref | Dettaglio |
|---|---|---|---|
| 1 | SPRINT_STALE | `CLAUDE.md` § Sprint context | Pointer = `2026-07-04` (23gg fa, soglia >14gg). Test count non verificabile da CLAUDE.md senza CI fresh run. |

**Azione**: aggiorna il blocco "Sprint context" in `CLAUDE.md` con il summary del lavoro post 2026-07-04.

---

## Findings P2

### PR Rot

| # | PR | Titolo | Ultimo aggiornamento | Età (gg) |
|---|---|---|---|---|
| 2 | [#3306](https://github.com/MasterDD-L34D/Game/pull/3306) | fix(species): recover rovine_planari | 2026-07-14 | 13 |
| 3 | [#3308](https://github.com/MasterDD-L34D/Game/pull/3308) | chore(governance): weekly drift audit 2026-07-20 *(DRAFT)* | 2026-07-20 | 7 |

Nota: #3308 = PR drift audit precedente, mai mergiata/chiusa. Stale artifact.

### ADR Stale

| # | File | Status | Età (gg) |
|---|---|---|---|
| 4 | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | proposed | 17 (soglia >14) |

ADR-2026-07-14-worldgen-data-model.md: 13gg — sotto soglia, non flaggato.

### Governance — Stale Documents

| # | Tipo | Dettaglio |
|---|---|---|
| 5 | GOVERNANCE_STALE | **188 stale_document** (da 72 settimana scorsa, +116). Max overdue: 23gg (`docs/planning/2026-06-20-session-handoff.md`). Nessuno >90gg → nessuna auto-bump. |

Top 10 più scaduti:

| Path | Scaduto (gg fa) |
|---|---|
| `docs/planning/2026-06-20-session-handoff.md` | 23 |
| `CHANGELOG.md` | 21 |
| `docs/process/web_handoff.md` | 17 |
| `docs/process/trait_review.md` | 17 |
| `docs/process/training/trait_style_session.md` | 17 |
| `docs/process/ticket-2025-10-27-playwright-deploy-checks.md` | 17 |
| `docs/process/sprint-2026-04-25-parallel-validation.md` | 17 |
| `docs/process/sprint-2026-04-24-playtest-prep.md` | 17 |
| `docs/process/sentience_rollout_plan.md` | 17 |
| `docs/process/qa_hud.md` | 17 |

### Governance — Unregistered / Mismatch

| # | Tipo | Path |
|---|---|---|
| 6 | GOVERNANCE_UNREGISTERED | `docs/ops/backend-components-inventory.md` |
| 6 | GOVERNANCE_UNREGISTERED | `docs/planning/2026-07-14-r1-trait-stub-authoring-istruttoria.md` |
| 6 | GOVERNANCE_UNREGISTERED | `docs/planning/2026-07-14-r1-v2-trait-stub-authoring-corrected.md` |
| 6 | GOVERNANCE_UNREGISTERED | `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` |
| 7 | GOVERNANCE_MISMATCH | `docs/adr/ADR-2026-04-16-session-engine-round-migration.md` — frontmatter `last_verified: 2026-07-05`, registry: `2026-06-06` |

### Handoff Stale

| # | Totale | >=90d | 60-89d | 45-59d |
|---|---|---|---|---|
| 8 | **61 handoff** >45gg (data filename) | 26 | 22 | 13 |

Oldest: `docs/planning/2026-04-24-session-handoff-compact.md` (94gg).  
>5 findings → report only, no auto-mv.  
Molti file referenziati in CLAUDE.md sprint context — git mv richiede verifica link.

Campione top 5:

| File | Età (gg) |
|---|---|
| `docs/planning/2026-04-24-session-handoff-compact.md` | 94 |
| `docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md` | 93 |
| `docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md` | 93 |
| `docs/planning/2026-04-25-museum-session-handoff.md` | 93 |
| `docs/planning/2026-04-25-illuminator-orchestra-handoff.md` | 93 |

### Branch Stale

| # | Tipo | Dettaglio |
|---|---|---|
| 9 | BRANCH_STALE | **190 branch** claude/feat/fix/chore >30gg senza PR aperta |

Top 10 (claude/feat/fix per spec; no open PR verificato):

| Branch | Età (gg) |
|---|---|
| `feature/evo-tactics-v2.0.1` | 275 |
| `feat/et-alignment-scanner` | 274 |
| `feature/tri-sorgente-docs-v1` | 269 |
| `feat/wire-g-h-step1` | 100 |
| `claude/zealous-bell-70e3b8` | 100 |
| `claude/vibrant-curie-e6ddac` | 100 |
| `feat/play-sprint-a-p0-wave8n-ap-budget-pending` | 99 |
| `feat/play-sprint-a-p0-wave8k-multi-intent-timer-off` | 99 |
| `feat/play-sprint-a-p0-wave8f-sidebar-clarity` | 99 |
| `feat/play-sprint-a-p0-wave8-visual-base-typo-icons` | 99 |

### Dormant Tickets

| # | Ticket | Stato | Dettaglio |
|---|---|---|---|
| 10 | TKT-STALE-B2/B3/B4/B5/B7/B8/B9 series | DORMANT | Open in BACKLOG.md >30gg, nessun commit recente. ~50+ sub-ticket doc-cleanup owner-gated. |
| 10 | TKT-KEEPER-CONTENT-DEBT | DORMANT | P2 disclosure, no ETA, ~138/173 trait solo-keeper |
| 10 | TKT-KEEPER-VALIDATOR-SCOPE | DORMANT | P3, open senza attività recente |

---

## Auto-fix changelog

Nessun auto-fix eseguito.

| Tipo | Trovati | Azione |
|---|---|---|
| `last_verified` >90d | 0 | — nessuno |
| handoff >45d via git mv | 61 | Report only (>5 findings, reference link risk) |
| registry path typo | 0 | — nessuno |

---

## Checklist completa

| Check | Risultato |
|---|---|
| 1. BACKLOG drift | 0 STALE_TICKET (PRs refs verificate). DORMANT: TKT-STALE-B* + keeper series (>30gg no attività) |
| 2. ADR proposed staleness | **1 STALE_ADR**: ADR-2026-07-10 (17gg, >14) |
| 3. Frontmatter governance | errors=0, warnings=193 (188 stale, 4 unregistered, 1 mismatch). 0 auto-bump. |
| 4. Sprint context | ⚠️ **SPRINT_STALE** P1: 2026-07-04 (23gg). CI main: ✅ green (2026-07-14). |
| 5. Handoff docs | **61 HANDOFF_STALE** (filename date >45gg). >5 → report only. |
| 6. Open PR rot | **2 PR_ROT**: #3306 (13gg) + #3308 draft (7gg, precedente audit non chiuso) |
| 7. Stale branches | **190 BRANCH_STALE** (claude/feat/fix >30gg); top 10 sopra. 541 totale repo-wide. |

---

## Suggested next actions

| Priorità | Azione | Responsabile |
|---|---|---|
| P1 | Aggiorna `CLAUDE.md` sprint context → summary 2026-07-04..2026-07-27 | master-dd |
| P2 | Chiudi o mergia #3306 (rovine_planari recovery, CI green) | master-dd |
| P2 | Chiudi #3308 (drift audit precedente, draft abbandonato) | master-dd / automation |
| P2 | ADR-2026-07-10: promuovi `proposed` → `accepted` o `draft` con rationale | master-dd |
| P2 | Registra 4 doc unregistered in `docs_registry.json` (+frontmatter review_cycle_days) | governance batch |
| P2 | Allinea mismatch ADR-2026-04-16 (`last_verified` frontmatter vs registry) | governance batch |
| P2 | Governance stale +116: bump `review_cycle_days` per docs process/* a 90gg (ora 7/14gg) per ridurre rumore | master-dd |
| P2 | git mv batch 26 handoff >=90gg → `docs/archive/historical-snapshots/` (evita link in CLAUDE.md sprint context) | prossima sessione |
| P2 | Branch cleanup: delete o PR top-10 stale (ex `feature/evo-tactics-v2.0.1`) | master-dd |
| P2 | Triage TKT-STALE-B* series: close/retire o assign sprint slot | master-dd |
