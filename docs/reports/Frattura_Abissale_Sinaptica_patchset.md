---
title: 'Frattura Abissale Sinaptica – Patchset sandbox (STRICT MODE)'
description: 'Blocchi di patch testuali derivati dalla pipeline SPECIE+BIOMI; non applicati'
---

## Patch generate (testuali, da applicare manualmente)

--- PATCH 1: data/core/traits/biome_pools.json ---
```diff
@@ "pools": [
   ...
+    {
+      "id": "fotofase_synaptic_ridge",
+      "label": "Cresta Fotofase Sinaptica",
+      "summary": "Barriere coralline bioelettriche che convogliano luce e impulsi superficiali.",
+      "climate_tags": ["luminescente", "pelagico_superficiale", "elettroattivo"],
+      "size": { "min": 3, "max": 5 },
+      "hazard": {
+        "severity": "medium",
+        "description": "Impulsi fotonici/elettrostatici che disorientano e stordiscono brevemente.",
+        "stress_modifiers": { "photic_surge": 0.04, "synaptic_glare": 0.05 }
+      },
+      "ecology": {
+        "biome_type": "trench_superficiale",
+        "primary_resources": ["coralli_sinaptici", "nebbia_fotofase"],
+        "notes": "Corridoi luminosi guidano messaggeri e supporto lungo le creste."
+      },
+      "traits": {
+        "core": [
+          "coralli_sinaptici_fotofase",
+          "membrane_fotoconvoglianti",
+          "nodi_sinaptici_superficiali",
+          "impulsi_bioluminescenti"
+        ],
+        "support": [
+          "filamenti_guidalampo",
+          "sensori_planctonici",
+          "squame_diffusori_ionici"
+        ]
+      },
+      "role_templates": [
+        { "role": "apex", "label": "Araldo Fotofase", "summary": "Domina le correnti luminose infliggendo dazzled/overload.", "functional_tags": ["controllo_campo", "elettrico"], "preferred_traits": ["impulsi_bioluminescenti", "membrane_fotoconvoglianti"], "tier": 4 },
+        { "role": "keystone", "label": "Custode dei Coralli Sinaptici", "summary": "Stabilizza le barriere e amplifica buff di supporto.", "functional_tags": ["supporto", "rigenerazione"], "preferred_traits": ["coralli_sinaptici_fotofase", "nodi_sinaptici_superficiali"], "tier": 3 },
+        { "role": "bridge", "label": "Messaggero Fosfo", "summary": "Traccia percorsi sicuri con segnali bioelettrici.", "functional_tags": ["ricognizione", "logistica"], "preferred_traits": ["filamenti_guidalampo"], "tier": 2 },
+        { "role": "event", "label": "Marea di Spore Luminescenti", "summary": "Duplica buff luminosi ma aumenta glare per 1 scena (CD 3 turni).", "functional_tags": ["evento", "luminescenza"], "preferred_traits": ["impulsi_bioluminescenti"], "tier": 2 }
+      ]
+    },
+    {
+      "id": "crepuscolo_synapse_bloom",
+      "label": "Soglia Crepuscolare Sinaptica",
+      "summary": "Strato di nebbie psioniche che distorcono orientamento e memoria a breve termine.",
+      "climate_tags": ["crepuscolare", "foschia_sinaptica", "elettrico_irregolare"],
+      "size": { "min": 4, "max": 6 },
+      "hazard": {
+        "severity": "high",
+        "description": "Nebbie elettro-cognitive che impongono test di controllo/volontà.",
+        "stress_modifiers": { "memory_fog": 0.06, "desync_field": 0.05 }
+      },
+      "ecology": {
+        "biome_type": "trench_crepuscolare",
+        "primary_resources": ["plancton_mnesico", "condensa_ionica"],
+        "notes": "Lobi risonanti aprono canali sicuri ma mutevoli nella foschia."
+      },
+      "traits": {
+        "core": [
+          "nebbia_mnesica",
+          "lobi_risonanti_crepuscolo",
+          "placca_diffusione_foschia",
+          "spicole_canalizzatrici"
+        ],
+        "support": [
+          "secrezioni_antistatiche",
+          "organi_metacronici",
+          "ghiandole_mnemoniche"
+        ]
+      },
+      "role_templates": [
+        { "role": "apex", "label": "Predatore Anamnestico", "summary": "Forza confusione e inversione comandi con attacchi psionici.", "functional_tags": ["controllo_mentale", "imboscata"], "preferred_traits": ["nebbia_mnesica", "lobi_risonanti_crepuscolo"], "tier": 4 },
+        { "role": "keystone", "label": "Curatore della Foschia", "summary": "Mantiene la densità della nebbia e concede coperture psioniche.", "functional_tags": ["supporto", "copertura"], "preferred_traits": ["placca_diffusione_foschia", "secrezioni_antistatiche"], "tier": 3 },
+        { "role": "threat", "label": "Sciame Memetico", "summary": "Ruba buff temporanei e li riapplica in forma ridotta.", "functional_tags": ["sabotaggio", "furto_buff"], "preferred_traits": ["ghiandole_mnemoniche", "organi_metacronici"], "tier": 3 },
+        { "role": "event", "label": "Eclisse Sinaptica", "summary": "Blackout sensoriale che resetta i timer delle correnti (CD 3 turni).", "functional_tags": ["evento", "crowd_control"], "preferred_traits": ["nebbia_mnesica"], "tier": 2 }
+      ]
+    },
+    {
+      "id": "frattura_void_choir",
+      "label": "Frattura Nera – Void Choir",
+      "summary": "Abisso risonante dove correnti magnetiche e gravità variabile piegano morfologie e segnali.",
+      "climate_tags": ["abissale", "gravitazionale", "elettrico_profondo", "sinaptico_dissonante"],
+      "size": { "min": 4, "max": 7 },
+      "hazard": {
+        "severity": "critical",
+        "description": "Risonanze elettro-gravitazionali che distorcono struttura e accumulano stress.",
+        "stress_modifiers": { "gravitic_shear": 0.08, "black_current": 0.09 }
+      },
+      "ecology": {
+        "biome_type": "trench_abissale",
+        "primary_resources": ["ferro_memoria_profondo", "risonanze_voidsong"],
+        "notes": "Cori di fondo mantengono ritmi per evitare shear e collasso."
+      },
+      "traits": {
+        "core": [
+          "camere_risonanza_abyssal",
+          "corazze_ferro_magnetico",
+          "bioantenne_gravitiche",
+          "emettitori_voidsong"
+        ],
+        "support": [
+          "emolinfa_conducente",
+          "placche_pressioniche",
+          "filamenti_echo"
+        ]
+      },
+      "role_templates": [
+        { "role": "apex", "label": "Leviatano Modulante", "summary": "Cambia forma per adattarsi a pressione e risonanze.", "functional_tags": ["boss", "forma_variabile"], "preferred_traits": ["camere_risonanza_abyssal", "emettitori_voidsong"], "tier": 5 },
+        { "role": "keystone", "label": "Coro di Fondo", "summary": "Mantiene frequenze di riferimento e riduce danni da shear.", "functional_tags": ["supporto", "riduzione_danno"], "preferred_traits": ["filamenti_echo", "bioantenne_gravitiche"], "tier": 3 },
+        { "role": "threat", "label": "Sferzatore Magnetico", "summary": "Crea campi che spingono/attraggono drenando energia.", "functional_tags": ["controllo_spazio", "drain"], "preferred_traits": ["corazze_ferro_magnetico", "emolinfa_conducente"], "tier": 4 },
+        { "role": "event", "label": "Canto dello Strappo", "summary": "Disallinea temp_traits e può invertirne gli effetti (CD 4 turni).", "functional_tags": ["evento", "anomalia"], "preferred_traits": ["emettitori_voidsong"], "tier": 3 }
+      ]
+    }
 ]
```

