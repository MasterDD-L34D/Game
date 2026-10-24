# Gap specie/ecosistemi Evo

Report generato da `tools/py/report_evo_species_ecosystem.py` consolidando il catalogo Evo con gli asset legacy.

- Dataset normalizzato: `reports/evo/rollout/species_ecosystem_matrix.csv`
- Specie analizzate: 10
- Righe ecotipo: 20
- Righe con mismatch trait ↔ legacy: 0

## Distribuzione indici di sentienza

| Indice | Conteggio |
| --- | ---: |
| T0 | 4 |
| T1 | 12 |
| T2 | 2 |
| T3 | 2 |

## Gap ecosistemi per biome class

Tutti gli ecotipi hanno un match legacy.

## Dettaglio specie

| Specie | Sentienza | Legacy ID | Ecotipi allineati | Ecotipi scoperti | Trait Evo non in legacy | Trait legacy non coperti | Unknown trait refs | Slots legacy |
| --- | --- | --- | ---: | ---: | --- | --- | --- | ---: |
| Anguis magnetica | T1 | anguis_magnetica | 2 | 0 | — | — | — | 10 |
| Chemnotela toxica | T1 | chemnotela_toxica | 2 | 0 | — | — | — | 10 |
| Elastovaranus hydrus | T1 | elastovaranus_hydrus | 2 | 0 | — | — | — | 10 |
| Gulogluteus scutiger | T1 | gulogluteus_scutiger | 2 | 0 | — | — | — | 10 |
| Perfusuas pedes | T3 | perfusuas_pedes | 2 | 0 | — | — | — | 10 |
| Proteus plasma | T0 | proteus_plasma | 2 | 0 | — | — | — | 10 |
| Rupicapra sensoria | T2 | rupicapra_sensoria | 2 | 0 | — | — | — | 10 |
| Soniptera resonans | T1 | soniptera_resonans | 2 | 0 | — | — | — | 10 |
| Terracetus ambulator | T0 | terracetus_ambulator | 2 | 0 | — | — | — | 10 |
| Umbra alaris | T1 | umbra_alaris | 2 | 0 | — | — | — | 10 |

## Slot legacy mancanti

Tutte le specie hanno slot legacy associati.

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

