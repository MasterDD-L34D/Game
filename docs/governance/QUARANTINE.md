---
title: Quarantine Registry
doc_status: active
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: true
language: it
review_cycle_days: 7
---

# Quarantine Registry

Registro file/area in lavorazione su branch non-main. Scopo: avvisare main e coder del main che determinati file sono in modifica attiva altrove → coordinare per evitare conflitti e duplicati.

## Policy

**Quando aggiungere entry:**

- Apri un branch di lavoro (es. `explore/*`, `feat/*`, `refactor/*`) che modificherà file/area per **> 48h** o **> 5 file**
- Apri PR DRAFT subito (anche se lavoro incompleto) → visibilità diff sul main
- Aggiorna questo file con nuova entry in **§ Active Quarantines**

**Quando rimuovere entry:**

- PR mergiata → sposta in **§ Resolved** con data + link PR + commit hash
- Branch abbandonato → sposta in **§ Resolved** con nota "abandoned"

**Regola per chi lavora sul main:**

1. Prima di modificare file elencati in **§ Active Quarantines**, controlla entry:
   - Contatta owner via PR comment o issue
   - Se fix urgente (security/prod incident) → procedi e notifica owner
   - Altrimenti attendi merge o coordina split
2. Dopo merge main → se tocca file quarantinato, notifica owner per rebase

**CI (futuro)**: pre-commit hook su main che warning se staged file è in `Active Quarantines` (non blocca, solo warning).

## Active Quarantines

### Q-001 · Open Questions Triage + Idee Non Implementate

- **Branch**: `explore/open-questions-triage`
- **PR**: #1463 (ready)
- **Owner**: @MasterDD-L34D (assisted by Claude Code agent)
- **Start**: 2026-04-17
- **Ready-for-review**: 2026-04-17
- **Approved**: 2026-04-17 (tutte 11 decisioni T1+T2+T3 chiuse)
- **ETA merge**: imminent (waiting PR conversion draft→ready)
- **Reason**: Lavoro sistematico su SoT §19 proposte (9🟡) + idee non implementate (Colyseus, Accessibility, Replay, Difficulty settings, Persona validation) + **audit gap implementativo di tutti i docs nuovi/modificati dal 2026-04-15** (core, ADR, hubs, balance, appendici) per identificare cosa manca tra descrizione e implementazione reale
- **Files/Areas potenzialmente toccate**:
  - `docs/core/00-SOURCE-OF-TRUTH.md` (§16, §18, §19)
  - `docs/adr/` (nuovi ADR per networking, accessibility)
  - `docs/planning/` (proposte, roadmap item)
  - `docs/architecture/` (se servono diagrammi/spec)
  - `packages/contracts/schemas/` _(solo additive: nessun breaking change)_
  - `apps/backend/routes/session.js` _(solo se replay endpoint richiesto — coord. richiesto)_
  - `services/ai/` _(no touch, pilastro 5 stabile)_
- **Non-quarantine (safe to edit su main)**:
  - `services/rules/*`
  - `services/generation/*`
  - `data/core/traits/*`
  - `data/core/species/*`
  - Ogni sprint feature indipendente

## Resolved

_(nessuna entry ancora)_

## Template entry

```markdown
### Q-NNN · <Titolo breve>

- **Branch**: `<branch-name>`
- **PR**: #NNNN
- **Owner**: @<github-user>
- **Start**: YYYY-MM-DD
- **ETA**: YYYY-MM-DD
- **Reason**: <perché serve quarantena>
- **Files/Areas potenzialmente toccate**: <lista path>
- **Non-quarantine (safe to edit su main)**: <path esplicitamente sicuri>
```
