---
title: Drift Audit 2026-05-11
date: 2026-05-11
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-05-11
source_of_truth: false
language: it
---

# Drift Audit — 2026-05-11

## TL;DR

| Categoria | Trovati | Severità | Auto-fix |
|-----------|---------|----------|----------|
| BRANCH_STALE | **232** (top 10 riportati) | P1 | ❌ (vietato per policy) |
| GOVERNANCE_WARN | **8** | P2 | ❌ (nessun last_verified >90d) |
| STALE_TICKET | 0 | — | n/a |
| STALE_ADR | 0 | — | n/a |
| SPRINT_STALE | 0 | — | n/a |
| HANDOFF_STALE | 0 | — | n/a |
| PR_ROT | 0 | — | n/a |
| CI_RED | 0 | — | n/a |

**Totale**: 240 finding (232 branch + 8 governance). Auto-fix applicati: **0**. PR report-only.

---

## Findings P1 — BRANCH_STALE

**232 branch remoti** con ultimo commit < 2026-04-11, nessun open PR. Quasi tutti `codex/` da ottobre 2025 (~200 giorni). Top 10 oldest:

| Data ultimo commit | Branch |
|--------------------|--------|
| 2025-10-23 | `codex/create-test-interface-recap-mkomxp` |
| 2025-10-23 | `codex/fix-sync-failures-not-recorded-properly` |
| 2025-10-23 | `codex/fix-sync-failures-not-recorded-properly-4udoih` |
| 2025-10-23 | `codex/fix-yaml-fetch-paths-for-pages-deployment` |
| 2025-10-24 | `codex/add-automatic-yaml-fetch-page` |
| 2025-10-24 | `codex/create-complete-website-with-stable-url` |
| 2025-10-24 | `codex/create-sync_chatgpt.sh-script-and-integration` |
| 2025-10-24 | `codex/fix-default-data-root-directory` |
| 2025-10-24 | `codex/fix-default-dataset-path-in-roll_pack` |
| 2025-10-24 | `codex/fix-high-priority-bug-in-auto-fetch` |

> Nota: conteggio completo 232 disponibile via  
> `git for-each-ref --format='%(refname:short)|%(committerdate:format:%Y-%m-%d)' refs/remotes/origin/ | awk -F'|' '$2 < "2026-04-11"'`

**Perché P1**: accumulo branch stale degrada UX di `gh pr list`, `git branch -r`, e branch protection checks. Cleanup bulk consigliato (vedi §Azioni).

---

## Findings P2 — GOVERNANCE_WARN

Output `check_docs_governance.py --strict`: **0 errori, 8 warning**.

### stale_document (7)

| Path | Scaduto il |
|------|-----------|
| `docs/planning/2026-04-25-content-sprint-handoff.md` | 2026-05-09 |
| `docs/planning/2026-04-25-illuminator-orchestra-handoff.md` | 2026-05-09 |
| `docs/planning/2026-04-25-next-session-kickoff-m13-phase-b.md` | 2026-05-09 |
| `docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md` | 2026-05-09 |
| `docs/planning/2026-04-26-next-session-handoff-M14-C.md` | 2026-05-10 |
| `docs/planning/2026-04-26-next-session-kickoff-p4-mbti-playtest.md` | 2026-05-10 |
| `docs/process/sprint-2026-04-25-parallel-validation.md` | 2026-05-09 |

Questi doc di sessione Apr 25-26 hanno `review_by` scaduto — non sono handoff "live" (nessuno >45 giorni quindi no git mv auto). Candidati archivio nella prossima session-close ordinaria.

### frontmatter_registry_mismatch (1)

| Path | Frontmatter | Registry |
|------|-------------|----------|
| `docs/planning/2026-04-29-master-execution-plan-v3.md` | `last_verified: 2026-05-07` | `last_verified: 2026-04-30` |

Registry stale di 7 giorni vs frontmatter. Fix triviale: aggiorna `docs_registry.json` entry. Non auto-fixato (ambiguità — potrebbe essere update frontmatter non registry).

---

## Checks puliti

| Check | Risultato | Note |
|-------|-----------|------|
| STALE_TICKET | ✅ 0 | Tutti i PR# in BACKLOG marcati ✅ |
| STALE_ADR | ✅ 0 | 2 ADR proposed: ADR-2026-05-02 (9gg) + ADR-2026-05-10 (1gg) — entrambi < 14gg |
| SPRINT_STALE | ✅ 0 | Sprint context più recente: 2026-05-09 sera (2 giorni fa) |
| HANDOFF_STALE | ✅ 0 | Nessun handoff >45gg (oldest: 2026-04-24, 17 giorni) |
| PR_ROT | ✅ 0 | 5 PR open, tutti aggiornati <2 giorni fa |
| CI_RED | ✅ 0 | CI verde su main (PR #2227 references verde baseline) |
| last_verified >90d | ✅ 0 | Nessun doc da auto-bumpare |

---

## Auto-fix changelog

**Nessun auto-fix applicato.**

Criteri verificati:
- `last_verified` >90 giorni: 0 trovati → niente da bumpare
- Handoff >45 giorni: 0 trovati → niente da `git mv`
- Registry path typo: non rilevato (il mismatch è date, non path)

---

## Azioni suggerite

| Priorità | Azione | Owner | Effort |
|----------|--------|-------|--------|
| P1 | Bulk-delete 232 branch stale `codex/` (Oct 2025 — Apr 2026) via GH branch manager o `git push origin --delete <branch>` × batch | master-dd | ~15min |
| P2 | Aggiorna `docs/governance/docs_registry.json` entry `2026-04-29-master-execution-plan-v3.md` → `last_verified: 2026-05-07` | dev autonomo | ~2min |
| P2 | Archivio 7 doc di sessione Apr 25-26 stale_document → `docs/archive/historical-snapshots/` nella prossima session-close | dev autonomo | ~5min |

> **Anti-pattern da evitare**: NON auto-delete branch senza conferma master-dd. 232 branch incluono codex/ da Codex agent runs — verifica che nessuno abbia lavoro in-progress prima del bulk delete.
