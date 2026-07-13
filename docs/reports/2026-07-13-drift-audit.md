---
title: Drift Audit 2026-07-13
date: '2026-07-13'
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: '2026-07-13'
source_of_truth: false
language: it
review_cycle_days: 7
---

# Drift Audit 2026-07-13

## TL;DR

| Categoria | N | Severità |
|---|---|---|
| HANDOFF_STALE (`docs/planning/` >45gg) | 48 | P1 |
| GOVERNANCE_STALE_DOC (review scaduta) | 43 | P1 |
| BRANCH_STALE (>30gg, no open PR) | 6 confermati | P2 |
| GOVERNANCE_BROKEN_PIN (codice→doc inesistente) | 4 | P2 |
| GOVERNANCE_UNREGISTERED | 1 | P2 |
| GOVERNANCE_MISMATCH frontmatter≠registry | 1 | P2 |
| STALE_ADR (Proposed >14gg) | **0** | — |
| PR_ROT (open PR >7gg) | **0** | — |
| SPRINT_STALE (>14gg) | **0** | — |
| CI_RED (main >2gg) | **0** | — |
| STALE_TICKET / DORMANT BACKLOG | **0** | — |

**Auto-fix applicati**: 0 (tutti i batch >5; nessun item triviale isolato entro la policy)
**PR**: report-only — nessuna remediation automatica questo run.

---

## P1 — Findings prioritari

### HANDOFF_STALE — 48 handoff docs >45gg

> Cutoff: 2026-05-28 (oggi − 45gg). Auto-fix rule = `git mv → docs/archive/historical-snapshots/`. Batch **48 > limite 5** → elencati solo.

<details>
<summary>48 file (click to expand)</summary>

```
docs/planning/2026-04-24-session-handoff-compact.md
docs/planning/2026-04-25-content-sprint-handoff.md
docs/planning/2026-04-25-illuminator-orchestra-handoff.md
docs/planning/2026-04-25-museum-session-handoff.md
docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md
docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md
docs/planning/2026-04-26-next-session-handoff-M14-C.md
docs/planning/2026-04-26-vision-gap-sprint-handoff.md
docs/planning/2026-04-27-bundle-b-recovery-handoff.md
docs/planning/2026-04-27-skiv-personal-sprint-handoff.md
docs/planning/2026-04-27-sprint-1-5-autonomous-handoff.md
docs/planning/2026-04-27-sprint-10-qbn-debrief-handoff.md
docs/planning/2026-04-27-sprint-11-biome-chip-handoff.md
docs/planning/2026-04-27-sprint-6-beast-bond-handoff.md
docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md
docs/planning/2026-04-27-sprint-6-thought-cabinet-handoff.md
docs/planning/2026-04-27-sprint-7-beast-bond-handoff.md
docs/planning/2026-04-27-sprint-7-skill-check-popup-handoff.md
docs/planning/2026-04-27-sprint-8-ability-r3-r4-handoff.md
docs/planning/2026-04-27-sprint-8-predict-hover-preview-handoff.md
docs/planning/2026-04-27-sprint-9-objective-hud-handoff.md
docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md
docs/planning/2026-04-27-status-effects-phase-a-handoff.md
docs/planning/2026-04-28-next-session-handoff.md
docs/planning/2026-04-28-sprint-12-mating-lifecycle-handoff.md
docs/planning/2026-04-28-sprint-13-status-engine-wave-a-handoff.md
docs/planning/2026-04-29-ermes-cleanup-handoff.md
docs/planning/2026-05-02-pulverator-ecology-handoff.md
docs/planning/2026-05-05-audit-triage-handoff.md
docs/planning/2026-05-05-repo-content-audit-handoff.md
docs/planning/2026-05-06-ferrospora-pipeline-handoff.md
docs/planning/2026-05-06-sessione-2-closure-handoff.md
docs/planning/2026-05-06-sessione-closure-handoff.md
docs/planning/2026-05-07-cutover-handoff-alternative-qa.md
docs/planning/2026-05-07-phase-a-handoff-next-session.md
docs/planning/2026-05-09-fase1-2-handoff-next-session.md
docs/planning/2026-05-09-sera-k4-b-4task-handoff.md
docs/planning/2026-05-09-status-effects-phase-a-handoff.md
docs/planning/2026-05-10-notte-trait-orphan-full-closure-handoff.md
docs/planning/2026-05-10-sera-final-handoff-next-session.md
docs/planning/2026-05-10-tkt-bond-hud-surface-frontend-handoff.md
docs/planning/2026-05-11-tkt-c1-partial-handoff.md
docs/planning/2026-05-15-handoff-cross-pc-pr2271-closure.md
docs/planning/2026-05-15-session-closure-cumulative-handoff.md
docs/planning/2026-05-20-parallel-cascade-multi-agent-handoff.md
docs/planning/2026-05-21-session-handoff-v44.5-FINAL.md
docs/planning/2026-05-21-session-handoff.md
docs/planning/2026-05-26-fase1-spore-recon-claude-code-handoff.md
```

