---
title: Drift Audit 2026-06-01
date: 2026-06-01
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-06-01
source_of_truth: false
language: it
---

# Drift Audit 2026-06-01

## TL;DR

| Categoria       | Count | Severity |
|----------------|-------|----------|
| BRANCH_STALE   | 74    | P1       |
| GOVERNANCE_WARN| 326   | P2       |
| ADR_NO_STATUS  | 60    | P2       |
| SPRINT_NEAR    | 1     | P2       |
| STALE_TICKET   | 0     | —        |
| STALE_ADR      | 0     | —        |
| HANDOFF_STALE  | 0     | —        |
| PR_ROT         | 0     | —        |

**Auto-fix applicati**: 0 — nessun item soddisfa i criteri (last_verified >90d: 0; handoff >45d: 0).
**Remediation PR**: N/A — report-only.

---

## Findings P1

### BRANCH_STALE — 74 branch morti (top 10)

> Criteri: last commit >30 giorni AND nessuna open PR. Non auto-fixable (branch delete = owner-gated).

| # | Branch                                              | Last commit    | Età (giorni) |
|---|-----------------------------------------------------|----------------|--------------|
| 1 | `codex/add-automatic-yaml-fetch-page`              | 2025-10-24     | 220          |
| 2 | `biome/badlands-ptpf-it`                           | 2025-10-25     | 219          |
| 3 | `codex/add-ideas-engine-page-to-site`              | 2025-10-28     | 216          |
| 4 | `codex/add-dedicated-metrics-to-hud_alerts`        | ~2025-10-Nov   | ~200+        |
| 5 | `codex/add-funnel-and-heatmap-components`          | ~2025-10-Nov   | ~200+        |
| 6 | `codex/add-idea-categories-configuration-and-doc…` | ~2025-10-Nov   | ~200+        |
| 7 | `codex/add-locking-strategies-to-generationsnapshot` | ~2025-10-Nov | ~200+        |
| 8 | `codex/add-paths-filter-step-to-ci-workflow`       | ~2025-10-Nov   | ~200+        |
| 9 | `codex/add-script-to-aggregate-species-traits`     | ~2025-10-Nov   | ~200+        |
|10 | `chore/d3-d5-archive-and-tkt-close`               | 2026-04-25     | 37           |

**Totale stimato**: ~72 branch `codex/*` era Oct-Nov 2025 + 1 `biome/*` + 1 `chore/` = 74.
Tutti senza open PR. Nessuna open PR su questi branch (4 open PR totali = tutti `claude/*`, tutti da 2026-05-31).

**Azione consigliata**: batch `git push origin --delete <branch>` per i 73 branch codex/biome Oct 2025. Owner-gated, non auto-fix.

---

## Findings P2

### GOVERNANCE_WARN — 326 stale_document (nessun errore)

| Metrica         | Valore |
|----------------|--------|
| errors          | 0      |
| warnings        | 326    |
| exit code       | 0      |
| età range       | 3–23 giorni |
| età mediana     | 12 giorni   |
| docs >90 giorni | **0** → no auto-fix |

Tutte le 326 warning sono `stale_document` (revisione scaduta). Soglia auto-fix = >90 giorni: zero documenti raggiungono la soglia. La governance è tecnicamente pulita (exit 0). I warning riflettono il normale backlog di revisione post-sprint.

### ADR_NO_STATUS — 60 ADR senza campo `status:`

| Metrica          | Valore |
|-----------------|--------|
| ADR totali       | 65     |
| Con `status:`    | 5      |
| Senza `status:`  | 60     |
| Stato `proposed` | 0      |

Nessun ADR ha `status: proposed` → nessun STALE_ADR formale. Tuttavia 60/65 ADR mancano del campo `status:` in frontmatter. I 5 con status: 2× `accepted`, 2× `accepted (design)`, 1× `superseded`.

**Azione consigliata**: backfill `status: accepted` sugli ADR datati (campione: ADR-2025-11-*, ADR-2026-04-13 → ADR-2026-05-10). Non bloccante.

### SPRINT_NEAR_THRESHOLD

| Campo               | Valore         |
|--------------------|----------------|
| Sprint context date | 2026-05-20     |
| Età al 2026-06-01   | 12 giorni      |
| Soglia flag         | >14 giorni     |
| Status              | ⚠️ NEAR (2 giorni al limite) |

Non ancora flagged SPRINT_STALE. Da monitorare: se non aggiornato entro 2026-06-03 → flag.

---

## Findings clean (zero)

| Check            | Risultato |
|-----------------|-----------|
| STALE_TICKET     | ✅ 0 — backlog ben manutenuto. 3 open ticket (TKT-WORLDGEN-GAPC, TKT-P6-AP3, TKT-ENCOUNTER-CLI) tutti genuinamente aperti. |
| STALE_ADR        | ✅ 0 — nessun ADR con `proposed` >14 giorni. |
| HANDOFF_STALE    | ✅ 0 — handoff più vecchio: 2026-04-24 (38 giorni). Soglia 45 giorni non raggiunta. |
| PR_ROT           | ✅ 0 — 4 open PR tutte da 2026-05-31 (1 giorno fa). |
| CI_RED           | ✅ main attivo — ultimo commit 2026-06-01 (`feat/species` wave3). |

---

## Auto-fix changelog

Nessun auto-fix applicato. Motivi:

- `last_verified >90d`: 0 documenti (età max = 23 giorni)
- `handoff >45d`: 0 file (più vecchio = 38 giorni per filename date)
- Registry path typos: nessuno identificato

---

## Suggested next actions

| Priorità | Azione                                                                                    | Owner       |
|---------|-------------------------------------------------------------------------------------------|-------------|
| P1      | Batch delete ~73 branch `codex/*` + `biome/badlands-ptpf-it` da Oct 2025                | master-dd   |
| P1      | Delete `chore/d3-d5-archive-and-tkt-close` (37d, no PR)                                 | master-dd   |
| P2      | Backfill `status: accepted` su 60 ADR senza campo status (bulk sed o script)             | governance  |
| P2      | Aggiornare CLAUDE.md sprint context entro 2026-06-03 (evita SPRINT_STALE flag)           | master-dd   |
| P2      | Aprire remediation round governance warning 326 (revisione mensile rolling)              | ops-qa      |
