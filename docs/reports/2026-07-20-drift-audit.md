---
title: Drift Audit 2026-07-20
date: 2026-07-20
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-07-20
source_of_truth: false
language: it
---

# Drift Audit 2026-07-20

**Generato**: governance-illuminator (scheduled)
**Base**: `origin/main` @ `c3013af` (2026-07-14)
**CI ultima run**: ✅ success `2026-07-14T20:28:17Z`

---

## TL;DR

| Metrica | Valore |
|---|---|
| **P0 (bloccante)** | 0 |
| **P1 (importante)** | 1 |
| **P2 (notevole)** | 5 categorie |
| Auto-fix eseguiti | 0 |
| PR remediazione | ❌ no auto-fix → solo report |

**PR questo audit**: questa stessa PR.

Unico P1 = SPRINT_STALE (sprint pointer 16 giorni vecchio, 2026-07-04; lavoro reale avvenuto: ADR-2026-07-10, ADR-2026-07-14, PR #3306 in corso). Update manuale master-dd.

---

## P0 — Bloccanti

*Nessuno.*

---

## P1 — Importanti

### SPRINT_STALE

| Campo | Valore |
|---|---|
| File | `CLAUDE.md` § "Sprint context" |
| Ultima data sprint | 2026-07-04 |
| Giorni fa | 16 (soglia: >14) |
| PR aperta | #3306 (`fix/rovine-planari-recovery`, 2026-07-14) |
| ADR recenti | ADR-2026-07-10, ADR-2026-07-14 |

**Azione**: aggiornare blocco "Sprint context" in `CLAUDE.md` con summary del lavoro 2026-07-10..2026-07-20. Owner: master-dd (manuale, NON auto-fix).

---

## P2 — Notevoli

### 1. BRANCH_STALE — 10 branch >30 giorni senza PR aperta

Unica PR aperta: #3306 (`fix/rovine-planari-recovery`, 2026-07-14).

| Branch | Ultimo commit | Giorni |
|---|---|---|
| `codex/allineare-file-di-inventario-tratti` | 2025-11-03 | ~259 |
| `chore/backlog-sync-trait-orphan-progress` | 2026-05-10 | 71 |
| `auto/mission-console-dist-2026-05-10-1919` | 2026-05-10 | 71 |
| `claude/wave2-orphan-wiring` | 2026-05-30 | 51 |
| `claude/phasec-symbiont` | 2026-06-01 | 49 |
| `chore/weekly-drift-audit-2026-06-01` | 2026-06-01 | 49 |
| `claude/worldgen-gapc-fase2-impl` | 2026-06-02 | 48 |
| `auto/mission-console-dist-2026-06-09-2033` | 2026-06-11 | 39 |
| `chore/weekly-drift-audit-2026-06-15` | 2026-06-15 | 35 |
| `chore/ecosystem-roster-parity-ghosts` | 2026-06-18 | 32 |

**Nota**: branch `aa01/cap-*` (13) esclusi — preservati intenzionalmente per reconciliation (BACKLOG.md).
**Azione**: master-dd review → `git push origin --delete <branch>` per i confirmed-merged.

---

### 2. GOVERNANCE_STALE — 72 stale_document

`python3 tools/check_docs_governance.py --strict` → `errors=0 warnings=77` (72 stale, 4 unregistered, 1 mismatch).

Documenti più scaduti (overdue > 10 giorni):

| Overdue | Path |
|---|---|
| 16 giorni | `docs/planning/2026-06-20-session-handoff.md` |
| 14 giorni | `CHANGELOG.md` |
| 10 giorni | `docs/process/web_handoff.md` |
| 10 giorni | `docs/process/trait_review.md` |
| 10 giorni | `docs/process/training/trait_style_session.md` |
| 10 giorni | `docs/process/ticket-2025-10-27-playwright-deploy-checks.md` |
| 10 giorni | `docs/process/sprint-2026-04-25-parallel-validation.md` |
| 10 giorni | `docs/process/sprint-2026-04-24-playtest-prep.md` |
| 10 giorni | `docs/process/sentience_rollout_plan.md` |
| 10 giorni | `docs/process/qa_hud.md` |

Distribuzione per workstream:

| Workstream | Doc stale |
|---|---|
| docs/process | 27 |
| docs/pipelines | 19 |
| docs/planning | 9 |
| docs/playtest | 4 |
| docs/guide | 3 |
| altro | 10 |

**Auto-bump**: 0 documenti >90 giorni scaduti → nessun auto-fix possibile.
**Azione**: batch bump `last_verified` (vedi campagna precedente; metodo `docs/guide/docs-governance-stale-lifecycle.md`).

---

### 3. GOVERNANCE_UNREGISTERED — 4 nuovi doc fuori registry

| Path | Note |
|---|---|
| `docs/ops/backend-components-inventory.md` | nuovo |
| `docs/planning/2026-07-14-r1-trait-stub-authoring-istruttoria.md` | post-#3306 |
| `docs/planning/2026-07-14-r1-v2-trait-stub-authoring-corrected.md` | post-#3306 |
| `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` | post-sprint |

**Auto-fix**: NON eseguito (policy: mai aggiungere frontmatter automaticamente).
**Azione**: registrare in `docs/governance/docs_registry.json` + aggiungere frontmatter completo. Priorità: post-merge #3306.

---

### 4. GOVERNANCE_MISMATCH — 1 frontmatter/registry mismatch

| File | Problema |
|---|---|
| `docs/adr/ADR-2026-04-16-session-engine-round-migration.md` | `frontmatter_registry_mismatch` |

**Azione**: allineare frontmatter e registry (check `doc_status` vs `status` nei campi).

---

### 5. DORMANT_TICKETS — Famiglie TKT-STALE-B2/B3/B4 (>43 giorni, nessun commit)

Aperti in BACKLOG.md dal 2026-06-07, nessuna attività recente:

| Famiglia | Ticket | Giorni aperti |
|---|---|---|
| B2 | TKT-STALE-B2-SPECIESYAML, REORG-PATHS, CI-DRIFT, DEAD-PROCESS | 43 |
| B3 | TKT-STALE-B3-EDITOR-PIVOT, REORG-PATHS, STALE-COUNTS, DEPLOY-RENDER, CI-CONFIG-DRIFT, RULES-ENGINE | 43 |
| B4 | TKT-STALE-B4-WEB-PIVOT, SPECIESYAML | 43 |

**Nota**: ticket owner-gated (rewrite/retire = decisione master-dd). Flag per consapevolezza, non bloccanti.
**Azione**: triage prossimo sprint — retire o assegnare a batch bump/rewrite.

---

## Auto-fix changelog

*Nessun auto-fix eseguito.*

Condizioni verificate:
- `last_verified` >90 giorni: **0 doc** → no bump
- Handoff mtime >45 giorni: **0 file** (tutti toccati in bulk commit 2026-07-10) → no git mv
- Typo path registry: non rilevati

---

## Stato check-list

| Check | Risultato |
|---|---|
| BACKLOG drift | 0 STALE_TICKET; TKT-STALE-B2/B3/B4 = DORMANT (P2) |
| ADR proposed staleness | 0 STALE_ADR (ADR-07-10: 10gg, ADR-07-14: 6gg, entrambi <14gg) |
| Frontmatter governance | errors=0 / warnings=77 (72 stale, 4 unreg, 1 mismatch) |
| Sprint context | SPRINT_STALE — 2026-07-04, 16 giorni (P1) |
| CI status | ✅ success (ultima run 2026-07-14, 5 run consecutive green) |
| Handoff docs | 0 HANDOFF_STALE (mtime <45gg per tutti) |
| Open PR rot | 0 PR_ROT (unica PR #3306: aggiornata 2026-07-14, 6 giorni fa) |
| Stale branches | 10 BRANCH_STALE (top 10 listati sopra) |

---

## Azioni raccomandate (priorità)

1. **[owner, P1]** `CLAUDE.md` — aggiorna sprint context pointer a 2026-07-20 con summary lavoro recente.
2. **[owner, P2]** Branch cleanup — `git push origin --delete` per i 10 branch stale (skip `aa01/cap-*`).
3. **[governance batch, P2]** Registra 4 doc unregistered in `docs_registry.json` + frontmatter.
4. **[governance batch, P2]** Bump `last_verified` docs/process (27 doc) + docs/pipelines (19 doc) — prossimo batch stale.
5. **[ADR fix, P2]** Allinea `ADR-2026-04-16-session-engine-round-migration.md` (mismatch frontmatter/registry).
6. **[triage, P2]** TKT-STALE-B2/B3/B4 — decide retire vs assign nel prossimo sprint.
