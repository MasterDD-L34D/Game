# Trait Editor API payloads

La seguente documentazione descrive i payload normalizzati esposti dal backend del Trait Editor. Per una panoramica operativa del workflow e dell'integrazione con l'interfaccia editoriale consulta anche [Trait Editor standalone — Setup, sviluppo e deploy](trait-editor.md) e il capitolo dedicato nella manualistica ([Workflow & strumenti](traits-manuale/05-workflow-strumenti.md)).

## Indice normalizzato (`GET /api/traits/index`)

L'endpoint restituisce un documento JSON strutturato come segue:

```jsonc
{
  "traits": {
    "<traitId>": { "id": "...", "label": "...", "type": "..." },
    "...": { "...": "..." }
  },
  "meta": {
    "schema": {
      "version": "<schemaVersion>",
      "path": "<percorso-relativo-schema>"
    },
    "glossary": {
      "path": "<percorso-relativo-glossario>"
    },
    "traits": {
      "<traitId>": {
        "id": "<traitId>",
        "path": "<data/traits/.../traitId.json>",
        "category": "<categoria-o-null>",
        "isDraft": <boolean>,
        "updatedAt": "<timestamp ISO>",
        "savedAt": "<timestamp ISO>",
        "version": "<hash-versione>",
        "etag": "<hash-etag>"
      }
    }
  },
  "legacy": {
    "schema_version": "...",
    "trait_glossary": "...",
    "traits": { "...": "..." }
  }
}
```

- `traits` contiene l'indice logico originale (compatibile con il dataset legacy) e mantiene le chiavi e i campi storici.
- `meta.schema` riporta versione e percorso della definizione JSON Schema attiva.
- `meta.glossary.path` indica la posizione del glossario trait aggregato.
- `meta.traits` elenca per ogni trait le informazioni di filesystem e di concorrenza (`etag`, `version`, `updatedAt`, `savedAt`). Le bozze risiedono in `_drafts` e hanno `category: null` e `isDraft: true`.
- `legacy` riproduce il documento originale letto da `data/traits/index.json` per i consumer non ancora migrati. È incluso solo quando `includeLegacy` non viene impostato a `false` nella richiesta.

## Dettaglio trait (`GET /api/traits/:traitId`)

Tutti gli endpoint che restituiscono un singolo trait (lettura, creazione, aggiornamento, ripristino versione, clonazione) condividono lo schema `{ trait, meta }`:

```jsonc
{
  "trait": {
    "id": "<traitId>",
    "label": "<nome visualizzato>",
    "type": "<categoria di schema>",
    "...": "..."
  },
  "meta": {
    "id": "<traitId>",
    "path": "<data/traits/.../traitId.json>",
    "category": "<categoria-o-\"_drafts\">",
    "isDraft": <boolean>,
    "version": "<hash-versione>",
    "etag": "<hash-etag>",
    "updatedAt": "<timestamp ISO>",
    "savedAt": "<timestamp ISO>",
    "savedBy": "<autore opzionale>",
    "created": true,           // presente solo dopo la creazione
    "versioned": true,         // presente dopo aggiornamenti su un trait già esistente
    "restoredFrom": "<id>"    // presente dopo il ripristino di una versione storica
  }
}
```

### Header di concorrenza

Gli aggiornamenti richiedono sempre la trasmissione delle informazioni di concorrenza:

- **Versione**: fornire `meta.version` nel payload **oppure** l'header `X-Trait-Version`. Il valore deve corrispondere a quello letto dal `GET` precedente.
- **ETag**: fornire `meta.etag` o `meta.expectedEtag` nel payload **oppure** l'header HTTP standard `If-Match` (il server accetta anche forme deboli, ma rimuove il prefisso `W/`).

Se nessuno dei due valori viene inviato, il server risponde con `428 Precondition Required`. Se i valori non coincidono con lo stato corrente, viene restituito `412 Precondition Failed` con un messaggio che invita a ricaricare il trait.

Per registrare l'autore dell'operazione è possibile (e consigliato) impostare l'header `X-Trait-Author` oppure valorizzare `meta.author` nel payload. Il backend riporterà il valore consolidato nel campo `meta.savedBy` della risposta.

### Payload di aggiornamento (`PUT /api/traits/:traitId`)

Il corpo della richiesta deve includere l'oggetto `trait` aggiornato (senza campi di metadati estranei allo schema) e, opzionalmente, una sezione `meta` con `version`, `etag` e `author`.

```jsonc
{
  "trait": { "id": "berserker", "label": "Berserker", "...": "..." },
  "meta": {
    "version": "<hash-versione-attesa>",
    "etag": "<hash-etag-atteso>",
    "author": "Nome Cognome"
  }
}
```

I campi in `meta` sono equivalenti ai relativi header HTTP e possono essere omessi se gli header vengono forniti.

### Creazione (`POST /api/traits`)

In fase di creazione è sufficiente inviare l'oggetto `trait`. Opzionalmente si possono indicare `category`, `draft`/`isDraft`, `traitId`/`slug` e `meta.author`. La risposta conterrà il payload `{ trait, meta }` completo di `meta.created: true` e degli identificativi di concorrenza iniziali.

### Ripristino versioni (`POST /api/traits/:traitId/versions/:versionId/restore`)

Il ripristino richiede gli stessi vincoli di concorrenza del `PUT`. È possibile trasmettere `expectedVersion`/`expectedEtag` nel corpo o riutilizzare `meta.version`/`meta.etag`. La risposta indica la versione ripristinata tramite `meta.restoredFrom`.

## Allineamento con il Trait Editor

Il Trait Editor (sia nella variante integrata che nello standalone) si aspetta i formati descritti sopra per poter sincronizzare l'indice e i salvataggi. Prima di effettuare operazioni mass batch, rivedi il [workflow operativo del Trait Editor](traits-manuale/06-standalone-trait-editor.md) per assicurarti di configurare correttamente variabili ambiente, sorgenti dati e controlli di versione.
