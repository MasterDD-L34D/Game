"""Lettura stato repo Evo-Tactics — veloce, solo stdlib + subprocess."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from typing import Final, Literal

# ---------- Tipi ----------

CommitKind = Literal["GAMEPLAY", "INFRA", "TOOLING", "DOCS", "DATA", "ALTRO"]

# Mapping path/parola-chiave → categoria, in ordine di priorità.
# Tuple di (pattern, categoria). Match se QUALSIASI pattern appare nel messaggio
# o nei file toccati del commit (lowercase).
_COMMIT_PATTERNS: Final[tuple[tuple[tuple[str, ...], CommitKind], ...]] = (
    # GAMEPLAY ha priorità: se un commit tocca traits/ anche solo di striscio, conta.
    (("traits/", "biomes/", "rules/", "jobs/", "species/", "engine/game", "combat", "turn", "round", "session/", "session.js", "playtest", "play(", "ai/", "intent"), "GAMEPLAY"),
    (("data/", "datasets/", "yaml", "schema", "data("), "DATA"),
    (("docker", "ci/", ".github/workflows", "prisma", "migration", "deploy", "compose", "chore("), "INFRA"),
    (("cli/", "tools/", "validator", "dashboard", "analytics", "script"), "TOOLING"),
    (("readme", "docs/", "changelog", "canvas", ".md", "docs("), "DOCS"),
)


@dataclass(frozen=True, slots=True)
class Commit:
    sha: str
    message: str
    files: tuple[str, ...]
    kind: CommitKind

    @property
    def is_gameplay(self) -> bool:
        return self.kind == "GAMEPLAY"


@dataclass(frozen=True, slots=True)
class RepoSnapshot:
    """Snapshot istantaneo dello stato del repo per decisioni del caveman."""

    root: Path
    recent_commits: tuple[Commit, ...]
    dirty_files: tuple[str, ...]  # file modificati non committati
    pillar_dirs: frozenset[str] = field(default_factory=frozenset)

    # --- Metriche derivate (cached) ---

    @cache
    def gameplay_ratio(self) -> float:
        """Rapporto commit GAMEPLAY/totali negli ultimi N commit. 0.0 se nessuno."""
        if not self.recent_commits:
            return 0.0
        gp = sum(1 for c in self.recent_commits if c.is_gameplay)
        return gp / len(self.recent_commits)

    @cache
    def consecutive_infra_commits(self) -> int:
        """Quanti commit INFRA di fila partendo dal più recente. Segnale di deriva."""
        count = 0
        for c in self.recent_commits:
            if c.kind == "INFRA":
                count += 1
            else:
                break
        return count

    @cache
    def is_drifting(self) -> bool:
        """Heuristica: repo in deriva se <20% gameplay negli ultimi 10 o 4+ INFRA di fila."""
        return self.gameplay_ratio() < 0.2 or self.consecutive_infra_commits() >= 4


# ---------- Lettura repo ----------


def _run_git(args: list[str], cwd: Path) -> str:
    """Esegue git in modo robusto. Ritorna stdout strippato, stringa vuota se fallisce."""
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def _classify_commit(message: str, files: tuple[str, ...]) -> CommitKind:
    """Classifica un commit in base a messaggio + file toccati."""
    haystack = (message + " " + " ".join(files)).lower()
    for patterns, kind in _COMMIT_PATTERNS:
        if any(p in haystack for p in patterns):
            return kind
    return "ALTRO"


def _parse_log_output(raw: str) -> list[Commit]:
    """Parser per git log con formato custom."""
    if not raw:
        return []
    commits: list[Commit] = []
    # Formato: %H%x00%s%x00<files>%x00%x00 (nullbyte-separated, double-null record separator)
    for record in raw.split("\0\0"):
        record = record.strip("\0\n")
        if not record:
            continue
        parts = record.split("\0", 2)
        if len(parts) < 2:
            continue
        sha, message = parts[0], parts[1]
        files_raw = parts[2] if len(parts) > 2 else ""
        files = tuple(f for f in files_raw.split("\n") if f)
        commits.append(
            Commit(sha=sha[:7], message=message, files=files, kind=_classify_commit(message, files))
        )
    return commits


def snapshot(repo_root: Path, *, max_commits: int = 10) -> RepoSnapshot:
    """Crea snapshot dello stato del repo. Operazione rapida (<100ms tipicamente)."""
    repo_root = repo_root.resolve()

    # Verifica che sia un repo git
    if not (repo_root / ".git").exists():
        return RepoSnapshot(root=repo_root, recent_commits=(), dirty_files=())

    # Log degli ultimi N commit con file toccati
    log_raw = _run_git(
        [
            "log",
            f"-{max_commits}",
            "--name-only",
            "--pretty=format:%H%x00%s%x00",
            "-z",  # null-termination
        ],
        cwd=repo_root,
    )
    commits = _parse_log_output(log_raw)

    # File dirty (non committati)
    dirty_raw = _run_git(["status", "--porcelain"], cwd=repo_root)
    dirty = tuple(line[3:] for line in dirty_raw.splitlines() if line)

    # Quali "pilastri fisici" (cartelle chiave) esistono nel repo
    candidates = ("traits", "biomes", "rules", "jobs", "species", "engine", "data", "docs")
    pillars = frozenset(d for d in candidates if (repo_root / d).is_dir())

    return RepoSnapshot(
        root=repo_root,
        recent_commits=tuple(commits),
        dirty_files=dirty,
        pillar_dirs=pillars,
    )
