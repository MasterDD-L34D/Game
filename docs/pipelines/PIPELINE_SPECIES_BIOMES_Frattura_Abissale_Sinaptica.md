# Pipeline SPECIE+BIOMI ISTANZIATA – Frattura Abissale Sinaptica

Pipeline instanziata dal modello `docs/pipelines/PIPELINE_SPECIES_BIOMES_STANDARD.md` per il bioma complesso "Frattura Abissale Sinaptica" con tre livelli ambientali (cresta fotofase, soglia crepuscolare, frattura nera), correnti elettroluminescenti e quattro specie collegate (Polpo Araldo Sinaptico, Sciame di Larve Neurali, Leviatano Risonante, Simbionte Corallino Riflesso).

1. Kickoff e vincoli cross-dataset (coordinator)
   - Input (file reali): agent_constitution.md; docs/PIPELINE_TEMPLATES.md; docs/pipelines/PIPELINE_SPECIES_BIOMES_STANDARD.md; data/core/biomes.yaml; data/core/species.yaml; data/core/traits/biome_pools.json; docs/trait_reference_manual.md
   - Output attesi: perimetro della Frattura Abissale Sinaptica, mappa dipendenze tra i tre livelli bioma e le 4 specie, checklist impatti su dataset (species/traits/biome pools)
   - Rischio: Basso

2. Identità e lore (lore-designer)
   - Input (file reali): docs/biomes.md; docs/biomes/manifest.md; docs/20-SPECIE_E_PARTI.md; docs/hooks; output step 1
   - Output attesi: descrizione narrativa dei tre livelli (cresta fotofase, soglia crepuscolare, frattura nera), trattamento delle correnti elettroluminescenti, hook dedicati per le 4 specie collegate
   - Rischio: Medio

3. Modellazione bioma e livelli ambientali (biome-ecosystem-curator)
   - Input (file reali): data/core/biomes.yaml; data/core/biome_aliases.yaml; config/schemas/biome.schema.yaml; biomes/terraforming_bands.yaml; data/core/traits/biome_pools.json; output step 2
   - Output attesi: scheda bioma con tre livelli e relative biome_tags/requisiti_ambientali, alias/terraforming bands, piano pool ambientali distinti per livello e note sulle correnti elettroluminescenti
   - Rischio: Alto

4. Trait ambientali e correnti elettroluminescenti (trait-curator)
   - Input (file reali): data/core/traits/biome_pools.json; data/core/traits/glossary.json; data/traits/index.json; data/traits/species_affinity.json; docs/trait_reference_manual.md; Trait Editor/docs/howto-author-trait.md; output step 3
   - Output attesi: elenco trait ambientali e temporanei per ogni livello (correnti che alterano slot/trait), proposta di nuovi slug o mapping nel glossary, draft aggiornamento pool per cresta fotofase/soglia crepuscolare/frattura nera
   - Rischio: Alto

5. Specie collegate e trait_plan (species-curator)
   - Input (file reali): data/core/species.yaml; data/core/species/aliases.json; data/traits/species_affinity.json; docs/20-SPECIE_E_PARTI.md; output step 2-4
   - Output attesi: trait_plan e biome_affinity per Polpo Araldo Sinaptico (support buff/debuff bioma), Sciame di Larve Neurali (swarm manipolazione avversari), Leviatano Risonante (forma variabile per fase bioma), Simbionte Corallino Riflesso (copia partial-traits), con sinergie/conflitti espliciti
   - Rischio: Alto

6. Bilanciamento e forme dinamiche (balancer)
   - Input (file reali): output step 3-5; data/core/game_functions.yaml; docs/10-SISTEMA_TATTICO.md; docs/11-REGOLE_D20_TV.md
   - Output attesi: tuning valori numerici/specie e effetti bioma, script o logiche di variazione forma per Leviatano Risonante in base alla fase, raccomandazioni su buff/debuff delle correnti elettroluminescenti
   - Rischio: Alto

7. Validazione cross-dataset (coordinator)
   - Input (file reali): output step 3-6; data/core/traits/biome_pools.json; data/core/species.yaml; data/core/biomes.yaml
   - Output attesi: report coerenza tra pool ambientali e trait_plan specie, controllo duplicati/conflitti, lista patch su dataset globali (species, pools, traits)
   - Rischio: Medio

8. Asset e schede visual (asset-prep)
   - Input (file reali): assets/; docs/catalog/; docs/templates; output step 2-6
   - Output attesi: bozze di card/illustrazioni per i tre livelli bioma e le 4 specie, aggiornamenti schede `.md` in docs/catalog/ con naming asset coerente
   - Rischio: Medio

9. Documentazione e archiviazione (archivist)
   - Input (file reali): output step 1-8; docs/trait_reference_manual.md; docs/biomes.md; docs/README.md
   - Output attesi: appendici su bioma e trait nel trait_reference_manual, aggiornamenti in docs/biomes.md e indici specie, archiviazione decisioni pipeline in docs/reports/
   - Rischio: Basso

10. Piano esecutivo finale (coordinator)
    - Input (file reali): output step 1-9; ops/ci/pipeline.md; Makefile
    - Output attesi: roadmap di implementazione con assegnazione agenti, checklist CI/tooling e merge finale per il pacchetto Frattura Abissale Sinaptica
    - Rischio: Basso

## Avvio sequenziale step 3–10

1. Step 3 → biome-ecosystem-curator (parte dagli output narrativi dello step 2 e genera scheda bioma/livelli).
2. Step 4 → trait-curator (consuma la scheda bioma dello step 3 per modellare pool e trait temporanei/correnti).
3. Step 5 → species-curator (usa pool e requisiti ambientali degli step 3–4 per definire trait_plan/affinity delle specie).
4. Step 6 → balancer (riceve valori da step 3–5 per calibrare forme dinamiche e buff/debuff delle correnti).
5. Step 7 → coordinator (valida cross-dataset incrociando output 3–6 e prepara lista patch sui dataset core).
6. Step 8 → asset-prep (sfrutta narrativa e parametri 2–6 per card/illustrazioni e naming coerente).
7. Step 9 → archivist (documenta e archivia decisioni usando gli output consolidati 1–8).
8. Step 10 → coordinator (chiude con roadmap esecutiva, gating CI e piano merge basato sugli output 1–9).
