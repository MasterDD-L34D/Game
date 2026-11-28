---
title: Drift Audit 2026-06-22
date: 2026-06-22
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-06-22
source_of_truth: false
language: it
---

# Drift Audit — 2026-06-22

## TL;DR

| Severità | Count | Tipo |
|----------|-------|------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 3 tipi | BRANCH_STALE (10+), DORMANT_TICKET (2), PR_ROT (1) |
| P3 | 1 | GOVERNANCE_WARN (9 unregistered_document, non-blocking) |

**Auto-fix eseguiti**: nessuno (zero last_verified >90d; zero handoff >45d per git commit date).  
**PR aperto**: questo PR — report only.

---

## Check verdi ✅

| Check | Risultato |
|-------|-----------|
| ADR proposed staleness | ✅ 0 ADR con `status: proposed` trovati (79 ADR verificati) |
| Sprint context freschezza | ✅ FRESH — ultimo aggiornamento 2026-06-21 (1gg fa) |
| CI main | ✅ GREEN — ultima run `2026-06-22T03:59:03Z` (Skiv Monitor + CI + Docs Governance, tutti success) |
| Handoff stale | ✅ 0 — tutti i 67 handoff toccati nella campagna stale Jun 2026 (commit più vecchio: 2026-06-09) |
| Governance errors | ✅ 0 errori bloccanti |

---

## Findings P2

### BRANCH_STALE (top 10, >30gg senza PR aperta)

| Branch | Età stimata | Note |
|--------|-------------|------|
| `aa01/cap-02-tracking-commit` .. `aa01/cap-15b-rest-imprint` (×13) | ~58gg (Apr 25) | Già flaggati Jun-15 audit; nessuna pulizia |
| `auto/mission-console-dist-2026-05-10-1919` | ~43gg (May 10) | Auto-dist, già in Jun-15 audit |
| `chore/npm-audit-fix-2026-05-10` | ~43gg (May 10) | Già in Jun-15 audit |
| `chore/trait-orphan-delete-batch-c-2026-05-10` | ~43gg (May 10) | Già in Jun-15 audit |
| `chore/weekly-drift-audit-2026-05-18` | ~35gg (May 18) | Report precedente; nessun open PR |
| `chore/d3-d5-archive-and-tkt-close` | ~35gg+ | Già in Jun-15 audit |
| `chore/stato-arte-drift-fixes-disco-aiwar` | ~35gg+ | Già in Jun-15 audit |
| `claude/m1-closure-coop-playtest-runbook-2026-05-18` | ~35gg (May 18) | Claude branch chiuso |
| `chore/backlog-sync-trait-orphan-progress` | >30gg | Nessun open PR |
| `chore/qa-reports-sync-post-2195` | >30gg | Nessun open PR |

> **Nota**: tutti i `aa01/*` (×13) contano come 1 gruppo nell'elenco sopra. Oltre 20 branch `codex/*` da verificare separatamente — escluse dal top-10.
>
> **Non auto-fix**: branch delete richiede master-dd.

### DORMANT_TICKET (>30gg, nessun commit ref)

| Ticket | Desc | Età stima | Blocco |
|--------|------|-----------|--------|
| TKT-P6-TRAIT-ORPHAN-DESIGN-B | 14 B-defer traits — design call | ~43gg (già in Jun-15 audit) | design-gated master-dd |
| TKT-P6-TRAIT-MECHANICS-SYNC | Add subset A-class traits a `trait_mechanics.yaml` | ~43gg (già in Jun-15 audit) | pre-balance-gated |

> Entrambi persistenti dall'audit precedente senza progresso. Non auto-fixable.

### PR_ROT (updatedAt >7gg)

| PR | Titolo | Ultimo update | Nota |
|----|--------|---------------|------|
| [#2765](https://github.com/MasterDD-L34D/Game/pull/2765) | `chore(governance): weekly drift audit 2026-06-15` | 2026-06-15 (7gg fa) | Draft open, non mergiato — report precedente giacente |

> **Azione consigliata**: mergiare o chiudere #2765 (report Jun-15 ormai superseded da questo audit).

---

## Findings P3

### GOVERNANCE_WARN (9 unregistered_document, non-blocking)

Documenti con frontmatter `doc_status` assenti dal registry — tutti creati a giugno 2026 post-stale-campaign:

| File |
|------|
| `docs/ops/2026-06-20-prod-backend-task-resilience.md` |
| `docs/planning/2026-06-18-session-handoff.md` |
| `docs/planning/2026-06-18-taxonomy-reconciliation-plan.md` |
| `docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md` |
| `docs/planning/2026-06-20-session-handoff.md` |
| `docs/playtest/2026-06-19-pe-ratio-experiment-n100.md` |
| `docs/reports/2026-06-18-session-audit.md` |
| `docs/reports/2026-06-19-spec-k-01-device-authority-surface-audit.md` |
| `docs/superpowers/specs/2026-06-18-composite-pe-ratio-experiment-design.md` |

> Non auto-fix (la regola vieta aggiunta frontmatter automatica). Registra manualmente in `docs_registry.json` oppure aspetta il prossimo batch governance.

---

## Auto-fix changelog

**Nessun auto-fix eseguito** in questo ciclo:
- `last_verified >90d`: 0 doc trovati → nulla da fare.
- Handoff `>45d`: 0 file — tutti toccati dalla campagna stale (ultimo git-commit ≥ 2026-06-09).
- Registry path typo: nessuno rilevato.

---

## Suggested next actions

| Priorità | Azione | Owner |
|----------|--------|-------|
| P2 | Chiudere/mergiare #2765 (report Jun-15 superseded) | master-dd |
| P2 | Decidere destino `aa01/*` (×13, ~58gg) — delete o reuse? Verdetto PlayerRunTelemetry ancora open | master-dd |
| P2 | Delete `auto/mc-dist-05-10`, `chore/*-05-10`, `chore/drift-audit-05-18`, `claude/m1-*-05-18` (>35gg, closed work) | master-dd / Claude auto |
| P2 | Sbloccare TKT-P6-TRAIT-ORPHAN-DESIGN-B + TKT-P6-TRAIT-MECHANICS-SYNC (design call pendente) | master-dd |
| P3 | Registrare 9 doc giugno in `docs_registry.json` (prossimo governance batch) | Claude |
