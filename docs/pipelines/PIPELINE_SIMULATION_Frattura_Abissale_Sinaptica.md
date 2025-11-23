# Simulazione completa – Pipeline SPECIE+BIOMI “Frattura Abissale Sinaptica”

Pipeline di riferimento: `docs/pipelines/PIPELINE_SPECIES_BIOMES_Frattura_Abissale_Sinaptica.md` (10 step standard).

## Step simulati (strict-mode, nessuna modifica ai file)

1. **Kickoff e vincoli cross-dataset** (coordinator)
   - Agente: coordinator
   - Produce: perimetro bioma/livelli/specie; mappa dipendenze tra dataset; checklist impatti su `data/core/biomes.yaml`, `data/core/species.yaml`, `data/core/traits/biome_pools.json`; nota su hook CI/schema.
   - Legge: agent_constitution.md; docs/PIPELINE_TEMPLATES.md; docs/pipelines/PIPELINE_SPECIES_BIOMES_STANDARD.md; data/core/biomes.yaml; data/core/species.yaml; data/core/traits/biome_pools.json; docs/trait_reference_manual.md.
   - Scrive (solo simulato): draft checkpoint/briefing in docs/pipelines/ o reports.
   - Dipendenze: step di base, nessun prerequisito.

2. **Identità e lore** (lore-designer)
   - Agente: lore-designer
   - Produce: descrizione narrativa per `cresta fotofase`, `soglia crepuscolare`, `frattura nera`; fenomeno correnti elettroluminescenti; hook narrativi per le 4 specie; bozza aggiornamento docs/biomes.md e docs/biomes/manifest.md.
   - Legge: docs/biomes.md; docs/biomes/manifest.md; docs/20-SPECIE_E_PARTI.md; docs/hooks; output step 1.
   - Scrive (solo simulato): note di lore in docs/pipelines/ o staging per docs/biomes.md.
   - Dipendenze: usa il perimetro e i vincoli del kickoff.

3. **Modellazione bioma e livelli ambientali** (biome-ecosystem-curator)
   - Agente: biome-ecosystem-curator
   - Produce: scheda bioma con tre livelli e `biome_tags`/`requisiti_ambientali` in `data/core/biomes.yaml`; alias in `data/core/biome_aliases.yaml`; eventuali bande in `biomes/terraforming_bands.yaml`; piano pool per livello; nota su correnti e trigger.
   - Legge: data/core/biomes.yaml; data/core/biome_aliases.yaml; config/schemas/biome.schema.yaml; biomes/terraforming_bands.yaml; data/core/traits/biome_pools.json; output step 2.
   - Scrive (solo simulato): patch proposte per i file sopra e memo su pool.
   - Dipendenze: richiede lore e vincoli (step 1-2).

4. **Trait ambientali e correnti elettroluminescenti** (trait-curator)
   - Agente: trait-curator
   - Produce: set di trait per livelli e correnti (slug/glossario); aggiornamento draft di `data/core/traits/biome_pools.json` con pool per cresta/soglia/frattura; mapping in `data/core/traits/glossary.json`; eventuali nuovi slug in `data/traits/index.json`; note su affinity in `data/traits/species_affinity.json`.
   - Legge: data/core/traits/biome_pools.json; data/core/traits/glossary.json; data/traits/index.json; data/traits/species_affinity.json; docs/trait_reference_manual.md; Trait Editor/docs/howto-author-trait.md; output step 3.
   - Scrive (solo simulato): patch proposte per pool/glossario e memo sui trait temporanei.
   - Dipendenze: usa struttura bioma e pool plan dello step 3.

5. **Specie collegate e trait_plan** (species-curator)
   - Agente: species-curator
   - Produce: trait_plan e biome_affinity per Polpo Araldo Sinaptico, Sciame di Larve Neurali, Leviatano Risonante, Simbionte Corallino Riflesso in `data/core/species.yaml`; alias in `data/core/species/aliases.json`; affinity/trait hooks in `data/traits/species_affinity.json`; note su sinergie/conflitti con i trait ambientali.
   - Legge: data/core/species.yaml; data/core/species/aliases.json; data/traits/species_affinity.json; docs/20-SPECIE_E_PARTI.md; output step 2-4.
   - Scrive (solo simulato): patch proposte su species/aliases/affinity e appunti su interazioni con correnti.
   - Dipendenze: richiede lore, pool trait e struttura bioma (step 2-4).

