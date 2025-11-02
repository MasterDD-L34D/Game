# Pipeline revisione trait esterni

La pipeline automatizza la revisione dei trait generati da fonti esterne e
assicura che soltanto i contenuti completi finiscano nel catalogo principale.
Lo script `tools/py/review_external_traits.py` esegue le seguenti operazioni:

1. Scansiona `data/traits/_drafts/` e mostra per ogni bozza l'origine
   (`data_origin`) e gli eventuali campi obbligatori mancanti.
2. Valida le bozze contro `config/schemas/trait.schema.json`.
3. Promuove automaticamente i file conformi spostandoli nella famiglia corretta
   dentro `data/traits/` (utilizzando la sezione iniziale di
   `famiglia_tipologia`).
4. Aggiorna `completion_flags` con gli esiti della revisione e sposta i file
   rifiutati in `data/traits/_hold/`, scrivendo un log dettagliato in
   `logs/trait_review.log`.

## Checklist di revisione manuale

Eseguire questi passaggi prima di promuovere definitivamente un tratto:

- [ ] Confermare che `label`, `mutazione_indotta`, `uso_funzione` e
      `spinta_selettiva` siano coerenti con la guida editoriale.
- [ ] Verificare che gli slot (`slot` e `slot_profile`) rispettino le regole di
      bilanciamento del pacchetto.
- [ ] Controllare sinergie e conflitti rispetto al catalogo esistente per
      evitare duplicazioni o loop logici.
- [ ] Aggiungere `completion_flags` specifici (es. `has_biome`,
      `has_species_link`) quando le informazioni sono state verificate.
- [ ] Aggiornare `data/traits/index.json` dopo la promozione (manuale o tramite
      strumenti dedicati) se il nuovo tratto deve comparire nell'indice.

### Review stile trait

Il processo completo è documentato in
[`docs/process/training/trait_style_session.md`](training/trait_style_session.md).
Prima di promuovere un tratto:

- [ ] Eseguire `npm run style:check` e allegare i report generati al branch.
- [ ] Verificare che tutte le chiavi testuali usino il namespace
      `i18n:traits.<id>.campo` e che `tier`/slot rispettino la nomenclatura.
- [ ] Controllare che `requisiti_ambientali` abbia `meta.tier` e `meta.notes`
      coerenti e aggiornare i `completion_flags` (es. `has_biome`).
- [ ] Annotare nel PR l'esito della guida stile (sezione "Checklist guida
      stile & QA").

## Comandi utili

Visualizzare l'esito della revisione senza modificare file:

```bash
python tools/py/review_external_traits.py --dry-run
```

Applicare la revisione e aggiornare cartelle e log:

```bash
python tools/py/review_external_traits.py
```

Specificare percorsi alternativi (es. per test locali):

```bash
python tools/py/review_external_traits.py \
  --draft-dir /percorso/custom/_drafts \
  --traits-dir /percorso/custom/traits \
  --schema config/schemas/trait.schema.json \
  --log-file logs/trait_review.log
```

Il log `logs/trait_review.log` mantiene una riga per esito con timestamp, ID del
trait, stato finale (`approved`/`rejected`) e motivazione sintetica.
