# Lavoro da classificare – backlog e setup

area

Questo folder include il backlog di rollout e gli script di setup.

## Perché manca `GITHUB_TOKEN` in locale?

L'ambiente di lavoro containerizzato non contiene credenziali personali: i segreti (come i personal access token) non sono montati per ragioni di sicurezza. Per questo, gli script che chiamano le API GitHub (es. `incoming/scripts/setup_backlog.py`) falliscono con `401 Bad credentials` se non fornisci un token valido.

## Come ottenere e configurare il token

1. Crea un **Personal Access Token (classic)** su GitHub con scope **`repo`** e **`project`**.
2. Esporta le variabili richieste prima di eseguire lo script:
   ```bash
   export GITHUB_TOKEN=<il_tuo_token>
   export REPO=<owner>/<repo>   # es. MasterDD-L34D/Game
   export BACKLOG_FILE=incoming/lavoro_da_classificare/backlog_tasks_example.yaml
   python incoming/scripts/setup_backlog.py
   ```
3. Se usi `gh` CLI, puoi generare il token con `gh auth token` (assicurati di avere gli scope necessari) e assegnarlo a `GITHUB_TOKEN`.

## Note operative

- Il token deve poter accedere **al repository di destinazione** e ai **Projects (classic)**.
- Lo script esegue un preflight di accesso; con token errato o senza permessi riceverai un errore 404/401.
- Non salvare il token nel repository: usa variabili d'ambiente o un `.env` non tracciato.
