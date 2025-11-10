---
title: Evo-Tactics · Hub Documentale
description: Raccolta normalizzata dei materiali Evo-Tactics con log degli interventi di integrazione.
tags:
  - evo-tactics
  - documentazione
  - integrazione
updated: 2025-11-14
---

# Evo-Tactics — Hub Documentale

Questa sezione consolida i contenuti provenienti dai pacchetti Evo-Tactics,
allineandoli alle linee guida PTPF e ai riferimenti tecnici utilizzati dal pack
catalog (`docs/evo-tactics-pack/`). Ogni documento include metadati YAML,
collegamenti incrociati e note operative per favorire l'onboarding dei team di
design, telemetria e produzione.

## Documenti principali

| Percorso | Contenuto |
| --- | --- |
| [`guides/visione-struttura.md`](guides/visione-struttura.md) | Sintesi della visione di prodotto, dei pilastri tattici e della struttura ad anello che governa missioni, specie e loop di gioco. |
| [`guides/template-ptpf.md`](guides/template-ptpf.md) | Template operativo PTPF con sezioni compilabili, esempi pratici e checklist di qualità per i deliverable Evo-Tactics. |
| [`guides/security-ops.md`](guides/security-ops.md) | Playbook Security & Ops con workflow CI, audit locali e rotazione credenziali. |

## Processi operativi

- **Validator e script**: consulta [`incoming/docs/yaml_validator.py`](../../incoming/docs/yaml_validator.py)
  e [`incoming/docs/auto_eval_from_yaml.py`](../../incoming/docs/auto_eval_from_yaml.py) per controllare i dataset.
- **Template Obsidian**: il vault suggerito è disponibile in
  [`incoming/docs/obsidian_template.md`](../../incoming/docs/obsidian_template.md).
- **Telemetria**: la base YAML per gli encounter è in
  [`incoming/docs/bioma_encounters.yaml`](../../incoming/docs/bioma_encounters.yaml) ed è coerente con gli output del
  pack Evo-Tactics (`docs/evo-tactics-pack/catalog_data.json`).
- **Security & Ops**: per audit, rotazioni e incident response fai riferimento a
  [`guides/security-ops.md`](guides/security-ops.md) e ai report generati in
  `reports/security/`.

## Collegamenti rapidi

- Indice generale della documentazione: [`docs/INDEX.md`](../INDEX.md).
- Archivio dei materiali preliminari: [`docs/archive/evo-tactics/`](../archive/evo-tactics/).
- Registro integrazione (archivio): [`docs/archive/evo-tactics/integration-log.md`](../archive/evo-tactics/integration-log.md).
- Piano di integrazione meccaniche: [`incoming/README_INTEGRAZIONE_MECCANICHE.md`](../../incoming/README_INTEGRAZIONE_MECCANICHE.md).

## Registro interventi

Il registro dettagliato delle attività è stato consolidato nell'archivio storico: consulta [`docs/archive/evo-tactics/integration-log.md`](../archive/evo-tactics/integration-log.md) per lo storico completo DOC-01/DOC-02/DOC-03. L'ultima voce registrata (2025-11-13 · DOC-02) documenta l'estensione di `docs/INDEX.md` con il playbook Security & Ops.
