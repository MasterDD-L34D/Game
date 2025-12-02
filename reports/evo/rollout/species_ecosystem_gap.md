# Gap specie/ecosistemi Evo

Report generato da `tools/py/report_evo_species_ecosystem.py` consolidando il catalogo Evo con gli asset legacy.

- Dataset normalizzato: `reports/evo/rollout/species_ecosystem_matrix.csv`
- Specie analizzate: 10
- Righe ecotipo: 20
- Righe con mismatch trait ↔ legacy: 20

## Distribuzione indici di sentienza

| Indice | Conteggio |
| --- | ---: |
| T0 | 4 |
| T1 | 12 |
| T2 | 2 |
| T3 | 2 |

## Gap ecosistemi per biome class

| Biome class | Ecotipi senza match legacy |
| --- | ---: |
| acquatico_costiero | 2 |
| acquatico_dolce | 2 |
| sotterraneo | 1 |

## Dettaglio specie

| Specie | Sentienza | Legacy ID | Ecotipi allineati | Ecotipi scoperti | Trait Evo non in legacy | Trait legacy non coperti | Unknown trait refs | Slots legacy |
| --- | --- | --- | ---: | ---: | --- | --- | --- | ---: |
| Anguis magnetica | T1 | — | 0 | 2 | bozzolo_magnetico, elettromagnete_biologico, filtro_metallofago, integumento_bipolare, scivolamento_magnetico | — | — | 0 |
| Chemnotela toxica | T1 | — | 2 | 0 | articolazioni_a_leva_idraulica, filtrazione_osmotica, occhi_analizzatori_di_tensione, seta_conduttiva_elettrica, zanne_idracida | — | — | 0 |
| Elastovaranus hydrus | T1 | — | 2 | 0 | ectotermia_dinamica, ipertrofia_muscolare_massiva, organi_sismici_cutanei, rostro_emostatico_litico, scheletro_idraulico_a_pistoni | — | — | 0 |
| Gulogluteus scutiger | T1 | — | 2 | 0 | articolazioni_multiassiali, coda_prensile_muscolare, pelage_idrorepellente_avanzato, rostro_linguale_prensile, scudo_gluteale_cheratinizzato | — | — | 0 |
| Perfusuas pedes | T3 | — | 1 | 1 | artiglio_cinetico_a_urto, ermafroditismo_cronologico, estroflessione_gastrica_acida, locomozione_miriapode_ibrida, sistemi_chimio_sonici | — | — | 0 |
| Proteus plasma | T0 | — | 0 | 2 | cisti_di_ibernazione_minerale, fagocitosi_assorbente, flusso_ameboide_controllato, membrana_plastica_continua, moltiplicazione_per_fusione | — | — | 0 |
| Rupicapra sensoria | T2 | — | 2 | 0 | aura_di_dispersione_mentale, corna_psico_conduttive, metabolismo_di_condivisione_energetica, unghie_a_micro_adesione | — | coscienza_d_alveare_diffusa | 0 |
| Soniptera resonans | T1 | — | 2 | 0 | ali_fono_risonanti, campo_di_interferenza_acustica, cannone_sonico_a_raggio, cervello_a_bassa_latenza, occhi_cinetici | — | — | 0 |
| Terracetus ambulator | T0 | — | 2 | 0 | canto_infrasonico_tattico, cinghia_iper_ciliare, rete_filtro_polmonare, scheletro_pneumatico_a_maglie, siero_anti_gelo_naturale | — | — | 0 |
| Umbra alaris | T1 | — | 2 | 0 | artigli_ipo_termici, comunicazione_fotonica_coda_coda, motore_biologico_silenzioso, vello_di_assorbimento_totale, visione_multi_spettrale_amplificata | — | — | 0 |

## Slot legacy mancanti

Specie prive di slot legacy predefiniti: anguis_magnetica, chemnotela_toxica, elastovaranus_hydrus, gulogluteus_scutiger, perfusuas_pedes, proteus_plasma, rupicapra_sensoria, soniptera_resonans, terracetus_ambulator, umbra_alaris

## Dipendenze gameplay/telemetria

- Eventi `biome_param_changed`, `band_reached`, `slot_unlocked` definiti in `biomes/terraforming_bands.yaml`: aggiornare gli ingest consumer di telemetria affinché accettino payload con `biome_class` e `ecotype_id` derivati dal dataset normalizzato.
- Gli aggregatori (`server/services/nebulaTelemetryAggregator.js`) devono introdurre fallback per il conteggio di slot sfruttando `terraforming_max_slots` quando `legacy_default_slot_count` è zero.
- I controller Atlas (`server/controllers/atlasController.js`) dovrebbero arricchire i payload delle timeline con il campo `sentience_index` per consentire filtri cross-feature durante il rollout Evo.
- Aggiornare i bundle di mock telemetry (`server/app.js` → `loadMockTelemetry`) includendo i nuovi eventi per evitare errori di validazione schema.

## Milestone rollout proposte

1. **Dataset pilota** (Settimana 1): validare due specie con match biome completo (`Chemnotela toxica`, `Elastovaranus hydrus`).
2. **Integrazione telemetria** (Settimana 2): aggiornare consumer e mock per nuovi eventi, attivare monitor `biome_param_changed`.
3. **Copertura ecosistemi critici** (Settimana 3): colmare biome class `acquatico_costiero` e `sotterraneo` introducendo fallback slot e definendo nuove entry legacy.
4. **Rollout completo** (Settimana 4): abilitare tutte le specie con verifica incrociata trait↔legacy e aggiornamento documentazione atlas.