</details>

**Azione consigliata** (owner: master-dd): singolo PR con batch `git mv docs/planning/2026-04-*-*handoff*.md docs/planning/2026-05-*-*handoff*.md docs/archive/historical-snapshots/handoffs-2026-q2/`. Verificare prima che nessuno dei 48 sia citato in CLAUDE.md sprint context attivo.

---

### GOVERNANCE_STALE_DOC — 43 documenti con revisione scaduta

> `review_cycle_days: 14`; `last_verified` ~2026-06-10→06-22; scaduti ~24 giu – 6 lug.
> NOT >90gg → regola auto-bump NON applicabile.

| Workstream | Docs (campione) |
|---|---|
| `docs/pipelines/` (14) | `Frattura_Abissale_*` ×11, `ci.md`, `drive_sync.md`, `ema-metrics.md`, `roadmap_generator.md` |
| `docs/process/` (15) | `README`, `action-items`, `bug-intake`, `feedback_collection_pipeline`, `incoming_review_log`, `milestones`, `qa_hud`, ecc. |
| `docs/guide/` (2) | `README_HOWTO_AUTHOR_TRAIT.md`, `contributing/traits.md` |
| `docs/tutorials/` (2) | `adaptive-engine-quickstart.md`, `hud-overlay-quickstart.md` |
| `docs/ops/` (2) | `cli-tools.md`, `drive-sync.md` |
| Altro (8) | `CHANGELOG.md`, `docs/planning/2026-06-20-session-handoff.md`, ecc. |

**Root cause**: ciclo 14gg su doc di processo/pipeline = treadmill permanente. I 14 `Frattura_Abissale_*` sono pipeline esecutive di una feature già shioppata → candidati a `doc_status: historical_ref` che esonera dalla governance ciclica (cfr. `docs/guide/docs-governance-stale-lifecycle.md`).

**Azione consigliata**:
1. Pipeline `Frattura_Abissale_*` → flip a `doc_status: historical_ref` (1 PR, esonero perpetuo).
2. `docs/process/`, `docs/tutorials/`, `docs/ops/` → aumentare `review_cycle_days` a 30–90.

---

## P2 — Findings da monitorare

### BRANCH_STALE — 6 branch confermati >30gg, no open PR

