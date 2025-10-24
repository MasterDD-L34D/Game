# Evo-Tactics — Progetto Gioco Evolutivo Tattico (Repo Starter)

Repository avviabile per il progetto: tattico co-op su TV/app con sistema d20, evoluzione alla *Spore*, Forme MBTI→16, Enneagram Themes, telemetria VC, tratti/mutazioni, pacchetti PI, NPG reattivi per bioma, Mating/Nido.

> Questo è uno **starter** pronto all’uso: dati YAML, script CLI (TS/Python), e struttura CI. È progettato per essere caricato su **GitHub** e condiviso su **Google Drive**.

## Struttura
```
evo-tactics/
├─ docs/                 # Note progettuali (Canvas, roadmap, checklist)
├─ data/                 # Dataset YAML (telemetria, pack PI, biomi, mutazioni, ecc.)
├─ tools/
│  ├─ ts/                # CLI TypeScript + test (roll_pack, Node test runner)
│  └─ py/                # CLI Python unificata + helper condivisi
│     ├─ game_cli.py     # Entry point con sottocomandi roll-pack/generate-encounter/validate-datasets
│     ├─ game_utils/     # RNG deterministico, loader YAML e helper condivisi
│     ├─ roll_pack.py    # Wrapper compatibile con lo script storico
│     └─ generate_encounter.py
├─ scripts/              # Utility (Drive, sincronizzazioni)
└─ README.md
```

## Quick Start — Node/TypeScript
```bash
cd tools/ts
npm install
npm run build
# Esegue il CLI (dataset implicito da ../../data/packs.yaml)
node dist/roll_pack.js ENTP invoker --seed demo

# Varianti
# ROLL_PACK_SEED=demo node dist/roll_pack.js ENTP invoker
# node dist/roll_pack.js ENTP invoker /percorso/custom/packs.yaml
```

## Quick Start — Python
```bash
cd tools/py
# CLI unificata con seed riproducibile e path opzionali
python3 game_cli.py roll-pack entp invoker --seed demo
python3 game_cli.py generate-encounter savana --party-power 18 --seed demo
python3 game_cli.py validate-datasets

# Wrapper legacy (reindirizzati al parser condiviso)
python3 roll_pack.py ENTP invoker
python3 generate_encounter.py savana
```

> Suggerimento: lo script unificato `game_cli.py` espone sottocomandi coerenti
> (`roll-pack`, `generate-encounter`, `validate-datasets`) e gestisce anche i
> seed deterministici condivisi (`--seed`), così da allineare Python e
> TypeScript sugli stessi dati YAML.

## Interfaccia test & recap via web
- [Apri la dashboard](docs/test-interface/index.html) per consultare rapidamente pacchetti PI,
  telemetria VC, biomi e compatibilità delle forme (funziona sia in locale sia online).
- **Online subito (GitHub Pages)**: abilita la pubblicazione da `Settings → Pages → Build and
  deployment → Deploy from a branch`, scegli `work` (o il branch desiderato) e la cartella `/docs/`.
  L'URL diventa `https://<tuo-utente>.github.io/<repo>/test-interface/`, con fetch automatico degli
  YAML via `raw`.
- **Uso locale**: avvia un server dalla radice (`python3 -m http.server 8000`) e visita
  `http://localhost:8000/docs/test-interface/` per lavorare offline.
- Premi "Ricarica dati YAML" dopo aver modificato i file in `data/`, quindi "Esegui test" per i
  controlli rapidi di integrità sui dataset caricati.
- Per aggiornamenti al volo, incolla l'URL di uno snapshot YAML/JSON nel form "Fetching manuale" e
  premi "Scarica & applica" per un merge immediato nel dataset di sessione. In hosting remoto puoi
  forzare sorgenti alternative con `?data-root=<url-assoluto-o-root-relative>` e cambiare branch `raw`
  con `?ref=<branch>`.

## Pubblicazione su GitHub
```bash
cd /path/alla/cartella/evo-tactics
git init
git add .
git commit -m "chore: bootstrap repo starter"
git branch -M main
git remote add origin https://github.com/<tuo-utente>/<repo>.git
git push -u origin main
```

## Condivisione su Google Drive
- Carica lo **zip** generato da ChatGPT su Drive (o estrai e carica la cartella).
- Quando necessario, comprimi nuovamente l'intera directory del progetto prima del caricamento oppure automatizza la sincronizzazione con Drive eseguendo lo script `scripts/driveSync.gs` da Apps Script sulla cartella dedicata.
- Per istruzioni dettagliate su configurazione, test e trigger automatici consulta la guida [`docs/drive-sync.md`](docs/drive-sync.md).

## Checklist & TODO attivi
- **Monitoraggio avanzamento** — Le milestone operative con stato aggiornato sono in [`docs/checklist/milestones.md`](docs/checklist/milestones.md). Le voci ancora aperte includono la validazione delle formule telemetriche con dati reali e la produzione di encounter di esempio per ogni bioma.【F:docs/checklist/milestones.md†L8-L16】
- **Azioni prioritarie consolidate** — Il file [`docs/checklist/action-items.md`](docs/checklist/action-items.md) raccoglie gli step immediati da completare, incrociando roadmap, checklist e problemi emersi dai log di sincronizzazione.【F:docs/checklist/action-items.md†L1-L30】
- **Checklist di avvio completo** — Usa [`docs/checklist/project-setup-todo.md`](docs/checklist/project-setup-todo.md) come sequenza passo-passo per configurare ambiente, dipendenze, test e sincronizzazioni fino al pieno funzionamento del progetto.【F:docs/checklist/project-setup-todo.md†L1-L64】
- **Roadmap dettagliata** — Per il contesto strategico delle milestone (bilanciamento pacchetti PI, telemetria VC, esperienze di mating/nido e missioni verticali) consultare [`docs/piani/roadmap.md`](docs/piani/roadmap.md).【F:docs/piani/roadmap.md†L1-L24】

## Sincronizzazione contenuti ChatGPT
- Configura le fonti da monitorare in `data/chatgpt_sources.yaml` (URL del progetto, canvas esportati, ecc.).
- Installa le dipendenze Python richieste (`pip install -r tools/py/requirements.txt`) prima di eseguire lo script: il file include `requests`, `PyYAML` e il client `openai` necessario per l'accesso API.
- Se incontri errori `ProxyError 403`, aggiorna le credenziali o esegui la sincronizzazione da una rete autorizzata: i dettagli dell'ultimo tentativo sono riportati in [`docs/chatgpt_sync_status.md`](docs/chatgpt_sync_status.md).【F:docs/chatgpt_sync_status.md†L1-L24】
- Esegui `python3 scripts/chatgpt_sync.py --config data/chatgpt_sources.yaml` per scaricare gli snapshot giornalieri.
- Controlla i diff generati in `docs/chatgpt_changes/<namespace>/<data>/` e il log in `logs/chatgpt_sync.log`.
- Aggiorna `docs/chatgpt_sync_status.md` con note operative e credenziali aggiornate.

## Suite di test automatizzati
- **Python** — la suite copre gli helper RNG deterministici e può essere eseguita da root con:
  ```bash
  PYTHONPATH=tools/py pytest
  ```
  Le dipendenze di test (`pytest`) sono incluse nello stesso `requirements.txt`.
- **TypeScript** — compila le sorgenti ESM e lancia gli unit test Node:
  ```bash
  cd tools/ts
  npm test
  ```

## Licenza
MIT — vedi `LICENSE`.
