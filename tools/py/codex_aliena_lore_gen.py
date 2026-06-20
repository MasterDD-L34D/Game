#!/usr/bin/env python3
"""A.L.I.E.N.A. codex lore DRAFT generator (SPEC-H, generate-data-then-narrate).

A creature's structured data already exists (biome, role_trofico, morphotype,
traits, combat_baseline -- see the `key_facts:` of any
data/codex/_drafts/<id>.yaml). Authoring the 6 A.L.I.E.N.A. `content:` prose
blocks by hand for every species x biome combination does NOT scale for a solo
dev. This generator narrativizes that data via a seeded story-grammar -- the
"generate the data, then rationalize it after the fact" pattern (Caves of Qud)
on top of the layered handcrafted+procedural model (Wildermyth): the author
writes the GRAMMAR once; the generator fills the slots per creature.

It produces DRAFTS only. Every output is stamped
`codex_entry.lore_review_status: generated_pending_review`, which
tools/js/promote_codex_draft.js refuses to promote -- so machine prose can NEVER
reach a player without human curation. The author edits the draft (improving the
prose and/or the grammar) and sets `lore_review_status: human_reviewed` (or
removes the field) before promoting.

Reuses the repo's seeded Tracery engine (tools/py/skiv_tracery.py: grammar
format, SYMBOL_RE, MAX_DEPTH) but substitutes a hashlib-stable picker so the
output is reproducible ACROSS process runs (builtin hash() is per-process
randomized -> not replay-safe; a draft generator needs stable git diffs).

Usage:
    PYTHONPATH=tools/py python tools/py/codex_aliena_lore_gen.py \
        data/codex/_drafts/predoni_nomadi.yaml            # review mode (print)
    PYTHONPATH=tools/py python tools/py/codex_aliena_lore_gen.py \
        data/codex/_drafts/predoni_nomadi.yaml --out /tmp/draft.yaml  # write draft

SECRET INVARIANT (SPEC-H sez.8): never writes the engine-only score fields
(aggregate / sub_scores / coherence / enforcement_factor) into a draft.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so skiv_tracery imports
import skiv_tracery  # noqa: E402  (repo seeded-grammar engine: SYMBOL_RE, MAX_DEPTH)

import yaml  # noqa: E402

# The 6 canonical A.L.I.E.N.A. dimension keys (schema codex 2026-04-27); the
# grammar must define an `origin_<key>` symbol for each.
ALIENA_DIMENSION_KEYS = [
    "A_ambiente",
    "L_linee_evolutive",
    "I_impianto",
    "E_ecologia",
    "N_norme_socio",
    "A_ancoraggio_narrativo",
]

DEFAULT_GRAMMAR_PATH = "data/codex/_grammar/aliena_lore.json"
REVIEW_STATUS_PENDING = "generated_pending_review"
# Engine-only fields the generator must never serialize into a player-facing draft.
_FORBIDDEN_SCORE_FIELDS = {"aggregate", "sub_scores", "coherence", "enforcement_factor"}


def _stable_pick(pool: Sequence[str], seed: str, salt: str) -> str:
    """Deterministic pick using sha256 (replay-safe across process runs)."""
    if not pool:
        return ""
    digest = hashlib.sha256((seed + ":" + salt).encode("utf-8")).hexdigest()
    return pool[int(digest, 16) % len(pool)]


def _expand(grammar: Dict[str, List[str]], symbol: str, seed: str, depth: int = 0) -> str:
    """Expand a Tracery symbol with hashlib-stable seeded determinism.

    Mirrors skiv_tracery.flatten (reuses its SYMBOL_RE + MAX_DEPTH) but with a
    replay-safe picker. Unknown symbols pass through as `#symbol#`.
    """
    if depth > skiv_tracery.MAX_DEPTH:
        return f"#{symbol}#"
    pool = grammar.get(symbol)
    if not pool:
        return f"#{symbol}#"
    template = _stable_pick(pool, seed, salt=f"{symbol}:{depth}")

    def _sub(match) -> str:
        return _expand(grammar, match.group(1), seed, depth=depth + 1)

    return skiv_tracery.SYMBOL_RE.sub(_sub, template)


def _merge_vars(grammar: Dict[str, List[str]], lore_vars: Dict[str, object]) -> Dict[str, List[str]]:
    """Overlay lore_vars as single-element grammar pools so `#var#` resolves."""
    merged: Dict[str, List[str]] = dict(grammar)
    for key, value in (lore_vars or {}).items():
        merged[key] = [str(value)]
    return merged


def generate_dimension(
    grammar: Dict[str, List[str]],
    lore_vars: Dict[str, object],
    entry_id: str,
    dim_key: str,
) -> str:
    """Generate the prose for one A.L.I.E.N.A. dimension. Deterministic."""
    merged = _merge_vars(grammar, lore_vars)
    seed = f"{entry_id}:{dim_key}"
    return _expand(merged, f"origin_{dim_key}", seed).strip()


def generate_all(
    grammar: Dict[str, List[str]],
    lore_vars: Dict[str, object],
    entry_id: str,
    dim_keys: Optional[Sequence[str]] = None,
) -> Dict[str, str]:
    """Generate prose for all 6 dimensions -> {dim_key: content}."""
    keys = list(dim_keys) if dim_keys else ALIENA_DIMENSION_KEYS
    return {k: generate_dimension(grammar, lore_vars, entry_id, k) for k in keys}


def extract_lore_vars(draft: Dict[str, object]) -> Dict[str, object]:
    """Read the `codex_entry.lore_vars` slot dict (the structured data)."""
    ce = draft.get("codex_entry") or {}
    return dict(ce.get("lore_vars") or {})


def fill_draft(draft: Dict[str, object], contents: Dict[str, str]) -> Dict[str, object]:
    """Write generated content into a draft + stamp it pending-review.

    Does NOT add any engine-only score field (secret invariant).
    """
    ce = draft["codex_entry"]
    ce["lore_review_status"] = REVIEW_STATUS_PENDING
    dims = ce.get("aliena_dimensions") or {}
    for key, content in contents.items():
        if key in dims and isinstance(dims[key], dict):
            dims[key]["content"] = content
    return draft


def load_grammar(path: str) -> Dict[str, List[str]]:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="A.L.I.E.N.A. codex lore draft generator")
    p.add_argument("draft", help="path to data/codex/_drafts/<id>.yaml")
    p.add_argument("--grammar", default=DEFAULT_GRAMMAR_PATH, help="grammar JSON path")
    p.add_argument("--out", default=None, help="write filled draft YAML to this path")
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _build_arg_parser().parse_args(argv)
    with open(args.draft, encoding="utf-8") as fh:
        draft = yaml.safe_load(fh)
    entry_id = (draft.get("codex_entry") or {}).get("id")
    if not entry_id:
        print("ERROR: draft has no codex_entry.id", file=sys.stderr)
        return 2
    grammar = load_grammar(args.grammar)
    lore_vars = extract_lore_vars(draft)
    if not lore_vars:
        print(
            "ERROR: draft has no codex_entry.lore_vars block (the structured slots "
            "the grammar narrativizes). Add lore_vars: {...} first.",
            file=sys.stderr,
        )
        return 2
    contents = generate_all(grammar, lore_vars, entry_id)

    if args.out:
        fill_draft(draft, contents)
        with open(args.out, "w", encoding="utf-8") as fh:
            yaml.safe_dump(draft, fh, allow_unicode=True, sort_keys=False, width=88)
        print(f"WROTE generated draft (pending review): {args.out}")
        print("Review/edit the prose, set lore_review_status: human_reviewed, then promote.")
    else:
        print(f"# Generated A.L.I.E.N.A. draft for {entry_id} (review mode -- NOT written)")
        for key in ALIENA_DIMENSION_KEYS:
            print(f"\n## {key}\n{contents[key]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
