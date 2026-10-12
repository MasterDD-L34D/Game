---
title: Drift Audit 2026-10-12
date: 2026-10-12
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-10-12
source_of_truth: false
language: it
---

# Drift Audit 2026-10-12

## TL;DR

| Categoria | Conteggio | Severità |
|-----------|-----------|----------|
| P0 — PR drift audit non mergiati (accumulo) | 12 PR | **P0** |
| P1 — Sprint context stale | 1 | P1 |
| P1 — ADR draft/proposed >14 giorni | 7 | P1 |
| P1 — Handoff docs >45 giorni | 50+ (troncato) | P1 |
| P2 — PR_ROT (non-audit, >7gg) | 1 | P2 |
| P2 — Branch stale claude/* senza PR | ≥10 | P2 |
| P2 — Governance warnings | 619 stale_document | P2 |
| **Auto-fix eseguiti** | 0 | — |

**CI main**: verde (ultimo run 2026-07-14, nessun push da allora). Non CI_RED.
**Nessun auto-fix applicato**: i mv handoff romperebbero >30 link in CLAUDE.md; nessun `last_verified` >90gg trovato nel registry.

PR questa audit: aperta sotto.

---

## Findings P0

### P0 — Accumulo drift audit PR non mergiati (12 PR)

| PR | Titolo | Ultimo aggiornamento |
|----|--------|----------------------|
| [#3308](https://github.com/MasterDD-L34D/Game/pull/3308) | weekly drift audit 2026-07-20 | 2026-07-20 |
| [#3309](https://github.com/MasterDD-L34D/Game/pull/3309) | weekly drift audit 2026-07-27 | 2026-07-27 |
| [#3310](https://github.com/MasterDD-L34D/Game/pull/3310) | weekly drift audit 2026-08-03 | 2026-08-03 |
| [#3311](https://github.com/MasterDD-L34D/Game/pull/3311) | weekly drift audit 2026-08-10 | 2026-08-10 |
| [#3312](https://github.com/MasterDD-L34D/Game/pull/3312) | weekly drift remediation 2026-08-17 | 2026-08-17 |
| [#3313](https://github.com/MasterDD-L34D/Game/pull/3313) | weekly drift remediation 2026-08-24 | 2026-08-24 |
| [#3314](https://github.com/MasterDD-L34D/Game/pull/3314) | weekly drift remediation 2026-08-31 | 2026-08-31 |
| [#3315](https://github.com/MasterDD-L34D/Game/pull/3315) | weekly drift remediation 2026-09-07 | 2026-09-07 |
| [#3316](https://github.com/MasterDD-L34D/Game/pull/3316) | weekly drift remediation 2026-09-14 | 2026-09-14 |
| [#3317](https://github.com/MasterDD-L34D/Game/pull/3317) | weekly drift remediation 2026-09-21 | 2026-09-21 |
| [#3318](https://github.com/MasterDD-L34D/Game/pull/3318) | weekly drift remediation 2026-09-28 | 2026-09-28 |
| [#3319](https://github.com/MasterDD-L34D/Game/pull/3319) | weekly drift remediation 2026-10-05 | 2026-10-05 |

**Causa**: i report settimanali vengono prodotti e la PR aperta, ma nessuno le sta mergiando. Ogni PR porta solo il report `.md`; l'accumulo è un symptom del processo review/merge rotto, non dei report stessi. Il main è rimasto fermo al commit del 2026-07-14 (`c3013af`).

---

## Findings P1

### P1 — SPRINT_STALE

Sprint context in CLAUDE.md aggiornato al **2026-07-04** (TKT-P6-AP3 closure). Oggi: 2026-10-12. **Età: ~100 giorni.** Soglia: 14 giorni.

Il main non ha ricevuto commit da 2026-07-14. La divergenza sprint↔repo suggerisce attività ferma.

### P1 — STALE_ADR (7 ADR in draft/proposed >14 giorni)

| File | Status | Data approssimativa |
|------|--------|---------------------|
| `docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md` | draft | 2026-04-26 (~169gg) |
| `docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md` | draft | 2026-04-26 (~169gg) |
| `docs/adr/ADR-2026-04-26-parley-outcome-enum.md` | draft | 2026-04-26 (~169gg) |
| `docs/adr/ADR-2026-05-04-ennea-taxonomy-canonical.md` | draft | 2026-05-04 (~161gg) |
| `docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md` | draft | 2026-05-10 (~155gg) |
| `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | proposed | 2026-07-10 (~94gg) |
| `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | proposed | 2026-07-14 (~90gg) |

Azione suggerita: promuovere a `active` / `accepted`, `superseded` o `rejected`. Non auto-fixabile (cambio status ADR è owner-gated).

### P1 — HANDOFF_STALE (89 handoff docs, tutti >45 giorni) — TRUNCATED at 50

Tutti i file in `docs/planning/*handoff*.md` sono anteriori al 2026-08-28 (cutoff 45gg da oggi).
Totale: **89 file**. Campione top-50 (ordinati per data, più vecchi prima):

| File | Data |
|------|------|
| `docs/planning/2026-04-24-session-handoff-compact.md` | 2026-04-24 |
| `docs/planning/2026-04-25-content-sprint-handoff.md` | 2026-04-25 |
| `docs/planning/2026-04-25-illuminator-orchestra-handoff.md` | 2026-04-25 |
| `docs/planning/2026-04-25-museum-session-handoff.md` | 2026-04-25 |
| `docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md` | 2026-04-25 |
| `docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md` | 2026-04-25 |
| `docs/planning/2026-04-26-next-session-handoff-M14-C.md` | 2026-04-26 |
| `docs/planning/2026-04-26-vision-gap-sprint-handoff.md` | 2026-04-26 |
| `docs/planning/2026-04-27-bundle-b-recovery-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-skiv-personal-sprint-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-1-5-autonomous-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-10-qbn-debrief-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-11-biome-chip-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-6-beast-bond-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-6-thought-cabinet-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-7-beast-bond-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-7-skill-check-popup-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-8-ability-r3-r4-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-8-predict-hover-preview-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-9-objective-hud-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-27-status-effects-phase-a-handoff.md` | 2026-04-27 |
| `docs/planning/2026-04-28-next-session-handoff.md` | 2026-04-28 |
| `docs/planning/2026-04-28-sprint-12-mating-lifecycle-handoff.md` | 2026-04-28 |
| `docs/planning/2026-04-28-sprint-13-status-engine-wave-a-handoff.md` | 2026-04-28 |
| `docs/planning/2026-04-29-ermes-cleanup-handoff.md` | 2026-04-29 |
| `docs/planning/2026-05-02-pulverator-ecology-handoff.md` | 2026-05-02 |
| `docs/planning/2026-05-05-audit-triage-handoff.md` | 2026-05-05 |
| `docs/planning/2026-05-05-repo-content-audit-handoff.md` | 2026-05-05 |
| `docs/planning/2026-05-06-ferrospora-pipeline-handoff.md` | 2026-05-06 |
| `docs/planning/2026-05-06-sessione-2-closure-handoff.md` | 2026-05-06 |
| `docs/planning/2026-05-06-sessione-closure-handoff.md` | 2026-05-06 |
| `docs/planning/2026-05-07-cutover-handoff-alternative-qa.md` | 2026-05-07 |
| `docs/planning/2026-05-07-phase-a-handoff-next-session.md` | 2026-05-07 |
| `docs/planning/2026-05-09-fase1-2-handoff-next-session.md` | 2026-05-09 |
| `docs/planning/2026-05-09-sera-k4-b-4task-handoff.md` | 2026-05-09 |
| `docs/planning/2026-05-09-status-effects-phase-a-handoff.md` | 2026-05-09 |
| `docs/planning/2026-05-10-notte-trait-orphan-full-closure-handoff.md` | 2026-05-10 |
| `docs/planning/2026-05-10-sera-final-handoff-next-session.md` | 2026-05-10 |
| `docs/planning/2026-05-10-tkt-bond-hud-surface-frontend-handoff.md` | 2026-05-10 |
| `docs/planning/2026-05-11-tkt-c1-partial-handoff.md` | 2026-05-11 |
| `docs/planning/2026-05-15-handoff-cross-pc-pr2271-closure.md` | 2026-05-15 |
| `docs/planning/2026-05-15-session-closure-cumulative-handoff.md` | 2026-05-15 |
| `docs/planning/2026-05-20-parallel-cascade-multi-agent-handoff.md` | 2026-05-20 |
| `docs/planning/2026-05-21-session-handoff-v44.5-FINAL.md` | 2026-05-21 |
| `docs/planning/2026-05-21-session-handoff.md` | 2026-05-21 |
| `docs/planning/2026-05-26-fase1-spore-recon-claude-code-handoff.md` | 2026-05-26 |
| `docs/planning/2026-05-31-parallel-sessions-sync-handoff.md` | 2026-05-31 |
| `docs/planning/2026-06-01-goal-coordinator-session-handoff.md` | 2026-06-01 |

*(+39 file non listati, tutti dal 2026-06-02 al 2026-07-04 — TRUNCATED)*

⚠️ **Non auto-spostati**: CLAUDE.md sprint context ha >30 link diretti a handoff recenti (2026-06-17..2026-07-04). Un `git mv` bulk romperebbe quei riferimenti attivi. Archiviazione manuale raccomandata solo per la fascia 2026-04-24..2026-06-01 (67 file senza link da CLAUDE.md).

---

## Findings P2

### P2 — PR_ROT (non-audit)

| PR | Titolo | Ultimo agg. | Età |
|----|--------|-------------|-----|
| [#3306](https://github.com/MasterDD-L34D/Game/pull/3306) | fix(species): recover rovine_planari | 2026-07-14 | ~90 giorni |

### P2 — Branch stale claude/* (top 10, senza PR aperta)

Tutti da giugno–luglio 2026, nessuna PR aperta associata:

| Branch |
|--------|
| `claude/a13-wound-n40-evidence` |
| `claude/aa01-cluster-doc-sync` |
| `claude/aa01-d7-tendency-prose` |
| `claude/aisim-aggressive-rebaseline` |
| `claude/busy-fermat-4cddcb` |
| `claude/catalog-biome-wire` |
| `claude/ci-stale-refs-i2` |
| `claude/closeout-sync-0701` |
| `claude/codex-strutturale-echo` |
| `claude/d4-ecoyaml` |

Non auto-eliminabili (solo owner può eliminare branch).

### P2 — Governance warnings (619)

`check_docs_governance.py --strict`: **0 errori, 619 warning** — tutti `stale_document` (revisione scaduta). Nessun `last_verified` >90gg trovato nel registry per auto-bump. La campagna stale 2026-06-21 (#2914) aveva chiuso 397→0; il conteggio è risalito per age naturale. Nessuna azione auto-fix applicabile.

---

## Auto-fix changelog

*(nessun auto-fix eseguito)*

---

## Suggested next actions

| Priorità | Azione | Owner |
|----------|--------|-------|
| **P0** | Decidere destino delle 12 drift-audit PR aperte: mergiare le più recenti (o chiudere quelle superseded) | master-dd |
| **P0** | Valutare se la cadenza settimanale automatica ha senso senza un loop review/merge attivo | master-dd |
| P1 | Aggiornare sprint context in CLAUDE.md con l'attuale stato del repo | master-dd |
| P1 | Promuovere/chiudere i 7 ADR draft/proposed (3 da aprile = 5+ mesi) | master-dd |
| P1 | Archiviare manualmente `docs/planning/*handoff*.md` 2026-04-24..2026-06-01 (67 file, no link attivi da CLAUDE.md) | master-dd |
| P2 | Mergiare/chiudere PR #3306 (fix/species, 90gg) | master-dd |
| P2 | Pulizia branch `claude/*` da giugno–luglio 2026 senza PR aperta (≥50 branch) | master-dd |
