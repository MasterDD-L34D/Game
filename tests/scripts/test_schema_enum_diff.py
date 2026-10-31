"""Characterization tests for tools/schema_enum_diff.py (JSON Schema enum diff helper).

Behavior-only snapshot of the pure helpers: enums.json loading errors, enum/range/none
payload extraction (including the `is not None` zero-bound pin and the enum-over-range
precedence), repr-based list rendering (including the truthy-empty-iterator quirk),
the exact diff line format, and the main() exit codes / stdout-stderr split. A
deliberate change to these functions SHOULD update these assertions consciously --
that is the point of a characterization test.
"""

import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS = PROJECT_ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import schema_enum_diff as s  # noqa: E402


def _write_enums(directory, defs):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "enums.json").write_text(json.dumps({"$defs": defs}), encoding="utf-8")


# --- load_schema_defs ---


def test_load_schema_defs_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError) as exc_info:
        s.load_schema_defs(tmp_path)
    assert "Missing enums.json in" in str(exc_info.value)


def test_load_schema_defs_invalid_json(tmp_path):
    (tmp_path / "enums.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(ValueError) as exc_info:
        s.load_schema_defs(tmp_path)
    assert "Invalid JSON in" in str(exc_info.value)


def test_load_schema_defs_requires_defs_mapping(tmp_path):
    (tmp_path / "enums.json").write_text(json.dumps({"title": "x"}), encoding="utf-8")
    with pytest.raises(ValueError) as exc_info:
        s.load_schema_defs(tmp_path)
    assert "does not expose a `$defs` mapping" in str(exc_info.value)


def test_load_schema_defs_rejects_non_dict_defs(tmp_path):
    (tmp_path / "enums.json").write_text(json.dumps({"$defs": ["a"]}), encoding="utf-8")
    with pytest.raises(ValueError):
        s.load_schema_defs(tmp_path)


def test_load_schema_defs_returns_defs_mapping(tmp_path):
    _write_enums(tmp_path, {"Color": {"enum": ["red"]}})
    assert s.load_schema_defs(tmp_path) == {"Color": {"enum": ["red"]}}


# --- extract_enum_payload ---


def test_extract_enum_payload_enum_becomes_tuple():
    assert s.extract_enum_payload({"enum": ["a", "b"]}) == ("enum", ("a", "b"))


def test_extract_enum_payload_empty_enum_is_empty_tuple():
    assert s.extract_enum_payload({"enum": []}) == ("enum", ())


def test_extract_enum_payload_non_list_enum_raises():
    with pytest.raises(ValueError) as exc_info:
        s.extract_enum_payload({"enum": "ab"})
    assert "`enum` entries must be a list of values" in str(exc_info.value)


def test_extract_enum_payload_enum_wins_over_range():
    assert s.extract_enum_payload({"enum": [1], "minimum": 0, "maximum": 9}) == ("enum", (1,))


def test_extract_enum_payload_range_bounds():
    assert s.extract_enum_payload({"minimum": 1, "maximum": 5}) == ("range", (1, 5))
    assert s.extract_enum_payload({"minimum": 1}) == ("range", (1, None))
    assert s.extract_enum_payload({"maximum": 5}) == ("range", (None, 5))


def test_extract_enum_payload_zero_bound_is_still_a_range():
    # the code checks `is not None`, so a 0 bound still counts as a range definition
    assert s.extract_enum_payload({"minimum": 0}) == ("range", (0, None))


def test_extract_enum_payload_none_for_empty_definition():
    assert s.extract_enum_payload({}) == ("none", None)


# --- render_list ---


def test_render_list_repr_join_and_empty_marker():
    assert s.render_list([]) == "(none)"
    assert s.render_list(["a", 1]) == "'a', 1"
    assert s.render_list(("b", "a")) == "'b', 'a'"


def test_render_list_empty_iterator_is_truthy():
    # an empty iterator object is truthy -> joins to "" instead of "(none)"
    assert s.render_list(iter([])) == ""


# --- diff_enums ---


def test_diff_enums_identical_yields_no_lines():
    defs = {"K": {"enum": ["a"]}}
    assert s.diff_enums(defs, defs) == []


def test_diff_enums_added_and_removed_values():
    base = {"K": {"enum": ["a", "b"]}}
    cand = {"K": {"enum": ["b", "c"]}}
    assert s.diff_enums(base, cand) == [
        "- K:",
        "    + added: 'c'",
        "    - removed: 'a'",
    ]


def test_diff_enums_added_only_omits_removed_line():
    base = {"K": {"enum": ["a"]}}
    cand = {"K": {"enum": ["a", "b"]}}
    assert s.diff_enums(base, cand) == ["- K:", "    + added: 'b'"]


def test_diff_enums_empty_enum_treated_as_empty_set():
    base = {"K": {"enum": []}}
    cand = {"K": {"enum": ["a"]}}
    assert s.diff_enums(base, cand) == ["- K:", "    + added: 'a'"]


def test_diff_enums_keys_sorted_union():
    base = {"B": {"enum": ["x"]}, "A": {"enum": ["x"]}}
    cand = {"B": {"enum": ["y"]}, "A": {"enum": ["y"]}}
    lines = s.diff_enums(base, cand)
    assert [line for line in lines if line.startswith("- ")] == ["- A:", "- B:"]


def test_diff_enums_range_change_line():
    base = {"K": {"minimum": 1, "maximum": 5}}
    cand = {"K": {"minimum": 1, "maximum": 6}}
    assert s.diff_enums(base, cand) == ["- K: range changed from (1, 5) to (1, 6)"]


def test_diff_enums_equal_ranges_are_silent():
    base = {"K": {"minimum": 1, "maximum": 5}}
    assert s.diff_enums(base, {"K": {"minimum": 1, "maximum": 5}}) == []


def test_diff_enums_definition_added_in_candidate():
    assert s.diff_enums({}, {"K": {"enum": ["a"]}}) == ["- K: definition added in candidate"]


def test_diff_enums_definition_removed_in_candidate():
    assert s.diff_enums({"K": {"minimum": 0}}, {}) == ["- K: definition removed in candidate"]


def test_diff_enums_payload_type_change():
    base = {"K": {"enum": ["a"]}}
    cand = {"K": {"minimum": 0}}
    assert s.diff_enums(base, cand) == ["- K: payload type changed from enum to range"]


# --- main ---


def test_main_reports_no_differences(tmp_path, capsys):
    base = tmp_path / "base"
    cand = tmp_path / "cand"
    _write_enums(base, {"K": {"enum": ["a"]}})
    _write_enums(cand, {"K": {"enum": ["a"]}})
    rc = s.main(["--base", str(base), "--candidate", str(cand)])
    captured = capsys.readouterr()
    assert rc == 0
    assert "No differences detected" in captured.out


def test_main_prints_diff_lines(tmp_path, capsys):
    base = tmp_path / "base"
    cand = tmp_path / "cand"
    _write_enums(base, {"K": {"enum": ["a"]}})
    _write_enums(cand, {"K": {"enum": ["b"]}})
    rc = s.main(["--base", str(base), "--candidate", str(cand)])
    captured = capsys.readouterr()
    assert rc == 0
    assert captured.out.splitlines()[0] == "Enum differences:"
    assert "    + added: 'b'" in captured.out


def test_main_missing_base_exits_one_on_stderr(tmp_path, capsys):
    cand = tmp_path / "cand"
    _write_enums(cand, {})
    rc = s.main(["--base", str(tmp_path / "nope"), "--candidate", str(cand)])
    captured = capsys.readouterr()
    assert rc == 1
    assert captured.err.startswith("error: Missing enums.json in")
