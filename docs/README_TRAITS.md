# Evo Tactics — Trait Schema Pack

Questo pacchetto fornisce gli **schemi JSON**, il catalogo principale dei trait e gli strumenti
necessari per validarli. Per una guida narrativa e operativa consulta anche il
[`Manuale Trait`](traits-manuale/README.md) che riassume modello dati, tassonomia e workflow.

## Struttura
```text
data/traits/
├─ index.json                    # catalogo principale (schema 2.0) con rimandi alle sottocartelle
├─ difensivo/
│  ├─ index.json                 # indice di categoria + trait con metadati
│  └─ <trait>.json               # singolo tratto (slug come nome file)
├─ …                             # altre tipologie (sensoriale, metabolico, ecc.)

packs/evo_tactics_pack/docs/catalog/
├─ trait_reference.json          # copia del catalogo core inclusa nel bundle del pack (sync con data/traits/index.json)
├─ trait_entry.schema.json       # schema per ogni voce trait (compatibile con il dataset legacy)
├─ trait_catalog.schema.json     # schema per l'intero catalogo (header + mappa)
└─ archive/
   └─ trait_reference_legacy.json  # snapshot di backup del catalogo legacy

tools/py/
└─ trait_template_validator.py   # validatore + summary
.github/workflows/
└─ validate_traits.yml           # CI: valida su push/PR
```

## Uso rapido
```bash
python tools/py/trait_template_validator.py --summary
# Exit code 0 se tutto OK
```

## Standard di riferimento

* JSON Schema Draft 2020-12 (metaschema): <https://json-schema.org/draft/2020-12/schema>
* SemVer 2.0.0 per eventuali campi `version`: <https://semver.org/>
* UCUM per `metrics.unit` (es. `m/s`, `Cel`, `1`): <https://ucum.org/>
* ENVO per `applicability.envo_terms` (URI `ENVO_…`): <http://purl.obolibrary.org/obo/envo.owl>

## Note

* Il catalogo principale mantiene la tassonomia di 174 trait storici, ora validati tramite JSON Schema.
* I campi aggiuntivi (SemVer, UCUM, ENVO) restano opzionali così da non interrompere i contenuti esistenti.
* Lo snapshot in `archive/trait_reference_legacy.json` consente di confrontare rapidamente eventuali modifiche future.
