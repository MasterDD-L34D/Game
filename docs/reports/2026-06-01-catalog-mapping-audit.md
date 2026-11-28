---
title: 'Catalog mapping audit — biome / species / creature field→consumer→UI'
doc_status: active
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-01'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [audit, catalog, biome, species, creature, gate-5, engine-live-surface-dead]
---

# Catalog mapping audit (2026-06-01)

> Audit read-only del catalogo (biomi / specie / creature) per mappare ogni campo
> dati al suo **consumer runtime** e alla sua **superficie player** (Gate-5), e
> quantificare il debito "Engine LIVE / Surface DEAD" (museum card M-2026-04-26-018:
> _biomes.yaml 2/7 campi a runtime_). Prodotto dalla sessione coordinatrice GOAL
> (fan-out 4 agent read-only, workflow `catalog-audit-d4-investigate`).

Legenda status: **live** = consumer + superficie player · **partial** = consumer
ma superficie debole/assente o solo backend · **dead** = caricato dallo YAML, zero
consumer runtime.

## 1. Biomi — `data/core/biomes.yaml` (dead: 6 campi-classe)

| Campo                          | Consumer                                                     | Superficie player                          | Status  |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------ | ------- |
| `diff_base`                    | biomeModifiers.getBiomeModifiers → hp_mult + pressure_init  | HP nemici + Sistema tier più alti          | live    |
| `affixes`                      | biomeSpawnBias.applyBiomeBias (spawn weighting)             | tipi nemici biome-appropriati              | live    |
| `npc_archetypes.primary/...`   | biomeSpawnBias (max_boost 3×) + initialAlienaTelemetry      | archetipi più frequenti nello spawn        | partial |
| `hazard.severity`              | biomeAdapter._derivePressure (W5 bucket) + tie-break        | descrittore pressure HUD (Godot)           | partial |
| `display_name_*` / `label`     | biomeAdapter.adaptBiome → W5 `biome_label_it`               | nome bioma nel chip HUD (resolve Godot)    | partial |
| `magnetic_field_strength`      | biomeResonance (trait magnetic_rift) — solo atollo_obsidiana | costo ricerca thought-cabinet ridotto      | partial |
| **`mod_biome`**                | **nessuno** (M-018: "non passato all'encounter generator")  | NONE                                       | dead    |
| **`hazard.stress_modifiers`**  | override keys leggibili ma chiavi arbitrarie, no mapping    | NONE                                       | dead    |
| **`stresswave.baseline`**      | **nessuno** (M-018: "StressWave è il livello mancante")     | NONE                                       | dead    |
| **`stresswave.escalation_rate`** | nessuno                                                   | NONE                                       | dead    |
| **`stresswave.event_thresholds`** | nessuno (no event-trigger wiring)                        | NONE                                       | dead    |
| **`narrative.tone`/`hooks`**   | nessuno (narrativeEngine inkjs non li consuma)              | NONE                                       | dead    |
| `legacy_slug` / `aliases`      | nessuno                                                     | NONE                                       | dead    |

**Wire spedito (questa sessione):** vedi §4 — endpoint diagnostico read-only che
espone il blocco `stresswave` + `hazard.stress_modifiers` + `narrative` (band-neutral).

**Wire combat candidato (NON spedito — band-verify obbligatorio):**
`stresswave.baseline → session.sistema_pressure init` (fold in
`getBiomeModifiers.pressure_initial_bonus`). RISCHIO: `rovine_planari` (bioma HC06/HC07)
ha `stresswave.baseline` → shift bande → richiede `calibrate_parallel.py` HC06/HC07
prima del merge. Deferred a un PR combat dedicato + band-verify.

## 2. Specie — `data/core/species/species_catalog.json` (dead: 10 campi)

