---
title: Drift Audit 2026-08-24
date: 2026-08-24
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-08-24
source_of_truth: false
language: it
---

# Drift Audit 2026-08-24

## TL;DR

| Sev | Count | Note |
| --- | --- | --- |
| P0  | 0 | -- |
| P1  | 4 | 4 stale ADR Proposed >14gg (no auto-fix, decisione owner) |
| P2  | ~90 | 89 handoff stale >45gg + 4 audit-PR precedenti open |

Auto-fix: **17 handoff mv** (10 apr + 7 mag, NON in registry -> safe). Restanti 72 handoff stale = registry-linked, richiedono sync manuale (out-of-scope weekly).

PR remediation: `chore(governance): weekly drift remediation 2026-08-24` (link fondo).

## Findings

### P1 (STALE_ADR — Proposed >14gg, decisione owner-gated)

| ADR | Status | Note |
| --- | --- | --- |
| `ADR-2026-05-15-species-catalog-schema-fork-resolution.md` | proposed | schema fork specie, ~100gg |
| `ADR-2026-05-18-df-levels-integration-direction.md` | proposed | DF-levels integrazione, ~98gg |
| `ADR-2026-05-18-sistema-persistent-state-learning.md` | proposed | Sistema persistent-state, ~98gg |
| `ADR-2026-07-14-worldgen-data-model.md` | proposed | worldgen data-model, ~41gg |
| `ADR-2026-07-10-sistema-action-symmetry.md` | proposed | Sistema action-symmetry, ~45gg |

**NB**: NEVER auto-fix ADR status (constraint). Verdetto master-dd necessario (accepted / rejected / superseded).

### P2 (HANDOFF_STALE — >45gg)

Totale 89 handoff con filename-date >45gg. Auto-fix mv applicato a **17 non-registry-linked** (10 apr + 7 mag). Restanti **72 registry-linked** = tenuti in `docs/planning/`, richiedono registry-sync (out-of-scope weekly, TKT candidato).

Top per anzianita' (marginali):

| Age | File | Registry |
| --- | --- | --- |
| 122gg | `2026-04-24-session-handoff-compact.md` | no -> mv apr |
| 121gg | `2026-04-25-*` (5 handoffs) | mix |
| 120gg | `2026-04-26-*` (2 handoffs) | mix |
| 119gg | `2026-04-27-sprint-*` (10 handoffs) | mix |
| 51-54gg | `2026-06-30..2026-07-04` (~28 handoffs) | mostly-yes |

### P2 (PR_ROT — audit-PR precedenti open)

| PR | Titolo | Note |
| --- | --- | --- |
| #3308 | weekly drift audit 2026-07-20 | draft, >30gg |
| #3309 | weekly drift audit 2026-07-27 | draft, >27gg |
| #3310 | weekly drift audit 2026-08-03 | draft, >21gg |
| #3311 | weekly drift audit 2026-08-10 | draft, ~14gg |
| #3312 | weekly drift remediation 2026-08-17 | draft, ~7gg |

Suggerimento: chiudere / mergiare / rebase la coda audit-PR prima di aprirne di nuove (routine da 5-6 settimane su main non ratificato).

### Sanity checks (green)

- **CLAUDE.md sprint context**: aggiornato piu' volte in luglio 2026 (dati vivi, NON stale).
- **Frontmatter governance**: `check_docs_governance.py --strict` errors=0 warnings=241 (no P0).
- **docs con last_verified >90gg**: 0 (nessun bump auto-fix da fare).
- **BACKLOG stale-ticket**: verify-first ha confermato che i ticket con PR-ref recenti (#3113/#3115/#3118/#3199/#3200) risultano MERGED = coerenza BACKLOG post-fase 2c.
- **CI red on main >2gg**: NON verificato via `gh run list` (env: scope MCP GitHub read-only PR-focus; workflow `ci.yml` state=active). Assumere GREEN salvo notifica; da confermare a mano.

## Auto-fix changelog

| Azione | File | Categoria |
| --- | --- | --- |
| git mv | 10x `docs/planning/2026-04-*handoff*.md` -> `docs/archive/historical-snapshots/2026-04-planning-handoffs/` | HANDOFF_STALE |
| git mv | 7x `docs/planning/2026-05-*handoff*.md` -> `docs/archive/historical-snapshots/2026-05-planning-handoffs/` | HANDOFF_STALE |

**NON auto-fixato** (fuori scope weekly, decisione owner):

- 30+ handoff aprile-maggio registry-linked (richiedono registry-sync atomico).
- 28 handoff giugno-luglio marginalmente stale (attivamente referenziati da CLAUDE.md sprint-context).
- 5 ADR Proposed stale (verdetto master-dd: accepted / rejected / superseded).
- Audit-PR precedenti #3308-#3312 (decisione ownership: mergiare / chiudere / consolidare).
- 4 stale_document warnings governance (241 total, sotto soglia P0 -> workstream burn-down separato).

## Suggested next actions

1. **Chiudere/mergiare audit-PR backlog #3308-#3312** — 5 PR draft consecutivi = segnale che il routine e' auto-firing senza pickup owner. Consolidare in una sola remediation.
2. **Decidere 5 ADR Proposed** — 3 di maggio (~100gg) sono i piu' vecchi. Verdetto master-dd (accept / reject / superseded / rewrite).
3. **Registry-sync handoff-archive TKT** — aprire ticket dedicato per archivio 72 handoff registry-linked (script bulk-update JSON per path prefix `docs/planning/` -> `docs/archive/historical-snapshots/YYYY-MM-planning-handoffs/`).
4. **CI green-check** — confermare CI main via `gh run list --workflow=ci --limit 5` a mano (audit-tool non ha attualmente permesso di elencare workflow runs oltre a workflow metadata).

PR: (link inserito post-push)
