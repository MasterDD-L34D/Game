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

REPO_ROOT = Path(__file__).resolve().parents[1]
REAL_GRAMMAR_PATH = REPO_ROOT / "data" / "codex" / "_grammar" / "aliena_lore.json"


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


def test_fill_draft_strips_secret_score_fields():
    # SPEC-H sez.8 secret invariant (defense in depth): even if a malformed
    # input draft already carries the engine-only score fields, fill_draft must
    # SCRUB them so they never reach a player-facing draft.
    forbidden = {"aggregate", "sub_scores", "coherence", "enforcement_factor"}
    draft = {
        "codex_entry": {
            "id": "x",
            "aggregate": 0.91,  # top-level forbidden field
            "aliena_dimensions": {
                k: {"content": "TODO", "coherence": 0.5}  # nested forbidden field
                for k in gen.ALIENA_DIMENSION_KEYS
            },
        }
    }
    filled = gen.fill_draft(draft, gen.generate_all(GRAMMAR, LORE_VARS, "x"))
    ce = filled["codex_entry"]
    assert not (forbidden & set(ce.keys())), "top-level score field not scrubbed"
    for key, dim in ce["aliena_dimensions"].items():
        assert not (forbidden & set(dim.keys())), f"nested score field not scrubbed in {key}"


def test_extract_lore_vars_reads_codex_entry_block():
    draft = {"codex_entry": {"id": "x", "lore_vars": {"biome": "tundra"}}}
    assert gen.extract_lore_vars(draft) == {"biome": "tundra"}


# --- Italian elision (bug: "il aerostato" / "del aliradiante" must elide) -------------

def test_generate_dimension_elides_article_before_vowel_initial_subject():
    # The grammar concatenates a fixed article + the data-driven #subject#; when the
    # subject starts with a vowel ("aerostato"), "il #subject#" / "del #subject#" are
    # ungrammatical and must elide. Fix is a post-pass over the expanded prose.
    grammar = {
        "origin_A_ambiente": [
            "Il territorio del #subject# e' vasto. Il #subject# vola alto.",
        ],
    }
    lore = {"subject": "aerostato ascendente"}
    out = gen.generate_dimension(grammar, lore, "x", "A_ambiente")
    low = out.lower()
    assert "il aerostato" not in low, out
    assert "del aerostato" not in low, out
    assert "dell'aerostato ascendente" in out, out          # del -> dell' (mid-sentence)
    assert "L'aerostato ascendente vola" in out, out         # Il -> L' (sentence-initial, capitalized)
    assert "Il territorio" in out, out                        # consonant-initial: untouched


def test_generate_dimension_does_not_over_elide_consonant_or_already_elided():
    grammar = {
        "origin_E_ecologia": [
            "Il #subject# domina. Esercita pressione senza contendere l'apice. Vive nel bosco.",
        ],
    }
    lore = {"subject": "lupo grigio"}  # consonant-initial subject
    out = gen.generate_dimension(grammar, lore, "x", "E_ecologia")
    assert "Il lupo grigio domina" in out, out                # consonant subject: no elision
    assert "l'apice" in out, out                              # already-elided: preserved
    assert "nel bosco" in out, out                            # nel + consonant: preserved


# --- A_ambiente connector rotation (bug: over-used "dal tono di") ----------------------

def test_real_grammar_a_ambiente_drops_hardcoded_dal_tono_connector():
    grammar = gen.load_grammar(str(REAL_GRAMMAR_PATH))
    for tmpl in grammar["origin_A_ambiente"]:
        assert "dal tono di" not in tmpl, tmpl
    pool = grammar.get("ambiente_connector")
    assert pool and len(pool) >= 3, "expected a rotation pool of connectors"


def test_a_ambiente_rotates_connector_and_never_emits_dal_tono():
    grammar = gen.load_grammar(str(REAL_GRAMMAR_PATH))
    pool = set(grammar["ambiente_connector"])
    lore = {
        "subject": "aliradiante solare",
        "biome_name": "Savana Ionizzata",
        "biome_trait": "una piana percorsa da scariche statiche",
        "biome_tone": "un perpetuo crepitio elettrico",
        "affixes": "tempesta, ozono",
    }
    seen = set()
    for i in range(12):
        out = gen.generate_dimension(grammar, lore, f"creature_{i}", "A_ambiente")
        assert "dal tono di" not in out, out
        seen |= {c for c in pool if c in out}
    assert len(seen) >= 2, f"connector did not vary across entries (saw {seen})"
