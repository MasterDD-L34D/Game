# PIPELINE_TRAIT_STANDARD.md

Pipeline Ufficiale di Curatela Trait – Evo Tactics

Questa pipeline descrive il processo completo, standardizzato e multi-agente
per l’analisi, normalizzazione, migrazione e documentazione dei trait
di qualsiasi famiglia (locomotivo, difensivo, cognitivo, ambientale, ecc.).

---

# PIPELINE TRAIT – Schema Ufficiale

## 1. Audit e validazione dataset

**Agente:** Trait Curator  
**Input:**

- data/traits/<famiglia>/\*.json
- data/traits/index.json
- data/traits/species_affinity.json
- config/schemas/trait.schema.json
- data/core/traits/glossary.json

**Output:**

- Validazione schema
- Errori glossario
- Duplicati / legacy
- Note sinergie/conflitti mancanti

**Rischio:** Medio

---

## 2. Proposta di normalizzazione e mapping slug

**Agente:** Trait Curator  
**Input:**

- Report audit (step 1)
- Trait Editor/docs/howto-author-trait.md
- docs/trait_reference_manual.md

**Output:**

- Piano mapping per slug e famiglie
- Check-list per aggiornamenti glossario e locali

**Rischio:** Alto

---

## 3. Consolidamento catalogo e draft aggiornamento

**Agente:** Trait Curator  
**Input:**

- Mapping (step 2)
- Dataset
- Indice e affinità esistenti

**Output:**

- Draft inventario aggiornato
- Note per Trait Editor su sinergie/slot
- Elenco file da modificare

**Rischio:** Medio

---

## 4. Allineamento specie collegate

**Agente:** Species Curator
**Input:**

- species_affinity.json
- species.yaml
- Mapping slug

**Output:**

- Piano aggiornamento specie
- Note onboarding

**Rischio:** Medio

---

## 5. Revisione impatti su biomi e pool

**Agente:** Biome & Ecosystem Curator  
**Input:**

- mapping slug e biome_tags
- data/core/traits/biome_pools.json

**Output:**

- Report copertura biomi
- Note pool aggiornati
- Draft requisiti ambientali

**Rischio:** Medio

---

## 6. Piano di migrazione end-to-end

**Agente:** Coordinator  
**Input:**

- Output step 3–5
- Schema/glossario

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

- Aggiornamento trait_reference_manual.md
- Aggiornamento traits_quicklook.csv
- Archiviazione report

**Rischio:** Basso

---

## 8. Supporto tooling (opzionale)

**Agente:** Dev-Tooling  
**Input:**

- Necessità emerse
- Script in tools/traits

**Output:**

- Script validazione batch
- Script sostituzione slug
- README operativo

**Rischio:** Basso

---

# Come usare questa pipeline

Per qualsiasi famiglia di trait →  
Avvia la pipeline con:

COMANDO: PIPELINE_TRAIT_REFACTOR
Famiglia: <nome-famiglia>
