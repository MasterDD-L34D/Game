---
title: Drift Audit 2026-07-06
date: 2026-07-06
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-07-06
source_of_truth: false
language: it
---

# Drift Audit 2026-07-06

## TL;DR

| Categoria | Count | Severity |
|---|---|---|
| GOVERNANCE_WARN_STALE | 2 | P1 |
| GOVERNANCE_WARN_UNREGISTERED | 32 | P1 |
| DORMANT (backlog >30d, nessun commit ref) | 3 | P2 |
| BRANCH_STALE (>30d, no open PR) | 9+ | P2 |
| STALE_TICKET | 0 | — |
| STALE_ADR | 0 | — |
| PR_ROT (>7d no update) | 0 | — |
| HANDOFF_STALE (>45d git date) | 0 | — |
| CI_RED | 0 | — |
| SPRINT_STALE | 0 | — |

**Totale P0: 0 · P1: 34 · P2: 12+**

Nessun auto-fix eseguibile → report-only branch. 34 governance warnings pre-esistenti su main (32 `unregistered_document` da sprint giugno, 2 `stale_document`).

---

## Checklist eseguita

### 1. BACKLOG drift

Nessun STALE_TICKET trovato. Tutti i PR referenziati come ✅ risultano merged su main; le righe 🟡 OPEN non referenziano PR merged.

**DORMANT** (>30 giorni senza commit ref):

| Ticket | Descrizione | Motivo dormancy |
|---|---|---|
| `TKT-WORLDGEN-GAPC` | meta-network → campaign routing (fase-4 grammar Dormans) | POST-MVP, nessun PR in mesi |
| `TKT-KEEPER-CONTENT-DEBT` | ~138/173 keeper-stub senza specie reale | P2, nessun PR, owner-gated |
| `TKT-KEEPER-VALIDATOR-SCOPE` | validate-ecosystem-pack hardcoda 4 biome-dir | P3, nessun PR, deferred |

### 2. ADR proposed staleness

Nessun ADR con status `proposed` o `draft`. Tutti i file hanno status `accepted`, `active`, o `superseded`. **Pulito.**

### 3. Frontmatter governance

`python3 tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict`
→ **exit 0**, errors=0, **warnings=34** (pre-esistenti su main).

**Stale documents (2):**

| Path | Scadenza | Note |
|---|---|---|
| `docs/qa/2026-04-25-museum-validation.md` | 2026-06-24 | scaduta da 12 giorni; last_verified=2026-04-25 (72 gg fa, sotto soglia auto-fix 90 gg) |
| `docs/planning/2026-06-20-session-handoff.md` | 2026-07-04 | scaduta da 2 giorni |

**Unregistered documents (32):** tutti aggiunti tra 2026-06-22 e 2026-06-29, non inseriti nel registry. Pattern: sprint giugno ha prodotto molti doc in `docs/planning/`, `docs/reports/`, `docs/superpowers/`, `docs/playtest/` senza aggiornamento atomico del registry.

<details>
<summary>Lista completa (32 file)</summary>

