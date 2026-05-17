---
title: ERMES Codex Execution Brief
doc_status: draft
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-29
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/planning/2026-04-29-ermes-integration-plan.md
---

# ERMES Codex Execution Brief

## Missione

Installare e validare ERMES come prototype/lab isolato.

## Comandi

```bash
python ERMES_dropin_self_install/install_ermes.py --dry-run
python ERMES_dropin_self_install/install_ermes.py --apply
python prototypes/ermes_lab/ermes_sim.py --test
python prototypes/ermes_lab/ermes_sim.py --cli
python prototypes/ermes_lab/scoring.py --runs 25
```

## Guardrail

Non modificare runtime, combat, dataset canonici o Game-Database integration.

## Criteri di completamento

- `ermes_sim.py --test` PASS;
- `ermes_sim.py --cli` genera `outputs/latest_eco_pressure_report.json`;
- `scoring.py --runs 25` genera `outputs/experiment_results.csv`;
- nessun file fuori scope modificato.
