#!/usr/bin/env python3
"""Genera docs/flint-status.json con stdlib-only (no typer/rich deps).

Fallback usato quando flint CLI non è installato. Produce JSON
shape-compatible con `flint export`. Usato da CI e dal setup iniziale
S4 (RESEARCH_TODO).

Usage:
    python3 tools/py/flint_status_stdlib.py [--output path]
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

COMMIT_PATTERNS = [
    (("traits/", "biomes/", "rules/", "jobs/", "species/", "engine/game", "combat", "turn", "round", "session/", "session.js", "playtest", "play:", "play(", "ai/", "intent"), "GAMEPLAY"),
    (("data/", "datasets/", "yaml", "schema", "data:", "data("), "DATA"),
    (("docker", "ci/", ".github/workflows", "prisma", "migration", "deploy", "compose", "infra:", "infra(", "chore("), "INFRA"),
    (("cli/", "tools/", "validator", "dashboard", "analytics", "script"), "TOOLING"),
    (("readme", "docs/", "changelog", "canvas", ".md", "doc:", "docs(", "doc("), "DOCS"),
]


def classify(message: str, files: list[str]) -> str:
    haystack = (message + " " + " ".join(files)).lower()
    for patterns, kind in COMMIT_PATTERNS:
        for p in patterns:
            if p in haystack:
                return kind
    return "ALTRO"


def git_log(repo: Path, limit: int = 10) -> list[dict]:
    result = subprocess.run(
        ["git", "log", f"-{limit}", "--name-only", "--pretty=format:%H%n%s%n--END--"],
        cwd=repo,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        return []

    commits = []
    lines = result.stdout.split("\n")
    i = 0
    while i < len(lines):
        if i + 1 >= len(lines):
            break
        sha = lines[i].strip()
        if not re.match(r"^[0-9a-f]{7,40}$", sha):
            i += 1
            continue
        msg = lines[i + 1] if i + 1 < len(lines) else ""
        files = []
        j = i + 2
        while j < len(lines) and lines[j].strip() != "--END--":
            if lines[j].strip():
                files.append(lines[j].strip())
            j += 1
        commits.append({"sha": sha, "message": msg, "files": files, "kind": classify(msg, files)})
        i = j + 1
    return commits


def dirty_files(repo: Path) -> list[str]:
    result = subprocess.run(
        ["git", "status", "--porcelain"], cwd=repo, capture_output=True, text=True
    )
    if result.returncode != 0:
        return []
    out = []
    for line in result.stdout.splitlines():
        if line.strip():
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2:
                out.append(parts[1])
    return out


def compute_metrics(commits: list[dict]) -> dict:
    if not commits:
        return {
            "gameplay_ratio": 0.0,
            "consecutive_infra_commits": 0,
            "is_drifting": False,
        }
    gp = sum(1 for c in commits if c["kind"] == "GAMEPLAY")
    ratio = gp / len(commits)
    consec = 0
    for c in commits:
        if c["kind"] == "INFRA":
            consec += 1
        else:
            break
    return {
        "gameplay_ratio": ratio,
        "consecutive_infra_commits": consec,
        "is_drifting": ratio < 0.2 or consec >= 4,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "-o", default="docs/flint-status.json")
    args = parser.parse_args()

    repo = Path.cwd()
    commits = git_log(repo, limit=10)
    dirty = dirty_files(repo)
    metrics = compute_metrics(commits)

    payload = {
        "_meta": {
            "generator": "flint_status_stdlib (fallback)",
            "version": "0.2.0-stdlib",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "repo_root": str(repo),
            "note": (
                "File generato via tools/py/flint_status_stdlib.py (stdlib-only). "
                "Quando flint CLI è installato, rigenerare con `flint export`."
            ),
        },
        "snapshot": {
            "dirty_files_count": len(dirty),
            "recent_commits_count": len(commits),
            "gameplay_ratio": metrics["gameplay_ratio"],
            "consecutive_infra_commits": metrics["consecutive_infra_commits"],
            "is_drifting": metrics["is_drifting"],
            "recent_commits": [
                {
                    "sha": c["sha"][:8],
                    "kind": c["kind"],
                    "message_first_line": c["message"],
                    "files_count": len(c["files"]),
                }
                for c in commits
            ],
        },
        "last_spoke_unix": None,
    }

    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK: exported flint status → {dest}")
    print(
        f"  commits={len(commits)} gameplay_ratio={metrics['gameplay_ratio']:.0%} "
        f"drifting={metrics['is_drifting']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
