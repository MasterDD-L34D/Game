# Raccolta automatica log CI

Questo documento centralizza i comandi per scaricare i log/artefatti dei workflow GitHub Actions e fornisce un entrypoint unico da console (`scripts/ci_log_harvest.sh` o `make ci-log-harvest`). Usalo insieme a `docs/planning/ci-inventory.md` per aggiornare semaforo e azioni aperte.

## Prerequisiti

- GitHub CLI (`gh`) installato e autenticato con un PAT che abbia scope `workflow`, `read:org` **e** permessi repo/admin, autorizzato via SSO. Salvalo come secret `CI_LOG_PAT` (preferito) o `LOG_HARVEST_PAT` e rendilo disponibile come `GH_TOKEN`/`GITHUB_TOKEN` per l’automazione.
- Accesso di rete a GitHub Actions.
- Permessi di scrittura locali nelle cartelle di destinazione (`logs/ci_runs`, `logs/visual_runs`, `logs/incoming_smoke`).

### Setup rapido PAT + `gh`

1. Esporta il PAT nella macchina dove gira `gh` con una di queste variabili: `GH_TOKEN`, `CI_LOG_PAT` oppure `LOG_HARVEST_PAT` (compatibili con lo scheduler e con il workflow `log-harvester.yml`).
2. Autentica GitHub CLI con il token già esportato: `gh auth login --with-token < "$GH_TOKEN"` (oppure `CI_LOG_PAT`/`LOG_HARVEST_PAT` se usati).
3. Verifica lo stato: `gh auth status` deve indicare l’account e l’host configurati.
4. Se usi un runner/scheduler, configura il segreto sul job (`log-harvester.yml`) con gli scope `workflow`, `read:org` e permessi repo/admin per sbloccare il download degli artifact e dei log zippati.

### Checklist runner (`log-harvester.yml`)

- Aggiungi il segreto `CI_LOG_PAT` (o `LOG_HARVEST_PAT`) ai secret del repository/organizzazione con scope `workflow`, `read:org` e permessi repo/admin.
- Espone il segreto come `GH_TOKEN` nel job e autentica `gh` prima dei download:

  ```yaml
  env:
    GH_TOKEN: ${{ secrets.CI_LOG_PAT }}
  steps:
    - name: Auth gh
      run: |
        gh auth login --with-token < "$GH_TOKEN"
        gh auth status
  ```

- Esegui `make ci-log-harvest` (o `scripts/ci_log_harvest.sh ...`) dopo l’autenticazione: il token sbloccato permette di scaricare log HTML + zip e gli artifact dei workflow.

### Esempio GitHub Actions (`log-harvester.yml`)

```yaml
jobs:
  log-harvester:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ secrets.CI_LOG_PAT }}
      CI_LOG_CONFIG_FILE: ops/ci-log-config.txt
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Auth gh
        run: |
          gh auth login --with-token < "$GH_TOKEN"
          gh auth status

      - name: Inspect harvest config
        run: |
          set -eo pipefail
          if [ -f "$CI_LOG_CONFIG_FILE" ]; then
            cat "$CI_LOG_CONFIG_FILE"
          else
            echo "::warning::Config non trovata, userò la lista interna dello script"
          fi

      - name: Scarica log/artifact
        env:
          CI_LOG_HARVEST_CONFIG: ${{ env.CI_LOG_CONFIG_FILE }}
        run: |
          chmod +x scripts/ci_log_harvest.sh
          scripts/ci_log_harvest.sh
```

Annotazioni:

- `CI_LOG_PAT` deve essere presente tra i secret del repo/organizzazione con gli scope richiesti.
- Il token viene esposto come `GH_TOKEN` per compatibilità con lo script (`scripts/ci_log_harvest.sh`).
- Il workflow vero (`.github/workflows/log-harvester.yml`) autentica `gh`, mostra il config attivo (`ops/ci-log-config.txt` per
  default) e lancia lo script con quel file; se il config manca, lo script usa l’array interno ma continua a scaricare l’ultimo
  run disponibile.
