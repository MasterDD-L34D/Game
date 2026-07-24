---
title: Avvio manuale dei workflow GitHub da terminale locale
doc_status: draft
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Avvio manuale dei workflow GitHub da terminale locale

Questa guida spiega come avviare manualmente i workflow GitHub del progetto a
partire da un terminale locale (es. PowerShell integrato in VS Code) quando si e'
gia' posizionati nella cartella del repository, ad esempio
`PS C:\dev\Game>`.

Il dispatch manuale funziona solo per i workflow che dichiarano il trigger
`workflow_dispatch:`. Per scoprire l'elenco vivo direttamente da GitHub usa
`gh workflow list` (vedi sotto), che riflette sempre lo stato di
`.github/workflows/` su `main`.

## Prerequisiti

- GitHub CLI (`gh`) installata e disponibile nel `PATH`.
- Un token personale GitHub (PAT) con scope **repo**, **workflow** e
  **read:org** (se l'organizzazione usa SSO, autorizza il token dopo la
  creazione).
- Il token **non** deve essere salvato su file o committato: usalo solo come
  variabile temporanea di sessione.

## Passaggi rapidi (PowerShell)

1. Posizionati nella cartella del repository (nell'esempio sei gia' in
   `PS C:\dev\Game>`).
2. Esporta il PAT solo nella sessione corrente:
   ```powershell
   $Env:PAT_GH="<INSERISCI_IL_TUO_PAT>"
   ```
3. Autenticati con GitHub CLI senza salvare credenziali su disco:
   ```powershell
   echo $Env:PAT_GH | gh auth login --hostname github.com --with-token
   ```
4. Elenca i workflow disponibili e individua quelli dispatchabili
   (lo stato/trigger lo riconosci anche dal fatto che `gh workflow run`
   non restituisce errore "does not have 'workflow_dispatch' trigger"):
   ```powershell
   gh workflow list --repo MasterDD-L34D/Game
   ```
5. Esegui il dispatch dei workflow che espongono `workflow_dispatch` sul
   branch `main` (modifica l'elenco mantenendo solo i nomi che supportano il
   trigger manuale, vedi tabella sotto):
   ```powershell
   $REPO="MasterDD-L34D/Game"
   $REF="main"
   foreach ($wf in "schema-validate.yml","docs-governance.yml",
                   "qa-export.yml","qa-reports.yml","evo-rollout-status.yml",
                   "daily-pr-summary.yml","daily-tracker-refresh.yml") {
     gh workflow run $wf --repo $REPO --ref $REF
     if ($LASTEXITCODE -ne 0) { Write-Host "Dispatch fallito: $wf" }
   }
   ```
6. Esempi separati per i workflow con input (`-f chiave=valore`):
   ```powershell
   # Linter entity-grounding canon: target e' OBBLIGATORIO
   gh workflow run "swarm-validation.yml" --repo $REPO --ref $REF -f target="docs/research/swarm" -f strict=true
   # Sweep simulazioni AI con override seed/profili
   gh workflow run "ai-sim-sweep.yml" --repo $REPO --ref $REF -f seed_count=20 -f profiles="aggressive,balanced"
   ```
7. Al termine, rimuovi il token dalla sessione e chiudi la login CLI se non ti
   serve piu':
   ```powershell
   Remove-Item Env:PAT_GH
   gh auth logout
   ```

## Workflow dispatchabili (`workflow_dispatch:`)

Ground-truth 2026-06-21 -- 21 dei 26 file in `.github/workflows/` espongono il
trigger manuale. Verifica sempre con `gh workflow list` prima di un run
importante.

### Senza input obbligatori

