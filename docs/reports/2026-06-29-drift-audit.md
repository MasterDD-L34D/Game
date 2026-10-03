---
title: Drift Audit 2026-06-29
date: 2026-06-29
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-06-29
source_of_truth: false
language: it
---

# Drift Audit — 2026-06-29

## TL;DR

| Metrica | Valore |
|---|---|
| Totale findings | 27 |
| P0 (bloccante) | 0 |
| P1 (alta priorità) | 0 |
| P2 (hygiene) | 27 |
| Auto-fix applicati | 0 |
| PR rimediazione | — (solo report) |

Nessun blocco critico. Gap principale: **25 doc non registrati** prodotti dallo sprint 2026-06-22. Il registro (docs_registry.json) non è stato aggiornato con i nuovi artefatti. Action owner-gated: registrazione batch.

---

## P0 — Nessun finding

---

## P1 — Nessun finding

| Check | Stato | Note |
|---|---|---|
| ADR Proposed >14d | ✅ Pulito | Nessun ADR con status `proposed` |
| CI red >2d | ✅ n/a | Accesso CI non disponibile in sessione schedulata |
| STALE_TICKET (PR merged marcato open) | ✅ Pulito | 4 PR open verificate (tutte aggiornate 2026-06-28) |

---

## P2 — 27 findings

### 2.1 GOVERNANCE_UNREGISTERED — 25 doc (P2)

Docs con frontmatter governato assenti da `docs/governance/docs_registry.json`. Tutti prodotti dallo sprint 2026-06-22/28 (trait-mechanics-engine, aa01-impronta, move-terrain, OD-024). **Non auto-fixabili** (aggiunta registry richiede metadata completo, owner-gated).

| Path | Dir |
|---|---|
| `docs/planning/2026-06-22-missing-kit-traits-proposal.md` | planning |
| `docs/planning/2026-06-22-retired-creatures-salvage-proposal.md` | planning |
| `docs/planning/2026-06-22-session-handoff.md` | planning |
| `docs/planning/2026-06-22-tkt-p6-b-reground-correction.md` | planning |
| `docs/planning/2026-06-22-tkt-p6-b-resolution-status.md` | planning |
| `docs/planning/2026-06-22-tkt-p6-trait-orphan-design-b-istruttoria.md` | planning |
| `docs/planning/2026-06-23-derived-canon-salvage-progress.md` | planning |
| `docs/planning/2026-06-23-residual-gate-register.md` | planning |
| `docs/planning/2026-06-23-slot-profile-backfill-proposal.md` | planning |
| `docs/planning/2026-06-28-gap2-next-block-mechanics-proposal.md` | planning |
| `docs/planning/2026-06-28-item4-family2-rebaseline-istruttoria.md` | planning |
| `docs/playtest/2026-06-23-pe-contestedness-orthogonality-n100.md` | playtest |
| `docs/reports/2026-06-22-drift-audit.md` | reports |
| `docs/reports/2026-06-22-gap1-trait-triage.md` | reports |
| `docs/reports/2026-06-22-trait-gate-audit.md` | reports |
| `docs/reports/2026-06-28-move-terrain-n40-evidence.md` | reports |
| `docs/superpowers/plans/2026-06-22-creature-trait-mechanics-engine-plan.md` | superpowers/plans |
| `docs/superpowers/plans/2026-06-22-derived-canon-salvage-roadmap.md` | superpowers/plans |
| `docs/superpowers/plans/2026-06-22-tkt-p6-trait-orphan-design-b-execution.md` | superpowers/plans |
| `docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-impl-plan.md` | superpowers/plans |
| `docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-plan.md` | superpowers/plans |
| `docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md` | superpowers/specs |
| `docs/superpowers/specs/2026-06-22-od024-engine2-stamina-fatigue-design.md` | superpowers/specs |
| `docs/superpowers/specs/2026-06-23-move-terrain-cost-substrate-design.md` | superpowers/specs |
| `docs/superpowers/specs/2026-06-23-volo-grade-percreature-design.md` | superpowers/specs |

> **Pattern**: anche il drift-audit precedente (`docs/reports/2026-06-22-drift-audit.md`) è non-registrato. Il processo di creazione artefatti sprint non include il passo di registrazione.

### 2.2 GOVERNANCE_STALE_DOC — 1 doc (P2)

| Path | Review scaduta | Azione |
|---|---|---|
| `docs/qa/2026-04-25-museum-validation.md` | 2026-06-24 (5d fa) | Bump `last_verified` (owner) — NON auto-fix (last_verified < 90d) |

### 2.3 BRANCH_STALE — 1 branch (P2)

