---
title: Evo-Tactics · Hub Documentale
description: Raccolta normalizzata dei materiali Evo-Tactics con log degli interventi di integrazione.
tags:
  - evo-tactics
  - documentazione
  - integrazione
updated: 2025-11-12
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
| [`reports/integration-log.md`](reports/integration-log.md) | Registro puntuale delle attività di integrazione, incluse le normalizzazioni DOC-01/02/03 e i follow-up previsti. |

## Processi operativi

- **Validator e script**: consulta [`incoming/docs/yaml_validator.py`](../../incoming/docs/yaml_validator.py)
  e [`incoming/docs/auto_eval_from_yaml.py`](../../incoming/docs/auto_eval_from_yaml.py) per controllare i dataset.
- **Template Obsidian**: il vault suggerito è disponibile in
  [`incoming/docs/obsidian_template.md`](../../incoming/docs/obsidian_template.md).
- **Telemetria**: la base YAML per gli encounter è in
  [`incoming/docs/bioma_encounters.yaml`](../../incoming/docs/bioma_encounters.yaml) ed è coerente con gli output del
  pack Evo-Tactics (`docs/evo-tactics-pack/catalog_data.json`).

## Collegamenti rapidi

- Indice generale della documentazione: [`docs/INDEX.md`](../INDEX.md).
- Archivio dei materiali preliminari: [`docs/archive/evo-tactics/`](../archive/evo-tactics/).
- Piano di integrazione meccaniche: [`incoming/README_INTEGRAZIONE_MECCANICHE.md`](../../incoming/README_INTEGRAZIONE_MECCANICHE.md).

## Registro interventi

| Data | Azione | Note |
| --- | --- | --- |
| 2025-11-12 | Ristrutturazione contenuti `guides/` | Sostituiti i placeholder con sezioni descrittive, esempi compilabili e riferimenti al pack Evo-Tactics. |
| 2025-11-12 | Aggiornamento hub documentale | Navigazione rivista, riferimenti incrociati aggiornati e collegamento al nuovo archivio dedicato. |
| 2025-11-12 | Riordino archivio storico | Spostato il placeholder originale in `../archive/evo-tactics/README.md` mantenendo le note contestuali. |
| 2025-11-10 | Normalizzazione contenuti `guides/` | Conversione markdown dei template PTPF e della visione strutturale. |
| 2025-11-10 | Aggiornamento hub documentale | Sostituzione del placeholder iniziale con struttura navigabile e metadata. |
| 2025-11-10 | Archiviazione placeholder storico | Spostato il testo originale in `../archive/evo-tactics/README.md`. |

Annota qui ogni modifica futura, includendo numero attività e follow-up necessario.