--- PATCH 2: data/core/biomes.yaml ---
```diff
@@ biomes:
   ...
+  frattura_abissale_sinaptica:
+    label: Frattura Abissale Sinaptica
+    summary: Bioma abissale stratificato con tre livelli luminosi/pressori e correnti elettroluminescenti che modulano trait temporanei.
+    diff_base: 5
+    mod_biome: 3
+    affixes:
+    - luminescente
+    - elettrico_profondo
+    - sinaptico
+    - gravitazionale
+    - pressione_estrema
+    aliases:
+    - sinaptic_trench
+    - trench_sinaptico_profondo
+    - scarpata_fotofase
+    hazard:
+      description: Impulsi fotici superficiali, nebbie cognitive crepuscolari e shear elettro-gravitazionale nella frattura nera.
+      severity: high
+      stress_modifiers:
+        photic_surge: 0.04
+        synaptic_glare: 0.05
+        memory_fog: 0.06
+        desync_field: 0.05
+        gravitic_shear: 0.08
+        black_current: 0.09
+    npc_archetypes:
+      primary:
+      - araldi_fotofase
+      - sciami_memetici
+      - leviatani_risonanti
+      support:
+      - custodi_coralli
+      - cori_voidsong
+    stresswave:
+      baseline: 0.35
+      escalation_rate: 0.06
+      event_thresholds:
+        sync_window: 0.52
+        overload: 0.74
+        fracture: 0.9
+    narrative:
+      tone: Sinfonia abissale di luce, nebbia e shear gravitazionale governata da correnti elettroluminescenti.
+      hooks:
+      - Stabilizzare i corridoi luminosi della Cresta Fotofase prima delle maree di spore.
+      - Recuperare dati memetici nella Soglia Crepuscolare senza innescare eclissi sinaptiche.
+      - Disinnescare il Canto dello Strappo nella Frattura Nera o accordarsi con il Leviatano Risonante.
```

