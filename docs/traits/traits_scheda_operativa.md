---
title: Scheda operativa trait (con reference e checklist)
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Scheda operativa trait (con reference e checklist)

## Accesso rapido

- [Guida Evo Tactics Pack v2](./Guida_Evo_Tactics_Pack_v2.md)
- [Guida autori](./README_HOWTO_AUTHOR_TRAIT.md)
- [Template dati](./traits_template.md)
- [Reference catalogo](./catalog/trait_reference.md)
- [Piano operativo prossimo ciclo](./next_steps_trait_migration.md)
- [Checklist di validazione automatica](#checklist-di-validazione-automatica-comandi-rapidi)

## Compatibilità Evo Pack v2

Per importare tratti da pacchetti Evo, usa la mappa di conversione in `traits_evo_pack_alignment.md`: troverai le regole di naming (Title Case → `snake_case`), gli esempi TR-xxxx → `id`, l’inserimento delle metriche UCUM e il flusso combinato glossario → file trait → validazioni (`trait_template_validator`, `collect_trait_fields`, `sync_trait_locales`, `validate.sh`/`ajv`).

## Campi opzionali consigliati (Evo v2)

> I pacchetti Evo v2 suggeriscono di includere questi campi come _plus_ (vedi sezione “Specifiche standard v2” della [Guida Evo Tactics Pack v2](Guida_Evo_Tactics_Pack_v2.md#specifiche-standard-v2)), ma nel repository restano facoltativi e non fanno parte dello schema minimo.
>
> - `metrics[]` — array di misure UCUM per quantificare prestazioni/condizioni.
> - `cost_profile.*` — costi energetici numerici (`rest`, `burst`, `sustained`) se disponibili.
> - `testability.*` — osservabili e scenari di prova per rendere il tratto verificabile.
> - Nota: questi campi non sono richiesti dai validator interni; se arrivano nei JSON del pack vanno tenuti solo quando rispettano lo schema base del repository.

## Promemoria schema minimo

- `id`, `label`, `famiglia_tipologia`, `fattore_mantenimento_energetico`, `tier`, `slot`, `sinergie`, `conflitti`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva` sono i campi obbligatori del validator.
- `data_origin` è consigliato per il tracciamento editoriale, ma non richiesto dal JSON Schema.

## Identità e versioning

- `id` — `snake_case`, uguale al nome file, deciso in design e immutabile. # fonte: vincolo schema `^[a-z0-9_]+$`
- `label` — riferimento glossario `i18n:traits.<id>.label`, dopo registrazione IT/EN in `data/core/traits/glossary.json`. # fonte: glossario centralizzato
- `data_origin` — slug editoriale da `docs/editorial/trait_sources.json` (raccomandato, non richiesto dallo schema). # fonte: tabella sorgenti ufficiali
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

- `sinergie` / `conflitti` — array di ID trait compatibili/incompatibili (slug esistenti, niente `trait_code`). # schema — esempio pratico nel box sinergie/conflitti della [Guida Evo](Guida_Evo_Tactics_Pack_v2.md#avvertenza-migrazione-pack--%E2%86%92-repository-game)
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

1. Preparazione tassonomia/slot.
2. Aggiornamento glossario (IT/EN).
3. Compilazione file trait con scheletro minimo.
4. Validazione schema (`trait_template_validator`).
5. Sync localizzazioni e rigenerazione report (campi/testi, indici/coverage).
6. Revisione diff e checklist PR.

## Richiamo “Template e vincoli”

- Tabella campi obbligatori + regex dal template dati.
- Sezioni opzionali: `slot_profile`, `requisiti_ambientali`, `usage_tags`, `sinergie_pi`, `completion_flags`, `debolezza`.
- Promemoria `data_origin`: usare solo slug ufficiali.

## Approfondimenti Evo v2

- **Mapping rapido `trait_code` → `id`/`label`**: il box in [Guida Evo Tactics Pack v2](Guida_Evo_Tactics_Pack_v2.md#compatibilita-evo-pack-v2) riepiloga conversione da codici TR-xxxx a `id` snake_case e `label` i18n, con esempio pratico. Per tabelle di allineamento più estese usa [traits_evo_pack_alignment.md](traits_evo_pack_alignment.md).
- **Checklist migrazione v1 → v2**: la procedura in [evo-tactics/integrazioni-v2.md](evo-tactics/integrazioni-v2.md#evo-integrazioni-v2-pipeline-di-migrazione-v1-v2) copre mappatura campi (es. `categoria` → `famiglia_tipologia`), aggiornamento UCUM, normalizzazione nomi, compilazione `testability`/`cost_profile`, versioning e validazione finale.
- **Stile/naming UCUM e nomenclature**: per il tono dei testi e la normalizzazione delle unità consulta la sezione “Specifiche standard v2” della [Guida Evo](Guida_Evo_Tactics_Pack_v2.md#specifiche-standard-v2) e il prontuario UCUM (sezione dedicata nel documento).
- **Validazione nel repository Game**: usa sempre la toolchain Python (`trait_template_validator`, `collect_trait_fields`, `sync_trait_locales`) come indicato in [Guida Evo Tactics Pack v2](Guida_Evo_Tactics_Pack_v2.md#validazione-nel-repository-game). Riserva `scripts/validate.sh`/`ajv` ai pacchetti esterni.

## Blocco “Label/Description approvate”

- Link a `data/core/traits/glossary.json` e a `docs/catalog/trait_reference.md` per verificare naming e tono prima di scrivere/aggiornare testi approvati.

## Checklist di validazione automatica (comandi rapidi)

Riferimento incrociato: la sezione “Strumenti di validazione e QA” della [Guida Evo Tactics Pack v2](Guida_Evo_Tactics_Pack_v2.md#strumenti-di-validazione-e-qa) richiama gli stessi passaggi e indica quando usare i tool Python o `scripts/validate.sh`.

- Validazione schema: `python tools/py/trait_template_validator.py data/traits/<tipologia>/<id>.json`
- Rigenera report campi/testi: `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary data/core/traits/glossary.json --glossary-output reports/trait_texts.json`
- Sync localizzazioni: `python scripts/sync_trait_locales.py --traits-dir data/traits --locales-dir locales --language it --glossary data/core/traits/glossary.json`
- (Opz.) Indici/coverage: `build_trait_index.js`, `report_trait_coverage.py` se previsti dalla checklist.

## Esempio rapido

Estratto minimale in linea con lo schema (regex rispettate) e con i riferimenti `i18n:` già puntati al glossario:

```json
{
  "id": "esempio_trait_minimo",
  "label": "i18n:traits.esempio_trait_minimo.label",
  "famiglia_tipologia": "Offensivo/Assalto",
  "fattore_mantenimento_energetico": "Basso (Passivo)",
  "tier": "T1",
  "slot": [],
  "sinergie": [],
  "conflitti": [],
  "data_origin": "controllo_psionico",
  "mutazione_indotta": "Sintesi breve dell'adattamento.",
  "uso_funzione": "Funzione primaria concisa.",
  "spinta_selettiva": "Motivazione evolutiva o tattica."
}
```

Entry corrispondente nel glossario `data/core/traits/glossary.json` (i campi EN/IT sono obbligatori e alimentano la sync `scripts/sync_trait_locales.py`):

```json
{
  "esempio_trait_minimo": {
    "label_it": "Label approvata (IT)",
    "label_en": "Approved label (EN)",
    "description_it": "Descrizione concisa e coerente con il tono del bestiario.",
    "description_en": "Concise description aligned with bestiary tone."
  }
}
```

Placeholder da sostituire prima della PR:

- `esempio_trait_minimo` → `<id>` definitivo (snake_case, coincide con il nome file).
- `Offensivo/Assalto` → `<tipologia>` coerente con la tassonomia esistente.
- `controllo_psionico` → `data_origin` scelto dagli slug ufficiali in `docs/editorial/trait_sources.json`.

Ricorda di eseguire i comandi di validazione già elencati sopra per confermare schema, sync e report (`trait_template_validator`, `collect_trait_fields`, `sync_trait_locales`).

## Inserimento nel repo e collegamenti

- **Posizionamento:** salva il file in `docs/traits_scheda_operativa.md`.
- **Link entrata:** in `README_HOWTO_AUTHOR_TRAIT.md` aggiungi un bullet nella sezione “Prima di iniziare” che punti alla scheda come reference operativo.
- **Link tecnico:** in `docs/traits_template.md`, subito dopo l’introduzione, inserisci una riga “Per la scheda operativa completa vedere `docs/traits_scheda_operativa.md`”.
- **Riferimento testi:** nel nuovo file rimanda a `docs/catalog/trait_reference.md` per esempi di label/description approvate.
- **Uso in PR:** cita la scheda nella checklist PR per indicare che glossario, file trait, report e locali sono stati allineati.
