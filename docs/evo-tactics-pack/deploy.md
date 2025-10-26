# Deploy bundle demo dell'Evo Tactics Pack

Questa guida descrive come pubblicare il bundle demo del generatore su hosting
statico, come forzare il caricamento del catalogo da sorgenti remote e quali
variabili d'ambiente supporta lo script `packs/pack-data.js`.

## Struttura del bundle demo

Il preset `demo-bundle` presente in `generator.js` produce tre file:

- `*.yaml` — manifesto dati minimale per CDN statiche o mirroring via CI.
- `*-dossier.html` — dossier HTML pronto per landing page e materiali
  marketing.
- `*-press-kit.md` — press kit markdown con metriche, highlight e call-to-action
  per le comunicazioni pubbliche.

Il comando "Scarica preset" genera uno zip con questi asset nella cartella
`packs/evo_tactics_pack/out/generator/`.

## Override runtime del catalogo

Entrambi i moduli `docs/evo-tactics-pack/pack-data.js` (frontend) e
`packs/pack-data.js` (tooling/server) supportano override della sorgente dati.

### Query string e meta tag (frontend)

- `?pack-root=https://cdn.example.com/evo/` forza il caricamento da una CDN.
- `<meta name="pack-root" content="https://cdn.example.com/evo/">` applica lo
  stesso override senza modificare gli URL.

### Variabili d'ambiente (tooling/server)

Lo script `packs/pack-data.js` legge le seguenti variabili quando eseguito via
Node o in pipeline CI:

| Variabile             | Descrizione                                                   |
| --------------------- | ------------------------------------------------------------- |
| `EVO_PACK_ROOT`       | Percorso locale o URL prioritario per il pack.                |
| `EVO_PACK_BASE`       | Alias di `EVO_PACK_ROOT` utile per ambienti legacy.           |
| `EVO_PACK_OVERRIDE`   | Ulteriore override esplicito.                                |
| `EVO_PACK_REMOTE`     | Lista (separata da spazi o virgole) di sorgenti remote (URL). |
| `EVO_PACK_SOURCES`    | Lista aggiuntiva di sorgenti remote.                          |
| `EVO_REPO_ROOT`       | Radice del repository da cui risolvere i percorsi locali.    |

Esempio di invocazione per testare un mirror remoto:

```bash
EVO_PACK_REMOTE="https://cdn.example.com/evo" \
node -e "import('./packs/pack-data.js').then(m => m.loadPackCatalog({ verbose: true })).then(({ context }) => console.log(context.resolvedBase))"
```

Se `fetch` non è disponibile (esecuzione Node < 18) lo script userà solo le
sorgenti locali.

## Procedura di deploy demo

1. Generare l'ecosistema demo e scaricare il preset "Bundle demo pubblico".
2. Pubblicare i tre file prodotti (`yaml`, `html`, `md`) su una CDN o GitHub
   Pages mantenendo la struttura `/packs/evo_tactics_pack/`.
3. Aggiornare il sito statico impostando `pack-root` sull'URL pubblico (query
   string, meta tag o variabile `EVO_PACK_REMOTE`).
4. Eseguire `tests/validate_dashboard.py` per assicurarsi che il preset demo e
   le sorgenti remote siano configurate correttamente.
5. Validare manualmente il caricamento su staging verificando che il generatore
   mostri le metriche demo e consenta il download dello zip completo.

## Troubleshooting

- **Errore HTTP durante il fetch** — controllare che i file `catalog_data.json`
  e `docs/catalog/` siano stati pubblicati mantenendo la struttura originale.
- **Percorsi locali non risolti** — impostare `EVO_REPO_ROOT` oppure lanciare i
  comandi dalla root del repository.
- **Press kit non generato** — assicurarsi di avere almeno un ecosistema
  generato prima del download del preset.

