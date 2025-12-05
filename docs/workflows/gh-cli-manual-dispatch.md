# Esecuzione manuale dei workflow GitHub via CLI

Guida rapida per lanciare workflow GitHub Actions con `gh workflow run` in modo sicuro.

## Prerequisiti

- [GitHub CLI](https://cli.github.com/) installata e autenticata (`gh auth login`).
- Personal Access Token (PAT) con gli scope `repo`, `workflow` **e** `read:org`; se l'organizzazione usa SSO, autorizza il PAT prima dell'uso.

## Workflow con trigger manuale

Questi workflow espongono `workflow_dispatch` e possono essere avviati via CLI:

- `chatgpt_sync.yml`
- `daily-pr-summary.yml`
- `daily-tracker-refresh.yml`
- `deploy-test-interface.yml`
- `e2e.yml`
- `evo-batch.yml`
- `evo-doc-backfill.yml`
- `evo-rollout-status.yml`
- `gh-pages.yml`
- `hud.yml`
- `incoming-smoke.yml`
- `lighthouse.yml`
- `qa-export.yml`
- `qa-kpi-monitor.yml`
- `qa-reports.yml`
- `schema-validate.yml`
- `search-index.yml`
- `traits-monthly-maintenance.yml`
- `traits-sync.yml`
- `validate-naming.yml`

### Dispatch multiplo (PowerShell)

Usa questo ciclo solo per i workflow con `workflow_dispatch` e senza input obbligatori:

```powershell
$workflows = @(
  "chatgpt_sync.yml",
  "daily-pr-summary.yml",
  "daily-tracker-refresh.yml",
  "deploy-test-interface.yml",
  "e2e.yml",
  "evo-doc-backfill.yml",
  "evo-rollout-status.yml",
  "gh-pages.yml",
  "hud.yml",
  "incoming-smoke.yml",
  "lighthouse.yml",
  "qa-export.yml",
  "qa-kpi-monitor.yml",
  "qa-reports.yml",
  "schema-validate.yml",
  "search-index.yml",
  "traits-monthly-maintenance.yml",
  "traits-sync.yml",
  "validate-naming.yml"
)

foreach ($w in $workflows) {
  gh workflow run $w
}
```

## Esempi di dispatch

### Workflow senza input obbligatori

```bash
# Esegui un workflow semplice (puoi specificare -r <branch> se serve)
gh workflow run e2e.yml
```

### Workflow con input obbligatori

```bash
# Esegui un batch specifico (sostituisci <valore> con il batch richiesto)
gh workflow run evo-batch.yml -f batch=<valore> [-f execute=true] [-f ignore_errors=true]
```

## Note operative

- Rimuovi il PAT dal keychain/credential manager dopo l'uso per ridurre l'esposizione.
- I workflow privi di `workflow_dispatch` vanno eseguiti esclusivamente tramite i loro trigger nativi (push, schedule o dipendenze da altri workflow).
- Verifica e scarica i log con `gh run list --workflow <nome-workflow>` e `gh run download <run-id>` sostituendo `<nome-workflow>` e `<run-id>` con valori reali.
