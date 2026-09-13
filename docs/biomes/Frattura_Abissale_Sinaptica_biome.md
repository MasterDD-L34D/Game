---
title: 'Frattura Abissale Sinaptica – Step 3 (Modellazione tecnica, STRICT MODE / SANDBOX)'
description: 'Output biome-ecosystem-curator: schema tecnico livelli ambientali, requisiti e hook per pool/trait'
---

## Piano sintetico (3–7 punti)

1. Allinea lo schema dei biomi ai requisiti del catalogo (config/schemas/biome.schema.yaml) senza modificare i dataset core.
2. Leggi i riferimenti operativi: data/core/biomes.yaml, data/core/biome_aliases.yaml, biomes/terraforming_bands.yaml, data/core/traits/biome_pools.json, output Step 2 (lore).
3. Definisci i tre livelli con biome_tags, requisiti ambientali min/max coerenti con env_params e hazard tematici.
4. Prepara affixes/climate_tags e alias per integrazione futura; mappa i pool names per Step 4 senza toccare file dati.
5. Evidenzia rischi di conflitto con biomi esistenti e note per il trait-curator.

## Analisi tecnica (STRICT MODE / SANDBOX)

- **Letture (nessuna scrittura):** data/core/biomes.yaml, data/core/biome_aliases.yaml, config/schemas/biome.schema.yaml, biomes/terraforming_bands.yaml, data/core/traits/biome_pools.json, docs/biomes/Frattura_Abissale_Sinaptica_lore.md.
- **Schema e vincoli:** i biomi richiedono label/summary, diff_base/mod_biome, affixes, hazard (severity + stress_modifiers), npc_archetypes, stresswave e narrative; gli alias devono puntare a slug canonico; le terraform bands usano env_params [temperature, atmosphere, biomass, humidity]. I pool seguono schema_version 1.0 con hazard/stress_modifiers e climate_tags.
- **Approccio:** modellare il nuovo bioma come profilo multi-livello interno al singolo slug "frattura_abissale_sinaptica"; per ciascun livello definire biome_tags, requisiti ambientali (min/max qualitativi), hazard e affixes/climate_tags; proporre alias e mappatura terraform senza scrivere entry nei file core.

## Scheda tecnica (proposta, non scrivere nei dataset)

- **Nome bioma:** Frattura Abissale Sinaptica
- **Descrizione tecnica breve:** bioma abissale stratificato in tre fasce luminose/di pressione attraversate da correnti elettroluminescenti che modulano temporaneamente i trait.

### Livelli ambientali

1. **Cresta Fotofase**

- **biome_tags proposti:** luminescente, pelagico_superficiale, sinaptico, elettroattivo
- **requisiti_ambientali (min→max):**
  - temperature: temperate → warm (per via dei coralli bioelettrici esposti)
  - atmosphere: oxygenated → ionized (correnti superficiali con cariche)
  - biomass: medium → high (barriere coralline sinaptiche)
  - humidity: high → saturated (spray e nebbie saline)
- **hazard:** impulsi fotonici/elettrostatici che causano brevi stun e disorientamento (severity: medium; stress_modifiers: photic_surge +0.04, synaptic_glare +0.05)
- **affixes / climate_tags:** luminescente, salmastro, elettrico_superficiale
- **pool name (per Step 4):** fotofase_synaptic_ridge

2. **Soglia Crepuscolare**

- **biome_tags proposti:** crepuscolare, nebbia_cognitiva, sinaptico, elettrico_irregolare
- **requisiti_ambientali (min→max):**
  - temperature: temperate → cool (perdita di calore con riduzione luminosa)
  - atmosphere: low_oxygen → ionized_sparse (interferenze e rarefazione)
  - biomass: medium → low (plancton sinaptico e colonie diffuse)
  - humidity: medium → high (condensa delle nebbie cognitive)
- **hazard:** nebbie elettro-cognitive che alterano memoria breve/controllo (severity: high; stress_modifiers: memory_fog +0.06, desync_field +0.05)
- **affixes / climate_tags:** foschia_sinaptica, elettrico_irregolare, psionico_lieve
- **pool name (per Step 4):** crepuscolo_synapse_bloom

3. **Frattura Nera**

- **biome_tags proposti:** abissale_profondo, gravitazionale, elettromagnetico, sinaptico_dissonante
- **requisiti_ambientali (min→max):**
  - temperature: cold → frigid (assenza di luce, correnti profonde)
  - atmosphere: anoxic → ionized_deep (sacche magnetiche)
  - biomass: low → medium (fauna specializzata, leviatani risonanti)
  - humidity: saturated (pressione idrostatica costante)
- **hazard:** risonanze elettro-gravitazionali che distorcono morfologie e accumulano stress (severity: critical; stress_modifiers: gravitic_shear +0.08, black_current +0.09)
- **affixes / climate_tags:** tenebroso, ferro_magnetico, pressione_estrema, elettrico_profondo
- **pool name (per Step 4):** frattura_void_choir

### Alias bioma (proposta)

- sinaptic_trench
- trench_sinaptico_profondo
- scarpata_fotofase

### Terraform bands (aggancio operativo)

- Mappare il bioma a bande T1–T3 per progressione narrativa: Cresta Fotofase ~ T1, Soglia Crepuscolare ~ T2, Frattura Nera ~ T3; richiede definizione futura di drifts/strumenti coerenti con env_params (temperature, atmosphere, biomass, humidity) in biomes/terraforming_bands.yaml.

## Self-critique (Step 3)

- **Coerenza con schema_version biomi:** la scheda segue i campi richiesti (label/summary, hazard con severity + stress_modifiers, affixes); le proposte per requisiti e tags restano a livello di briefing, conformi a schema senza scrittura.
- **Rischi di conflitto:** potenziale sovrapposizione con biomi elettrici esistenti (Canopia Ionica, Badlands Magnetar) e con temi abissali; mitigare con affixes specifici (sinaptico, elettroattivo, gravitazionale) e alias univoci.
- **Per il Trait Curator (Step 4):**
  - Validare i pool name e allinearli con schema_version 1.0 di data/core/traits/biome_pools.json.
  - Derivare trait core/support coerenti con hazard suggeriti e con correnti elettroluminescenti (buff/debuff temporanei).
  - Definire stress_modifiers per pool in coerenza con quelli proposti per i livelli.
  - Introdurre climate_tags compatibili (es. elettrico_superficiale/irregolare/profondo) e mapping con biome_tags.
