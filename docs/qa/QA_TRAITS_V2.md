---
title: QA Checklist — Traits/Species v2
doc_status: draft
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# QA Checklist — Traits/Species v2

- UCUM ok: tutte le `metrics[].unit` usano simboli UCUM.
- Schema ok: ajv passa su traits/species.
- Sinergie/Conflitti coerenti: nessun conflitto presente tra i `trait_refs` della stessa specie.
- Testabilità: ogni tratto ha `observable` e `scene_prompt`.
- ENVO: quando utile, URI in `applicability.envo_terms[]`.
- Versioning: `version` SemVer + `versioning.{created,updated,author}`.
- Cataloghi aggiornati: `species_catalog.json` e `traits_aggregate.json`.
