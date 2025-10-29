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

## Checklist & log di riferimento

- **Operativo** — checklist quotidiane e setup in [`docs/00-INDEX.md`](docs/00-INDEX.md#tracker-operativi-e-log).
- **Processo** — procedure QA, pipeline telemetria e handoff web raccolti nello stesso indice.
- **Log & Metriche** — cronologia sync, audit export, metriche dashboard e verifiche tooling documentate nella tabella dedicata.
- **Pianificazione & Appendici** — roadmap e canvas completi con ultima revisione tracciata nell'indice.

Consulta la sezione [Indice Tracker & Stato](#indice-tracker--stato) per percentuali e stato sintetico dei principali blocchi di lavoro.

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

## Pipeline generazione orchestrata

- **Endpoint backend** — `POST /api/generation/species` instrada le richieste
  dell'UI verso l'orchestratore Python (`services/generation/orchestrator.py`),
  normalizzando gli input (`trait_ids`, `seed`, `biome_id`).
- **Orchestratore Python** — carica il `TraitCatalog`, costruisce il blueprint
  narrativo con `SpeciesBuilder` e invoca i validator runtime del pack
  (`packs/evo_tactics_pack/validators`) per correggere e certificare l'output.
- **Fallback automatico** — se i trait richiesti non sono validi oppure la
  validazione produce errori bloccanti, viene applicato un set di trait di
  sicurezza (`artigli_sette_vie`, `coda_frusta_cinetica`,
  `scheletro_idro_regolante`). Tutti gli eventi (successo, fallback, failure)
  vengono loggati in formato JSON strutturato (`component` =
  `generation-orchestrator`).
- **Risposta UI** — il payload JSON combina `blueprint` (story + mechanics),
  `validation` (messaggi e correzioni applicate) e `meta` (request id,
  fallback, numero di tentativi) così che Vue possa renderizzare
  immediatamente alert e summary coerenti.

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

## Idea Engine Updates & Feedback

### Novità rapide — 2025-12-01
- **CTA unificata per il feedback** — Il report Codex ora si chiude con un richiamo diretto al modulo immediato per raccogliere
  le impressioni a caldo su widget e backend.
- **Changelog dedicato** — Le note di rilascio vivono nel nuovo file [`docs/ideas/changelog.md`](docs/ideas/changelog.md) così
  da poter allegare rapidamente gli highlight di ogni sprint.

### Changelog
- Consulta [`docs/ideas/changelog.md`](docs/ideas/changelog.md) per la cronologia completa.
- **2025-10-29** — Il widget `docs/public/embed.js` mostra un modulo "Feedback" dopo l'invio delle idee e il backend accetta
  `POST /api/ideas/:id/feedback` per archiviare i commenti accanto alla proposta, includendoli nel report Codex.

### Procedura feedback
1. **Segnala subito** — Compila il [modulo feedback immediato](https://forms.gle/evoTacticsIdeaFeedback) per registrare l'esito
   dei test su widget/back-end entro poche ore dal rilascio.
2. **Approfondisci nel widget** — Usa il campo feedback integrato dopo l'invio dell'idea per allegare note contestuali che
   finiranno nel report Codex.
3. **Formalizza se serve** — Duplica [`docs/ideas/feedback.md`](docs/ideas/feedback.md) o apri un ticket con label
   `idea-engine-feedback` quando servono follow-up estesi.

### Link rapidi
- [Modulo feedback immediato](https://forms.gle/evoTacticsIdeaFeedback)
- [Changelog Idea Engine](docs/ideas/changelog.md)
- [Indice idee generato dalla CI](IDEAS_INDEX.md)
- [Support Hub Idea Engine](docs/ideas/index.html)

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
- **Monitoraggio avanzamento** — Le milestone operative con stato aggiornato sono in [`docs/checklist/milestones.md`](docs/checklist/milestones.md). Restano da chiudere l'overlay HUD telemetrico, il riequilibrio XP del profilo Cipher e il contrasto EVT-03 documentati nella sezione “In corso”.【F:docs/checklist/milestones.md†L8-L17】
- **Azioni prioritarie consolidate** — Il file [`docs/checklist/action-items.md`](docs/checklist/action-items.md) raccoglie gli step immediati da completare, incrociando roadmap, checklist e problemi emersi dai log di sincronizzazione.【F:docs/checklist/action-items.md†L1-L30】
- **Checklist di avvio completo** — Usa [`docs/checklist/project-setup-todo.md`](docs/checklist/project-setup-todo.md) come sequenza passo-passo per configurare ambiente, dipendenze, test e sincronizzazioni fino al pieno funzionamento del progetto.【F:docs/checklist/project-setup-todo.md†L1-L64】
- **Roadmap dettagliata** — Per il contesto strategico delle milestone (bilanciamento pacchetti PI, telemetria VC, esperienze di mating/nido e missioni verticali) consultare [`docs/piani/roadmap.md`](docs/piani/roadmap.md).【F:docs/piani/roadmap.md†L1-L24】

### Indice Tracker & Stato

#### Operativo
- **████████░░ 80% · Telemetria VC** — Le milestone operative hanno completato playtest, normalizzazione e documentazione; restano l'overlay HUD telemetrico, il ribilanciamento XP Cipher e il contrasto EVT-03. Vedi [`docs/checklist/milestones.md#in-corso`](docs/checklist/milestones.md#in-corso).【F:docs/checklist/milestones.md†L8-L17】

#### Processo
- **██████░░░░ 60% · Pipeline deploy web** — Il processo di rilascio è definito ma i riesami settimanali riportano ancora il blocco Playwright 403 e test manuali da pianificare prima di considerarlo stabile. Vedi [`docs/process/web_pipeline.md`](docs/process/web_pipeline.md) e il registro [`logs/web_status.md`](logs/web_status.md).【F:docs/process/web_pipeline.md†L1-L64】【F:logs/web_status.md†L15-L50】

#### Log & metriche
- **███████░░░ 70% · Inventario trait** — La copertura tratti/specie è stata riallineata (`traits_with_species = 27/29`), ma restano da integrare i trait delle appendici e ulteriori dataset mock. Consulta [`logs/traits_tracking.md`](logs/traits_tracking.md).【F:logs/traits_tracking.md†L1-L37】

#### Appendici
- **█████░░░░░ 50% · Canvas e integrazioni** — Gli appendici A/C/D restano l'ultima revisione ufficiale mentre il Canvas segnala follow-up aperti su overlay HUD, patch PROG-04 ed effetti EVT-03 prima del prossimo aggiornamento. Riferimento: [`docs/00-INDEX.md#appendici-di-stato`](docs/00-INDEX.md#appendici-di-stato) e [`docs/Canvas/feature-updates.md`](docs/Canvas/feature-updates.md).【F:docs/00-INDEX.md†L23-L29】【F:docs/Canvas/feature-updates.md†L23-L27】

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
