---
title: Drift Audit 2026-06-08
date: 2026-06-08
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-06-08
source_of_truth: false
language: it
---

# Drift Audit — 2026-06-08

## TL;DR

| Metric | Valore |
|--------|--------|
| P0 (bloccante immediato) | 0 |
| P1 (fix obbligatorio) | 1 |
| P2 (should fix) | 3 cluster |
| Auto-fix applicati | 0 |
| PR aperta | — (nessun auto-fix; solo report) |

**Stato complessivo**: nessun P0. 1 P1 (BACKLOG active section punta a PR già merged). 3 cluster P2 (CLAUDE.md sprint stale, governance warnings, branch stale massivo). Working tree pulito, CI non monitorata in questo repo (nessun workflow run recente verificato).

---

## Findings P1

### STALE_TICKET — #2563 in BACKLOG active section

| Campo | Valore |
|-------|--------|
| File | `BACKLOG.md` §"🔵 OPEN/NEXT — Full-loop AI-playtest runner" |
| Testo | `"(1) Codex review #2563 (aspetta reset usage-limit) → merge"` |
| Stato reale | **MERGED** `2026-06-02T17:04:55Z` (squash `e4eb65a8`) |
| Severità | P1 — sezione OPEN/NEXT attiva, inganna next session |

**Azione**: aggiornare BACKLOG — segnare #2563 ✅ merged + promuovere step 2 come NEXT.

---

## Findings P2

### STALE_TICKET — Sprint context CLAUDE.md punta a PR già merged

| PR | Titolo | Stato reale | Merged at |
|----|--------|-------------|-----------|
| #2618 | SPEC-A Device Input Ledger backend | MERGED | 2026-06-08T00:07:07Z |
| #2617 | SPEC-B TV/device information contract | MERGED | 2026-06-08T00:22:06Z |
| #2619 | SPEC-C Phone WEGO combat composer | MERGED | 2026-06-08T00:29:27Z |

CLAUDE.md sprint context (v47, aggiornato oggi) recita:
`"In corso: SPEC-A Device Input Ledger (PR #2618 backend) + SPEC-B TV/device contract (PR #2617 doc) = #1/#2 della sequenza"`

Tutte e 3 merged TODAY (dopo la scrittura dello sprint context). La sezione "In corso" va aggiornata a ✅ per #2617/#2618/#2619; SPEC-D #2621 rimane OPEN.

**Azione**: aggiornare sprint context CLAUDE.md — spostare #2617/#2618/#2619 in ✅ shipped, promuovere SPEC-D #2621 come "In corso".

---

### GOVERNANCE — 251 stale_document warnings

| Campo | Valore |
|-------|--------|
| Tool | `python3 tools/check_docs_governance.py --strict` |
| Errori | 0 (CI verde) |
| Warning | 251 `stale_document` |
| Baseline precedente | 246 (BACKLOG 2026-06-07) — +5 netti |

Pre-esistente. Burn-down campaign P3 in corso (BACKLOG §"Governance stale-doc"). Nessun blind-bump eseguito (policy: verify-currency-first).

**Azione**: prossima sessione governance — batch-2 (process+pipelines, ~65 doc).

**Auto-fix non applicato**: nessun doc trovato con `last_verified < 2026-03-10` (90gg) nella lista stale verificabile automaticamente.

---

### BRANCH_STALE — 268 rami orfani (no open PR, ultimo commit ≤ 2026-05-08)

268 branch `codex/*`, `claude/*`, `chore/*`, `feat/*`, `aa01/*` con ultimo commit >30 giorni fa e nessuna PR aperta (l'unica PR open è #2621 su `docs/spec-d-cinematic-director`).

**Top 10 più vecchi** (tutti senza PR aperta):

| Branch | Ultimo commit |
|--------|--------------|
| `codex/fix-sync-failures-not-recorded-properly` | 2025-10-23 |
| `codex/fix-sync-failures-not-recorded-properly-4udoih` | 2025-10-23 |
| `codex/fix-yaml-fetch-paths-for-pages-deployment` | 2025-10-23 |
| `codex/create-test-interface-recap-mkomxp` | 2025-10-23 |
| `codex/fix-high-priority-bug-in-auto-fetch` | 2025-10-24 |
| `codex/add-automatic-yaml-fetch-page` | 2025-10-24 |
| `codex/create-sync_chatgpt.sh-script-and-integration` | 2025-10-24 |
| `codex/fix-default-dataset-path-in-roll_pack` | 2025-10-24 |
| `codex/optimize-and-integrate-code-sections` | 2025-10-24 |
| `codex/fix-high-priority-bug-in-deployment-workflow` | 2025-10-24 |

**Auto-fix non applicato**: branch delete = operazione irreversibile, fuori scope audit automatico.

**Azione**: bulk delete manuale (master-dd) via GitHub UI o `git push origin --delete <branch>` — consigliato svuotare i `codex/*` da 2025-10 (nessun valore recovery: tutti vecchi fix Codex non integrati).

---

## Findings assenti (clean)

| Check | Risultato |
|-------|-----------|
| STALE_ADR (Proposed >14gg) | 0 — nessun ADR con `status: proposed` trovato (10 ADR con status esplicito, tutti `accepted`/`superseded`) |
| SPRINT_STALE (context >14gg) | 0 — sprint context data = 2026-06-08 (oggi) |
| HANDOFF_STALE (mtime >45gg) | 0 — tutti i handoff di aprile hanno git-mtime 2026-06-02 (bulk commit #2573) |
| PR_ROT (open PR >7gg) | 0 — unica PR open #2621 creata 2026-06-08 |

---

## Auto-fix changelog

Nessun auto-fix applicato in questa sessione.

| Check | Candidati | Azione |
|-------|-----------|--------|
| last_verified bump >90gg | 0 qualificati verificabili | skip |
| handoff git mv >45gg | 0 qualificati (mtime <7gg) | skip |
| registry path typos | non rilevati | skip |

---

## Suggested next actions

| Priorità | Azione | Owner | Effort |
|----------|--------|-------|--------|
| P1 | BACKLOG: segnare #2563 ✅ merged, promuovere fase-1b-3 come NEXT | master-dd / next session | 5min |
| P2 | CLAUDE.md: aggiornare sprint context — #2617/#2618/#2619 → ✅ shipped; SPEC-D #2621 → In corso | next session | 5min |
| P2 | Branch cleanup: bulk delete `codex/*` da 2025-10-23 (268 branch totali) | master-dd | 15min GitHub UI |
| P3 | Governance burn-down batch-2: `docs/process/` + `docs/pipelines/` (~65 doc) | agent dedicato | ~2h |
