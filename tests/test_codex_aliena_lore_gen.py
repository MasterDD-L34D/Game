"""Tests for codex_aliena_lore_gen -- A.L.I.E.N.A. lore draft generator (SPEC-H).

Run: PYTHONPATH=tools/py python -m pytest tests/test_codex_aliena_lore_gen.py

The generator narrativizes a creature's already-structured data (the
generate-data-then-narrate pattern, Caves of Qud) into the 6 A.L.I.E.N.A.
dimension `content:` prose, via the seeded Tracery engine (skiv_tracery). It
produces DRAFTS marked for human review -- it never auto-promotes.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools" / "py"))

import codex_aliena_lore_gen as gen  # noqa: E402


GRAMMAR = {
    "origin_A_ambiente": ["Il #biome# e' il territorio dei #subject#."],
    "origin_L_linee_evolutive": ["I #subject# discendono dai #lineage#."],
    "origin_I_impianto": ["Morfologia: #morpho#, profilo da #job#."],
    "origin_E_ecologia": ["Ruolo ecologico: #role# nel #biome#."],
    "origin_N_norme_socio": ["Struttura sociale: #social#."],
    "origin_A_ancoraggio_narrativo": ["Il gancio: #hook#."],
}

LORE_VARS = {
    "biome": "savana ionizzata",
    "subject": "predoni nomadi",
    "lineage": "razziatori umanoidi",
    "morpho": "bipede armato",
    "job": "skirmisher",
    "role": "predatore secondario",
    "social": "bande di razzia",
    "hook": "primo scontro del tutorial",
}


def test_generate_dimension_substitutes_slots():
    out = gen.generate_dimension(GRAMMAR, LORE_VARS, "predoni_nomadi", "A_ambiente")
    assert "savana ionizzata" in out
    assert "predoni nomadi" in out
    assert "#" not in out  # no unresolved grammar symbols


def test_generate_dimension_is_deterministic():
    a = gen.generate_dimension(GRAMMAR, LORE_VARS, "predoni_nomadi", "E_ecologia")
    b = gen.generate_dimension(GRAMMAR, LORE_VARS, "predoni_nomadi", "E_ecologia")
    assert a == b


def test_generate_all_returns_six_nonempty_dimensions():
    out = gen.generate_all(GRAMMAR, LORE_VARS, "predoni_nomadi")
    assert set(out.keys()) == set(gen.ALIENA_DIMENSION_KEYS)
    for key, content in out.items():
        assert content.strip(), f"empty content for {key}"
        assert "#" not in content, f"unresolved symbol in {key}"
        assert "TODO" not in content, f"TODO placeholder leaked in {key}"


def test_generate_all_distinct_per_dimension():
    out = gen.generate_all(GRAMMAR, LORE_VARS, "predoni_nomadi")
    # Each dimension uses its own origin symbol -> distinct prose.
    assert out["A_ambiente"] != out["N_norme_socio"]


def test_fill_draft_marks_pending_review_and_fills_content():
    draft = {
        "codex_entry": {
            "id": "predoni_nomadi",
            "aliena_dimensions": {
                k: {"heading": k, "content": "TODO master-dd: x"}
                for k in gen.ALIENA_DIMENSION_KEYS
            },
        }
    }
    contents = gen.generate_all(GRAMMAR, LORE_VARS, "predoni_nomadi")
    filled = gen.fill_draft(draft, contents)
    ce = filled["codex_entry"]
    assert ce["lore_review_status"] == "generated_pending_review"
    for k in gen.ALIENA_DIMENSION_KEYS:
        c = ce["aliena_dimensions"][k]["content"]
        assert "TODO" not in c
        assert c.strip()


def test_fill_draft_does_not_emit_secret_score_fields():
    # SPEC-H sez.8 secret invariant: the generator must NEVER write the
    # engine-only score fields into a player-facing draft.
    draft = {
        "codex_entry": {
            "id": "x",
            "aliena_dimensions": {
                k: {"content": "TODO"} for k in gen.ALIENA_DIMENSION_KEYS
            },
        }
    }
    filled = gen.fill_draft(draft, gen.generate_all(GRAMMAR, LORE_VARS, "x"))
    forbidden = {"aggregate", "sub_scores", "coherence", "enforcement_factor"}
    ce = filled["codex_entry"]
    assert not (forbidden & set(ce.keys()))
    for dim in ce["aliena_dimensions"].values():
        assert not (forbidden & set(dim.keys()))


def test_extract_lore_vars_reads_codex_entry_block():
    draft = {"codex_entry": {"id": "x", "lore_vars": {"biome": "tundra"}}}
    assert gen.extract_lore_vars(draft) == {"biome": "tundra"}
