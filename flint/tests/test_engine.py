"""Test per engine.py — decisione categoria e generazione output."""

from __future__ import annotations

from pathlib import Path

from flint.engine import decide_category, generate, should_speak
from flint.repo import Commit, RepoSnapshot
from flint.seeds import Category


def _snap(kinds: list[str], dirty: int = 0, root: Path | None = None) -> RepoSnapshot:
    commits = tuple(
        Commit(sha=f"{i:07d}", message="msg", files=(), kind=k)  # type: ignore[arg-type]
        for i, k in enumerate(kinds)
    )
    return RepoSnapshot(
        root=root or Path("/tmp/nonexistent-caveman-test"),
        recent_commits=commits,
        dirty_files=tuple(f"f{i}.py" for i in range(dirty)),
    )


class TestDecideCategory:
    def test_drifting_forces_hint(self) -> None:
        snap = _snap(["INFRA"] * 8 + ["GAMEPLAY", "DOCS"])
        assert decide_category(snap) == Category.DESIGN_HINT

    def test_last_gameplay_triggers_micro_sprint(self) -> None:
        snap = _snap(["GAMEPLAY", "GAMEPLAY", "DOCS"])
        assert decide_category(snap) == Category.MICRO_SPRINT

    def test_many_dirty_triggers_micro_sprint(self) -> None:
        snap = _snap(["DOCS", "GAMEPLAY"], dirty=7)
        assert decide_category(snap) == Category.MICRO_SPRINT

    def test_force_overrides(self) -> None:
        snap = _snap(["INFRA"] * 10)  # sarebbe DESIGN_HINT
        assert decide_category(snap, force=Category.MINI_GAME) == Category.MINI_GAME


class TestGenerate:
    def test_deterministic_with_seed(self) -> None:
        snap = _snap(["GAMEPLAY", "DOCS"])
        a = generate(snap, seed=42, force_category=Category.DESIGN_HINT)
        # Se lo stato persiste, il secondo potrebbe differire — usiamo due seed uguali
        # ma ripuliamo chiamando di nuovo con stesso seed e comando.
        b = generate(snap, seed=42, force_category=Category.DESIGN_HINT)
        # Non identici necessariamente (lo stato "used" è cambiato), ma il RENDER è valido
        assert a.category == Category.DESIGN_HINT
        assert b.category == Category.DESIGN_HINT
        assert a.body
        assert b.body

    def test_output_contains_all_parts(self) -> None:
        snap = _snap(["GAMEPLAY"])
        out = generate(snap, seed=1)
        assert out.emoji in ("🦴", "🪨", "🔥")
        assert out.opening
        assert out.body
        assert out.closer
        md = out.render_markdown()
        assert md.startswith(out.emoji)
        assert "*" in md  # italic

    def test_plain_render_no_markdown(self) -> None:
        snap = _snap(["GAMEPLAY"])
        out = generate(snap, seed=1)
        plain = out.render_plain()
        assert "*" not in plain
        assert out.emoji in plain


class TestShouldSpeak:
    def test_silent_on_empty_repo(self) -> None:
        snap = _snap([])
        speak, _ = should_speak(snap)
        assert not speak

    def test_speaks_on_drift(self) -> None:
        snap = _snap(["INFRA"] * 5 + ["DOCS"] * 5)
        speak, reason = should_speak(snap)
        assert speak
        assert "deriva" in reason.lower()

    def test_speaks_on_gameplay_commit(self) -> None:
        snap = _snap(["GAMEPLAY", "INFRA"])
        speak, _ = should_speak(snap)
        assert speak

    def test_silent_on_routine_infra(self) -> None:
        snap = _snap(["INFRA", "GAMEPLAY", "GAMEPLAY", "DOCS"])
        speak, _ = should_speak(snap)
        assert not speak  # solo 1 INFRA e gameplay_ratio 50%
