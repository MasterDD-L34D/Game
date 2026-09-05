---
title: 'Frattura Abissale Sinaptica – Step 9 (Archivist, STRICT MODE / SANDBOX)'
description: 'Documentazione e archiviazione finale: appendici biomi/trait, indici specie/biomi, link sandbox, changelog proposto'
---

## Piano sintetico (3–7 punti)

1. Allinea gli output degli step 2–8 e prepara appendici per biomi/trait/specie senza modificare i file core.
2. Redigi note di aggiornamento per docs/biomes.md e docs/trait_reference_manual.md, includendo livelli e temp_traits.
3. Traccia le voci di indice specie/biomi da aggiungere, mantenendo naming/slug coerenti con i draft.
4. Mappa i link ufficiali verso i file sandbox prodotti (lore, biome, trait, species, balance, asset) per facilitarne l’import.
5. Prepara una bozza di changelog/release note per il pacchetto “Frattura Abissale Sinaptica”.
6. Evidenzia rischi di disallineamento e cosa serve al Coordinator in Step 10.

## Appendici proposte (non applicare ora)

### docs/biomes.md – appendice
- **Nuovo bioma:** Frattura Abissale Sinaptica
- **Descrizione tecnica sintetica:** sistema abissale stratificato in tre livelli (Cresta Fotofase, Soglia Crepuscolare, Frattura Nera) con correnti elettroluminescenti che applicano trait temporanei e modulano hazard/stresswave.
- **Livelli (riassunto tecnico):**
  - Cresta Fotofase: biome_tags luminescente/pelagico_superficiale/elettroattivo; hazard medium (photic_surge, synaptic_glare); pool: fotofase_synaptic_ridge.
  - Soglia Crepuscolare: biome_tags crepuscolare/foschia_sinaptica/elettrico_irregolare; hazard high (memory_fog, desync_field); pool: crepuscolo_synapse_bloom.
  - Frattura Nera: biome_tags abissale/gravitazionale/elettrico_profondo/sinaptico_dissonante; hazard critical (gravitic_shear, black_current); pool: frattura_void_choir.
- **Correnti elettroluminescenti:** fenomeno periodico che introduce temp_traits (es. scintilla_sinaptica, riverbero_memetico, pelle_piezo_satura, canto_risonante, vortice_nera_flash) con durate e stack limitati.
- **Alias e terraform bands:** da registrare in data/core/biome_aliases.yaml e biomes/terraforming_bands.yaml (band T1–T3). Link scheda: docs/biomes/Frattura_Abissale_Sinaptica_biome.md.

### docs/trait_reference_manual.md – appendice
- **Trait ambientali (pool):**
  - fotofase_synaptic_ridge → core: coralli_sinaptici_fotofase, membrane_fotoconvoglianti, nodi_sinaptici_superficiali, impulsi_bioluminescenti; support: filamenti_guidalampo, sensori_planctonici, squame_diffusori_ionici.
  - crepuscolo_synapse_bloom → core: nebbia_mnesica, lobi_risonanti_crepuscolo, placca_diffusione_foschia, spicole_canalizzatrici; support: secrezioni_antistatiche, organi_metacronici, ghiandole_mnemoniche.
  - frattura_void_choir → core: camere_risonanza_abyssal, corazze_ferro_magnetico, bioantenne_gravitiche, emettitori_voidsong; support: emolinfa_conducente, placche_pressioniche, filamenti_echo.
- **Trait temporanei (correnti):**
  - scintilla_sinaptica (temp): burst elettrico; +acc/range elettrico; durata breve, stack max 2.
  - riverbero_memetico (temp): eco psionica; copia ridotta buff/skill; durata media, stack 1, non duplicabile.
  - pelle_piezo_satura (temp): dermide conduttiva; DR elettrico e counter-spark; durata media, stack 1, anti-loop.
  - canto_risonante (temp): tono modulante; bonus concentrazione/risonanza; durata media, stack 1, gating su copia.
  - vortice_nera_flash (temp): micro-teleport gravitico; reposition + stress tick; durata istantanea, CD minimo.
- **Note di schema:** indicare schema_version 1.0 per nuovi pool; temp_traits flaggati come non duplicabili salvo scintilla_sinaptica (cap 2).

### Indici specie/biomi (bozza)
- **Indice biomi:** aggiungere “Frattura Abissale Sinaptica” con slug `frattura_abissale_sinaptica`, link a scheda tecnica e lore.
- **Indice specie:**
  - Polpo Araldo Sinaptico (support) – affinità Cresta Fotofase / Soglia Crepuscolare.
  - Sciame di Larve Neurali (swarm) – affinità Soglia Crepuscolare, accesso limitato a Frattura Nera.
  - Leviatano Risonante (boss) – affinità primaria Frattura Nera, forma variabile.
  - Simbionte Corallino Riflesso (ibrido) – affinità mista L1–L2 con copia partial-trait.

### Link ufficiali verso sandbox (per import)
- Lore (Step 2): docs/biomes/Frattura_Abissale_Sinaptica_lore.md
- Scheda tecnica bioma (Step 3): docs/biomes/Frattura_Abissale_Sinaptica_biome.md
- Trait pools & temp_traits (Step 4): docs/traits/Frattura_Abissale_Sinaptica_trait_draft.md
- Species draft (Step 5): docs/species/Frattura_Abissale_Sinaptica_species_draft.md
- Balance draft (Step 6): docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md
- Validation (Step 7): docs/reports/Frattura_Abissale_Sinaptica_validation_report.md
- Asset draft (Step 8): docs/catalog/Frattura_Abissale_Sinaptica_assets_draft.md

### Changelog / release note (bozza)
- **Nuovo:** Bioma “Frattura Abissale Sinaptica” con tre livelli ambientali e correnti elettroluminescenti.
- **Pool:** Aggiunti tre pool dedicati (fotofase_synaptic_ridge, crepuscolo_synapse_bloom, frattura_void_choir) con hazard e role_templates allineati.
- **Trait temporanei:** 5 effetti di corrente con limiti di durata/stack e tag non-duplicable dove necessario.
- **Specie:** 4 nuove schede sandbox (support, swarm, boss forma variabile, ibrido copia) con trait_plan coerenti ai pool.
- **Bilanciamento:** range numerici e forma modulante del Leviatano con anti-stacking su correnti e switch.
- **Asset:** naming e template card per livelli bioma, specie e icona correnti.
- **Validazione:** patch_proposte per pool/trait/species/game_functions/bioma in attesa di applicazione.

## Self-critique (Step 9)
- **Consistenza documentale:** le appendici seguono gli slug proposti in Step 4–6; va verificata la compatibilità con glossary/index ufficiali prima di import.
- **Rischi di disallineamento:** possibili differenze di nomenclatura tra biome_tags/climate_tags nei pool e quelli richiesti dallo schema biomi; controllare stresswave/affixes obbligatorie in biomes.yaml.
- **Per il Coordinator (Step 10):** programmare l’integrazione sequenziale (pool → bioma → specie → affinity) con lint/schema check; confermare naming alias/terraform bands; allineare changelog con patch_proposte del report di validazione.
