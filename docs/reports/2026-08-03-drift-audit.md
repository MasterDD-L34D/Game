---
title: Drift Audit 2026-08-03
date: '2026-08-03'
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: '2026-08-03'
source_of_truth: false
language: it
review_cycle_days: 365
---

# Drift Audit — 2026-08-03

## TL;DR

| Metrica | Valore |
|---|---|
| Data audit | 2026-08-03 |
| Commit base main | `c3013af` (2026-07-14) |
| CI main | ✅ green |
| Finding P1 | 1 |
| Finding P2 | 7 |
| Auto-fix eseguiti | 0 |
| PR remediation | — (no item auto-fixabile) |
| PR report | [aperta dopo commit] |

---

## Findings P1

### P1-01 — SPRINT_STALE

| Campo | Valore |
|---|---|
| Categoria | SPRINT_STALE |
| File | `CLAUDE.md` §Sprint context |
| Sprint pointer | 2026-07-04 (`TKT-P6-AP3 CHIUSO`) |
| Giorni stale | **30 gg** (soglia 14 gg) |
| Precedenza | Flaggato anche in #3309 (27/07) e #3308 (20/07) — persistente 3 settimane |

**Azione**: aggiornare sprint context CLAUDE.md con summary attività 2026-07-04..2026-08-03.

---

## Findings P2

### P2-01 — PR_ROT (×3 open PR)

| # | Titolo | Età | Stato | Note |
|---|---|---|---|---|
| #3306 | fix(species): recover rovine_planari | **20 gg** (2026-07-14) | open, not draft | CI clean, merge-ready |
| #3308 | chore(governance): weekly drift audit 2026-07-20 | **14 gg** (2026-07-20) | draft | Prev audit non mergiato |
| #3309 | chore(governance): weekly drift audit 2026-07-27 | **7 gg** (2026-07-27) | draft | At threshold |

**Azione**: mergia o chiudi. #3306 è merge-ready (CI green, not draft). #3308 e #3309 = audit drafts abbandonati.

### P2-02 — STALE_ADR (×2)

| File | Status | last_verified | Età |
|---|---|---|---|
| `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | proposed | 2026-07-10 | **24 gg** (soglia 14 gg) |
| `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | proposed | 2026-07-14 | **20 gg** (soglia 14 gg) |

Nota: ADR-2026-07-10 era già flaggata in #3309. ADR-2026-07-14 è nuova questa settimana.  
**Azione owner**: promuovi `proposed → accepted/active` o documenta lo stallo nel frontmatter.

### P2-03 — GOVERNANCE_STALE

| Tipo | Conteggio |
|---|---|
| `stale_document` | 198 |
| `unregistered_document` | 4 |
| `frontmatter_registry_mismatch` | 1 |
| **Totale warnings** | **203** |

Trend: 72 (2026-07-20) → 188 (2026-07-27) → **203** (oggi, +15).

**Documenti unregistered** (presenti sin dalla scorsa settimana, non auto-fixabili):

| Path |
|---|
| `docs/ops/backend-components-inventory.md` |
| `docs/planning/2026-07-14-r1-trait-stub-authoring-istruttoria.md` |
| `docs/planning/2026-07-14-r1-v2-trait-stub-authoring-corrected.md` |
| `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` |

**Mismatch**:

| Path | Frontmatter `last_verified` | Registry `last_verified` |
|---|---|---|
| `docs/adr/ADR-2026-04-16-session-engine-round-migration.md` | 2026-07-05 | 2026-06-06 |

**Azione**: registra i 4 doc unregistered in `docs_registry.json` (+frontmatter); allinea mismatch ADR-04-16.  
Nota: stale_document 198 = `review_cycle_days` scaduti. No auto-bump (nessun doc ha `last_verified < 2026-05-04`).

### P2-04 — BRANCH_STALE

