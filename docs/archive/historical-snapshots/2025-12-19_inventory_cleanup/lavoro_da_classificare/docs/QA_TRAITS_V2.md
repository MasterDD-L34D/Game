---
title: Evo-Tactics · Guida ai Tratti (Parte 2)
description: Approfondimento su governance dei tratti, migrazione v2.1 e controllo
  qualità del pacchetto Evo-Tactics.
tags:
  - evo-tactics
  - traits
updated: 2025-11-11
---

# QA Checklist — Traits/Species v2

- UCUM ok: tutte le `metrics[].unit` usano simboli UCUM.
- Schema ok: ajv passa su traits/species.
- Sinergie/Conflitti coerenti: nessun conflitto presente tra i `trait_refs` della stessa specie.
- Testabilità: ogni tratto ha `observable` e `scene_prompt`.
- ENVO: quando utile, URI in `applicability.envo_terms[]`.
- Versioning: `version` SemVer + `versioning.{created,updated,author}`.
- Cataloghi aggiornati: `species_catalog.json` e `traits_aggregate.json`.
