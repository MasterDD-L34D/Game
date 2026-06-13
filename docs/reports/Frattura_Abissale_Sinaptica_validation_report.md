---
title: 'Frattura Abissale Sinaptica – Step 7 (Validazione cross-dataset, STRICT MODE / SANDBOX)'
description: 'Output coordinator: controlli di coerenza su bioma, pool, trait temporanei, specie e numeri proposti, con patch suggerite da applicare in seguito'
---

## Piano sintetico (3–7 punti)

1. Riesamina i dataset core (biomi, specie, biome_pools) e gli output Step 3–6 per rilevare conflitti di slug, alias e struttura.
2. Controlla coerenza tra biome_tags/hazard e climate_tags dei pool proposti, verificando size e severità rispetto agli standard esistenti.
3. Allinea trait_plan delle specie con i pool e i temp_traits, verificando ruoli, tier e slot suggeriti dal bilanciamento.
4. Identifica rischi di stacking illegale (correnti + forma Leviatano + furto/copia) e mismatch tra hazard e affinities.
5. Redigi patch_proposte per pool, trait temporanei, species_affinity, species.yaml, game_functions e scheda bioma, senza toccare i file reali.

## Validazione (lettura/sandbox)

### File letti
- data/core/traits/biome_pools.json (schema_version 1.0, 5 pool esistenti)
- data/core/species.yaml (struttura catalog + synergies di esempio)
- data/core/biomes.yaml (schema biomi con hazard/stresswave/narrative)
- docs/biomes/Frattura_Abissale_Sinaptica_biome.md (Step 3)
- docs/traits/Frattura_Abissale_Sinaptica_trait_draft.md (Step 4)
- docs/species/Frattura_Abissale_Sinaptica_species_draft.md (Step 5)
- docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md (Step 6)

### Check slug e strutture
- **Slug pool nuovi:** fotofase_synaptic_ridge, crepuscolo_synapse_bloom, frattura_void_choir non presenti in biome_pools.json → univoci ma necessitano id/label/summary/size/hazard formali.
- **Trait slug:** tutti in Step 4 in formato lowercase_underscore; da verificare contro glossary/index per evitare collisioni (es. voidsong vs void_song nei core esistenti).
- **Bioma:** non esiste in data/core/biomes.yaml; schema richiede hazard/stresswave/narrative e affixes; alias non registrati.
- **Specie:** i quattro slug non esistono in species.yaml; trait_plan fanno riferimento a trait nuovi → necessaria creazione voci e mapping slots coerenti con catalog.

### Coerenza biome_tags / climate / hazard
- Step 3 propone biome_tags elettrico/luminescente/gravitazionale con hazard differenziati; Step 4 climate_tags per pool allineati (superficiale/irregolare/profondo) → coerenza tematica OK.
- Severità hazard: medium/high/critical su livelli 1–3; pool size proposti (3–7) rispettano range analoghi ai pool esistenti (es. 3–7 in biome_pools.json) → nessun outlier.
- Necessario aggiungere stresswave baseline/escalation e affixes definiti per nuovo bioma in biomes.yaml per evitare default mancanti.

### Allineamento trait_plan ↔ pool ↔ ruoli/tier
- Polpo (tier 3 keystone) usa core/support dai pool L1–L2 con temp_traits (scintilla_sinaptica, canto_risonante) → coerente con role_template keystone L1–L2; slot suggeriti 3/3/1 compatibili.
- Sciame (tier 3 threat) lega core a L2 e support/echo a L3; furto/duplicazione buff allineato al role_template “Sciame Memetico” del pool L2.
- Leviatano (tier 5 apex) centrato su L3, con support L2 per forma intermedia; slot 4/4/2 coerenti con apex boss.
- Simbionte (tier 3.5 flex) mix L1–L2 con copia; rischio overlap con Polpo su buff luminosi mitigabile con vincolo di 1 trait copiato.

### Stacking e interazioni rischiose
- **Correnti + form-switch Leviatano:** free switch da corrente può ridurre troppo il costo di forma; aggiungere limite 1 free per encounter e costo stress minimo.
- **Riverbero_memetico + canto_risonante/pelle_piezo_satura:** già vietato in Step 6; mantenere controllo in species_affinity e game_functions per prevenire duplicazione indiretta (es. copia del Simbionte).
- **Furto/copia buff (Sciame + Simbionte):** rischio di loop se riverbero_memetico si applica a buff copiati; imporre flag non-duplicabile su temp_trait duplicati.
- **Hazard vs trait_plan:** nessun conflitto diretto, ma stress_modifiers del bioma (gravitic_shear, black_current) devono allinearsi ai DR/resist del Leviatano per evitare invulnerabilità.

