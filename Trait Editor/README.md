# Trait Editor

Sandbox indipendente per la libreria dei tratti, pensata per revisioni rapide e pubblicazione statica.

## Documentazione

- Consulta la cartella [`docs/`](docs/README.md) per l'indice locale dei capitoli duplicati dal manuale (`docs/traits-manuale/**/*`) e dal vademecum `README_HOWTO_AUTHOR_TRAIT.md`.
- Ogni file indica il percorso sorgente nel monorepo: quando aggiorni il materiale, ricordati di sincronizzare entrambe le copie (locale e originale) e di riportare la data dell'ultima revisione.

## Requisiti

- Node.js 18+
- npm 9+

Puoi verificare rapidamente la versione disponibile con:

```bash
node --version
npm --version
```

Se hai bisogno di installare gli strumenti da zero su macOS/Linux, il metodo più rapido è:

```bash
corepack enable
corepack prepare npm@latest --activate
```

Su Windows o in ambienti dove `corepack` non è disponibile, scarica il pacchetto LTS da <https://nodejs.org/> e assicurati che il comando `npm` sia nel `PATH` prima di proseguire.

## Installazione

```bash
cd "Trait Editor"
npm install
```

> **Suggerimento:** se devi eseguire l'installazione in ambienti bloccati (es. CI) puoi utilizzare `npm install --ignore-scripts`.
> Il progetto non applica patch automatiche post-install, quindi l'opzione non comporta effetti collaterali.

## Comandi disponibili

- `npm run dev` avvia il dev server Vite su <http://localhost:5173> con hot module replacement.
- `npm run build` genera la build statica nella cartella `dist/`.
- `npm run preview` esegue una preview locale della build prodotta.
- `node scripts/simulate-trait-source.mjs` verifica rapidamente il comportamento di `TraitDataService` con sorgente remota e fallback ai mock.

## Flussi di test e note di esecuzione

| Comando | Esito | Note |
| --- | --- | --- |
| `npm install` | ✅ | L'ambiente risultava già allineato; l'esecuzione termina con lo stato "up to date". Npm mostra l'avviso `Unknown env config "http-proxy"`, sintomo di una variabile d'ambiente obsoleta che conviene rimuovere prima dei prossimi upgrade di npm.【ce75e8†L1-L2】【b3f4a1†L1-L5】 |
| `npm run dev` | ⚠️ | Il dev server parte correttamente, ma il comando eredita lo stesso warning `Unknown env config "http-proxy"`. Interrompi con `CTRL+C` quando hai finito di testare. Ricorda di configurare le variabili `VITE_*` se vuoi collegarti al dataset remoto.【a76019†L1-L6】 |
| `npm run build` | ❌ | L'operazione fallisce perché manca un `index.html` nella root del pacchetto; Vite non riesce a risolvere il modulo di ingresso e interrompe la build. Valuta di aggiungere il file (o aggiornare `build.rollupOptions.input`) prima di pubblicare.【83547a†L1-L4】【073449†L1-L11】 |
| `npm run preview` | ⚠️ | Il server di anteprima si avvia comunque, ma riutilizza eventuali asset già presenti sotto `dist/`. Ferma il processo con `CTRL+C` e ricordati che serve una build valida per testare la versione prodotta.【2af6f3†L1-L6】【aa993a†L1-L4】【3c2019†L1-L1】 |

## Variabili d'ambiente `VITE_*`

| Variabile | Default | Quando usarla |
| --- | --- | --- |
| `VITE_TRAIT_DATA_SOURCE` | `sample` | Scegli `remote` per istruire `TraitDataService` a leggere il dataset JSON reale. Qualunque altro valore o stringa vuota forza il fallback sui mock locali. |
| `VITE_TRAIT_DATA_URL` | *(vuoto)* | Indirizzo del file JSON da caricare quando `VITE_TRAIT_DATA_SOURCE=remote`. Può essere un percorso relativo al progetto (`../data/traits/index.json`) oppure un URL assoluto. |
| `VITE_BASE_PATH` | *(vuoto)* | Prefisso da applicare alle rotte quando l'app viene pubblicata sotto una sottocartella (es. `/trait-editor/`). La build accetta anche `BASE_PATH`, utile in ambienti che non supportano il prefisso `VITE_`. |

Per applicarle temporaneamente:

```bash
export VITE_TRAIT_DATA_SOURCE=remote
export VITE_TRAIT_DATA_URL=../data/traits/index.json
```

Oppure crea un file `.env.local` (ignorato da Git) con gli stessi valori; Vite lo carica automaticamente in sviluppo. In produzione puoi esportarle nel runtime del servizio di hosting prima di eseguire `npm run build`.