≥190 branch `claude/`/`chore/`/`feat/`/`fix/` senza PR aperta e last commit >30 gg (da audit precedente #3309).  
Top 10 candidati alla pulizia (branch più vecchi per nome):

| Branch | Età stimata |
|---|---|
| `auto/mission-console-dist-2026-05-10-1919` | ~85 gg |
| `chore/weekly-drift-audit-2026-06-01` | ~63 gg |
| `auto/mission-console-dist-2026-06-09-2033` | ~55 gg |
| `chore/session-rituals-2026-06-08` | ~56 gg |
| `chore/weekly-drift-audit-2026-06-15` | ~49 gg |
| `biome/badlands-ptpf-it` | >30 gg |
| `canon/orphan-biomes-map` | >30 gg |
| `chore/d3-d5-archive-and-tkt-close` | >30 gg |
| `chore/fix-failing-cron-workflows` | >30 gg |
| `chore/qa-reports-sync-post-2195` | >30 gg |

**Azione**: `git push origin --delete <branch>` per i branch cleaned (o UI GitHub). Non auto-eseguito.

### P2-05 — DORMANT_TICKETS

Ticket nel BACKLOG senza attività commit >30 gg e mai chiusi:

| Ticket | Descrizione | Età stimata |
|---|---|---|
| "Phase B trigger 2/3 master-dd action" | Window 2026-05-14 scaduta | ~81 gg |
| "Skiv Monitor fix Option A" | OD-019, no activity | >90 gg |
| TKT-10 harness retry+resume | #1551, parziale, no update | >60 gg |
| "Master orchestrator decision" | Deferred a sessione successiva | >60 gg |

**Azione owner**: verifica se ancora rilevanti → chiudi, defer o assegna sprint.

---

## Auto-fix changelog

Nessun auto-fix eseguito.

| Tipo | Trovati | Azione |
|---|---|---|
| `last_verified` >90 gg | 0 | — nessuno |
| Handoff mtime >45 gg | 0 (clone 2026-07-27) | — nessuno |
| Registry path typo | 0 | — nessuno |

---

## Suggested next actions

| Priorità | Owner | Azione |
|---|---|---|
| **P1** | master-dd | Aggiorna CLAUDE.md sprint context (puntatore = 2026-07-04, 30gg stale) |
| P2 | master-dd | Mergia #3306 (rovine_planari, CI green, not draft, 20gg) |
| P2 | master-dd | Chiudi #3308 e #3309 (draft audit prev non mergiati) |
| P2 | master-dd | ADR-2026-07-10 + ADR-2026-07-14: promuovi `proposed` → `accepted` o stallo-doc |
| P2 | governance | Registra 4 doc unregistered in `docs_registry.json` + allinea mismatch ADR-04-16 |
| P2 | governance | `stale_document` trend +15/settimana: alza `review_cycle_days` su docs/process (7→90) |
| P2 | master-dd | Branch cleanup top-10 stale (≥85 gg) |
| P2 | master-dd | Triage DORMANT tickets (Phase B / Skiv Monitor / TKT-10) |

---

## Checklist completa

| Check | Risultato |
|---|---|
| BACKLOG drift | 0 STALE_TICKET; 4 DORMANT (>30gg no attività) |
| ADR proposed staleness | ⚠️ 2 STALE_ADR (24gg / 20gg) |
| Frontmatter governance | errors=0 / warnings=203 (+15 da prev) |
| Sprint context CLAUDE.md | ⚠️ SPRINT_STALE 30gg (P1, persistente 3 audit) |
| CI status main | ✅ green (ultima run 2026-07-14, commit `c3013af`) |
| Handoff docs mtime | ✅ 0 HANDOFF_STALE (clone 2026-07-27, mtime fresh) |
| Open PR rot | ⚠️ 3 PR_ROT (#3306 20gg / #3308 14gg / #3309 7gg) |
| Stale remote branches | ⚠️ ≥190 BRANCH_STALE (top 10 listati) |
