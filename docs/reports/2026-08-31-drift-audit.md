---
title: Drift Audit 2026-08-31
date: 2026-08-31
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-08-31
source_of_truth: false
language: it
---

# Drift Audit 2026-08-31

## TL;DR

| Categoria | Totale | P0 | P1 | P2 |
|-----------|--------|----|----|-----|
| SPRINT_STALE | 1 | — | 1 | — |
| STALE_ADR | 2 | — | 2 | — |
| PR_ROT | 7 | — | — | 7 |
| HANDOFF_STALE | 89 | — | — | 89 |
| BACKLOG (spot check) | — | — | — | — |
| Governance errors | 0 | — | — | — |
| Governance warnings | 254 | — | — | 254 |

**Totali**: P0=0 · P1=3 · P2=350+  
**Auto-fix applicati**: 89 handoff git mv → `docs/archive/historical-snapshots/planning-handoffs/`  
**Remediation PR**: aperto su branch `chore/weekly-drift-audit-2026-08-31`

---

## Findings P1

### SPRINT_STALE

| Campo | Valore |
|-------|--------|
| File | `CLAUDE.md` § Sprint context |
| Ultimo aggiornamento | 2026-07-04 |
| Età | **58 giorni** (soglia: 14) |
| Azione suggerita | master-dd aggiorna il pointer al handoff più recente; nessun auto-fix (soggettivo) |

> Sprint context punta a `2026-07-04-tkt-p6-ap3-closure-handoff.md`. La sessione più recente in main è 2026-07-14. Aggiornare manualmente.

---

### STALE_ADR (×2)

| ADR | Status | Ultimo commit | Età |
|-----|--------|---------------|-----|
| `ADR-2026-07-10-sistema-action-symmetry.md` | proposed | 2026-07-10 | **52 giorni** |
| `ADR-2026-07-14-worldgen-data-model.md` | proposed | 2026-07-14 | **48 giorni** |

Entrambi > 14 giorni in `proposed` senza avanzamento. Azione suggerita: master-dd delibera → `accepted` o `rejected`. Nessun auto-fix (ADR status vietato).

---

## Findings P2

### PR_ROT (7 PR open)

| PR | Titolo | Draft | Creato | Età approx |
|----|--------|-------|--------|-----------|
| #3306 | fix(species): recover rovine_planari | No | 2026-07-14 | **48 gg** |
| #3308 | chore(governance): weekly drift audit 2026-07-20 | Sì | ~2026-07-20 | ~42 gg |
| #3309 | chore(governance): weekly drift audit 2026-07-27 | Sì | ~2026-07-27 | ~35 gg |
| #3310 | chore(governance): weekly drift audit 2026-08-03 | Sì | ~2026-08-03 | ~28 gg |
| #3311 | chore(governance): weekly drift audit 2026-08-10 | Sì | ~2026-08-10 | ~21 gg |
| #3312 | chore(governance): weekly drift remediation 2026-08-17 | Sì | ~2026-08-17 | ~14 gg |
| #3313 | chore(governance): weekly drift remediation 2026-08-24 | Sì | ~2026-08-24 | ~7 gg |

**Note:**
- `#3306`: non-draft, stato `mergeable_state: clean`, 4 commits, 24 file modificati. Recupero specie `rovine_planari` + ADR addendum. Sembra pronto ma abbandonato. Azione: master-dd review + merge o close.
- `#3308–#3313`: accumulo di 6 draft PR da audit settimanali precedenti non mergiati. Pattern sistemico: le PR di audit vengono aperte ma mai mergate né chiuse. Azione: master-dd mergia o chiude la corrente; le draft passate possono essere chiuse.

---

### HANDOFF_STALE (89 file → auto-fixed)

89 file in `docs/planning/*handoff*.md` senza commit da più di 45 giorni. Range date: 2026-04-24 → 2026-07-04.

**Auto-fix applicato in questo PR**: `git mv docs/planning/<N>-*handoff*.md docs/archive/historical-snapshots/planning-handoffs/` per tutti i 89 file. I file non sono registrati in `docs_registry.json` (planning docs esclusi dal registry) → nessun aggiornamento registry necessario.

Campione file mossi (10 di 89):

| File (origine) |
|----------------|
| `docs/planning/2026-04-24-session-handoff-compact.md` |
| `docs/planning/2026-04-25-content-sprint-handoff.md` |
| `docs/planning/2026-06-10-mega-session-closure-handoff.md` |
| `docs/planning/2026-06-17-session-handoff.md` |
| `docs/planning/2026-06-22-session-handoff.md` |
| `docs/planning/2026-06-29-session-handoff.md` |
| `docs/planning/2026-07-01-session-handoff.md` |
| `docs/planning/2026-07-02-session-handoff-w5-graded-close.md` |
| `docs/planning/2026-07-03-fase2c-grid-wiring-handoff.md` |
| `docs/planning/2026-07-04-tkt-p6-ap3-closure-handoff.md` |

---

### Governance warnings (254)

`python3 tools/check_docs_governance.py --strict` → `errors=0 warnings=254`. Nessun errore bloccante. I warning tipici sono `stale_document` (cadenza review scaduta) — campagna smaltimento stale già chiusa PR #2914 (362→0), ma il repo continua ad accumularne. Non è un'azione immediata per questo PR; suggerito un nuovo smaltimento batch in sessione dedicata.

---

## Auto-fix changelog

| Fix | Tipo | Commit |
|-----|------|--------|
| git mv 89 handoff docs → `docs/archive/historical-snapshots/planning-handoffs/` | HANDOFF_STALE | commit #2 di questo PR |
| Aggiunta report `docs/reports/2026-08-31-drift-audit.md` | report | commit #1 di questo PR |

---

## Suggested next actions

1. **SPRINT_STALE** (P1, ≤1 gg): master-dd aggiorna pointer CLAUDE.md § Sprint context → `docs/planning/2026-07-04-tkt-p6-ap3-closure-handoff.md` o handoff più recente.
2. **STALE_ADR x2** (P1, ≤7 gg): master-dd delibera su `ADR-2026-07-10` e `ADR-2026-07-14` → accepted/rejected. Entrambi sono `proposed` da 48-52 giorni.
3. **#3306** (P2, urgente): review + merge o close. Stato clean, nessun conflitto. Specie recuperate + ADR addendum. Pronto per merge se contenuto ok.
4. **PR audit accumulate (#3308-#3313)** (P2): chiudere le 5 draft più vecchie; mantienere solo la più recente (#3313) o la corrente (#this).
5. **Governance warnings=254** (info): batch smaltimento stale su sessione dedicata (strumento: `tools/check_docs_governance.py` + migrator).