--- PATCH 3: data/core/biome_aliases.yaml ---
```diff
@@ aliases:
   orbita_psionica_inversa:
     canonical: mezzanotte_orbitale
     status: expansion
     notes: "Classe T3 apex ambientata nella Mezzanotte Orbitale e nei suoi loop gravitazionali."
+  sinaptic_trench:
+    canonical: frattura_abissale_sinaptica
+    status: expansion
+    notes: "Alias operativo per la Frattura Abissale Sinaptica e le sue dorsali fotofase."
+  trench_sinaptico_profondo:
+    canonical: frattura_abissale_sinaptica
+    status: expansion
+    notes: "Variante deepwater per referenziare la Frattura Nera e i cori voidsong."
+  scarpata_fotofase:
+    canonical: frattura_abissale_sinaptica
+    status: expansion
+    notes: "Alias T1 legato alle creste superficiali luminescenti del nuovo bioma."
```

--- PATCH 4: biomes/terraforming_bands.yaml ---
```diff
@@
 env_params: [temperature, atmosphere, biomass, humidity]
 telemetry:
   events: [biome_param_changed, band_reached, slot_unlocked]
 TODO: "Definire funzioni di drift e strumenti ambientali."
+
+# Profilazione sandbox per Frattura Abissale Sinaptica (T1–T3)
+profiles:
+  frattura_abissale_sinaptica:
+    bands:
+      T1: { level: "cresta_fotofase", env_window: { temperature: ["temperate", "warm"], atmosphere: ["oxygenated", "ionized"], biomass: ["medium", "high"], humidity: ["high", "saturated"] } }
+      T2: { level: "soglia_crepuscolare", env_window: { temperature: ["temperate", "cool"], atmosphere: ["low_oxygen", "ionized_sparse"], biomass: ["medium", "low"], humidity: ["medium", "high"] } }
+      T3: { level: "frattura_nera", env_window: { temperature: ["cold", "frigid"], atmosphere: ["anoxic", "ionized_deep"], biomass: ["low", "medium"], humidity: ["saturated", "saturated"] } }
```