> Nessuna auto-delete per policy. Campionamento Top-10: 6 confermati, altri stimati stale (aa01/cap-*, codex/*).

| Branch | Ultimo commit | Età (gg) |
|---|---|---|
| `codex/add-idea-categories-configuration-and-documentation` | 2025-10-29 | 257 |
| `aa01/cap-02-tracking-commit` | 2026-04-25 | 79 |
| `chore/d3-d5-archive-and-tkt-close` | 2026-04-25 | 79 |
| `claude/parallel-coop-disc-race-roledemands-2026-05-20` | 2026-05-20 | 54 |
| `chore/weekly-drift-audit-2026-06-01` | 2026-06-01 | 42 |
| `claude/phasec-bundle-slice-1-2-3` | 2026-06-01 | 42 |

Non campionati: `aa01/cap-03` … `aa01/cap-15b` (14 branch, stimati ~Apr–Mag 2026) e decine di `codex/` con commit pre-giugno.

**Azione consigliata** (owner: master-dd): `git push origin --delete <branch>` manuale dopo verifica che ogni branch sia già merged su main o esplicitamente abbandonato.

---

### GOVERNANCE_BROKEN_PIN — 4 pin non risolti (codice → file mancante)

| Path referenziato | Citato da |
|---|---|
| `docs/planning/2026-07-06-sistema-intents-` | `apps/backend/services/ai/declareSistemaIntents.js:123` |
| `docs/research/2026-07-06-dorsale-` | `tools/sim/dorsale-ferrosa-band-probe.js:407` |
| `docs/research/2026-07-06-dorsale-ferrosa-` | `tools/sim/grid-band-probe.js:5` |
| `docs/research/2026-07-06-los-flip-` | `apps/backend/services/ai/declareSistemaIntents.js:666` |

Tutti e 4 sono path truncati (mancano estensione/suffisso). I file probabilmente esistono con nomi leggermente diversi (es. `docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md` e `docs/research/2026-07-06-los-flip-ratify-n40.md` sono presenti nel registry). Il sorgente `.js` punta alla versione troncata.

**Azione consigliata**: correggere i commenti/riferimenti nei 2 file `.js` con i path completi corretti.

---

### GOVERNANCE_UNREGISTERED — 1 documento

| Path | Note |
|---|---|
| `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` | Frontmatter `doc_status` presente ma assente da `docs_registry.json` |

**Azione consigliata**: aggiungere entry al registry con `npm run docs:lint` o `tools/docs_governance_migrator.py`.

---

### GOVERNANCE_MISMATCH frontmatter≠registry — 1

| File | Frontmatter `last_verified` | Registry `last_verified` |
|---|---|---|
| `docs/adr/ADR-2026-04-16-session-engine-round-migration.md` | 2026-07-05 | 2026-06-06 |

Causa probabile: frontmatter aggiornato manualmente il 2026-07-05 senza propagare il registry. Non è un path-typo → non auto-fixable per policy; sync manuale o via `tools/docs_governance_migrator.py`.

---

## Auto-fix changelog

Nessuna modifica applicata automaticamente in questo run.

| Candidato | Motivo skip |
|---|---|
| HANDOFF_STALE (48 file) | Batch >5 → report-only per policy |
| GOVERNANCE_STALE_DOC (43 doc) | `last_verified` ~30–40gg, NON >90gg → regola auto-bump non applicabile |
| GOVERNANCE_MISMATCH (1) | Non "registry path typo" → escluso da auto-fix policy |
| BRANCH_STALE (6+) | Auto-delete mai consentita per policy |

---

## Suggested next actions

| Priorità | Azione | Owner |
|---|---|---|
| P1 | `git mv` batch 48 handoff >45gg → `docs/archive/historical-snapshots/handoffs-2026-q2/` | master-dd |
| P1 | Flip 14 `Frattura_Abissale_*` pipeline a `doc_status: historical_ref` | chore PR |
| P1 | Aumentare `review_cycle_days` a 30–90 su `docs/process/`, `docs/tutorials/`, `docs/ops/` | chore PR |
| P2 | Correggere 4 path truncati in `declareSistemaIntents.js` e `grid-band-probe.js` | fix PR |
| P2 | Registrare `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` nel registry | fix PR |
| P2 | Sync registry `last_verified` per `ADR-2026-04-16-session-engine-round-migration.md` | fix PR |
| P2 | Cancellare branch stale (6 confermati + stimati aa01/cap-* + codex/*) | master-dd manuale |