6. **Bilanciamento e forme dinamiche** (balancer)
   - Agente: balancer
   - Produce: tuning numerico e curve in `data/core/game_functions.yaml` (se servono nuovi coefficienti); logiche di trasformazione per Leviatano Risonante; raccomandazioni buff/debuff legati alle correnti; note su stacking/rarità.
   - Legge: output step 3-5; data/core/game_functions.yaml; docs/10-SISTEMA_TATTICO.md; docs/11-REGOLE_D20_TV.md.
   - Scrive (solo simulato): patch consigliate su game_functions e memo di bilanciamento.
   - Dipendenze: necessita specie/trait definiti (step 3-5).

7. **Validazione cross-dataset** (coordinator)
   - Agente: coordinator
   - Produce: report di coerenza tra pool e trait_plan; controllo duplicati/slug in `data/core/traits/biome_pools.json`, `data/core/species.yaml`, `data/core/biomes.yaml`; checklist di correzioni.
   - Legge: output step 3-6; data/core/traits/biome_pools.json; data/core/species.yaml; data/core/biomes.yaml.
   - Scrive (solo simulato): report validazione e lista patch bloccanti/facoltative.
   - Dipendenze: deve ricevere tuning e specie definiti (step 3-6).

8. **Asset e schede visual** (asset-prep)
   - Agente: asset-prep
   - Produce: mock card/illustrazioni e naming in `assets/`; bozze di schede `.md` in `docs/catalog/` per bioma e specie; linee guida UI per correnti e trasformazioni.
   - Legge: assets/; docs/catalog/; docs/templates; output step 2-6.
   - Scrive (solo simulato): file di bozza in docs/catalog/ e lista asset da commissionare in assets/ roadmap.
   - Dipendenze: richiede dati validati (post step 7) e note di bilanciamento.

9. **Documentazione e archiviazione** (archivist)
   - Agente: archivist
   - Produce: appendici in docs/trait_reference_manual.md e docs/biomes.md; aggiornamento indici specie/biomi; report finale in docs/reports/ con changelog e riferimenti ai file toccati.
   - Legge: output step 1-8; docs/trait_reference_manual.md; docs/biomes.md; docs/README.md.
   - Scrive (solo simulato): bozze di documentazione e report di archivio.
   - Dipendenze: necessita asset/lore/pool validati (step 7-8).

10. **Piano esecutivo finale** (coordinator)
    - Agente: coordinator
    - Produce: roadmap di implementazione, assegnazione agenti e checklist CI/tooling (ops/ci/pipeline.md; Makefile); sequenza di merge per il pacchetto Frattura Abissale Sinaptica; nota di rollout.
    - Legge: output step 1-9; ops/ci/pipeline.md; Makefile.
    - Scrive (solo simulato): piano di esecuzione in docs/pipelines/ o reports, con gating CI.
    - Dipendenze: conclusione di documentazione e asset.

## Output finali attesi

- Scheda bioma completa (tre livelli + correnti) in core biomes/alias/terraforming bands con pool dedicati per livello nei biome_pools.
- Trait ambientali e temporanei registrati in glossary/index e distribuiti nei pool; affinities allineate.
- Quattro specie aggiornate con trait_plan, biome_affinity e alias; logica dinamica del Leviatano codificata e bilanciata.
- Asset preliminari e schede catalogo; appendici documentali e report di validazione; roadmap esecutiva pronta per il merge.

## Rischi globali

- **Stacking correnti + forma dinamica**: combinazioni inattese dei buff/debuff con trasformazioni del Leviatano possono rompere le curve di potenza.
- **Pool disallineati**: differenze tra lore/alias e pool tecnici possono creare doppioni o slug inconsistenti in biome_pools e species_affinity.
- **Compatibilità CI/schema**: modifiche simultanee a JSON/YAML core rischiano di violare schemi o tool di validazione.

## Raccomandazioni operative

- Introdurre test di validazione automatica su slug/pool prima del merge (lint + schema per biomes/traits/species).
- Versionare le correnti elettroluminescenti come trait temporanei con durata/trigger chiari per limitare stacking.
- Allineare presto alias/specie e bande di terraformazione per ridurre conflitti con altri pacchetti di bioma.
- Pianificare handoff con asset-prep dopo la validazione (step 7) per evitare rework visivo su numeri/slug instabili.