--- PATCH 5: data/core/traits/glossary.json ---
```diff
@@ "traits": {
   "antenne_waveguide": {
     "label_it": "Antenne Waveguide",
     ...
   },
+  "coralli_sinaptici_fotofase": { "label_it": "Coralli Sinaptici Fotofase", "label_en": "Photophase Synaptic Corals", "description_it": "Barriere bioelettriche che canalizzano luce e impulsi.", "description_en": "Bioelectric coral ridges channeling light and impulses." },
+  "membrane_fotoconvoglianti": { "label_it": "Membrane Fotoconvoglianti", "label_en": "Photoconductive Membranes", "description_it": "Tessuti che trasportano cariche luminose tra nodi sinaptici.", "description_en": "Tissues that ferry luminous charge between synaptic nodes." },
+  "nodi_sinaptici_superficiali": { "label_it": "Nodi Sinaptici Superficiali", "label_en": "Surface Synaptic Nodes", "description_it": "Reticolo di nodi che amplificano segnali superficiali.", "description_en": "Node lattice amplifying surface signals." },
+  "impulsi_bioluminescenti": { "label_it": "Impulsi Bioluminescenti", "label_en": "Bioluminescent Pulses", "description_it": "Scariche ritmiche che abbagliano e sincronizzano alleati.", "description_en": "Rhythmic flashes that dazzle foes and sync allies." },
+  "filamenti_guidalampo": { "label_it": "Filamenti Guidalampo", "label_en": "Lightning Guide Filaments", "description_it": "Filamenti che tracciano rotte sicure nelle correnti.", "description_en": "Filaments plotting safe routes through currents." },
+  "sensori_planctonici": { "label_it": "Sensori Planctonici", "label_en": "Planctonic Sensors", "description_it": "Sensori diffusi che leggono pattern di plancton memetico.", "description_en": "Distributed sensors reading memetic plankton patterns." },
+  "squame_diffusori_ionici": { "label_it": "Squame Diffusori Ionici", "label_en": "Ionic Diffuser Scales", "description_it": "Squame che disperdono cariche e riducono glare.", "description_en": "Scales dispersing charge and reducing glare." },
+  "nebbia_mnesica": { "label_it": "Nebbia Mnesica", "label_en": "Mnesic Fog", "description_it": "Foschia psionica che offusca memorie e orientamento.", "description_en": "Psionic mist that blurs memory and orientation." },
+  "lobi_risonanti_crepuscolo": { "label_it": "Lobi Risonanti Crepuscolo", "label_en": "Twilight Resonant Lobes", "description_it": "Camere risonanti che filtrano segnali instabili.", "description_en": "Resonant chambers filtering unstable signals." },
+  "placca_diffusione_foschia": { "label_it": "Placca di Diffusione Foschia", "label_en": "Fog Diffusion Plate", "description_it": "Placche che diffondono e attenuano cariche erratiche.", "description_en": "Plates diffusing and attenuating erratic charges." },
+  "spicole_canalizzatrici": { "label_it": "Spicole Canalizzatrici", "label_en": "Channeling Spicules", "description_it": "Spine che assorbono buff e li reindirizzano.", "description_en": "Spines absorbing buffs and redirecting them." },
+  "secrezioni_antistatiche": { "label_it": "Secrezioni Antistatiche", "label_en": "Antistatic Secretions", "description_it": "Film protettivo che disperde accumuli elettrici.", "description_en": "Protective film dispersing electrical build-up." },
+  "organi_metacronici": { "label_it": "Organi Metacronici", "label_en": "Metachronic Organs", "description_it": "Organi che sequenziano furti di buff in catena.", "description_en": "Organs sequencing chained buff thefts." },
+  "ghiandole_mnemoniche": { "label_it": "Ghiandole Mnemoniche", "label_en": "Mnemonic Glands", "description_it": "Secrezioni che trattengono copie attenuate di buff.", "description_en": "Secretions holding attenuated buff copies." },
+  "camere_risonanza_abyssal": { "label_it": "Camere di Risonanza Abyssal", "label_en": "Abyssal Resonance Chambers", "description_it": "Caverne interne che amplificano onde elettriche/gravitazionali.", "description_en": "Internal caverns amplifying electric/gravitational waves." },
+  "corazze_ferro_magnetico": { "label_it": "Corazze Ferro-Magnetico", "label_en": "Ferro-Magnetic Carapace", "description_it": "Placche ferrose che guidano campi magnetici profondi.", "description_en": "Iron plates guiding deep magnetic fields." },
+  "bioantenne_gravitiche": { "label_it": "Bioantenne Gravitiche", "label_en": "Gravitic Bio-Antennae", "description_it": "Antenne che leggono shear gravitazionali e li convertono in segnali.", "description_en": "Antennae reading gravitic shear and converting to signals." },
+  "emettitori_voidsong": { "label_it": "Emettitori Voidsong", "label_en": "Voidsong Emitters", "description_it": "Organi che emettono cori a frequenze profonde per stabilizzare lo shear.", "description_en": "Organs emitting deep choruses to stabilise shear." },
+  "emolinfa_conducente": { "label_it": "Emolinfa Conducente", "label_en": "Conductive Hemolymph", "description_it": "Fluido che accumula carica e drena energia nemica.", "description_en": "Fluid storing charge and draining enemy energy." },
+  "placche_pressioniche": { "label_it": "Placche Pressioniche", "label_en": "Pressure Plates", "description_it": "Strati che disperdono pressione abissale e riducono trauma.", "description_en": "Layers dispersing abyssal pressure and reducing trauma." },
+  "filamenti_echo": { "label_it": "Filamenti Echo", "label_en": "Echo Filaments", "description_it": "Filamenti che rilanciano frequenze di squadra e attenuano shear.", "description_en": "Filaments relaying squad frequencies and softening shear." },
+  "scintilla_sinaptica": { "label_it": "Scintilla Sinaptica", "label_en": "Synaptic Spark", "description_it": "Scarica leggera che illumina connessioni e riflessi (temp).", "description_en": "Light discharge illuminating connections and reflexes (temp)." },
+  "riverbero_memetico": { "label_it": "Riverbero Memetico", "label_en": "Memetic Reverb", "description_it": "Eco cognitivo che duplica buff a potenza ridotta (temp).", "description_en": "Cognitive echo duplicating buffs at reduced power (temp)." },
+  "pelle_piezo_satura": { "label_it": "Pelle Piezo-Satura", "label_en": "Piezo-Saturated Skin", "description_it": "Dermide che accumula carica piezoelettrica e riflette colpi (temp).", "description_en": "Dermis storing piezo charge and reflecting blows (temp)." },
+  "canto_risonante": { "label_it": "Canto Risonante", "label_en": "Resonant Chant", "description_it": "Frequenze che armonizzano il gruppo e riducono stress (temp).", "description_en": "Frequencies harmonising the squad and reducing stress (temp)." },
+  "vortice_nera_flash": { "label_it": "Vortice Nera Flash", "label_en": "Black Vortex Flash", "description_it": "Implosione luminosa seguita da vuoto e teletrasporto breve (temp).", "description_en": "Luminous implosion followed by void and short teleport (temp)." }
```

