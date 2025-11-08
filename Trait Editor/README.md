# Trait Editor

Sandbox indipendente per la libreria dei tratti, pensata per revisioni rapide e pubblicazione statica.

## Documentazione

- Consulta la cartella [`docs/`](docs/README.md) per l'indice locale dei capitoli duplicati dal manuale (`docs/traits-manuale/**/*`) e dal vademecum `README_HOWTO_AUTHOR_TRAIT.md`.
- Ogni file indica il percorso sorgente nel monorepo: quando aggiorni il materiale, ricordati di sincronizzare entrambe le copie (locale e originale) e di riportare la data dell'ultima revisione.

## Requisiti

- Node.js 18+
- npm 9+

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

## Origine dei dati

Di default l'app utilizza i mock definiti in `src/data/traits.sample.ts`.
Per collegarsi al dataset reale (`../data/traits/index.json` nel monorepo) puoi:

1. Esportare le variabili d'ambiente prima di avviare Vite:

   ```bash
   export VITE_TRAIT_DATA_SOURCE=remote
   # opzionale: override dell'endpoint relativo
   export VITE_TRAIT_DATA_URL=../data/traits/index.json
   ```

2. Oppure creare un file `.env.local` nella cartella `Trait Editor/` con il seguente contenuto (comodo per lo sviluppo locale):

   ```bash
   VITE_TRAIT_DATA_SOURCE=remote
   VITE_TRAIT_DATA_URL=../data/traits/index.json
   ```

Durante lo sviluppo Vite carica automaticamente `.env.local`. In produzione puoi applicare le stesse variabili sul runtime di hosting.

Il servizio `TraitDataService` effettua automaticamente il fallback ai mock se il fetch remoto non è disponibile, registrando l'errore in console.

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
