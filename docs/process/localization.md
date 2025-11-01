# Flusso di localizzazione dei trait

Questo documento descrive come estrarre i testi dai file trait, sincronizzare i
bundle di localizzazione e collaborare con traduttori e revisori.

## 1. Mappare i campi testuali

1. Assicurarsi di essere nella radice del repository (`/workspace/Game`).
2. Eseguire lo script di raccolta campi:
   ```bash
   python tools/py/collect_trait_fields.py --output reports/trait_fields.json
   ```
3. Il file generato riepiloga i campi presenti per tipologia. Usarlo per
   individuare i campi testuali che devono essere estratti (ad esempio `label`,
   `mutazione_indotta`, `spinta_selettiva`, `uso_funzione`, `debolezza`,
   `fattore_mantenimento_energetico`, eventuali `description` o `flavor_text`).

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

Lo script `scripts/sync_trait_locales.py` automatizza l'estrazione dei testi e
l'aggiornamento dei file.

```bash
python scripts/sync_trait_locales.py \
  --traits-dir data/traits \
  --locales-dir locales \
  --language it \
  --fallback null
```

Lo script esegue tre operazioni:

1. Esplora tutti i trait (`*.json`, esclusi gli indici) e raccoglie i valori dei
   campi testuali.
2. Popola `locales/<lingua>/traits.json` con i testi normalizzati e ordinati.
3. Aggiorna (o crea) le voci del bundle lasciando invariati i testi nei file
   dei trait; le traduzioni vengono quindi gestite tramite i bundle senza
   impattare gli strumenti esistenti.

Usare `--dry-run` per verificare le modifiche senza applicarle. Lo script è
idempotente: eseguendolo più volte non produce diff aggiuntivi se i contenuti non
cambiano.

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