- Se preferisci schedulare l’harvest, aggiungi un trigger `schedule` o `workflow_dispatch` al workflow.

### Installazione rapida

```bash
# macOS (Homebrew)
brew install gh

# Debian/Ubuntu
sudo apt update && sudo apt install gh
```

Autenticati con un PAT che includa gli scope `workflow` e `read:org` più permessi repo/admin, autorizzato via SSO dove richiesto; consulta `docs/workflows/gh-cli-manual-dispatch.md` per i passaggi.

## Workflow coperti e destinazioni standard

| Workflow                                      | Trigger principale  | Modalità                   | Destinazione download                 | Note/Inputs                                                  |
| --------------------------------------------- | ------------------- | -------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `.github/workflows/ci.yml`                    | push/PR             | automatico                 | `logs/ci_runs/`                       | Nessun `workflow_dispatch`; usare ultimo push/PR.            |
| `.github/workflows/e2e.yml`                   | schedulato/dispatch | automatico                 | `logs/ci_runs/`                       | Report Playwright (`logs/ci_runs/e2e_*`).                    |
| `.github/workflows/deploy-test-interface.yml` | push/PR/dispatch    | automatico                 | `logs/ci_runs/`                       | Necessario per gate go-live.                                 |
| `.github/workflows/daily-pr-summary.yml`      | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Auto-commit quotidiano.                                      |
| `.github/workflows/daily-tracker-refresh.yml` | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Export JSON tracker.                                         |
| `.github/workflows/data-quality.yml`          | push/PR/dispatch    | automatico                 | `logs/ci_runs/`                       | Validazioni trait/dataset.                                   |
| `.github/workflows/lighthouse.yml`            | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Artefatto `.lighthouseci`.                                   |
| `.github/workflows/search-index.yml`          | push/dispatch       | automatico                 | `logs/ci_runs/`                       | Aggiorna `public/search_index.json`.                         |
| `.github/workflows/telemetry-export.yml`      | push/PR             | automatico                 | `logs/ci_runs/`                       | Validazioni export.                                          |
| `.github/workflows/idea-intake-index.yml`     | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Genera indice idee e auto-commit.                            |
| `.github/workflows/schema-validate.yml`       | push/PR/dispatch    | automatico                 | `logs/ci_runs/`                       | Validazione schemi JSON.                                     |
| `.github/workflows/validate-naming.yml`       | push/PR/dispatch    | automatico                 | `logs/ci_runs/`                       | Coerenza nomi registri.                                      |
| `.github/workflows/validate_traits.yml`       | push/PR/dispatch    | automatico                 | `logs/ci_runs/`                       | Validazione catalogo trait.                                  |
| `.github/workflows/update-evo-tracker.yml`    | dispatch/riuso      | automatico                 | `logs/ci_runs/`                       | Check tracker.                                               |
| `.github/workflows/traits-sync.yml`           | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Sync glossario/valutazioni.                                  |
| `.github/workflows/evo-doc-backfill.yml`      | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Diff/backfill documentazione Evo.                            |
| `.github/workflows/evo-rollout-status.yml`    | cron/dispatch       | automatico                 | `logs/ci_runs/`                       | Snapshot rollout settimanale.                                |
| `.github/workflows/qa-kpi-monitor.yml`        | cron/dispatch       | manuale                    | `logs/ci_runs/` + `logs/visual_runs/` | Include `visual_regression`; servono artefatti KPI + visual. |
| `.github/workflows/qa-export.yml`             | dispatch            | manuale                    | `logs/ci_runs/`                       | Input PR opzionali.                                          |
| `.github/workflows/qa-reports.yml`            | dispatch            | manuale                    | `logs/ci_runs/`                       | Badge/baseline QA.                                           |
| `.github/workflows/hud.yml`                   | push/dispatch       | manuale (skip se flag off) | `logs/ci_runs/` + `logs/visual_runs/` | Dispatch se HUD abilitato.                                   |
| `.github/workflows/incoming-smoke.yml`        | dispatch con input  | manuale                    | `logs/incoming_smoke/`                | Richiede `-f path=<dataset> -f pack=<pack>`.                 |
| `.github/workflows/evo-batch.yml`             | dispatch con input  | manuale                    | `logs/ci_runs/`                       | Dry-run consigliato: `-f batch=traits -f execute=false`.     |

