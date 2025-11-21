# Scheda operativa trait (con reference e checklist)

## Identità e versioning

- `id` — snake_case, uguale al nome file, deciso in design e immutabile. # fonte: vincolo schema `^[a-z0-9_]+$`
- `label` — riferimento glossario `i18n:traits.<id>.label`, dopo registrazione IT/EN in `data/core/traits/glossary.json`. # fonte: glossario centralizzato
- `data_origin` — slug editoriale da `docs/editorial/trait_sources.json`. # fonte: tabella sorgenti ufficiali
- `version` / `versioning.*` — opzionale, SemVer + autore/aggiornamenti per tracciabilità. # fonte: convenzione interna

## Classificazione e ruolo

- `famiglia_tipologia` — macro/sub-tipo (es. “Offensivo/Assalto”) dalla tassonomia esistente. # fonte: template tipologie
- `tier` — `T1`–`T6`, coerente con la famiglia. # fonte: schema
- `slot` — array di lettere singole (A…). Vuoto se jolly. # fonte: schema
- `slot_profile.core|complementare` — specializzazione primaria/secondaria, solo se il trait è focalizzato su uno slot. # sezione opzionale
- `usage_tags` — tag tattici normalizzati (es. `scout`, `tank`) per UI/analytics. # sezione opzionale
- `mutazione_indotta`, `uso_funzione`, `spinta_selettiva` — testi brevi su adattamento, funzione, motivazione evolutiva. # campi obbligatori
- `primary_function`, `functional_description`, `morph_structure` — note opzionali su meccanica e morfologia. # estensioni interne

## Relazioni e sinergie

- `sinergie` / `conflitti` — array di ID trait compatibili/incompatibili (slug esistenti). # schema
- `sinergie_pi.*` — co-occorrenze/combo/tabelle random per strumenti PI. # opzionale
- `species_affinity[]` — `species_id`, ruoli, peso; solo se c’è relazione specie-trait. # modello esteso

## Ambiente e contesto

- `requisiti_ambientali[]` — include `condizioni.biome_class` (slug bioma), `fonte` (es. `env_to_traits`), opzionale `capacita_richieste`, `meta.expansion|tier|notes`. # opzionale
- `biome_tags` — biomi affini (slug). # opzionale
- `applicability.*` / `ecological_impact` / `output_effects` — note ecosistema o termini ENVO. # modello esteso
- `completion_flags.*` — flag booleani per tracking di ambiente/specie/testi. # opzionale

## Bilanciamento e costi

- `fattore_mantenimento_energetico` — costo narrativo/energetico sintetico (es. “Basso (Passivo)”). # schema
- `metabolic_cost` / `cost_profile.*` — consumi numerici (rest, burst, sustained) se disponibili. # modello esteso
- `metrics[]` — coppie nome/valore/unità con condizioni d’uso. # modello esteso
- `debolezza` — vulnerabilità intrinseche. # opzionale

## Localizzazione e testi

- `label_it/en`, `description_it/en` — nel glossario; il trait usa riferimenti `i18n:traits.<id>.*` dopo la sync (`scripts/sync_trait_locales.py`). # workflow glossario/locales
- `notes`, `cryptozoo_name` — contesto narrativo coerente con `data_origin`. # modello esteso

## Box “Flusso operativo end-to-end”

1) Preparazione tassonomia/slot.  
2) Aggiornamento glossario (IT/EN).  
3) Compilazione file trait con scheletro minimo.  
4) Validazione schema (`trait_template_validator`).  
5) Sync localizzazioni e rigenerazione report (campi/testi, indici/coverage).  
6) Revisione diff e checklist PR.

## Richiamo “Template e vincoli”

- Tabella campi obbligatori + regex dal template dati.
- Sezioni opzionali: `slot_profile`, `requisiti_ambientali`, `usage_tags`, `sinergie_pi`, `completion_flags`, `debolezza`.
- Promemoria `data_origin`: usare solo slug ufficiali.

## Blocco “Label/Description approvate”

- Link a `data/core/traits/glossary.json` e a `docs/catalog/trait_reference.md` per verificare naming e tono prima di scrivere/aggiornare testi approvati.

## Checklist di validazione automatica (comandi rapidi)

- Validazione schema: `python tools/py/trait_template_validator.py data/traits/<tipologia>/<id>.json`
- Rigenera report campi/testi: `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary data/core/traits/glossary.json --glossary-output reports/trait_texts.json`
- Sync localizzazioni: `python scripts/sync_trait_locales.py --traits-dir data/traits --locales-dir locales --language it --glossary data/core/traits/glossary.json`
- (Opz.) Indici/coverage: `build_trait_index.js`, `report_trait_coverage.py` se previsti dalla checklist.

## Inserimento nel repo e collegamenti

- **Posizionamento:** salva il file in `docs/traits_scheda_operativa.md`.  
- **Link entrata:** in `README_HOWTO_AUTHOR_TRAIT.md` aggiungi un bullet nella sezione “Prima di iniziare” che punti alla scheda come reference operativo.  
- **Link tecnico:** in `docs/traits_template.md`, subito dopo l’introduzione, inserisci una riga “Per la scheda operativa completa vedere `docs/traits_scheda_operativa.md`”.  
- **Riferimento testi:** nel nuovo file rimanda a `docs/catalog/trait_reference.md` per esempi di label/description approvate.  
- **Uso in PR:** cita la scheda nella checklist PR per indicare che glossario, file trait, report e locali sono stati allineati.
