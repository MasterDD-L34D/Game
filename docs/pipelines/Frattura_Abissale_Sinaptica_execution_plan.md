---
title: 'FASE 2D – Step 10 Piano Esecutivo Finale (STRICT MODE / SANDBOX)'
description: 'Roadmap di integrazione per specie, bioma e trait della Frattura Abissale Sinaptica'
---

## Piano sintetico (3–7 punti)

1. Allinea l'ordine di integrazione tra pool, bioma, trait e specie in base alla pipeline istanziata.
2. Definisci controlli CI e validazioni minime per ogni blocco (pool, trait, specie, game_functions).
3. Assegna responsabilità agli agenti e delimita handoff per evitare overlap.
4. Propone sequenza di commit/merge per tracciare incrementi e ridurre conflitti.
5. Elenca checklist di uscita (schema, slug, stacking, CI verde) per l'ok al merge finale.

## Piano esecutivo strutturato

### Ordine corretto di integrazione (sequenza dataset)

1. **Creazione pool (data/core/traits/biome_pools.json)**
   - Aggiungere i tre pool: `fotofase_synaptic_ridge`, `crepuscolo_synapse_bloom`, `frattura_void_choir`.
   - Validare `schema_version`, `size` coerenti, `hazard` allineati con Step 3, role_templates coerenti.
2. **Registrazione bioma (data/core/biomes.yaml + data/core/biome_aliases.yaml + biomes/terraforming_bands.yaml)**
   - Inserire bioma con tre livelli, hazard/affixes/climate_tags e alias; associare band di terraformazione.
3. **Inserimento trait ambientali → glossary/index**
   - Aggiornare `data/core/traits/glossary.json` e `data/traits/index.json` con slug e descrizioni dei trait core/support dei pool.
4. **Inserimento trait temporanei (correnti elettroluminescenti)**
   - Registrare slug/temp-type e mapping nel glossary/index; definire eventuali tag di stacking/cooldown.
5. **Aggiunta specie (data/core/species.yaml)**
   - Inserire le quattro specie con `trait_plan` (core/support/temp) coerenti con i pool e ruoli.
6. **Assegnazione affinity (data/traits/species_affinity.json)**
   - Mappare affinità specie ↔ livelli bioma/pool e trait temporanei se previsto.
7. **Aggiornamento synergies e role_templates (se richiesti)**
   - Integrare sinergie/role_templates collegati ai nuovi trait/pool, mantenendo naming esistente.
8. **Aggiornamento game_functions.yaml**
   - Integrare scaling o costi aggiuntivi per correnti e forma variabile del Leviatano.
9. **Aggiornamento CI/lint/schema**
   - Assicurare che gli schemi riconoscano i nuovi slug/pool/biome; aggiornare eventuali test snapshot.

### Check CI e validazioni richieste

- Schema check YAML/JSON (biomes, biome_pools, species, glossary, index, species_affinity).
- Anti-duplica slug per trait, pool, specie, alias.
- Validazione `stress_modifiers` (range coerenti con hazard dei pool e bioma).
- Validazione `pool size` (count trait core/support per band coerente con size dichiarata).
- Simulazione `stresswave` per il bioma multi-livello.
- Check `trait_plan vs pool` (ogni trait nel piano deve esistere nel pool o nel set temporaneo autorizzato).
- Check `cooldown/stacking` per i trait temporanei e per la forma variabile del Leviatano.

### Agenti coinvolti e responsabilità

- **trait-curator:** definizione e registrazione trait ambientali/temporanei, aggiornamento glossary/index/species_affinity.
- **species-curator:** inserimento specie, trait_plan, slot core/support/temp e note di comportamento.
- **biome-ecosystem-curator:** scheda bioma, hazard/affixes, alias, terraform bands, coerenza con pool.
- **balancer:** numeri (HP/armor/resist, cooldown, stack limit), game_functions.yaml e stress_modifiers.
- **archivist:** aggiornamenti appendici biomi/trait, catalogo e indici, changelog finale.
- **dev-tooling:** schema/CI update, validatori anti-duplica, simulazioni automatizzate.
- **coordinator (overwatch):** governance della sequenza, gate di qualità, merge finale.

### Sequenza Git/merge suggerita

- Branch di lavoro: `feature/bioma-frattura-abissale`.
- **Commit 1:** pool + bioma (biome_pools.json, biomes.yaml, aliases, terraform bands).
- **Commit 2:** trait ambientali + temp_traits (glossary/index, eventuale species_affinity preliminare per temp_traits).
- **Commit 3:** specie + affinity (species.yaml, species_affinity.json, note synergy_hints).
- **Commit 4:** balance fields (game_functions.yaml, eventuali parametri numerici nei trait).
- **Commit 5:** asset & catalogo (docs/catalog, naming asset, link preview).
- **Commit 6:** doc & changelog finale (docs/biomes.md, docs/trait_reference_manual.md, report in docs/reports/).

### Checklist finale per il merge

- Tutto validato tramite schema (YAML/JSON) e CI verde.
- Test funzionali passati (inclusi lint e validatori custom).
- Nessun slug duplicato per bioma/pool/trait/specie/alias.
- Nessun trait temporaneo senza cooldown/stack limit definito.
- Correlazioni specie-bioma-trait verificate (trait_plan ↔ pool ↔ hazard ↔ affinity).
- Bilanciamento approvato: stresswave simulato, stacking controllato, forma Leviatano verificata.

## Self-critique

- **Rischi della sequenza proposta:** eventuali dipendenze incrociate tra trait temporanei e specie potrebbero richiedere ordine di commit diverso (es. registrare temp_traits prima di species); rollup di balance in commit separato può introdurre merge conflict se i trait cambiano in review.
- **Alternative possibili:** consolidare commit 2+3 se il team preferisce una singola review per trait e specie; spostare asset in branch secondario se l'art direction richiede iterazioni lunghe.
- **Cosa verificare dopo il merge:** rigenerare indici/cataloghi, rieseguire validatori slug, lanciare simulazioni stresswave con i nuovi hazard e assicurare che i role_templates non creino duplicazioni nei pool.