--- PATCH 6: data/traits/index.json ---
```diff
@@ "traits": {
   "ali_fulminee": { ... },
+  "coralli_sinaptici_fotofase": { "id": "coralli_sinaptici_fotofase", "label": "Coralli Sinaptici Fotofase", "famiglia_tipologia": "Ambiente/Supporto", "data_origin": "frattura_abissale_sinaptica", "requisiti_ambientali": [{ "fonte": "env_to_traits", "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1", "notes": "Cresta Fotofase" } }], "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "sinergie": ["glare_control", "buff_luminescente"] },
+  "membrane_fotoconvoglianti": { "id": "membrane_fotoconvoglianti", "label": "Membrane Fotoconvoglianti", "famiglia_tipologia": "Difesa/Elettrico", "data_origin": "frattura_abissale_sinaptica", "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1" } }], "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "conflitti": ["affaticamento_oculare"] },
+  "nodi_sinaptici_superficiali": { "id": "nodi_sinaptici_superficiali", "label": "Nodi Sinaptici Superficiali", "famiglia_tipologia": "Supporto/Sensore", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1" } }], "sinergie": ["buff_coordinamento"] },
+  "impulsi_bioluminescenti": { "id": "impulsi_bioluminescenti", "label": "Impulsi Bioluminescenti", "famiglia_tipologia": "Offensivo/Illuminazione", "data_origin": "frattura_abissale_sinaptica", "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1" } }], "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "sinergie": ["dazzle_chain"] },
+  "filamenti_guidalampo": { "id": "filamenti_guidalampo", "label": "Filamenti Guidalampo", "famiglia_tipologia": "Mobilità/Logistica", "data_origin": "frattura_abissale_sinaptica", "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1" } }], "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true } },
+  "sensori_planctonici": { "id": "sensori_planctonici", "label": "Sensori Planctonici", "famiglia_tipologia": "Analisi", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1" } }], "sinergie": ["scan_memetico"] },
+  "squame_diffusori_ionici": { "id": "squame_diffusori_ionici", "label": "Squame Diffusori Ionici", "famiglia_tipologia": "Difesa/Elettrico", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T1" } }], "conflitti": ["overcharge_cronico"] },
+  "nebbia_mnesica": { "id": "nebbia_mnesica", "label": "Nebbia Mnesica", "famiglia_tipologia": "Controllo", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }] },
+  "lobi_risonanti_crepuscolo": { "id": "lobi_risonanti_crepuscolo", "label": "Lobi Risonanti Crepuscolo", "famiglia_tipologia": "Risonanza", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }], "sinergie": ["canali_psionici"] },
+  "placca_diffusione_foschia": { "id": "placca_diffusione_foschia", "label": "Placca Diffusione Foschia", "famiglia_tipologia": "Difesa", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }], "conflitti": ["visibility_loss"] },
+  "spicole_canalizzatrici": { "id": "spicole_canalizzatrici", "label": "Spicole Canalizzatrici", "famiglia_tipologia": "Supporto/Furtivo", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }], "sinergie": ["furto_buff"] },
+  "secrezioni_antistatiche": { "id": "secrezioni_antistatiche", "label": "Secrezioni Antistatiche", "famiglia_tipologia": "Difesa", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }], "conflitti": ["overload_autoinflitto"] },
+  "organi_metacronici": { "id": "organi_metacronici", "label": "Organi Metacronici", "famiglia_tipologia": "Tempo/Furto", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }] },
+  "ghiandole_mnemoniche": { "id": "ghiandole_mnemoniche", "label": "Ghiandole Mnemoniche", "famiglia_tipologia": "Supporto/Memoria", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T2" } }], "sinergie": ["echo_memetico"] },
+  "camere_risonanza_abyssal": { "id": "camere_risonanza_abyssal", "label": "Camere di Risonanza Abyssal", "famiglia_tipologia": "Risonanza/Boss", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }] },
+  "corazze_ferro_magnetico": { "id": "corazze_ferro_magnetico", "label": "Corazze Ferro-Magnetico", "famiglia_tipologia": "Difesa/Boss", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }], "conflitti": ["corrosione_profonda"] },
+  "bioantenne_gravitiche": { "id": "bioantenne_gravitiche", "label": "Bioantenne Gravitiche", "famiglia_tipologia": "Sensore/Grav", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }], "sinergie": ["controllo_spazio"] },
+  "emettitori_voidsong": { "id": "emettitori_voidsong", "label": "Emettitori Voidsong", "famiglia_tipologia": "Risonanza/Supporto", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }] },
+  "emolinfa_conducente": { "id": "emolinfa_conducente", "label": "Emolinfa Conducente", "famiglia_tipologia": "Supporto/Energetico", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }] },
+  "placche_pressioniche": { "id": "placche_pressioniche", "label": "Placche Pressioniche", "famiglia_tipologia": "Difesa", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": false, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }] },
+  "filamenti_echo": { "id": "filamenti_echo", "label": "Filamenti Echo", "famiglia_tipologia": "Supporto/Risonanza", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "requisiti_ambientali": [{ "condizioni": { "biome_class": "frattura_abissale_sinaptica" }, "meta": { "tier": "T3" } }] },
+  "scintilla_sinaptica": { "id": "scintilla_sinaptica", "label": "Scintilla Sinaptica", "famiglia_tipologia": "temp_trait", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "rarita": "uncommon", "note_temp": { "durata": 2, "stack_max": 2, "cooldown": 3 } },
+  "riverbero_memetico": { "id": "riverbero_memetico", "label": "Riverbero Memetico", "famiglia_tipologia": "temp_trait", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "rarita": "rare", "note_temp": { "durata": 1, "stack_max": 1, "cooldown": 3, "non_duplicable": ["canto_risonante", "pelle_piezo_satura"] } },
+  "pelle_piezo_satura": { "id": "pelle_piezo_satura", "label": "Pelle Piezo-Satura", "famiglia_tipologia": "temp_trait", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "rarita": "rare", "note_temp": { "durata": 3, "stack_max": 1 } },
+  "canto_risonante": { "id": "canto_risonante", "label": "Canto Risonante", "famiglia_tipologia": "temp_trait", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "rarita": "rare", "note_temp": { "durata": 2, "stack_max": 1, "gating": "no_duplicate_with_reverb" } },
+  "vortice_nera_flash": { "id": "vortice_nera_flash", "label": "Vortice Nera Flash", "famiglia_tipologia": "temp_trait", "data_origin": "frattura_abissale_sinaptica", "completion_flags": { "has_biome": true, "has_data_origin": true, "has_species_link": true, "has_usage_tags": true }, "rarita": "rare", "note_temp": { "durata": 1, "stack_max": 1, "cooldown": 4 } }
```

