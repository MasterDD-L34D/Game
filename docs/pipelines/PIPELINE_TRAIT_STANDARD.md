---
title: PIPELINE_TRAIT_STANDARD.md
doc_status: draft
doc_owner: flow-team
workstream: flow
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# PIPELINE_TRAIT_STANDARD.md

Pipeline Ufficiale di Curatela Trait -- Evo Tactics

Questa pipeline descrive il processo completo, standardizzato e multi-agente
per l'analisi, normalizzazione, migrazione e documentazione dei trait di
qualsiasi famiglia (locomotivo, difensivo, cognitivo, ambientale, ecc.).

## Layout dati corrente (ground-truth 2026-06-21)

- **Valori effetti**: vivono SOLO in `data/core/traits/active_effects.yaml`.
  Mai hardcodare un effetto nel resolver.
- **Label/glossario**: `data/core/traits/glossary.json`.
- **Bilanciamento meccanico**: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`.
- **Index trait**: `data/traits/index.json`.
- **Affinita' specie-trait**: `data/traits/species_affinity.json`.
- **Sorgenti per-famiglia**: `data/traits/<famiglia>/*.json`
  (es. `data/traits/cognitivo/`, `data/traits/difensivo/`, ...).
- **Schema canonico**: `schemas/evo/trait.schema.json` (NON piu'
  `config/schemas/trait.schema.json`, che resta solo come copia legacy).
- **Pool ambientali per bioma**: `data/core/traits/biome_pools.json`.

## Comandi di validazione

```
npm run schema:lint
npm run style:check
python3 tools/py/game_cli.py validate-datasets
npm run sync:evo-pack
pytest tests/scripts/test_trace_hashes.py
node --test tests/scripts/sync_evo_pack_assets.test.js
```

> **Nota canon-enforcement**: i derivati del pack (catalogo, index) sono
> generati da `npm run sync:evo-pack` e portano il marker DO-NOT-EDIT; non
> editarli a mano. Modifica le sorgenti (`active_effects.yaml`, `glossary.json`,
> `trait_mechanics.yaml`, `data/traits/<famiglia>/`) e rigenera.

---

# PIPELINE TRAIT -- Schema Ufficiale

## 1. Audit e validazione dataset

**Agente:** Trait Curator
**Input:**

- `data/traits/<famiglia>/*.json`
- `data/traits/index.json`
- `data/traits/species_affinity.json`
- `schemas/evo/trait.schema.json`
- `data/core/traits/glossary.json`
- `data/core/traits/active_effects.yaml`

**Output:**

- Validazione schema (`npm run schema:lint`)
- Errori glossario
- Duplicati / legacy
- Note sinergie/conflitti mancanti

**Rischio:** Medio

---

## 2. Proposta di normalizzazione e mapping slug

**Agente:** Trait Curator
**Input:**

- Report audit (step 1)
- `apps/trait-editor/docs/howto-author-trait.md`
- `docs/traits/trait_reference_manual.md`

**Output:**

- Piano mapping per slug e famiglie
- Check-list per aggiornamenti glossary e valori `active_effects.yaml`

**Rischio:** Alto

---

## 3. Consolidamento catalogo e draft aggiornamento

**Agente:** Trait Curator
**Input:**

- Mapping (step 2)
- Dataset per-famiglia + `data/traits/index.json`
- `data/traits/species_affinity.json`

**Output:**

- Draft inventario aggiornato
- Note per Trait Editor su sinergie/slot
- Elenco file sorgente da modificare (mai i derivati)

**Rischio:** Medio

---

## 4. Allineamento specie collegate

**Agente:** Species Curator
**Input:**

- `data/traits/species_affinity.json`
- `data/core/species/<id>_lifecycle.yaml` (sorgente per-specie) +
  `data/core/species/species_catalog.json` (aggregato, sola lettura;
  il monolite `data/core/species.yaml` e' stato rimosso, #2271)
- Mapping slug (step 2)

**Output:**

- Piano aggiornamento specie (editare la sorgente per-specie, mai il catalogo derivato)
- Note onboarding

**Rischio:** Medio

---

## 5. Revisione impatti su biomi e pool

**Agente:** Biome & Ecosystem Curator
**Input:**

- mapping slug e biome_tags
- `data/core/traits/biome_pools.json`

**Output:**

- Report copertura biomi
- Note pool aggiornati
- Draft requisiti ambientali

**Rischio:** Medio

---

## 6. Piano di migrazione end-to-end

**Agente:** Coordinator
**Input:**

- Output step 3-5
- `schemas/evo/trait.schema.json` + `data/core/traits/glossary.json`

**Output:**

- Roadmap migrazione
- Task per agenti
- Impatti cross-dataset

**Rischio:** Basso

---

## 7. Documentazione e archiviazione

**Agente:** Archivist
**Input:**

- Roadmap Coordinator
- Report curatori

**Output:**

- Aggiornamento `docs/traits/trait_reference_manual.md`
- Archiviazione report in `docs/reports/`
- Nuovi doc in `docs/` -> frontmatter + registry
  (`python tools/check_docs_governance.py --strict`)

**Rischio:** Basso

---

## 8. Supporto tooling (opzionale)

**Agente:** Dev-Tooling
**Input:**

- Necessita' emerse
- Script in `scripts/` (es. `scripts/trait_audit.py`,
  `scripts/trait_style_check.js` via `npm run style:check`)

**Output:**

- Script validazione batch
- Script sostituzione slug
- README operativo

**Rischio:** Basso

---

# Come usare questa pipeline

Per qualsiasi famiglia di trait, avvia la pipeline con il comando agent
(Codex STRICT MODE, vedi `AGENTS.md`):

```
COMANDO: PIPELINE_TRAIT_REFACTOR
Famiglia: <nome-famiglia>
```

Chiudi sempre con `npm run schema:lint` + `npm run sync:evo-pack` prima del merge.