| Campo                  | Consumer                                  | Superficie player           | Status  |
| ---------------------- | ----------------------------------------- | --------------------------- | ------- |
| `species_id`           | catalog / synergyDetector / traitEffects  | lookup specie (panels)      | live    |
| `sentience_index`      | vcScoring (fold)                          | VC scoring backend          | partial |
| `default_parts`        | slot.part combos → trait synergy          | combinazioni parti          | partial |
| `biome_affinity`       | spawn weighting                           | (non visibile)              | partial |
| `lifecycle_yaml`       | biome affinity bonus (indiretto)          | (non visibile)              | partial |
| `clade_tag`/`role_tags`| spawn bias / gameplay role                | (non visibile)              | partial |
| `visual_description`   | stored, ETL only                          | NONE (codexPanel = future)  | partial |
| **`scientific_name`**  | update_evo_pack_catalog / import (ETL)    | NONE                        | dead    |
| **`classification`**   | speciesBiomes / wikiLinkBridge (no render)| NONE                        | dead    |
| **`risk_profile`**     | nessuno runtime                           | NONE                        | dead    |
| **`interactions`**     | nessuno runtime                           | NONE                        | dead    |
| **`constraints`**      | nessuno runtime                           | NONE                        | dead    |
| **`pack_size`/`genus`/`epithet`/`source`/`_provenance`** | ETL/schema only | NONE             | dead    |

**Wire candidato:** `visual_description → codexPanel.js` species-detail prose card.
⚠️ **OWNED da #2536 (species-enrichment, migration attiva)** → NON toccato (collision-avoidance).

## 3. Creature (lifecycle / mutation) — (dead: 12 campi)

| Campo                                         | Consumer / Superficie                         | Status  |
| --------------------------------------------- | --------------------------------------------- | ------- |
| `mutation_catalog.id` / `unit.applied_mutations` | legacyRitualPanel checkbox (live)          | live    |
| `formEvolution.current_form_id/pe`            | formsPanel form eligibility                   | live    |
| `mutation.tier` / `body_slot`                 | formsPanel PE cost (parz.) / slot silent      | partial |
| `lifecycle.phases[*].id`                      | skivPanel ASCII card                           | partial |
| `lineage_id` / `inheritable_traits`           | offspringRitualPanel                          | partial |
| **`mutation.category`**                       | NONE (bingo grouping esiste backend, no UI)   | dead    |
| **`mutation.visual_swap` / `aspect_token`**   | NONE in formsPanel/characterPanel/skivPanel   | dead    |
| **`mutation.prerequisite` / `trigger_cond`**  | NONE play UI                                  | dead    |
| **`mutation.mp_cost`**                        | NONE (offspring ritual non mostra costo)      | dead    |
| **`lifecycle.phases[*].stadi`**               | NONE (stadium gates non sorfacciati)          | dead    |
| **`lifecycle.mbti_aspect_correlation`**       | NONE (characterPanel mostra MBTI ma non link) | dead    |
| **`mutation_grid` 3×3 (MHS)**                 | NONE (no grid UI — card M-2026-04-27-007)     | dead    |
| **`morphotype_bias`**                         | NONE (char-creation morphotype bias)          | dead    |
| **bingo `passive_token`**                     | NONE in creature detail                       | dead    |

**Wire candidato:** `mutation.category` raggruppamento + bingo 3-of-kind → formsPanel
(MHS gene-grid pattern, card M-2026-04-27-007). Deferred (Godot surface, owned cross-repo).

## 4. Wire spedito — endpoint diagnostico biome stress-profile

`GET /api/combat/biome-stress-profile/:id` (singolo bioma, 404 se ignoto) +
`GET /api/combat/biome-stress-profiles` (tutti) — read-only, band-neutral. Espongono i
campi `stresswave` (baseline/escalation_rate/event_thresholds) + `hazard.{severity,stress_modifiers}`
+ `narrative.{tone,hooks}` + `npc_archetypes` — oggi caricati ma invisibili. Registrati in
`apps/backend/routes/combat.js` (sibling di `/api/combat/biome-modifiers`, pattern A6).
Superficie Gate-5 = debug endpoint (player/dev legge il profilo stress di un bioma). Zero
impatto combat (sola lettura) → band-neutral by construction. Vedi PR collegata.

## 5. Sintesi debito

| Dimensione | Campi dead | Wire candidato top                         | Ownership      |
| ---------- | ---------- | ------------------------------------------ | -------------- |
| Biomi      | 6          | stresswave→pressure (combat, band-verify)  | libero         |
| Specie     | 10         | visual_description→codexPanel              | #2536 (OWNED)  |
| Creature   | 12         | mutation.category→formsPanel (gene-grid)   | Godot cross-repo |

Pattern dominante confermato (museum M-018): il livello dati biomi/creature è molto
più ricco di quanto il runtime consumi. Riuso raccomandato: A6 readonly-diagnostic
(band-neutral, basso rischio) per sorfacciare incrementalmente; i wire combat
(stresswave→pressure) richiedono band-verify dedicata.