## patch_proposte (non applicare ora)

### Pool (data/core/traits/biome_pools.json)
- Aggiungere 3 pool con campi completi: id, label, summary, ecology (biome_type/resources), hazard (severity + stress_modifiers), size range coerente (min 3–5/4–6/4–7), traits core/support, role_templates, climate_tags.
- Inserire stress_modifiers coerenti con Step 3: photic_surge/synaptic_glare (L1), memory_fog/desync_field (L2), gravitic_shear/black_current (L3).
- Tagliare durate stackable degli eventi role_template (es. event duplicazione buff) con cooldown minimo 3 turni.

### Trait temporanei
- Annotare in glossary/index la natura temp dei 5 trait da corrente; aggiungere flag `non_duplicable_by` per riverbero_memetico su canto_risonante e pelle_piezo_satura; limite stack globale =1 salvo scintilla_sinaptica (2).
- Specificare in index.json tier/rarità per temp_traits (es. uncommon/rare) per gating loot/ambient.

### species_affinity (data/traits/species_affinity.json)
- Mappare i 4 slug specie a pool livelli corrispondenti; associare temp_traits consigliati (Polpo→scintilla/canto, Sciame→riverbero/vortice, Leviatano→pelle/canto/vortice, Simbionte→scintilla/riverbero) con cap di 1 temp attivo salvo Leviatano (2).
- Aggiungere flag `can_copy_temp` per Simbionte con ratio 0.5–0.75 e cooldown 3 turni.

### species.yaml
- Creare entry per le 4 specie con biome_affinity (primaria/secondaria), trait_plan core/support/temp coerenti con slot Step 6, tier matching role_template; includere synergy_hints che vietano combo duplicate (riverbero + canto per Simbionte/Sciame).
- Definire slot mapping (core/support/temp) aderendo a catalog slots; agganciare default_parts compatibili con ambiente elettrico/abissale.

### game_functions.yaml
- Integrare regole: limite globale temp_traits correnti = 2 per party; free form-switch Leviatano 1/encounter, costi stress minimi 0.03; stress overflow da furto buff (Sciame) scala +0.05/stack oltre 2.
- Aggiungere controllo che teleport brevi (vortice_nera_flash) non azzerino threat più di 1 turno consecutivo.

### Bioma (data/core/biomes.yaml + alias/terraform)
- Inserire bioma con hazard/stresswave/affixes e narrative hook; registrare alias in data/core/biome_aliases.yaml e mappare terraform bands T1–T3 in biomes/terraforming_bands.yaml.
- Allineare biome_tags/climate_tags tra scheda tecnica e pool per evitare disallineamenti (es. usare elettrico_profondo vs elettrico_irregolare coerentemente).

## Rischi e raccomandazioni
- **Rischio di stacking residuo:** combinazioni di buff luminosi + copia + free switch possono superare budget; applicare hard cap su buff area e durata temp_traits.
- **Collisione slug:** verificare contro glossary/index esistenti prima di import; normalizzare naming (voidsong vs void_song).
- **Consistenza stress:** assicurarsi che stress_modifiers bioma non annullino o amplifichino eccessivamente DR/resist proposti nelle specie.
- **Raccomandazioni operative:** eseguire convalida schema (ajv/yaml lint) su nuovi pool/biomi/specie; playtest rapido per check di Shear + correnti; aggiornare docs/catalog con alias e tier.

## Self-critique (Step 7)
- **Limiti sandbox:** non è stata eseguita validazione automatica su slug/glossary; possibili conflitti non rilevati senza scansione completa dei file.
- **Verifica manuale:** prima dell’inserimento va controllata compatibilità con catalog slots in species.yaml e con stresswave default in biomes.yaml; confermare che role_templates usino functional_tags esistenti.
- **Per l’Archivist (Step 9):** registrare le decisioni di cap/anti-duplication, aggiornare indici doc (biomes.md, trait_reference_manual.md), collegare report a roadmap Step 10 e allegare patch_proposte ai change-log.
