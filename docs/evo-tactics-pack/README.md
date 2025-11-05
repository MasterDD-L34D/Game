# Evo Tactics Pack · Catalog & Runtime Overrides

Questo pacchetto contiene gli asset statici utilizzati dal generatore web
(`docs/evo-tactics-pack/generator.js`) e dagli strumenti server-side per caricare
catalogo, registri trait/hazard e indici specie. Gli asset vengono sincronizzati
in tre posizioni:

- `packs/evo_tactics_pack/docs/catalog/` — sorgente canonica usata per
  publication e mirroring del pack.
- `docs/evo-tactics-pack/` — fallback locale incluso nel sito statico.
- `public/docs/evo-tactics-pack/` — bundle distribuito con la webapp per ambienti
  che non possono raggiungere GitHub RAW.

Usa lo script `node scripts/update_evo_pack_catalog.js` per rigenerare il
catalogo arricchito (biomi, specie, registri). Dopo l'aggiornamento esegui
`node scripts/sync_evo_pack_assets.js` per propagare i file in `docs/` e
`public/`.

## Override lato browser

Il loader frontend (`docs/evo-tactics-pack/pack-data.js`) supporta diversi
override per puntare a mirror o CDN alternativi.

### Query string

Aggiungi `?pack-root=https://cdn.example.com/evo/` all'URL della pagina del
pack. Il valore deve terminare con `/` e conterrà la struttura
`packs/evo_tactics_pack/`.

### Meta tag

Inserisci nel `<head>` della pagina:

```html
<meta name="pack-root" content="https://cdn.example.com/evo/" />
```

Il meta ha priorità minore rispetto alla query string, ma evita di modificare i
link pubblici.

### Auto-rilevamento GitHub Pages

Quando il sito è servito da `*.github.io`, il loader costruisce
automaticamente l'URL RAW (`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/packs/evo_tactics_pack/`).
Puoi forzare il branch tramite `?ref=my-feature` o `<meta name="data-branch" ...>`.

## Override tooling / server

Lo script `packs/pack-data.js` utilizzato da pipeline e CLI legge le seguenti
variabili d'ambiente (tutte opzionali, vengono deduplicate mantenendo l'ordine):

| Variabile           | Descrizione                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `EVO_PACK_ROOT`     | Percorso locale o URL prioritario per il pack.                    |
| `EVO_PACK_BASE`     | Alias legacy di `EVO_PACK_ROOT`.                                  |
| `EVO_PACK_OVERRIDE` | Override esplicito aggiuntivo.                                    |
| `EVO_PACK_REMOTE`   | Lista separata da spazi/virgole di sorgenti remote (CDN, mirror). |
| `EVO_PACK_SOURCES`  | Lista addizionale di sorgenti remote.                             |
| `EVO_REPO_ROOT`     | Radice del repository per risolvere percorsi locali.              |

Esempio:

```bash
EVO_PACK_REMOTE="https://cdn.example.com/evo https://mirror.local/evo" \
node -e "import('./packs/pack-data.js').then(m => m.loadPackCatalog({ verbose: true }))"
```

## Contenuto del bundle statico

La cartella `public/docs/evo-tactics-pack/` include:

- `catalog_data.json` — catalogo completo con biomi arricchiti e specie dettagliate.
- `env-traits.json`, `trait-reference.json`, `trait-glossary.json`, `hazards.json` —
  registri derivati utilizzati dal pannello Traits.
- `species-index.json` e `species/*.json` — indice e schede specie per il
  caricamento incrementale.
- `traits/` — index legacy per categorie, mantenuto per compatibilità.

Ogni build CI esegue `scripts/sync_evo_pack_assets.js` prima della pubblicazione
su GitHub Pages per garantire che questi asset facciano parte del bundle.
