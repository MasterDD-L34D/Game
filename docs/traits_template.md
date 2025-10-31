# Template dati trait

Questo documento descrive la struttura canonica delle voci trait utilizzata dai cataloghi di
`packs/evo_tactics_pack/docs/catalog`. Il template deriva dagli schemi JSON ufficiali
(`trait_catalog.schema.json` e `trait_entry.schema.json`) basati su **JSON Schema Draft 2020-12** e
integra vincoli SemVer, UCUM e ENVO.

## File di riferimento

- `packs/evo_tactics_pack/docs/catalog/trait_catalog.schema.json` — schema per l'intero catalogo.
- `packs/evo_tactics_pack/docs/catalog/trait_entry.schema.json` — schema per il singolo trait.
- `packs/evo_tactics_pack/docs/catalog/trait_reference.json` — esempio validato con due trait.
- `packs/evo_tactics_pack/docs/catalog/archive/trait_reference_legacy.json` — dataset storico completo (non conforme allo schema).
- `tools/py/trait_template_validator.py` — CLI per convalidare e riepilogare i campi.

## Campi richiesti (per trait)

| Campo                    | Tipo     | Vincoli principali                                      | Note |
|--------------------------|----------|----------------------------------------------------------|------|
| `trait_code`             | string   | pattern `^TR-\d{4}$`                                    | Codice agnostico rispetto alla specie. |
| `label`                  | string   | lunghezza minima 3                                       | Nome visualizzato. |
| `famiglia_tipologia`     | string   | —                                                        | Cluster funzionale. |
| `fattore_mantenimento_energetico` | string | —                                                       | Costo narrativo/energetico. |
| `tier`                   | string   | enum `T1`…`T6`                                           | Scala Sentience Track estesa. |
| `mutazione_indotta`      | string   | —                                                        | Sintesi dell'adattamento biologico. |
| `uso_funzione`           | string   | —                                                        | Applicazione principale in gioco. |
| `spinta_selettiva`       | string   | —                                                        | Motivazione evolutiva o tattica. |
| `sinergie`               | array    | elementi stringa non vuoti                               | ID di trait complementari. |
| `conflitti`              | array    | elementi stringa non vuoti                               | ID di trait incompatibili. |
| `version`                | string   | pattern SemVer 2.0.0                                     | Usa `MAJOR.MINOR.PATCH(-prerelease)(+build)`. |
| `versioning`             | object   | campi obbligatori `created`, `updated`, `author`         | Date in formato ISO (`YYYY-MM-DD`). |

## Campi opzionali e strutture annidate

### Liste e vettori

- `slot`: array di stringhe (`pattern "^[A-Z]$"`) che definiscono gli slot occupati.
- `limits`: array di stringhe per vincoli o cap applicativi.
- `output_effects`: array di stringhe per output addizionali del tratto.

### Oggetti semplici

- `slot_profile`: mappa opzionale con chiavi `core` e `complementare` (stringhe).
- `cost_profile`: oggetto con chiavi libere tra `rest`, `burst`, `sustained` (stringhe descrittive).
- `testability`: oggetto con `observable` e `scene_prompt` (entrambi string).
- `applicability`: oggetto con:
  - `clades`: array di stringhe libere.
  - `envo_terms`: array di URI ENVO (pattern `http://purl.obolibrary.org/obo/ENVO_\d+`).
  - `notes`: string opzionale.
- `sinergie_pi`: oggetto PI opzionale con tre array di stringhe (`co_occorrenze`, `forme`,
  `tabelle_random`) e l'intero `combo_totale` (>= 0).

### Blocchi descrittivi

I seguenti campi sono stringhe facoltative: `debolezza`, `morph_structure`, `primary_function`,
`cryptozoo_name`, `functional_description`, `trigger`, `ecological_impact`, `notes`.

### Requisiti ambientali

`requisiti_ambientali` è un array di oggetti con la struttura seguente:

| Campo                 | Tipo          | Dettagli |
|-----------------------|---------------|----------|
| `capacita_richieste`  | array[string] | Lista di capacità necessarie. |
| `condizioni`          | object        | Nessuna proprietà extra; supporta `biome_class` (string). |
| `fonte`               | string        | Origine del vincolo. |
| `meta`                | object        | Proprietà opzionali `expansion` (string), `tier` (`T1`…`T6`), `notes` (string). |

### Metriche misurabili

`metrics` è un array di oggetti con campi obbligatori `name`, `value`, `unit` e opzionale
`conditions`:

- `value` accetta numero o stringa per coprire valori qualitativi o quantitativi.
- `unit` deve essere una stringa UCUM (es. `m/s`, `1`, `Cel`).

### Versioning

Il blocco `versioning` impone:

```json
{
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "author": "Nome Cognome"
}
```

L'uso di SemVer in `version` facilita la tracciabilità di breaking changes o patch incrementali.

## Esempio riassuntivo

Estratto dal catalogo di riferimento (`trait_reference.json`):

```json
{
  "trait_code": "TR-0001",
  "label": "Equilibrio (Vestibolare)",
  "famiglia_tipologia": "Sensoriale/Interocettivo",
  "fattore_mantenimento_energetico": "Basso (Passivo)",
  "tier": "T2",
  "slot": [],
  "slot_profile": {"core": "sensoriale", "complementare": "analitico"},
  "sinergie": ["TR-0002"],
  "conflitti": [],
  "requisiti_ambientali": [
    {
      "condizioni": {"biome_class": "terrestre_instabile"},
      "fonte": "env_to_traits",
      "meta": {"expansion": "coverage_q4_2025", "tier": "T2", "notes": ""}
    }
  ],
  "mutazione_indotta": "Raffinamento del sistema vestibolare (canali semicircolari).",
  "uso_funzione": "Riduce cadute, migliora equilibrio e stabilità con carico.",
  "spinta_selettiva": "Percorsi pericolosi, superfici instabili, trasporto di carichi.",
  "debolezza": "Efficacia ridotta in immersione prolungata.",
  "metrics": [
    {"name": "fall_check_bonus", "value": 1, "unit": "1", "conditions": "terra|instabile"}
  ],
  "metabolic_cost": "Basso",
  "cost_profile": {"rest": "Basso", "burst": "Medio", "sustained": "Basso"},
  "trigger": "Movimento su terreno instabile",
  "limits": ["Non si cumula oltre +2 ai check anti-caduta"],
  "testability": {
    "observable": "Cammino su tronco sospeso senza oscillare",
    "scene_prompt": "Attraversa un tronco sospeso con carico a due mani"
  },
  "applicability": {
    "clades": ["Tetrapodi", "Primati"],
    "envo_terms": ["http://purl.obolibrary.org/obo/ENVO_00000446"]
  },
  "version": "0.1.0",
  "versioning": {
    "created": "2025-10-30",
    "updated": "2025-10-30",
    "author": "Master DD / GPT-5 Thinking"
  },
  "notes": "Somma soft con TR-0002 (cap a +2)",
  "sinergie_pi": {"co_occorrenze": [], "forme": [], "tabelle_random": [], "combo_totale": 1}
}
```

## Validazione automatica

Esegui lo script Python per verificare che i cataloghi rispettino gli schemi:

```bash
python tools/py/trait_template_validator.py          # valida il catalogo di riferimento
python tools/py/trait_template_validator.py --summary # aggiunge il riepilogo dei campi
```

Exit code:

- `0` — validazione riuscita
- `1` — errori di schema sui dati
- `2` — file mancanti o errori IO

Integrare il comando nella CI (vedi workflow `validate_traits.yml`) assicura la conformità a ogni
push o pull request.
