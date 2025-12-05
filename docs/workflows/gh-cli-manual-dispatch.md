# Esecuzione manuale dei workflow GitHub via CLI

Guida rapida per lanciare workflow GitHub Actions con `gh workflow run` in modo sicuro.

## Prerequisiti

- [GitHub CLI](https://cli.github.com/) installata e autenticata (`gh auth login`).
- Personal Access Token (PAT) con gli scope `repo`, `workflow` **e** `read:org`; se l'organizzazione usa SSO, autorizza il PAT prima dell'uso.

## Esempio di dispatch per i workflow con trigger manuale

Usa PowerShell per lanciare in sequenza i workflow che espongono `workflow_dispatch`:

```powershell
$workflows = @(
  "e2e.yml",
  "deploy-test-interface.yml",
  "qa-export.yml",
  "qa-reports.yml",
  "hud.yml",
  "search-index.yml",
  "traits-sync.yml",
  "validate-naming.yml",
  "gh-pages.yml",
  "incoming-smoke.yml",
  "evo-rollout-status.yml",
  "chatgpt_sync.yml",
  "traits-monthly-maintenance.yml",
  "qa-kpi-monitor.yml",
  "daily-pr-summary.yml",
  "daily-tracker-refresh.yml",
  "evo-doc-backfill.yml",
  "lighthouse.yml"
)

foreach ($workflow in $workflows) {
  gh workflow run $workflow
}
```

## Esempio dedicato: `evo-batch.yml`

Questo workflow richiede la specifica del batch target come input obbligatorio:

```powershell
# Esegui un batch specifico (sostituisci <valore> con il batch richiesto)
gh workflow run evo-batch.yml -f batch=<valore>

# Aggiungi ulteriori flag solo se richiesti dal workflow (es. -f dry_run=true)
```

`schema-validate.yml` non espone `workflow_dispatch` sul branch principale: si attiva solo tramite i trigger previsti dal file.

## Note operative

- Rimuovi il PAT dal keychain/credential manager dopo l'uso per ridurre l'esposizione.
- I workflow privi di `workflow_dispatch` vanno eseguiti esclusivamente tramite i loro trigger nativi (push, schedule o dipendenze da altri workflow).
