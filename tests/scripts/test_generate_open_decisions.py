"""Characterization tests for tools/generate_open_decisions.py (OPEN_DECISIONS index generator).

Behavior-only snapshot of the pure helpers: heading-title stripping, github-slugger anchoring,
OD-comment parsing (+ R4/R7 error strings), sort key, GFM table rendering, marker splice, and the
R3/R5/R6 validate branches. A deliberate change to these functions SHOULD update these assertions
consciously -- that is the point of a characterization test. Non-ASCII inputs are written as
\\uXXXX escapes so the source stays ASCII while the runtime string carries the real codepoint
(check-mark U+2705, warning U+26A0, em-dash U+2014).
"""

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS = PROJECT_ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import generate_open_decisions as g  # noqa: E402


def test_heading_title():
    assert g._heading_title("Simple") == "Simple"
    assert g._heading_title("Base \u2705 RISOLTA A (shipped)") == "Base"
    assert g._heading_title("Base \u26a0\ufe0f warn") == "Base"
    assert g._heading_title("Base \u26a0 warn") == "Base"
    assert g._heading_title("Base \u2014 tail prose") == "Base"
    assert g._heading_title("Base \u2014 mid \u2705 done") == "Base"
    # empty after stripping the decoration -> fall back to the raw (stripped) heading
    assert g._heading_title("\u2705only") == "\u2705only"


def test_anchor():
    assert g._anchor("[OD-001] Simple Title") == "od-001-simple-title"
    # em-dash is stripped but the surrounding spaces are NOT collapsed (github-slugger faithful)
    assert g._anchor("verdict \u2014 day") == "verdict--day"
    assert g._anchor("[OD-059] BiomeMemory reuse?") == "od-059-biomememory-reuse"


def test_parse_records_happy():
    doc = (
        "### [OD-001] First decision\n"
        "<!-- od id=OD-001 status=open governed_by=ADR-0011 -->\n"
        "- **Livello**: P2\n"
        "prose ADR-0011 ref\n"
        "\n"
        "### [OD-002] Second done\n"
        '<!-- od id=OD-002 status=resolved resolved_by="shipped PR #123" -->\n'
        "body\n"
    )
    recs, errs = g.parse_records(doc)
    assert errs == []
    assert len(recs) == 2
    r0, r1 = recs
    assert (r0.id, r0.status, r0.title) == ("OD-001", "open", "First decision")
    assert r0.anchor == "od-001-first-decision"
    assert r0.livello == "P2"
    assert r0.governed_by == "ADR-0011"
    assert r0.ref == "ADR-0011"
    assert r0.resolved_by is None
    assert r0.heading_has_check is False
    assert r0.comment_line == 2
    assert (r1.id, r1.status, r1.title) == ("OD-002", "resolved", "Second done")
    assert r1.resolved_by == "shipped PR #123"
    assert r1.ref == "PR #123"
    assert r1.livello == "\u2014"  # default em-dash when no "- **Livello**:" line
    assert r1.comment_line == 7


def test_parse_records_errors():
    dup = (
        "### [OD-005] a\n<!-- od id=OD-005 status=open -->\n"
        "### [OD-005] b\n<!-- od id=OD-005 status=open -->\n"
    )
    assert g.parse_records(dup)[1] == ["R4 ERROR L4: duplicate id OD-005"]

    mism = "### [OD-005] a\n<!-- od id=OD-006 status=open -->\n"
    assert g.parse_records(mism)[1] == [
        "R4 ERROR L2: comment id 'OD-006' != heading id 'OD-005'"
    ]

    malf = "### [OD-007] a\n<!-- od id=oops status=open -->\n"
    assert g.parse_records(malf)[1] == [
        "R4 ERROR L2: malformed id 'oops' (expected OD-NNN)"
    ]

    lonely = "### [OD-008] lonely heading\nsome prose\n"
    assert g.parse_records(lonely)[1] == [
        "R7 ERROR L1: OD heading OD-008 has no adjacent <!-- od ... --> metadata"
    ]

    orphan = "no heading\n<!-- od id=OD-009 status=open -->\n"
    assert g.parse_records(orphan)[1] == [
        "R4 ERROR L2: od-comment OD-009 has no OD heading above it"
    ]


