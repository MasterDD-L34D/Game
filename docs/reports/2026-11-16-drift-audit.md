---
title: Drift Audit 2026-11-16
date: '2026-11-16'
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: '2026-11-16'
source_of_truth: false
language: it
---

# Drift Audit 2026-11-16

## TL;DR

| Metrica | Valore |
|---|---|
| Data audit | 2026-11-16 |
| Totale findings | 27 |
| **P0** (blocco immediato) | 1 |
| **P1** (azione urgente) | 20 |
| **P2** (advisory) | 6 |
| Auto-fix incluso in PR | Sì — 89 handoff docs → archive (4 batch commit) |
| PR | (vedi sezione finale) |
| CI main | ✅ verde (ultima run 2026-11-09) |

---

## Findings P0

| ID | Tipo | Descrizione |
|---|---|---|
| F-01 | SPRINT_STALE | CLAUDE.md sprint context ultimo aggiornamento **2026-07-04** (135 giorni fa). Cross-check CI: verde. |

**Azione**: aggiornare la sezione "Sprint context" con lo stato reale del repo. Owner: master-dd.

---

## Findings P1

### ADR Proposed stale (>14 giorni)

| ID | File | Status frontmatter | Età (gg) |
|---|---|---|---|
| F-02 | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | `proposed` | 129 |
| F-03 | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | `proposed` | 125 |

**ADR draft (non-proposed, ma >14gg — P1 advisory)**:

| ID | File | Status | Età (gg) |
|---|---|---|---|
| F-04 | `docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md` | `draft` | 204 |
| F-05 | `docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md` | `draft` | 204 |
| F-06 | `docs/adr/ADR-2026-04-26-parley-outcome-enum.md` | `draft` | 204 |
| F-07 | `docs/adr/ADR-2026-05-04-ennea-taxonomy-canonical.md` | `draft` | ~195 |
| F-08 | `docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md` | `draft` | ~189 |

**Azione**: master-dd decide: `proposed → active` oppure `proposed → superseded`. NON auto-fixabile.

---

### PR rot (open >7 giorni)

| ID | PR# | Titolo | Stato | Età (gg) |
|---|---|---|---|---|
| F-09 | #3306 | fix(species): recover rovine_planari | open (non-draft) | **125** |
| F-10 | #3324 | chore(governance): weekly drift remediation 2026-11-09 | draft | 7 |
| F-11 | #3323 | chore(governance): weekly drift audit 2026-11-02 | draft | 14 |
| F-12 | #3322 | chore(governance): weekly drift remediation 2026-10-26 | draft | 21 |
| F-13 | #3321 | chore(governance): weekly drift audit 2026-10-19 | draft | 28 |
| F-14 | #3320 | chore(governance): weekly drift audit 2026-10-12 | draft | 35 |
| F-15 | #3319 | chore(governance): weekly drift remediation 2026-10-05 | draft | 42 |
| F-16 | #3318 | chore(governance): weekly drift remediation 2026-09-28 | draft | 49 |
| F-17 | #3317 | chore(governance): weekly drift remediation 2026-09-21 | draft | 56 |
| F-18 | #3316 | chore(governance): weekly drift remediation 2026-09-14 | draft | 63 |
| F-19 | #3315 | chore(governance): weekly drift remediation 2026-09-07 | draft | 70 |
| F-20 | #3314 | chore(governance): weekly drift remediation 2026-08-31 | draft | 77 |
| F-21 | #3313 | chore(governance): weekly drift remediation 2026-08-24 | draft | 84 |
| F-22 | #3312 | chore(governance): weekly drift remediation 2026-08-17 | draft | 91 |
| F-23 | #3311 | chore(governance): weekly drift audit 2026-08-10 | draft | 98 |
| F-24 | #3310 | chore(governance): weekly drift audit 2026-08-03 | draft | 105 |
| F-25 | #3309 | chore(governance): weekly drift audit 2026-07-27 | draft | 112 |
| F-26 | #3308 | chore(governance): weekly drift audit 2026-07-20 | draft | 119 |

⚠️ **Pattern critico**: 17 PRs governance draft aperti non-reviewati da luglio 2026. I batch di auto-fix si accumulano senza mai atterrare su main. I remediation stale (handoff moves, last_verified bump) in queste PR NON sono mai stati applicati.

**Azione**: master-dd revisiona e mergia (o chiude) i drift audit PR accumulati, in particolare #3309-#3326. #3306 (`rovine_planari`) richiede review tecnica urgente (125gg senza attività).

