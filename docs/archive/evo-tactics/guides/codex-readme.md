---
title: Evo-Tactics — Game Design Codex (seed)
description: Sommario seed dei materiali Evo-Tactics con puntamento alle guide consolidate nel repository.
tags:
  - evo-tactics
  - ptpf
  - documentation
archived: true
updated: 2025-11-22
---

# Evo-Tactics — Game Design Codex (seed)

> Sistema narrativo evolutivo con drift lock, telemetria VC e design modulare. Usa questo indice come promemoria veloce e rimanda ai documenti consolidati nel repository.

## 📁 Contenuti principali

- 🧭 [Visione & Struttura Generale (archivio)](../../archive/evo-tactics/guides/visione-struttura.md)
- 🧬 [Template PTPF Game Design (archivio)](../../archive/evo-tactics/guides/template-ptpf.md) con seed storico ([ptpf-seed](ptpf-seed-template.md)).
- 📈 [Dataset telemetria/bioma](../../../incoming/docs/bioma_encounters.yaml) e validator YAML ([incoming/docs/yaml_validator.py](../../../incoming/docs/yaml_validator.py)).
- ♻️ [Integrazioni Evo v2](../integrazioni-v2.md) e log storico (`docs/archive/evo-tactics/integration-log.md`).

## 🔧 Repository Tools & Scripts

- `docs/templates/obsidian_template.md` → base per vault locale
- `incoming/docs/yaml_validator.py` → validatore YAML
- `incoming/docs/drift_check.js` → check pre-commit per incoerenze
- `docs/structure_overview.md` → mappa relazioni moduli
- `incoming/docs/bioma_encounters.yaml` → tracciamento outcomes

## 📚 Framework

- Design System: PrimeTalk PTPF (repo upstream)
- Drift & Tracking: EchoWake Modules (v2.0)
- Compatibility: GitBook, Obsidian, Docusaurus ready

## 🚀 Setup consigliato

1. Clona il repo
2. Aggiungi il tuo vault Obsidian a `/docs`
3. Attiva GitHub Pages o GitBook per visualizzazione documentazione
4. Collega la telemetria sezione `/telemetry` a playtest runtime

⸻

**[END README · Evo-Tactics Codex]**
