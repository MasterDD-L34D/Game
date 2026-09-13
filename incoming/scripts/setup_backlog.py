#!/usr/bin/env python3
"""
Script di utilità per impostare automaticamente il backlog di progetto su GitHub.

Il programma utilizza l'API REST di GitHub per creare un project board,
popolare le colonne standard (Backlog, In Progress, Review QA, Done) e
creare issue per ogni voce del backlog definita in un file YAML.

Requisiti:

* Python 3.8+
* modulo `requests` (`pip install requests`)

Prima di eseguire, impostare le seguenti variabili d'ambiente:

* `BACKLOG_PAT` – Personal Access Token (PAT) con scope `repo`, `workflow`, `project`.
* `REPO` – nome completo del repo (es. `MasterDD-L34D/Game`).
* `BACKLOG_FILE` – percorso a un file YAML che descrive le issue da creare.

Esempio di esecuzione:

```bash
export BACKLOG_PAT=ghp_xxx
export REPO=MasterDD-L34D/Game
export BACKLOG_FILE=backlog.yaml
python3 scripts/setup_backlog.py --dry-run   # valida configurazione senza chiamare GitHub
python3 scripts/setup_backlog.py             # esecuzione completa
```

Il file YAML deve avere il seguente formato:

```yaml
project_name: Evo‑Tactics Roadmap
columns:
  - Backlog
  - In Progress
  - Review QA
  - Done
issues:
  - title: "Implementare overlay HUD telemetrico"
    body: "Sviluppare l'overlay HUD che mostra in tempo reale gli alert."
    labels: ["webapp", "HUD", "milestone:smart-hud"]
    column: "Backlog"
  - title: "Bilanciamento XP e tratti"
    body: "Analizzare la progressione dell'XP e ottimizzare i coefficienti."
    labels: ["gameplay", "balancing"]
    column: "Backlog"
```

Nota: Questo script non gestisce la deduplicazione di issue esistenti.  Utilizzare con cautela.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Any, List, Tuple

import requests
import yaml


class BacklogConfigError(Exception):
    """Raised when local configuration is invalid."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Setup backlog GitHub")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Esegue solo la validazione locale (token e file YAML) senza chiamare l'API GitHub.",
    )
    return parser.parse_args()


def get_github_token() -> str:
    """Return a PAT ready for GitHub API usage."""

    token = os.environ.get("BACKLOG_PAT") or os.environ.get("GITHUB_TOKEN")
    if not token:
        raise BacklogConfigError(
            "Token GitHub non impostato: definire BACKLOG_PAT (PAT con scope repo, workflow, project)."
        )
    if not token.startswith(("ghp_", "github_pat_")):
        raise BacklogConfigError(
            "Token GitHub non riconosciuto come PAT (atteso prefisso ghp_ o github_pat_). "
            "Usa un PAT con scope repo, workflow, project invece del GITHUB_TOKEN di Actions."
        )
    return token


