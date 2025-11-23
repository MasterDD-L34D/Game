# Pipeline SPECIES+BIOMES STANDARD (10 step)

Pipeline di riferimento per nuove coppie bioma/specie, basata sugli agenti definiti in `agents/agents_index.json` e sugli schemi dati del repo Game.

1. Kickoff e vincoli (coordinator)
   - Input (file reali): agent_constitution.md; docs/PIPELINE_TEMPLATES.md; data/core/biomes.yaml; data/core/species.yaml; data/core/traits/biome_pools.json; docs/trait_reference_manual.md
   - Output attesi: perimetro feature, mappa dipendenze tra bioma/specie/trait, checklist impatti su dataset globali
   - Rischio: Basso

2. Identità e lore (lore-designer)
   - Input (file reali): docs/biomes.md; docs/biomes/manifest.md; docs/20-SPECIE_E_PARTI.md; docs/hooks
   - Output attesi: descrizione narrativa del bioma, hook narrativi per specie native/collegate, tono e temi
   - Rischio: Medio

3. Modellazione bioma (biome-ecosystem-curator)
   - Input (file reali): data/core/biomes.yaml; data/core/biome_aliases.yaml; config/schemas/biome.schema.yaml; biomes/terraforming_bands.yaml; data/core/traits/biome_pools.json
   - Output attesi: scheda bioma con livelli ambientali, biome_tags e requisiti_ambientali, alias e bande di terrafoming, piano pool ambientali
   - Rischio: Alto

4. Trait ambientali (trait-curator)
   - Input (file reali): data/core/traits/biome_pools.json; data/core/traits/glossary.json; data/traits/index.json; data/traits/species_affinity.json; docs/trait_reference_manual.md; Trait Editor/docs/howto-author-trait.md
   - Output attesi: elenco trait ambientali/temporanei, proposte di nuovi trait o mapping slug, draft aggiornamento pool e glossary
   - Rischio: Alto

5. Specie collegate (species-curator)
   - Input (file reali): data/core/species.yaml; data/core/species/aliases.json; data/traits/species_affinity.json; docs/20-SPECIE_E_PARTI.md; output step 2-4
   - Output attesi: trait_plan e biome_affinity per specie native/collegate, note su sinergie/conflitti di trait
   - Rischio: Alto

6. Bilanciamento (balancer)
   - Input (file reali): output step 3-5; data/core/game_functions.yaml; docs/10-SISTEMA_TATTICO.md; docs/11-REGOLE_D20_TV.md
   - Output attesi: tuning valori numerici e curve di potere, script/linee guida per forme dinamiche o effetti condizionati
   - Rischio: Alto

7. Validazione cross-dataset (coordinator)
   - Input (file reali): output step 3-6; data/core/traits/biome_pools.json; data/core/species.yaml; data/core/biomes.yaml
   - Output attesi: report coerenza tra pool e trait_plan, verifica duplicati/conflitti, lista patch su dataset globali
   - Rischio: Medio

8. Asset e schede (asset-prep)
   - Input (file reali): assets/; docs/catalog/; docs/templates; output step 2-6
   - Output attesi: bozze card/illustrazioni e schede `.md` per bioma e specie, naming asset e riferimenti visivi
   - Rischio: Medio

9. Documentazione e archiviazione (archivist)
   - Input (file reali): output step 1-8; docs/trait_reference_manual.md; docs/biomes.md; docs/README.md
   - Output attesi: aggiornamenti documentazione e indici, archiviazione report di pipeline in docs/reports/
   - Rischio: Basso

10. Piano esecutivo (coordinator)
    - Input (file reali): output step 1-9; ops/ci/pipeline.md; Makefile
    - Output attesi: roadmap esecuzione, assegnazione task e check finali per merge/CI
    - Rischio: Basso
