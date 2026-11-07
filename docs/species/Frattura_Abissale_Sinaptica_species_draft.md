---
title: 'Frattura Abissale Sinaptica – Step 5 (Specie collegate, STRICT MODE / SANDBOX)'
description: 'Output species-curator: trait_plan e biome_affinity per le quattro specie del bioma, senza modifiche ai dataset core'
---

## Piano sintetico (3–7 punti)

1. Allinea le quattro specie al perimetro di Step 3–4 usando i pool proposti (fotofase_synaptic_ridge, crepuscolo_synapse_bloom, frattura_void_choir) senza scrivere nei file dati.
2. Seleziona trait_plan core/support con slug coerenti e compatibili con i role_templates e i trait temporanei da corrente.
3. Definisci temp_traits consigliati e note di comportamento per il biome_affinity di ciascuna specie.
4. Evidenzia sinergie/conflitti e rischi di stacking per preparare il bilanciamento (Step 6).
5. Fornisci note operative per il balancer e per l’integrazione futura nei dataset (schema_version 1.0).

## Specie collegate (strict-mode draft)

### Polpo Araldo Sinaptico (ruolo: support / buffer bioma)

- **biome_affinity:** Cresta Fotofase (primaria), Soglia Crepuscolare (secondaria) – segue corridoi luminosi, evita Frattura Nera salvo scorta.
- **trait_plan.core:** impulsi_bioluminescenti; nodi_sinaptici_superficiali; membrane_fotoconvoglianti; lobi_risonanti_crepuscolo (ponte con livello 2).
- **trait_plan.support:** filamenti_guidalampo; sensori_planctonici; ghiandole_mnemoniche (per buff memoria); secrezioni_antistatiche (riduce overload da correnti).
- **temp_traits consigliati:** scintilla_sinaptica (boost reattivo); canto_risonante (sincronizza buff di gruppo).
- **sinergie / conflitti:** potenzia affixes elettrici e luminescenti; rischio di glare se combinato con riverbero_memetico; richiede limitare stacking con più fonti di advantage.
- **note Step 6:** mantenere come keystone di livello 1–2, con buff che propagano stress ridotto; prevedere scaling soft su composizioni swarm per evitare buff eccessivi.

### Sciame di Larve Neurali (ruolo: swarm / manipolazione trait)

- **biome_affinity:** Soglia Crepuscolare (primaria), Frattura Nera (occasionale per raid), legami larvali con Cresta Fotofase per nascita.
- **trait_plan.core:** nebbia_mnesica; lobi_risonanti_crepuscolo; ghiandole_mnemoniche; organi_metacronici (sequenze di furto buff).
- **trait_plan.support:** secrezioni_antistatiche (protezione autonoma); spicole_canalizzatrici (assorbimento/redistribuzione buff); filamenti_echo (eco risonante verso alleati swarm).
- **temp_traits consigliati:** riverbero_memetico (duplica buff rubati); vortice_nera_flash (disimpegno rapido dopo il furto).
- **interazioni trait temporanei:** può sequestrare temp_traits attivi e riapplicarli ridotti (50%) a unità swarm; richiede limite di stack per non duplicare infinito.
- **note Step 6:** definire cap ai buff rubati (es. 1 buff per cluster), aggiungere rischio di fallimento su target boss; bilanciare stress aggiuntivo per auto-regolazione swarm.

### Leviatano Risonante (ruolo: boss / forma variabile)

- **biome_affinity:** Frattura Nera (primaria), Soglia Crepuscolare come zona di caccia; evita superfici salvo eventi.
- **trait_plan.core:** camere_risonanza_abyssal; emettitori_voidsong; corazze_ferro_magnetico; bioantenne_gravitiche.
- **trait_plan.support:** emolinfa_conducente; placche_pressioniche; filamenti_echo; spicole_canalizzatrici (per modulare scariche); lobi_risonanti_crepuscolo (forma intermedia).
- **temp_traits integrati:** canto_risonante (forma armonica difensiva); vortice_nera_flash (burst di movimento e reset minaccia); pelle_piezo_satura (tank stance conduttiva).
- **forma variabile (proposta):** modalità armonica (riduzione danni, buff concentrazione) ↔ modalità shear (controllo_spazio, danni elettrici) guidate da trigger di stress/ondata.
- **note Step 6:** calibrare transizioni di forma con costi in stress o cooldown; evitare stacking simultaneo di canto_risonante + pelle_piezo_satura senza tradeoff; prevedere valori di hp/armor coerenti con tier 5 apex.

### Simbionte Corallino Riflesso (ruolo: ibrido / copia partial-traits)

- **biome_affinity:** ibrido tra Cresta Fotofase e Soglia Crepuscolare; può adattarsi temporaneamente alla Frattura Nera se protetto da buff elettrostatici.
- **trait_plan.core:** coralli_sinaptici_fotofase; membrane_fotoconvoglianti; placca_diffusione_foschia; organi_metacronici (buffer per copia); nodi_sinaptici_superficiali.
- **trait_plan.support:** filamenti_guidalampo; ghiandole_mnemoniche; sensori_planctonici; emolinfa_conducente (per resistere a correnti profonde); mirror_spore (proposta di trait copia parziale da glossary update).
- **temp_traits consigliati:** scintilla_sinaptica (innesco copia rapida); riverbero_memetico (copia ridotta del buff target, 50% potenza, 1 turno); canto_risonante (stabilità durante copia).
- **meccanica copia partial-trait:** può replicare un trait attivo (core/support/temp) al 50–75% efficacia per 2 turni, consumando slot support; non può copiare apex-exclusive; rischio di conflitto con stacking luminescente.
- **note Step 6:** imporre cooldown tra copie e un limite di “memoria” (1 trait copiato attivo); definire priorità di copia e degrado progressivo; controllare interazione con riverbero_memetico per evitare doppia duplicazione.

## Note generali per integrazione dati (non eseguire ora)

- Agganciare trait_plan ai pool livello (L1 fotofase_synaptic_ridge, L2 crepuscolo_synapse_bloom, L3 frattura_void_choir) rispettando schema_version 1.0.
- Mappare biome_affinity in data/core/species.yaml con alias coerenti; aggiungere entry in data/traits/species_affinity.json per trait temporanei suggeriti.
- Validare slug con data/core/traits/glossary.json e data/traits/index.json prima di inserimento; evitare conflitti con trait elettrici/gravitazionali esistenti.

## Self-critique (Step 5)

- **Coerenza con Step 3–4:** i trait_plan usano esclusivamente slug proposti nei pool e nei temp_traits; resta da confermare size e tier esatti per ciascun trait in fase di data entry.
- **Rischi di overlap:** Polpo e Simbionte condividono buff luminosi; mantenere ruoli distinti (Polpo = supporto area, Simbionte = copia mirata). Sciame e Simbionte possono sovrapporsi su furto/copia: imporre differenze di cap e durata.
- **Stacking temp_traits:** combinazioni di riverbero_memetico + canto_risonante possono creare loop di duplicazione; richiede limiti hard (no duplicati su temp già duplicati) e diminishing returns.
- **Note per il Balancer (Step 6):** definire cooldown/costi stress per temp_traits rubati o copiati; calibrare il Leviatano con budget numerico da boss tier 5 e gating delle forme; fissare limiti di buff area per il Polpo per non invalidare altri supporti.
