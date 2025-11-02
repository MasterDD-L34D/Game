---
name: 'Proposta trait'
about: 'Suggerisci un nuovo tratto o una revisione importante'
title: '[Trait] <titolo conciso>'
labels: ['trait', 'needs-triage']
assignees: []
---

## Contesto

- Pacchetto o iniziativa di riferimento:
- Owner di design / revisore:
- Collegamenti a canvas, documenti o ticket correlati:

## Descrizione del tratto

- Nome/ID proposto (`snake_case`):
- Macro-tipologia e sottotipo:
- Tier previsto:
- Slot occupati:
- Sinergie richieste (ID esistenti):
- Conflitti previsti (ID esistenti):

## Motivazione

- Obiettivo narrativo/tattico:
- Gap o problema che il tratto risolve:
- Metriche di successo attese (pick-rate, coverage, ecc.):

## Impatti e dipendenze

- File o sistemi da aggiornare (indice, glossary, env traits, ecc.):
- Dati PI/species coinvolti:
- Check QA richiesti (baseline, coverage, audit, CLI smoke, ecc.):

## Conformità guida stile

- [ ] Label e descrizioni mappate su chiavi i18n `i18n:traits.<id>.campo`
- [ ] Tier, slot e `slot_profile` allineati con la nomenclatura condivisa
- [ ] Requisiti ambientali con `meta.tier`/`meta.notes` aggiornati e coerenti
- [ ] Eseguito `scripts/trait_style_check.js` e allegati i report rilevanti
- [ ] Suggerimenti "Applicabili" dell'editor gestiti (applicati o motivati)

## KPI & report

- [ ] Rigenerato `tools/py/styleguide_compliance_report.py` (JSON/Markdown allegati)
- [ ] KPI sotto SLA commentati con piano di rientro oppure confermati dal reviewer
- [ ] Bridge `logs/qa/latest-dashboard-metrics.json` aggiornato quando necessario

## Allegati

- [ ] Mockup o reference visivi allegati
- [ ] Log di validazione (`build_trait_index`, `report_trait_coverage`, `trait_audit`)
- [ ] Note di playtest / telemetria