## Origine dei dati

Di default l'app utilizza i mock definiti in `src/data/traits.sample.ts`.
Quando le variabili precedenti sono impostate su `remote`, `TraitDataService` tenta di caricare il dataset reale e registra in console sia gli errori (`console.error('Impossibile caricare i tratti:', error)`) sia l'eventuale fallback ai mock (`console.warn('Falling back to sample traits after remote fetch failure:', error)`).
Per verificare entrambe le condizioni puoi eseguire `node scripts/simulate-trait-source.mjs`, che mocka `fetch` prima con un payload valido e poi con un `503`, mostrando il ritorno ai mock (`fallback traits length: 4`).

Ricorda di aggiornare `VITE_BASE_PATH` o `BASE_PATH` quando distribuisci l'app in sottocartelle per mantenere coerenti gli asset generati dalla build.

### Output attesi dai passi 5–7 del workflow

I capitoli [Workflow & strumenti](docs/workflow-strumenti.md) e [Manuale operativo](docs/manuale-operativo.md) indicano i controlli finali prima di chiudere una PR sui trait. Qui trovi un riepilogo rapido dei deliverable che dovrebbero risultare completati:

1. **Rigenerazione indice/baseline/coverage** – assicurati che `data/traits/index.csv`, `data/derived/analysis/trait_baseline.yaml` e `data/derived/analysis/trait_coverage_report.json` riflettano l'ultima modifica.
2. **Audit finale** – allega i log generati da `python3 scripts/trait_audit.py --check` in `logs/trait_audit.md` (o nel file specificato dallo script) e annota eventuali anomalie.
3. **Checklist PR** – compila le checklist contributive (`README_HOWTO_AUTHOR_TRAIT.md`, `docs/contributing/traits.md`) e riportane lo stato nella descrizione della PR.

Se qualcuno di questi artefatti non è aggiornato, torna sui passi corrispondenti del workflow prima di procedere alla revisione.

## Pubblicazione

1. Installa (o aggiorna) le dipendenze Node del pacchetto:

   ```bash
   npm install
   ```

2. Esporta le variabili richieste dall'ambiente di destinazione. Ad esempio:

   ```bash
   export VITE_TRAIT_DATA_SOURCE=remote
   export VITE_TRAIT_DATA_URL=../data/traits/index.json
   export VITE_BASE_PATH=/trait-editor/
   ```

   `VITE_BASE_PATH` (o `BASE_PATH`) è opzionale, ma va impostato quando l'app è ospitata in sottocartella.

3. Genera la build ottimizzata:

   ```bash
   npm run build
   ```

   L'output è disponibile in `dist/` e include sia l'`index.html` sia gli asset JavaScript/CSS bundlati.

4. Carica il contenuto di `dist/` sul servizio statico scelto (GitHub Pages, S3, Netlify, ecc.) o sull'artefatto della CI.

5. (Opzionale) Esegui `npm run preview` per verificare localmente la build prima di distribuirla.

### Guida rapida CI / produzione

1. Prepara le variabili di ambiente (`VITE_TRAIT_DATA_SOURCE`, `VITE_TRAIT_DATA_URL`, `VITE_BASE_PATH`/`BASE_PATH`) nel job di build.
2. Esegui `npm ci` oppure `npm install --frozen-lockfile` per installare le dipendenze definite in `package-lock.json`.
3. Lancia `npm run build` all'interno della cartella `Trait Editor/`.
4. Archivia il contenuto di `Trait Editor/dist/` come artefatto (`dist/index.html`, `dist/assets/**`).
5. Pubblica l'artefatto sul target di produzione o collegalo allo step di deploy successivo.

## Nota sulle dipendenze AngularJS

Le librerie AngularJS (`angular`, `angular-route`, `angular-animate`, `angular-sanitize`) vengono installate tramite `npm` e incluse automaticamente nel bundle generato da Vite a partire da `index.html` e `src/main.ts`.

- Non è più necessario l'accesso a una CDN esterna: gli script risultanti sono serviti da `dist/assets/*.js`.
- L'`index.html` nella radice del pacchetto gestisce internamente l'inizializzazione dell'app e l'inferenza del `basePath` prima di caricare il modulo principale.
- In caso di aggiornamento delle librerie, aggiorna `package.json`/`package-lock.json` e rigenera la build per propagare i cambiamenti.

### Configurazioni legacy

Se devi supportare ambienti che richiedono ancora script hostati esternamente (es. mirror preesistenti), puoi esportare gli asset prodotti da `node_modules/` verso una CDN proprietaria. Mantieni queste note in un documento separato e assicurati che eventuali eccezioni CSP siano registrate dal team di sicurezza.