| File                             | `gh workflow run`                                           | Cosa fa                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                         | `gh workflow run ci.yml --ref main`                         | Pipeline CI principale (split, path-filtered, gate `ci-gate`). Dispatch usato come force-fire dei check; i singoli job restano filtrati per path. |
| `schema-validate.yml`            | `gh workflow run schema-validate.yml --ref main`            | Valida gli schemi JSON.                                                                                                                           |
| `docs-governance.yml`            | `gh workflow run docs-governance.yml --ref main`            | Governance frontmatter/registry/doc stale.                                                                                                        |
| `combat-balance-gate.yml`        | `gh workflow run combat-balance-gate.yml --ref main`        | Gate di balance combat (oracoli HC).                                                                                                              |
| `meta-loop-gate.yml`             | `gh workflow run meta-loop-gate.yml --ref main`             | Gate del meta-loop (nest/mating/affinity/trust).                                                                                                  |
| `e2e.yml`                        | `gh workflow run e2e.yml --ref main`                        | Test E2E Playwright.                                                                                                                              |
| `mission-console-build.yml`      | `gh workflow run mission-console-build.yml --ref main`      | Build del bundle Mission Console.                                                                                                                 |
| `chatgpt_sync.yml`               | `gh workflow run chatgpt_sync.yml --ref main`               | Sync ChatGPT.                                                                                                                                     |
| `evo-rollout-status.yml`         | `gh workflow run evo-rollout-status.yml --ref main`         | Sync stato rollout Evo.                                                                                                                           |
| `daily-pr-summary.yml`           | `gh workflow run daily-pr-summary.yml --ref main`           | Riepilogo PR giornaliero.                                                                                                                         |
| `daily-tracker-refresh.yml`      | `gh workflow run daily-tracker-refresh.yml --ref main`      | Refresh sezioni tracker README.                                                                                                                   |
| `traits-monthly-maintenance.yml` | `gh workflow run traits-monthly-maintenance.yml --ref main` | Manutenzione mensile trait.                                                                                                                       |
| `qa-kpi-monitor.yml`             | `gh workflow run qa-kpi-monitor.yml --ref main`             | Monitor KPI / visual QA.                                                                                                                          |
| `qa-reports.yml`                 | `gh workflow run qa-reports.yml --ref main`                 | Generazione report QA.                                                                                                                            |

### Con input opzionali

| File                    | Input                                     | Esempio                                                                |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `traits-sync.yml`       | `publish_external` (bool, default `true`) | `gh workflow run traits-sync.yml --ref main -f publish_external=false` |
| `qa-export.yml`         | `pr_number` (opzionale)                   | `gh workflow run qa-export.yml --ref main -f pr_number=2900`           |
| `skiv-monitor.yml`      | `reset` (default `false`)                 | `gh workflow run skiv-monitor.yml --ref main -f reset=true`            |
| `ai-sim-nightly.yml`    | `seed_count` (default 40), `profiles`     | `gh workflow run ai-sim-nightly.yml --ref main -f seed_count=40`       |
| `playtest-2-weekly.yml` | `seed_count` (default 30), `profiles`     | `gh workflow run playtest-2-weekly.yml --ref main -f seed_count=30`    |

### Con input OBBLIGATORI

| File                   | Input richiesto                                                                  | Esempio                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `swarm-validation.yml` | `target` (string, **required**); `strict` (bool, default `false`)                | `gh workflow run swarm-validation.yml --ref main -f target="docs/research/swarm" -f strict=true` |
| `ai-sim-sweep.yml`     | `seed_count`/`profiles` hanno default ma il run e' inutile senza override mirati | `gh workflow run ai-sim-sweep.yml --ref main -f seed_count=20 -f profiles="aggressive"`          |

## Workflow NON dispatchabili

Questi 5 workflow non espongono `workflow_dispatch:` e si avviano solo coi loro
trigger nativi (push/PR/schedule); `gh workflow run` fallisce su di essi:

- `derived_checksum.yml` (push/PR)
- `evo-import-gate.yml`
- `idea-intake-index.yml`
- `sot-drift-sentinel.yml`
- `telemetry-export.yml`

Per forzarne l'esecuzione, usa i loro trigger nativi o aggiungi
`workflow_dispatch:` al file (richiede una PR; `.github/workflows/` e' un path
governato).

## Note operative

- Se il PAT viene digitato in modo errato, ripeti l'esportazione al punto 2.
- Evita di incollare il PAT in file di script o di aggiungerlo a commit.
- Puoi cambiare `$REF` per lanciare i workflow su un branch diverso.
- `gh workflow run` accetta sia il nome file (`schema-validate.yml`) sia il
  campo `name:` del workflow (es. "Validate JSON Schemas").

## Recupero log e artefatti

1. Elenca gli ultimi run per un workflow e individua l'ID:
   ```powershell
   gh run list --workflow "ci.yml" --repo MasterDD-L34D/Game --limit 5
   ```
2. Scarica log/artefatti usando l'ID reale (sostituisci `123456789` e la data):
   ```powershell
   gh run download 123456789 --repo MasterDD-L34D/Game --dir logs/ci_runs/ci_2026-06-21
   ```
3. Conserva i log localmente; non includere il PAT in file o commit.
