# Golden Path – Bioma urbano allagato con missioni, specie e trait cognitivi

Feature: Pacchetto di 3 missioni ambientate in un bioma urbano allagato, con 2 nuove specie e 4 trait cognitivi.

Pipelines specifiche da combinare: SPECIE+BIOMI (per bioma e specie), TRAIT (per i trait cognitivi), supporto Dev-Tooling per check/schema.

---

### Golden Path – Bioma urbano allagato

0. Kickoff
   - Agente principale: coordinator
   - Input: agent_constitution.md; agent.md; router.md; docs/pipelines/GOLDEN_PATH.md; docs/PIPELINE_TEMPLATES.md; agents/agents_index.json; dataset core di riferimento (data/core/biomes.yaml, data/core/species.yaml, data/core/traits/biome_pools.json)
   - Output: perimetro feature (missioni, bioma allagato, 2 specie, 4 trait cognitivi); mappa dataset impattati; scelta pipeline SPECIE+BIOMI + TRAIT; rischi preliminari
   - Rischio: Basso

1. Design & Lore
   - Agente principale: lore-designer (supporto species-curator, biome-ecosystem-curator)
   - Input: docs/biomes.md; docs/species; docs/lore (se esistente); output Kickoff
   - Output: descrizione narrativa del bioma urbano allagato, hook per 3 missioni, concept delle 2 specie e dei 4 trait cognitivi; draft lore in sandbox (es. docs/biomes/<slug>\_lore.md, docs/species/<slug>\_concept.md)
   - Rischio: Medio

2. Modellazione dati (traits/species/biomi)
   - Agente principale: trait-curator (con species-curator, biome-ecosystem-curator)
   - Input: config/schemas/trait.schema.json; data/core/traits/glossary.json; data/traits/index.json; data/core/traits/biome_pools.json; data/core/species.yaml; data/traits/species_affinity.json; data/core/biomes.yaml; data/core/biome_aliases.yaml; biomes/terraforming_bands.yaml; output Fase 1
   - Output: draft pool per bioma allagato; 4 trait cognitivi strutturati (glossary/index); schede specie con trait_plan e biome_affinity; proposta aggiornamenti bioma/alias/terraform band in sandbox (docs/traits/...\_draft.md, docs/species/...\_draft.md, docs/biomes/...\_biome.md)
   - Rischio: Alto

3. Bilanciamento
   - Agente principale: balancer
   - Input: docs/10-SISTEMA_TATTICO.md; docs/11-REGOLE_D20_TV.md; data/core/game_functions.yaml; draft trait_plan/specie/bioma e pool da Fase 2
   - Output: range numerici per specie (HP/Armor/Resist/attacchi), pesi di difficoltà per missioni, limiti stacking trait cognitivi, note su hazard allagato; sandbox in docs/balance/<slug>\_balance_draft.md
   - Rischio: Alto

4. Validazione cross-dataset
   - Agente principale: coordinator
   - Input: data/core/traits/biome_pools.json; data/core/biomes.yaml; data/core/biome_aliases.yaml; data/traits/index.json; data/core/traits/glossary.json; data/core/species.yaml; data/traits/species_affinity.json; balance draft; output precedenti
   - Output: report di coerenza (slug duplicati, trait_plan ↔ pool ↔ bioma, hazard/terraform band); patch_proposte sandbox in docs/reports/<slug>\_validation_report.md
   - Rischio: Medio

5. Asset & catalogo
   - Agente principale: asset-prep
   - Input: assets/; docs/catalog/; draft bioma/specie/pool/missioni; naming standard da docs/templates
   - Output: naming asset per bioma, missioni e specie; schede catalogo `.md` sandbox in docs/catalog/<slug>\_assets_draft.md; template card/illustrazioni
   - Rischio: Medio

6. Documentazione & archiviazione
   - Agente principale: archivist
   - Input: output fasi 0–5; docs/biomes.md; docs/trait_reference_manual.md; README/doc index
   - Output: appendici bioma/trait/specie in bozza; changelog/release note in docs/reports/<slug>\_archivist_final.md; aggiornamenti indice biomi/specie (sandbox)
   - Rischio: Basso

7. Piano esecutivo & patchset
   - Agente principale: coordinator (supporto dev-tooling)
   - Input: docs/pipelines/GOLDEN_PATH.md; output fasi 0–6; schema/CI instructions (Makefile, ops/ci/pipeline.md)
   - Output: execution_plan in docs/pipelines/<slug>\_execution_plan.md con ordine patch (pool→bioma→trait→specie→affinity→game_functions→docs); patchset sandbox in docs/reports/<slug>\_patchset_sandbox.md; comando di apply + check schema/lint/test
   - Rischio: Medio

Note: tutti gli step vanno eseguiti con PIPELINE_EXECUTOR in STRICT MODE / SANDBOX fino all’applicazione patch finale.
