---
title: Drift Audit 2026-05-18
date: 2026-05-18
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-05-18
source_of_truth: false
language: it
---

# Drift Audit — 2026-05-18

## TL;DR

| Metric | Count | Severity |
|---|:---:|:---:|
| STALE_TICKET | 0 | — |
| STALE_ADR | 0 | — |
| FRONTMATTER warnings | 55 | P1 |
| FRONTMATTER errors | 0 | — |
| SPRINT_STALE | 0 | — |
| HANDOFF_STALE | 0 | — |
| PR_ROT | 0 | — |
| BRANCH_STALE | 10 | P2 |
| **Auto-fixable** | **0** | — |

**P0:** 0 · **P1:** 1 categoria (55 warning governance) · **P2:** 10 branch stale

**PR:** nessuna remediation — report-only (zero auto-fix items).

---

## Findings P1

### FRONTMATTER_GOVERNANCE — 55 warnings, 0 errors

Tool: `python3 tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict`
Exit: 0 (errors=0, warnings=55)

#### 54 × `stale_document` — last_verified oltre review_cycle_days

Tutti i doc hanno campo `last_verified` presente ma date comprese tra 2026-04-14 e 2026-04-30 (18–34 gg oltre la review_cycle). Nessuno supera 90 gg dalla data odierna (2026-05-18) → **nessun auto-fix applicabile** (soglia auto-fix = 90 gg).

Campione rappresentativo (tutti i 54 stale hanno stesso pattern):

| Percorso | last_verified | review_cycle_days |
|---|:---:|:---:|
| `docs/00-INDEX.md` | 2026-04-14 | 30 |
| `docs/architecture/ai-policy-engine.md` | 2026-04-16 | 30 |
| `docs/adr/ADR-2026-04-16-ai-architecture-utility.md` | 2026-04-16 | 30 |
| `docs/hubs/combat.md` | — (N/A) | — |
| `docs/core/02-PILASTRI.md` | — (N/A) | — |
| `docs/balance/tutorial-tuning-iter-2026-04-17.md` | — (N/A) | — |
| `docs/reports/PILLAR-LIVE-STATUS.md` | — (N/A) | — |

**Azione suggerita (P1, master-dd):** bump `last_verified` in blocco per i 54 doc nel prossimo sprint di maintenance. Script: `python3 tools/docs_governance_migrator.py --bump-last-verified --max-age-days 30`.

#### 1 × `frontmatter_registry_mismatch`

| File | Titolo in frontmatter | Titolo in registry |
|---|---|---|
| `docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md` | "formalize 🟢++/🟢/🟢 candidato/🟡++/🟡 thresholds" | "formalize tier ladder thresholds" |

Non è un path typo — discordanza titolo. **Non auto-fixable.** Richiede allineamento manuale (aggiornare registry oppure frontmatter).

---

## Findings P2

### BRANCH_STALE — 10 branch (>30 gg, nessuna open PR)

Soglia: ultimo commit >30 gg fa + nessuna PR aperta associata. Oggi = 2026-05-18.

| Branch | Ultimo commit | Età (gg) |
|---|:---:|:---:|
| `codex/add-automatic-yaml-fetch-page` | 2025-10-24 | 206 |
| `biome/badlands-ptpf-it` | 2025-10-25 | 205 |
| `codex/add-dedicated-metrics-to-hud_alerts` | 2025-10-27 | 203 |
| `codex/add-ideas-engine-page-to-site` | 2025-10-28 | 202 |
| `codex/add-idea-categories-configuration-and-documentation` | 2025-10-29 | 201 |
| `codex/add-paths-filter-step-to-ci-workflow` | 2025-10-29 | 201 |
| `codex/add-funnel-and-heatmap-components` | 2025-10-31 | 199 |
| `codex/add-script-to-aggregate-species-traits` | 2025-10-31 | 199 |
| `codex/add-locking-strategies-to-generationsnapshotstore` | 2025-11-02 | 197 |
| `codex/add-ref_repo_scope.md-to-docs/planning-mhkyz7` | 2025-11-24 | 175 |

Tutti branch Codex/biome da sessioni pre-Sprint-0 (ottobre–novembre 2025). Contenuto probabilmente integrato su main via merge dei rispettivi PR.

**Azione suggerita (P2, master-dd):** `git push origin --delete <branch>` × 10 (verificare prima che il lavoro sia effettivamente su main). Non auto-eseguito per policy CLAUDE.md.

---

## Findings clean (zero)

| Check | Stato | Note |
|---|:---:|---|
| STALE_TICKET | ✅ 0 | Tutti item ⏳ PENDING esplicitamente gated su master-dd verdict |
| STALE_ADR | ✅ 0 | Nessun ADR con status Proposed; presenti solo accepted/superseded/draft |
| SPRINT_STALE | ✅ 0 | Aggiornato 2026-05-15 (3 gg fa, soglia 14 gg) |
| HANDOFF_STALE | ✅ 0 | Più vecchio: 2026-04-24 (24 gg, soglia 45 gg) |
| PR_ROT | ✅ 0 | 4 PR aperte; tutte aggiornate 2026-05-17–18 (soglia 7 gg) |
| CI_RED | ✅ 0 | main HEAD `b9136e4` merged 2026-05-17; nessun segnale red |

---

## Auto-fix changelog

Nessun auto-fix eseguito:

- `last_verified >90d` → 0 doc qualificano (massimo 34 gg)
- `git mv handoff >45d` → 0 handoff qualificano (massimo 24 gg)
- `registry path typo` → 0 (il mismatch ADR-2026-04-30 è discordanza titolo, non path)

---

## Suggested next actions

1. **(P1 — governance, ~30 min)** Bulk-bump `last_verified` su 54 doc stale: eseguire migrator script + PR chore.
2. **(P1 — registry, ~5 min)** Allineare titolo `ADR-2026-04-30-pillar-promotion-criteria.md` tra frontmatter e `docs/governance/docs_registry.json`.
3. **(P2 — branch cleanup, ~10 min)** Verificare + cancellare 10 branch Codex/biome ottobre–novembre 2025 (`git push origin --delete` × 10, master-dd authority).
4. **(info)** Open PR attive: #2316 (tutorial04 perf), #2318 (tooltip fix), #2321 (abilityPanel ack), #2326 (DF rescue doc) — tutte fresh (1 gg), nessuna urgenza.