--- PATCH 7: data/traits/species_affinity.json ---
```diff
@@
+"coralli_sinaptici_fotofase": [
+  { "roles": ["core"], "species_id": "polpo-araldo-sinaptico", "weight": 3 }
+],
+"impulsi_bioluminescenti": [
+  { "roles": ["core"], "species_id": "polpo-araldo-sinaptico", "weight": 3 },
+  { "roles": ["core"], "species_id": "leviatano-risonante", "weight": 2 }
+],
+"nebbia_mnesica": [
+  { "roles": ["core"], "species_id": "sciame-larve-neurali", "weight": 3 }
+],
+"lobi_risonanti_crepuscolo": [
+  { "roles": ["core"], "species_id": "polpo-araldo-sinaptico", "weight": 1 },
+  { "roles": ["core"], "species_id": "leviatano-risonante", "weight": 1 },
+  { "roles": ["core"], "species_id": "simbionte-corallino-riflesso", "weight": 2 }
+],
+"camere_risonanza_abyssal": [
+  { "roles": ["core"], "species_id": "leviatano-risonante", "weight": 4 }
+],
+"emettitori_voidsong": [
+  { "roles": ["core"], "species_id": "leviatano-risonante", "weight": 3 }
+],
+"scintilla_sinaptica": [
+  { "roles": ["temp"], "species_id": "polpo-araldo-sinaptico", "weight": 2 },
+  { "roles": ["temp"], "species_id": "simbionte-corallino-riflesso", "weight": 1 }
+],
+"canto_risonante": [
+  { "roles": ["temp"], "species_id": "polpo-araldo-sinaptico", "weight": 1 },
+  { "roles": ["temp"], "species_id": "leviatano-risonante", "weight": 2 }
+],
+"riverbero_memetico": [
+  { "roles": ["temp"], "species_id": "sciame-larve-neurali", "weight": 2 },
+  { "roles": ["temp"], "species_id": "simbionte-corallino-riflesso", "weight": 1 }
+],
+"vortice_nera_flash": [
+  { "roles": ["temp"], "species_id": "sciame-larve-neurali", "weight": 1 },
+  { "roles": ["temp"], "species_id": "leviatano-risonante", "weight": 1 }
+],
+"pelle_piezo_satura": [
+  { "roles": ["temp"], "species_id": "leviatano-risonante", "weight": 2 }
+]
```

