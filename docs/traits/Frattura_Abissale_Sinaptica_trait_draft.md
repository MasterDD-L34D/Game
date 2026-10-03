---
title: 'Frattura Abissale Sinaptica – Step 4 (Trait ambientali e correnti, STRICT MODE / SANDBOX)'
description: 'Output trait-curator: proposta pool ambientali per i tre livelli e trait temporanei da correnti elettroluminescenti'
---

## Piano sintetico (3–7 punti)

1. Allinea pool e trait al contesto tecnico di Step 3 senza toccare i dataset core (schema_version 1.0 di biome_pools.json).
2. Costruisci tre pool dedicati (fotofase_synaptic_ridge, crepuscolo_synapse_bloom, frattura_void_choir) con climate_tags, hazard, core/support e role_templates coerenti con il repo.
3. Definisci un set di trait temporanei modellati sulle correnti elettroluminescenti, con effetti narrativi e meccanici più durata proposta.
4. Evidenzia le patch proposte per glossary/index/species_affinity senza modificarle, così da guidare l’integrazione dati.
5. Esplicita rischi di stacking e compatibilità slug per preparare lo Species Curator (Step 5).

## Pool ambientali (proposta, non scrivere nei dataset)

### 1) fotofase_synaptic_ridge (livello: Cresta Fotofase)

- **climate_tags:** ["luminescente", "pelagico_superficiale", "elettroattivo"]
- **hazard (derivato Step 3):** severity: medium; stress_modifiers: { photic_surge: 0.04, synaptic_glare: 0.05 }
- **summary (proposta):** barriere coralline sinaptiche che convogliano luce e impulsi elettrici superficiali.
- **ecology (proposta):** biome_type: trench_superficiale; primary_resources: ["coralli_sinaptici", "nebbia_fotofase"]; notes: corridoi luminosi che segnano rotte per messaggeri e supporto.
- **size (coerente con range esistenti):** min 3, max 5
- **traits.core:**
  - coralli_sinaptici_fotofase
  - membrane_fotoconvoglianti
  - nodi_sinaptici_superficiali
  - impulsi_bioluminescenti
- **traits.support:**
  - filamenti_guidalampo
  - sensori_planctonici
  - squame_diffusori_ionici
- **role_templates:**
  - apex | "Araldo Fotofase" | dominatore di correnti superficiali, applica dazzled/overload | functional_tags: ["controllo_campo", "elettrico"], preferred_traits: ["impulsi_bioluminescenti", "membrane_fotoconvoglianti"], tier: 4
  - keystone | "Custode dei Coralli Sinaptici" | stabilizza le barriere e amplifica buff ai support | functional_tags: ["supporto", "rigenerazione"], preferred_traits: ["coralli_sinaptici_fotofase", "nodi_sinaptici_superficiali"], tier: 3
  - bridge | "Messaggero Fosfo" | traccia percorsi sicuri con segnali bioelettrici | functional_tags: ["ricognizione", "logistica"], preferred_traits: ["filamenti_guidalampo"], tier: 2
  - event | "Marea di Spore Luminescenti" | evento stagionale che duplica buff luminosi ma aumenta glare | functional_tags: ["evento", "luminescenza"], preferred_traits: ["impulsi_bioluminescenti"], tier: 2

### 2) crepuscolo_synapse_bloom (livello: Soglia Crepuscolare)

- **climate_tags:** ["crepuscolare", "foschia_sinaptica", "elettrico_irregolare"]
- **hazard (derivato Step 3):** severity: high; stress_modifiers: { memory_fog: 0.06, desync_field: 0.05 }
- **summary (proposta):** strato di nebbie psioniche che distorcono orientamento e memoria a breve termine.
- **ecology (proposta):** biome_type: trench_crepuscolare; primary_resources: ["plancton_mnesico", "condensa_ionica"]; notes: lobi risonanti creano canali sicuri ma mutevoli.
- **size:** min 4, max 6
- **traits.core:**
  - nebbia_mnesica
  - lobi_risonanti_crepuscolo
  - placca_diffusione_foschia
  - spicole_canalizzatrici
- **traits.support:**
  - secrezioni_antistatiche
  - organi_metacronici
  - ghiandole_mnemoniche
- **role_templates:**
  - apex | "Predatore Anamnestico" | forza i bersagli in stati di confusione e inversione comandi | functional_tags: ["controllo_mentale", "imboscata"], preferred_traits: ["nebbia_mnesica", "lobi_risonanti_crepuscolo"], tier: 4
  - keystone | "Curatore della Foschia" | mantiene la densità della nebbia e concede coperture psioniche | functional_tags: ["supporto", "copertura"], preferred_traits: ["placca_diffusione_foschia", "secrezioni_antistatiche"], tier: 3
  - threat | "Sciame Memetico" | micro-larve che rubano buff temporanei e li riapplicano in forma ridotta | functional_tags: ["sabotaggio", "furto_buff"], preferred_traits: ["ghiandole_mnemoniche", "organi_metacronici"], tier: 3
  - event | "Eclisse Sinaptica" | finestra di blackout sensoriale che resetta i timer delle correnti | functional_tags: ["evento", "crowd_control"], preferred_traits: ["nebbia_mnesica"], tier: 2

### 3) frattura_void_choir (livello: Frattura Nera)

