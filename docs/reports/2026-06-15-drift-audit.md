---
title: Drift Audit 2026-06-15
date: 2026-06-15
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-06-15
source_of_truth: false
language: it
---

# Drift Audit 2026-06-15

## TL;DR

| Categoria         | Conteggio | Severità |
| ----------------- | --------- | -------- |
| BRANCH_STALE      | 10+       | P2       |
| DORMANT_TICKET    | 2         | P2       |
| STALE_ADR         | 0         | —        |
| STALE_TICKET      | 0         | —        |
| HANDOFF_STALE     | 0         | —        |
| PR_ROT            | 0         | —        |
| SPRINT_STALE      | 0         | —        |
| CI_RED            | 0         | —        |
| governance_warn   | 349       | P3 (già tracciato) |

**P0**: 0 · **P1**: 0 · **P2**: 12 · **P3**: 349 (batch-3 esistente)

Auto-fix eseguiti: **0** (nessun item trivialmente auto-fixable trovato).

PR report: _vedi footer_

---

## Findings P2

### 7. BRANCH_STALE — branch remoti orfani >30 giorni senza PR aperta

| Branch | Ultimo commit | Età (gg) | PR aperta? |
| ------ | ------------- | --------- | ---------- |
| `aa01/cap-02-tracking-commit` | 2026-04-25 | 51 | No |
| `aa01/cap-03-readme-pillar-sync` | ~2026-04-25 | 51 | No |
| `aa01/cap-04-changelog-create` | ~2026-04-25 | 51 | No |
| `aa01/cap-06-elevation-refactor` | ~2026-04-25 | 51 | No |
| `aa01/cap-07-terrain-reactions-wire` | ~2026-04-25 | 51 | No |
| `aa01/cap-11-biome-resolution` | ~2026-04-25 | 51 | No |
| `aa01/cap-12-player-telemetry` | ~2026-04-25 | 51 | No |
| `aa01/cap-13-imprint-mockup` | ~2026-04-25 | 51 | No |
| `chore/d3-d5-archive-and-tkt-close` | 2026-04-25 | 51 | No |
| `auto/mission-console-dist-2026-05-10-1919` | 2026-05-10 | 36 | No |

**Nota**: altri branch borderline (~36gg) non-PR: `chore/npm-audit-fix-2026-05-10`, `chore/trait-orphan-delete-batch-c-2026-05-10`. I 13 branch `aa01/*` sono intentionally preservati per potenziale reuse `PlayerRunTelemetry` (BACKLOG P3) — vedi verdetto 2026-06-07 SUPERSEDE. Non eliminare senza conferma master-dd.

**Azione suggerita**: decidere delete vs keep `aa01/*` (verdetto reuse PlayerRunTelemetry ancora open). Cleanup `auto/mission-console-dist-*` + `chore/*-2026-05-10` = sicuro (bot/merged).

### 1. DORMANT_TICKET — ticket aperti >30 giorni senza commit ref

| Ticket | Sezione BACKLOG | Aperto da | Età (gg) | Ultimo ref git |
| ------ | --------------- | --------- | --------- | -------------- |
| TKT-P6-TRAIT-ORPHAN-DESIGN-B | "Trait orphan ticket codification 2026-05-10" | 2026-05-10 | 36 | nessuno post PR #2199 |
| TKT-P6-TRAIT-MECHANICS-SYNC | "Trait orphan ticket codification 2026-05-10" | 2026-05-10 | 36 | nessuno post PR #2199 |

**Nota**: entrambi sono P3 design-gated (verdetto master-dd pendente su TKT-P6-TRAIT-ORPHAN-DESIGN-B: swarm cluster + balance + evaluator gap; TKT-P6-TRAIT-MECHANICS-SYNC = gate dipendente). Dormancy intenzionale — segnalare per visibilità, non per urgenza.

---

## Findings P3

### 3. Governance warnings

`python3 tools/check_docs_governance.py --strict` → **errors=0 warnings=349**.

Tutti 349 = `stale_document` (last_verified scaduto). Già tracciati in BACKLOG come:
- Batch-1 ✅ DONE (37 docs, PR #2611)
- Batch-2 ✅ DONE (64 docs, PR #2726/#2728) + residue tickets TKT-STALE-B2-*
- Batch-3 🟡 OPEN (~362 docs, 5 dir-batch rimanenti) — in corso progressive

**Zero auto-fix**: la policy vieta bump cieco (`last_verified`); serve currency-verify per dir-batch. Continua pattern batch progressivo esistente.

---

## Checklist audit completa

| Check | Risultato | Note |
| ----- | --------- | ---- |
| 1. BACKLOG.md drift (STALE_TICKET) | ✅ 0 STALE | PR refs in BACKLOG allineati con stato GitHub (2 open: #2743, #2759) |
| 1b. BACKLOG.md drift (DORMANT) | ⚠️ 2 DORMANT | TKT-P6-TRAIT-ORPHAN-DESIGN-B, TKT-P6-TRAIT-MECHANICS-SYNC (36gg, design-gated) |
| 2. ADR proposed staleness | ✅ 0 STALE_ADR | 72 ADR verificati, nessun `status: proposed` |
| 3. Frontmatter governance | ⚠️ 349 warnings | errors=0; già in BACKLOG batch-3 |
| 4. CLAUDE.md sprint context | ✅ FRESH | data 2026-06-14 (1gg fa); CI verde (run 2026-06-14 success) |
| 5. Handoff docs staleness | ✅ 0 HANDOFF_STALE | git history: tutti i planning/handoff.md ≥ 2026-06-02 (13gg) |
| 6. Open PR rot | ✅ 0 PR_ROT | #2743 (4gg), #2759 (1gg) — entrambi recenti |
| 7. Stale remote branches | ⚠️ 10+ BRANCH_STALE | Top 10 elencati sopra; aa01/* intentionally preserved |

---

## Auto-fix changelog

**Nessun auto-fix eseguito** in questo run.

- `last_verified` bump: 0 (richiede currency-verify per dir-batch, non blind-bump)
- `git mv` handoff: 0 (nessun handoff >45 giorni per git history)
- registry path typos: 0 (non trovati)

---

## Suggested next actions

| Priorità | Azione | Owner | Effort |
| -------- | ------ | ----- | ------ |
| P2 | Decidere destino branch `aa01/*` (13): merge `PlayerRunTelemetry` narrow reuse O delete | master-dd | ~30min |
| P2 | Delete branch `auto/mission-console-dist-2026-05-10-1919`, `chore/npm-audit-fix-2026-05-10`, `chore/trait-orphan-delete-batch-c-2026-05-10`, `chore/d3-d5-archive-and-tkt-close` | Claude | ~5min |
| P2 | Triage TKT-P6-TRAIT-ORPHAN-DESIGN-B: design-call swarm/balance/evaluator gap (14 trait) | master-dd | ~2h |
| P3 | Governance batch-3: verifica `ops+traits+balance` (~42 docs), bump current, flag drifted | Claude | ~1h/batch |

---

_Generato da: governance-illuminator — 2026-06-15_
