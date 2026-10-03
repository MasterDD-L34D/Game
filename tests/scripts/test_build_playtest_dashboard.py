"""Characterization tests for tools/py/build_playtest_dashboard.py (HTML dashboard builder).

Behavior-only snapshot: the single DATA placeholder in the embedded HTML template,
the missing-input error path (stderr message + exit 1 + no output written), and the
happy path (compact-separator JSON injection, placeholder fully replaced, nested
output directory creation, output larger than the bare template, the OK stdout
line). main() reads sys.argv, so the tests monkeypatch it. A deliberate change to
these behaviors SHOULD update these assertions consciously -- that is the point of
a characterization test.
"""

import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

import build_playtest_dashboard as b  # noqa: E402


def test_html_template_has_single_data_placeholder():
    assert b.HTML.count("/*__DATA__*/") == 1


def test_main_missing_input_exits_one(tmp_path, monkeypatch, capsys):
    out_path = tmp_path / "out.html"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "build_playtest_dashboard.py",
            "--in",
            str(tmp_path / "nope.json"),
            "--out",
            str(out_path),
        ],
    )
    rc = b.main()
    captured = capsys.readouterr()
    assert rc == 1
    assert "aggregates not found:" in captured.err
    assert "aggregate_session_logs.py first" in captured.err
    assert not out_path.exists()


def test_main_injects_compact_json_and_writes_output(tmp_path, monkeypatch, capsys):
    inp = tmp_path / "agg.json"
    inp.write_text(json.dumps({"a": [1, 2], "b": {"c": 3}}), encoding="utf-8")
    out_path = tmp_path / "nested" / "dir" / "out.html"
    monkeypatch.setattr(
        sys,
        "argv",
        ["build_playtest_dashboard.py", "--in", str(inp), "--out", str(out_path)],
    )
    rc = b.main()
    captured = capsys.readouterr()
    assert rc == 0
    assert out_path.exists()
    html = out_path.read_text(encoding="utf-8")
    assert "/*__DATA__*/" not in html
    assert '{"a":[1,2],"b":{"c":3}}' in html
    assert len(html) > len(b.HTML)
    assert captured.out.startswith("OK -> ")
    assert "KB)" in captured.out
