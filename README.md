# Evo-Tactics — Progetto Gioco Evolutivo Tattico (Repo Starter)

Repository avviabile per il progetto: tattico co-op su TV/app con sistema d20, evoluzione alla *Spore*, Forme MBTI→16, Enneagram Themes, telemetria VC, tratti/mutazioni, pacchetti PI, NPG reattivi per bioma, Mating/Nido.

> Questo è uno **starter** pronto all’uso: dati YAML, script CLI (TS/Python), e struttura CI. È progettato per essere caricato su **GitHub** e condiviso su **Google Drive**.

## Showcase demo · preset "Bundle demo pubblico"

![Anteprima dossier showcase](public/showcase-dossier.svg)

- **Dossier HTML** — [`docs/presentations/showcase/evo-tactics-showcase-dossier.html`](docs/presentations/showcase/evo-tactics-showcase-dossier.html) riutilizza il template export del generatore mantenendo i token cromatici (`--color-accent-400`, palette `public/`).
- **Press kit PDF** — [`docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64`](docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64) conserva l'export in formato Base64; decodificalo con `python -m base64 -d docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64 > docs/presentations/showcase/dist/evo-tactics-showcase-dossier.pdf` (o con `base64 --decode`) per ottenere il PDF pronto alla distribuzione.
- **Rigenerazione rapida** — esegui `python tools/py/build_showcase_materials.py` per aggiornare HTML, Base64 del PDF e cover `SVG` in `public/` partendo dal payload curato (`docs/presentations/showcase/showcase_dossier.yaml`).

## Struttura
```
evo-tactics/
├─ docs/                 # Note progettuali (Canvas, roadmap, checklist)
├─ data/                 # Dataset YAML (telemetria, pack PI, biomi, mutazioni, ecc.)
├─ packs/
│  └─ evo_tactics_pack/  # Pacchetto ecosistemi/specie v1.7 con catalogo HTML e validator dedicati
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
python3 game_cli.py validate-ecosystem-pack \
  --json-out ../../packs/evo_tactics_pack/out/validation/last_report.json \
  --html-out ../../packs/evo_tactics_pack/out/validation/last_report.html

# Wrapper legacy (reindirizzati al parser condiviso)
python3 roll_pack.py ENTP invoker
python3 generate_encounter.py savana
```

> Suggerimento: lo script unificato `game_cli.py` espone sottocomandi coerenti
> (`roll-pack`, `generate-encounter`, `validate-datasets`) e gestisce anche i
> seed deterministici condivisi (`--seed`), così da allineare Python e
> TypeScript sugli stessi dati YAML.

## Come aggiornare l'ecosystem pack
1. **Modifica i dataset** in `packs/evo_tactics_pack/data/` (biomi, ecosistemi, foodweb, specie) mantenendo i percorsi repo-relativi.
2. **Rigenera i report** eseguendo dalla radice del progetto:
   ```bash
   python3 tools/py/game_cli.py validate-datasets
   ```
   Il comando esegue i controlli storici su `data/` **e** tutti i validator del pack, emettendo un riepilogo degli avvisi per facilitarne il review.
3. **Ispeziona il dettaglio** con il comando dedicato, utile se desideri solo il pack o devi salvare i report HTML/JSON rigenerati:
   ```bash
   python3 tools/py/game_cli.py validate-ecosystem-pack \
     --json-out packs/evo_tactics_pack/out/validation/last_report.json \
     --html-out packs/evo_tactics_pack/out/validation/last_report.html
   ```
4. **Verifica la CI**: il workflow `.github/workflows/ci.yml` esegue entrambi i comandi ad ogni push/PR, quindi qualsiasi regressione sui dataset del pack verrà segnalata automaticamente.

## Aggiornamenti Trait ↔ Specie
- **Copertura aggiornata** — Dopo la riallineatura dei dataset `packs/evo_tactics_pack/data/species/**` la matrice `python tools/py/report_trait_coverage.py` riporta `traits_with_species = 27/29` e nessuna combinazione regola↔specie mancante (`rules_missing_species_total = 0`). Consulta il report JSON rigenerato in [`data/analysis/trait_coverage_report.json`](data/analysis/trait_coverage_report.json) e il CSV corrispondente per i dettagli per tratto.
- **Specie prioritarie per bioma** — La tabella di appoggio [`docs/catalog/species_trait_quicklook.csv`](docs/catalog/species_trait_quicklook.csv) elenca gli accoppiamenti `core/optional_traits` estratti da `docs/catalog/species_trait_matrix.json` per i biomi prioritari (Badlands/dorsale termale tropicale, Foresta miceliale, Cryosteppe). Utilizzala come riferimento rapido durante le sessioni di bilanciamento.
- **Verifica sul campo** — Le specie campione `dune-stalker` (badlands), `lupus-temperatus` (foresta miceliale) e `aurora-gull` (cryosteppe) sono state validate manualmente nei rispettivi ambienti con smoke test rapidi (documentati in [`logs/traits_tracking.md`](logs/traits_tracking.md)) per confermare l'aderenza dei nuovi trait al ruolo tattico previsto.