---

### Handoff docs stale (>45 giorni) — auto-fix incluso

Totale: **89 file** in `docs/planning/` con data-nel-nome >45 giorni fa. Tutti mossi in
`docs/archive/historical-snapshots/2026-planning-handoffs/` in questo PR (4 commit, batch per mese).

| Mese | Conteggio | Auto-fix |
|---|---|---|
| Aprile 2026 | 27 | ✅ mossi (commit 2) |
| Maggio 2026 | 22 | ✅ mossi (commit 3) |
| Giugno 2026 | 28 | ✅ mossi (commit 4) |
| Luglio 2026 | 12 | ✅ mossi (commit 5) |

---

## Findings P2

| ID | Tipo | Descrizione |
|---|---|---|
| F-27 | BRANCH_STALE | Molti branch `claude/*` e `chore/*` da giugno-luglio 2026 senza PR aperta (top 10 estratti): `claude/d6-rapida-wire`, `claude/fase2c-adr-active`, `claude/fase2c-grid-wiring`, `claude/d4-ecoyaml`, `claude/closeout-sync-0701`, `claude/aa01-d7-tendency-prose`, `claude/aa01-cluster-doc-sync`, `chore/governance-non-living-stale-skip`, `chore/d3-d5-archive-and-tkt-close`, `chore/trait-orphan-a-keep-b-defer-codify` |

**Azione BRANCH_STALE**: validare se le branch corrispondono a PR già merged; se sì, eliminare (owner).

---

## Backlog drift

BACKLOG open items senza commit reference >30 giorni (DORMANT):

| Ticket | Descrizione | Ultima attività stimata |
|---|---|---|
| D6 axis→trait graded re-ratify | chip aperto da luglio 2026 | ~Jul 2026 |
| N3 SPEC-I ER7 flag-ON N=40 | chip aperto da luglio 2026 | ~Jul 2026 |
| TKT-P6: 17 trait non-combat orphans | aperto da luglio 2026 | ~Jul 2026 |
| TKT-SIM-COOP-SEED | aperto da luglio 2026 | ~Jul 2026 |
| Build zone-defense (lever D4) | spec ratificata, build non iniziata | ~Jul 2026 |
| Flip `XP_BUDGET_GEOMETRY_ENABLED` | staged-latent, flip owner-gated | ~Jul 2026 |

NON auto-fixabile: richiede decisione master-dd su quale di questi riattivare.

---

## Governance warnings

`python3 tools/check_docs_governance.py --strict` → **errors=0 warnings=684**.

Tutti warnings (nessun errore bloccante). La maggior parte è `stale_document` per `last_verified`
>90 giorni. I doc con `last_verified` aggiornabile (non `source_of_truth: true`) sono stati
bumped automaticamente nelle run precedenti; la coda residua richiede review.

---

## Auto-fix changelog

| # | Commit | Azione |
|---|---|---|
| 1 | `docs(audit): weekly drift audit report 2026-11-16` | Creazione questo report |
| 2 | `chore(archive): move april-2026 stale handoffs to historical-snapshots` | 27 file → `docs/archive/historical-snapshots/2026-planning-handoffs/` |
| 3 | `chore(archive): move may-2026 stale handoffs to historical-snapshots` | 22 file → archive |
| 4 | `chore(archive): move june-2026 stale handoffs to historical-snapshots` | 28 file → archive |
| 5 | `chore(archive): move july-2026 stale handoffs to historical-snapshots` | 12 file → archive |

---

## Suggested next actions

1. **[Immediato, master-dd]** Revisiona PR #3306 (`rovine_planari`, 125gg). Mergia o chiudi.
2. **[Immediato, master-dd]** Revisiona e mergia i drift audit PR accumulati (#3308-#3324). Il pattern di accumulazione indica che il workflow governance non è sostenibile senza review weekly.
3. **[Urgente, master-dd]** Aggiorna CLAUDE.md sprint context (135gg stale, F-01).
4. **[Presto, master-dd]** Decidi status per 2 ADR `proposed` (F-02/F-03) e 5 ADR `draft` (F-04..F-08): ratifica o supersede.
5. **[Presto, master-dd]** Revisiona e chiudi i 6 ticket DORMANT nel BACKLOG: decidi priorità o archivia.
6. **[Manutenzione, master-dd]** Elimina i branch `claude/*` già merged (F-27).
