"""Test per repo.py — classificazione commit e snapshot."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from flint.repo import Commit, RepoSnapshot, _classify_commit, snapshot


class TestClassifyCommit:
    def test_gameplay_commit(self) -> None:
        assert _classify_commit("add new trait", ("traits/fire.yaml",)) == "GAMEPLAY"

    def test_infra_commit(self) -> None:
        assert _classify_commit("fix ci", (".github/workflows/test.yml",)) == "INFRA"

    def test_docs_commit(self) -> None:
        assert _classify_commit("update readme", ("README.md",)) == "DOCS"

    def test_data_commit(self) -> None:
        assert _classify_commit("add dataset", ("data/species.yaml",)) == "DATA"

    def test_gameplay_beats_docs(self) -> None:
        """Se un commit tocca sia traits/ che README.md, vince GAMEPLAY."""
        assert _classify_commit("big refactor", ("traits/x.yaml", "README.md")) == "GAMEPLAY"

    def test_fallback_altro(self) -> None:
        assert _classify_commit("random stuff", ("random/file.txt",)) == "ALTRO"

    def test_conventional_commit_playtest(self) -> None:
        """Pattern 'playtest' intercetta feat(playtest-ui) e simili."""
        assert _classify_commit("feat(playtest-ui): new button", ("apps/backend/public/x.html",)) == "GAMEPLAY"

    def test_conventional_commit_round(self) -> None:
        """Pattern 'round' intercetta feat(round) e simili."""
        assert _classify_commit("feat(round): add orchestrator", ("apps/backend/services/round.js",)) == "GAMEPLAY"

    def test_conventional_commit_play_scope(self) -> None:
        """Pattern 'play(' intercetta play(balance), play(tutorial) ecc."""
        assert _classify_commit("play(balance): hardcore iter", ("packs/evo/data/balance/x.yaml",)) == "GAMEPLAY"

    def test_conventional_commit_docs_scope(self) -> None:
        """Pattern 'docs(' intercetta docs(claude-md), docs(core) ecc."""
        assert _classify_commit("docs(core): update vision", ("docs/core/01.md",)) == "DOCS"

    def test_ai_directory(self) -> None:
        """Pattern 'ai/' intercetta commit su apps/backend/services/ai/."""
        assert _classify_commit("feat: new ai brain", ("apps/backend/services/ai/policy.js",)) == "GAMEPLAY"


class TestSnapshotMetrics:
    def _make_snap(self, kinds: list[str]) -> RepoSnapshot:
        commits = tuple(
            Commit(sha=f"{i:07d}", message="x", files=(), kind=k)  # type: ignore[arg-type]
            for i, k in enumerate(kinds)
        )
        return RepoSnapshot(root=Path("/tmp"), recent_commits=commits, dirty_files=())

    def test_gameplay_ratio(self) -> None:
        snap = self._make_snap(["GAMEPLAY", "INFRA", "GAMEPLAY", "DOCS", "INFRA"])
        assert snap.gameplay_ratio() == 0.4

    def test_gameplay_ratio_empty(self) -> None:
        snap = self._make_snap([])
        assert snap.gameplay_ratio() == 0.0

    def test_consecutive_infra(self) -> None:
        snap = self._make_snap(["INFRA", "INFRA", "INFRA", "GAMEPLAY", "INFRA"])
        assert snap.consecutive_infra_commits() == 3

    def test_drift_low_gameplay(self) -> None:
        snap = self._make_snap(["INFRA"] * 8 + ["GAMEPLAY", "DOCS"])
        assert snap.is_drifting()

    def test_drift_consecutive_infra(self) -> None:
        snap = self._make_snap(["INFRA", "INFRA", "INFRA", "INFRA", "GAMEPLAY"])
        assert snap.is_drifting()

    def test_not_drifting(self) -> None:
        snap = self._make_snap(["GAMEPLAY", "GAMEPLAY", "INFRA", "GAMEPLAY"])
        assert not snap.is_drifting()


class TestRealGitRepo:
    """Test d'integrazione con un vero repo git temporaneo."""

    @pytest.fixture
    def git_repo(self, tmp_path: Path) -> Path:
        subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
        subprocess.run(["git", "config", "user.email", "t@t.t"], cwd=tmp_path, check=True)
        subprocess.run(["git", "config", "user.name", "test"], cwd=tmp_path, check=True)

        # Commit 1: GAMEPLAY
        (tmp_path / "traits").mkdir()
        (tmp_path / "traits" / "fire.yaml").write_text("name: fire\n")
        subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
        subprocess.run(["git", "commit", "-qm", "add fire trait"], cwd=tmp_path, check=True)

        # Commit 2: INFRA
        (tmp_path / "Dockerfile").write_text("FROM python\n")
        subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
        subprocess.run(["git", "commit", "-qm", "add docker"], cwd=tmp_path, check=True)

        return tmp_path

    def test_snapshot_reads_real_repo(self, git_repo: Path) -> None:
        snap = snapshot(git_repo)
        assert len(snap.recent_commits) == 2
        # Ultimo commit è il più recente
        assert snap.recent_commits[0].kind == "INFRA"
        assert snap.recent_commits[1].kind == "GAMEPLAY"
        assert "traits" in snap.pillar_dirs

    def test_snapshot_non_git_dir(self, tmp_path: Path) -> None:
        snap = snapshot(tmp_path)
        assert snap.recent_commits == ()
        assert snap.dirty_files == ()
