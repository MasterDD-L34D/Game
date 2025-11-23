# Pipeline SPECIE+BIOMI – Frattura Abissale Sinaptica

1. Kickoff e vincoli cross-dataset
   - Agente: coordinator
   - Input (file reali): docs/PIPELINE_TEMPLATES.md; agent_constitution.md; data/core/biomes.yaml; data/core/species.yaml; data/core/traits/biome_pools.json; docs/trait_reference_manual.md
   - Output: perimetro feature, mappa dipendenze specie/bioma/trait, checklist impatti su dataset globali
   - Rischio: Basso

2. Bozza lore e identità bioma "Frattura Abissale Sinaptica"
   - Agente: lore-designer
   - Input (file reali): docs/biomes.md; docs/biomes/manifest.md; docs/hooks; docs/20-SPECIE_E_PARTI.md
   - Output: descrizione narrativa dei tre livelli (cresta fotofase, soglia crepuscolare, frattura nera), ganci narrativi per correnti elettroluminescenti e per le 4 specie
   - Rischio: Medio

3. Modellazione tecnica del bioma e alias
   - Agente: biome-ecosystem-curator
   - Input (file reali): data/core/biomes.yaml; data/core/biome_aliases.yaml; config/schemas/biome.schema.yaml; biomes/terraforming_bands.yaml; data/core/traits/biome_pools.json
   - Output: scheda bioma con tre livelli ambientali e relative biome_tags/requisiti_ambientali, alias e bande di terrafoming, piano pool ambientali per ciascun livello
   - Rischio: Alto

4. Definizione correnti elettroluminescenti e pool/trait ambientali
   - Agente: trait-curator
   - Input (file reali): data/core/traits/biome_pools.json; data/core/traits/glossary.json; data/traits/index.json; data/traits/species_affinity.json; docs/trait_reference_manual.md; Trait Editor/docs/howto-author-trait.md
   - Output: elenco trait ambientali per ciascun livello (correnti temporanee, effetti su slot), proposte di nuovi trait o mapping slug, draft aggiornamento pool e glossary
   - Rischio: Alto

5. Progettazione delle 4 specie collegate
   - Agente: species-curator
   - Input (file reali): data/core/species.yaml; data/core/species/aliases.json; data/traits/species_affinity.json; docs/20-SPECIE_E_PARTI.md; outputs step 2-4
   - Output: trait_plan e biome_affinity per Polpo Araldo Sinaptico, Sciame di Larve Neurali, Leviatano Risonante, Simbionte Corallino Riflesso; note su sinergie/conflitti di trait comportamentali e ambientali
   - Rischio: Alto

6. Bilanciamento numerico e forma dinamica
   - Agente: balancer
   - Input (file reali): outputs step 3-5; data/core/game_functions.yaml; docs/10-SISTEMA_TATTICO.md; docs/11-REGOLE_D20_TV.md
   - Output: tuning dei valori (HP, danni, slot, curve di potere) per specie e livelli bioma; script di variazione forma per Leviatano Risonante in base alla fase del bioma; raccomandazioni su effetti di buff/debuff elettroluminescenti
   - Rischio: Alto

7. Validazione cross-pool e coerenza dataset
   - Agente: coordinator
   - Input (file reali): outputs step 3-6; data/core/traits/biome_pools.json; data/core/species.yaml; data/core/biomes.yaml
   - Output: report coerenza tra pool ambientali e trait_plan specie, verifica duplicati/conflitti, lista patch necessarie su dataset globali (species, pool, traits)
   - Rischio: Medio

8. Asset e schede visual
   - Agente: asset-prep
   - Input (file reali): assets/; docs/catalog/; docs/templates; outputs step 2-6
   - Output: bozze di card/illustrazioni per bioma e specie, aggiornamenti schede `.md` in docs/catalog/, naming asset e riferimenti per implementazione
   - Rischio: Medio

9. Documentazione finale e archiviazione
   - Agente: archivist
   - Input (file reali): outputs step 1-8; docs/trait_reference_manual.md; docs/biomes.md; docs/README.md
   - Output: update log della pipeline, appendici in docs/biomes.md e trait_reference_manual.md, archiviazione decisioni in docs/reports/
   - Rischio: Basso

10. Piano esecutivo e handoff
    - Agente: coordinator
    - Input (file reali): outputs step 1-9; ops/ci/pipeline.md; Makefile
    - Output: roadmap esecuzione step-by-step, assegnazione task agli agenti, segnalazione impatti su CI/tooling, checklist per merge finale
    - Rischio: Basso