- **climate_tags:** ["abissale", "gravitazionale", "elettrico_profondo", "sinaptico_dissonante"]
- **hazard (derivato Step 3):** severity: critical; stress_modifiers: { gravitic_shear: 0.08, black_current: 0.09 }
- **summary (proposta):** abisso risonante dove correnti magnetiche e gravità variabile piegano morfologie e segnali.
- **ecology (proposta):** biome_type: trench_abissale; primary_resources: ["ferro_memoria_profondo", "risonanze_voidsong"]; notes: cori di fondo mantengono ritmi per evitare shear.
- **size:** min 4, max 7
- **traits.core:**
  - camere_risonanza_abyssal
  - corazze_ferro_magnetico
  - bioantenne_gravitiche
  - emettitori_voidsong
- **traits.support:**
  - emolinfa_conducente
  - placche_pressioniche
  - filamenti_echo
- **role_templates:**
  - apex | "Leviatano Modulante" | cambia forma per adattarsi alla pressione e alle risonanze | functional_tags: ["boss", "forma_variabile"], preferred_traits: ["camere_risonanza_abyssal", "emettitori_voidsong"], tier: 5
  - keystone | "Coro di Fondo" | mantiene la frequenza di riferimento e riduce i danni da shear | functional_tags: ["supporto", "riduzione_danno"], preferred_traits: ["filamenti_echo", "bioantenne_gravitiche"], tier: 3
  - threat | "Sferzatore Magnetico" | crea campi che spingono/attraggono bersagli e ne drenano energia | functional_tags: ["controllo_spazio", "drain"], preferred_traits: ["corazze_ferro_magnetico", "emolinfa_conducente"], tier: 4
  - event | "Canto dello Strappo" | fenomeno che disallinea i trait temporanei e può invertirne gli effetti | functional_tags: ["evento", "anomalia"], preferred_traits: ["emettitori_voidsong"], tier: 3

## Trait temporanei da Corrente Elettroluminescente (proposta)

| slug                | tipo | effetto narrativo                                                | effetto meccanico                                                              | durata ideale | comportamento finale                                    |
| ------------------- | ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------- |
| scintilla_sinaptica | temp | Scarica leggera che illumina le connessioni e risveglia riflessi | +1 priorità azioni di reazione, +5% critico su abilità elettriche              | 2 turni       | Scintillio: svanisce senza malus                        |
| riverbero_memetico  | temp | Eco cognitivo che moltiplica pattern mnemonici                   | Duplica il prossimo buff positivo ma riduce difesa mentale del 10%             | 1 turno       | Soppressione: rimuove il duplicato se non consumato     |
| pelle_piezo_satura  | temp | Tessuti accumulano carica piezoelettrica diffusa                 | Riduce danni fisici del 15%, infligge 5 danni elettrici da contatto            | 3 turni       | Drenaggio: applica -5% velocità per 1 turno             |
| canto_risonante     | temp | Frequenze profonde che armonizzano il gruppo                     | Concede vantaggio a prove di concentrazione, riduce stress incoming di 0.02    | 2 turni       | Duplicazione ridotta: metà effetto persiste per 1 turno |
| vortice_nera_flash  | temp | Implosione luminosa che poi si richiude in vuoto                 | Teletrasporto breve (1 cella) e azzera minaccia per 1 turno, ma causa 5 stress | 1 turno       | Soppressione: rimuove minaccia azzerata, stress resta   |

## Patch proposte (non applicare, solo indicare)

- **data/core/traits/glossary.json:** aggiungere voci per i nuovi trait (core/support/temp) con descrizioni brevi e tag energetici (elettrico, sinaptico, gravitazionale, luminescente).
- **data/traits/index.json:** mappare i nuovi slug sotto le categorie esistenti (ambient, electric, abyssal) mantenendo camel-case coerente con lo standard corrente.
- **data/traits/species_affinity.json:** associare i quattro slug specie target ai pool di riferimento e ai trait temporanei più affini (es. Polpo Araldo → impulsi_bioluminescenti/scintilla_sinaptica; Sciame di Larve → riverbero_memetico; Leviatano → camere_risonanza_abyssal/canto_risonante; Simbionte → filamenti_guidalampo/copiatore di temp_traits quando disponibile).

## Handoff allo Species Curator (Step 5)

- Utilizzare i pool sopra come sorgente per trait_plan core/support delle quattro specie, includendo almeno un trait temp come interazione di kit.
- Validare che i trait core coincidano con i role_templates di ciascun livello per supportare sinergie e conflitti.
- Preparare affinità di biome/specie per agganciare i trait temporanei alle abilità di support/boss (Leviatano forma variabile, Polpo buff/debuff bioma, Sciame manipolazione, Simbionte copia partial-traits).

## Self-critique (Step 4)

- **Schema_version e pool:** le strutture proposte seguono schema_version 1.0 (id/label/summary/hazard/traits/role_templates); le summary/ecology sono già in bozza ma vanno validate e riportate nei campi corretti in data entry.
- **Naming/slug:** tutti i slug sono lowercase con underscore; verificare conflitti con glossary esistente e normalizzare prefissi (es. usare `voidsong` vs `void_song` se già occupato).
- **Rischi di stacking:** i trait temporanei con duplicazione (riverbero_memetico, canto_risonante) possono generare stacking eccessivo; imporre mutual exclusivity o diminishing returns nei campi di balance.
- **Per lo Species Curator:** richiede indicare size/min-max definitivi, summary dei pool, e confermare se i trait temporanei sono applicabili da abilità di specie o da eventi ambientali; serve anche definire tier/rarità per i trait temp in index.json.