--- PATCH 8: data/core/species.yaml ---
```diff
@@ species:
   - id: dune_stalker
     ...
+  - id: polpo-araldo-sinaptico
+    display_name: Polpo Araldo Sinaptico
+    estimated_weight: 14
+    weight_budget: 14
+    biome_affinity: frattura_abissale_sinaptica
+    default_parts: {}
+    trait_plan:
+      core: [impulsi_bioluminescenti, nodi_sinaptici_superficiali, membrane_fotoconvoglianti, lobi_risonanti_crepuscolo]
+      optional: [filamenti_guidalampo, sensori_planctonici, ghiandole_mnemoniche, secrezioni_antistatiche]
+      temp: [scintilla_sinaptica, canto_risonante]
+    synergy_hints:
+      role: keystone
+      notes: "Buff area luminescenti, riduzione glare; limitare stacking advantage a 2."
+
+  - id: sciame-larve-neurali
+    display_name: Sciame di Larve Neurali
+    estimated_weight: 9
+    weight_budget: 10
+    biome_affinity: frattura_abissale_sinaptica
+    default_parts: {}
+    trait_plan:
+      core: [nebbia_mnesica, lobi_risonanti_crepuscolo, ghiandole_mnemoniche, organi_metacronici]
+      optional: [secrezioni_antistatiche, spicole_canalizzatrici, filamenti_echo]
+      temp: [riverbero_memetico, vortice_nera_flash]
+    synergy_hints:
+      role: threat
+      notes: "Swarm memetico che ruba buff; cap 1 buff/cluster, durata 2 turni."
+
+  - id: leviatano-risonante
+    display_name: Leviatano Risonante
+    estimated_weight: 28
+    weight_budget: 30
+    biome_affinity: frattura_abissale_sinaptica
+    default_parts: {}
+    trait_plan:
+      core: [camere_risonanza_abyssal, emettitori_voidsong, corazze_ferro_magnetico, bioantenne_gravitiche]
+      optional: [emolinfa_conducente, placche_pressioniche, filamenti_echo, spicole_canalizzatrici, lobi_risonanti_crepuscolo]
+      temp: [pelle_piezo_satura, canto_risonante, vortice_nera_flash]
+    synergy_hints:
+      role: apex
+      notes: "Forma armonica/shear; switch gratuito 1/encounter da corrente, costo stress 0.05 per switch manuale."
+
+  - id: simbionte-corallino-riflesso
+    display_name: Simbionte Corallino Riflesso
+    estimated_weight: 15
+    weight_budget: 15
+    biome_affinity: frattura_abissale_sinaptica
+    default_parts: {}
+    trait_plan:
+      core: [coralli_sinaptici_fotofase, membrane_fotoconvoglianti, placca_diffusione_foschia, organi_metacronici, nodi_sinaptici_superficiali]
+      optional: [filamenti_guidalampo, ghiandole_mnemoniche, sensori_planctonici, emolinfa_conducente]
+      temp: [scintilla_sinaptica, riverbero_memetico, canto_risonante]
+    synergy_hints:
+      role: flex
+      notes: "Copia partial-trait al 50–75% per 2 turni, 1 slot temp, cooldown 3 turni."
```

--- PATCH 9: data/core/game_functions.yaml ---
```diff
 functions:
   - telemetria_vc
   - mating_nido
   - progressione_pe
   - hud_smart_alerts
   - stresswave_monitoring
   - pi_shop
+  - correnti_elettroluminescenti_handler
+  - forma_variabile_leviatano
+  - temp_traits_cooldown_guardrail
```

--- PATCH 10: docs/biomes.md ---
```diff
@@
 ## Biomi disponibili
 ...
+- **Frattura Abissale Sinaptica** — Bioma abissale stratificato in tre livelli (Cresta Fotofase, Soglia Crepuscolare, Frattura Nera) attraversato da correnti elettroluminescenti che applicano trait temporanei. Pool dedicati: fotofase_synaptic_ridge, crepuscolo_synapse_bloom, frattura_void_choir. Alias: sinaptic_trench, trench_sinaptico_profondo, scarpata_fotofase.
```

