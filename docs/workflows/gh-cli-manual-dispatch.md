# Avvio manuale dei workflow GitHub da terminale locale

Questa guida spiega come avviare manualmente i workflow GitHub del progetto a
partire da un terminale locale (es. PowerShell integrato in VS Code) quando si è
già posizionati nella cartella del repository, ad esempio
`PS C:\Users\VGit\Documents\GitHub\Game>`.

## Prerequisiti

- GitHub CLI (`gh`) installata e disponibile nel `PATH`.
- Un token personale GitHub (PAT) con scope **repo**, **workflow** e
  **read:org** (se l'organizzazione usa SSO, autorizza il token dopo la
  creazione).
- Il token **non** deve essere salvato su file o committato: usalo solo come
  variabile temporanea di sessione.

## Passaggi rapidi (PowerShell)

1. Posizionati nella cartella del repository (nell'esempio sei già in
   `PS C:\Users\VGit\Documents\GitHub\Game>`).
2. Esporta il PAT solo nella sessione corrente:
   ```powershell
   $Env:PAT_GH="<INSERISCI_IL_TUO_PAT>"
   ```
3. Autenticati con GitHub CLI senza salvare credenziali su disco:
   ```powershell
   echo $Env:PAT_GH | gh auth login --hostname github.com --with-token
   ```
4. Esegui il dispatch dei workflow che espongono `workflow_dispatch` sul
   branch `main` del repository `MasterDD-L34D/Game` (puoi aggiungere/rimuovere
   nomi dal ciclo mantenendoli nell'elenco dei file che supportano il trigger
   manuale):
   ```powershell
   $REPO="MasterDD-L34D/Game"
   $REF="main"
   foreach ($wf in "e2e.yml","deploy-test-interface.yml","qa-export.yml",
                   "qa-reports.yml","hud.yml","search-index.yml",
                   "traits-sync.yml","validate-naming.yml","gh-pages.yml",
                   "incoming-smoke.yml","evo-rollout-status.yml",
                   "chatgpt_sync.yml","traits-monthly-maintenance.yml",
                   "qa-kpi-monitor.yml","daily-pr-summary.yml",
                   "daily-tracker-refresh.yml","evo-doc-backfill.yml",
                   "lighthouse.yml") {
     gh workflow run $wf --repo $REPO --ref $REF
     if ($LASTEXITCODE -ne 0) { Write-Host "Dispatch fallito: $wf" }
   }
   ```
5. Esempio separato per workflow con input obbligatori (ad es. `evo-batch.yml`
   richiede `batch`):
   ```powershell
   gh workflow run "evo-batch.yml" --repo $REPO --ref $REF -f batch="traits"
   ```
6. Al termine, rimuovi il token dalla sessione e chiudi la login CLI se non ti
   serve più:
   ```powershell
   Remove-Item Env:PAT_GH
   gh auth logout
   ```

## Note operative

- Se il PAT viene digitato in modo errato, ripeti l'esportazione al punto 2.
- Evita di incollare il PAT in file di script o di aggiungerlo a commit.
- Puoi cambiare `$REF` per lanciare i workflow su un branch diverso.
- I workflow che non espongono `workflow_dispatch` (ad es. `ci.yml` o
  `telemetry-export.yml`) non possono essere avviati manualmente con `gh
  workflow run`: usa i loro trigger nativi (push/PR) o aggiungi il trigger nel
  file se necessario.

## Recupero log e artefatti

1. Elenca gli ultimi run per un workflow e individua l'ID:
   ```powershell
   gh run list --workflow "e2e.yml" --repo $REPO --limit 5
   ```
2. Scarica log/artefatti usando l'ID reale (sostituisci `123456789` e la data):
   ```powershell
   gh run download --run-id 123456789 --dir logs/ci_runs/e2e_2025-12-05
   ```
3. Conserva i log localmente; non includere il PAT in file o commit.