```
docs/planning/2026-06-22-missing-kit-traits-proposal.md
docs/planning/2026-06-22-retired-creatures-salvage-proposal.md
docs/planning/2026-06-22-session-handoff.md
docs/planning/2026-06-22-tkt-p6-b-reground-correction.md
docs/planning/2026-06-22-tkt-p6-b-resolution-status.md
docs/planning/2026-06-22-tkt-p6-trait-orphan-design-b-istruttoria.md
docs/planning/2026-06-23-derived-canon-salvage-progress.md
docs/planning/2026-06-23-residual-gate-register.md
docs/planning/2026-06-23-slot-profile-backfill-proposal.md
docs/planning/2026-06-28-gap2-next-block-mechanics-proposal.md
docs/planning/2026-06-28-item4-family2-rebaseline-istruttoria.md
docs/planning/2026-06-29-derived-canon-reproducibility-arc-handoff.md
docs/planning/2026-06-29-gap2-block3-mechanics-proposal.md
docs/planning/2026-06-29-session-handoff.md
docs/playtest/2026-06-23-pe-contestedness-orthogonality-n100.md
docs/reports/2026-06-22-drift-audit.md
docs/reports/2026-06-22-gap1-trait-triage.md
docs/reports/2026-06-22-trait-gate-audit.md
docs/reports/2026-06-28-move-terrain-n40-evidence.md
docs/reports/2026-06-28-radici-band-evidence.md
docs/reports/2026-06-29-move-terrain-flip-prereqs-evidence.md
docs/reports/2026-06-29-volo-hazard-encounter-band-evidence.md
docs/superpowers/plans/2026-06-22-creature-trait-mechanics-engine-plan.md
docs/superpowers/plans/2026-06-22-derived-canon-salvage-roadmap.md
docs/superpowers/plans/2026-06-22-tkt-p6-trait-orphan-design-b-execution.md
docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-impl-plan.md
docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-plan.md
docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
docs/superpowers/specs/2026-06-22-od024-engine2-stamina-fatigue-design.md
docs/superpowers/specs/2026-06-23-move-terrain-cost-substrate-design.md
docs/superpowers/specs/2026-06-23-volo-grade-percreature-design.md
docs/superpowers/specs/2026-06-29-hazard-terrain-encounter-volo-exercise-design.md
```

</details>

Nessun auto-fix: bulk-register 32 voci = operazione non-triviale con rischio metadata errati → lista solo in report.

### 4. CLAUDE.md sprint context

Sprint context più recente: **2026-07-04** (TKT-P6-AP3 closure handoff). Età: 2 giorni. **Non stale** (soglia 14 gg).

