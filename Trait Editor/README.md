# Trait Editor

Sandbox indipendente per la libreria dei tratti, pensata per revisioni rapide e pubblicazione statica.

## Documentazione

- Consulta la cartella [`docs/`](docs/README.md) per l'indice locale dei capitoli duplicati dal manuale (`docs/traits-manuale/**/*`) e dal vademecum `README_HOWTO_AUTHOR_TRAIT.md`.
- Ogni file indica il percorso sorgente nel monorepo: quando aggiorni il materiale, ricordati di sincronizzare entrambe le copie (locale e originale) e di riportare la data dell'ultima revisione.

## Requisiti

- Node.js 18+
- npm 9+
- Accesso alla CDN Google per AngularJS 1.8.x **oppure** mirror locale configurato (vedi [nota dedicata](#nota-sul-caricamento-di-angularjs)).

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

1. Esegui `npm run build` per produrre la cartella `dist/`.
2. Distribuisci il contenuto di `dist/` su un hosting statico (GitHub Pages, S3, Netlify, ecc.).
3. Imposta `VITE_BASE_PATH` o `BASE_PATH` prima della build se il sito verrà servito da una sottocartella.

## Nota sul caricamento di AngularJS

L'app si affida alla CDN Google per caricare AngularJS 1.8.x. I file esterni attualmente inclusi sono:

| Script | Origine |
| --- | --- |
| `angular.min.js` | `https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js` |
| `angular-route.min.js` | `https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-route.min.js` |
| `angular-animate.min.js` | `https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-animate.min.js` |
| `angular-sanitize.min.js` | `https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-sanitize.min.js` |

Verifica le policy di Content Security Policy del target di pubblicazione e aggiungi eventuali eccezioni se richiesto.

### Strategie per CDN e mirror locali

Di seguito sono riportate due configurazioni alternative. Scegli quella più adatta all'ambiente di distribuzione (es. dev offline, produzione con CSP restrittiva, ecc.).

#### 1. CDN Google (configurazione di default)

- Nessuna azione aggiuntiva: i tag `<script>` in `public/index.html` puntano direttamente alla CDN.
- Assicurati che l'hosting finale consenta connessioni in uscita verso `ajax.googleapis.com` e, se necessario, registra il dominio tra le eccezioni CSP.

#### 2. Bundle locale/mirror degli asset AngularJS

1. Scarica i pacchetti AngularJS in locale. Puoi usare `npm` per mantenere i file versionati assieme al progetto:

   ```bash
   npm install --save angular@1.8.3 angular-route@1.8.3 angular-animate@1.8.3 angular-sanitize@1.8.3
   ```

   In alternativa, utilizza `curl`/`wget` per scaricare gli asset direttamente nella cartella `public/vendor/angular/`.

2. Copia (o linka) i file minimizzati nel percorso statico servito da Vite:

   ```bash
   mkdir -p public/vendor/angular
   cp node_modules/angular/angular.min.js public/vendor/angular/
   cp node_modules/angular-route/angular-route.min.js public/vendor/angular/
   cp node_modules/angular-animate/angular-animate.min.js public/vendor/angular/
   cp node_modules/angular-sanitize/angular-sanitize.min.js public/vendor/angular/
   ```

   Durante `vite build` tutti i file sotto `public/` vengono copiati in `dist/`, così da essere serviti dal tuo hosting.

3. Aggiorna i tag `<script>` in `public/index.html` sostituendo gli URL CDN con i riferimenti locali (es. `/vendor/angular/angular.min.js`). Mantieni un commento o un diff pronto per facilitare lo switch.

4. Commita i file copiati solo se desideri versionarli nel repository. In alternativa, automatizza la copia con uno script (es. `npm run prepare` o `postinstall`) per ridurre il rischio di divergenze.

5. (Opzionale) Conserva un file di checksum o una nota sulle versioni per verificare rapidamente la corrispondenza con l'upstream.

Per passare da una modalità all'altra è sufficiente modificare i riferimenti in `public/index.html`. Mantieni la documentazione allineata quando aggiorni le librerie.
