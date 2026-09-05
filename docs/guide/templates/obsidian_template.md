---
title: Evo-Tactics — Obsidian Template
description: Struttura vault Obsidian allineata ai materiali Evo-Tactics e alla guida PTPF.
tags:
  - template
  - obsidian
  - evo-tactics
updated: 2025-11-22
---

# Evo-Tactics — Obsidian Template

## 📂 Root Vault

- `archive/evo-tactics/guides/visione-struttura.md` → link ai core loop e blocchi principali (archivio ROL-03).
- `archive/evo-tactics/guides/template-ptpf.md` + seed [`guides/ptpf-seed-template.md`](../evo-tactics/guides/ptpf-seed-template.md) → moduli + tag `@TEMPLATE_CORE` (archivio ROL-03).
- `TELEMETRY_LOGS` → note YAML validate.
- `PLAYTEST_RESULTS` → snapshot + delta.

## 🧠 Note Template

```
# @NODE_NAME

## Invariant Core
- ...

## Elastic Range
- ...

## Linked Receipts
- [[linked idea 1]]
- [[test session 2]]
```

## 🛰️ Sincronizzazione

- Sync bidirezionale: GitHub → Obsidian (via plugin Obsidian Git).
- Modalità fallback: esportazione `.md` da repo `/docs`.

## 🔧 Riferimenti utili

- `docs/templates/obsidian_template.md` → base vault locale (questo file).
- `incoming/docs/yaml_validator.py` → validatore YAML.
- `incoming/docs/drift_check.js` → check pre-commit per incoerenze.
- `docs/archive/evo-tactics/guides/visione-struttura.md` → mappa relazioni moduli (archivio ROL-03).
- `incoming/docs/bioma_encounters.yaml` → tracciamento outcomes.

---

> Questo template garantisce coerenza con il PTPF e integra struttura, traccia e playtest in un unico ambiente locale. In caso di dubbi sui campi dati rimanda alla [scheda operativa trait](../../traits/traits_scheda_operativa.md) e alla [Guida Evo Tactics Pack v2](../../core/Guida_Evo_Tactics_Pack_v2.md).

**[END Obsidian Template]**
