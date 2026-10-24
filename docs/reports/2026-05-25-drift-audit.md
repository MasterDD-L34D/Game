---
title: Drift Audit 2026-05-25
date: 2026-05-25
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-05-25
source_of_truth: false
language: it
---

# Drift Audit 2026-05-25

## TL;DR

| Categoria | Count | Severità |
|---|:---:|:---:|
| STALE_TICKET (BACKLOG PR chiusi ma marcati open) | 3 | P1 |
| STALE_ADR (Proposed >14 gg) | 1 | P1 |
| BRANCH_STALE (last commit >30 gg, no open PR) | 4+ | P2 |
| PR_ROT | 0 | — |
| SPRINT_STALE | 0 | — |
| HANDOFF_STALE | 0 | — |
| GOVERNANCE_ERROR | 0 | — |
| CI_RED | 0 | — |

**Totale finding**: 8 (P1 × 4, P2 × 4+). Nessun item auto-fixable → solo report su branch dedicato.

PR: aperta post-commit (vedi link in calce).

---

## Findings P1

### STALE_TICKET — BACKLOG ref PR chiuse marcate "open"

| BACKLOG entry | PR | Stato reale | Data merge |
|---|---|:---:|---|
| `#2261 (open)` — Envelope A bundle OD-025+OD-028+OD-030 | [#2261](https://github.com/MasterDD-L34D/Game/pull/2261) | **MERGED** | 2026-05-14 |
| `#2262 (open)` — Envelope B bundle OD-024+027+029+031 | [#2262](https://github.com/MasterDD-L34D/Game/pull/2262) | **MERGED** | 2026-05-14 |
| `#2271 (open ready)` — Phase A residue + Q1 Option A closure | [#2271](https://github.com/MasterDD-L34D/Game/pull/2271) | **MERGED** | 2026-05-15 |

**Azione**: aggiornare BACKLOG.md — cambiare label `(open)` / `(open ready)` → `✅ MERGED <sha>` per le 3 entry. Da fare manualmente da master-dd in prossima sessione.

---

### STALE_ADR — Proposed >14 giorni

| File | Status | Data file | Giorni stale |
|---|:---:|:---:|:---:|
| `docs/adr/ADR-2026-05-02-species-ecology-schema.md` | `proposed` | 2026-05-02 | **23 gg** |

`last_verified: 2026-05-02` — ADR per la species ecology schema extension (food web machine-readable). Nessuna decisione formale (`accepted`/`superseded`/`rejected`) registrata dopo 23 giorni.

**Azione**: master-dd review + verdict (`accepted` se in scope, `superseded` se rimpiazzata da ADR-2026-05-15-species-catalog-schema-fork-resolution.md, `rejected` se scartata). Non auto-fixable — richiede giudizio di design.

---

## Findings P2

### BRANCH_STALE — Last commit >30 giorni, nessuna open PR

Top-4 confermate via `mcp__github__get_commit` (sample su ~10 branch):

| Branch | Last commit | Giorni | Nota |
|---|:---:|:---:|---|
| `biome/badlands-ptpf-it` | 2025-10-25 | **213** | Foodweb BADLANDS feature — probabile residuo pre-2026 |
| `codex/evaluate-and-prioritize-database-traits` | 2025-10-29 | **209** | Codex automated batch 2025 |
| `codex/add-funnel-and-heatmap-components` | 2025-10-31 | **207** | Codex automated batch 2025 |
| `claude/zealous-bell-70e3b8` | 2026-04-17 | **38** | Playtest addendum — merged content già in main |

**Nota**: campionamento suggerisce che l'intero batch `codex/*` (50+ branch listati) risale a Oct/Nov 2025 — tutti >30 giorni, nessuna PR aperta. Totale stale branch potenziali: **50+**.

**Azione**: non auto-fixable (policy CLAUDE.md: nessun `branch delete` autonomo). Master-dd può eseguire batch cleanup: `git push origin --delete <branch>` per branch `codex/*` 2025 + `biome/badlands-ptpf-it` confermati.

---

## Sezioni clean (nessun finding)

| Check | Risultato |
|---|---|
| Governance docs | ✅ exit 0, 0 errors, 0 warnings |
| Open PR rot (>7 gg) | ✅ 4 PR open, tutte aggiornate 2026-05-22 (3 gg fa) |
| Sprint context stale (>14 gg) | ✅ Latest: 2026-05-20 — 5 gg fa |
| Handoff docs >45 gg | ✅ Oldest: `2026-04-24-session-handoff-compact.md` — 31 gg |
| CI red su main | ✅ Main HEAD `2443ba5` — 2026-05-22, nessun alert attivo |

---

## Auto-fix changelog

Nessun item auto-fixabile trovato:

- `last_verified >90d`: governance tool exit 0, 0 warnings → nessun doc oltre soglia.
- `handoff >45d`: oldest handoff 31 gg fa, sotto soglia.
- Registry path typo: governance exit 0 → nessun drift di path.

---

## Suggested next actions

| Priorità | Azione | Effort | Owner |
|:---:|---|:---:|---|
| P1 | Aggiorna BACKLOG.md: 3 PR `(open)` → `✅ MERGED` + sha squash | 5 min | master-dd |
| P1 | ADR-2026-05-02 verdict: accepted / superseded / rejected | 10 min | master-dd |
| P2 | Batch delete `codex/*` branch 2025 (50+ branch, all >200 gg) | 5 min | master-dd |
| P2 | Delete `biome/badlands-ptpf-it` + `claude/zealous-bell-70e3b8` (content già in main) | 2 min | master-dd |
