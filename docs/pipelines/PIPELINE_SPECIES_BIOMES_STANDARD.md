# PIPELINE SPECIE + BIOMI – Standard Ufficiale Evo Tactics

Pipeline ufficiale per progettare, modellare, bilanciare e documentare
un nuovo bioma complesso e le sue specie collegate.

Questa pipeline gestisce feature biologiche avanzate, in cui:
- un bioma ha più livelli ambientali o fasi dinamiche,
- le specie hanno trait ambientali e comportamentali complessi,
- esiste un ecosistema di pool, alias e interazioni cross-dataset.

---

## 1. Kickoff e vincoli cross-dataset
**Agente:** Coordinator  
**Input:**  
- docs/PIPELINE_TEMPLATES.md  
- agent_constitution.md  
- data/core/biomes.yaml  
- data/core/species.yaml  
- data/core/traits/biome_pools.json  
- docs/trait_reference_manual.md  
**Output:**  
- perimetro della feature  
- mappa dipendenze specie/bioma/trait  
- checklist impatti su dataset globali  
**Rischio:** Basso  

---

## 2. Bozza lore e identità del nuovo bioma
**Agente:** Lore Designer  
**Input:**  
- docs/biomes.md  
- docs/biomes/manifest.md  
- docs/hooks  
- docs/20-SPECIE_E_PARTI.md  
**Output:**  
- descrizione narrativa del bioma  
- livelli ambientali/fasi  
- ganci narrativi per le specie collegate  
**Rischio:** Medio  

---

## 3. Modellazione tecnica del bioma
**Agente:** Biome & Ecosystem Curator  
**Input:**  
- data/core/biomes.yaml  
- data/core/biome_aliases.yaml  
- config/schemas/biome.schema.yaml  
- biomes/terraforming_bands.yaml  
- data/core/traits/biome_pools.json  
**Output:**  
- scheda tecnica del bioma  
- biome_tags + requisiti_ambientali  
- alias del bioma  
- draft pool ambientali  
**Rischio:** Alto  

---

## 4. Definizione trait ambientali e pool dinamici
**Agente:** Trait Curator  
**Input:**  
- data/core/traits/biome_pools.json  
- data/core/traits/glossary.json  
- data/traits/index.json  
- data/traits/species_affinity.json  
- docs/trait_reference_manual.md  
- Trait Editor/docs/howto-author-trait.md  
**Output:**  
- trait ambientali del bioma  
- nuovi trait / mapping slug  
- aggiornamenti a pool o glossary  
**Rischio:** Alto  

---

## 5. Progettazione delle specie associate
**Agente:** Species Curator  
**Input:**  
- data/core/species.yaml  
- data/core/species/aliases.json  
- data/traits/species_affinity.json  
- docs/20-SPECIE_E_PARTI.md  
- output step 2–4  
**Output:**  
- trait_plan specie  
- biome_affinity  
- sinergie/conflitti  
**Rischio:** Alto  

---

## 6. Bilanciamento numerico e varianti dinamiche
**Agente:** Balancer  
**Input:**  
- output step 3–5  
- data/core/game_functions.yaml  
- docs/10-SISTEMA_TATTICO.md  
- docs/11-REGOLE_D20_TV.md  
**Output:**  
- tuning HP/danni/slot  
- script eventuali cambi forma/abilità dinamiche  
- effetti di buff/debuff ambientali  
**Rischio:** Alto  

---

## 7. Validazione cross-pool e coerenza dataset
**Agente:** Coordinator  
**Input:**  
- output step 3–6  
- data/core/traits/biome_pools.json  
- data/core/species.yaml  
- data/core/biomes.yaml  
**Output:**  
- report coerenza  
- lista patch dataset globali  
**Rischio:** Medio  

---

## 8. Asset e schede visual
**Agente:** Asset Prep  
**Input:**  
- assets/  
- docs/catalog/  
- docs/templates/  
- output step 2–6  
**Output:**  
- bozze card/specie/bioma  
- naming asset coerente  
- schede `.md` aggiornate  
**Rischio:** Medio  

---

## 9. Documentazione e archiviazione
**Agente:** Archivist  
**Input:**  
- output step 1–8  
- docs/trait_reference_manual.md  
- docs/biomes.md  
**Output:**  
- appendici aggiornate  
- update trait_reference_manual  
- update biomes.md  
- archiviazione report in docs/reports/  
**Rischio:** Basso  

---

## 10. Piano esecutivo e handoff finale
**Agente:** Coordinator  
**Input:**  
- output step 1–9  
- ops/ci/pipeline.md  
- Makefile  
**Output:**  
- roadmap esecuzione  
- assegnazione task agenti  
- checklist merge finale  
**Rischio:** Basso  

