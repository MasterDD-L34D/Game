# Raccolta automatica log CI

Questo documento centralizza i comandi per scaricare i log/artefatti dei workflow GitHub Actions e fornisce un entrypoint unico da console (`scripts/ci_log_harvest.sh` o `make ci-log-harvest`). Usalo insieme a `docs/planning/ci-inventory.md` per aggiornare semaforo e azioni aperte.

## Prerequisiti

- GitHub CLI (`gh`) installato e autenticato con un PAT che abbia scope `workflow` e `read:org`, autorizzato via SSO.
- Accesso di rete a GitHub Actions.
- Permessi di scrittura locali nelle cartelle di destinazione (`logs/ci_runs`, `logs/visual_runs`, `logs/incoming_smoke`).

## Workflow coperti e destinazioni standard

| Workflow | Trigger principale | Modalità | Destinazione download | Note/Inputs |
| --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | push/PR | automatico | `logs/ci_runs/` | Nessun `workflow_dispatch`; usare ultimo push/PR. |
| `.github/workflows/e2e.yml` | schedulato/dispatch | automatico | `logs/ci_runs/` | Report Playwright (`logs/ci_runs/e2e_*`). |
| `.github/workflows/deploy-test-interface.yml` | push/PR/dispatch | automatico | `logs/ci_runs/` | Necessario per gate go-live. |
| `.github/workflows/daily-pr-summary.yml` | cron/dispatch | automatico | `logs/ci_runs/` | Auto-commit quotidiano. |
| `.github/workflows/daily-tracker-refresh.yml` | cron/dispatch | automatico | `logs/ci_runs/` | Export JSON tracker. |
| `.github/workflows/lighthouse.yml` | cron/dispatch | automatico | `logs/ci_runs/` | Artefatto `.lighthouseci`. |
| `.github/workflows/search-index.yml` | push/dispatch | automatico | `logs/ci_runs/` | Aggiorna `public/search_index.json`. |
| `.github/workflows/telemetry-export.yml` | push/PR | automatico | `logs/ci_runs/` | Validazioni export. |
| `.github/workflows/qa-kpi-monitor.yml` | cron/dispatch | manuale | `logs/ci_runs/` + `logs/visual_runs/` | Include `visual_regression`; servono artefatti KPI + visual. |
| `.github/workflows/qa-export.yml` | dispatch | manuale | `logs/ci_runs/` | Input PR opzionali. |
| `.github/workflows/qa-reports.yml` | dispatch | manuale | `logs/ci_runs/` | Badge/baseline QA. |
| `.github/workflows/hud.yml` | push/dispatch | manuale (skip se flag off) | `logs/ci_runs/` + `logs/visual_runs/` | Dispatch se HUD abilitato. |
| `.github/workflows/incoming-smoke.yml` | dispatch con input | manuale | `logs/incoming_smoke/` | Richiede `-f path=<dataset> -f pack=<pack>`. |
| `.github/workflows/evo-batch.yml` | dispatch con input | manuale | `logs/ci_runs/` | Dry-run consigliato: `-f batch=traits -f execute=false`. |

Per workflow non elencati qui (es. `data-quality.yml`, `schema-validate.yml`, `validate_traits.yml`, ecc.) puoi aggiungere voci nel file di config personalizzato o nell’array interno dello script.

## Script `scripts/ci_log_harvest.sh`

- Legge la lista dei workflow da un array predefinito o da un file di configurazione (pipe-separated):
  - Formato: `workflow_file|destinazione|modalità|dispatch_inputs`
  - Modalità: `auto` (solo download) oppure `manual` (skip di default, dispatch se `DISPATCH_MANUAL=1`).
- Per ogni workflow esegue:
  1. `gh run list --workflow <file> --limit 1 --json databaseId,status,conclusion` per prendere l’ultimo run.
  2. Se il run è `completed`, scarica gli artefatti con `gh run download <id> --dir <destinazione>`.
  3. Per i manuali, se `DISPATCH_MANUAL=1`, lancia `gh workflow run <file> --ref <branch> <dispatch_inputs>`; opzionale attesa con `WAIT_FOR_COMPLETION=1`.

### Esempi d’uso

- Esecuzione base (array di default):
  ```bash
  make ci-log-harvest
  ```
- Usare un file di config personalizzato:
  ```bash
  scripts/ci_log_harvest.sh --config docs/planning/ci-log-config.txt
  ```
- Dispatch dei workflow manuali (es. QA suite) e attesa completamento:
  ```bash
  DISPATCH_MANUAL=1 WAIT_FOR_COMPLETION=1 scripts/ci_log_harvest.sh --ref main
  ```
- Dry-run per vedere i comandi senza eseguirli:
  ```bash
  scripts/ci_log_harvest.sh --dry-run
  ```

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
  - `DISPATCH_MANUAL=1` e `WAIT_FOR_COMPLETION=1` per i workflow manuali.

## Workflow manuali che richiedono input

- `incoming-smoke.yml`: `gh workflow run incoming-smoke.yml --ref main -f path=<dataset> -f pack=<pack>`.
- `evo-batch.yml`: `gh workflow run evo-batch.yml --ref main -f batch=traits -f execute=false` (dry-run consigliato); valutare `execute=true` solo dopo log verificato.
- QA suite: `qa-kpi-monitor.yml` (con `visual_regression` attivo), `qa-export.yml`, `qa-reports.yml` → dispatch manuale se serve copertura immediata; gli artefatti finiscono in `logs/ci_runs/` e, per la parte visual, anche in `logs/visual_runs/`.
- `hud.yml`: dispatch manuale solo se il flag HUD è attivo; scarica overlay/log in `logs/ci_runs` e `logs/visual_runs`.

Conserva questo documento come riferimento operativo per aggiornare rapidamente la tabella in `ci-inventory` con data/esito/link ai log archiviati.
