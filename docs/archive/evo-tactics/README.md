---
title: Evo-Tactics · Hub Documentale
description: Raccolta normalizzata dei materiali Evo-Tactics con log degli interventi di integrazione.
tags:
  - evo-tactics
  - documentazione
  - integrazione
archived: true
updated: 2025-12-21
---

# Evo-Tactics — Hub Documentale

Questa sezione consolida i contenuti provenienti dai pacchetti Evo-Tactics,
allineandoli alle linee guida PTPF e ai riferimenti tecnici utilizzati dal pack
catalog (`docs/evo-tactics-pack/`). Ogni documento include metadati YAML,
collegamenti incrociati e note operative per favorire l'onboarding dei team di
design, telemetria e produzione.

## Documenti principali (archiviati)

I playbook 2025 sono stati archiviati a completamento di **ROL-03**. Utilizza le
copie storiche nella sezione `docs/archive/evo-tactics/guides/` oppure gli
snapshot inventario in `docs/incoming/archive/2025-12-19_inventory_cleanup/`.

| Percorso archivio                                                                                                  | Stato               |
| ------------------------------------------------------------------------------------------------------------------ | ------------------- |
| [`../archive/evo-tactics/guida-ai-tratti-1.md`](../archive/evo-tactics/guida-ai-tratti-1.md)                       | archiviato (ROL-03) |
| [`../archive/evo-tactics/guida-ai-tratti-2.md`](../archive/evo-tactics/guida-ai-tratti-2.md)                       | archiviato (ROL-03) |
| [`../archive/evo-tactics/guida-ai-tratti-3-database.md`](../archive/evo-tactics/guida-ai-tratti-3-database.md)     | archiviato (ROL-03) |
| [`../archive/evo-tactics/guida-ai-tratti-3-evo-tactics.md`](../archive/evo-tactics/guida-ai-tratti-3-evo-tactics.md) | archiviato (ROL-03) |
| [`../archive/evo-tactics/integrazioni-v2.md`](../archive/evo-tactics/integrazioni-v2.md)                           | archiviato (ROL-03) |
| [`../archive/evo-tactics/guides/codex-readme.md`](../archive/evo-tactics/guides/codex-readme.md)                   | archiviato (seed)   |
| [`../archive/evo-tactics/guides/ptpf-seed-template.md`](../archive/evo-tactics/guides/ptpf-seed-template.md)       | archiviato (seed)   |
| [`../archive/evo-tactics/guides/security-ops.md`](../archive/evo-tactics/guides/security-ops.md)                   | archiviato (ROL-03) |
| [`../archive/evo-tactics/guides/template-ptpf.md`](../archive/evo-tactics/guides/template-ptpf.md)                 | archiviato (ROL-03) |
| [`../archive/evo-tactics/guides/vision-and-structure-notes.md`](../archive/evo-tactics/guides/vision-and-structure-notes.md) | archiviato (seed)   |
| [`../archive/evo-tactics/guides/visione-struttura.md`](../archive/evo-tactics/guides/visione-struttura.md)         | archiviato (ROL-03) |

## Processi operativi

- **Validator e script**: consulta [`incoming/docs/yaml_validator.py`](../../incoming/docs/yaml_validator.py)
  e [`incoming/docs/auto_eval_from_yaml.py`](../../incoming/docs/auto_eval_from_yaml.py) per controllare i dataset.
- **Template Obsidian**: il vault suggerito è disponibile in
  [`templates/obsidian_template.md`](../templates/obsidian_template.md).
- **Telemetria**: la base YAML per gli encounter è in
  [`incoming/docs/bioma_encounters.yaml`](../../incoming/docs/bioma_encounters.yaml) ed è coerente con gli output del
  pack Evo-Tactics (`docs/evo-tactics-pack/catalog_data.json`).
- **Security & Ops**: per audit, rotazioni e incident response fai riferimento a
  [`docs/archive/evo-tactics/guides/security-ops.md`](../archive/evo-tactics/guides/security-ops.md)
  e ai report generati in `reports/security/`.

## Collegamenti rapidi

- Indice generale della documentazione: [`docs/INDEX.md`](../INDEX.md).
- Archivio dei materiali preliminari: [`docs/archive/evo-tactics/`](../archive/evo-tactics/).
- Registro integrazione (archivio): [`docs/archive/evo-tactics/integration-log.md`](../archive/evo-tactics/integration-log.md).
- Piano di integrazione meccaniche: [`incoming/README_INTEGRAZIONE_MECCANICHE.md`](../incoming/README_INTEGRAZIONE_MECCANICHE.md).

## Registro interventi

Il registro dettagliato delle attività è stato consolidato nell'archivio storico: consulta [`docs/archive/evo-tactics/integration-log.md`](../archive/evo-tactics/integration-log.md) per lo storico completo DOC-01/DOC-02/DOC-03. L'ultima voce registrata (2025-12-21 · ROL-03) conferma la verifica dei link di archivio e l'allineamento del tracker rollout dopo la chiusura dei playbook 2025.
