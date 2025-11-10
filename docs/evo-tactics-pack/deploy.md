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

### Nuova struttura modulare

Il refactor del generatore introduce moduli specializzati che semplificano
personalizzazioni, test e contributi:

- **`views/*`** contiene i controller UI per ciascun pannello del generatore
  (`parameters`, `traits`, `biomes`, `seeds`, `composer`, `insights`, `activity`,
  `export`). Ogni modulo esporta funzioni `init`, `render` e helper per gli
  eventi specifici della vista.
- **`services/*`** espone servizi riutilizzabili lato browser come lo storage
  persistente (`storage.ts`) e il layer audio (`audio.ts`) responsabile delle cue
  dinamiche.
- **`tests/docs-generator/*`** racchiude gli scenari di unit e integration test
  dedicati al generatore, con suite distinte per servizi e viste.

Le dipendenze principali vengono orchestrate da `docs/evo-tactics-pack/generator.js`,
che carica i servizi condivisi, inizializza le viste e collega gli entry point
di esportazione (`generateDossier*` e `generatePresetFileContents`).

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

| Variabile           | Descrizione                                                   |
| ------------------- | ------------------------------------------------------------- |
| `EVO_PACK_ROOT`     | Percorso locale o URL prioritario per il pack.                |
| `EVO_PACK_BASE`     | Alias di `EVO_PACK_ROOT` utile per ambienti legacy.           |
| `EVO_PACK_OVERRIDE` | Ulteriore override esplicito.                                 |
| `EVO_PACK_REMOTE`   | Lista (separata da spazi o virgole) di sorgenti remote (URL). |
| `EVO_PACK_SOURCES`  | Lista aggiuntiva di sorgenti remote.                          |
| `EVO_REPO_ROOT`     | Radice del repository da cui risolvere i percorsi locali.     |

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
4. Eseguire `npm run test:docs-generator` per validare servizi e viste del
   generatore (`tests/docs-generator/*`). In aggiunta, mantenere `tests/validate_dashboard.py`
   per assicurarsi che il preset demo e le sorgenti remote siano configurate
   correttamente.
5. Validare manualmente il caricamento su staging verificando che il generatore
   mostri le metriche demo e consenta il download dello zip completo.

## API catalogo e override runtime

Il generatore interroga prima il backend REST per caricare i cataloghi. Gli
endpoint esposti devono condividere la stessa base URL configurata tramite
`window.__EVO_TACTICS_API_BASE__`, la query string `?api-base=` oppure il meta
tag `<meta name="evo-api-base">`. I percorsi attesi sono:

- `GET /api/v1/catalog/biomes`
- `GET /api/v1/catalog/ecosystem`
- `GET /api/v1/catalog/species`
- `GET /api/v1/catalog/pools`

Il servizio `services/data-source.js` gestisce la sequenza di fallback: tenta gli
endpoint remoti, poi ricade sugli asset statici del bundle e infine attiva un
dataset embedded minimale affinché il generatore resti operativo anche offline.
Lo stesso dataset viene riutilizzato da `fallbackGenerateBiomes` e dal loader
Nebula per mostrare dati di cortesia quando il Mission Console non è
raggiungibile.【F:services/data-source.js†L1-L235】【F:docs/evo-tactics-pack/generator.js†L4136-L4228】

## Configurazione endpoint generazione

Il worker remoto espone l'endpoint ufficiale
`https://api.evo-tactics.dev/api/v1/generation/biomes`, pubblicato anche via
costanti in `server/routes/generation.js`. La stessa base
`https://api.evo-tactics.dev/` viene riutilizzata anche dagli endpoint catalogo
(`api/v1/catalog/*`) e va propagata al frontend impostando
`window.__EVO_TACTICS_API_BASE__` in modo che le build statiche puntino al
dominio corretto.【F:server/routes/generation.js†L3-L15】【F:docs/evo-tactics-pack/generator.html†L21-L26】【F:docs/evo-tactics-pack/generator.js†L267-L298】

### CDN statiche

- Inserire nello `head` della pagina hostata (es. rewrite CDN) lo snippet:

  ```html
  <script>
    window.__EVO_TACTICS_API_BASE__ = 'https://api.evo-tactics.dev/';
  </script>
  ```

- In alternativa, utilizzare i meccanismi di templating della CDN (Cloudflare
  Workers, Netlify Edge Functions) per valorizzare la variabile partendo da
  una secret oppure da un `config.json` distribuito insieme al bundle.
- Verificare che eventuali proxy CDN mantengano il percorso
  `/api/v1/generation/biomes` senza riscritture, e abilitare caching solo per
  le risposte 200/204 di breve durata.

### Ambienti self-hosted

- Esportare l'ambiente `EVO_TACTICS_API_BASE` quando si avvia l'app Express per
  allineare il dominio ufficiale anche lato server:

  ```bash
  export EVO_TACTICS_API_BASE="https://api.evo-tactics.dev/"
  npm run start:api
  ```

- Nei template HTML renderizzati dal proprio hosting inserire lo stesso
  snippet `window.__EVO_TACTICS_API_BASE__`, eventualmente parametrizzato via
  variabile d'ambiente o configurazione Ansible/Kubernetes.
- Per mirror interni è possibile puntare la variabile a un dominio privato
  (es. `https://api.internal.evo/`) mantenendo la stessa struttura di path;
  ricordarsi di aggiungere certificati validi per il browser.

## Monitoraggio worker di generazione

- **Metriche HTTP** — strumentare gateway o service mesh per registrare latency,
  throughput e tasso d'errore delle chiamate verso
  `OFFICIAL_BIOME_GENERATION_URL`, sfruttando la costante esportata in
  `server/routes/generation.js` per mantenere una singola fonte.
- **Fallback e log strutturati** — il client registra nel `state.activityLog`
  ogni fallback locale con `action: 'roll-ecos-fallback'` e motivo (`metadata.reason`).
  Le voci vengono gestite da `recordActivity` e sono consultabili dal pannello
  Activity o esportate in CSV via `activityLogToCsv`. Monitorare questi eventi
  nel tempo consente di validare l'affidabilità del worker.【F:docs/evo-tactics-pack/generator.js†L514-L559】【F:docs/evo-tactics-pack/generator.js†L1995-L2223】【F:docs/evo-tactics-pack/utils/serializers.ts†L62-L109】
- **Pipeline di alerting** — aggregare i log backend con gli eventi UI
  (es. streaming verso ELK) per correlare i 500/timeout alle sessioni che
  attivano il fallback. Configurare notifiche quando il rate di fallback supera
  una soglia prefissata oppure quando `state.metrics.averageRollIntervalMs`
  aumenta drasticamente, segnale di worker degradato.

## Troubleshooting

- **Errore HTTP durante il fetch** — controllare che i file `catalog_data.json`
  e `docs/catalog/` siano stati pubblicati mantenendo la struttura originale.
- **Percorsi locali non risolti** — impostare `EVO_REPO_ROOT` oppure lanciare i
  comandi dalla root del repository.
- **Press kit non generato** — assicurarsi di avere almeno un ecosistema
  generato prima del download del preset.