CI su main: ultimo run `ci.yml` = **2026-07-05T22:06Z** → `conclusion: success` (PR #3216 merge). **CI GREEN.**

### 5. Handoff docs staleness

Tutti i file `docs/planning/*handoff*.md` hanno ultimo commit git su `origin/main` ≤ **2026-06-23** (governance sweep). Età git: ≤ 13 giorni. **Nessun HANDOFF_STALE** (soglia 45 gg per git date).

### 6. Open PR rot

| PR | Titolo | Ultimo update |
|---|---|---|
| [#3217](https://github.com/MasterDD-L34D/Game/pull/3217) | feat(combat): budget-aware LOS repositioning | 2026-07-05 (<1g) |
| [#3215](https://github.com/MasterDD-L34D/Game/pull/3215) | fix(combat): authz on round routes + AP cost | 2026-07-05 (<1g) |
| [#3214](https://github.com/MasterDD-L34D/Game/pull/3214) | fix(session): honest active_unit semantics | 2026-07-05 (<1g) |
| [#3196](https://github.com/MasterDD-L34D/Game/pull/3196) | chore: daily tracker index refresh (automation) | 2026-07-05 (1g) |

Tutti aggiornati entro 7 giorni. **Nessun PR_ROT.**

### 7. Stale remote branches

Branch `claude/`, `aa01/`, `auto/`, `autoresearch/`, `chore/` con ultimo commit >30 giorni e nessun open PR (top 9 verificati, ulteriori aa01/* stimati stale dallo stesso sprint 2026-04-25):

| Branch | Ultimo commit (verificato) | Età (gg) |
|---|---|---|
| `aa01/cap-02-tracking-commit` | 2026-04-25 | 72 |
| `aa01/cap-07-terrain-reactions-wire` | 2026-04-25 | 72 |
| `aa01/cap-13-imprint-mockup` | 2026-04-25 | 72 |
| `auto/mission-console-dist-2026-05-10-1919` | 2026-05-10 | 57 |
| `autoresearch/coop-broadcast-debrief-payload` | 2026-05-15 | 52 |
| `autoresearch/coop-broadcast-debrief-payload-v2` | 2026-05-15 | 52 |
| `chore/weekly-drift-audit-2026-06-01` | 2026-06-01 | 35 |
| `claude/phasec-bundle-slice-1-2-3` | 2026-06-01 | 35 |
| `claude/phasec-pack-command` | 2026-06-01 | 35 |

Nota: altri ~10 branch `aa01/*` (cap-03, cap-04, cap-06, cap-11, cap-12, cap-14, cap-15…) dallo stesso sprint aprile 2026 → probabile totale stale >15. Non verificati individualmente per limiti API.

---

## Auto-fix changelog

Nessun auto-fix eseguito. Criteri auto-fix non soddisfatti:

| Criterio | Verifica | Esito |
|---|---|---|
| `last_verified` bump su doc >90 gg | `docs/qa/2026-04-25-museum-validation.md` = 72 gg | < 90 gg → NO |
| `git mv` handoff >45 gg | tutti ≤ 13 gg (git date) | < 45 gg → NO |
| Registry path typos | 0 trovati | NO |

Unica azione amministrativa eseguita: registrazione di `docs/reports/2026-07-06-drift-audit.md` in `docs/governance/docs_registry.json` per non aggiungere un nuovo warning.

---

## Findings P1

### Stale documents (2)

| File | Scadenza | Azione |
|---|---|---|
| `docs/qa/2026-04-25-museum-validation.md` | 2026-06-24 | Bump `last_verified` (a 90 gg dal 25-Apr sarà auto-fix il 2026-07-24) |
| `docs/planning/2026-06-20-session-handoff.md` | 2026-07-04 | Bump `last_verified` oppure archive se sessione chiusa |

### Unregistered documents (32)

Tutti i file di `docs/planning/`, `docs/reports/`, `docs/superpowers/`, `docs/playtest/` creati tra 2026-06-22 e 2026-06-29 mancano dal registry. Lista completa in §3 sopra.

**Root cause**: sprint 22-29 giugno ha prodotto molti doc senza aggiornamento atomico del registry (`docs_registry.json`). Docs governance check passava (warning non-bloccante) ma il debito si è accumulato.

---

## Findings P2

### Dormant backlog items (3)

| Ticket | Priorità | Owner | Azione suggerita |
|---|---|---|---|
| `TKT-WORLDGEN-GAPC` | POST-MVP | master-dd | Confermare defer esplicito o chiudere con `won't-do` |
| `TKT-KEEPER-CONTENT-DEBT` | P2 | master-dd | Confermare debito accettato (no-sprint attuale) |
| `TKT-KEEPER-VALIDATOR-SCOPE` | P3 | master-dd | Confermare deferred fino a keeper→specie reale |

### Stale branches (9+ verificati)

Vedi tabella §7. Azione consigliata (non autonoma): verificare che il lavoro sia su main → `git push origin --delete <branch>`. Richiede conferma master-dd.

---

## Suggested next actions

1. **P1 — Batch registry update** (alta priorità): registrare i 32 doc non-registrati in `docs_registry.json`. Operazione singola ~PR da 1 commit. Chiude 32 warnings.
2. **P1 — Stale docs bump**: aggiornare `last_verified` su `docs/qa/2026-04-25-museum-validation.md` e `docs/planning/2026-06-20-session-handoff.md`. PR da 2 file, triviale.
3. **P2 — Branch cleanup**: branch `aa01/*`, `auto/mission-console-*`, `autoresearch/*` sono candidati sicuri alla rimozione (tutti già su main). Richiedono conferma master-dd.
4. **P2 — DORMANT triage**: un commento master-dd su ciascuno dei 3 ticket chiude il loop senza lavoro di codice.
5. **Processo**: aggiungere `docs_governance_migrator.py --register <path>` al workflow standard di ogni PR che aggiunge doc con frontmatter → evita accumulo futuro.