def github_request(method: str, url: str, token: str, **kwargs) -> Any:
    headers = kwargs.pop("headers", {})
    headers.update(
        {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json, application/vnd.github.inertia-preview+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
    )
    try:
        response = requests.request(method, url, headers=headers, timeout=30, **kwargs)
    except requests.exceptions.RequestException as exc:  # pragma: no cover - network guardrail
        raise RuntimeError(f"Errore di rete verso GitHub: {exc}") from exc

    if not response.ok:
        if response.status_code in (401, 403):
            raise RuntimeError(
                "Token GitHub non valido o privo degli scope richiesti (repo, workflow, project). "
                "Rigenera un PAT e impostalo in BACKLOG_PAT."
            )
        if response.status_code == 404:
            raise RuntimeError(
                "GitHub API error 404: repository o Projects non accessibili. "
                "Verifica REPO e che il token abbia scope repo+project con accesso al repository."
            )
        raise RuntimeError(f"GitHub API error {response.status_code}: {response.text}")
    if response.text:
        return response.json()
    return None


def validate_token_scopes(token: str) -> None:
    """Fail fast when the PAT misses the required scopes."""

    url = "https://api.github.com/user"
    try:
        response = requests.get(
            url,
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=15,
        )
    except requests.exceptions.RequestException as exc:  # pragma: no cover - network guardrail
        raise RuntimeError(f"Errore di rete verso GitHub: {exc}") from exc

    if response.status_code in (401, 403):
        raise BacklogConfigError(
            "Token GitHub non valido o scaduto. Rigenera un PAT con scope repo, workflow, project e impostalo in BACKLOG_PAT."
        )

    scopes_header = response.headers.get("X-OAuth-Scopes", "")
    scopes = {scope.strip().lower() for scope in scopes_header.split(",") if scope.strip()}
    required_scopes = {"repo", "workflow", "project"}
    missing = required_scopes - scopes
    if missing:
        raise BacklogConfigError(
            "Token GitHub privo degli scope richiesti (repo, workflow, project). "
            f"Scope attivi: {', '.join(sorted(scopes)) or 'nessuno'}."
        )


def create_project(repo_full_name: str, project_name: str, token: str) -> int:
    url = f"https://api.github.com/repos/{repo_full_name}/projects"
    data = {"name": project_name}
    project = github_request("POST", url, token, json=data)
    return project["id"]


def create_column(project_id: int, name: str, token: str) -> int:
    url = f"https://api.github.com/projects/{project_id}/columns"
    data = {"name": name}
    column = github_request("POST", url, token, json=data)
    return column["id"]


def create_issue(repo_full_name: str, title: str, body: str, labels: List[str], token: str) -> Tuple[int, int]:
    url = f"https://api.github.com/repos/{repo_full_name}/issues"
    data = {
        "title": title,
        "body": body,
        "labels": labels,
    }
    issue = github_request("POST", url, token, json=data)
    return issue["id"], issue["number"]


def add_issue_to_column(column_id: int, issue_id: int, token: str) -> None:
    url = f"https://api.github.com/projects/columns/{column_id}/cards"
    data = {
        "content_id": issue_id,
        "content_type": "Issue",
    }
    github_request("POST", url, token, json=data)


def main() -> None:
    try:
        args = parse_args()
        token = get_github_token()
        repo = os.environ.get("REPO")
        backlog_file = os.environ.get("BACKLOG_FILE")
        if not repo or not backlog_file:
            raise BacklogConfigError("REPO e BACKLOG_FILE devono essere impostate.")
        if "/" not in repo:
            raise BacklogConfigError("REPO deve avere il formato <owner>/<repo> (es. MasterDD-L34D/Game).")
        backlog_path = Path(backlog_file)
        if not backlog_path.is_file():
            raise BacklogConfigError(f"BACKLOG_FILE non trovato: {backlog_path}")

        if not args.dry_run:
            validate_token_scopes(token)
            # Preflight: verificare che il token abbia accesso al repository e ai progetti
            github_request("GET", f"https://api.github.com/repos/{repo}", token)

        with backlog_path.open("r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        if "project_name" not in config or "columns" not in config or "issues" not in config:
            raise BacklogConfigError("BACKLOG_FILE mancante di una delle chiavi richieste: project_name, columns, issues.")

        if args.dry_run:
            print("Dry-run completato: configurazione valida, nessuna chiamata GitHub eseguita.")
            return

        validate_token_scopes(token)
        project_id = create_project(repo, config["project_name"], token)
        # Creazione colonne
        column_ids = {}
        for col_name in config.get("columns", []):
            col_id = create_column(project_id, col_name, token)
            column_ids[col_name] = col_id
        # Creazione issue e assegnazione a colonna
        for item in config.get("issues", []):
            issue_id, _issue_number = create_issue(
                repo, item["title"], item.get("body", ""), item.get("labels", []), token
            )
            column_name = item.get("column") or config["columns"][0]
            col_id = column_ids[column_name]
            add_issue_to_column(col_id, issue_id, token)
            print(f"Creata issue '{item['title']}' in colonna {column_name}")
        print("Setup backlog completato.")
    except BacklogConfigError as cfg_error:
        print(f"Errore di configurazione: {cfg_error}")
        sys.exit(1)
    except RuntimeError as runtime_error:
        print(runtime_error)
        sys.exit(1)


if __name__ == "__main__":
    main()
