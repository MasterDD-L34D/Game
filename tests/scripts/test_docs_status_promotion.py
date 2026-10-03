"""Characterization tests for tools/docs_status_promotion.py (doc_status bulk promoter).

Behavior-only snapshot: path-rule resolution (root-file allowlist, backslash
normalization, prefix categories), frontmatter doc_status rewrite (indent/newline
preservation, first-occurrence-only, utf-8-sig read + BOM-stripping write, the
False-return guards), the promote() pass over a registry (dry-run vs apply, the
registry-entry-updated-even-when-file-is-missing quirk, the superseded/legacy_active
guard, sorted rewrite), print_summary headers, and main() exit codes. The BOM input
is written as a \ufeff escape so the source stays ASCII. A deliberate change to
these behaviors SHOULD update these assertions consciously -- that is the point of
a characterization test.
"""

import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS = PROJECT_ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import docs_status_promotion as d  # noqa: E402


def _setup_registry(monkeypatch, tmp_path, entries):
    root = tmp_path / "repo"
    root.mkdir(parents=True, exist_ok=True)
    reg = root / "docs_registry.json"
    reg.write_text(json.dumps({"entries": entries}), encoding="utf-8")
    monkeypatch.setattr(d, "REPO_ROOT", root)
    monkeypatch.setattr(d, "REGISTRY_PATH", reg)
    return root, reg


def _write_doc(root, rel, text):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


# --- determine_target_status ---


def test_root_files_promote_to_active():
    assert d.determine_target_status("CLAUDE.md") == "active"
    assert d.determine_target_status("agent.md") == "active"


def test_backslash_paths_are_normalized():
    assert d.determine_target_status("docs\\core\\x.md") == "active"


def test_prefix_categories():
    assert d.determine_target_status("docs/adr/0001.md") == "active"
    assert d.determine_target_status("docs/archive/old.md") == "historical_ref"
    assert d.determine_target_status("docs/reports/r.md") == "generated"
    assert d.determine_target_status("reports/x.md") == "generated"


def test_unmatched_paths_return_none():
    assert d.determine_target_status("src/x.md") is None
    assert d.determine_target_status("docs/unknown/x.md") is None
    assert d.determine_target_status("JOURNAL.md") is None


# --- update_frontmatter_status ---


def test_update_missing_file_returns_false(tmp_path):
    assert d.update_frontmatter_status(tmp_path / "nope.md", "active") is False


def test_update_without_frontmatter_returns_false(tmp_path):
    p = tmp_path / "doc.md"
    p.write_text("# title\n", encoding="utf-8")
    assert d.update_frontmatter_status(p, "active") is False
    assert p.read_text(encoding="utf-8") == "# title\n"


def test_update_unclosed_frontmatter_returns_false(tmp_path):
    p = tmp_path / "doc.md"
    p.write_text("---\ndoc_status: draft\n", encoding="utf-8")
    assert d.update_frontmatter_status(p, "active") is False


def test_update_without_doc_status_field_returns_false(tmp_path):
    p = tmp_path / "doc.md"
    original = "---\ntitle: x\n---\nbody\n"
    p.write_text(original, encoding="utf-8")
    assert d.update_frontmatter_status(p, "active") is False
    assert p.read_text(encoding="utf-8") == original


def test_update_preserves_indent_and_touches_first_only(tmp_path):
    p = tmp_path / "doc.md"
    p.write_text("---\n  doc_status: draft\n---\ndoc_status: body\n", encoding="utf-8")
    assert d.update_frontmatter_status(p, "active") is True
    assert p.read_text(encoding="utf-8") == "---\n  doc_status: active\n---\ndoc_status: body\n"


def test_update_strips_utf8_bom_on_write(tmp_path):
    p = tmp_path / "doc.md"
    p.write_text("\ufeff---\ndoc_status: draft\n---\n", encoding="utf-8")
    assert d.update_frontmatter_status(p, "active") is True
    assert not p.read_bytes().startswith(b"\xef\xbb\xbf")
    assert p.read_text(encoding="utf-8") == "---\ndoc_status: active\n---\n"


# --- promote ---


def test_promote_dry_run_writes_nothing(monkeypatch, tmp_path):
    root, reg = _setup_registry(
        monkeypatch, tmp_path, [{"path": "docs/core/a.md", "doc_status": "draft"}]
    )
    doc = _write_doc(root, "docs/core/a.md", "---\ndoc_status: draft\n---\n")
    before = reg.read_text(encoding="utf-8")
    summary = d.promote(dry_run=True)
    assert summary["total_promoted"] == 1
    assert summary["promoted"]["active"] == 1
    assert summary["dry_run"] is True
    assert reg.read_text(encoding="utf-8") == before
    assert doc.read_text(encoding="utf-8") == "---\ndoc_status: draft\n---\n"