| Branch | Ultimo commit | Età | PR open |
|---|---|---|---|
| `chore/weekly-drift-audit-2026-05-18` | 2026-05-18 | 41d | Nessuna |

Presumibilmente merged ma non cancellato. Auto-delete branch non attivo per questo PR (o PR mai aperto).

---

## P3 — Dormant BACKLOG tickets

Ticket senza commit PR >30d, owner/design-gated (non bloccanti):

| Ticket | Stato | Gate |
|---|---|---|
| `TKT-ER6-CARRYOVER` | P3 OPEN | N=40 + master-dd |
| `TKT-SIM-PROBE-ENTROPY` | P3 OPEN | Investigazione RNG |
| `TKT-ENCOUNTER-CLI` | P3 OPEN | Verdetto master-dd scope M3 |
| `TKT-P6-AP3` | ✅ CLOSED 2026-07-04 | Reclassify-as-ultimate (master-dd verdict): cost_ap:3 = ultimate tier legale, Overcharge-gated (SoT 90 §7.1). Band-neutral. |

---

## Auto-fix changelog

Nessun auto-fix applicato:
- `last_verified` bump >90d: **0 candidati** (campagna governance 2026-06-21 ha bumped tutto)
- `git mv` handoff >45d: **0 candidati** (campagna governance ha ri-committato gli April/May docs)
- Branch delete stale: **non auto-fix** (per policy, richiede owner)
- Registry add: **non auto-fix** (richiede metadata completo)

---

## Suggested next actions

| Priorità | Azione | Owner | Effort |
|---|---|---|---|
| P2 | Registrare i 25 doc sprint 2026-06-22/28 in `docs_registry.json` (`tools/docs_governance_migrator.py`) | Claude / master-dd | ~30min |
| P2 | Bump `last_verified` `docs/qa/2026-04-25-museum-validation.md` + review_cycle raise | master-dd | triviale |
| P2 | Eliminare branch `chore/weekly-drift-audit-2026-05-18` (merged, orfano) | master-dd | triviale |
| P3 | Process fix: includere registrazione registry nel passo di chiusura sprint (hook o checklist) | governance | ~1h |
| P3 | Decidere TKT-ENCOUNTER-CLI (scope M3 vs defer) | master-dd | — |

### Root-cause pattern

I 25 doc non-registrati emergono dallo stesso pattern: durante sprint intensi, i doc vengono creati con frontmatter corretto ma senza aggiornamento atomico del registry. La campagna governance (2026-06-21, #2914) ha azzerato il debito storico; questo audit mostra il debito che si accumula di nuovo in una sola settimana. **Fix strutturale consigliato**: aggiungere `python tools/check_docs_governance.py` al pre-commit hook (oggi gira solo in CI) oppure includere `docs_governance_migrator.py` nel DoD sprint-close.

---

## Remediation applicata (2026-06-29, finalize PR #3058)

Dispositions decise da master-dd (AskUserQuestion) ed eseguite in questa PR:

| Finding | Verdetto | Azione |
|---|---|---|
| GOVERNANCE_UNREGISTERED | Register all | **33 doc registrati** in `docs_registry.json` (text-surgical, append-only 429 righe). Conteggio salito da 25 (snapshot audit) a 33: nel frattempo main ha aggiunto ~8 doc sprint 06-28/29 + questo stesso report. Cadenza `review_cycle_days: 90` per tutti (tier spec/design/planning/playtest/reports), **NON** il default 14d del migrator (anti-treadmill, lifecycle SoT). Migrator `populate-registry` scartato: scope-creep (aggiungeva doc oltre i 33) + crash cp1252 + cadenza 14d. |
| GOVERNANCE_STALE_DOC | Bump + raise cadence | `docs/qa/2026-04-25-museum-validation.md`: `last_verified -> 2026-06-29`, `review_cycle_days 60 -> 90` (frontmatter + registry). Record datato coerente; 90d = tier draft (uccide il sub-tier treadmill). |
| BRANCH_STALE | Delete | `chore/weekly-drift-audit-2026-05-18` cancellato (PR #2327 MERGED 2026-05-19, tip ancestor-of-main = safe). |

Esito governance: `check_docs_governance --strict` **errors=0, warnings=0** (era warnings=34). Nessun `frontmatter_registry_mismatch` (i 33 sono non-SoT).

Note di processo: nessun cambio di cadenza system-wide -- il treadmill qui NON e' la cadenza dell'audit settimanale (scan read-only) ma il process-gap "registry non aggiornato atomicamente alla creazione del doc sprint". Il fix strutturale (registry-step nel DoD sprint-close) resta P3 owner-gated.

---

*Generato da governance-illuminator schedulato -- 2026-06-29; remediation finalize 2026-06-29.*
