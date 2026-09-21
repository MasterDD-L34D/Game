---
title: Drift Audit 2026-09-21
date: 2026-09-21
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-09-21
source_of_truth: false
language: it
---

# Drift Audit 2026-09-21

## TL;DR

| | |
|---|---|
| **Findings** | 9 totali — P0: 1 · P1: 2 · P2: 6 |
| **Auto-fix** | 89 handoff git mv → archive · 71 registry path + status update |
| **CI main** | 🟢 verde (ultimo run: 2026-09-14) |
| **PR** | questo branch |

> **⚠️ Meta-pattern critico (P0)**: 9 drift-audit PR aperti senza review (#3308–#3316).
> Auto-fix di 8 settimane precedenti non applicati. Raccomandazione: merge #3308 → #3316 prima di questo.

---

## Findings

### P0 — Bloccanti

| ID | Tipo | Dettaglio | Age |
|----|------|-----------|-----|
| F-01 | DRIFT_AUDIT_BACKLOG | 9 PR governance aperte senza review: #3308 (2026-07-20) … #3316 (2026-09-14). Auto-fix git mv + registry da 8 settimane precedenti ancora non in main. Pattern = audits eseguiti ma mai mergiati. | 63 giorni (oldest) |

### P1 — Alta priorità

| ID | Tipo | File / Ref | Dettaglio | Age |
|----|------|-----------|-----------|-----|
| F-02 | SPRINT_STALE | `CLAUDE.md` | Sprint context fermo a 2026-07-04. 203+ commit su main da allora (traits, ADR worldgen, governance fixes). Conteggio test stale (AI 570/570 → non verificato). | 79 giorni |
| F-03 | PR_ROT | #3306 | `fix(species): recover rovine_planari -- it was a scar, not a hole` open 69 giorni, non-draft, nessuna attività recente. | 69 giorni |

### P2 — Normale

| ID | Tipo | File / Ref | Dettaglio | Age |
|----|------|-----------|-----------|-----|
| F-04 | STALE_ADR | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | Status: `proposed`. Nessun avanzamento da authoring. | 73 giorni |
| F-05 | STALE_ADR | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | Status: `proposed`. Autored 2026-07-14, commits adr sull'ADR stessa (2026-09-14) ma status invariato. | 69 giorni |
| F-06 | HANDOFF_STALE | `docs/planning/*handoff*.md` | 89 handoff doc >45 giorni → **AUTO-FIXED** (vedi sotto). | 47–150+ giorni |
| F-07 | BRANCH_STALE | vedi tabella sotto | 695 branch >30 giorni senza PR aperta (top 10 listati). | 38–365+ giorni |
| F-08 | BACKLOG_DORMANT | BACKLOG.md | 4 ticket open, nessun commit da >45 giorni: D6 graded re-ratify · N3-ER7 flag-ON N=40 · TKT-P6 17 orphan non-combat · Build zone-defense D4. Gate = owner/N=40. | 46–51 giorni |
| F-09 | LAST_VERIFIED | `docs/governance/docs_registry.json` | 82 entry `source_of_truth:true` con `last_verified` >90 giorni (ante 2026-06-22). Nessun auto-bump fatto (richiede verifica umana). | 91–365+ giorni |

#### F-07 Branch stale — Top 10 (ordinati per data decrescente)

| Branch | Ultima commit | Note |
|--------|--------------|-------|
| `fix/docs-governance-pin-wrap` | 2026-07-14 | Squash-merged in main, branch non eliminato |
| `fix/trait-coverage-close-9` | 2026-07-14 | Squash-merged in main |
| `fix/coverage-koppen-honest-gate` | 2026-07-14 | Squash-merged in main |
| `feat/trait-species-coverage` | 2026-07-14 | Squash-merged in main |
| `fix/trait-reference-drift-v2` | 2026-07-14 | Squash-merged in main |
| `chore/retire-stale-docs-reports-qa` | 2026-07-14 | Squash-merged in main |
| `feat/r1-stubs-cognitivo` | 2026-07-14 | Squash-merged in main |
| `fix/pack-env-traits-dead-slug-v2` | 2026-07-14 | Squash-merged in main |
| `fix/pigmenti-aurorali-glossary-dazzle` | 2026-07-14 | Squash-merged in main |
| `fix/retreat-gate-m1-widening` | 2026-07-10 | Squash-merged in main |

695 branch totali >30 giorni. Bulk delete = master-dd (distruttivo).

---

## Auto-fix changelog

| # | Tipo | Dettaglio |
|---|------|-----------|
| A-01 | `git mv` handoff | 89 file `docs/planning/*handoff*.md` → `docs/archive/historical-snapshots/planning-handoffs/` |
| A-02 | Registry update | 71 entry: path aggiornato + `doc_status` → `historical_ref` |

Governance post-fix: **errors=0 warnings=516** (−16 vs pre-fix).

> **Nota**: stesso auto-fix già presente in PR #3309–#3315 (tutte aperte, non mergiati). Se mergiata prima di questo PR → merge conflict sul registry; risolvere tenendo i path aggiornati.

---

## Azioni suggerite

1. **[Urgente] Merge PR #3308–#3315** (o close con squash nell'attuale) — elimina l'accumulo di governance PR e sblocca il ciclo auto-fix.
2. **[P1] Aggiorna sprint context** in CLAUDE.md (sezione "Sprint context"): 203+ commit su main da 2026-07-04, inclusi trait-coverage, ADR worldgen, governance fixes.
3. **[P1] Review/merge o close #3306** (`fix(species): recover rovine_planari`) — 69 giorni aperta.
4. **[P2] Decide ADR-07-10 e ADR-07-14** — `proposed` da 69-73 giorni: ratifica, rigetta o parcheggia con commento.
5. **[P2] Bulk delete branch stale** — 695 branch (squash-merged); `git push origin --delete <branch>` batch oppure via GitHub UI "View branches" → delete merged.
6. **[P2] Bump last_verified** su 82 entry `source_of_truth` nel registry dopo review umana.