Per workflow non elencati qui puoi aggiungere voci nel file di config personalizzato o nell’array interno dello script.

La lista canonica usata sia dallo script sia dal workflow `log-harvester.yml` è salvata in `ops/ci-log-config.txt`: aggiorna quella per mantenere allineata la copertura.

## Script `scripts/ci_log_harvest.sh`

- Legge la lista dei workflow da un array predefinito o da un file di configurazione (pipe-separated):
  - Di default usa `ops/ci-log-config.txt` (override con `CI_LOG_HARVEST_CONFIG` o `--config`); se il file manca, cade sull’array interno.
  - Formato: `workflow_file|destinazione|modalità|dispatch_inputs`
  - Modalità: `auto` (solo download) oppure `manual` (skip di default, dispatch se `DISPATCH_MANUAL=1`).
- Se `gh` non è presente nel runner, lo script prova a scaricare un binario locale (default `~/.cache/gh-cli`, override con `GH_BOOTSTRAP_DIR`, versione configurabile via `GH_BOOTSTRAP_VERSION`). In caso di bootstrap fallito, stampa un errore esplicito e chiede un’installazione manuale.
- Per ogni workflow esegue:
  1. `gh run list --workflow <file> --limit 1 --json databaseId,status,conclusion` per prendere l’ultimo run (autenticato con `GH_TOKEN` impostato dal PAT dei secret sopra).
  2. Se il run è `completed`, salva la pagina HTML del run, scarica i log zipped via API (`.../runs/<id>/logs`) e scarica gli artefatti sia estratti sia come archivio `.zip` (`gh run download --archive`).
  3. Per i manuali, se `DISPATCH_MANUAL=1`, lancia `gh workflow run <file> --ref <branch> <dispatch_inputs>`; opzionale attesa con `WAIT_FOR_COMPLETION=1`. Senza dispatch, scarica comunque l’ultimo run disponibile.

### Esempi d’uso

- Esecuzione base (array di default):
  ```bash
  make ci-log-harvest
  ```
- Usare un file di config personalizzato:
  ```bash
  scripts/ci_log_harvest.sh --config ops/ci-log-config.txt
  ```
- Dispatch dei workflow manuali (es. QA suite) e attesa completamento:
  ```bash
  DISPATCH_MANUAL=1 WAIT_FOR_COMPLETION=1 scripts/ci_log_harvest.sh --ref main
  ```
- Dry-run per vedere i comandi senza eseguirli:
  ```bash
  scripts/ci_log_harvest.sh --dry-run
  ```
  Il dry-run salta sia il bootstrap di `gh` sia la lettura del token e stampa solo le azioni previste per ciascun workflow.

### Checklist operativa (punto 3 del piano)

