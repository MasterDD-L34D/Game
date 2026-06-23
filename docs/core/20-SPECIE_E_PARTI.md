---
title: Specie & Parti
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-05-06'
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Specie & Parti

- **Slot**: locomotion / offense / defense / senses / metabolism.
- **Budget**: `weight_budget` per specie, warning a ≥90%. Cap res/DR secondo `global_rules`.
- **Sinergie & Ibridi**: vedi `catalog.synergies` e `legal_hybrids` in `data/core/species.yaml`.
- **Counter**: `global_rules.counters_reference` elenca counter e parti coinvolte.
- **Validator**: `tools/py` e `tools/ts` verificano budget, parti esistenti, sinergie note, biomi/affissi validi, ruoli spawn, VC, nest profile.

📄 **Catalogo**: vedi `data/core/species.yaml` (v0.3, esteso cross-canvas).

**Bestiario creature-domain** (lore + render LoRA, HITL approvato): [lore canonizzata](../species/creature-domain-bestiary.md) (65 schede) + [schede asset](../catalog/creature-domain-bestiary_assets_draft.md) (render v2/v2b + coda restyle 10 @LoRA 0.4).
