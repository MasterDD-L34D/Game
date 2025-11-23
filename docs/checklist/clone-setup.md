# Procedura di clone e setup iniziale

**Ultimo aggiornamento:** 2025-11-12 — referente Ops/ChatGPT.

Questa guida descrive i passaggi necessari per replicare l'ambiente operativo
utilizzato nel container di riferimento (`Ubuntu 22.04`, percorso `/workspace/Game`).
Annota eventuali variazioni nelle note operative a fine documento.

## 1. Clonazione o estrazione del repository

1. Se il repository è remoto:
   ```bash
   git clone https://github.com/<org>/Game.git /workspace/Game
   ```
2. In alternativa, estrai l'archivio fornito da Drive nella stessa posizione e
   lancia `git status` per verificare l'integrità della working tree.
3. Registra la data di completamento nella checklist `project-setup-todo.md`.

## 2. Verifica strumenti di base

Esegui i comandi seguenti per assicurarti che le versioni rispettino i requisiti
minimi del progetto:

```bash
node --version   # atteso >= 18 (repo validato con Node 22.19.0)
npm --version    # atteso >= 9 (repo validato con npm 11.6.2)
python3 --version
python3 -m pip --version
```

## 3. Ambiente Python dedicato

1. Crea il virtual environment nella radice del progetto e attivalo:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Aggiorna `pip` all'ultima versione disponibile:
   ```bash
   python3 -m pip install --upgrade pip
   ```

## 4. Dipendenze progetto

1. Installazione tool TypeScript:
   ```bash
   cd tools/ts
   npm ci
   npm run build
   cd -
   ```
2. Installazione dipendenze Python:
   ```bash
   python3 -m pip install -r tools/py/requirements.txt
   ```

## 5. Verifiche rapide post-setup

1. Validazione dataset condivisi:
   ```bash
   python3 tools/py/validate_datasets.py
   ```
2. Controllo parità CLI (TypeScript vs Python) con seed deterministico:
   ```bash
   node tools/ts/dist/roll_pack.js ENTP invoker --seed demo
   python3 tools/py/roll_pack.py ENTP invoker --seed demo
   ```
3. Avvio server statico per la dashboard di test:
   ```bash
   python3 -m http.server 8000
   # Verifica con curl: curl -I http://127.0.0.1:8000/docs/test-interface/
   ```
4. Registra eventuali esiti o problemi in `docs/tool_run_report.md`.

## 6. Note operative

- Setup completato nel container Ops/ChatGPT il 2025-11-12 alle 10:30 CET
  (owner: Ops). Versioni verificate: Node 22.19.0, npm 11.6.2, Python 3.11.12,
  pip 25.3.
- Ripeti i passaggi ogni volta che viene ricreato il container o che cambia
  l'immagine base.
- In caso di ambienti con proxy aziendale, usa le chiavi supportate
  `npm_config_proxy`/`npm_config_https_proxy` (non `npm_config_http_proxy`) per
  evitare il warning `Unknown env config "http-proxy"` prima di eseguire
  `npm ci` o `pip install`.
- La procedura dettagliata di migrazione è in `docs/ops/npm-proxy-migration.md`.
