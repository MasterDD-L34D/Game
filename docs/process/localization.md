# Flusso di localizzazione dei trait

Questo documento descrive come estrarre i testi dai file trait, sincronizzare i
bundle di localizzazione e collaborare con traduttori e revisori.

## 1. Mappare i campi testuali

1. Assicurarsi di essere nella radice del repository (`/workspace/Game`).
2. Eseguire lo script di raccolta campi indicando anche il glossario:
   ```bash
   python tools/py/collect_trait_fields.py \
     --output reports/trait_fields_by_type.json \
     --glossary data/core/traits/glossary.json \
     --glossary-output reports/trait_texts.json
   ```
3. `reports/trait_fields_by_type.json` riepiloga i campi presenti per tipologia, mentre
   `reports/trait_texts.json` elenca per ogni trait le stringhe approvate dal
   glossario (label/description per lingua). Usare i due file congiuntamente per
   individuare i campi testuali che devono essere estratti o aggiornati e
   verificare che il glossario sia completo prima di procedere.

## 2. Struttura comune dei bundle

I bundle di localizzazione vivono in `locales/<lingua>/traits.json` e seguono
lo schema `config/i18n/trait_locales.schema.json`.

Ogni file deve contenere:

- `language`: codice BCP 47 della lingua (es. `it`, `en-US`).
- `fallback`: codice della lingua di fallback oppure `null` se non impostato.
- `entries`: dizionario dei trait dove ogni chiave è l'`id` del trait e i valori
  sono gli stessi campi testuali presenti nel file originale.
- `"$schema"`: percorso relativo allo schema, per la validazione automatica.

I campi presenti in `entries` devono essere stringhe prive di markup HTML; usare
solo le chiavi definite dallo schema (`label`, `description`, `flavor_text`,
`mutazione_indotta`, `spinta_selettiva`, `uso_funzione`, `debolezza`,
`fattore_mantenimento_energetico`).

## 3. Sincronizzare i testi con lo script

Lo script `scripts/sync_trait_locales.py` automatizza l'estrazione dei testi,
applica le stringhe approvate dal glossario e aggiorna i file di localizzazione.

```bash
python scripts/sync_trait_locales.py \
  --traits-dir data/traits \
  --locales-dir locales \
  --language it \
  --fallback null \
  --glossary data/core/traits/glossary.json
```

Lo script esegue tre operazioni:

1. Esplora tutti i trait (`*.json`, esclusi gli indici) e raccoglie i valori dei
   campi testuali ancora non localizzati.
2. Integra `locales/<lingua>/traits.json` con le stringhe approvate dal
   glossario (campi `label` e `description`), mantenendo anche gli altri testi
   estratti dai file trait.
3. Sostituisce i valori testuali nei trait con chiavi `i18n:traits.<id>.<campo>`
   che puntano alla voce nel bundle.

Usare `--dry-run` per verificare le modifiche senza applicarle. Lo script è
idempotente: eseguendolo più volte non produce diff aggiuntivi se i contenuti,
inclusi quelli del glossario, non cambiano.

### Aggiornare o aggiungere lingue

Per aggiungere una nuova lingua, creare il relativo file in `locales/<lingua>` e
impostare `--language` e `--fallback` in modo appropriato. Lo script aggiornerà
il bundle esistente mantenendo il riferimento allo schema. I traduttori
possono lavorare direttamente sul file generato.

## 4. Linee guida per traduttori

- **Consistenza terminologica:** usare la terminologia del glossario dei trait.
- **Niente markup:** i testi sono plain-text; eventuali accenti o simboli devono
  essere codificati direttamente.
- **Placeholders:** se compaiono valori dinamici, mantenerli invariati.
- **Lunghezza:** le stringhe non devono eccedere le dimensioni originali di più
  del 15% per evitare overflow nelle UI.
- **Fallback:** quando una traduzione non è disponibile, lasciare la chiave
  assente; il sistema utilizzerà automaticamente la lingua di fallback.

## 5. Linee guida per revisori

1. Validare i file con lo schema (installare `jsonschema` se non è già
   disponibile nell'ambiente):
   ```bash
   python -m jsonschema -i locales/it/traits.json config/i18n/trait_locales.schema.json
   ```
2. Eseguire `python scripts/sync_trait_locales.py --dry-run` per verificare che
   non vengano reintrodotti testi non localizzati.
3. Controllare i diff in `locales/<lingua>/traits.json` assicurandosi che le
   modifiche riguardino solo i campi testuali previsti.
4. Se vengono aggiunti nuovi campi, aggiornare lo schema e documentare la scelta
   in questa guida.

Seguendo questi passi si garantisce un flusso di localizzazione ripetibile e
allineato con la struttura dei trait del progetto.
