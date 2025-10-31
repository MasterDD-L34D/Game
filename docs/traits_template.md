# Template dati trait

Questo documento descrive la struttura canonica delle voci trait utilizzata dai cataloghi di
`packs/evo_tactics_pack/docs/catalog`. Il template è definito dagli schemi JSON
`trait_catalog.schema.json` e `trait_entry.schema.json` (Draft 2020-12) e rimane compatibile con il
dataset storico di 174 trait.

## File di riferimento

- `packs/evo_tactics_pack/docs/catalog/trait_catalog.schema.json` — schema per l'intero catalogo.
- `packs/evo_tactics_pack/docs/catalog/trait_entry.schema.json` — schema per il singolo trait.
- `data/traits/index.json` — catalogo principale validato.
- `tools/py/trait_template_validator.py` — CLI per convalida e riepilogo dei campi.

## Campi richiesti (per trait)

| Campo                               | Tipo     | Vincoli principali                                 | Note |
|-------------------------------------|----------|-----------------------------------------------------|------|
| `label`                             | string   | lunghezza minima 3                                  | Nome visualizzato. |
| `famiglia_tipologia`                | string   | —                                                   | Cluster funzionale. |
| `fattore_mantenimento_energetico`   | string   | —                                                   | Costo narrativo/energetico. |
| `tier`                              | string   | enum `T1`…`T6`                                      | Scala Sentience Track estesa. |
| `slot`                              | array    | elementi stringa (`pattern "^[A-Z]$"`)            | Sigle slot funzionali. |
| `slot_profile`                      | object   | chiavi consentite `core`, `complementare`           | Entrambe opzionali ma l'oggetto è presente. |
| `sinergie`                          | array    | elementi stringa non vuoti                          | ID di trait complementari. |
| `conflitti`                         | array    | elementi stringa non vuoti                          | ID di trait incompatibili. |
| `requisiti_ambientali`              | array    | oggetti strutturati (vedi sotto)                    | Vincoli ambientali opzionali. |
| `mutazione_indotta`                 | string   | —                                                   | Sintesi dell'adattamento biologico. |
| `uso_funzione`                      | string   | —                                                   | Applicazione principale in gioco. |
| `spinta_selettiva`                  | string   | —                                                   | Motivazione evolutiva o tattica. |
| `debolezza`                         | string   | —                                                   | Controindicazioni o limiti intrinseci. |
| `sinergie_pi`                       | object   | campi strutturati PI (vedi sotto)                   | Indici per co-occorrenze, forme e tabelle. |

## Campi opzionali e strutture annidate

### Identificativi e versionamento

- `trait_code`: codice opzionale (`pattern "^TR-\d{4}$"`) per progetti che vogliono adottare
  un identificativo numerico agnostico rispetto alla specie.
- `version`: stringa SemVer (2.0.0) per tracciare revisioni significative.
- `versioning`: oggetto con `created`, `updated`, `author` (date ISO `YYYY-MM-DD`) quando si vuole
  storicizzare le modifiche.

### Liste e vettori

- `limits`: array di stringhe per vincoli o cap applicativi.
- `output_effects`: array di stringhe per output addizionali del tratto.

### Oggetti semplici

- `cost_profile`: oggetto con chiavi opzionali `rest`, `burst`, `sustained` (stringhe descrittive).
- `testability`: oggetto con `observable` e `scene_prompt` (entrambi string).
- `applicability`: oggetto opzionale con:
  - `clades`: array di stringhe libere.
  - `envo_terms`: array di URI ENVO (pattern `http://purl.obolibrary.org/obo/ENVO_\d+`).
  - `notes`: string opzionale.

### Blocchi descrittivi

I seguenti campi sono stringhe facoltative: `debolezza` (già richiesto), `morph_structure`,
`primary_function`, `cryptozoo_name`, `functional_description`, `trigger`, `ecological_impact`,
`notes`.

### Requisiti ambientali

`requisiti_ambientali` è un array di oggetti con la struttura seguente:

| Campo                 | Tipo          | Dettagli |
|-----------------------|---------------|----------|
| `capacita_richieste`  | array[string] | Lista di capacità necessarie. |
| `condizioni`          | object        | Nessuna proprietà extra; supporta `biome_class` (string). |
| `fonte`               | string        | Origine del vincolo. |
| `meta`                | object        | Proprietà opzionali `expansion` (string), `tier` (`T1`…`T6`), `notes` (string). |

### Sinergie PI

`sinergie_pi` contiene fino a quattro campi:

- `co_occorrenze`: array di stringhe (ID di pacchetti o riferimenti di gioco).
- `forme`: array di stringhe per layout o trasformazioni.
- `tabelle_random`: array di stringhe per riferimenti a tabelle casuali.
- `combo_totale`: intero >= 0 che riassume il numero di combinazioni predefinite.

### Metriche misurabili

`metrics` è un array di oggetti con campi obbligatori `name`, `value`, `unit` e opzionale
`conditions`:

- `value` accetta numero o stringa per coprire valori qualitativi o quantitativi.
- `unit` dovrebbe seguire UCUM (es. `m/s`, `1`, `Cel`).

## Catalogo di riferimento

Il file `data/traits/index.json` contiene 174 voci aggregate dalle sottocartelle. Esempio abbreviato (slug `artigli_sette_vie`):

```json
{
  "label": "Artigli a Sette Vie",
  "famiglia_tipologia": "Locomotorio/Prensile",
  "fattore_mantenimento_energetico": "Basso (Passivo)",
  "tier": "T1",
  "slot": [],
  "slot_profile": {"core": "locomotorio", "complementare": "prensile"},
  "sinergie": ["coda_frusta_cinetica", "mimetismo_cromatico_passivo", "struttura_elastica_amorfa", "tattiche_di_branco"],
  "conflitti": [],
  "requisiti_ambientali": [
    {
      "condizioni": {"biome_class": "caverna_risonante"},
      "fonte": "env_to_traits",
      "meta": {"expansion": "controllo_psionico", "notes": "Pacchetto di controllo sensoriale e psichico per specie iperadattive."}
    }
  ],
  "mutazione_indotta": "Dita lunghe e segmentate con punte a uncino multiplo.",
  "uso_funzione": "Afferrare superfici irregolari o oggetti multipli.",
  "spinta_selettiva": "Arrampicarsi su pareti rocciose o vegetazione densa.",
  "debolezza": "Angoli di presa limitati se la superficie è perfettamente liscia.",
  "sinergie_pi": {
    "co_occorrenze": ["boardgame:Evolution/Aggression-Camouflage", "boardgame:DominantSpecies/Competition", "hud:GripNode_Psion"],
    "forme": ["Forma:Predatore_Tessuto", "HUD:GrappleBurst"],
    "tabelle_random": ["tabella:predazione_multicanale"],
    "combo_totale": 4
  }
}
```

## Validazione automatica

Esegui lo script Python per verificare che il catalogo rispetti gli schemi:

```bash
python tools/py/trait_template_validator.py          # valida il catalogo di riferimento
python tools/py/trait_template_validator.py --summary # aggiunge il riepilogo dei campi
```

Exit code:

- `0` — validazione riuscita
- `1` — errori di schema sui dati
- `2` — file mancanti o errori IO

Integrare il comando nella CI (workflow `validate_traits.yml`) assicura la conformità a ogni push o
pull request.