## Novità trait & specie — 2025-11-16
- **Suite Badlands riallineata** — Le specie Badlands (inclusi `dune-stalker`, `echo-wing`, `ferrocolonia-magnetotattica`, `magneto-ridge-hunter`, `nano-rust-bloom`, `rust-scavenger`, `sand-burrower`, `slag-veil-ambusher` ed evento `tempesta ferrosa`) usano ora blocchi `genetic_traits` coerenti con la matrice aggiornata e il reference genetico. Consulta i dettagli nei file YAML del pack (`packs/evo_tactics_pack/data/species/badlands/*.yaml`) e nella matrice centralizzata [`docs/catalog/species_trait_matrix.json`](docs/catalog/species_trait_matrix.json).
- **Quicklook e copertura foodweb** — Il CSV rapido [`docs/catalog/species_trait_quicklook.csv`](docs/catalog/species_trait_quicklook.csv) riporta i nuovi pairing core/opzionali per il bioma dorsale termale tropicale, mentre il report rigenerato [`data/analysis/trait_coverage_report.json`](data/analysis/trait_coverage_report.json) conferma `traits_with_species = 27/29`, `rules_missing_species_total = 0` e i conteggi `foodweb_coverage` per i ruoli monitorati.
- **Checklist di rollout** — Il log operativo [`logs/traits_tracking.md`](logs/traits_tracking.md) documenta il comando eseguito e i gate QA da mantenere nei prossimi batch (incluso l'invito a rieseguire il generatore prima del prossimo checkpoint playtest).

### Feedback rapido (revisione entro 2025-11-23)
- **Canale espresso** — Aggiungi qui eventuali anomalie sulle nuove combinazioni trait/specie. Per analisi lunghe apri un ticket con label `trait-feedback` e linka il report di coverage.
- [ ] QA Lead — verificare entro **2025-11-23** gli output del generatore e aggiornare `logs/traits_tracking.md` con eventuali correzioni o regressioni.
- Commenti raccolti:
  - _Placeholder_: sostituisci con note operative o link a PR/issue.

## Interfaccia test & recap via web
- [Apri la dashboard](docs/test-interface/index.html) per consultare rapidamente pacchetti PI,
  telemetria VC, biomi e compatibilità delle forme (funziona sia in locale sia online).
- **Online automatico (GitHub Pages)**: il workflow [`deploy-test-interface`](.github/workflows/deploy-test-interface.yml)
  pubblica in modo continuativo i contenuti della dashboard e i dataset YAML ad ogni push su `main`.
  Dopo aver abilitato *una sola volta* GitHub Pages (`Settings → Pages → Build and deployment → GitHub Actions`),
  il sito sarà sempre raggiungibile da `https://<tuo-utente>.github.io/<repo>/test-interface/` (o dal dominio
  personalizzato) con fetch automatico degli YAML direttamente dal branch indicato. Prima del deploy il workflow
  lancia le suite di test TypeScript (`npm test` in `tools/ts`) e Python (`PYTHONPATH=tools/py pytest`) per garantire
  che la dashboard rifletta dati validi e CLI funzionanti.
- **Uso locale**: avvia un server dalla radice (`python3 -m http.server 8000`) e visita
  `http://localhost:8000/docs/test-interface/` per lavorare offline.
- Premi "Ricarica dati YAML" dopo aver modificato i file in `data/`, quindi "Esegui test" per i
  controlli rapidi di integrità sui dataset caricati.
- Per aggiornamenti al volo, incolla l'URL di uno snapshot YAML/JSON nel form "Fetching manuale" e
  premi "Scarica & applica" per un merge immediato nel dataset di sessione. In hosting remoto puoi
  forzare sorgenti alternative con `?data-root=<url-assoluto-o-root-relative>` e cambiare branch `raw`
  con `?ref=<branch>`.

## Pacchetto ecosistemi (Evo-Tactics Pack v1.7)
- Contenuto in `packs/evo_tactics_pack/` con struttura autosufficiente (`data/`, `docs/`, `tools/`, `out/`).
- Catalogo HTML pronto (`packs/evo_tactics_pack/docs/catalog/index.html`) e tool client-side (`.../docs/tools/generator.html`).
- Validator Python dedicati richiamabili con i percorsi già aggiornati nel `README` del pack (`packs/evo_tactics_pack/README.md`).
- Dataset YAML puntano ora a percorsi relativi al repository, così da funzionare sia in locale sia in CI senza rewrite manuali.

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
