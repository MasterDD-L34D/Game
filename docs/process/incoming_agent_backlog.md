---
title: Incoming Pipeline — Piano di lavoro agentico (archiviato)
doc_status: superseded
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Incoming Pipeline — Piano di lavoro agentico (archiviato)

> **Backlog archiviato il 2026-04-14.** Tutte le 13 voci originali sono state
> classificate DEAD o DONE durante il triage. Il contenuto integrale e il report
> di triage con motivazione voce per voce sono in
> [`docs/archive/historical-snapshots/2026-04-14_incoming_backlog.md`](../archive/historical-snapshots/2026-04-14_incoming_backlog.md).

## Perché è stato archiviato

L'iniziativa "Incoming Review settimanale / Support Hub / agenti `AG-*`" è stata
avviata con la sessione di kickoff del 2025-10-29 ed ha prodotto 3 sessioni di
review (`docs/process/incoming_review_log.md`: 2025-10-29, 2025-10-30, 2025-11-13)
prima di interrompersi. Cinque mesi dopo il triage del 2026-04-14 ha rilevato:

- nessuna nuova sessione di review da novembre 2025;
- cron `incoming_review_weekly` mai configurato;
- diverse reference citate non esistono nel repo (`docs/checklist/incoming_triage.md`,
  `logs/incoming_triage_agenti.md`, `compat_map.json`, `telemetry/vc.yaml`,
  `telemetry/pf_session.yaml`, `reports/incoming/sessione-2025-11-*/`,
  `reports/incoming/latest/`, `incoming/archive/INDEX.md`);
- l'unico task ancora rilevante (Task #6, regression check sui validator in CI)
  è già **DONE**: `ci.yml` lines 184/315/318/355 invocano già
  `validate_species.js`, `game_cli.py validate-datasets`,
  `validate-ecosystem-pack`, e i workflow dedicati `validate_traits.yml`,
  `data-quality.yml`, `schema-validate.yml` coprono lo stesso perimetro.

## Cosa fare al posto di consultare questo file

- Per il workflow attivo della pipeline incoming, vedi
  [`docs/process/incoming_triage_pipeline.md`](incoming_triage_pipeline.md).
- Per il registro storico delle sessioni di review, vedi
  [`docs/process/incoming_review_log.md`](incoming_review_log.md).
- Per il backlog originale congelato e il triage completo, vedi lo
  [snapshot di archivio](../archive/historical-snapshots/2026-04-14_incoming_backlog.md).

Se in futuro emerge la necessità di rilanciare la pipeline incoming agentica,
**non aggiornare questo file**: aprire un nuovo backlog con un'iniziativa
sponsor chiara e un owner attivo.
