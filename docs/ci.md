# Workflow CI e QA

Questa pagina estende le note in [docs/ci-pipeline.md](ci-pipeline.md) descrivendo i workflow GitHub Actions dedicati a controlli specialistici oltre alla pipeline `CI` principale.

## Panoramica rapida

| Workflow | File | Trigger | Scopo principale |
| --- | --- | --- | --- |
| **Validate registry naming** | `.github/workflows/validate-naming.yml` | `push`/`pull_request` limitati a percorsi di registro (`config/project_index.json`, `packs/evo_tactics_pack/tools/config/registries/**`, ecc.) | Convalida naming e allineamento degli identificativi tramite `python tools/py/validate_registry_naming.py`. |
| **Incoming CLI smoke** | `.github/workflows/incoming-smoke.yml` | `workflow_dispatch` con input opzionali | Esegue `scripts/cli_smoke.sh` in modalità `staging_incoming` contro asset decompressi per i caricamenti da `incoming/`. |
| **HUD Canary** | `.github/workflows/hud.yml` | `push` sui file HUD e `workflow_dispatch` | Verifica rapida degli "smart alerts" HUD: se abilitati in `config/cli/hud.yaml` installa Node.js, builda `tools/ts` e segnala eventuali problemi. |
| **QA KPI & Visual Monitor** | `.github/workflows/qa-kpi-monitor.yml` | `schedule` mensile (`0 6 1 * *`) e `workflow_dispatch` | Controlla regressioni metriche (`tests/validate_dashboard.py`, `report_kpi_alerts.py`) e confronta gli snapshot visivi (`visual_regression.py`). |

## Dettagli workflow

### Validate registry naming
- **Trigger**: push e pull request che toccano i file elencati nel blocco `paths` (registri, reference trait, script validator e workflow stesso).
- **Job**: `naming` esegue Python 3.11, installa `tools/py/requirements.txt` e lancia `python tools/py/validate_registry_naming.py` per assicurare che i registri condivisi rispettino le convenzioni.
- **Note operative**: usa gli stessi requisiti della toolchain Python condivisa, quindi eventuali nuove dipendenze vanno aggiunte in `tools/py/requirements.txt`.

### Incoming CLI smoke
- **Trigger**: solo manuale (`workflow_dispatch`). Accetta due input opzionali (`data-root`, `pack-root`) che, se omessi, puntano a `incoming/decompressed/latest/...`.
- **Job**: `smoke` prepara Python 3.11, installa i requisiti CLI e risolve i percorsi richiesti dal profilo `staging_incoming`. Lo script `./scripts/cli_smoke.sh --profile staging_incoming` viene eseguito contro i dataset indicati e archivia i log in `logs/incoming_smoke` come artefatti.
- **Quando usarlo**: lanciare dopo aver caricato nuovi dump in `incoming/` per verificarne la sanità prima di importarli nei dataset ufficiali.

### HUD Canary
- **Trigger**: push che coinvolgono asset HUD (`tools/ts/hud_alerts.ts`, `data/core/hud/**`, `public/hud/**`, ecc.) oppure lancio manuale (`workflow_dispatch`).
- **Job**: `canary` controlla il flag `default` in `config/cli/hud.yaml`. Se impostato a `true`, installa Node.js 20, esegue `npm ci` + `npm run build --if-present` in `tools/ts` e produce il bundle HUD. Se il flag è `false`, il job termina con un messaggio informativo senza eseguire build.
- **Uso pratico**: mantenere il flag attivo quando si desidera ricevere feedback immediato su modifiche agli "smart alerts"; disabilitarlo se si stanno lavorando draft non pronti.

### QA KPI & Visual Monitor
- **Trigger**: schedulato il primo giorno del mese alle 06:00 UTC (`cron: '0 6 1 * *'`) e disponibile anche via `workflow_dispatch`.
- **Job**: `kpi-visual` installa Python 3.11, Playwright con Chromium e lancia tre step principali:
  1. `python tests/validate_dashboard.py --metrics-output metrics.json` per produrre le metriche della dashboard.
  2. `python tools/py/report_kpi_alerts.py --metrics metrics.json` per verificare deviazioni rispetto ai KPI attesi.
  3. `python tools/py/visual_regression.py compare --tolerance 0.08 --engine auto` per il confronto visivo.
  I risultati (log, `metrics.json`) vengono caricati come artefatti `visual-report`.
- **Uso pratico**: monitora la salute della dashboard e segnala scostamenti dei KPI o regressioni visive tra i checkpoint mensili.

## Etichette PR
Al momento **non sono configurate etichette** per forzare l'esecuzione di questi workflow. Se in futuro verranno introdotti override (es. `ci-force-registry`, `run-hud-canary`), documentare qui il nome della label e i casi d'uso previsti.

## Step successivi
- Valutare l'introduzione di una GitHub Action dedicata (ad esempio `actions/github-script`) o di un bot interno che assegni automaticamente etichette basate sulle aree toccate dai file modificati nelle pull request.
- Aggiornare i workflow affinché i job opzionali possano essere forzati tramite una condizione del tipo `if: contains(github.event.pull_request.labels.*.name, 'nome-label')`, così da permettere future modifiche che sbloccano esecuzioni on-demand tramite etichette dedicate.
