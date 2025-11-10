---
title: Evo-Tactics · Hub Documentale
description: Raccolta normalizzata dei materiali Evo-Tactics con log degli interventi di integrazione.
tags:
  - evo-tactics
  - documentazione
  - integrazione
updated: 2025-11-10
---

# Evo-Tactics — Hub Documentale

Questa sezione consolida i contenuti provenienti dai pacchetti Evo-Tactics. Ogni file è stato verificato
contro le linee guida PTPF e collegato all'indice generale del repository.

## Documenti principali

| Percorso | Contenuto |
| --- | --- |
| [`guides/visione-struttura.md`](guides/visione-struttura.md) | Visione concettuale, struttura modulare ad anello e raccomandazioni PrimeTalk. |
| [`guides/template-ptpf.md`](guides/template-ptpf.md) | Template operativo PTPF per mantenere coerenza fra moduli e tracciamento drift. |
| [`reports/integration-log.md`](reports/integration-log.md) | Registro puntuale degli interventi e delle scelte di normalizzazione. |

## Strumenti correlati

- **Validator e script**: consulta [`incoming/docs/yaml_validator.py`](../../incoming/docs/yaml_validator.py)
  e [`incoming/docs/auto_eval_from_yaml.py`](../../incoming/docs/auto_eval_from_yaml.py) per controllare i dataset.
- **Template Obsidian**: il vault suggerito è disponibile in [`incoming/docs/obsidian_template.md`](../../incoming/docs/obsidian_template.md).
- **Telemetria**: la base YAML per gli encounter è in [`incoming/docs/bioma_encounters.yaml`](../../incoming/docs/bioma_encounters.yaml).

## Collegamenti rapidi

- Indice generale della documentazione: [`docs/INDEX.md`](../INDEX.md).
- Archivio dei materiali preliminari: [`docs/archive/`](../archive/).
- Piano di integrazione meccaniche: [`incoming/README_INTEGRAZIONE_MECCANICHE.md`](../../incoming/README_INTEGRAZIONE_MECCANICHE.md).

## Registro interventi

| Data | Azione | Note |
| --- | --- | --- |
| 2025-11-10 | Normalizzazione contenuti `guides/` | Conversione markdown dei template PTPF e della visione strutturale. |
| 2025-11-10 | Aggiornamento hub documentale | Sostituzione del placeholder iniziale con struttura navigabile e metadata. |
| 2025-11-10 | Archiviazione placeholder storico | Spostato il testo originale in `../archive/evo-tactics-readme-placeholder.md`. |