- Prima di lanciare il job verifica che `GH_TOKEN` sia valorizzato dal secret `CI_LOG_PAT`/`LOG_HARVEST_PAT` (scope `workflow`, `read:org`, repo/admin). Il workflow `log-harvester.yml` fallisce subito se il token manca.
- Nel runner, la sequenza standard è: checkout → `gh auth login --with-token < "$GH_TOKEN"` + `gh auth status` → `make ci-log-harvest` (o `scripts/ci_log_harvest.sh ...`).
- Controlla che le cartelle di destinazione (`logs/ci_runs`, `logs/visual_runs`, `logs/incoming_smoke`) contengano i log/html/artifact zippati per ogni workflow previsto. Gli artifact vengono salvati sia estratti sia come zip.
- Per workflow manuali, valuta se abilitare `DISPATCH_MANUAL=1`/`WAIT_FOR_COMPLETION=1` e passa gli input richiesti (vedi sezione “Workflow manuali che richiedono input”). Anche senza dispatch, il job scarica l’ultimo run completato.
- Dopo il download, aggiorna `docs/planning/ci-inventory.md` (semaforo, note di blocco/rerun) con data/esito e link ai log appena archiviati.

### Checklist copertura workflow e destinazioni (punto 4 del piano)

- Usa la tabella “Workflow coperti e destinazioni standard” come fonte di verità: se aggiungi o rimuovi workflow, allinea sia la tabella sia il file `ops/ci-log-config.txt` (usato da `log-harvester.yml` e dallo script).
- Il job mostra il config usato e lo script crea automaticamente le cartelle `logs/ci_runs`, `logs/visual_runs` e `logs/incoming_smoke`; se una cartella non è scrivibile, il download successivo di `gh`/`curl` fallirà (interrompendo il job).
- L’output del job elenca la mappa `workflow → destinazione`: verifica che ogni workflow atteso punti alla cartella corretta (es. QA visual verso `logs/visual_runs`, incoming verso `logs/incoming_smoke`).
- Dopo ogni esecuzione controlla che le cartelle contengano sia l’HTML del run sia i pacchetti zip di log/artifact; in caso di mismatch aggiorna la mappatura o il file di configurazione personalizzato passato allo script.

### Esempio di file di configurazione

Salva un file (es. `docs/planning/ci-log-config.txt`) con una voce per riga:

```
# workflow|destinazione|modalità|input facoltativi
ci.yml|logs/ci_runs|auto|
e2e.yml|logs/ci_runs|auto|
qa-kpi-monitor.yml|logs/ci_runs|manual|
qa-kpi-monitor.yml|logs/visual_runs|manual|  # seconda riga per scaricare anche i visual (opzionale)
incoming-smoke.yml|logs/incoming_smoke|manual|-f path=/data/incoming -f pack=/packs/demo
```

## Target Makefile

- `make ci-log-harvest` esegue lo script con l’array di default.
- Variabili utili:
  - `CI_LOG_HARVEST_CONFIG=percorso/file.txt` per passare un config personalizzato.
  - `CI_LOG_HARVEST_DRY_RUN=1` per lanciare il dry-run via Make (nessun requisito di `gh`/token, utile in ambienti offline o senza PAT locale).
  - `CI_LOG_HARVEST_ARGS="--ref main --dry-run"` per passare flag aggiuntivi allo script.
  - `DISPATCH_MANUAL=1` e `WAIT_FOR_COMPLETION=1` per i workflow manuali.

## Workflow manuali che richiedono input

- `incoming-smoke.yml`: `gh workflow run incoming-smoke.yml --ref main -f path=<dataset> -f pack=<pack>`.
- `evo-batch.yml`: `gh workflow run evo-batch.yml --ref main -f batch=traits -f execute=false` (dry-run consigliato); valutare `execute=true` solo dopo log verificato.
- QA suite: `qa-kpi-monitor.yml` (con `visual_regression` attivo), `qa-export.yml`, `qa-reports.yml` → dispatch manuale se serve copertura immediata; gli artefatti finiscono in `logs/ci_runs/` e, per la parte visual, anche in `logs/visual_runs/`.
- `hud.yml`: dispatch manuale solo se il flag HUD è attivo; scarica overlay/log in `logs/ci_runs` e `logs/visual_runs`.

Conserva questo documento come riferimento operativo per aggiornare rapidamente la tabella in `ci-inventory` con data/esito/link ai log archiviati.