def test_od_sort_key():
    assert g._od_sort_key("OD-5") == (5, "OD-5")
    assert g._od_sort_key("OD-40") == (40, "OD-40")
    assert g._od_sort_key("garbage") == (9999, "garbage")
    assert sorted(["OD-10", "OD-2", "OD-1"], key=g._od_sort_key) == ["OD-1", "OD-2", "OD-10"]


def test_render_table():
    open_rec = g.ODRecord(
        id="OD-001", status="open", title="Ti|tle", anchor="od-001-x",
        livello="P2", ref="ADR-0011", comment_line=2, heading_has_check=False,
    )
    res_rec = g.ODRecord(
        id="OD-002", status="resolved", title="Done", anchor="od-002",
        livello="P1", ref="PR #1", comment_line=6, heading_has_check=True,
    )
    tbl = g.render_table([open_rec, res_rec])
    assert "[OD-001](#od-001-x)" in tbl
    assert "Ti\\|tle" in tbl        # a literal pipe is escaped inside the GFM cell
    assert "OD-002" not in tbl       # resolved rows are excluded from the open index
    assert "| OD" in tbl             # header row present


def test_build_block():
    rec = g.ODRecord(
        id="OD-001", status="open", title="T", anchor="a",
        livello="P2", ref="-", comment_line=2, heading_has_check=False,
    )
    blk = g.build_block([rec])
    assert blk.startswith(g.BEGIN)
    assert blk.endswith(g.END)
    assert blk.startswith(g.BEGIN + "\n\n")  # prettier-safe blank line after the begin marker
    assert g.BEGIN == "<!-- gen:od-open -->"
    assert g.END == "<!-- /gen:od-open -->"


def test_apply():
    spliced = g.apply("pre " + g.BEGIN + "OLD" + g.END + " post", "NEW")
    assert spliced == "pre NEW post"
    with pytest.raises(SystemExit):
        g.apply("no markers here", "NEW")


def test_validate_branches():
    arch_ok = g.ODRecord(
        id="OD-009-original-archive", status="archived", resolved_by="x", governed_by=None,
        title="t", anchor="a", livello="P2", ref="-", comment_line=10, heading_has_check=False,
    )
    assert g.validate([arch_ok], []) == ([], [])

    arch_bad = g.ODRecord(
        id="OD-010", status="archived", resolved_by="x", governed_by=None,
        title="t", anchor="a", livello="P2", ref="-", comment_line=11, heading_has_check=False,
    )
    errs, warns = g.validate([arch_bad], [])
    assert errs == ["R6 ERROR L11: OD-010 archive-suffix=False but status=archived (must match)"]
    assert warns == []

    res_noref = g.ODRecord(
        id="OD-011", status="resolved", resolved_by=None, governed_by=None,
        title="t", anchor="a", livello="P2", ref="-", comment_line=12, heading_has_check=True,
    )
    errs, warns = g.validate([res_noref], [])
    assert errs == []
    assert warns == ["R3 WARN L12: OD-011 status=resolved without resolved_by"]

    open_check = g.ODRecord(
        id="OD-012", status="open", resolved_by=None, governed_by=None,
        title="t", anchor="a", livello="P2", ref="-", comment_line=13, heading_has_check=True,
    )
    errs, warns = g.validate([open_check], [])
    assert errs == []
    assert warns == ["R5 WARN L13: OD-012 status=open but heading has a check-mark"]

    # parse_errors passed in are forwarded verbatim into the returned errors list
    errs, warns = g.validate([open_check], ["PRE ERROR"])
    assert errs == ["PRE ERROR"]
