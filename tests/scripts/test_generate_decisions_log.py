"""Characterization tests for tools/generate_decisions_log.py (ADR-index generator)."""

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS = PROJECT_ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import generate_decisions_log as g  # noqa: E402

def test_parse_frontmatter():
    assert g.parse_frontmatter("no fences here") == {}
    assert g.parse_frontmatter("---\ntitle: Hello\nstatus: accepted\n---\nbody") == {"title": "Hello", "status": "accepted"}
    assert g.parse_frontmatter('---\nk: "quoted"\n---') == {"k": "quoted"}
    assert g.parse_frontmatter("---\n# c\n\nk: v\nnoColon\n---") == {"k": "v"}
    assert g.parse_frontmatter("---\nk: a\nk: b\n---") == {"k": "a"}
    assert g.parse_frontmatter("---\nk: v\n---\nk2: after") == {"k": "v"}

def test_adr_title():
    assert g.adr_title("# H", {"title": "FM"}, "stem") == "FM"
    assert g.adr_title("intro\n# The Head\nx", {}, "stem") == "The Head"
    assert g.adr_title("no heading", {}, "the-stem") == "the-stem"

def test_adr_status():
    assert g.adr_status({"status": "accepted"}) == "Accepted"
    assert g.adr_status({"status": "active"}) == "Accepted"
    assert g.adr_status({"status": "draft"}) == "Proposed"
    assert g.adr_status({"status": "superseded (by ADR-0040)"}) == "Superseded"
    assert g.adr_status({"status": "accepted -- ratified"}) == "Accepted"
    assert g.adr_status({"doc_status": "historical_ref"}) == "Accepted"
    assert g.adr_status({"status": "weird"}) == "Weird"
    assert g.adr_status({}) == "Unknown"

def test_adr_date():
    assert g.adr_date("ADR-2026-05-17-cross") == "2026-05-17"
    assert g.adr_date("ADR-2025-11-foo") == "2025-11-00"
    assert g.adr_date("ADR-0011-governance") == "0011-00-00"
    assert g.adr_date("no-date-here") == "0000-00-00"

def test_render_table():
    rows = [("2026-05-17", "ADR-2026-05-17", "[L](docs/adr/x.md)", "Ti|tle", "Accepted")]
    assert "Ti\\|tle" in g.render_table(rows)
    assert "(1 ADR)" in g.render_table(rows)
    assert "| 0011 |" in g.render_table([("0011-00-00", "ADR-0011", "[L2](docs/adr/y.md)", "T2", "Proposed")])
    assert "| 2025-11 |" in g.render_table([("2025-11-00", "ADR-2025-11", "[L3](z.md)", "T3", "Accepted")])

def test_build_block():
    rows = [("2026-05-17", "ADR-2026-05-17", "[L](docs/adr/x.md)", "Ti|tle", "Accepted")]
    assert g.build_block(rows).startswith(g.BEGIN)
    assert g.build_block(rows).endswith(g.END)

def test_apply():
    assert g.apply("pre " + g.BEGIN + "OLD" + g.END + " post", "NEW") == "pre NEW post"
    with pytest.raises(SystemExit):
        g.apply("no markers AND no index anchor here", "NEW")
