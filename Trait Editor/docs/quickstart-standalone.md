# Guida rapida all'editor standalone

> Documento originale per il pacchetto standalone.

Questa guida sintetizza i passaggi minimi per avviare l'editor e verificare una modifica ai trait quando si lavora fuori dal monorepo.

## 1. Preparazione
- Clona o scarica il pacchetto `Trait Editor/` insieme alla cartella `data/traits/` del monorepo.
- Copia eventuali file di configurazione (`.env.local`) che puntano al dataset condiviso.
- Verifica la presenza di Node.js 18+ con `node --version` e di npm 9+.
- Controlla di poter raggiungere la CDN Google di AngularJS (`ajax.googleapis.com`) oppure prepara un mirror locale seguendo la [nota sulle dipendenze front-end](../README.md#nota-sul-caricamento-di-angularjs).

## 2. Configura l'accesso ai dati
1. Se lavori con il dataset ufficiale, posiziona `data/traits/index.json` a un livello superiore rispetto al pacchetto.
2. Crea un file `.env.local` nella radice di `Trait Editor/` con il seguente contenuto:
   ```bash
   VITE_TRAIT_DATA_SOURCE=remote
   VITE_TRAIT_DATA_URL=../data/traits/index.json
   ```
3. Per testare dati sperimentali, duplica il file e modifica `VITE_TRAIT_DATA_URL` verso la copia desiderata.

## 3. Avvio e verifica
1. Installa le dipendenze con `npm install`.
2. Avvia il server di sviluppo: `npm run dev`.
3. Apri <http://localhost:5173> e seleziona il trait da verificare.
4. Controlla che form, anteprima e localizzazioni riflettano gli ultimi aggiornamenti.
5. Se necessario, esegui `npm run build` per generare la versione statica e validare la pipeline di deploy.
6. Opzionale: lancia `node scripts/simulate-trait-source.mjs` per testare il fallback mock senza aprire il browser.

## 4. Checklist rapida
- [ ] Mock disattivati o aggiornati (`src/data/traits.sample.ts`) se usi dati reali.
- [ ] Variabili `VITE_*` definite (`printenv | grep VITE_`).
- [ ] Dipendenze front-end disponibili (CDN consentita o mirror locale configurato).
- [ ] Log del browser puliti: nessun errore di fetch o validazione.
- [ ] Outputs dei passi 5–7 verificati: indice/baseline/coverage rigenerati, `logs/trait_audit.md` aggiornato, checklist PR completate.
- [ ] Screenshots aggiornati allegati alla PR (se richiesti).
- [ ] Documentazione locale sincronizzata (aggiorna i riferimenti in `Trait Editor/docs/`).

Per dubbi o approfondimenti consulta [Workflow & strumenti](workflow-strumenti.md) e la guida completa [STANDALONE Trait Editor](standalone-trait-editor.md).
