# Evo-Tactics — Starter Monorepo

Starter repository per il progetto tattico co-op con sistema d20 e progressione evolutiva modulare. Il pacchetto include dati YAML, CLI in Python/TypeScript, backend Idea Engine, webapp di test e pipeline di pubblicazione per condividere rapidamente build, report e materiali di presentazione.

## Indice
- [Panoramica](#panoramica)
- [Tour del repository](#tour-del-repository)
- [Setup rapido](#setup-rapido)
- [CLI & strumenti](#cli--strumenti)
- [Backend Idea Engine](#backend-idea-engine)
- [Dashboard web & showcase](#dashboard-web--showcase)
- [Dataset & Ecosystem Pack](#dataset--ecosystem-pack)
- [Storico aggiornamenti & archivio](#storico-aggiornamenti--archivio)
- [Stato operativo & tracker](#stato-operativo--tracker)
- [Documentazione & tracker](#documentazione--tracker)
- [Automazione & workflow](#automazione--workflow)
- [QA & test](#qa--test)
- [Integrazioni esterne](#integrazioni-esterne)
- [Distribuzione & condivisione](#distribuzione--condivisione)
- [Licenza](#licenza)

## Panoramica
- **Gioco**: tattico co-op con evoluzione a stadi, combinazioni MBTI/Enneagramma, biomi reattivi e mutazioni modulari.
- **Starter kit**: dati YAML verificati, strumenti CLI per validare/generare contenuti, workflow CI preconfigurati e materiale di presentazione condivisibile.
- **Obiettivo**: permettere bootstrap rapido di nuove istanze (locale o cloud) mantenendo consistenza tra dataset, orchestratore e deliverable di comunicazione.

## Tour del repository
```
evo-tactics/
├─ data/                      # Dataset YAML (specie, biomi, telemetria, derived report)
├─ packs/evo_tactics_pack/    # Ecosystem pack v1.7 con validator, report e catalogo HTML
├─ tools/py/                  # CLI Python unificata e helper condivisi
├─ tools/ts/                  # CLI TypeScript + test Node/Playwright
├─ server/                    # API Express + orchestratore Idea Engine
├─ services/generation/       # Builder specie, runtime validator, bridge orchestrazione
├─ webapp/                    # Dashboard Vue 3 + Vite con test Vitest
├─ docs/                      # Canvas progettuali, checklist, changelog, presentazioni
├─ scripts/                   # Utility (report incoming, sync Drive, builder taxonomy)
├─ tests/                     # Suite Node, pytest e E2E dedicate ai dataset e al backend
└─ public/                    # Asset condivisi (showcase, token cromatici)
```

## Setup rapido
1. **Clona il repository** e posizionati nella root.
2. **Dipendenze Node (root + tools/ts + webapp)**:
   ```bash
   npm install
   npm --prefix tools/ts install
   npm --prefix webapp install
   ```
3. **Dipendenze Python**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r tools/py/requirements.txt
   ```
4. (Facoltativo) Esporta variabili condivise per ambienti ottimizzati:
   ```bash
   export GAME_MODE=optimized
   export PYTHONPATH=tools/py
   ```

## CLI & strumenti
### Strumenti Python (`tools/py`)
- Entry point unificato:
  ```bash
  cd tools/py
  python3 game_cli.py roll-pack entp invoker --seed demo
  python3 game_cli.py generate-encounter savana --party-power 18 --seed demo
  python3 game_cli.py validate-datasets
  python3 game_cli.py validate-ecosystem-pack \
    --json-out ../../packs/evo_tactics_pack/out/validation/last_report.json \
    --html-out ../../packs/evo_tactics_pack/out/validation/last_report.html
  ```
- Wrapper legacy ancora disponibili (`roll_pack.py`, `generate_encounter.py`) reindirizzano al parser condiviso.

#### Quick start — Python
```bash
cd tools/py
# CLI unificata con seed riproducibile e path opzionali
python3 game_cli.py roll-pack entp invoker --seed demo
python3 game_cli.py generate-encounter savana --party-power 18 --seed demo
python3 game_cli.py validate-datasets
python3 game_cli.py validate-ecosystem-pack \
  --json-out ../../packs/evo_tactics_pack/out/validation/last_report.json \
  --html-out ../../packs/evo_tactics_pack/out/validation/last_report.html

# Wrapper legacy (reindirizzati al parser condiviso)
python3 roll_pack.py ENTP invoker
python3 generate_encounter.py savana
```

#### Tutorial rapido · CLI Evo Tactics
- Segui il [tutorial dedicato](docs/tutorials/cli-quickstart.md) per completare setup, validazione e roll demo.
- ![CLI quickstart](assets/tutorials/cli-quickstart.svg)
- Condividi anomalie o log significativi nel canale Slack `#feedback-enhancements`.

### Strumenti TypeScript (`tools/ts`)
- Build e roll pack demo:
  ```bash
  cd tools/ts
  npm install
  npm run build
  node dist/roll_pack.js ENTP invoker --seed demo
  ```
- Test Playwright e suite Web:
  ```bash
  npm test            # compila, lancia unit test Node e Playwright
  npm run test:web    # esegue solo i test Playwright
  npm run lighthouse:test-interface
  ```
- Script di supporto: `scripts/run_lighthouse.mjs`, `scripts/ensure_chromium.mjs`, `scripts/postbuild.mjs`.

#### Quick start — Node/TypeScript
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

## Backend Idea Engine
- **Avvio API**: `npm run start:api` espone l'app Express su `http://0.0.0.0:3333` (porta configurabile con `PORT`). Il database NeDB di default vive in `data/idea_engine.db` (sovrascrivibile con `IDEA_ENGINE_DB`).
- **Endpoint principali**:
  - `GET /api/health` – stato runtime.
  - `GET /api/ideas`, `POST /api/ideas`, `GET /api/ideas/:id`, `POST /api/ideas/:id/feedback` – gestione idee e feedback.
  - `POST /api/biomes/generate` – genera sintesi bioma via `createBiomeSynthesizer`.
  - `POST /api/validators/runtime` – esegue validator runtime sul payload fornito.
  - `POST /api/quality/suggestions/apply` – applica suggerimenti qualità sul dataset ricevuto.
  - `POST /api/generation/species` e `/api/generation/species/batch` – orchestrano la generazione specie integrando `SpeciesBuilder`, `TraitCatalog` e validator pack.
  - `GET /api/ideas/:id/report` – produce report Codex in HTML/JSON usando `server/report.js`.
- **Orchestrazione**: la pipeline combina normalizzazione slug, fallback automatici per trait non validi e log strutturati (vedi `services/generation/*`).

### Pipeline generazione orchestrata
- **Endpoint backend** – `POST /api/generation/species` instrada le richieste
  dell'UI verso l'orchestratore Python (`services/generation/orchestrator.py`),
  normalizzando gli input (`trait_ids`, `seed`, `biome_id`).
- **Orchestratore Python** – carica il `TraitCatalog`, costruisce il blueprint
  narrativo con `SpeciesBuilder` e invoca i validator runtime del pack
  (`packs/evo_tactics_pack/validators`) per correggere e certificare l'output.
- **Fallback automatico** – se i trait richiesti non sono validi oppure la
  validazione produce errori bloccanti, viene applicato un set di trait di
  sicurezza (`artigli_sette_vie`, `coda_frusta_cinetica`,
  `scheletro_idro_regolante`). Tutti gli eventi (successo, fallback, failure)
  vengono loggati in formato JSON strutturato (`component = generation-orchestrator`).
- **Risposta UI** – il payload JSON combina `blueprint` (story + mechanics),
  `validation` (messaggi e correzioni applicate) e `meta` (request id,
  fallback, numero di tentativi) così che Vue possa renderizzare
  immediatamente alert e summary coerenti.

### Tutorial rapido · Feedback Idea Engine
- Abilita il backend seguendo il [tutorial passo-passo](docs/tutorials/idea-engine-feedback.md).
- ![Idea Engine feedback](assets/tutorials/idea-engine-feedback.svg)
- Dopo ogni invio, annota follow-up o richieste extra in `#feedback-enhancements` (modulo Slack ora attivo di default).

## Dashboard web & showcase
- **Dashboard test interface** (`docs/test-interface/`): carica YAML da `data/`, consente smoke test dei dataset e fetch manuali. Avvia un server statico locale con `python3 -m http.server 8000` e visita `http://localhost:8000/docs/test-interface/`.
- **Deploy continuo**: il workflow GitHub Actions `deploy-test-interface` pubblica la dashboard su GitHub Pages. Imposta una sola volta Pages (`Settings → Pages → GitHub Actions`).
- **Showcase pubblico**:
  - `docs/presentations/showcase/evo-tactics-showcase-dossier.html`
  - `docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64` (decodifica con `python -m base64 -d ...`)
  - Rigenera asset con `python tools/py/build_showcase_materials.py`, che aggiorna HTML, Base64 del PDF e cover SVG in `public/showcase-dossier.svg`.

### Showcase demo · preset "Bundle demo pubblico"
![Anteprima dossier showcase](public/showcase-dossier.svg)

- **Tutorial rapido · Dashboard & Showcase** — [Guida sintetica](docs/tutorials/dashboard-tour.md) per avviare Vite e raccogliere materiale.
  ![Dashboard tour](assets/tutorials/dashboard-tour.svg)
  Condividi sempre risultati e note in `#feedback-enhancements` specificando seed, branch e dataset.

- **Dossier HTML** — [`docs/presentations/showcase/evo-tactics-showcase-dossier.html`](docs/presentations/showcase/evo-tactics-showcase-dossier.html) riutilizza il template export del generatore mantenendo i token cromatici (`--color-accent-400`, palette `public/`).
- **Press kit PDF** — [`docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64`](docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64) conserva l'export in formato Base64; decodificalo con `python -m base64 -d docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64 > docs/presentations/showcase/dist/evo-tactics-showcase-dossier.pdf` (o con `base64 --decode`) per ottenere il PDF pronto alla distribuzione.
- **Rigenerazione rapida** — esegui `python tools/py/build_showcase_materials.py` per aggiornare HTML, Base64 del PDF e cover `SVG` in `public/` partendo dal payload curato (`docs/presentations/showcase/showcase_dossier.yaml`).

## Dataset & Ecosystem Pack
- **Dataset principali** in `data/` (specie, biomi, telemetria, trait) e `data/derived/analysis/trait_coverage_report.json` per insight sulla copertura trait/specie.
- **Pack v1.7** (`packs/evo_tactics_pack/`): struttura autosufficiente con `data/`, `docs/`, `tools/` e report in `out/validation/`. Segui il README del pack per approfondimenti.
- **Aggiornare il pack**:
  1. Modifica YAML in `packs/evo_tactics_pack/data/`.
  2. Rigenera la validazione:
     ```bash
     python3 tools/py/game_cli.py validate-datasets
     python3 tools/py/game_cli.py validate-ecosystem-pack \
       --json-out packs/evo_tactics_pack/out/validation/last_report.json \
       --html-out packs/evo_tactics_pack/out/validation/last_report.html
     ```
  3. Controlla i log in `reports/incoming/` e `logs/traits_tracking.md`.
- **Copertura trait/specie**: report aggiornati e quicklook disponibili in `docs/catalog/species_trait_matrix.json` e `docs/catalog/species_trait_quicklook.csv`.

## Storico aggiornamenti & archivio
- **Release 2025-12-02 — Feedback & Tutorial boost** — integrazione changelog nel README, attivazione del modulo feedback con Slack `#feedback-enhancements` e nuovi tutorial multimediali. Dettagli completi in [`docs/changelog.md`](docs/changelog.md#2025-12-02).
- **Suite Badlands riallineata (2025-11-16)** — i YAML aggiornati in `packs/evo_tactics_pack/data/species/badlands/` sono stati verificati con `python tools/py/report_trait_coverage.py` riportando `traits_with_species = 27/29` e nessuna regola senza specie (`rules_missing_species_total = 0`). Consulta `data/analysis/trait_coverage_report.json`, `docs/catalog/species_trait_matrix.json` e `docs/catalog/species_trait_quicklook.csv` per il dettaglio e i pairing core/opzionali.
- **Checklist rollout trait** — il log operativo [`logs/traits_tracking.md`](logs/traits_tracking.md) conserva le note di QA e i gate da rieseguire prima dei prossimi playtest; usa la sezione commenti per nuovi feedback rapidi e aggiorna la casella QA Lead entro le scadenze indicate.
- **Idea Engine — modulo feedback sempre attivo** — il widget embed (`docs/public/embed.js`) ora propone il modulo feedback anche offline, reindirizzando al canale `#feedback-enhancements` quando l'API non è configurata. Per la cronologia dettagliata consulta [`docs/ideas/changelog.md`](docs/ideas/changelog.md).

## Stato operativo & tracker
- **Indice tracker & stato**: usa `docs/00-INDEX.md` per checklist quotidiane, log e roadmap; la sezione viene aggiornata automaticamente da [`scripts/daily_tracker_refresh.py`](scripts/daily_tracker_refresh.py) tramite il workflow [`daily-tracker-refresh`](.github/workflows/daily-tracker-refresh.yml).
- **Log di riferimento**: `logs/traits_tracking.md`, `logs/web_status.md` e i report in `reports/incoming/` documentano l'avanzamento tecnico delle ultime sessioni.

### Recap operativo & prossimi step
- [ ] Rivedi i log in `reports/incoming/validation/` e apri ticket per eventuali regressioni.
- [ ] Aggiorna i tracker operativi in [`docs/00-INDEX.md`](docs/00-INDEX.md#tracker-operativi-e-log) dopo ogni sessione.
- [ ] Riesegui `./scripts/report_incoming.sh --destination sessione-YYYY-MM-DD` al termine di ogni batch di upload.
- [ ] Condividi su Drive i materiali rigenerati (`docs/presentations/showcase/*`) una volta verificati.

### Barra di completamento
<progress value="0.7" max="1"></progress> **70 %** completato — aggiornare dopo il prossimo ciclo di validazione.

## Documentazione & tracker
- **Indice operativo**: `docs/00-INDEX.md` aggrega checklist quotidiane, log e roadmap.
- **Checklist**: consultare `docs/checklist/action-items.md`, `docs/checklist/milestones.md`, `docs/checklist/project-setup-todo.md` per stato avanzamento e task prioritari.
- **Roadmap**: `docs/piani/roadmap.md` con milestone strategiche (telemetria VC, pacchetti PI, mating/nido).
- **Idea Engine**: changelog e procedure in `docs/ideas/changelog.md`, `docs/ideas/index.html` e `IDEAS_INDEX.md`.
- **Log tematici**: `logs/traits_tracking.md`, `logs/web_status.md`, `logs/chatgpt_sync.log` per audit tecnici.
- **Tri-Sorgente (Roll + Personalità + Azioni)** — docs introduttive: [/docs/tri-sorgente/overview.md](docs/tri-sorgente/overview.md) • QA/KPI: [/docs/tri-sorgente/qa.md](docs/tri-sorgente/qa.md)

## Automazione & workflow
- **Script principali**:
  - `scripts/report_incoming.sh` – archivia i batch in `reports/incoming/` (usare `--destination sessione-YYYY-MM-DD`).
  - `scripts/daily_tracker_refresh.py` – aggiorna automaticamente le sezioni tracker del README e dei log.
  - `scripts/build-idea-taxonomy.js` e `tools/drive/*.mjs` – generano/trasferiscono asset approvati verso Drive.
- **Workflow CI** (`.github/workflows/`):
  - `ci.yml` – esegue lint/test Python & TypeScript e validator pack ad ogni push/PR.
  - `deploy-test-interface.yml` – build & deploy GitHub Pages.
  - `daily-tracker-refresh.yml` – schedulato a mezzogiorno per aggiornare tracker.
  - Workflow dedicati (`validate-naming`, `incoming-smoke`, `hud`, `qa-kpi-monitor`) documentati in `docs/ci.md` e `docs/ci-pipeline.md`.

## QA & test
- **Python**: esegui dalla root con `PYTHONPATH=tools/py pytest` (copre RNG deterministici, builder, validator).
- **TypeScript**: `npm --prefix tools/ts test` (include unit test Node e Playwright UI export modal).
- **API Node**: `npm run test:api` lancia `node --test tests/api/*.test.js`.
- **Webapp**: `npm --prefix webapp test` esegue la suite Vitest/JSDOM.
- **HUD & dashboard**: test Playwright dedicati (`tools/ts/tests`, `tests/hud_alerts.spec.ts`) e `tests/validate_dashboard.py` per smoke test.

## Integrazioni esterne
- **Drive**: guida in `docs/drive-sync.md`; script `scripts/driveSync.gs`, `tools/drive/*.mjs` per sincronizzazioni e stage publishing (`npm run stage:publishing`).
- **Sincronizzazione ChatGPT**:
  - Configura le fonti in `data/external/chatgpt_sources.yaml`.
  - Esegui `python3 scripts/chatgpt_sync.py --config data/external/chatgpt_sources.yaml`.
  - Verifica gli snapshot in `docs/chatgpt_changes/<namespace>/` e aggiorna `docs/chatgpt_sync_status.md` con esiti.

## Distribuzione & condivisione
### Pubblicazione GitHub
```bash
cd /path/alla/cartella/evo-tactics
git init
git add .
git commit -m "chore: bootstrap repo starter"
git branch -M main
git remote add origin https://github.com/<tuo-utente>/<repo>.git
git push -u origin main
```

### Condivisione su Google Drive
- Comprimi la cartella del progetto o utilizza lo script `scripts/driveSync.gs` per automatizzare l'upload.
- Per invii manuali, mantieni sincronizzati gli artifact rigenerati (`docs/presentations/showcase/*`, report in `packs/.../out/`).
- Consulta `docs/drive-sync.md` per setup credenziali, test e trigger automatici.

## Licenza
MIT — vedi [`LICENSE`](LICENSE).
