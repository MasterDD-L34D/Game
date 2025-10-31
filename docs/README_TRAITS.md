# Evo Tactics — Trait Schema Pack

Questo pacchetto fornisce lo **schema completo**, esempi e strumenti per validare i trait
(specie-agnostici) usati nel catalogo `trait_reference.json`.

## Struttura
```text
packs/evo_tactics_pack/docs/catalog/
├─ trait_entry.schema.json       # schema per ogni voce trait
├─ trait_catalog.schema.json     # schema per l'intero catalogo (header + mappa)
├─ trait_reference.json          # ESEMPIO catalogo con 2 trait
└─ archive/
   └─ trait_reference_legacy.json  # catalogo storico completo (pre-schema)
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
* SemVer 2.0.0 per `version`: <https://semver.org/>
* UCUM per `metrics.unit` (es. `m/s`, `Cel`, `1`): <https://ucum.org/>
* ENVO per `applicability.envo_terms` (URI `ENVO_…`): <http://purl.obolibrary.org/obo/envo.owl>

## Note

* `tier` esteso a **T1..T6** per allineamento con Sentience Track.
* `applicability` è opzionale: usa `clades` liberi e `envo_terms` (URI) per vincoli ambientali standardizzati.
* `slot`, `sinergie`, `conflitti`, `sinergie_pi` restano compatibili con i pack esistenti.
* Il catalogo storico completo è conservato in `packs/evo_tactics_pack/docs/catalog/archive/trait_reference_legacy.json` per consultazione; non è validato automaticamente contro lo schema.