def test_promote_apply_updates_registry_and_frontmatter(monkeypatch, tmp_path):
    root, reg = _setup_registry(
        monkeypatch,
        tmp_path,
        [
            {"path": "docs/core/b.md", "doc_status": "draft"},
            {"path": "docs/core/a.md", "doc_status": "draft"},
        ],
    )
    _write_doc(root, "docs/core/a.md", "---\ndoc_status: draft\n---\n")
    _write_doc(root, "docs/core/b.md", "---\ndoc_status: draft\n---\n")
    summary = d.promote(dry_run=False)
    assert summary["total_promoted"] == 2
    text = reg.read_text(encoding="utf-8")
    assert text.endswith("\n")
    data = json.loads(text)
    assert [e["path"] for e in data["entries"]] == ["docs/core/a.md", "docs/core/b.md"]
    assert {e["doc_status"] for e in data["entries"]} == {"active"}
    assert (root / "docs/core/a.md").read_text(encoding="utf-8") == "---\ndoc_status: active\n---\n"


def test_promote_updates_registry_even_when_file_is_missing(monkeypatch, tmp_path):
    root, reg = _setup_registry(
        monkeypatch, tmp_path, [{"path": "docs/core/ghost.md", "doc_status": "draft"}]
    )
    summary = d.promote(dry_run=False)
    assert summary["skipped_no_file"] == 1
    assert summary["total_promoted"] == 0
    data = json.loads(reg.read_text(encoding="utf-8"))
    assert data["entries"][0]["doc_status"] == "active"


def test_promote_counts_already_correct_and_guards(monkeypatch, tmp_path):
    _setup_registry(
        monkeypatch,
        tmp_path,
        [
            {"path": "docs/core/ok.md", "doc_status": "active"},
            {"path": "docs/guide/sup.md", "doc_status": "superseded"},
            {"path": "docs/hubs/leg.md", "doc_status": "legacy_active"},
            {"path": "src/none.md", "doc_status": "draft"},
        ],
    )
    summary = d.promote(dry_run=True)
    assert summary["already_correct"] == 1
    assert summary["unchanged"] == 3
    assert summary["total_promoted"] == 0


def test_promote_missing_doc_status_defaults_to_draft(monkeypatch, tmp_path):
    root, _ = _setup_registry(monkeypatch, tmp_path, [{"path": "docs/adr/x.md"}])
    _write_doc(root, "docs/adr/x.md", "---\ndoc_status: draft\n---\n")
    summary = d.promote(dry_run=True)
    assert summary["total_promoted"] == 1


# --- print_summary ---


def _summary(dry_run):
    return {
        "promoted": {"active": 2, "historical_ref": 1, "generated": 0},
        "total_promoted": 3,
        "unchanged": 4,
        "already_correct": 5,
        "skipped_no_file": 6,
        "dry_run": dry_run,
    }


def test_print_summary_dry_run_header(capsys):
    d.print_summary(_summary(True))
    out = capsys.readouterr().out
    assert "DOC STATUS PROMOTION REPORT (DRY RUN)" in out
    assert "total promoted: 3" in out


def test_print_summary_applied_header(capsys):
    d.print_summary(_summary(False))
    out = capsys.readouterr().out
    assert "DOC STATUS PROMOTION REPORT (APPLIED)" in out
    assert "skipped (no file):   6" in out


# --- main ---


def test_main_missing_registry_exits_two(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(d, "REGISTRY_PATH", tmp_path / "absent.json")
    monkeypatch.setattr(sys, "argv", ["docs_status_promotion.py"])
    rc = d.main()
    captured = capsys.readouterr()
    assert rc == 2
    assert captured.err.startswith("ERROR: registry not found at")


def test_main_dry_run_happy_path(monkeypatch, tmp_path, capsys):
    _setup_registry(
        monkeypatch, tmp_path, [{"path": "docs/core/a.md", "doc_status": "draft"}]
    )
    monkeypatch.setattr(sys, "argv", ["docs_status_promotion.py", "--dry-run"])
    rc = d.main()
    out = capsys.readouterr().out
    assert rc == 0
    assert "(DRY RUN)" in out
