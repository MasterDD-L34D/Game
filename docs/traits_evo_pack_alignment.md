# Allineamento Evo Pack v2 ⇄ repository trait

Questo documento spiega come mappare i campi di un trait Evo (codici TR-xxxx) nei campi obbligatori del repository (`id`, `label` i18n, `data_origin`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`, ecc.), come applicare le regole di naming e come integrare i flussi di validazione interni/esterni.

## Tabella di corrispondenza (Evo → repository)

| Campo Evo | Campo repository | Regole e note operative |
| --- | --- | --- |
| `trait_code` (es. `TR-0184`) | `id` (snake_case) e nome file | Convertire il codice in slug narrativo: `TR-0184` → `tr_0184` solo se il codice è il nome finale; preferire un id descrittivo coerente con il label (es. `TR-0184` "Scudo Termico" → `scudo_termico`). L’`id` deve essere tutto minuscolo con `_` e coincide con il nome file JSON. |
| `label` (Title Case) | `label` → `i18n:traits.<id>.label` | Il label Evo in Title Case alimenta il glossario (`label_it`/`label_en`) e diventa riferimento i18n nel trait. Esempio: "Scudo Termico" → `i18n:traits.scudo_termico.label`. |
| `description` | Glossario (`description_it/en`) | Il testo Evo va nel glossario; il trait usa solo riferimenti i18n. |
| `testability.observable`, `testability.scene_prompt` | `testability.observable` / `testability.scene_prompt` | Copia diretta nei campi omonimi del trait. Assicurarsi che `scene_prompt` sia ripetibile e misurabile. |
| `cost_profile.rest|burst|sustained` | `cost_profile.*` | Stesse chiavi numeriche nel trait. Indicare unità UCUM nel campo `unit` quando necessario (es. `kJ`). |
| Metriche UCUM (`metrics[]` con `name`, `value`, `unit`) | `metrics[]` | Struttura invariata. Le unità vanno convertite ai simboli UCUM del repository (`°C` → `Cel`, `km/h` → `m/s`, `bpm` → `/min`). |
| `data_origin` (fonte Evo) | `data_origin` (slug ufficiale) | Mappare alla tabella sorgenti del repo (`docs/editorial/trait_sources.json`). Se la fonte non esiste, chiedere l’aggiunta di uno slug. |
| `mutazione_indotta` | `mutazione_indotta` | Trascrizione diretta, mantenendo il focus anatomico/funzionale. |
| `uso_funzione` | `uso_funzione` | Verbo + oggetto, coerente con la funzione primaria. |
| `spinta_selettiva` | `spinta_selettiva` | Descrivere la pressione evolutiva principale. |
| `famiglia_tipologia` / `tier` / `slot` | Campi omonimi | Allineare ai valori ammessi dallo schema repo e dalla tassonomia esistente. |
| `sinergie` / `conflitti` | Campi omonimi | Riutilizzare gli `id` snake_case dei tratti esistenti. |

## Regole di naming

- **Id (`id`)**: sempre `snake_case`, tutto minuscolo, senza spazi né accenti. Deve coincidere con il nome file in `data/traits/<tipologia>/`.
- **Label**: Title Case (maiuscole significative, minuscole per articoli/preposizioni). Inserito nel glossario e richiamato via `i18n:traits.<id>.label`.
- **Da codice Evo a id**:
  - Codice puro: `TR-0420` → `tr_0420` (solo se il codice è l’identificativo pubblicato).
  - Codice + nome: `TR-0420` "Vortice Termico" → `vortice_termico`.
  - Codice specie-agganciato: `EHY-TR07` "Coda Ventosa" → `coda_ventosa` (lo slug specie non entra nell’id del tratto catalogato se riusabile).
- **Esempi di conversione Title Case → snake_case**:
  - "Lama Aerodinamica" → `lama_aerodinamica`
  - "Occhio a Cristalli" → `occhio_a_cristalli`
  - "Valvola Antiritorno" → `valvola_antiritorno`

## Inserimento metriche UCUM nel formato repository

Ogni metrica deve seguire la struttura `{ "name": "<titolo>", "value": <numero>, "unit": "<UCUM>" }` con eventuali note di contesto nel nome.

Esempi:

```json
{
  "metrics": [
    { "name": "Tolleranza termica (aria secca)", "value": 8, "unit": "Cel" },
    { "name": "Spinta istantanea", "value": 1.2, "unit": "kN" },
    { "name": "Frequenza impulsi", "value": 180, "unit": "/min" },
    { "name": "Velocità in acqua salata", "value": 14, "unit": "m/s" }
  ]
}
```

Ricorda di normalizzare le unità prima dell’import: `km/h` → `m/s` (÷3.6), `°C` → `Cel`, `bpm` → `/min`.

## Flusso operativo combinato (Evo → repository)

1. **Glossario**: inserisci/aggiorna label e description IT/EN in `data/core/traits/glossary.json` seguendo le conversioni di naming.
2. **File trait**: crea o aggiorna il JSON in `data/traits/<tipologia>/<id>.json` usando il template repo; converti `label` in riferimento i18n e mappa i campi Evo secondo la tabella sopra.
3. **Validazione interna**:
   - `python tools/py/trait_template_validator.py data/traits/<tipologia>/<id>.json`
   - `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary data/core/traits/glossary.json --glossary-output reports/trait_texts.json`
   - `python scripts/sync_trait_locales.py --traits-dir data/traits --locales-dir locales --language it --glossary data/core/traits/glossary.json`
4. **Validazione esterna (pacchetti Evo)**: se il trait proviene da un pacchetto esterno, eseguire anche lo `scripts/validate.sh` o una validazione `ajv` equivalente rispetto agli schemi di origine prima dell’import definitivo.
5. **Revisione**: controlla sinergie/conflitti, UCUM e naming, quindi allega i comandi eseguiti nel log PR.

Seguendo questi passaggi, i tratti Evo risultano compatibili con le convenzioni del repository e possono essere sincronizzati con localizzazioni, report e pipeline di QA.