--- PATCH 11: docs/trait_reference_manual.md ---
```diff
@@
 ### Nuovi trait ambientali – Frattura Abissale Sinaptica
+* fotofase_synaptic_ridge: core [coralli_sinaptici_fotofase, membrane_fotoconvoglianti, nodi_sinaptici_superficiali, impulsi_bioluminescenti]; support [filamenti_guidalampo, sensori_planctonici, squame_diffusori_ionici].
+* crepuscolo_synapse_bloom: core [nebbia_mnesica, lobi_risonanti_crepuscolo, placca_diffusione_foschia, spicole_canalizzatrici]; support [secrezioni_antistatiche, organi_metacronici, ghiandole_mnemoniche].
+* frattura_void_choir: core [camere_risonanza_abyssal, corazze_ferro_magnetico, bioantenne_gravitiche, emettitori_voidsong]; support [emolinfa_conducente, placche_pressioniche, filamenti_echo].
+
+### Trait temporanei – Correnti Elettroluminescenti
+* scintilla_sinaptica (temp): +1 priorità reazioni, +5% crit elettrico, durata 2, stack 2.
+* riverbero_memetico (temp): duplica prossimo buff al 50%, -10% difesa mentale, durata 1, stack 1, no duplicazione canto/pelle.
+* pelle_piezo_satura (temp): -15% danni fisici, 5 danni elettrici da contatto, durata 3, stack 1.
+* canto_risonante (temp): vantaggio concentrazione, -0.02 stress incoming, durata 2, stack 1.
+* vortice_nera_flash (temp): teletrasporto breve + azzeramento minaccia, +5 stress, durata 1, stack 1.
```

--- PATCH 12: docs/catalog/bioma_frattura_abissale_sinaptica.md ---
```diff
+---
+title: 'Catalogo – Bioma Frattura Abissale Sinaptica'
+slug: frattura_abissale_sinaptica
+levels:
+  - Cresta Fotofase
+  - Soglia Crepuscolare
+  - Frattura Nera
+pools:
+  - fotofase_synaptic_ridge
+  - crepuscolo_synapse_bloom
+  - frattura_void_choir
+temp_traits:
+  - scintilla_sinaptica
+  - riverbero_memetico
+  - pelle_piezo_satura
+  - canto_risonante
+  - vortice_nera_flash
+assets:
+  banner: assets/biomes/frattura_abissale_sinaptica/banner.png
+  icon_levels:
+    cresta_fotofase: assets/biomes/frattura_abissale_sinaptica/cresta_fotofase.png
+    soglia_crepuscolare: assets/biomes/frattura_abissale_sinaptica/soglia_crepuscolare.png
+    frattura_nera: assets/biomes/frattura_abissale_sinaptica/frattura_nera.png
+notes: 'Scheda sandbox per integrazione asset; da coordinare con asset-prep.'
+---
```
```

## Comando di integrazione SAFE (ordine aggiornato)
```
git checkout -b feature/frattura-abissale
# ordine consigliato per rispettare le dipendenze: pool/bioma → trait → species → affinity → balance → docs
git apply PATCH1.diff PATCH2.diff PATCH3.diff PATCH4.diff PATCH5.diff PATCH6.diff PATCH8.diff PATCH7.diff PATCH9.diff PATCH10.diff PATCH11.diff PATCH12.diff
npm run lint && npm test || echo "Fix required"
```

## Checklist di validazione schema
- ajv/jsonschema su data/core/traits/biome_pools.json, data/traits/index.json, data/traits/species_affinity.json
- yamllint su data/core/biomes.yaml, data/core/biome_aliases.yaml, biomes/terraforming_bands.yaml
- validator slug univoci (trait, specie, bioma, alias)
- stress_modifiers in range e pool size coerenti (min/max vs numero trait)
- trait_plan ↔ pool ↔ temp_traits coerenti con species.yaml

## Piano di merge finale (ordine patch aggiornato)
1) Applicare patch 1–4 (pool, bioma, alias, terraform) e validare schema/slug.
2) Applicare patch 5–6 (glossary, index) con lint JSON.
3) Applicare patch 8 (species) prima di patch 7 (species_affinity) per evitare riferimenti mancanti; quindi patch 9 (game_functions).
4) Applicare patch 10–12 (documentazione/catalogo) e aggiornare changelog.
5) CI completa + review bilanciamento; merge branch `feature/frattura-abissale` su main.
