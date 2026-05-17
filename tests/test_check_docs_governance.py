"""Tests for tools/check_docs_governance.py — the registry+frontmatter validator.

The validator is CI-required (strict mode) so regressions block merges.
These tests cover every public function plus main() CLI flows.
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import check_docs_governance as validator  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_valid_entry(**overrides):
    """Return a valid registry entry. Override any field to invalidate."""
    base = {
        "path": "docs/test.md",
        "title": "Test Doc",
        "doc_status": "active",
        "doc_owner": "platform-docs",
        "workstream": "cross-cutting",
        "last_verified": (date.today() - timedelta(days=1)).isoformat(),
        "source_of_truth": False,
        "language": "it-en",
        "review_cycle_days": 14,
    }
    base.update(overrides)
    return base


def make_valid_registry(entries=None, entrypoint="docs/test.md", **overrides):
    """Return a minimal valid registry payload.

    By default we override 'workstreams' to just ['cross-cutting'] so tests
    that check for zero issues aren't drowned by 'workstream_without_canonical_doc'
    warnings for the other 7 default workstreams.
    """
    if entries is None:
        entries = [make_valid_entry(source_of_truth=True)]
    reg = {
        "version": "1.0.0",
        "entrypoint": entrypoint,
        "entries": entries,
        "workstreams": ["cross-cutting"],
    }
    reg.update(overrides)
    return reg


def write_md_with_frontmatter(path: Path, fields: dict) -> None:
    """Write a minimal .md file with a YAML frontmatter block."""
    lines = ["---"]
    for key, value in fields.items():
        if isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    lines.append("")
    lines.append("# Body")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def setup_repo(tmp_path: Path, entries=None, write_files=True, entrypoint="docs/test.md"):
    """Create a fake repo layout with registry + the referenced MD files."""
    reg = make_valid_registry(entries=entries, entrypoint=entrypoint)
    reg_path = tmp_path / "docs" / "governance" / "docs_registry.json"
    reg_path.parent.mkdir(parents=True, exist_ok=True)
    reg_path.write_text(json.dumps(reg, indent=2) + "\n", encoding="utf-8")

    if write_files:
        for entry in reg["entries"]:
            md = tmp_path / entry["path"]
            write_md_with_frontmatter(md, entry)
    return tmp_path, reg


def issue_codes(issues):
    return [i.code for i in issues]


# ---------------------------------------------------------------------------
# parse_frontmatter
# ---------------------------------------------------------------------------


class TestParseFrontmatter:
    def test_valid_frontmatter(self, tmp_path: Path):
        md = tmp_path / "doc.md"
        md.write_text(
            "---\ntitle: Hello\nworkstream: flow\n---\n# Body\n", encoding="utf-8"
        )
        fm = validator.parse_frontmatter(md)
        assert fm == {"title": "Hello", "workstream": "flow"}

    def test_no_frontmatter_returns_none(self, tmp_path: Path):
        md = tmp_path / "doc.md"
        md.write_text("# No frontmatter\nPlain body.\n", encoding="utf-8")
        assert validator.parse_frontmatter(md) is None

    def test_unclosed_frontmatter_returns_none(self, tmp_path: Path):
        md = tmp_path / "doc.md"
        md.write_text("---\ntitle: Broken\nNo closing delimiter.\n", encoding="utf-8")
        assert validator.parse_frontmatter(md) is None

    def test_boolean_and_int_parsing(self, tmp_path: Path):
        md = tmp_path / "doc.md"
        md.write_text(
            "---\nsource_of_truth: true\nprimary: false\nreview_cycle_days: 14\n---\n",
            encoding="utf-8",
        )
        fm = validator.parse_frontmatter(md)
        assert fm["source_of_truth"] is True
        assert fm["primary"] is False
        assert fm["review_cycle_days"] == 14

    def test_skips_comments_and_empty_lines(self, tmp_path: Path):
        md = tmp_path / "doc.md"
        md.write_text(
            "---\n# this is a comment\n\ntitle: OK\n---\n",
            encoding="utf-8",
        )
        fm = validator.parse_frontmatter(md)
        assert fm == {"title": "OK"}

    def test_utf8_bom(self, tmp_path: Path):
        md = tmp_path / "doc.md"
        md.write_bytes(b"\xef\xbb\xbf---\ntitle: BOM\n---\n# Content\n")
        fm = validator.parse_frontmatter(md)
        assert fm == {"title": "BOM"}


# ---------------------------------------------------------------------------
# parse_iso_date
# ---------------------------------------------------------------------------


class TestParseIsoDate:
    def test_valid_date(self):
        assert validator.parse_iso_date("2026-04-14") == date(2026, 4, 14)

    def test_invalid_format(self):
        assert validator.parse_iso_date("2026/04/14") is None

    def test_invalid_actual_date(self):
        assert validator.parse_iso_date("2026-02-30") is None

    def test_empty_string(self):
        assert validator.parse_iso_date("") is None


# ---------------------------------------------------------------------------
# compare_frontmatter
# ---------------------------------------------------------------------------


class TestCompareFrontmatter:
    def test_matching_fields_no_issues(self):
        issues = []
        fm = {"doc_status": "active", "doc_owner": "team"}
        entry = {"doc_status": "active", "doc_owner": "team"}
        validator.compare_frontmatter(
            issues, "docs/test.md", fm, entry, ["doc_status", "doc_owner"]
        )
        assert issues == []

    def test_missing_field_raises_error(self):
        issues = []
        fm = {"doc_status": "active"}
        entry = {"doc_status": "active", "doc_owner": "team"}
        validator.compare_frontmatter(
            issues, "docs/test.md", fm, entry, ["doc_status", "doc_owner"]
        )
        assert len(issues) == 1
        assert issues[0].code == "frontmatter_missing_field"
        assert issues[0].level == "error"

    def test_value_mismatch_raises_warning(self):
        issues = []
        fm = {"doc_status": "active"}
        entry = {"doc_status": "draft"}
        validator.compare_frontmatter(
            issues, "docs/test.md", fm, entry, ["doc_status"]
        )
        assert len(issues) == 1
        assert issues[0].code == "frontmatter_registry_mismatch"
        assert issues[0].level == "warning"

    def test_string_vs_int_comparison_via_str(self):
        issues = []
        fm = {"review_cycle_days": 14}
        entry = {"review_cycle_days": 14}
        validator.compare_frontmatter(
            issues, "docs/test.md", fm, entry, ["review_cycle_days"]
        )
        assert issues == []

    def test_boolean_comparison(self):
        issues = []
        fm = {"source_of_truth": True}
        entry = {"source_of_truth": False}
        validator.compare_frontmatter(
            issues, "docs/test.md", fm, entry, ["source_of_truth"]
        )
        assert len(issues) == 1
        assert issues[0].level == "warning"


# ---------------------------------------------------------------------------
# validate_registry
# ---------------------------------------------------------------------------


class TestValidateRegistry:
    def test_empty_entries_raises_error(self, tmp_path: Path):
        registry = {"entrypoint": "docs/x.md", "entries": []}
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "registry_entries_empty" in codes

    def test_missing_entrypoint_raises_error(self, tmp_path: Path):
        registry = {"entries": [make_valid_entry(source_of_truth=True)]}
        write_md_with_frontmatter(tmp_path / "docs/test.md", registry["entries"][0])
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "entrypoint_missing" in codes

    def test_entry_without_path_raises_error(self, tmp_path: Path):
        entry = make_valid_entry()
        del entry["path"]
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        assert "entry_path_missing" in issue_codes(issues)

    @pytest.mark.parametrize(
        "missing_field",
        [
            "doc_status",
            "doc_owner",
            "workstream",
            "last_verified",
            "source_of_truth",
            "language",
            "review_cycle_days",
        ],
    )
    def test_entry_missing_required_field_raises_error(
        self, tmp_path: Path, missing_field
    ):
        entry = make_valid_entry()
        del entry[missing_field]
        registry = make_valid_registry(entries=[entry])
        (tmp_path / "docs").mkdir(parents=True, exist_ok=True)
        (tmp_path / "docs/test.md").write_text("body", encoding="utf-8")
        issues = validator.validate_registry(tmp_path, registry)
        assert "entry_missing_field" in issue_codes(issues)

    def test_invalid_doc_status_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(doc_status="bogus")
        setup_repo(tmp_path, entries=[entry])
        issues = validator.validate_registry(tmp_path, make_valid_registry(entries=[entry]))
        assert "invalid_doc_status" in issue_codes(issues)

    def test_invalid_workstream_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(workstream="nonexistent")
        (tmp_path / "docs").mkdir(parents=True, exist_ok=True)
        (tmp_path / "docs/test.md").write_text("body", encoding="utf-8")
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        assert "invalid_workstream" in issue_codes(issues)

    def test_invalid_last_verified_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(last_verified="not-a-date")
        (tmp_path / "docs").mkdir(parents=True, exist_ok=True)
        (tmp_path / "docs/test.md").write_text("body", encoding="utf-8")
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        assert "invalid_last_verified" in issue_codes(issues)

    def test_invalid_review_cycle_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(review_cycle_days=0)
        (tmp_path / "docs").mkdir(parents=True, exist_ok=True)
        (tmp_path / "docs/test.md").write_text("body", encoding="utf-8")
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        assert "invalid_review_cycle" in issue_codes(issues)

    def test_stale_document_raises_warning(self, tmp_path: Path):
        old_date = (date.today() - timedelta(days=365)).isoformat()
        entry = make_valid_entry(last_verified=old_date, review_cycle_days=14)
        setup_repo(tmp_path, entries=[entry])
        issues = validator.validate_registry(tmp_path, make_valid_registry(entries=[entry]))
        codes = issue_codes(issues)
        assert "stale_document" in codes
        stale = next(i for i in issues if i.code == "stale_document")
        assert stale.level == "warning"

    def test_path_missing_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(path="docs/missing.md")
        registry = make_valid_registry(
            entries=[entry], entrypoint="docs/missing.md"
        )
        (tmp_path / "docs").mkdir(parents=True, exist_ok=True)
        issues = validator.validate_registry(tmp_path, registry)
        assert "path_missing" in issue_codes(issues)

    def test_source_of_truth_without_frontmatter_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(source_of_truth=True)
        md = tmp_path / entry["path"]
        md.parent.mkdir(parents=True, exist_ok=True)
        md.write_text("# No frontmatter\nbody\n", encoding="utf-8")
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        assert "frontmatter_missing" in issue_codes(issues)

    def test_source_of_truth_frontmatter_mismatch_raises_warning(self, tmp_path: Path):
        entry = make_valid_entry(source_of_truth=True, doc_status="active")
        md = tmp_path / entry["path"]
        # Write frontmatter with mismatched doc_status
        mismatch = dict(entry)
        mismatch["doc_status"] = "draft"
        write_md_with_frontmatter(md, mismatch)
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "frontmatter_registry_mismatch" in codes

    def test_entrypoint_not_source_of_truth_raises_error(self, tmp_path: Path):
        entry = make_valid_entry(source_of_truth=False)
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(
            entries=[entry], entrypoint=entry["path"]
        )
        issues = validator.validate_registry(tmp_path, registry)
        assert "entrypoint_not_source_of_truth" in issue_codes(issues)

    def test_workstream_without_canonical_doc_raises_warning(self, tmp_path: Path):
        # Registry has a cross-cutting SoT and a flow entry without SoT
        entry_ct = make_valid_entry(
            path="docs/test.md", source_of_truth=True
        )
        entry_flow = make_valid_entry(
            path="docs/flow.md",
            workstream="flow",
            source_of_truth=False,
        )
        setup_repo(tmp_path, entries=[entry_ct, entry_flow])
        registry = make_valid_registry(entries=[entry_ct, entry_flow])
        registry["workstreams"] = ["cross-cutting", "flow"]
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "workstream_without_canonical_doc" in codes

    def test_crosscutting_workstream_exempt_from_canonical_warning(self, tmp_path: Path):
        # Only cross-cutting, but not SoT — should NOT trigger the warning
        # (cross-cutting is the default/catchall and is skipped in the loop)
        entry = make_valid_entry(source_of_truth=False)
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(entries=[entry], entrypoint="docs/test.md")
        # Entrypoint is not SoT → entrypoint_not_source_of_truth error expected,
        # but no workstream_without_canonical_doc for cross-cutting itself.
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        # No canonical warning for cross-cutting; only for OTHER workstreams
        # (and there are none in this registry, so none of those either)
        assert "workstream_without_canonical_doc" not in codes

    def test_valid_registry_zero_issues(self, tmp_path: Path):
        entry = make_valid_entry(source_of_truth=True)
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        assert issues == []

    def test_registry_override_status_values(self, tmp_path: Path):
        entry = make_valid_entry(doc_status="custom_status", source_of_truth=True)
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(entries=[entry])
        registry["doc_status_values"] = ["custom_status", "active"]
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "invalid_doc_status" not in codes

    def test_registry_override_workstreams(self, tmp_path: Path):
        entry = make_valid_entry(
            workstream="custom_workstream", source_of_truth=False
        )
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(entries=[entry])
        registry["workstreams"] = ["custom_workstream", "cross-cutting"]
        # No entrypoint check — set a different non-SoT entry
        registry["entrypoint"] = None
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "invalid_workstream" not in codes

    def test_combat_workstream_accepted(self, tmp_path: Path):
        entry = make_valid_entry(workstream="combat", source_of_truth=True)
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(entries=[entry])
        registry["workstreams"] = ["cross-cutting", "combat"]
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "invalid_workstream" not in codes

    def test_historical_ref_status_accepted(self, tmp_path: Path):
        entry = make_valid_entry(
            doc_status="historical_ref", source_of_truth=True
        )
        setup_repo(tmp_path, entries=[entry])
        registry = make_valid_registry(entries=[entry])
        issues = validator.validate_registry(tmp_path, registry)
        codes = issue_codes(issues)
        assert "invalid_doc_status" not in codes


# ---------------------------------------------------------------------------
# write_report
# ---------------------------------------------------------------------------


class TestWriteReport:
    def test_writes_valid_json(self, tmp_path: Path):
        path = tmp_path / "report.json"
        validator.write_report(path, [])
        assert path.exists()
        data = json.loads(path.read_text(encoding="utf-8"))
        assert "summary" in data
        assert "issues" in data
        assert "generated_at" in data

    def test_counts_errors_and_warnings(self, tmp_path: Path):
        path = tmp_path / "report.json"
        issues = [
            validator.Issue("error", "c1", "p1", "m1"),
            validator.Issue("error", "c2", "p2", "m2"),
            validator.Issue("warning", "c3", "p3", "m3"),
        ]
        validator.write_report(path, issues)
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data["summary"]["total"] == 3
        assert data["summary"]["errors"] == 2
        assert data["summary"]["warnings"] == 1

    def test_creates_parent_dir(self, tmp_path: Path):
        path = tmp_path / "nested" / "sub" / "report.json"
        validator.write_report(path, [])
        assert path.exists()

    def test_generated_at_is_iso_timestamp(self, tmp_path: Path):
        path = tmp_path / "report.json"
        validator.write_report(path, [])
        data = json.loads(path.read_text(encoding="utf-8"))
        # ISO 8601 timestamp starts with digits
        ts = data["generated_at"]
        assert len(ts) >= 19
        assert ts[4] == "-" and ts[7] == "-" and ts[10] == "T"


# ---------------------------------------------------------------------------
# main() CLI
# ---------------------------------------------------------------------------


class TestMainCli:
    def _run_main(self, monkeypatch, tmp_path: Path, extra_args=None):
        """Helper: set up a fake repo and invoke main() with given args."""
        # The validator computes repo_root = parents[1] of its own file (tools/),
        # so we patch the module's Path anchor to point at tmp_path.
        entry = make_valid_entry(source_of_truth=True)
        reg_path = tmp_path / "docs" / "governance" / "docs_registry.json"
        reg_path.parent.mkdir(parents=True, exist_ok=True)
        reg_path.write_text(
            json.dumps(make_valid_registry(entries=[entry]), indent=2),
            encoding="utf-8",
        )
        write_md_with_frontmatter(tmp_path / entry["path"], entry)

        # Patch parents[1] by placing the validator module inside tmp_path
        # Simplest: override Path resolution via monkeypatch on resolve chain.
        # We use a simpler approach: monkeypatch validator.Path to a custom class
        # that mimics __file__ being inside tmp_path.
        fake_tools = tmp_path / "tools"
        fake_tools.mkdir(exist_ok=True)
        fake_script = fake_tools / "check_docs_governance.py"
        fake_script.write_text("# fake", encoding="utf-8")
        monkeypatch.setattr(
            validator, "__file__", str(fake_script), raising=False
        )

        args = [
            "check_docs_governance.py",
            "--registry",
            "docs/governance/docs_registry.json",
            "--report",
            "reports/docs/test_report.json",
        ]
        if extra_args:
            args.extend(extra_args)
        monkeypatch.setattr(sys, "argv", args)
        return validator.main()

    def test_main_default_exits_zero_on_valid_registry(
        self, monkeypatch, tmp_path: Path
    ):
        rc = self._run_main(monkeypatch, tmp_path)
        assert rc == 0

    def test_main_strict_exits_zero_on_clean_registry(
        self, monkeypatch, tmp_path: Path
    ):
        rc = self._run_main(monkeypatch, tmp_path, extra_args=["--strict"])
        assert rc == 0

    def test_main_registry_not_found_exits_two(self, monkeypatch, tmp_path: Path):
        fake_tools = tmp_path / "tools"
        fake_tools.mkdir(exist_ok=True)
        fake_script = fake_tools / "check_docs_governance.py"
        fake_script.write_text("# fake", encoding="utf-8")
        monkeypatch.setattr(
            validator, "__file__", str(fake_script), raising=False
        )
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "check_docs_governance.py",
                "--registry",
                "docs/governance/nonexistent.json",
                "--report",
                "reports/x.json",
            ],
        )
        rc = validator.main()
        assert rc == 2

    def test_main_prints_summary_line(self, monkeypatch, capsys, tmp_path: Path):
        self._run_main(monkeypatch, tmp_path)
        captured = capsys.readouterr()
        assert "errors=" in captured.out
        assert "warnings=" in captured.out

    def test_main_strict_exits_one_on_errors(self, monkeypatch, tmp_path: Path):
        # Entry with invalid status → error
        entry = make_valid_entry(
            doc_status="invalid_status", source_of_truth=True
        )
        reg_path = tmp_path / "docs" / "governance" / "docs_registry.json"
        reg_path.parent.mkdir(parents=True, exist_ok=True)
        reg_path.write_text(
            json.dumps(make_valid_registry(entries=[entry]), indent=2),
            encoding="utf-8",
        )
        write_md_with_frontmatter(tmp_path / entry["path"], entry)

        fake_tools = tmp_path / "tools"
        fake_tools.mkdir(exist_ok=True)
        fake_script = fake_tools / "check_docs_governance.py"
        fake_script.write_text("# fake", encoding="utf-8")
        monkeypatch.setattr(
            validator, "__file__", str(fake_script), raising=False
        )
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "check_docs_governance.py",
                "--registry",
                "docs/governance/docs_registry.json",
                "--report",
                "reports/docs/strict_test.json",
                "--strict",
            ],
        )
        rc = validator.main()
        assert rc == 1

    def test_main_strict_warnings_exits_one_on_warnings(
        self, monkeypatch, tmp_path: Path
    ):
        # Entry with stale date → warning
        old_date = (date.today() - timedelta(days=365)).isoformat()
        entry = make_valid_entry(
            last_verified=old_date,
            review_cycle_days=14,
            source_of_truth=True,
        )
        reg_path = tmp_path / "docs" / "governance" / "docs_registry.json"
        reg_path.parent.mkdir(parents=True, exist_ok=True)
        reg_path.write_text(
            json.dumps(make_valid_registry(entries=[entry]), indent=2),
            encoding="utf-8",
        )
        write_md_with_frontmatter(tmp_path / entry["path"], entry)

        fake_tools = tmp_path / "tools"
        fake_tools.mkdir(exist_ok=True)
        fake_script = fake_tools / "check_docs_governance.py"
        fake_script.write_text("# fake", encoding="utf-8")
        monkeypatch.setattr(
            validator, "__file__", str(fake_script), raising=False
        )
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "check_docs_governance.py",
                "--registry",
                "docs/governance/docs_registry.json",
                "--report",
                "reports/docs/warnings_test.json",
                "--strict-warnings",
            ],
        )
        rc = validator.main()
        assert rc == 1
