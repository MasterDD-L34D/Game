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

* `GITHUB_TOKEN` – token personale con permessi repo e project.
* `REPO` – nome completo del repo (es. `MasterDD-L34D/Game`).
* `BACKLOG_FILE` – percorso a un file YAML che descrive le issue da creare.

Esempio di esecuzione:

```bash
export GITHUB_TOKEN=ghp_xxx
export REPO=MasterDD-L34D/Game
export BACKLOG_FILE=backlog.yaml
python3 scripts/setup_backlog.py
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

import os
import sys
import json
from typing import List, Dict, Any
import requests
import yaml


def github_request(method: str, url: str, **kwargs) -> Any:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN non impostato")
    headers = kwargs.pop("headers", {})
    headers.update({
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    })
    response = requests.request(method, url, headers=headers, **kwargs)
    if not response.ok:
        raise RuntimeError(f"GitHub API error {response.status_code}: {response.text}")
    return response.json()


def create_project(repo_full_name: str, project_name: str) -> int:
    url = f"https://api.github.com/repos/{repo_full_name}/projects"
    data = {"name": project_name}
    project = github_request("POST", url, json=data)
    return project["id"]


def create_column(project_id: int, name: str) -> int:
    url = f"https://api.github.com/projects/{project_id}/columns"
    data = {"name": name}
    column = github_request("POST", url, json=data)
    return column["id"]


def create_issue(repo_full_name: str, title: str, body: str, labels: List[str]) -> int:
    url = f"https://api.github.com/repos/{repo_full_name}/issues"
    data = {
        "title": title,
        "body": body,
        "labels": labels,
    }
    issue = github_request("POST", url, json=data)
    return issue["id"], issue["number"]


def add_issue_to_column(column_id: int, issue_id: int) -> None:
    url = f"https://api.github.com/projects/columns/{column_id}/cards"
    data = {
        "content_id": issue_id,
        "content_type": "Issue",
    }
    github_request("POST", url, json=data)


def main() -> None:
    repo = os.environ.get("REPO")
    backlog_file = os.environ.get("BACKLOG_FILE")
    if not repo or not backlog_file:
        print("Errore: REPO e BACKLOG_FILE devono essere impostate.")
        sys.exit(1)
    with open(backlog_file, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    project_id = create_project(repo, config["project_name"])
    # Creazione colonne
    column_ids = {}
    for col_name in config.get("columns", []):
        col_id = create_column(project_id, col_name)
        column_ids[col_name] = col_id
    # Creazione issue e assegnazione a colonna
    for item in config.get("issues", []):
        issue_id, _issue_number = create_issue(repo, item["title"], item.get("body", ""), item.get("labels", []))
        column_name = item.get("column") or config["columns"][0]
        col_id = column_ids[column_name]
        add_issue_to_column(col_id, issue_id)
        print(f"Creata issue '{item['title']}' in colonna {column_name}")


if __name__ == "__main__":
    main()